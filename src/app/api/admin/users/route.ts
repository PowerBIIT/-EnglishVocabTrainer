import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { AccessStatus, Plan } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isPlan = (value: string): value is Plan => value === 'FREE' || value === 'PRO';
const isAccessStatus = (value: string): value is AccessStatus =>
  value === 'ACTIVE' || value === 'WAITLISTED' || value === 'SUSPENDED';

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const planParam = searchParams.get('plan');
  const searchParam = searchParams.get('search')?.trim();
  const page = Math.max(0, Math.floor(parseNumber(searchParams.get('page'), 0)));
  const limitRaw = Math.floor(parseNumber(searchParams.get('limit'), 20));
  const limit = Math.min(100, Math.max(1, limitRaw));

  const where: Prisma.UserWhereInput = {};
  if (statusParam || planParam) {
    const planFilter: Prisma.UserPlanWhereInput = {};
    if (statusParam && isAccessStatus(statusParam)) {
      planFilter.accessStatus = statusParam;
    }
    if (planParam && isPlan(planParam)) {
      planFilter.plan = planParam;
    }
    if (Object.keys(planFilter).length > 0) {
      where.plan = planFilter;
    }
  }
  if (searchParam) {
    where.OR = [
      { id: { contains: searchParam, mode: 'insensitive' } },
      { email: { contains: searchParam, mode: 'insensitive' } },
      { name: { contains: searchParam, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ users, total, page, limit });
}
