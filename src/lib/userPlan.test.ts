import { describe, expect, it, beforeEach, vi } from 'vitest';
import { AccessStatus, Plan } from '@prisma/client';
const prismaMock = vi.hoisted(() => ({
  userPlan: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
}));

const accessMock = vi.hoisted(() => ({
  getAdminEmails: vi.fn(),
  getMaxActiveUsers: vi.fn(),
  isAdminEmail: vi.fn(),
  isOnAllowlist: vi.fn(),
  isWaitlistApproved: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/access', () => ({
  getAdminEmails: accessMock.getAdminEmails,
  getMaxActiveUsers: accessMock.getMaxActiveUsers,
  isAdminEmail: accessMock.isAdminEmail,
  isOnAllowlist: accessMock.isOnAllowlist,
  isWaitlistApproved: accessMock.isWaitlistApproved,
}));

const loadUserPlan = async () => import('@/lib/userPlan');

describe('user plan enforcement', () => {
  beforeEach(() => {
    prismaMock.userPlan.findUnique.mockReset();
    prismaMock.userPlan.create.mockReset();
    prismaMock.userPlan.update.mockReset();
    prismaMock.userPlan.count.mockReset();
    accessMock.getAdminEmails.mockReset();
    accessMock.getMaxActiveUsers.mockReset();
    accessMock.isAdminEmail.mockReset();
    accessMock.isOnAllowlist.mockReset();
    accessMock.isWaitlistApproved.mockReset();
    // Default: not admin, not VIP, not waitlist approved
    accessMock.isAdminEmail.mockReturnValue(false);
    accessMock.isOnAllowlist.mockResolvedValue(false);
    accessMock.isWaitlistApproved.mockResolvedValue(false);
    vi.resetModules();
  });

  it('returns suspended plans immediately', async () => {
    const existing = { accessStatus: AccessStatus.SUSPENDED };
    prismaMock.userPlan.findUnique.mockResolvedValue(existing);

    const { ensureUserPlan } = await loadUserPlan();
    const result = await ensureUserPlan('user-1', 'user@example.com');

    expect(result).toEqual(existing);
    expect(prismaMock.userPlan.create).not.toHaveBeenCalled();
  });

  it('creates waitlisted plan when limit is exceeded', async () => {
    prismaMock.userPlan.findUnique.mockResolvedValue(null);
    accessMock.getMaxActiveUsers.mockResolvedValue(5);
    accessMock.getAdminEmails.mockReturnValue([]);
    prismaMock.userPlan.count.mockResolvedValue(5); // At limit

    const { ensureUserPlan } = await loadUserPlan();
    await ensureUserPlan('user-2', 'user@example.com');

    expect(prismaMock.userPlan.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-2',
        plan: Plan.FREE,
        accessStatus: AccessStatus.WAITLISTED,
      },
    });
  });

  it('allows admin email regardless of limits', async () => {
    prismaMock.userPlan.findUnique.mockResolvedValue(null);
    accessMock.isAdminEmail.mockReturnValue(true);

    const { ensureUserPlan } = await loadUserPlan();
    await ensureUserPlan('user-3', 'admin@example.com');

    expect(prismaMock.userPlan.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-3',
        plan: Plan.FREE,
        accessStatus: AccessStatus.ACTIVE,
      },
    });
  });

  it('allows VIP on allowlist regardless of limits', async () => {
    prismaMock.userPlan.findUnique.mockResolvedValue(null);
    accessMock.isOnAllowlist.mockResolvedValue(true);

    const { ensureUserPlan } = await loadUserPlan();
    await ensureUserPlan('user-vip', 'vip@example.com');

    expect(prismaMock.userPlan.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-vip',
        plan: Plan.FREE,
        accessStatus: AccessStatus.ACTIVE,
      },
    });
  });

  it('allows waitlist-approved users', async () => {
    prismaMock.userPlan.findUnique.mockResolvedValue(null);
    accessMock.isWaitlistApproved.mockResolvedValue(true);

    const { ensureUserPlan } = await loadUserPlan();
    await ensureUserPlan('user-approved', 'approved@example.com');

    expect(prismaMock.userPlan.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-approved',
        plan: Plan.FREE,
        accessStatus: AccessStatus.ACTIVE,
      },
    });
  });

  it('activates user when under max active users', async () => {
    prismaMock.userPlan.findUnique.mockResolvedValue({
      userId: 'user-4',
      accessStatus: AccessStatus.WAITLISTED,
    });
    accessMock.getMaxActiveUsers.mockResolvedValue(5);
    accessMock.getAdminEmails.mockReturnValue([]);
    prismaMock.userPlan.count.mockResolvedValue(2);

    const { ensureUserPlan } = await loadUserPlan();
    await ensureUserPlan('user-4', 'user@example.com');

    expect(prismaMock.userPlan.update).toHaveBeenCalledWith({
      where: { userId: 'user-4' },
      data: { accessStatus: AccessStatus.ACTIVE },
    });
  });

  it('keeps active users active without recount', async () => {
    prismaMock.userPlan.findUnique.mockResolvedValue({
      userId: 'user-6',
      accessStatus: AccessStatus.ACTIVE,
    });
    accessMock.getMaxActiveUsers.mockResolvedValue(1);

    const { ensureUserPlan } = await loadUserPlan();
    const result = await ensureUserPlan('user-6', 'user@example.com');

    expect(result.accessStatus).toBe(AccessStatus.ACTIVE);
    expect(prismaMock.userPlan.count).not.toHaveBeenCalled();
  });

  it('activates when max active users is unlimited', async () => {
    prismaMock.userPlan.findUnique.mockResolvedValue({
      userId: 'user-7',
      accessStatus: AccessStatus.WAITLISTED,
    });
    accessMock.getMaxActiveUsers.mockResolvedValue(Number.POSITIVE_INFINITY);

    const { ensureUserPlan } = await loadUserPlan();
    await ensureUserPlan('user-7', 'user@example.com');

    expect(prismaMock.userPlan.update).toHaveBeenCalledWith({
      where: { userId: 'user-7' },
      data: { accessStatus: AccessStatus.ACTIVE },
    });
  });

  it('returns the stored user plan', async () => {
    const record = { userId: 'user-8', accessStatus: AccessStatus.ACTIVE };
    prismaMock.userPlan.findUnique.mockResolvedValue(record);

    const { getUserPlan } = await loadUserPlan();
    const result = await getUserPlan('user-8');

    expect(result).toEqual(record);
  });
});
