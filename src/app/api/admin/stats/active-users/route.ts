import { NextResponse } from 'next/server';
import { AccessStatus, Plan } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentPeriod } from '@/lib/aiUsage';
import { getPlanLimits } from '@/lib/plans';
import { requireAdmin } from '@/middleware/adminAuth';

const AI_FEATURE = 'ai';
const MAX_LIMIT = 100;
const EXPORT_LIMIT = 5000;

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeSearch = (value: string | null) => value?.trim() ?? '';

const escapeCsv = (value: string | number | null) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
};

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = sanitizeSearch(searchParams.get('search'));
  const exportMode =
    searchParams.get('export') === '1' ||
    searchParams.get('format')?.toLowerCase() === 'csv';

  const page = Math.max(0, Math.floor(parseNumber(searchParams.get('page'), 0)));
  const limitFallback = exportMode ? EXPORT_LIMIT : 20;
  const limitRaw = Math.floor(parseNumber(searchParams.get('limit'), limitFallback));
  const limit = exportMode
    ? Math.min(EXPORT_LIMIT, Math.max(1, limitRaw))
    : Math.min(MAX_LIMIT, Math.max(1, limitRaw));

  const period = getCurrentPeriod();
  const userWhere: Prisma.UserPlanWhereInput = {
    accessStatus: AccessStatus.ACTIVE,
  };
  if (search) {
    userWhere.user = {
      OR: [
        { id: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [total, userPlans] = await prisma.$transaction([
    prisma.userPlan.count({ where: userWhere }),
    prisma.userPlan.findMany({
      where: userWhere,
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

  const userIds = userPlans.map((entry) => entry.userId);
  const usageEntries =
    userIds.length === 0
      ? []
      : await prisma.usageCounter.findMany({
          where: {
            userId: { in: userIds },
            period,
            feature: AI_FEATURE,
          },
          select: {
            userId: true,
            count: true,
            units: true,
          },
        });
  const usageMap = new Map(
    usageEntries.map((entry) => [entry.userId, { count: entry.count, units: entry.units }])
  );

  const [freeLimits, proLimits] = await Promise.all([
    getPlanLimits(Plan.FREE),
    getPlanLimits(Plan.PRO),
  ]);
  const planLimitsByPlan = {
    [Plan.FREE]: freeLimits,
    [Plan.PRO]: proLimits,
  };

  const items = userPlans.map((entry) => {
    const usage = usageMap.get(entry.userId);
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

  items.sort((a, b) => {
    if (b.usage.units !== a.usage.units) return b.usage.units - a.usage.units;
    if (b.usage.count !== a.usage.count) return b.usage.count - a.usage.count;
    const left = a.email ?? a.name ?? '';
    const right = b.email ?? b.name ?? '';
    return left.localeCompare(right);
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = exportMode ? 0 : Math.min(page, totalPages - 1);
  const sliceStart = exportMode ? 0 : safePage * limit;
  const sliceEnd = exportMode ? limit : sliceStart + limit;
  const pageItems = items.slice(sliceStart, sliceEnd);

  if (exportMode) {
    const formatRemaining = (value: number | null) =>
      value === null ? 'unlimited' : value;
    const header = [
      'Email',
      'Name',
      'Plan',
      'RequestsUsed',
      'RequestsRemaining',
      'TokensUsed',
      'TokensRemaining',
    ];
    const rowsCsv = pageItems.map((item) =>
      [
        escapeCsv(item.email),
        escapeCsv(item.name),
        escapeCsv(item.plan),
        escapeCsv(item.usage.count),
        escapeCsv(formatRemaining(item.remaining.count)),
        escapeCsv(item.usage.units),
        escapeCsv(formatRemaining(item.remaining.units)),
      ].join(',')
    );
    const csv = [header.join(','), ...rowsCsv].join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="active-users-usage-${period}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json({
    period,
    total,
    page: safePage,
    limit,
    items: pageItems,
  });
}
