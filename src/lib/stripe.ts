import Stripe from 'stripe';
import { getAppConfig } from '@/lib/config';

// Lazy initialization to avoid errors during Next.js build phase
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backwards compatibility - only use in runtime code paths
export const stripe = {
  get instance() {
    return getStripe();
  },
};

// Sync price IDs from env vars only (for backwards compatibility)
export const STRIPE_PRICE_IDS = {
  get PRO_MONTHLY() {
    return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '';
  },
  get PRO_ANNUAL() {
    return process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '';
  },
};

// Async price IDs from DB (AdminConfig) with env var fallback
export async function getActivePriceIds(): Promise<{
  PRO_MONTHLY: string;
  PRO_ANNUAL: string;
}> {
  const [monthly, annual] = await Promise.all([
    getAppConfig('STRIPE_PRO_MONTHLY_PRICE_ID'),
    getAppConfig('STRIPE_PRO_ANNUAL_PRICE_ID'),
  ]);
  return {
    PRO_MONTHLY: monthly || process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    PRO_ANNUAL: annual || process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
  };
}

export const TRIAL_PERIOD_DAYS = 7;
