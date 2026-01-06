import { getAdminEmails } from '@/lib/access';
import { getAiCostTotals } from '@/lib/aiCost';
import { getAppConfig, getAppConfigNumber, setAppConfig } from '@/lib/config';
import { sendEmail } from '@/lib/email';

export const AI_COST_ALERT_THRESHOLD_KEY = 'AI_COST_ALERT_THRESHOLD_USD';
export const AI_COST_ALERT_WEBHOOK_URL_KEY = 'AI_COST_ALERT_WEBHOOK_URL';
export const AI_COST_ALERT_LAST_SENT_KEY = 'AI_COST_ALERT_LAST_SENT';
export const AI_COST_ALERT_LAST_CHECK_AT_KEY = 'AI_COST_ALERT_LAST_CHECK_AT';
export const AI_COST_ALERT_CHECK_INTERVAL_MINUTES_KEY = 'AI_COST_ALERT_CHECK_INTERVAL_MINUTES';

const SYSTEM_ACTOR = 'system';

const parseIsoDate = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const shouldCheckAlerts = async (now: Date) => {
  const intervalMinutes = await getAppConfigNumber(
    AI_COST_ALERT_CHECK_INTERVAL_MINUTES_KEY,
    15
  );
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    return true;
  }

  const lastCheckRaw = await getAppConfig(AI_COST_ALERT_LAST_CHECK_AT_KEY);
  const lastCheck = parseIsoDate(lastCheckRaw);
  if (lastCheck) {
    const elapsedMs = now.getTime() - lastCheck.getTime();
    if (elapsedMs < intervalMinutes * 60 * 1000) {
      return false;
    }
  }

  await setAppConfig({
    key: AI_COST_ALERT_LAST_CHECK_AT_KEY,
    value: now.toISOString(),
    updatedBy: SYSTEM_ACTOR,
    dataType: 'string',
  });
  return true;
};

const formatUsd = (value: number) => `$${value.toFixed(2)}`;

const buildEmailContent = (payload: {
  period: string;
  totalCost: number;
  projectedCost: number;
  threshold: number;
}) => {
  const { period, totalCost, projectedCost, threshold } = payload;
  const subject = `AI cost alert: ${formatUsd(totalCost)} in ${period}`;
  const text = [
    `AI cost alert for period ${period}.`,
    `Actual month-to-date: ${formatUsd(totalCost)}`,
    `Projected end-of-month: ${formatUsd(projectedCost)}`,
    `Threshold: ${formatUsd(threshold)}`,
  ].join('\n');
  const html = `
    <h2>AI cost alert</h2>
    <p><strong>Period:</strong> ${period}</p>
    <p><strong>Actual month-to-date:</strong> ${formatUsd(totalCost)}</p>
    <p><strong>Projected end-of-month:</strong> ${formatUsd(projectedCost)}</p>
    <p><strong>Threshold:</strong> ${formatUsd(threshold)}</p>
  `;
  return { subject, text, html };
};

export const maybeNotifyAiCostAlert = async () => {
  try {
    const threshold = await getAppConfigNumber(AI_COST_ALERT_THRESHOLD_KEY, 0);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      return;
    }

    const [webhookUrl, adminEmails] = await Promise.all([
      getAppConfig(AI_COST_ALERT_WEBHOOK_URL_KEY),
      Promise.resolve(getAdminEmails()),
    ]);

    if (!webhookUrl && adminEmails.length === 0) {
      return;
    }

    const now = new Date();
    const canCheck = await shouldCheckAlerts(now);
    if (!canCheck) return;

    const { period, totalCost, projectedCost } = await getAiCostTotals(now);

    if (totalCost < threshold && projectedCost < threshold) {
      return;
    }

    const lastSent = await getAppConfig(AI_COST_ALERT_LAST_SENT_KEY);
    const currentSentKey = `${period}:${threshold}`;
    if (lastSent === currentSentKey) {
      return;
    }

    const payload = {
      type: 'ai_cost_alert',
      period,
      totalCost,
      projectedCost,
      threshold,
      currency: 'USD',
      triggeredAt: now.toISOString(),
    };

    const notifications: Promise<unknown>[] = [];

    if (webhookUrl) {
      notifications.push(
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      );
    }

    if (adminEmails.length > 0) {
      const content = buildEmailContent({
        period,
        totalCost,
        projectedCost,
        threshold,
      });
      notifications.push(
        sendEmail({
          to: adminEmails,
          subject: content.subject,
          html: content.html,
          text: content.text,
        })
      );
    }

    await Promise.allSettled(notifications);

    await setAppConfig({
      key: AI_COST_ALERT_LAST_SENT_KEY,
      value: currentSentKey,
      updatedBy: SYSTEM_ACTOR,
      dataType: 'string',
    });
  } catch (error) {
    console.error('AI cost alert failed:', error);
  }
};
