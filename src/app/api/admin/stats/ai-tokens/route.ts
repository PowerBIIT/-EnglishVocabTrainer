import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';
import type { AiTokenStatsResponse, AiAnalyticsPeriod } from '@/types/aiAnalytics';

const PERIOD_DAYS: Record<AiAnalyticsPeriod, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function getPeriodRange(period: AiAnalyticsPeriod): { start: Date; end: Date } {
  const days = PERIOD_DAYS[period] || 7;
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get('period') as AiAnalyticsPeriod | null;
  const period: AiAnalyticsPeriod = periodParam && PERIOD_DAYS[periodParam] ? periodParam : '7d';
  const { start, end } = getPeriodRange(period);

  // Aggregate totals
  const totalsResult = await prisma.aiRequestLog.aggregate({
    where: { createdAt: { gte: start, lte: end } },
    _count: { _all: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      totalCost: true,
      durationMs: true,
    },
    _avg: { durationMs: true },
  });

  const successCount = await prisma.aiRequestLog.count({
    where: { createdAt: { gte: start, lte: end }, success: true },
  });

  const totalRequests = totalsResult._count._all;
  const successRate = totalRequests > 0 ? (successCount / totalRequests) * 100 : 100;

  // Group by model
  const byModelRaw = await prisma.aiRequestLog.groupBy({
    by: ['model'],
    where: { createdAt: { gte: start, lte: end } },
    _count: { _all: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      totalCost: true,
    },
    orderBy: { _sum: { totalCost: 'desc' } },
  });

  const byModel = byModelRaw.map((row) => ({
    model: row.model,
    requests: row._count._all,
    inputTokens: row._sum.inputTokens ?? 0,
    outputTokens: row._sum.outputTokens ?? 0,
    totalTokens: row._sum.totalTokens ?? 0,
    cost: row._sum.totalCost ?? 0,
  }));

  // Group by feature
  const byFeatureRaw = await prisma.aiRequestLog.groupBy({
    by: ['feature'],
    where: { createdAt: { gte: start, lte: end } },
    _count: { _all: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      totalCost: true,
    },
    orderBy: { _sum: { totalCost: 'desc' } },
  });

  const featureErrors = await prisma.aiRequestLog.groupBy({
    by: ['feature'],
    where: { createdAt: { gte: start, lte: end }, success: false },
    _count: { _all: true },
  });

  const errorMap = new Map(featureErrors.map((e) => [e.feature, e._count._all]));

  const byFeature = byFeatureRaw.map((row) => {
    const errorCount = errorMap.get(row.feature) ?? 0;
    const totalCount = row._count._all;
    return {
      feature: row.feature,
      requests: totalCount,
      inputTokens: row._sum.inputTokens ?? 0,
      outputTokens: row._sum.outputTokens ?? 0,
      totalTokens: row._sum.totalTokens ?? 0,
      cost: row._sum.totalCost ?? 0,
      errorRate: totalCount > 0 ? (errorCount / totalCount) * 100 : 0,
    };
  });

  // Top users by cost
  const topUsersRaw = await prisma.aiRequestLog.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: start, lte: end } },
    _count: { _all: true },
    _sum: {
      totalTokens: true,
      totalCost: true,
    },
    orderBy: { _sum: { totalCost: 'desc' } },
    take: 10,
  });

  const userIds = topUsersRaw.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true },
  });
  const userEmailMap = new Map(users.map((u) => [u.id, u.email]));

  const topUsers = topUsersRaw.map((row) => ({
    userId: row.userId,
    email: userEmailMap.get(row.userId) ?? null,
    requests: row._count._all,
    totalTokens: row._sum.totalTokens ?? 0,
    cost: row._sum.totalCost ?? 0,
  }));

  const response: AiTokenStatsResponse = {
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    totals: {
      requests: totalRequests,
      inputTokens: totalsResult._sum.inputTokens ?? 0,
      outputTokens: totalsResult._sum.outputTokens ?? 0,
      totalTokens: totalsResult._sum.totalTokens ?? 0,
      actualCost: totalsResult._sum.totalCost ?? 0,
      successRate,
      avgDurationMs: Math.round(totalsResult._avg.durationMs ?? 0),
    },
    byModel,
    byFeature,
    topUsers,
  };

  return NextResponse.json(response);
}
