import Stripe from "stripe";
import { isStripeConfigured, serverEnv } from "@/lib/env";

let stripe: Stripe | null = null;

export function getStripeClient() {
  if (!isStripeConfigured()) {
    return null;
  }

  if (!stripe) {
    stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY!);
  }

  return stripe;
}

export function getStripePriceId(plan: "pro-monthly" | "pro-yearly" | "team") {
  if (plan === "pro-monthly") {
    return serverEnv.STRIPE_PRO_MONTHLY_PRICE_ID ?? null;
  }

  if (plan === "pro-yearly") {
    return serverEnv.STRIPE_PRO_YEARLY_PRICE_ID ?? null;
  }

  return serverEnv.STRIPE_TEAM_PRICE_ID ?? null;
}
