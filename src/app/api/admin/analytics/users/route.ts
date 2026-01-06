import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { parseAnalyticsRange } from '@/lib/analyticsRange';
import { requireAdmin } from '@/middleware/adminAuth';
import type { AdminAnalyticsUsersResponse } from '@/types/adminAnalytics';

const MAX_LIMIT = 100;

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeSearch = (value: string | null) => value?.trim() ?? '';

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const range = parseAnalyticsRange(searchParams);

  const page = Math.max(0, Math.floor(parseNumber(searchParams.get('page'), 0)));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(parseNumber(searchParams.get('limit'), 20))));
  const search = sanitizeSearch(searchParams.get('search'));

  const eventWhere: Prisma.AnalyticsEventWhereInput = {
    createdAt: { gte: range.start, lte: range.end },
  };

  if (search) {
    eventWhere.user = {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const uniqueUsers = await prisma.analyticsEvent.findMany({
    where: eventWhere,
    distinct: ['userId'],
    select: { userId: true },
  });
  const total = uniqueUsers.length;

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages - 1);

  const userGroups = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: eventWhere,
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: { _count: { id: 'desc' } },
    skip: safePage * limit,
    take: limit,
  });

  const userIds = userGroups.map((row) => row.userId);

  const [users, aiUsage] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.aiRequestLog.groupBy({
          by: ['userId'],
          where: {
            userId: { in: userIds },
            createdAt: { gte: range.start, lte: range.end },
          },
          _count: { _all: true },
          _sum: { totalTokens: true, totalCost: true },
        })
      : Promise.resolve([]),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const aiMap = new Map(aiUsage.map((row) => [row.userId, row]));

  const items = userGroups.map((row) => {
    const user = userMap.get(row.userId);
    const ai = aiMap.get(row.userId);
    return {
      id: row.userId,
      email: user?.email ?? null,
      name: user?.name ?? null,
      events: row._count?._all ?? 0,
      lastEventAt: row._max?.createdAt ? row._max.createdAt.toISOString() : null,
      aiRequests: ai?._count?._all ?? 0,
      aiTokens: ai?._sum.totalTokens ?? 0,
      aiCost: ai?._sum.totalCost ?? 0,
    };
  });

  const response: AdminAnalyticsUsersResponse = {
    period: {
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      days: range.days,
    },
    page: safePage,
    limit,
    total,
    items,
  };

  return NextResponse.json(response);
}
