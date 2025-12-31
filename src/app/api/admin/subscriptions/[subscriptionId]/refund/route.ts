import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe';
import { requireAdmin } from '@/middleware/adminAuth';

type RefundBody = {
  amount?: number; // Amount in cents. If not provided, full refund
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
};

export async function POST(
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

  let body: RefundBody = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is OK - means full refund
  }

  const stripe = getStripe();

  try {
    // Get the subscription to find the latest invoice
    const stripeSub = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
      { expand: ['latest_invoice'] }
    );

    const latestInvoice = stripeSub.latest_invoice;
    if (!latestInvoice || typeof latestInvoice === 'string') {
      return NextResponse.json(
        { error: 'No invoice found to refund' },
        { status: 400 }
      );
    }

    // Access payment_intent using bracket notation for dynamic property access
    const invoiceData = latestInvoice as unknown as Record<string, unknown>;
    const paymentIntentId = invoiceData.payment_intent;
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'No payment found to refund' },
        { status: 400 }
      );
    }

    const paymentIntent =
      typeof paymentIntentId === 'string'
        ? paymentIntentId
        : (paymentIntentId as { id: string }).id;

    const refundParams: {
      payment_intent: string;
      amount?: number;
      reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    } = {
      payment_intent: paymentIntent,
    };

    if (body.amount && body.amount > 0) {
      refundParams.amount = body.amount;
    }

    if (body.reason) {
      refundParams.reason = body.reason;
    }

    const refund = await stripe.refunds.create(refundParams);

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
      },
    });
  } catch (error) {
    console.error('Refund failed:', error);
    const message = error instanceof Error ? error.message : 'Refund failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
