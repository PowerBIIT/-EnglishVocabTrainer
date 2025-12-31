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

const getAppConfigMock = vi.fn();

vi.mock('@/lib/config', () => ({
  getAppConfig: (key: string) => getAppConfigMock(key),
}));

const loadStripeModule = async () => {
  vi.resetModules();
  return import('@/lib/stripe');
};

describe('stripe helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    getAppConfigMock.mockReset();
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

  describe('getActivePriceIds', () => {
    it('returns price IDs from database when available', async () => {
      getAppConfigMock.mockImplementation((key: string) => {
        if (key === 'STRIPE_PRO_MONTHLY_PRICE_ID') return Promise.resolve('price_db_monthly');
        if (key === 'STRIPE_PRO_ANNUAL_PRICE_ID') return Promise.resolve('price_db_annual');
        return Promise.resolve(null);
      });

      const { getActivePriceIds } = await loadStripeModule();
      const result = await getActivePriceIds();

      expect(result.PRO_MONTHLY).toBe('price_db_monthly');
      expect(result.PRO_ANNUAL).toBe('price_db_annual');
    });

    it('falls back to env vars when database returns null', async () => {
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_env_monthly';
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_env_annual';
      getAppConfigMock.mockResolvedValue(null);

      const { getActivePriceIds } = await loadStripeModule();
      const result = await getActivePriceIds();

      expect(result.PRO_MONTHLY).toBe('price_env_monthly');
      expect(result.PRO_ANNUAL).toBe('price_env_annual');
    });

    it('falls back to env vars when database returns empty string', async () => {
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_env_monthly';
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_env_annual';
      getAppConfigMock.mockResolvedValue('');

      const { getActivePriceIds } = await loadStripeModule();
      const result = await getActivePriceIds();

      expect(result.PRO_MONTHLY).toBe('price_env_monthly');
      expect(result.PRO_ANNUAL).toBe('price_env_annual');
    });

    it('returns empty strings when neither database nor env vars are set', async () => {
      delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
      delete process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
      getAppConfigMock.mockResolvedValue(null);

      const { getActivePriceIds } = await loadStripeModule();
      const result = await getActivePriceIds();

      expect(result.PRO_MONTHLY).toBe('');
      expect(result.PRO_ANNUAL).toBe('');
    });

    it('prefers database value over env var when both exist', async () => {
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_env_monthly';
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_env_annual';
      getAppConfigMock.mockImplementation((key: string) => {
        if (key === 'STRIPE_PRO_MONTHLY_PRICE_ID') return Promise.resolve('price_db_monthly');
        if (key === 'STRIPE_PRO_ANNUAL_PRICE_ID') return Promise.resolve('price_db_annual');
        return Promise.resolve(null);
      });

      const { getActivePriceIds } = await loadStripeModule();
      const result = await getActivePriceIds();

      expect(result.PRO_MONTHLY).toBe('price_db_monthly');
      expect(result.PRO_ANNUAL).toBe('price_db_annual');
    });

    it('handles mixed scenario (one from DB, one from env)', async () => {
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_env_monthly';
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_env_annual';
      getAppConfigMock.mockImplementation((key: string) => {
        if (key === 'STRIPE_PRO_MONTHLY_PRICE_ID') return Promise.resolve('price_db_monthly');
        if (key === 'STRIPE_PRO_ANNUAL_PRICE_ID') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const { getActivePriceIds } = await loadStripeModule();
      const result = await getActivePriceIds();

      expect(result.PRO_MONTHLY).toBe('price_db_monthly');
      expect(result.PRO_ANNUAL).toBe('price_env_annual');
    });
  });
});
