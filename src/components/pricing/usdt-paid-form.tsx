"use client";

import { useEffect, useState } from "react";

type PlanOption = "pro-monthly" | "pro-yearly" | "team";

interface UsdtPaidFormProps {
  defaultPlan?: PlanOption;
}

export function UsdtPaidForm({ defaultPlan = "pro-monthly" }: UsdtPaidFormProps) {
  const [plan, setPlan] = useState<PlanOption>(defaultPlan);
  useEffect(() => {
    setPlan(defaultPlan);
  }, [defaultPlan]);
  const [amountUsdt, setAmountUsdt] = useState("");
  const [txHash, setTxHash] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/payment/usdt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          amountUsdt: amountUsdt.trim() || undefined,
          txHash: txHash.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && data?.data?.message) {
        setStatus("success");
        setMessage(data.data.message);
        setTxHash("");
      } else {
        setStatus("error");
        setMessage(
          (data?.error?.message as string) ?? "提交失败，请稍后重试",
        );
      }
    } catch {
      setStatus("error");
      setMessage("网络错误，请稍后重试");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300">订阅类型</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as PlanOption)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200"
        >
          <option value="pro-monthly">Pro 月付 15 USDT/月</option>
          <option value="pro-yearly">Pro 年付 150 USDT/年</option>
          <option value="team">Team 30 USDT/月</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300">支付金额 (USDT，选填)</label>
        <input
          type="text"
          value={amountUsdt}
          onChange={(e) => setAmountUsdt(e.target.value)}
          placeholder="15"
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 placeholder-slate-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300">交易哈希 (TxHash) *</label>
        <input
          type="text"
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          placeholder="TRON 链上交易哈希"
          required
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 placeholder-slate-500"
        />
      </div>
      {message && (
        <p
          className={`text-sm ${
            status === "success" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
      >
        {status === "sending" ? "提交中…" : "提交并申请开通"}
      </button>
    </form>
  );
}
