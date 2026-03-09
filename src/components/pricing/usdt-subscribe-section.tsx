"use client";

import { useState } from "react";

interface UsdtSubscribeSectionProps {
  address: string | null;
}

export function UsdtSubscribeSection({ address }: UsdtSubscribeSectionProps) {
  const [copied, setCopied] = useState(false);

  if (!address) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-slate-200">使用 USDT 订阅</h2>
        <p className="mt-2 text-sm text-slate-400">
          请配置 <code className="rounded bg-slate-800 px-1">USDT_TRC20_WALLET_ADDRESS</code> 后显示收款地址。
        </p>
      </div>
    );
  }

  function copyAddress() {
    if (!address) return;
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-slate-200">使用 USDT 订阅 Pro / Team</h2>
      <p className="mt-2 text-sm text-slate-400">
        请向以下 TRC20 (TRON) 地址支付 USDT。到账后我们会人工开通订阅，或联系客服提供交易哈希以加速核对。
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <code className="break-all rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200">
          {address}
        </code>
        <button
          type="button"
          onClick={copyAddress}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          {copied ? "已复制" : "复制地址"}
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        网络：TRC20 (TRON) · 币种：USDT · 金额：Pro 月付/年付或 Team 请参考定价或联系客服
      </p>
    </div>
  );
}
