import crypto from 'crypto';
import type { WaitlistEntry } from '@prisma/client';
import { AccessStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getAdminEmails, getMaxActiveUsers } from '@/lib/access';
import { sendWaitlistApprovedEmail } from '@/lib/waitlistEmail';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const parseNumberEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

const CONFIRM_TTL_HOURS = parseNumberEnv(process.env.WAITLIST_CONFIRM_TTL_HOURS, 24);
const RESEND_COOLDOWN_MINUTES = parseNumberEnv(
  process.env.WAITLIST_CONFIRM_RESEND_MINUTES,
  10
);
const CONFIRM_TTL_MS = CONFIRM_TTL_HOURS * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_MINUTES * 60 * 1000;

const generateToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export type WaitlistCreateResult = {
  status: 'pending' | 'confirmed' | 'approved';
  entry: WaitlistEntry;
  token?: string;
  shouldSendConfirmation: boolean;
};

export const createWaitlistEntry = async ({
  email,
  source,
  language,
  metadata,
}: {
  email: string;
  source?: string | null;
  language?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<WaitlistCreateResult> => {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.waitlistEntry.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing?.status === 'APPROVED') {
    return { status: 'approved', entry: existing, shouldSendConfirmation: false };
  }

  if (existing?.status === 'CONFIRMED') {
    return { status: 'confirmed', entry: existing, shouldSendConfirmation: false };
  }

  const now = new Date();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(now.getTime() + CONFIRM_TTL_MS);

  if (existing) {
    const canResend =
      !existing.confirmationSentAt ||
      now.getTime() - existing.confirmationSentAt.getTime() > RESEND_COOLDOWN_MS;

    if (!canResend) {
      return { status: 'pending', entry: existing, shouldSendConfirmation: false };
    }

    const updated = await prisma.waitlistEntry.update({
      where: { id: existing.id },
      data: {
        status: 'PENDING',
        confirmationTokenHash: tokenHash,
        confirmationExpiresAt: expiresAt,
        confirmationSentAt: now,
        source: source ?? existing.source,
        language: language ?? existing.language,
        metadata: metadata ?? existing.metadata,
      },
    });

    return {
      status: 'pending',
      entry: updated,
      token,
      shouldSendConfirmation: true,
    };
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      email: normalizedEmail,
      status: 'PENDING',
      confirmationTokenHash: tokenHash,
      confirmationExpiresAt: expiresAt,
      confirmationSentAt: now,
      source: source ?? undefined,
      language: language ?? undefined,
      metadata: metadata ?? undefined,
    },
  });

  return {
    status: 'pending',
    entry,
    token,
    shouldSendConfirmation: true,
  };
};

export const confirmWaitlistToken = async (token: string) => {
  const tokenHash = hashToken(token);
  const entry = await prisma.waitlistEntry.findFirst({
    where: { confirmationTokenHash: tokenHash },
  });

  if (!entry) {
    return { ok: false as const, reason: 'invalid' as const };
  }

  if (entry.status === 'APPROVED') {
    return { ok: true as const, status: 'approved' as const, entry };
  }

  const now = new Date();
  if (entry.confirmationExpiresAt && entry.confirmationExpiresAt < now) {
    return { ok: false as const, reason: 'expired' as const, entry };
  }

  const updated = await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      status: 'CONFIRMED',
      confirmedAt: now,
      confirmationTokenHash: null,
      confirmationExpiresAt: null,
    },
  });

  return { ok: true as const, status: 'confirmed' as const, entry: updated };
};

const getActiveUserCount = async () => {
  const adminEmails = getAdminEmails();
  return prisma.userPlan.count({
    where: {
      accessStatus: AccessStatus.ACTIVE,
      user: {
        email: {
          notIn: adminEmails.length > 0 ? adminEmails : undefined,
        },
      },
    },
  });
};

export const autoApproveWaitlist = async (): Promise<WaitlistEntry[]> => {
  const maxActiveUsers = await getMaxActiveUsers();
  const activeCount = await getActiveUserCount();
  const availableSlots = Number.isFinite(maxActiveUsers)
    ? Math.max(0, maxActiveUsers - activeCount)
    : Number.POSITIVE_INFINITY;

  if (availableSlots <= 0) {
    return [];
  }

  const entries = await prisma.waitlistEntry.findMany({
    where: { status: 'CONFIRMED' },
    orderBy: [{ confirmedAt: 'asc' }, { createdAt: 'asc' }],
    take: Number.isFinite(availableSlots) ? availableSlots : undefined,
  });

  if (entries.length === 0) {
    return [];
  }

  const now = new Date();
  await prisma.waitlistEntry.updateMany({
    where: { id: { in: entries.map((entry) => entry.id) }, status: 'CONFIRMED' },
    data: { status: 'APPROVED', approvedAt: now },
  });

  await prisma.userPlan.updateMany({
    where: {
      accessStatus: AccessStatus.WAITLISTED,
      user: { email: { in: entries.map((entry) => entry.email) } },
    },
    data: { accessStatus: AccessStatus.ACTIVE },
  });

  return entries.map((entry) => ({
    ...entry,
    status: 'APPROVED',
    approvedAt: now,
  }));
};

export const autoApproveWaitlistAndNotify = async () => {
  const approved = await autoApproveWaitlist();
  await Promise.all(
    approved.map((entry) =>
      sendWaitlistApprovedEmail({
        email: entry.email,
        language: entry.language,
      }).catch((error) => {
        console.error('Failed to send waitlist approval email:', error);
      })
    )
  );
  return approved;
};
