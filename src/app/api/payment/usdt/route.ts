import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { createUsdtPaymentRequest } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const schema = z.object({
  plan: z.enum(["pro-monthly", "pro-yearly", "team"]),
  amountUsdt: z.string().max(20).optional(),
  txHash: z.string().min(1, "请填写交易哈希").max(200),
});

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

  try {
    await createUsdtPaymentRequest({
      userId: auth.userId,
      plan: parsed.data.plan,
      amountUsdt: parsed.data.amountUsdt ?? null,
      txHash: parsed.data.txHash.trim() || null,
    });
    return NextResponse.json(
      ok({ message: "已提交，我们会尽快核对并开通订阅。" }),
      { status: 200 },
    );
  } catch (e) {
    console.error("[payment/usdt]", e);
    return NextResponse.json(
      err("SERVER_ERROR", "提交失败，请稍后重试"),
      { status: 500 },
    );
  }
}
