import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { createUsdtPaymentRequest } from "@/lib/db/repositories";
import { getUsdtWalletAddress, getUsdtAmountForPlan } from "@/lib/env";
import { err, ok } from "@/lib/types/api";

const schema = z.object({
  plan: z.enum(["pro-monthly", "pro-yearly", "team"]),
});

/** POST /api/payment/usdt/request — 创建 USDT 支付请求，返回收款地址、金额、订单号 */
export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(err("VALIDATION_ERROR", "请选择套餐"), { status: 400 });
  }

  const walletAddress = getUsdtWalletAddress();
  if (!walletAddress) {
    return NextResponse.json(
      err("CONFIG_ERROR", "USDT 收款未配置，请联系管理员"),
      { status: 503 },
    );
  }

  const amountUsdt = getUsdtAmountForPlan(parsed.data.plan);
  const { id: paymentRequestId } = await createUsdtPaymentRequest({
    userId: auth.userId,
    plan: parsed.data.plan,
    amountUsdt,
  });

  const orderId = `USDT-${paymentRequestId.slice(0, 8).toUpperCase()}`;

  return NextResponse.json(
    ok({
      paymentRequestId,
      walletAddress,
      amountUsdt,
      plan: parsed.data.plan,
      orderId,
    }),
    { status: 200 },
  );
}
