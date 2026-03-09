import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
      <div className="h-7 w-32 animate-pulse rounded bg-slate-700" />
      <p className="mt-2 text-sm text-slate-400">使用邮箱和密码登录 PaperFlow</p>
      <div className="mt-6 space-y-4">
        <div className="h-10 rounded-lg bg-slate-800" />
        <div className="h-10 rounded-lg bg-slate-800" />
        <div className="h-12 rounded-full bg-slate-700" />
      </div>
      <p className="mt-6 text-center text-sm text-slate-400">加载中…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-300">
          返回首页
        </Link>
      </p>
    </main>
  );
}
