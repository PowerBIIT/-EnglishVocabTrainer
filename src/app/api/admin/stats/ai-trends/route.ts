import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';
import type { AiTrendsResponse, AiTrendPoint, AiAnalyticsPeriod } from '@/types/aiAnalytics';

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

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
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

  // Get daily stats from AiGlobalDailyStats
  const dailyStats = await prisma.aiGlobalDailyStats.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  // Aggregate by date
  const dateMap = new Map<string, AiTrendPoint>();

  for (const stat of dailyStats) {
    const dateStr = formatDate(stat.date);
    const existing = dateMap.get(dateStr);

    if (existing) {
      existing.requests += stat.requestCount;
      existing.inputTokens += stat.inputTokens;
      existing.outputTokens += stat.outputTokens;
      existing.totalTokens += stat.inputTokens + stat.outputTokens;
      existing.cost += stat.totalCost;
      existing.uniqueUsers += stat.uniqueUsers;
    } else {
      dateMap.set(dateStr, {
        date: dateStr,
        requests: stat.requestCount,
        inputTokens: stat.inputTokens,
        outputTokens: stat.outputTokens,
        totalTokens: stat.inputTokens + stat.outputTokens,
        cost: stat.totalCost,
        uniqueUsers: stat.uniqueUsers,
      });
    }
  }

  // Fill in missing dates with zeros
  const days = PERIOD_DAYS[period];
  const daily: AiTrendPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - i);
    const dateStr = formatDate(date);

    const point = dateMap.get(dateStr) || {
      date: dateStr,
      requests: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: 0,
      uniqueUsers: 0,
    };

    daily.push(point);
  }

  // Calculate totals
  const totals = daily.reduce(
    (acc, point) => ({
      requests: acc.requests + point.requests,
      inputTokens: acc.inputTokens + point.inputTokens,
      outputTokens: acc.outputTokens + point.outputTokens,
      totalTokens: acc.totalTokens + point.totalTokens,
      cost: acc.cost + point.cost,
      uniqueUsers: acc.uniqueUsers + point.uniqueUsers,
    }),
    { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0, uniqueUsers: 0 }
  );

  const response: AiTrendsResponse = {
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    daily,
    totals,
  };

  return NextResponse.json(response);
}
