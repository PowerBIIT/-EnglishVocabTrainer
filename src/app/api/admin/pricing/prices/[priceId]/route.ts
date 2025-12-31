import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { setAppConfig } from '@/lib/config';
import { requireAdmin } from '@/middleware/adminAuth';

type RouteParams = { params: Promise<{ priceId: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await requireAdmin();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { priceId } = await params;

  try {
    const body = await request.json();
    const { archive, setActive } = body as {
      archive?: boolean;
      setActive?: 'monthly' | 'annual';
    };

    const stripe = getStripe();

    // Archive the price
    if (archive === true) {
      await stripe.prices.update(priceId, { active: false });
      return NextResponse.json({ success: true, action: 'archived' });
    }

    // Set as active price for monthly or annual
    if (setActive === 'monthly' || setActive === 'annual') {
      // Verify price exists
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active) {
        return NextResponse.json(
          { error: 'Cannot set an archived price as active' },
          { status: 400 }
        );
      }

      const configKey =
        setActive === 'monthly'
          ? 'STRIPE_PRO_MONTHLY_PRICE_ID'
          : 'STRIPE_PRO_ANNUAL_PRICE_ID';

      await setAppConfig({
        key: configKey,
        value: priceId,
        updatedBy: session.user.email,
        dataType: 'string',
      });

      return NextResponse.json({
        success: true,
        action: 'setActive',
        type: setActive,
      });
    }

    return NextResponse.json({ error: 'No valid action specified' }, { status: 400 });
  } catch (error) {
    console.error('Failed to update price:', error);
    const message = error instanceof Error ? error.message : 'Failed to update price';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
