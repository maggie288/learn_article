import { NextResponse } from "next/server";
import { z } from "zod";
import { captureServerEvent } from "@/lib/analytics/server";
import { getAuthContext } from "@/lib/auth/session";
import { approveUsdtPaymentRequest } from "@/lib/db/repositories";
import { requireDevelopment } from "@/lib/guards";
import { err, ok } from "@/lib/types/api";

const schema = z.object({
  paymentRequestId: z.string().uuid(),
});

/**
 * POST /api/payment/usdt/approve — 管理端：人工核对后确认开通订阅
 * 生产环境需加管理员校验（如 ADMIN_SECRET 或角色表）；当前开发阶段仅开发环境可用
 */
export async function POST(request: Request) {
  try {
    requireDevelopment();
  } catch {
    return NextResponse.json(err("NOT_FOUND", "Not found"), { status: 404 });
  }

  const auth = await getAuthContext();
  if (!auth.isAuthenticated) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(err("VALIDATION_ERROR", "缺少 paymentRequestId"), { status: 400 });
  }

  try {
    const subscription = await approveUsdtPaymentRequest(parsed.data.paymentRequestId);
    if (!subscription) {
      return NextResponse.json(
        err("INVALID_STATE", "支付请求不存在或已处理"),
        { status: 400 },
      );
    }
    await captureServerEvent({
      distinctId: subscription.userId,
      event: "subscription_started",
      properties: { plan: subscription.plan, source: "usdt" },
    });
    return NextResponse.json(
      ok({ message: "已开通订阅", plan: subscription.plan }),
      { status: 200 },
    );
  } catch (e) {
    console.error("[payment/usdt/approve]", e);
    return NextResponse.json(
      err("SERVER_ERROR", "开通失败，请稍后重试"),
      { status: 500 },
    );
  }
}
