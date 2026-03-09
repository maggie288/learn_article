import { NextResponse } from "next/server";
import { err } from "@/lib/types/api";

export async function POST() {
  return NextResponse.json(
    err(
      "PAYMENT_MIGRATED",
      "Subscriptions are now paid via USDT (TRC20). Stripe webhook is disabled.",
    ),
    { status: 410 },
  );
}
