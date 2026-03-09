import { UsdtSubscribeSection } from "@/components/pricing/usdt-subscribe-section";
import { getAuthContext } from "@/lib/auth/session";
import { getUsdtWalletAddress } from "@/lib/env";

const plans = [
  {
    name: "Free",
    description: "每月 3 篇 Explorer 课程。",
    paid: false,
  },
  {
    name: "Pro",
    description: "完整难度层级、下载与优先队列。",
    paid: true,
  },
  {
    name: "Team",
    description: "团队知识库、协作与管理能力。",
    paid: true,
  },
];

export default async function PricingPage() {
  const authContext = await getAuthContext();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold">Pricing</h1>
        <p className="max-w-2xl text-slate-300">
          订阅使用 USDT (TRC20) 支付，下方为收款地址与说明。
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="text-sm text-slate-400">Current plan</div>
        <div className="mt-2 text-2xl font-semibold">{authContext.plan}</div>
        <div className="mt-2 text-sm text-slate-300">
          Free 用户本月已生成 {authContext.monthlyCourseCount} / 3 篇课程。
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <section
            key={plan.name}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <h2 className="text-xl font-medium">{plan.name}</h2>
            <p className="mt-3 text-sm text-slate-300">{plan.description}</p>
            {plan.paid ? (
              <p className="mt-4 text-sm text-slate-400">
                使用 USDT 支付，见下方收款说明。
              </p>
            ) : null}
          </section>
        ))}
      </div>

      <section id="usdt" className="mt-10">
        <UsdtSubscribeSection address={getUsdtWalletAddress()} />
      </section>
    </main>
  );
}
