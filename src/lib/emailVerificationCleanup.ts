import { getAdminEmails } from '@/lib/access';
import { getAppConfig, getAppConfigNumber, setAppConfig } from '@/lib/config';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { EMAIL_VERIFY_TTL_HOURS } from '@/lib/passwordAuth';

const SYSTEM_ACTOR = 'system';

export const EMAIL_VERIFICATION_CLEANUP_METRICS_KEY = 'EMAIL_VERIFICATION_CLEANUP_METRICS';
export const EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD_KEY =
  'EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD';
export const EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER_KEY =
  'EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER';
export const EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW_KEY =
  'EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW';
export const EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS_KEY =
  'EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS';
export const EMAIL_VERIFICATION_CLEANUP_ALERT_LAST_SENT_KEY =
  'EMAIL_VERIFICATION_CLEANUP_ALERT_LAST_SENT';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const uniqueEmails = (entries: Array<{ email: string }>) => {
  const seen = new Set<string>();
  entries.forEach((entry) => {
    if (!entry.email) return;
    seen.add(normalizeEmail(entry.email));
  });
  return Array.from(seen);
};

export type EmailVerificationCleanupResult = {
  deletedUsersByToken: number;
  deletedUsersWithoutToken: number;
  deletedTokens: number;
};

type CleanupMetrics = {
  window: number[];
  lastRunAt: string | null;
  lastDeletedUsers: number | null;
};

const DEFAULT_WINDOW_SIZE = 14;

const parseIsoDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const coerceWindow = (entries: unknown, maxSize: number) => {
  if (!Array.isArray(entries)) return [];
  const normalized = entries
    .map((entry) => (typeof entry === 'number' ? entry : Number(entry)))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.max(0, Math.floor(entry)));
  return normalized.slice(-maxSize);
};

const parseCleanupMetrics = (raw: string | null, windowSize: number): CleanupMetrics => {
  if (!raw) {
    return { window: [], lastRunAt: null, lastDeletedUsers: null };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CleanupMetrics> | null;
    if (!parsed || typeof parsed !== 'object') {
      return { window: [], lastRunAt: null, lastDeletedUsers: null };
    }
    return {
      window: coerceWindow(parsed.window, windowSize),
      lastRunAt: typeof parsed.lastRunAt === 'string' ? parsed.lastRunAt : null,
      lastDeletedUsers:
        typeof parsed.lastDeletedUsers === 'number' && Number.isFinite(parsed.lastDeletedUsers)
          ? Math.max(0, Math.floor(parsed.lastDeletedUsers))
          : null,
    };
  } catch {
    return { window: [], lastRunAt: null, lastDeletedUsers: null };
  }
};

const buildCleanupAlertEmail = (payload: {
  totalDeleted: number;
  deletedUsersByToken: number;
  deletedUsersWithoutToken: number;
  deletedTokens: number;
  averageBaseline: number;
  windowSize: number;
  threshold: number;
  multiplier: number;
  alertThreshold: number;
  triggeredAt: string;
}) => {
  const {
    totalDeleted,
    deletedUsersByToken,
    deletedUsersWithoutToken,
    deletedTokens,
    averageBaseline,
    windowSize,
    threshold,
    multiplier,
    alertThreshold,
    triggeredAt,
  } = payload;

  const subject = `Email cleanup alert: ${totalDeleted} users removed`;
  const avgFormatted = averageBaseline.toFixed(2);
  const text = [
    'Email verification cleanup alert.',
    `Triggered at: ${triggeredAt}`,
    `Deleted users (total): ${totalDeleted}`,
    `- via expired token: ${deletedUsersByToken}`,
    `- stale without token: ${deletedUsersWithoutToken}`,
    `Expired tokens removed: ${deletedTokens}`,
    `Baseline average (${windowSize} runs): ${avgFormatted}`,
    `Alert threshold: ${alertThreshold} (min ${threshold}, multiplier ${multiplier}x)`,
  ].join('\n');

  const html = `
    <h2>Email verification cleanup alert</h2>
    <p><strong>Triggered at:</strong> ${triggeredAt}</p>
    <p><strong>Deleted users (total):</strong> ${totalDeleted}</p>
    <ul>
      <li>Via expired token: ${deletedUsersByToken}</li>
      <li>Stale without token: ${deletedUsersWithoutToken}</li>
      <li>Expired tokens removed: ${deletedTokens}</li>
    </ul>
    <p><strong>Baseline average (${windowSize} runs):</strong> ${avgFormatted}</p>
    <p><strong>Alert threshold:</strong> ${alertThreshold} (min ${threshold}, multiplier ${multiplier}x)</p>
  `;
  return { subject, text, html };
};

