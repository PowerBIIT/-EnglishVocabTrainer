import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

vi.mock('stripe', () => ({
  default: class Stripe {
    key: string;
    opts: unknown;
    constructor(key: string, opts: unknown) {
      this.key = key;
      this.opts = opts;
    }
  },
}));

const loadStripeModule = async () => {
  vi.resetModules();
  return import('@/lib/stripe');
};

describe('stripe helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws when STRIPE_SECRET_KEY is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripe } = await loadStripeModule();

    expect(() => getStripe()).toThrow('STRIPE_SECRET_KEY is not set');
  });

  it('creates and memoizes a Stripe client', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    const { getStripe } = await loadStripeModule();

    const first = getStripe();
    const second = getStripe();

    expect(first).toBe(second);
  });

  it('exposes price id getters', async () => {
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_monthly';
    process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_annual';
    const { STRIPE_PRICE_IDS } = await loadStripeModule();

    expect(STRIPE_PRICE_IDS.PRO_MONTHLY).toBe('price_monthly');
    expect(STRIPE_PRICE_IDS.PRO_ANNUAL).toBe('price_annual');
  });
});
