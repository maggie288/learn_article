import { SubscribeButton } from "@/components/pricing/subscribe-button";
import { getAuthContext } from "@/lib/auth/session";

const plans = [
  {
    name: "Free",
    description: "每月 3 篇 Explorer 课程。",
    cta: null,
  },
  {
    name: "Pro",
    description: "完整难度层级、下载与优先队列。",
    cta: {
      plan: "pro-monthly" as const,
      label: "Start Pro",
    },
  },
  {
    name: "Team",
    description: "团队知识库、协作与管理能力。",
    cta: {
      plan: "team" as const,
      label: "Start Team",
    },
  },
];

interface PricingPageProps {
  searchParams: Promise<{
    checkout?: string;
  }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const authContext = await getAuthContext();
  const params = await searchParams;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold">Pricing</h1>
        <p className="max-w-2xl text-slate-300">
          商业化主链已接入 Stripe checkout/portal/webhook，当前页面用于发起订阅。
        </p>
      </div>

      {params.checkout === "cancelled" ? (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
          Checkout was cancelled. You can restart the subscription flow any time.
        </div>
      ) : null}

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
            {plan.cta ? (
              <SubscribeButton label={plan.cta.label} plan={plan.cta.plan} />
            ) : null}
          </section>
        ))}
      </div>
    </main>
  );
}
