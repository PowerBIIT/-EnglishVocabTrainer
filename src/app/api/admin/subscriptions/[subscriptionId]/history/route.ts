import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { requireAdmin } from '@/middleware/adminAuth';

export type SubscriptionEvent = {
  id: string;
  type: string;
  created: number;
  description: string;
};

const EVENT_TYPES = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
];

const getEventDescription = (eventType: string, eventData: unknown): string => {
  const obj = eventData as Record<string, unknown> | null;
  switch (eventType) {
    case 'customer.subscription.created':
      return 'Subscription created';
    case 'customer.subscription.updated': {
      if (obj?.cancel_at_period_end === true) {
        return 'Cancellation scheduled';
      }
      if (obj?.cancel_at_period_end === false && obj?.canceled_at === null) {
        return 'Cancellation removed';
      }
      if (obj?.status === 'trialing') {
        return 'Trial started';
      }
      if (obj?.status === 'active') {
        return 'Subscription activated';
      }
      if (obj?.pause_collection) {
        return 'Subscription paused';
      }
      return 'Subscription updated';
    }
    case 'customer.subscription.deleted':
      return 'Subscription canceled';
    case 'customer.subscription.paused':
      return 'Subscription paused';
    case 'customer.subscription.resumed':
      return 'Subscription resumed';
    case 'customer.subscription.trial_will_end':
      return 'Trial ending soon';
    case 'invoice.paid': {
      const amount = obj?.amount_paid;
      const currency = obj?.currency;
      if (typeof amount === 'number' && typeof currency === 'string') {
        return `Payment received: ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
      }
      return 'Payment received';
    }
    case 'invoice.payment_failed':
      return 'Payment failed';
    case 'invoice.payment_action_required':
      return 'Payment action required';
    default:
      return eventType;
  }
};

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
    const stripe = getStripe();

    // Get events related to this subscription
    const events = await stripe.events.list({
      limit: 50,
      types: EVENT_TYPES,
    });

    // Filter events for this specific subscription
    const subscriptionEvents: SubscriptionEvent[] = events.data
      .filter((event) => {
        const obj = event.data.object as unknown as Record<string, unknown>;
        // Check subscription ID in event object
        if (obj.id === subscription.stripeSubscriptionId) return true;
        // Check subscription reference in invoice
        if (obj.subscription === subscription.stripeSubscriptionId) return true;
        return false;
      })
      .map((event) => ({
        id: event.id,
        type: event.type,
        created: event.created,
        description: getEventDescription(event.type, event.data.object),
      }))
      .sort((a, b) => b.created - a.created);

    return NextResponse.json({ events: subscriptionEvents });
  } catch (error) {
    console.error('Failed to fetch subscription history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}
