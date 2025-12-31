import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Plan } from '@prisma/client';
import { getAppConfigNumber } from '@/lib/config';
import { getGlobalLimits, getPlanLimits } from '@/lib/plans';

vi.mock('@/lib/config', () => ({
  getAppConfigNumber: vi.fn(),
}));

describe('plan limits', () => {
  beforeEach(() => {
    vi.mocked(getAppConfigNumber).mockReset();
  });

  it('loads free plan limits', async () => {
    vi.mocked(getAppConfigNumber)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(1000);

    await expect(getPlanLimits(Plan.FREE)).resolves.toEqual({
      maxRequests: 10,
      maxUnits: 1000,
    });
  });

  it('loads pro plan limits', async () => {
    vi.mocked(getAppConfigNumber)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(2000);

    await expect(getPlanLimits(Plan.PRO)).resolves.toEqual({
      maxRequests: 20,
      maxUnits: 2000,
    });
  });

  it('loads global limits', async () => {
    vi.mocked(getAppConfigNumber)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(10000);

    await expect(getGlobalLimits()).resolves.toEqual({
      maxRequests: 100,
      maxUnits: 10000,
    });
  });
});
