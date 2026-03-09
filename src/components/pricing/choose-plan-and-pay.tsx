"use client";

import { useState } from "react";
import { PLANS } from "@/components/pricing/plan-cards";
import { UsdtPaidForm } from "@/components/pricing/usdt-paid-form";

type PlanOptionId = "pro-monthly" | "pro-yearly" | "team";

const OPTIONS: Array<{
  id: PlanOptionId;
  label: string;
  plan: "pro" | "team";
  amount: string;
}> = [
  { id: "pro-monthly", label: "Pro 月付 15 USDT/月", plan: "pro", amount: "15" },
  { id: "pro-yearly", label: "Pro 年付 150 USDT/年", plan: "pro", amount: "150" },
  { id: "team", label: "Team 30 USDT/月", plan: "team", amount: "30" },
];

interface ChoosePlanAndPayProps {
  isPromo: boolean;
  usdtAddress: string | null;
}

export function ChoosePlanAndPay({ isPromo, usdtAddress }: ChoosePlanAndPayProps) {
  const [selected, setSelected] = useState<PlanOptionId>("pro-monthly");
  const [claimStatus, setClaimStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [claimMessage, setClaimMessage] = useState("");

  const option = OPTIONS.find((o) => o.id === selected)!;

  async function handleClaimFree() {
    setClaimStatus("sending");
    setClaimMessage("");
    try {
      const res = await fetch("/api/subscription/claim-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: option.plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && data?.data?.message) {
        setClaimStatus("success");
        setClaimMessage(data.data.message);
      } else {
        setClaimStatus("error");
        setClaimMessage((data?.error?.message as string) ?? "开通失败，请稍后重试");
      }
    } catch {
      setClaimStatus("error");
      setClaimMessage("网络错误，请稍后重试");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-200">选择套餐</h3>
        <p className="mt-1 text-sm text-slate-400">
          {isPromo
            ? "当前促销期，所有付费套餐限时免费，选择后点击免费开通即可。"
            : "选择套餐后使用 USDT (TRC20) 支付，到账后我们会开通订阅。"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selected === opt.id
                  ? "bg-sky-500 text-slate-950"
                  : "border border-slate-600 text-slate-300 hover:border-slate-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isPromo ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="text-slate-200">已选：{option.label}</p>
          <p className="mt-1 text-sm text-slate-400">限时免费，无需支付 USDT。</p>
          <button
            type="button"
            onClick={handleClaimFree}
            disabled={claimStatus === "sending"}
            className="mt-4 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {claimStatus === "sending" ? "开通中…" : "免费开通"}
          </button>
          {claimMessage && (
            <p
              className={`mt-3 text-sm ${
                claimStatus === "success" ? "text-emerald-300" : "text-rose-400"
              }`}
            >
              {claimMessage}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {usdtAddress ? (
            <>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">请向以下地址支付 <strong className="text-slate-200">{option.amount} USDT</strong>（TRC20）</p>
                <code className="mt-2 block break-all rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200">
                  {usdtAddress}
                </code>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">我已支付，申请开通</h3>
                <p className="mt-1 text-sm text-slate-400">
                  完成转账后请填写交易哈希，我们会尽快核对并开通。
                </p>
                <UsdtPaidForm defaultPlan={selected} />
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              请配置 USDT_TRC20_WALLET_ADDRESS 后显示收款地址。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
