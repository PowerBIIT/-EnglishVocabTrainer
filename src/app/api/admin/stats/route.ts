import { NextResponse } from 'next/server';
import { AccessStatus, Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getAiCostTotals } from '@/lib/aiCost';
import { buildAiCostLimitStatus, AI_COST_HARD_LIMIT_KEY } from '@/lib/aiCostLimit';
import { getCurrentPeriod } from '@/lib/aiUsage';
import { getGlobalLimits, getPlanLimits } from '@/lib/plans';
import { getAppConfigNumber } from '@/lib/config';
import { requireAdmin } from '@/middleware/adminAuth';

const AI_FEATURE = 'ai';
const ACTIVE_USERS_LIMIT = 50;

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const period = getCurrentPeriod();
  const now = new Date();

  const [
    activeCount,
    waitlistedCount,
    suspendedCount,
    planBreakdown,
    globalUsage,
    usageByUser,
    topUsers,
    activeUsers,
  ] = await prisma.$transaction([
    prisma.userPlan.count({ where: { accessStatus: AccessStatus.ACTIVE } }),
    prisma.userPlan.count({ where: { accessStatus: AccessStatus.WAITLISTED } }),
    prisma.userPlan.count({ where: { accessStatus: AccessStatus.SUSPENDED } }),
    prisma.userPlan.groupBy({
      by: ['plan', 'accessStatus'],
      _count: { _all: true },
      orderBy: [{ plan: 'asc' }, { accessStatus: 'asc' }],
    }),
    prisma.globalUsage.findUnique({
      where: {
        period_feature: {
          period,
          feature: AI_FEATURE,
        },
      },
    }),
    prisma.usageCounter.findMany({
      where: { period, feature: AI_FEATURE },
      include: {
        user: {
          select: {
            email: true,
            plan: { select: { plan: true } },
          },
        },
      },
    }),
    prisma.usageCounter.findMany({
      where: { period, feature: AI_FEATURE },
      orderBy: { units: 'desc' },
      take: 10,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
    prisma.userPlan.findMany({
      where: { accessStatus: AccessStatus.ACTIVE },
      select: {
        userId: true,
        plan: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const [aiCostTotals, rawCostLimit, globalLimits, freeLimits, proLimits] =
    await Promise.all([
      getAiCostTotals(now),
      getAppConfigNumber(AI_COST_HARD_LIMIT_KEY, 0),
      getGlobalLimits(),
      getPlanLimits(Plan.FREE),
      getPlanLimits(Plan.PRO),
    ]);

  const planLimitsByPlan = {
    [Plan.FREE]: freeLimits,
    [Plan.PRO]: proLimits,
  };

  const planTotals = new Map<Plan, { count: number; units: number }>();
  for (const entry of usageByUser) {
    const plan = entry.user?.plan?.plan ?? Plan.FREE;
    const existing = planTotals.get(plan) ?? { count: 0, units: 0 };
    planTotals.set(plan, {
      count: existing.count + entry.count,
      units: existing.units + entry.units,
    });
  }

  const byPlan = [Plan.FREE, Plan.PRO].map((plan) => {
    const totals = planTotals.get(plan) ?? { count: 0, units: 0 };
    const limits = planLimitsByPlan[plan];
    return {
      plan,
      count: totals.count,
      units: totals.units,
      maxRequests: limits.maxRequests,
      maxUnits: limits.maxUnits,
    };
  });

  const usageByUserMap = new Map(
    usageByUser.map((entry) => [entry.userId, { count: entry.count, units: entry.units }])
  );
  const activeUsersUsage = activeUsers.map((entry) => {
    const usage = usageByUserMap.get(entry.userId);
    const usedCount = usage?.count ?? 0;
    const usedUnits = usage?.units ?? 0;
    const limits = planLimitsByPlan[entry.plan];
    const remainingCount = Number.isFinite(limits.maxRequests)
      ? Math.max(0, limits.maxRequests - usedCount)
      : null;
    const remainingUnits = Number.isFinite(limits.maxUnits)
      ? Math.max(0, limits.maxUnits - usedUnits)
      : null;
    return {
      id: entry.userId,
      email: entry.user?.email ?? null,
      name: entry.user?.name ?? null,
      plan: entry.plan,
      usage: { count: usedCount, units: usedUnits },
      remaining: { count: remainingCount, units: remainingUnits },
    };
  });
  activeUsersUsage.sort((a, b) => {
    if (b.usage.units !== a.usage.units) return b.usage.units - a.usage.units;
    if (b.usage.count !== a.usage.count) return b.usage.count - a.usage.count;
    const left = a.email ?? a.name ?? '';
    const right = b.email ?? b.name ?? '';
    return left.localeCompare(right);
  });
  const activeUsersPreview = activeUsersUsage.slice(0, ACTIVE_USERS_LIMIT);

  const totalUnits = globalUsage?.units ?? 0;
  const actualMonthToDate = aiCostTotals.totalCost;
  const projectedEndOfMonth = aiCostTotals.projectedCost;
  const costLimit = buildAiCostLimitStatus(aiCostTotals, rawCostLimit);

  return NextResponse.json({
    meta: { period },
    users: {
      active: activeCount,
      waitlisted: waitlistedCount,
      suspended: suspendedCount,
      planBreakdown: planBreakdown.map((entry) => ({
        plan: entry.plan,
        accessStatus: entry.accessStatus,
        count: (entry._count as { _all?: number } | null)?._all ?? 0,
      })),
    },
    aiUsage: {
      global: {
        count: globalUsage?.count ?? 0,
        units: totalUnits,
        maxRequests: globalLimits.maxRequests,
        maxUnits: globalLimits.maxUnits,
      },
      byPlan,
      topUsers: topUsers.map((entry) => ({
        email: entry.user?.email ?? 'Unknown',
        count: entry.count,
        units: entry.units,
      })),
      activeUsers: {
        total: activeCount,
        limit: ACTIVE_USERS_LIMIT,
        items: activeUsersPreview,
      },
    },
    costs: {
      actualMonthToDate,
      projectedEndOfMonth,
    },
    costLimit,
  });
}
