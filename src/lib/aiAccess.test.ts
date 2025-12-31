import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AccessStatus, Plan } from '@prisma/client';
import { checkAndConsumeAiUsage } from '@/lib/aiUsage';
import { ensureUserPlan } from '@/lib/userPlan';
import { enforceAiUsage } from '@/lib/aiAccess';

vi.mock('@/lib/aiUsage', () => ({
  checkAndConsumeAiUsage: vi.fn(),
}));

vi.mock('@/lib/userPlan', () => ({
  ensureUserPlan: vi.fn(),
}));

describe('enforceAiUsage', () => {
  beforeEach(() => {
    vi.mocked(checkAndConsumeAiUsage).mockReset();
    vi.mocked(ensureUserPlan).mockReset();
  });

  it('allows active users when usage ok', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.ACTIVE,
      plan: Plan.FREE,
    });
    vi.mocked(checkAndConsumeAiUsage).mockResolvedValue({ ok: true });

    await expect(
      enforceAiUsage({ userId: 'user-1', email: 'user@example.com', units: 5 })
    ).resolves.toEqual({ ok: true });
  });

  it('blocks waitlisted users', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.WAITLISTED,
      plan: Plan.FREE,
    });

    await expect(
      enforceAiUsage({ userId: 'user-2', email: 'user@example.com', units: 5 })
    ).resolves.toEqual({
      ok: false,
      status: 403,
      body: { error: 'waitlisted' },
    });
  });

  it('blocks suspended users', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.SUSPENDED,
      plan: Plan.FREE,
    });

    await expect(
      enforceAiUsage({ userId: 'user-4', email: 'user@example.com', units: 5 })
    ).resolves.toEqual({
      ok: false,
      status: 403,
      body: { error: 'suspended' },
    });
  });

  it('maps usage errors to a 429 response', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.ACTIVE,
      plan: Plan.PRO,
    });
    vi.mocked(checkAndConsumeAiUsage).mockResolvedValue({
      ok: false,
      scope: 'user',
      limit: { maxRequests: 10, maxUnits: 100 },
      usage: { count: 11, units: 150 },
      resetAt: '2024-10-01T00:00:00.000Z',
    });

    const result = await enforceAiUsage({ userId: 'user-3', units: 10 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.body.error).toBe('user_limit_reached');
      expect(result.body.softLimit).toBe(true);
    }
  });
});
