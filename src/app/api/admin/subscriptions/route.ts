import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeSearch = (value: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, 100);
};

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'UNPAID',
  'PAUSED',
];

const isSubscriptionStatus = (value: string): value is SubscriptionStatus =>
  SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus);

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');
  const searchQuery = sanitizeSearch(searchParams.get('search'));
  const page = Math.max(0, Math.floor(parseNumber(searchParams.get('page'), 0)));
  const limitRaw = Math.floor(parseNumber(searchParams.get('limit'), 20));
  const limit = Math.min(100, Math.max(1, limitRaw));

  const where: Prisma.SubscriptionWhereInput = {};
  if (statusParam && isSubscriptionStatus(statusParam)) {
    where.status = statusParam;
  }
  if (searchQuery) {
    where.user = {
      OR: [
        { email: { contains: searchQuery, mode: 'insensitive' } },
        { name: { contains: searchQuery, mode: 'insensitive' } },
      ],
    };
  }

  const [total, subscriptions] = await prisma.$transaction([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            name: true,
            createdAt: true,
            plan: {
              select: {
                plan: true,
                accessStatus: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: page * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ subscriptions, total, page, limit });
}
