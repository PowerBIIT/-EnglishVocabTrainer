import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';
import type { AiFeaturesResponse, AiFeatureBreakdown, AiAnalyticsPeriod } from '@/types/aiAnalytics';

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

  // Get feature breakdown
  const featureStats = await prisma.aiRequestLog.groupBy({
    by: ['feature'],
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
    orderBy: { _sum: { totalCost: 'desc' } },
  });

  // Get success/error counts per feature
  const successCounts = await prisma.aiRequestLog.groupBy({
    by: ['feature'],
    where: { createdAt: { gte: start, lte: end }, success: true },
    _count: { _all: true },
  });
  const successMap = new Map(successCounts.map((s) => [s.feature, s._count._all]));

  const errorCounts = await prisma.aiRequestLog.groupBy({
    by: ['feature'],
    where: { createdAt: { gte: start, lte: end }, success: false },
    _count: { _all: true },
  });
  const errorMap = new Map(errorCounts.map((e) => [e.feature, e._count._all]));

  // Get language pair breakdown per feature
  const languagePairStats = await prisma.aiRequestLog.groupBy({
    by: ['feature', 'languagePair'],
    where: {
      createdAt: { gte: start, lte: end },
      languagePair: { not: null },
    },
    _count: { _all: true },
    _sum: { totalTokens: true },
  });

  const languagePairMap = new Map<string, Array<{ pair: string; requests: number; tokens: number }>>();
  for (const stat of languagePairStats) {
    const feature = stat.feature;
    const pair = stat.languagePair ?? 'unknown';
    const existing = languagePairMap.get(feature) || [];
    existing.push({
      pair,
      requests: stat._count._all,
      tokens: stat._sum.totalTokens ?? 0,
    });
    languagePairMap.set(feature, existing);
  }

  // Build feature breakdown
  const features: AiFeatureBreakdown[] = featureStats.map((stat) => {
    const successCount = successMap.get(stat.feature) ?? 0;
    const errorCount = errorMap.get(stat.feature) ?? 0;
    const totalCount = stat._count._all;
    const languagePairs = languagePairMap.get(stat.feature) || [];

    // Sort language pairs by requests descending
    languagePairs.sort((a, b) => b.requests - a.requests);

    return {
      feature: stat.feature,
      requests: totalCount,
      successCount,
      errorCount,
      inputTokens: stat._sum.inputTokens ?? 0,
      outputTokens: stat._sum.outputTokens ?? 0,
      totalTokens: stat._sum.totalTokens ?? 0,
      cost: stat._sum.totalCost ?? 0,
      avgDurationMs: Math.round(stat._avg.durationMs ?? 0),
      errorRate: totalCount > 0 ? (errorCount / totalCount) * 100 : 0,
      languagePairs,
    };
  });

  const response: AiFeaturesResponse = {
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    features,
  };

  return NextResponse.json(response);
}
