import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { getAppUserById, updateUserStripeCustomerId } from "@/lib/db/repositories";
import { isStripeConfigured, serverEnv } from "@/lib/env";
import { getStripeClient, getStripePriceId } from "@/lib/stripe/client";
import { err, ok } from "@/lib/types/api";

const checkoutSchema = z.object({
  plan: z.enum(["pro-monthly", "pro-yearly", "team"]),
});

export async function POST(request: Request) {
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

  const payload = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      err("INVALID_REQUEST", "Invalid checkout payload.", parsed.error.flatten()),
      { status: 400 },
    );
  }

  const user = await getAppUserById(authContext.userId);
  if (!user) {
    return NextResponse.json(err("USER_NOT_FOUND", "Local user record not found."), {
      status: 404,
    });
  }

  const stripe = getStripeClient();
  const priceId = getStripePriceId(parsed.data.plan);

  if (!stripe || !priceId) {
    return NextResponse.json(
      err("STRIPE_NOT_READY", "Stripe client or price ID is missing."),
      { status: 503 },
    );
  }

  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: {
        userId: user.id,
      },
    });
    customerId = customer.id;
    await updateUserStripeCustomerId(user.id, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/settings?checkout=success`,
    cancel_url: `${serverEnv.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
    metadata: {
      userId: user.id,
      plan: parsed.data.plan,
    },
  });

  return NextResponse.json(
    ok({
      url: session.url,
    }),
  );
}
