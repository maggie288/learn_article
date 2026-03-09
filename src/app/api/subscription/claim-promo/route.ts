import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { upsertSubscriptionRecord } from "@/lib/db/repositories";
import { isPromoAllPlansFree } from "@/lib/env";
import { err, ok } from "@/lib/types/api";

const schema = z.object({
  plan: z.enum(["pro", "team"]),
});

export async function POST(request: Request) {
  if (!isPromoAllPlansFree()) {
    return NextResponse.json(
      err("PROMO_ENDED", "当前无促销活动"),
      { status: 400 },
    );
  }

  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(err("VALIDATION_ERROR", "请选择 Pro 或 Team"), {
      status: 400,
    });
  }

  const userId = auth.userId;
  const plan = parsed.data.plan;
  const now = new Date();
  const oneYearLater = new Date(now);
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  try {
    await upsertSubscriptionRecord({
      userId,
      stripeSubscriptionId: `promo_${userId}`,
      plan,
      status: "active",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: oneYearLater.toISOString(),
      cancelAtPeriodEnd: false,
    });
    return NextResponse.json(
      ok({ message: "已开通，请刷新页面查看当前套餐。" }),
      { status: 200 },
    );
  } catch (e) {
    console.error("[subscription/claim-promo]", e);
    return NextResponse.json(
      err("SERVER_ERROR", "开通失败，请稍后重试"),
      { status: 500 },
    );
  }
}
