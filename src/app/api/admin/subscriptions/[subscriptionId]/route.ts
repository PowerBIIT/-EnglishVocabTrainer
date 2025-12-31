import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { syncSubscriptionStatus } from '@/lib/subscription';
import { requireAdmin } from '@/middleware/adminAuth';

type PatchAction =
  | { action: 'extendTrial'; days: number }
  | { action: 'reactivate' }
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'applyCoupon'; couponId: string }
  | { action: 'changePlan'; priceId: string };

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

// PATCH - Update subscription (extend trial, reactivate, pause, resume, apply coupon, change plan)
export async function PATCH(
  request: Request,
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

  let body: PatchAction;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const stripe = getStripe();

  try {
    switch (body.action) {
      case 'extendTrial': {
        const days = Math.min(Math.max(1, body.days ?? 7), 90);
        const newTrialEnd = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          trial_end: newTrialEnd,
        });
        break;
      }

      case 'reactivate': {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });
        break;
      }

      case 'pause': {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: { behavior: 'mark_uncollectible' },
        });
        break;
      }

      case 'resume': {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          pause_collection: '',
        });
        break;
      }

      case 'applyCoupon': {
        if (!body.couponId) {
          return NextResponse.json(
            { error: 'Coupon ID required' },
            { status: 400 }
          );
        }
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          discounts: [{ coupon: body.couponId }],
        });
        break;
      }

      case 'changePlan': {
        if (!body.priceId) {
          return NextResponse.json(
            { error: 'Price ID required' },
            { status: 400 }
          );
        }
        const stripeSub = await stripe.subscriptions.retrieve(
          subscription.stripeSubscriptionId
        );
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          items: [
            {
              id: stripeSub.items.data[0]?.id,
              price: body.priceId,
            },
          ],
          proration_behavior: 'create_prorations',
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }

    // Sync state from Stripe
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
    console.error('Subscription update failed:', error);
    const message = error instanceof Error ? error.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Immediate cancel
export async function DELETE(
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
    await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
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
    console.error('Immediate cancel failed:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
