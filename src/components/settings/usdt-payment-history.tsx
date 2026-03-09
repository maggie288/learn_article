"use client";

import { useEffect, useState } from "react";

interface PaymentRequestItem {
  id: string;
  plan: string;
  amountUsdt: string | null;
  txHash: string | null;
  status: string;
  createdAt: string;
}

export function UsdtPaymentHistory() {
  const [items, setItems] = useState<PaymentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/payment/usdt/requests")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.success) return;
        setItems(data.data?.items ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-400">
        加载支付记录…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-slate-200">USDT 支付记录</h2>
        <p className="mt-2 text-sm text-slate-400">暂无支付记录</p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    pending: "待核对",
    confirmed: "已开通",
    rejected: "已拒绝",
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-slate-200">USDT 支付记录</h2>
      <p className="mt-1 text-sm text-slate-400">提交 tx_hash 后我们会核对并开通订阅</p>
      <ul className="mt-4 space-y-3">
        {items.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-3 text-sm"
          >
            <span className="text-slate-300">{r.plan}</span>
            <span className="text-slate-400">{r.amountUsdt ?? "—"} USDT</span>
            <span className="text-slate-400">
              {statusLabel[r.status] ?? r.status}
            </span>
            <span className="text-slate-500">
              {new Date(r.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
