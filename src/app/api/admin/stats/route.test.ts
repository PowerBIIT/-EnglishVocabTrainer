import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const mockRequireAdmin = vi.fn();

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  userPlan: {
    count: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  globalUsage: {
    findUnique: vi.fn(),
  },
  usageCounter: {
    findMany: vi.fn(),
  },
  aiRequestLog: {
    aggregate: vi.fn(),
  },
}));

const mockGetGlobalLimits = vi.fn();
const mockGetPlanLimits = vi.fn();
const mockGetAppConfigNumber = vi.fn();

vi.mock('@/middleware/adminAuth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/plans', () => ({
  getGlobalLimits: () => mockGetGlobalLimits(),
  getPlanLimits: () => mockGetPlanLimits(),
}));

vi.mock('@/lib/config', () => ({
  getAppConfigNumber: () => mockGetAppConfigNumber(),
}));

const loadModule = async () => {
  vi.resetModules();
  return import('./route');
};

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockGetGlobalLimits.mockReset();
    mockGetPlanLimits.mockReset();
    mockGetAppConfigNumber.mockReset();
    prismaMock.$transaction.mockReset();
    prismaMock.userPlan.count.mockReset();
    prismaMock.userPlan.groupBy.mockReset();
    prismaMock.userPlan.findMany.mockReset();
    prismaMock.globalUsage.findUnique.mockReset();
    prismaMock.usageCounter.findMany.mockReset();
    prismaMock.aiRequestLog.aggregate.mockReset();

    mockGetAppConfigNumber.mockResolvedValue(0);

    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2024, 5, 15, 12, 0, 0)));

    prismaMock.$transaction.mockImplementation(async (args) => Promise.all(args));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { GET } = await loadModule();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns actual costs and projection for the current month', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });

    prismaMock.userPlan.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    prismaMock.userPlan.groupBy.mockResolvedValue([]);
    prismaMock.userPlan.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        plan: 'FREE',
        user: { email: 'user@example.com', name: 'Ada' },
      },
    ]);
    prismaMock.globalUsage.findUnique.mockResolvedValue({
      count: 10,
      units: 1000,
    });
    prismaMock.usageCounter.findMany
      .mockResolvedValueOnce([
        {
          userId: 'user-1',
          count: 3,
          units: 300,
          user: { email: 'user@example.com', plan: { plan: 'FREE' } },
        },
      ])
      .mockResolvedValueOnce([
        {
          count: 5,
          units: 500,
          user: { email: 'top@example.com' },
        },
      ]);
    prismaMock.aiRequestLog.aggregate.mockResolvedValue({
      _sum: { totalCost: 45 },
    });

    mockGetGlobalLimits.mockResolvedValue({ maxRequests: 100, maxUnits: 10000 });
    mockGetPlanLimits
      .mockResolvedValueOnce({ maxRequests: 10, maxUnits: 1000 })
      .mockResolvedValueOnce({ maxRequests: 100, maxUnits: 10000 });

    const { GET } = await loadModule();
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.costs.actualMonthToDate).toBe(45);
    expect(data.costs.projectedEndOfMonth).toBe(90);
    expect(data.aiUsage.activeUsers.items[0]).toMatchObject({
      email: 'user@example.com',
      name: 'Ada',
      plan: 'FREE',
      usage: { count: 3, units: 300 },
      remaining: { count: 7, units: 700 },
    });
  });
});
