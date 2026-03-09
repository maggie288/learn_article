import Link from "next/link";
import { Suspense } from "react";
import { HeaderAuth } from "@/components/auth/header-auth";
import { ReferralCapture } from "@/components/analytics/referral-capture";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Suspense fallback={null}>
        <ReferralCapture />
      </Suspense>
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-semibold tracking-tight text-white hover:text-white"
          >
            PaperFlow
          </Link>
          <HeaderAuth />
        </div>
      </header>
      {children}
    </div>
  );
}
