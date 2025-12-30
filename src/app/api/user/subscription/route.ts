import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserSubscription } from '@/lib/subscription';
import { getPlanLimits } from '@/lib/plans';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [subscription, userPlan, usage] = await Promise.all([
      getUserSubscription(session.user.id),
      prisma.userPlan.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.usageCounter.findFirst({
        where: {
          userId: session.user.id,
          feature: 'ai',
          period: new Date().toISOString().slice(0, 7), // YYYY-MM
        },
      }),
    ]);

    const plan = userPlan?.plan ?? 'FREE';
    const limits = await getPlanLimits(plan);

    // Calculate next reset date (first day of next month)
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return NextResponse.json({
      plan,
      status: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      trialEnd: subscription?.trialEnd ?? null,
      usage: {
        used: usage?.count ?? 0,
        limit: limits.maxRequests,
        resetDate: resetDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription' },
      { status: 500 }
    );
  }
}
