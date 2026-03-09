import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { listUsdtPaymentRequestsByUserId } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

/** GET /api/payment/usdt/requests — 当前用户 USDT 支付请求列表 */
export async function GET() {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const list = await listUsdtPaymentRequestsByUserId(auth.userId);

  return NextResponse.json(
    ok({
      items: list.map((r) => ({
        id: r.id,
        plan: r.plan,
        amountUsdt: r.amountUsdt,
        txHash: r.txHash,
        status: r.status,
        createdAt: r.createdAt,
      })),
    }),
    { status: 200 },
  );
}
