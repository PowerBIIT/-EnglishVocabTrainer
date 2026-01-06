import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseAnalyticsRange } from '@/lib/analyticsRange';
import { requireAdmin } from '@/middleware/adminAuth';
import type { AdminAnalyticsOverviewResponse } from '@/types/adminAnalytics';

const VOCAB_INTAKE_EVENTS = [
  'vocab_parse_text',
  'vocab_extract_image',
  'vocab_extract_file',
  'vocab_generate_words',
];

const formatDateKey = (date: Date) => date.toISOString().slice(0, 10);

const buildDateSeries = (start: Date, end: Date) => {
  const series: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime()) {
    series.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
};

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseAnalyticsRange(searchParams);
  const eventWhere = {
    createdAt: {
      gte: range.start,
      lte: range.end,
    },
  };

  const [
    totalEvents,
    uniqueUsersRaw,
    eventsByNameRaw,
    eventsByFeatureRaw,
    eventsBySourceRaw,
    pageViewsRaw,
    vocabSourcesRaw,
    vocabAddedCount,
    vocabGeneratedCount,
    dailyEventsRaw,
    aiTotals,
    aiByFeatureRaw,
    aiByModelRaw,
    aiDailyRaw,
    recentEventsRaw,
  ] = await Promise.all([
    prisma.analyticsEvent.count({ where: eventWhere }),
    prisma.analyticsEvent.findMany({
      where: eventWhere,
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      where: eventWhere,
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 12,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['feature'],
      where: { ...eventWhere, feature: { not: '' } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 12,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['source'],
      where: { ...eventWhere, source: { not: '' } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 12,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['feature'],
      where: { ...eventWhere, eventName: 'page_view', feature: { not: '' } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['source'],
      where: { ...eventWhere, eventName: { in: VOCAB_INTAKE_EVENTS }, source: { not: '' } },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.analyticsEvent.count({
      where: { ...eventWhere, eventName: 'vocab_words_added' },
    }),
    prisma.analyticsEvent.count({
      where: { ...eventWhere, eventName: 'vocab_generate_words' },
    }),
    prisma.analyticsDailyStat.findMany({
      where: { date: { gte: range.startDate, lte: range.endDate } },
      select: { date: true, count: true },
    }),
    prisma.aiRequestLog.aggregate({
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { _all: true },
      _sum: { totalTokens: true, totalCost: true },
    }),
    prisma.aiRequestLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { _all: true },
      _sum: { totalTokens: true, totalCost: true },
      orderBy: { _sum: { totalCost: 'desc' } },
      take: 10,
    }),
    prisma.aiRequestLog.groupBy({
      by: ['model'],
      where: { createdAt: { gte: range.start, lte: range.end } },
      _count: { _all: true },
      _sum: { totalTokens: true, totalCost: true },
      orderBy: { _sum: { totalCost: 'desc' } },
      take: 10,
    }),
    prisma.aiGlobalDailyStats.findMany({
      where: { date: { gte: range.startDate, lte: range.endDate } },
      select: { date: true, requestCount: true, inputTokens: true, outputTokens: true },
    }),
    prisma.analyticsEvent.findMany({
      where: eventWhere,
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        userId: true,
        eventName: true,
        feature: true,
        source: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
  ] as const);

  const dailyEventsMap = new Map<string, number>();
  for (const row of dailyEventsRaw) {
    const key = formatDateKey(row.date);
    dailyEventsMap.set(key, (dailyEventsMap.get(key) ?? 0) + row.count);
  }

  const aiDailyMap = new Map<string, { requests: number; tokens: number }>();
  for (const row of aiDailyRaw) {
    const key = formatDateKey(row.date);
    const current = aiDailyMap.get(key) ?? { requests: 0, tokens: 0 };
    current.requests += row.requestCount;
    current.tokens += row.inputTokens + row.outputTokens;
    aiDailyMap.set(key, current);
  }

  const daily = buildDateSeries(range.startDate, range.endDate).map((date) => ({
    date,
    events: dailyEventsMap.get(date) ?? 0,
    aiRequests: aiDailyMap.get(date)?.requests ?? 0,
    aiTokens: aiDailyMap.get(date)?.tokens ?? 0,
  }));

  const response: AdminAnalyticsOverviewResponse = {
    period: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      days: range.days,
    },
    totals: {
      events: totalEvents,
      uniqueUsers: uniqueUsersRaw.length,
      aiRequests: aiTotals._count._all,
      aiTokens: aiTotals._sum.totalTokens ?? 0,
      aiCost: aiTotals._sum.totalCost ?? 0,
    },
    events: {
      byName: eventsByNameRaw.map((row) => ({
        eventName: row.eventName,
        count: row._count._all,
      })),
      byFeature: eventsByFeatureRaw.map((row) => ({
        feature: row.feature,
        count: row._count._all,
      })),
      bySource: eventsBySourceRaw.map((row) => ({
        source: row.source,
        count: row._count._all,
      })),
      pageViews: pageViewsRaw.map((row) => ({
        feature: row.feature,
        count: row._count._all,
      })),
    },
    vocabulary: {
      intakeSources: vocabSourcesRaw.map((row) => ({
        source: row.source,
        count: row._count._all,
      })),
      wordsAdded: vocabAddedCount,
      generated: vocabGeneratedCount,
    },
    aiUsage: {
      byFeature: aiByFeatureRaw.map((row) => ({
        feature: row.feature,
        requests: row._count._all,
        tokens: row._sum.totalTokens ?? 0,
        cost: row._sum.totalCost ?? 0,
      })),
      byModel: aiByModelRaw.map((row) => ({
        model: row.model,
        requests: row._count._all,
        tokens: row._sum.totalTokens ?? 0,
        cost: row._sum.totalCost ?? 0,
      })),
    },
    activity: { daily },
    recentEvents: recentEventsRaw.map((row) => ({
      id: row.id,
      userId: row.userId,
      email: row.user.email,
      name: row.user.name,
      eventName: row.eventName,
      feature: row.feature,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(response);
}
