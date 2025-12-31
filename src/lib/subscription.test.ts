import { describe, expect, it, beforeEach, vi } from 'vitest';
import { Plan } from '@prisma/client';
import {
  cancelSubscription,
  getOrCreateStripeCustomer,
  isSubscriptionActive,
  syncSubscriptionStatus,
} from '@/lib/subscription';

const prismaMock = vi.hoisted(() => ({
  subscription: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userPlan: {
    update: vi.fn(),
  },
  $transaction: vi.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
}));

const stripeMock = vi.hoisted(() => ({
  customers: {
    create: vi.fn(),
  },
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
}));

vi.mock('@/lib/stripe', () => ({
  getStripe: () => stripeMock,
}));

describe('subscription helpers', () => {
  beforeEach(() => {
    prismaMock.subscription.findUnique.mockReset();
    prismaMock.subscription.create.mockReset();
    prismaMock.subscription.update.mockReset();
    prismaMock.userPlan.update.mockReset();
    prismaMock.$transaction.mockClear();
    stripeMock.customers.create.mockReset();
    stripeMock.subscriptions.retrieve.mockReset();
    stripeMock.subscriptions.update.mockReset();
  });

  it('returns existing stripe customer id', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_existing' });

    const id = await getOrCreateStripeCustomer('user-1', 'user@example.com');

    expect(id).toBe('cus_existing');
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it('creates a new stripe customer when missing', async () => {
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_new' });
    prismaMock.subscription.create.mockResolvedValue({});

    const id = await getOrCreateStripeCustomer('user-2', 'user@example.com');

    expect(id).toBe('cus_new');
    expect(prismaMock.subscription.create).toHaveBeenCalled();
  });

  it('syncs subscription status and updates plan', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue({
      status: 'active',
      items: { data: [{ price: { id: 'price_1' } }] },
      current_period_start: 1700000000,
      current_period_end: 1700003600,
      cancel_at_period_end: false,
    });

    prismaMock.subscription.findUnique.mockResolvedValue({
      userId: 'user-3',
      stripeSubscriptionId: 'sub_1',
      user: { id: 'user-3' },
    });

    prismaMock.subscription.update.mockResolvedValue({});
    prismaMock.userPlan.update.mockResolvedValue({});

    await syncSubscriptionStatus('sub_1');

    expect(prismaMock.subscription.update).toHaveBeenCalled();
    expect(prismaMock.userPlan.update).toHaveBeenCalledWith({
      where: { userId: 'user-3' },
      data: { plan: Plan.PRO },
    });
  });

  it('ignores missing subscription records', async () => {
    stripeMock.subscriptions.retrieve.mockResolvedValue({
      status: 'active',
      items: { data: [] },
    });
    prismaMock.subscription.findUnique.mockResolvedValue(null);

    await syncSubscriptionStatus('sub_missing');

    expect(prismaMock.subscription.update).not.toHaveBeenCalled();
  });

  it('detects active subscription statuses', () => {
    expect(isSubscriptionActive('ACTIVE')).toBe(true);
    expect(isSubscriptionActive('TRIALING')).toBe(true);
    expect(isSubscriptionActive('PAST_DUE')).toBe(false);
  });

  it('cancels subscriptions when available', async () => {
    prismaMock.subscription.findUnique.mockResolvedValueOnce(null);
    await expect(cancelSubscription('user-4')).resolves.toBe(false);

    prismaMock.subscription.findUnique.mockResolvedValueOnce({
      stripeSubscriptionId: 'sub_cancel',
    });
    prismaMock.subscription.update.mockResolvedValue({});

    await expect(cancelSubscription('user-4')).resolves.toBe(true);
    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith('sub_cancel', {
      cancel_at_period_end: true,
    });
  });
});
