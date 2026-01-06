import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AccessStatus, Plan } from '@prisma/client';
import { checkAiUsageLimits, checkAndConsumeAiUsage } from '@/lib/aiUsage';
import { isAdminEmail } from '@/lib/access';
import { ensureUserPlan } from '@/lib/userPlan';
import { checkAiCostLimit } from '@/lib/aiCostLimit';
import { ensureAiAccess, enforceAiUsage } from '@/lib/aiAccess';

vi.mock('@/lib/aiUsage', () => ({
  checkAndConsumeAiUsage: vi.fn(),
  checkAiUsageLimits: vi.fn(),
}));

vi.mock('@/lib/userPlan', () => ({
  ensureUserPlan: vi.fn(),
}));

vi.mock('@/lib/access', () => ({
  isAdminEmail: vi.fn(),
}));

vi.mock('@/lib/aiCostLimit', () => ({
  checkAiCostLimit: vi.fn(),
  buildAiCostLimitPayload: vi.fn((status: { resetAt: string }) => ({
    error: 'ai_cost_limit_reached',
    resetAt: status.resetAt,
    costLimit: {
      limitUsd: 0,
      usedUsd: 0,
      remainingUsd: 0,
      period: '2024-01',
      resetAt: status.resetAt,
    },
  })),
}));

describe('enforceAiUsage', () => {
  beforeEach(() => {
    vi.mocked(checkAndConsumeAiUsage).mockReset();
    vi.mocked(checkAiUsageLimits).mockReset();
    vi.mocked(ensureUserPlan).mockReset();
    vi.mocked(isAdminEmail).mockReset();
    vi.mocked(isAdminEmail).mockReturnValue(false);
    vi.mocked(checkAiCostLimit).mockResolvedValue({ ok: true });
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

  it('bypasses usage consumption for admins', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.ACTIVE,
      plan: Plan.PRO,
    });
    vi.mocked(isAdminEmail).mockReturnValue(true);

    await expect(
      enforceAiUsage({ userId: 'admin-1', email: 'admin@example.com', units: 50 })
    ).resolves.toEqual({ ok: true });

    expect(checkAndConsumeAiUsage).not.toHaveBeenCalled();
  });
});

describe('ensureAiAccess', () => {
  beforeEach(() => {
    vi.mocked(checkAiUsageLimits).mockReset();
    vi.mocked(ensureUserPlan).mockReset();
    vi.mocked(isAdminEmail).mockReset();
    vi.mocked(isAdminEmail).mockReturnValue(false);
    vi.mocked(checkAiCostLimit).mockResolvedValue({ ok: true });
  });

  it('allows active users when within limits', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.ACTIVE,
      plan: Plan.FREE,
    });
    vi.mocked(checkAiUsageLimits).mockResolvedValue({ ok: true });

    await expect(
      ensureAiAccess({ userId: 'user-5', email: 'user@example.com' })
    ).resolves.toEqual({ ok: true });
  });

  it('blocks waitlisted users', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.WAITLISTED,
      plan: Plan.FREE,
    });

    await expect(
      ensureAiAccess({ userId: 'user-7', email: 'user@example.com' })
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
      ensureAiAccess({ userId: 'user-8', email: 'user@example.com' })
    ).resolves.toEqual({
      ok: false,
      status: 403,
      body: { error: 'suspended' },
    });
  });

  it('blocks when usage limit is reached', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.ACTIVE,
      plan: Plan.FREE,
    });
    vi.mocked(checkAiUsageLimits).mockResolvedValue({
      ok: false,
      scope: 'user',
      limit: { maxRequests: 10, maxUnits: 100 },
      usage: { count: 10, units: 100 },
      resetAt: '2024-10-01T00:00:00.000Z',
    });

    const result = await ensureAiAccess({ userId: 'user-6', email: 'user@example.com' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.body.error).toBe('user_limit_reached');
      expect(result.body.softLimit).toBe(true);
    }
  });

  it('blocks when cost limit is reached', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.ACTIVE,
      plan: Plan.FREE,
    });
    vi.mocked(checkAiCostLimit).mockResolvedValue({
      ok: false,
      status: {
        enabled: true,
        limitUsd: 50,
        usedUsd: 75,
        remainingUsd: 0,
        isExceeded: true,
        period: '2024-06',
        resetAt: '2024-07-01T00:00:00.000Z',
      },
    });

    const result = await ensureAiAccess({ userId: 'user-9', email: 'user@example.com' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.body.error).toBe('ai_cost_limit_reached');
    }
    expect(checkAiUsageLimits).not.toHaveBeenCalled();
  });

  it('bypasses limit checks for admins', async () => {
    vi.mocked(ensureUserPlan).mockResolvedValue({
      accessStatus: AccessStatus.ACTIVE,
      plan: Plan.PRO,
    });
    vi.mocked(isAdminEmail).mockReturnValue(true);

    await expect(
      ensureAiAccess({ userId: 'admin-2', email: 'admin@example.com' })
    ).resolves.toEqual({ ok: true });

    expect(checkAiUsageLimits).not.toHaveBeenCalled();
  });
});
