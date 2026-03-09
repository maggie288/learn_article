"use client";

import { SessionProvider } from "next-auth/react";
import { AppPostHogProvider } from "@/components/providers/posthog-provider";

export function RootProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <AppPostHogProvider>{children}</AppPostHogProvider>
    </SessionProvider>
  );
}
