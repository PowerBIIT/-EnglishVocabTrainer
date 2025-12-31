import { NextResponse } from 'next/server';
import { getStripe, getActivePriceIds } from '@/lib/stripe';
import { requireAdmin } from '@/middleware/adminAuth';
import type { AdminPrice, CreatePriceData } from '@/types/pricing';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stripe = getStripe();
    const [pricesResponse, activePriceIds] = await Promise.all([
      stripe.prices.list({
        limit: 100,
        expand: ['data.product'],
      }),
      getActivePriceIds(),
    ]);

    const prices: AdminPrice[] = pricesResponse.data.map((price) => {
      const product = price.product as { id: string; name: string } | string;
      const productId = typeof product === 'string' ? product : product.id;
      const productName = typeof product === 'string' ? '' : product.name;

      return {
        id: price.id,
        productId,
        productName,
        unitAmount: price.unit_amount ?? 0,
        currency: price.currency,
        interval: price.recurring?.interval ?? null,
        intervalCount: price.recurring?.interval_count ?? 1,
        active: price.active,
        nickname: price.nickname,
        created: price.created,
        isActiveMonthly: price.id === activePriceIds.PRO_MONTHLY,
        isActiveAnnual: price.id === activePriceIds.PRO_ANNUAL,
      };
    });

    // Sort: active first, then by creation date (newest first)
    prices.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return b.created - a.created;
    });

    return NextResponse.json({
      prices,
      activePriceIds: {
        monthly: activePriceIds.PRO_MONTHLY,
        annual: activePriceIds.PRO_ANNUAL,
      },
    });
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
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
    const body = (await request.json()) as CreatePriceData;
    const { productId, unitAmount, currency, interval, nickname } = body;

    if (!productId || !unitAmount || !currency || !interval) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['month', 'year'].includes(interval)) {
      return NextResponse.json(
        { error: 'Invalid interval. Must be month or year' },
        { status: 400 }
      );
    }

    if (unitAmount < 1) {
      return NextResponse.json(
        { error: 'Amount must be at least 1 (in minor units)' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Math.round(unitAmount),
      currency: currency.toLowerCase(),
      recurring: {
        interval,
      },
      nickname: nickname || undefined,
    });

    return NextResponse.json({ price: { id: price.id } });
  } catch (error) {
    console.error('Failed to create price:', error);
    const message = error instanceof Error ? error.message : 'Failed to create price';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
