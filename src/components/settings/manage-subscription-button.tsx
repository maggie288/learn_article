import Link from "next/link";

export function ManageSubscriptionButton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-slate-200">订阅管理</h2>
      <p className="mt-2 text-sm text-slate-400">
        Pro / Team 订阅请使用 USDT (TRC20) 支付，收款地址与说明见定价页。到账后我们会人工开通或根据您提供的交易哈希核对。
      </p>
      <Link
        href="/pricing#usdt"
        className="mt-4 inline-block rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
      >
        前往定价页（USDT 收款）
      </Link>
    </div>
  );
}
