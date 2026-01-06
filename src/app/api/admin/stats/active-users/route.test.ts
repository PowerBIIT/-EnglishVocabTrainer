import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { Plan } from '@prisma/client';

const mockRequireAdmin = vi.fn();

const prismaMock = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
}));

const mockGetPlanLimits = vi.fn();

vi.mock('@/middleware/adminAuth', () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/plans', () => ({
  getPlanLimits: (plan: Plan) => mockGetPlanLimits(plan),
}));

const loadModule = async () => {
  vi.resetModules();
  return import('./route');
};

describe('GET /api/admin/stats/active-users', () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    prismaMock.$queryRaw.mockReset();
    mockGetPlanLimits.mockReset();
  });

  it('returns 403 when user is not admin', async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { GET } = await loadModule();
    const response = await GET(new Request('http://localhost/api/admin/stats/active-users'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns active user usage with remaining limits', async () => {
    mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } });
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ count: BigInt(1) }])
      .mockResolvedValueOnce([
        {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Ada',
          plan: 'FREE',
          count: 3,
          units: 300,
        },
      ]);
    mockGetPlanLimits
      .mockResolvedValueOnce({ maxRequests: 10, maxUnits: 1000 })
      .mockResolvedValueOnce({ maxRequests: 100, maxUnits: 10000 });

    const { GET } = await loadModule();
    const response = await GET(new Request('http://localhost/api/admin/stats/active-users'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.items[0]).toMatchObject({
      email: 'user@example.com',
      name: 'Ada',
      plan: 'FREE',
      usage: { count: 3, units: 300 },
      remaining: { count: 7, units: 700 },
    });
  });
});
