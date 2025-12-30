import Stripe from 'stripe';

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

export const STRIPE_PRICE_IDS = {
  get PRO_MONTHLY() {
    return process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '';
  },
  get PRO_ANNUAL() {
    return process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '';
  },
};

export const TRIAL_PERIOD_DAYS = 7;
