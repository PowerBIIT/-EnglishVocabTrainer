import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { Plan, SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  await prisma.subscription.create({
    data: {
      userId,
      stripeCustomerId: customer.id,
      status: 'INCOMPLETE',
    },
  });

  return customer.id;
}

export async function syncSubscriptionStatus(
  stripeSubscriptionId: string
): Promise<void> {
  const stripeSubscription = (await stripe.subscriptions.retrieve(
    stripeSubscriptionId
  )) as Stripe.Subscription;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    include: { user: true },
  });

  if (!subscription) return;

  const statusMap: Record<string, SubscriptionStatus> = {
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'INCOMPLETE_EXPIRED',
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
    paused: 'PAUSED',
  };

  const status = statusMap[stripeSubscription.status] ?? 'INCOMPLETE';
  const isActive = ['ACTIVE', 'TRIALING'].includes(status);

  // Extract period timestamps from the subscription
  const periodStart = (stripeSubscription as { current_period_start?: number })
    .current_period_start;
  const periodEnd = (stripeSubscription as { current_period_end?: number })
    .current_period_end;
  const trialStartTs = (stripeSubscription as { trial_start?: number | null })
    .trial_start;
  const trialEndTs = (stripeSubscription as { trial_end?: number | null })
    .trial_end;
  const cancelAtEnd = (
    stripeSubscription as { cancel_at_period_end?: boolean }
  ).cancel_at_period_end;

  await prisma.$transaction([
    prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: {
        status,
        stripePriceId: stripeSubscription.items.data[0]?.price.id,
        currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: cancelAtEnd ?? false,
        trialStart: trialStartTs ? new Date(trialStartTs * 1000) : null,
        trialEnd: trialEndTs ? new Date(trialEndTs * 1000) : null,
      },
    }),
    prisma.userPlan.update({
      where: { userId: subscription.userId },
      data: { plan: isActive ? Plan.PRO : Plan.FREE },
    }),
  ]);
}

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return ['ACTIVE', 'TRIALING'].includes(status);
}

export async function cancelSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    return false;
  }

  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { userId },
    data: { cancelAtPeriodEnd: true },
  });

  return true;
}
