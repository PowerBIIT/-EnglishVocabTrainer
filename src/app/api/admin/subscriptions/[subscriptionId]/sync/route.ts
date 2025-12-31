import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncSubscriptionStatus } from '@/lib/subscription';
import { requireAdmin } from '@/middleware/adminAuth';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { subscriptionId } = await params;

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: 'Subscription not found' },
      { status: 404 }
    );
  }

  if (!subscription.stripeSubscriptionId) {
    return NextResponse.json(
      { error: 'No Stripe subscription ID linked' },
      { status: 400 }
    );
  }

  try {
    await syncSubscriptionStatus(subscription.stripeSubscriptionId);

    const updated = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            plan: { select: { plan: true, accessStatus: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, subscription: updated });
  } catch (error) {
    console.error('Stripe sync failed:', error);
    return NextResponse.json(
      { error: 'Failed to sync with Stripe' },
      { status: 500 }
    );
  }
}
