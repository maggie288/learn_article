import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { getAppUserById } from "@/lib/db/repositories";
import { isStripeConfigured, serverEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe/client";
import { err, ok } from "@/lib/types/api";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      err("STRIPE_NOT_CONFIGURED", "Stripe is not configured."),
      { status: 503 },
    );
  }

  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const user = await getAppUserById(authContext.userId);
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      err("CUSTOMER_NOT_FOUND", "No Stripe customer is linked to this user."),
      { status: 404 },
    );
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json(
      err("STRIPE_NOT_READY", "Stripe client is not available."),
      { status: 503 },
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return NextResponse.json(
    ok({
      url: session.url,
    }),
  );
}
