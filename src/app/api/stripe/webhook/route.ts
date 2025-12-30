import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { syncSubscriptionStatus } from '@/lib/subscription';
import { Plan } from '@prisma/client';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          await prisma.subscription.update({
            where: { stripeCustomerId: session.customer as string },
            data: { stripeSubscriptionId: session.subscription as string },
          });
          await syncSubscriptionStatus(session.subscription as string);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscriptionStatus(subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const dbSubscription = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (dbSubscription) {
          await prisma.$transaction([
            prisma.subscription.update({
              where: { stripeSubscriptionId: subscription.id },
              data: { status: 'CANCELED' },
            }),
            prisma.userPlan.update({
              where: { userId: dbSubscription.userId },
              data: { plan: Plan.FREE },
            }),
          ]);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        const subscriptionDetails = (
          invoice as { parent?: { subscription_details?: { subscription?: string | { id: string } } } }
        ).parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof subscriptionDetails === 'string'
            ? subscriptionDetails
            : subscriptionDetails?.id;
        if (subscriptionId) {
          await syncSubscriptionStatus(subscriptionId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionDetails = (
          invoice as { parent?: { subscription_details?: { subscription?: string | { id: string } } } }
        ).parent?.subscription_details?.subscription;
        const subscriptionId =
          typeof subscriptionDetails === 'string'
            ? subscriptionDetails
            : subscriptionDetails?.id;
        if (subscriptionId) {
          await syncSubscriptionStatus(subscriptionId);
        }
        // TODO: Optionally send notification email to user
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
