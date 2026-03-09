import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import {
  getUsdtPaymentRequestById,
  updateUsdtPaymentRequestTxHash,
} from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const schema = z.object({
  paymentRequestId: z.string().uuid(),
  txHash: z.string().min(1, "请填写交易哈希").max(200),
});

/** POST /api/payment/usdt/confirm — 用户提交 tx_hash 确认转账 */
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

  const req = await getUsdtPaymentRequestById(parsed.data.paymentRequestId);
  if (!req) {
    return NextResponse.json(err("NOT_FOUND", "支付请求不存在"), { status: 404 });
  }
  if (req.userId !== auth.userId) {
    return NextResponse.json(err("FORBIDDEN", "无权操作该订单"), { status: 403 });
  }
  if (req.status !== "pending") {
    return NextResponse.json(err("INVALID_STATE", "该订单已处理，无需重复提交"), { status: 400 });
  }

  const updated = await updateUsdtPaymentRequestTxHash(
    parsed.data.paymentRequestId,
    parsed.data.txHash.trim(),
  );

  if (!updated) {
    return NextResponse.json(err("SERVER_ERROR", "提交失败，请稍后重试"), { status: 500 });
  }

  return NextResponse.json(
    ok({ message: "已提交，我们会尽快核对并开通订阅。" }),
    { status: 200 },
  );
}
