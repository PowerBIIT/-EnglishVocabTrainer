import { NextResponse } from 'next/server';
import { AccessStatus, Plan, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getCurrentPeriod } from '@/lib/aiUsage';
import { getPlanLimits } from '@/lib/plans';
import { requireAdmin } from '@/middleware/adminAuth';

const AI_FEATURE = 'ai';
const MAX_LIMIT = 100;
const EXPORT_LIMIT = 5000;

type ActiveUserUsageRow = {
  id: string;
  email: string | null;
  name: string | null;
  plan: Plan;
  count: number;
  units: number;
};

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
  const searchPattern = search ? `%${search}%` : null;
  const searchFilter = searchPattern
    ? Prisma.sql`AND (u."email" ILIKE ${searchPattern} OR u."name" ILIKE ${searchPattern})`
    : Prisma.empty;

  const totalRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "UserPlan" up
    JOIN "User" u ON u.id = up."userId"
    WHERE up."accessStatus" = ${AccessStatus.ACTIVE}
    ${searchFilter}
  `;
  const total = Number(totalRows[0]?.count ?? 0);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = exportMode ? 0 : Math.min(page, totalPages - 1);
  const offset = exportMode ? 0 : safePage * limit;
  const limitClause = exportMode
    ? Prisma.sql`LIMIT ${limit}`
    : Prisma.sql`LIMIT ${limit} OFFSET ${offset}`;

  const rows = await prisma.$queryRaw<ActiveUserUsageRow[]>`
    SELECT
      up."userId" AS id,
      u."email" AS email,
      u."name" AS name,
      up."plan" AS plan,
      COALESCE(uc."count", 0)::int AS count,
      COALESCE(uc."units", 0)::int AS units
    FROM "UserPlan" up
    JOIN "User" u ON u.id = up."userId"
    LEFT JOIN "UsageCounter" uc
      ON uc."userId" = up."userId"
      AND uc."period" = ${period}
      AND uc."feature" = ${AI_FEATURE}
    WHERE up."accessStatus" = ${AccessStatus.ACTIVE}
    ${searchFilter}
    ORDER BY
      COALESCE(uc."units", 0) DESC,
      COALESCE(uc."count", 0) DESC,
      u."email" ASC NULLS LAST,
      u."name" ASC NULLS LAST
    ${limitClause}
  `;

  const [freeLimits, proLimits] = await Promise.all([
    getPlanLimits(Plan.FREE),
    getPlanLimits(Plan.PRO),
  ]);
  const planLimitsByPlan = {
    [Plan.FREE]: freeLimits,
    [Plan.PRO]: proLimits,
  };

  const items = rows.map((row) => {
    const limits = planLimitsByPlan[row.plan];
    const remainingCount = Number.isFinite(limits.maxRequests)
      ? Math.max(0, limits.maxRequests - row.count)
      : null;
    const remainingUnits = Number.isFinite(limits.maxUnits)
      ? Math.max(0, limits.maxUnits - row.units)
      : null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      plan: row.plan,
      usage: { count: row.count, units: row.units },
      remaining: { count: remainingCount, units: remainingUnits },
    };
  });

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
    const rowsCsv = items.map((item) =>
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
    items,
  });
}
