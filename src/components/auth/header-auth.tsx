"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function HeaderAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-400">
        ...
      </span>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-900 hover:bg-slate-200"
        >
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-300">
        {session.user.email ?? session.user.name ?? "用户"}
      </span>
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
      >
        退出
      </button>
    </div>
  );
}
