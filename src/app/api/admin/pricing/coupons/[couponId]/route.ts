import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { requireAdmin } from '@/middleware/adminAuth';

type RouteParams = { params: Promise<{ couponId: string }> };

export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { couponId } = await params;

  try {
    const stripe = getStripe();
    await stripe.coupons.del(couponId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete coupon:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete coupon';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
