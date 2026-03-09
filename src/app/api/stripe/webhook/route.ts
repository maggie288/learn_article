import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { captureServerEvent } from "@/lib/analytics/server";
import {
  getAppUserByStripeCustomerId,
  markSubscriptionStatus,
  updateUserStripeCustomerId,
  upsertSubscriptionRecord,
} from "@/lib/db/repositories";
import { isStripeConfigured, serverEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe/client";
import { getPlanFromPrice, getPrimaryPriceId, toIsoTimestamp } from "@/lib/stripe/subscription";
import { err, ok } from "@/lib/types/api";

function isSubscriptionEvent(
  event: Stripe.Event,
): event is Stripe.Event & {
  data: { object: Stripe.Subscription };
} {
  return event.type.startsWith("customer.subscription.");
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      err("STRIPE_NOT_CONFIGURED", "Stripe is not configured."),
      { status: 503 },
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      err("STRIPE_NOT_READY", "Stripe client is not available."),
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(err("MISSING_SIGNATURE", "Missing Stripe signature."), {
      status: 400,
    });
  }

  const body = await request.text();
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    serverEnv.STRIPE_WEBHOOK_SECRET!,
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = typeof session.customer === "string" ? session.customer : null;
    const userId = session.metadata?.userId ?? null;
    const subscriptionId =
      typeof session.subscription === "string" ? session.subscription : null;

    if (customerId && userId) {
      await updateUserStripeCustomerId(userId, customerId);
    }

    if (customerId && subscriptionId) {
      const user = await getAppUserByStripeCustomerId(customerId);

      if (user) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const primaryItem = subscription.items.data[0];
        await upsertSubscriptionRecord({
          userId: user.id,
          stripeSubscriptionId: subscription.id,
          plan: getPlanFromPrice(getPrimaryPriceId(subscription)),
          status: subscription.status,
          currentPeriodStart: toIsoTimestamp(primaryItem?.current_period_start),
          currentPeriodEnd: toIsoTimestamp(primaryItem?.current_period_end),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        await captureServerEvent({
          distinctId: user.id,
          event: "subscription_started",
          properties: {
            plan: getPlanFromPrice(getPrimaryPriceId(subscription)),
            source: "stripe_checkout",
          },
        });
      }
    }
  }

  if (isSubscriptionEvent(event)) {
    const subscription = event.data.object;
    const primaryItem = subscription.items.data[0];
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : null;
    const user = customerId ? await getAppUserByStripeCustomerId(customerId) : null;

    if (user) {
      await upsertSubscriptionRecord({
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        plan: getPlanFromPrice(getPrimaryPriceId(subscription)),
        status: subscription.status,
        currentPeriodStart: toIsoTimestamp(primaryItem?.current_period_start),
        currentPeriodEnd: toIsoTimestamp(primaryItem?.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string | null })
      .subscription;

    if (subscriptionId) {
      await markSubscriptionStatus(subscriptionId, "past_due");
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : null;
    const user = customerId ? await getAppUserByStripeCustomerId(customerId) : null;

    if (user) {
      await captureServerEvent({
        distinctId: user.id,
        event: "subscription_cancelled",
        properties: {
          plan: getPlanFromPrice(getPrimaryPriceId(subscription)),
          reason: "stripe_subscription_deleted",
        },
      });
    }
  }

  return NextResponse.json(
    ok({
      received: true,
    }),
  );
}
