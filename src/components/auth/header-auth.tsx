"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

export function HeaderAuth() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <span className="rounded-full border border-amber-500/40 px-3 py-1 text-xs text-amber-200">
        Auth not configured
      </span>
    );
  }

  return <ConfiguredHeaderAuth />;
}

function ConfiguredHeaderAuth() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-100">
          Sign in
        </button>
      </SignInButton>
    );
  }

  return <UserButton />;
}
