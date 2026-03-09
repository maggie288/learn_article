"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { AppPostHogProvider } from "@/components/providers/posthog-provider";

export function RootProviders({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <AppPostHogProvider>{children}</AppPostHogProvider>;
  }

  return (
    <ClerkProvider>
      <AppPostHogProvider>{children}</AppPostHogProvider>
    </ClerkProvider>
  );
}
