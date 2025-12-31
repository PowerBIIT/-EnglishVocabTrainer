import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { requireAdmin } from '@/middleware/adminAuth';
import type { AdminCoupon, CreateCouponData } from '@/types/pricing';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stripe = getStripe();
    const couponsResponse = await stripe.coupons.list({ limit: 100 });

    const coupons: AdminCoupon[] = couponsResponse.data.map((coupon) => ({
      id: coupon.id,
      name: coupon.name,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      currency: coupon.currency,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months,
      maxRedemptions: coupon.max_redemptions,
      timesRedeemed: coupon.times_redeemed,
      redeemBy: coupon.redeem_by,
      valid: coupon.valid,
      created: coupon.created,
    }));

    // Sort by creation date (newest first)
    coupons.sort((a, b) => b.created - a.created);

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error('Failed to fetch coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as CreateCouponData;
    const {
      name,
      percentOff,
      amountOff,
      currency,
      duration,
      durationInMonths,
      maxRedemptions,
      redeemBy,
    } = body;

    if (!name || !duration) {
      return NextResponse.json(
        { error: 'Name and duration are required' },
        { status: 400 }
      );
    }

    if (!percentOff && !amountOff) {
      return NextResponse.json(
        { error: 'Either percentOff or amountOff is required' },
        { status: 400 }
      );
    }

    if (percentOff && amountOff) {
      return NextResponse.json(
        { error: 'Cannot specify both percentOff and amountOff' },
        { status: 400 }
      );
    }

    if (amountOff && !currency) {
      return NextResponse.json(
        { error: 'Currency is required when using amountOff' },
        { status: 400 }
      );
    }

    if (duration === 'repeating' && !durationInMonths) {
      return NextResponse.json(
        { error: 'durationInMonths is required for repeating coupons' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const couponData: Stripe.CouponCreateParams = {
      name,
      duration,
    };

    if (percentOff) {
      couponData.percent_off = percentOff;
    } else if (amountOff) {
      couponData.amount_off = amountOff;
      couponData.currency = currency?.toLowerCase();
    }

    if (duration === 'repeating' && durationInMonths) {
      couponData.duration_in_months = durationInMonths;
    }

    if (maxRedemptions) {
      couponData.max_redemptions = maxRedemptions;
    }

    if (redeemBy) {
      couponData.redeem_by = redeemBy;
    }

    const coupon = await stripe.coupons.create(couponData);

    return NextResponse.json({ coupon: { id: coupon.id } });
  } catch (error) {
    console.error('Failed to create coupon:', error);
    const message = error instanceof Error ? error.message : 'Failed to create coupon';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