const maybeNotifyEmailVerificationCleanupAlert = async (
  result: EmailVerificationCleanupResult,
  now: Date
) => {
  try {
    const totalDeleted = result.deletedUsersByToken + result.deletedUsersWithoutToken;
    const windowSize = await getAppConfigNumber(
      EMAIL_VERIFICATION_CLEANUP_ALERT_WINDOW_KEY,
      DEFAULT_WINDOW_SIZE
    );
    const normalizedWindowSize = Math.max(1, windowSize || DEFAULT_WINDOW_SIZE);

    const metricsRaw = await getAppConfig(EMAIL_VERIFICATION_CLEANUP_METRICS_KEY);
    const metrics = parseCleanupMetrics(metricsRaw, normalizedWindowSize);
    const baselineWindow = metrics.window;
    const baselineSum = baselineWindow.reduce((sum, value) => sum + value, 0);
    const baselineAverage = baselineWindow.length > 0 ? baselineSum / baselineWindow.length : 0;

    const nextMetrics: CleanupMetrics = {
      window: [...baselineWindow, totalDeleted].slice(-normalizedWindowSize),
      lastRunAt: now.toISOString(),
      lastDeletedUsers: totalDeleted,
    };

    await setAppConfig({
      key: EMAIL_VERIFICATION_CLEANUP_METRICS_KEY,
      value: JSON.stringify(nextMetrics),
      updatedBy: SYSTEM_ACTOR,
      dataType: 'string',
    });

    if (totalDeleted <= 0) {
      return;
    }

    const threshold = await getAppConfigNumber(
      EMAIL_VERIFICATION_CLEANUP_ALERT_THRESHOLD_KEY,
      10
    );
    if (!Number.isFinite(threshold) || threshold <= 0) {
      return;
    }

    const multiplier = await getAppConfigNumber(
      EMAIL_VERIFICATION_CLEANUP_ALERT_SPIKE_MULTIPLIER_KEY,
      3
    );
    const normalizedMultiplier = Math.max(1, multiplier || 1);
    const spikeThreshold = baselineAverage > 0 ? Math.ceil(baselineAverage * normalizedMultiplier) : 0;
    const alertThreshold = Math.max(threshold, spikeThreshold);

    if (totalDeleted < alertThreshold) {
      return;
    }

    const cooldownHours = await getAppConfigNumber(
      EMAIL_VERIFICATION_CLEANUP_ALERT_COOLDOWN_HOURS_KEY,
      24
    );
    const lastSentRaw = await getAppConfig(EMAIL_VERIFICATION_CLEANUP_ALERT_LAST_SENT_KEY);
    const lastSent = parseIsoDate(lastSentRaw);
    if (lastSent && cooldownHours > 0) {
      const elapsedMs = now.getTime() - lastSent.getTime();
      if (elapsedMs < cooldownHours * 60 * 60 * 1000) {
        return;
      }
    }

    const adminEmails = getAdminEmails();
    if (adminEmails.length === 0) {
      return;
    }

    const content = buildCleanupAlertEmail({
      totalDeleted,
      deletedUsersByToken: result.deletedUsersByToken,
      deletedUsersWithoutToken: result.deletedUsersWithoutToken,
      deletedTokens: result.deletedTokens,
      averageBaseline: baselineAverage,
      windowSize: normalizedWindowSize,
      threshold,
      multiplier: normalizedMultiplier,
      alertThreshold,
      triggeredAt: now.toISOString(),
    });

    await sendEmail({
      to: adminEmails,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    await setAppConfig({
      key: EMAIL_VERIFICATION_CLEANUP_ALERT_LAST_SENT_KEY,
      value: now.toISOString(),
      updatedBy: SYSTEM_ACTOR,
      dataType: 'string',
    });
  } catch (error) {
    console.error('Email verification cleanup alert failed:', error);
  }
};

export const cleanupUnverifiedUsers = async (
  now: Date = new Date()
): Promise<EmailVerificationCleanupResult> => {
  const cutoff = new Date(
    now.getTime() - EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000
  );

  const expiredTokens = await prisma.emailVerificationToken.findMany({
    where: { expires: { lt: now } },
    select: { email: true },
  });
  const expiredEmails = uniqueEmails(expiredTokens);

  let deletedUsersByToken = 0;
  if (expiredEmails.length > 0) {
    const result = await prisma.user.deleteMany({
      where: {
        emailVerified: null,
        password: { not: null },
        email: { in: expiredEmails },
      },
    });
    deletedUsersByToken = result.count;
  }

  const activeTokens = await prisma.emailVerificationToken.findMany({
    where: { expires: { gte: now } },
    select: { email: true },
  });
  const activeEmails = uniqueEmails(activeTokens);
  const emailFilter: { not?: null; notIn?: string[] } = { not: null };
  if (activeEmails.length > 0) {
    emailFilter.notIn = activeEmails;
  }

  const staleUsers = await prisma.user.deleteMany({
    where: {
      emailVerified: null,
      password: { not: null },
      createdAt: { lt: cutoff },
      email: emailFilter,
    },
  });

  const deletedTokens = await prisma.emailVerificationToken.deleteMany({
    where: { expires: { lt: now } },
  });

  const result = {
    deletedUsersByToken,
    deletedUsersWithoutToken: staleUsers.count,
    deletedTokens: deletedTokens.count,
  };

  await maybeNotifyEmailVerificationCleanupAlert(result, now);

  return result;
};
