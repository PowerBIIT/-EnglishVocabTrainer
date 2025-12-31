import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { requireAdmin } from '@/middleware/adminAuth';
import type { AdminProduct } from '@/types/pricing';

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stripe = getStripe();
    const productsResponse = await stripe.products.list({
      limit: 100,
      active: true,
    });

    const products: AdminProduct[] = productsResponse.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
