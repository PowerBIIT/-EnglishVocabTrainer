import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildAiCostLimitStatus, checkAiCostLimit } from '@/lib/aiCostLimit';
import { getAppConfigNumber } from '@/lib/config';
import { getAiCostTotals } from '@/lib/aiCost';

vi.mock('@/lib/config', () => ({
  getAppConfigNumber: vi.fn(),
}));

vi.mock('@/lib/aiCost', () => ({
  getAiCostTotals: vi.fn(),
}));

const sampleTotals = {
  period: '2024-06',
  periodStart: new Date(Date.UTC(2024, 5, 1, 0, 0, 0)),
  periodEnd: new Date(Date.UTC(2024, 6, 1, 0, 0, 0)),
  day: 15,
  daysInMonth: 30,
  totalCost: 40,
  projectedCost: 80,
};

describe('aiCostLimit', () => {
  beforeEach(() => {
    vi.mocked(getAppConfigNumber).mockReset();
    vi.mocked(getAiCostTotals).mockReset();
  });

  it('disables limits when configured with zero', () => {
    const status = buildAiCostLimitStatus(sampleTotals, 0);
    expect(status.enabled).toBe(false);
    expect(status.limitUsd).toBeNull();
    expect(status.remainingUsd).toBeNull();
    expect(status.isExceeded).toBe(false);
  });

  it('reports remaining budget when under limit', () => {
    const status = buildAiCostLimitStatus({ ...sampleTotals, totalCost: 20 }, 50);
    expect(status.enabled).toBe(true);
    expect(status.isExceeded).toBe(false);
    expect(status.remainingUsd).toBe(30);
  });

  it('marks limit as exceeded when at or above cap', () => {
    const status = buildAiCostLimitStatus({ ...sampleTotals, totalCost: 50 }, 50);
    expect(status.enabled).toBe(true);
    expect(status.isExceeded).toBe(true);
    expect(status.remainingUsd).toBe(0);
  });

  it('returns ok when limit is disabled', async () => {
    vi.mocked(getAppConfigNumber).mockResolvedValue(0);

    const result = await checkAiCostLimit();

    expect(result).toEqual({ ok: true });
    expect(getAiCostTotals).not.toHaveBeenCalled();
  });

  it('returns ok with status when below limit', async () => {
    vi.mocked(getAppConfigNumber).mockResolvedValue(100);
    vi.mocked(getAiCostTotals).mockResolvedValue({
      ...sampleTotals,
      totalCost: 40,
    });

    const result = await checkAiCostLimit();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status?.remainingUsd).toBe(60);
    }
  });

  it('returns error when limit is exceeded', async () => {
    vi.mocked(getAppConfigNumber).mockResolvedValue(50);
    vi.mocked(getAiCostTotals).mockResolvedValue({
      ...sampleTotals,
      totalCost: 60,
    });

    const result = await checkAiCostLimit();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status.isExceeded).toBe(true);
    }
  });
});
