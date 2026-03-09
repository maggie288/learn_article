import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import {
  createUsdtPaymentRequest,
  getUsdtPaymentRequestById,
  updateUsdtPaymentRequestTxHash,
} from "@/lib/db/repositories";
import { getUsdtAmountForPlan } from "@/lib/env";
import { err, ok } from "@/lib/types/api";

const schema = z.object({
  paymentRequestId: z.string().uuid().optional(),
  plan: z.enum(["pro-monthly", "pro-yearly", "team"]).optional(),
  amountUsdt: z.string().max(20).optional(),
  txHash: z.string().min(1, "请填写交易哈希").max(200),
});

/**
 * POST /api/payment/usdt — 兼容旧前端：若带 paymentRequestId 则仅确认；否则用 plan+txHash 创建请求并确认
 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.txHash?.[0] ?? "参数无效";
    return NextResponse.json(err("VALIDATION_ERROR", msg), { status: 400 });
  }

  let paymentRequestId = parsed.data.paymentRequestId;

  if (!paymentRequestId && parsed.data.plan) {
    const amountUsdt = parsed.data.amountUsdt?.trim() || getUsdtAmountForPlan(parsed.data.plan);
    const { id } = await createUsdtPaymentRequest({
      userId: auth.userId,
      plan: parsed.data.plan,
      amountUsdt,
    });
    paymentRequestId = id;
  }

  if (!paymentRequestId) {
    return NextResponse.json(err("VALIDATION_ERROR", "请选择套餐或提供订单号"), { status: 400 });
  }

  const req = await getUsdtPaymentRequestById(paymentRequestId);
  if (!req || req.userId !== auth.userId) {
    return NextResponse.json(err("NOT_FOUND", "支付请求不存在"), { status: 404 });
  }
  if (req.status !== "pending") {
    return NextResponse.json(err("INVALID_STATE", "该订单已处理"), { status: 400 });
  }

  const updated = await updateUsdtPaymentRequestTxHash(
    paymentRequestId,
    parsed.data.txHash.trim(),
  );
  if (!updated) {
    return NextResponse.json(
      err("SERVER_ERROR", "提交失败，请稍后重试"),
      { status: 500 },
    );
  }

  return NextResponse.json(
    ok({ message: "已提交，我们会尽快核对并开通订阅。" }),
    { status: 200 },
  );
}
