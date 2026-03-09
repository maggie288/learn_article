import { NextResponse } from "next/server";
import { captureServerEvent } from "@/lib/analytics/server";
import { getAuthContext } from "@/lib/auth/session";
import { setSubscriptionCancelAtPeriodEnd } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

/**
 * POST /api/subscription/cancel — 用户请求在周期末取消订阅
 * 埋点：subscription_cancelled
 */
export async function POST() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const sub = await setSubscriptionCancelAtPeriodEnd(auth.userId);
  if (!sub) {
    return NextResponse.json(
      err("INVALID_STATE", "当前无有效订阅可取消"),
      { status: 400 },
    );
  }

  await captureServerEvent({
    distinctId: auth.userId,
    event: "subscription_cancelled",
    properties: { plan: sub.plan },
  });

  return NextResponse.json(
    ok({ message: "已设置为周期末取消", plan: sub.plan }),
    { status: 200 },
  );
}
