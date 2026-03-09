import { getAuthContext } from "@/lib/auth/session";
import { ManageSubscriptionButton } from "@/components/settings/manage-subscription-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { UsdtPaymentHistory } from "@/components/settings/usdt-payment-history";

interface SettingsPageProps {
  searchParams: Promise<{
    checkout?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const authContext = await getAuthContext();
  const params = await searchParams;

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="max-w-2xl text-slate-300">
          这里会逐步承接语言、知识水平和订阅管理。当前先展示认证和门控状态。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm text-slate-400">Auth configured</div>
          <div className="mt-2 text-xl font-medium">
            {authContext.authConfigured ? "Yes" : "No"}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm text-slate-400">Signed in</div>
          <div className="mt-2 text-xl font-medium">
            {authContext.isAuthenticated ? "Yes" : "No"}
          </div>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm text-slate-400">Plan</div>
          <div className="mt-2 text-xl font-medium">{authContext.plan}</div>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-300">
        Free 用户当前每月生成上限为 3 次，并且仅允许 `Explorer` 难度；前 2 章公开，
        第 3 章起要求登录。
      </div>

      {params.checkout === "success" ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
          支付已收到，我们会尽快核对并开通订阅。
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="text-sm text-slate-400">Monthly generation usage</div>
        <div className="mt-2 text-xl font-medium">{authContext.monthlyCourseCount}</div>
      </div>

      {authContext.isAuthenticated ? (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold text-slate-200">Profile</h2>
            <p className="mt-1 text-sm text-slate-400">
              Knowledge level and preferred language are used for course generation.
            </p>
            <div className="mt-4">
              <ProfileForm />
            </div>
          </div>
          <ManageSubscriptionButton />
          <UsdtPaymentHistory />
        </>
      ) : null}
    </section>
  );
}
