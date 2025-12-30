import { NextResponse } from 'next/server';
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const [monthlyPrice, annualPrice] = await Promise.all([
      stripe.prices.retrieve(STRIPE_PRICE_IDS.PRO_MONTHLY, {
        expand: ['product'],
      }),
      stripe.prices.retrieve(STRIPE_PRICE_IDS.PRO_ANNUAL, {
        expand: ['product'],
      }),
    ]);

    const monthlyAmount = monthlyPrice.unit_amount ?? 0;
    const annualAmount = annualPrice.unit_amount ?? 0;
    const annualMonthlyEquivalent = monthlyAmount * 12;

    return NextResponse.json({
      monthly: {
        id: monthlyPrice.id,
        unitAmount: monthlyAmount,
        currency: monthlyPrice.currency,
        interval: monthlyPrice.recurring?.interval,
      },
      annual: {
        id: annualPrice.id,
        unitAmount: annualAmount,
        currency: annualPrice.currency,
        interval: annualPrice.recurring?.interval,
        savings: Math.round(
          ((annualMonthlyEquivalent - annualAmount) / annualMonthlyEquivalent) *
            100
        ),
      },
      trialDays: 7,
    });
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
