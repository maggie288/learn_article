import { PLANS } from "@/components/pricing/plan-cards";
import { ChoosePlanAndPay } from "@/components/pricing/choose-plan-and-pay";
import { getAuthContext } from "@/lib/auth/session";
import { getUsdtWalletAddress, isPromoAllPlansFree } from "@/lib/env";

export default async function PricingPage() {
  const authContext = await getAuthContext();
  const isPromo = isPromoAllPlansFree();
  const usdtAddress = getUsdtWalletAddress();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold">定价</h1>
        <p className="max-w-2xl text-slate-300">
          {isPromo
            ? "当前促销期，所有套餐限时免费。选择套餐后点击免费开通即可。"
            : "选择套餐后使用 USDT (TRC20) 支付，到账后我们会开通订阅。"}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="text-sm text-slate-400">当前套餐</div>
        <div className="mt-2 text-2xl font-semibold">{authContext.plan}</div>
        <div className="mt-2 text-sm text-slate-300">
          Free 用户本月已生成 {authContext.monthlyCourseCount} / 3 篇课程。
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <section
            key={plan.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <h2 className="text-xl font-medium">{plan.name}</h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              {isPromo && plan.paid ? (
                <>
                  <span className="text-2xl font-semibold text-emerald-400">限时免费</span>
                  <span className="text-sm text-slate-500 line-through">{plan.originalPrice}</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-semibold text-white">{plan.price}</span>
                  <span className="text-sm text-slate-400">{plan.period}</span>
                </>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-300">{plan.description}</p>
            {plan.paid && plan.options && (
              <ul className="mt-3 space-y-1 text-sm text-slate-400">
                {plan.options.map((opt) => (
                  <li key={opt.id}>{opt.label}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <section id="usdt" className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        {authContext.isAuthenticated ? (
          <ChoosePlanAndPay isPromo={isPromo} usdtAddress={usdtAddress} />
        ) : (
          <p className="text-slate-400">
            请先{" "}
            <a href="/login" className="text-sky-400 hover:underline">
              登录
            </a>{" "}
            后选择套餐并{isPromo ? "免费开通" : "使用 USDT 支付"}。
          </p>
        )}
      </section>
    </main>
  );
}
