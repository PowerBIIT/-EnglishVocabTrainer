import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getCurrentPeriod, getNextPeriodResetAt, checkAndConsumeAiUsage } from '@/lib/aiUsage';
import { getGlobalLimits, getPlanLimits } from '@/lib/plans';
import type { Plan } from '@prisma/client';

// Track usage state for realistic mock behavior
let userUsageState = { count: 0, units: 0 };
let globalUsageState = { count: 0, units: 0 };

const createTxMock = () => ({
  usageCounter: {
    upsert: vi.fn((args) => {
      const increment = args.update?.count?.increment ?? 0;
      const unitIncrement = args.update?.units?.increment ?? 0;
      userUsageState.count += increment || args.create?.count || 0;
      userUsageState.units += unitIncrement || args.create?.units || 0;
      return Promise.resolve({ ...userUsageState });
    }),
    update: vi.fn((args) => {
      const decrement = args.data?.count?.decrement ?? 0;
      const unitDecrement = args.data?.units?.decrement ?? 0;
      userUsageState.count -= decrement;
      userUsageState.units -= unitDecrement;
      return Promise.resolve({ ...userUsageState });
    }),
  },
  globalUsage: {
    upsert: vi.fn((args) => {
      const increment = args.update?.count?.increment ?? 0;
      const unitIncrement = args.update?.units?.increment ?? 0;
      globalUsageState.count += increment || args.create?.count || 0;
      globalUsageState.units += unitIncrement || args.create?.units || 0;
      return Promise.resolve({ ...globalUsageState });
    }),
    update: vi.fn((args) => {
      const decrement = args.data?.count?.decrement ?? 0;
      const unitDecrement = args.data?.units?.decrement ?? 0;
      globalUsageState.count -= decrement;
      globalUsageState.units -= unitDecrement;
      return Promise.resolve({ ...globalUsageState });
    }),
  },
});

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
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
    userUsageState = { count: 0, units: 0 };
    globalUsageState = { count: 0, units: 0 };
    prismaMock.$transaction.mockClear();
    prismaMock.$transaction.mockImplementation(async (callback) => {
      const txMock = createTxMock();
      return callback(txMock);
    });
    vi.mocked(getPlanLimits).mockReset();
    vi.mocked(getGlobalLimits).mockReset();
  });

  it('computes the current period and reset timestamp', () => {
    const date = new Date(Date.UTC(2024, 5, 15, 10, 0, 0));
    expect(getCurrentPeriod(date)).toBe('2024-06');
    expect(getNextPeriodResetAt(date)).toBe('2024-07-01T00:00:00.000Z');
  });

  it('allows usage within limits and increments counters', async () => {
    vi.mocked(getPlanLimits).mockResolvedValue({ maxRequests: 10, maxUnits: 100 });
    vi.mocked(getGlobalLimits).mockResolvedValue({ maxRequests: 100, maxUnits: 1000 });

    const result = await checkAndConsumeAiUsage({
      userId: 'user-1',
      plan: 'FREE' as Plan,
      units: 5,
      requests: 1,
    });

    expect(result).toEqual({ ok: true });
    expect(userUsageState.count).toBe(1);
    expect(userUsageState.units).toBe(5);
    expect(globalUsageState.count).toBe(1);
    expect(globalUsageState.units).toBe(5);
  });

  it('blocks and rolls back when global limit is exceeded', async () => {
    globalUsageState = { count: 99, units: 990 };
    vi.mocked(getPlanLimits).mockResolvedValue({ maxRequests: 1000, maxUnits: 10000 });
    vi.mocked(getGlobalLimits).mockResolvedValue({ maxRequests: 100, maxUnits: 1000 });

    const result = await checkAndConsumeAiUsage({
      userId: 'user-2',
      plan: 'FREE' as Plan,
      units: 15,
      requests: 2,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.scope).toBe('global');
    }
    // After rollback, state should be back to original
    expect(globalUsageState.count).toBe(99);
    expect(globalUsageState.units).toBe(990);
  });

  it('blocks and rolls back when user limit is exceeded', async () => {
    userUsageState = { count: 9, units: 95 };
    vi.mocked(getPlanLimits).mockResolvedValue({ maxRequests: 10, maxUnits: 100 });
    vi.mocked(getGlobalLimits).mockResolvedValue({ maxRequests: 1000, maxUnits: 10000 });

    const result = await checkAndConsumeAiUsage({
      userId: 'user-3',
      plan: 'PRO' as Plan,
      units: 10,
      requests: 2,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.scope).toBe('user');
    }
    // After rollback, state should be back to original
    expect(userUsageState.count).toBe(9);
    expect(userUsageState.units).toBe(95);
  });

  it('uses interactive transaction callback', async () => {
    vi.mocked(getPlanLimits).mockResolvedValue({ maxRequests: 10, maxUnits: 100 });
    vi.mocked(getGlobalLimits).mockResolvedValue({ maxRequests: 100, maxUnits: 1000 });

    await checkAndConsumeAiUsage({
      userId: 'user-4',
      plan: 'FREE' as Plan,
      units: 1,
      requests: 1,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(typeof prismaMock.$transaction.mock.calls[0][0]).toBe('function');
  });

  it('enforces minimum 1 for requests and units', async () => {
    vi.mocked(getPlanLimits).mockResolvedValue({ maxRequests: 10, maxUnits: 100 });
    vi.mocked(getGlobalLimits).mockResolvedValue({ maxRequests: 100, maxUnits: 1000 });

    await checkAndConsumeAiUsage({
      userId: 'user-5',
      plan: 'FREE' as Plan,
      units: 0.2,
      requests: 0,
    });

    expect(userUsageState.count).toBe(1);
    expect(userUsageState.units).toBe(1);
  });
});
