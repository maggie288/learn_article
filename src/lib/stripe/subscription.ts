import type Stripe from "stripe";

export function getPlanFromPrice(priceId: string | null | undefined): "free" | "pro" | "team" {
  if (!priceId) {
    return "free";
  }

  if (priceId.includes("team")) {
    return "team";
  }

  return "pro";
}

export function toIsoTimestamp(unixSeconds: number | null | undefined) {
  if (!unixSeconds) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}

export function getPrimaryPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id ?? null;
}
