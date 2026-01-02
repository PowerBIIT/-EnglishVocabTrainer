import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { SubscriptionStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/middleware/adminAuth';

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

const escapeCSV = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Prevent CSV injection: neutralize formula-triggering characters
  // by prefixing with a single quote (which Excel treats as text indicator)
  const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaChars.some((char) => str.startsWith(char))) {
    str = `'${str}`;
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDate = (date: Date | string | null): string => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get('status');

  const where: Prisma.SubscriptionWhereInput = {};
  if (statusParam && isSubscriptionStatus(statusParam)) {
    where.status = statusParam;
  }

  const subscriptions = await prisma.subscription.findMany({
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
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID',
    'User Email',
    'User Name',
    'Plan',
    'Access Status',
    'Subscription Status',
    'Stripe Subscription ID',
    'Stripe Customer ID',
    'Current Period Start',
    'Current Period End',
    'Trial Start',
    'Trial End',
    'Cancel At Period End',
    'Created At',
    'Updated At',
  ];

  const rows = subscriptions.map((sub) => [
    escapeCSV(sub.id),
    escapeCSV(sub.user.email),
    escapeCSV(sub.user.name),
    escapeCSV(sub.user.plan?.plan ?? 'FREE'),
    escapeCSV(sub.user.plan?.accessStatus ?? 'ACTIVE'),
    escapeCSV(sub.status),
    escapeCSV(sub.stripeSubscriptionId),
    escapeCSV(sub.stripeCustomerId),
    formatDate(sub.currentPeriodStart),
    formatDate(sub.currentPeriodEnd),
    formatDate(sub.trialStart),
    formatDate(sub.trialEnd),
    sub.cancelAtPeriodEnd ? 'Yes' : 'No',
    formatDate(sub.createdAt),
    formatDate(sub.updatedAt),
  ]);

  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `subscriptions-${timestamp}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
