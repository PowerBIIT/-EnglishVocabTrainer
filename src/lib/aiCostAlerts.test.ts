import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  maybeNotifyAiCostAlert,
  AI_COST_ALERT_THRESHOLD_KEY,
  AI_COST_ALERT_WEBHOOK_URL_KEY,
  AI_COST_ALERT_LAST_SENT_KEY,
  AI_COST_ALERT_LAST_CHECK_AT_KEY,
  AI_COST_ALERT_CHECK_INTERVAL_MINUTES_KEY,
} from '@/lib/aiCostAlerts';
import { getAdminEmails } from '@/lib/access';
import { getAppConfig, getAppConfigNumber, setAppConfig } from '@/lib/config';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

vi.mock('@/lib/access', () => ({
  getAdminEmails: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
  getAppConfig: vi.fn(),
  getAppConfigNumber: vi.fn(),
  setAppConfig: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    aiRequestLog: {
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
}));

describe('aiCostAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 5, 15, 12, 0, 0)));

    vi.mocked(getAdminEmails).mockReturnValue(['admin@example.com']);
    vi.mocked(getAppConfigNumber).mockImplementation(async (key, fallback) => {
      if (key === AI_COST_ALERT_THRESHOLD_KEY) return 100;
      if (key === AI_COST_ALERT_CHECK_INTERVAL_MINUTES_KEY) return 0;
      return fallback;
    });
    vi.mocked(getAppConfig).mockResolvedValue(null);
    vi.mocked(prisma.aiRequestLog.aggregate).mockResolvedValue({
      _sum: { totalCost: 150 },
    });
    vi.mocked(sendEmail).mockResolvedValue(undefined);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends webhook and email when threshold is exceeded', async () => {
    vi.mocked(getAppConfig).mockImplementation(async (key) => {
      if (key === AI_COST_ALERT_WEBHOOK_URL_KEY) {
        return 'https://example.com/webhook';
      }
      return null;
    });

    await maybeNotifyAiCostAlert();

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['admin@example.com'],
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({ method: 'POST' })
    );
    expect(setAppConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        key: AI_COST_ALERT_LAST_SENT_KEY,
      })
    );
  });

  it('skips sending when already notified for the period', async () => {
    vi.mocked(getAppConfig).mockImplementation(async (key) => {
      if (key === AI_COST_ALERT_WEBHOOK_URL_KEY) {
        return 'https://example.com/webhook';
      }
      if (key === AI_COST_ALERT_LAST_SENT_KEY) {
        return '2024-06:100';
      }
      return null;
    });

    await maybeNotifyAiCostAlert();

    expect(sendEmail).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('skips checks when the interval has not elapsed', async () => {
    vi.mocked(getAppConfigNumber).mockImplementation(async (key, fallback) => {
      if (key === AI_COST_ALERT_THRESHOLD_KEY) return 100;
      if (key === AI_COST_ALERT_CHECK_INTERVAL_MINUTES_KEY) return 60;
      return fallback;
    });
    vi.mocked(getAppConfig).mockImplementation(async (key) => {
      if (key === AI_COST_ALERT_LAST_CHECK_AT_KEY) {
        return new Date(Date.UTC(2024, 5, 15, 11, 30, 0)).toISOString();
      }
      return null;
    });

    await maybeNotifyAiCostAlert();

    expect(prisma.aiRequestLog.aggregate).not.toHaveBeenCalled();
  });
});
