import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { requireAdmin } from '@/middleware/adminAuth';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get all subscriptions with Stripe IDs
    const subscriptions = await prisma.subscription.findMany({
      where: {
        stripeSubscriptionId: { not: null },
      },
      select: {
        id: true,
        stripeSubscriptionId: true,
        status: true,
        trialEnd: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Count by status
    const activeCount = subscriptions.filter(
      (s) => s.status === 'ACTIVE'
    ).length;
    const trialingCount = subscriptions.filter(
      (s) => s.status === 'TRIALING'
    ).length;
    const pastDueCount = subscriptions.filter(
      (s) => s.status === 'PAST_DUE'
    ).length;
    const canceledCount = subscriptions.filter(
      (s) => s.status === 'CANCELED'
    ).length;

    // Calculate MRR from Stripe
    // MRR includes ACTIVE and PAST_DUE subscriptions (not TRIALING per Stripe docs)
    let mrr = 0;
    const mrrSubscriptions = subscriptions.filter(
      (s) => s.status === 'ACTIVE' || s.status === 'PAST_DUE'
    );

    for (const sub of mrrSubscriptions) {
      if (sub.stripeSubscriptionId) {
        try {
          const stripeSub = await getStripe().subscriptions.retrieve(
            sub.stripeSubscriptionId
          );
          const item = stripeSub.items.data[0];
          if (item?.price?.unit_amount) {
            const interval = item.price.recurring?.interval;
            // Normalize to monthly amount
            if (interval === 'year') {
              mrr += Math.round(item.price.unit_amount / 12);
            } else if (interval === 'month') {
              mrr += item.price.unit_amount;
            } else if (interval === 'week') {
              mrr += Math.round((item.price.unit_amount * 52) / 12);
            } else if (interval === 'day') {
              mrr += Math.round(item.price.unit_amount * 30);
            }
          }
        } catch (e) {
          console.error('Failed to fetch Stripe subscription:', e);
        }
      }
    }

    // Trial conversion rate
    // Subscriptions that had trial and are now ACTIVE / all that had trial
    const subsWithTrial = subscriptions.filter((s) => s.trialEnd !== null);
    const convertedFromTrial = subsWithTrial.filter(
      (s) => s.status === 'ACTIVE'
    );
    const trialConversionRate =
      subsWithTrial.length > 0
        ? Math.round((convertedFromTrial.length / subsWithTrial.length) * 100)
        : 0;

    // Churn rate: canceled in current month / (active at start + new this month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const canceledThisMonth = subscriptions.filter(
      (s) => s.status === 'CANCELED' && new Date(s.updatedAt) >= startOfMonth
    ).length;

    const totalActiveStart = activeCount + trialingCount + canceledThisMonth;
    const churnRate =
      totalActiveStart > 0
        ? Math.round((canceledThisMonth / totalActiveStart) * 100)
        : 0;

    // Revenue by period (last 6 months) - based on subscription changes
    const revenueByPeriod: Array<{
      period: string;
      newSubscribers: number;
      canceledSubscribers: number;
      activeAtEnd: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const periodEnd = new Date(
        periodStart.getFullYear(),
        periodStart.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

      const newInPeriod = subscriptions.filter((s) => {
        const created = new Date(s.createdAt);
        return created >= periodStart && created <= periodEnd;
      }).length;

      const canceledInPeriod = subscriptions.filter((s) => {
        const updated = new Date(s.updatedAt);
        return (
          s.status === 'CANCELED' &&
          updated >= periodStart &&
          updated <= periodEnd
        );
      }).length;

      // Count active subscriptions at end of period
      const activeAtEnd = subscriptions.filter((s) => {
        const created = new Date(s.createdAt);
        const updated = new Date(s.updatedAt);
        // Was created before or during period
        const existedInPeriod = created <= periodEnd;
        // Was not canceled before end of period (or is still active)
        const wasActiveAtEnd =
          s.status !== 'CANCELED' || updated > periodEnd;
        return existedInPeriod && wasActiveAtEnd;
      }).length;

      revenueByPeriod.push({
        period,
        newSubscribers: newInPeriod,
        canceledSubscribers: canceledInPeriod,
        activeAtEnd,
      });
    }

    return NextResponse.json({
      mrr,
      arr: mrr * 12,
      activeSubscribers: activeCount,
      trialSubscribers: trialingCount,
      pastDueSubscribers: pastDueCount,
      canceledSubscribers: canceledCount,
      trialConversionRate,
      churnRate,
      revenueByPeriod,
    });
  } catch (error) {
    console.error('Failed to calculate revenue stats:', error);
    return NextResponse.json(
      { error: 'Failed to calculate revenue statistics' },
      { status: 500 }
    );
  }
}
