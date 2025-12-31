import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripe, getActivePriceIds, TRIAL_PERIOD_DAYS } from '@/lib/stripe';
import { getOrCreateStripeCustomer } from '@/lib/subscription';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const priceType = body.priceType as 'monthly' | 'annual';

    if (!['monthly', 'annual'].includes(priceType)) {
      return NextResponse.json({ error: 'Invalid price type' }, { status: 400 });
    }

    const priceIds = await getActivePriceIds();
    const priceId =
      priceType === 'monthly' ? priceIds.PRO_MONTHLY : priceIds.PRO_ANNUAL;

    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email
    );

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXTAUTH_URL}/profile?subscription=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/profile?subscription=cancelled`,
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: { userId: session.user.id },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: { userId: session.user.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
