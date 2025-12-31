import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { syncSubscriptionStatus } from '@/lib/subscription';
import { requireAdmin } from '@/middleware/adminAuth';

// POST - Cancel subscription (at period end)
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
    // Cancel at period end via Stripe
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Sync full status from Stripe
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
    console.error('Stripe cancel failed:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

// GET - Get subscription details
export async function GET(
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
    include: {
      user: {
        select: {
          email: true,
          name: true,
          createdAt: true,
          plan: { select: { plan: true, accessStatus: true } },
        },
      },
    },
  });

  if (!subscription) {
    return NextResponse.json(
      { error: 'Subscription not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ subscription });
}
