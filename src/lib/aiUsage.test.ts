import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getCurrentPeriod, getNextPeriodResetAt, checkAndConsumeAiUsage } from '@/lib/aiUsage';
import { getGlobalLimits, getPlanLimits } from '@/lib/plans';
import type { Plan } from '@prisma/client';

const prismaMock = vi.hoisted(() => ({
  usageCounter: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  globalUsage: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/plans', () => ({
  getPlanLimits: vi.fn(),
  getGlobalLimits: vi.fn(),
}));

describe('ai usage limits', () => {
  beforeEach(() => {
    prismaMock.usageCounter.findUnique.mockReset();
    prismaMock.globalUsage.findUnique.mockReset();
    prismaMock.usageCounter.upsert.mockReset();
    prismaMock.globalUsage.upsert.mockReset();
    prismaMock.$transaction.mockClear();
    vi.mocked(getPlanLimits).mockReset();
    vi.mocked(getGlobalLimits).mockReset();
  });

  it('computes the current period and reset timestamp', () => {
    const date = new Date(Date.UTC(2024, 5, 15, 10, 0, 0));
    expect(getCurrentPeriod(date)).toBe('2024-06');
    expect(getNextPeriodResetAt(date)).toBe('2024-07-01T00:00:00.000Z');
  });

  it('allows usage within limits and upserts counters', async () => {
    prismaMock.usageCounter.findUnique.mockResolvedValue(null);
    prismaMock.globalUsage.findUnique.mockResolvedValue(null);
    vi.mocked(getPlanLimits).mockResolvedValue({ maxRequests: 10, maxUnits: 100 });
    vi.mocked(getGlobalLimits).mockResolvedValue({ maxRequests: 100, maxUnits: 1000 });
    prismaMock.usageCounter.upsert.mockResolvedValue({});
    prismaMock.globalUsage.upsert.mockResolvedValue({});

    const result = await checkAndConsumeAiUsage({
      userId: 'user-1',
      plan: 'FREE' as Plan,
      units: 0.2,
      requests: 0,
    });

    expect(result).toEqual({ ok: true });
    expect(prismaMock.usageCounter.upsert).toHaveBeenCalled();
    const createArgs = prismaMock.usageCounter.upsert.mock.calls[0][0].create;
    expect(createArgs.count).toBe(1);
    expect(createArgs.units).toBe(1);
  });

  it('blocks when the global limit is reached', async () => {
    prismaMock.usageCounter.findUnique.mockResolvedValue({ count: 0, units: 0 });
    prismaMock.globalUsage.findUnique.mockResolvedValue({ count: 1, units: 1 });
    vi.mocked(getPlanLimits).mockResolvedValue({ maxRequests: 10, maxUnits: 100 });
    vi.mocked(getGlobalLimits).mockResolvedValue({ maxRequests: 1, maxUnits: 1 });

    const result = await checkAndConsumeAiUsage({
      userId: 'user-2',
      plan: 'FREE' as Plan,
      units: 1,
      requests: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.scope).toBe('global');
      expect(result.limit.maxRequests).toBe(1);
    }
    expect(prismaMock.usageCounter.upsert).not.toHaveBeenCalled();
  });

  it('blocks when the user limit is reached', async () => {
    prismaMock.usageCounter.findUnique.mockResolvedValue({ count: 5, units: 50 });
    prismaMock.globalUsage.findUnique.mockResolvedValue({ count: 0, units: 0 });
    vi.mocked(getPlanLimits).mockResolvedValue({ maxRequests: 5, maxUnits: 50 });
    vi.mocked(getGlobalLimits).mockResolvedValue({ maxRequests: 100, maxUnits: 1000 });

    const result = await checkAndConsumeAiUsage({
      userId: 'user-3',
      plan: 'PRO' as Plan,
      units: 1,
      requests: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.scope).toBe('user');
      expect(result.limit.maxUnits).toBe(50);
    }
    expect(prismaMock.usageCounter.upsert).not.toHaveBeenCalled();
  });
});
