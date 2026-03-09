"use client";

import { useEffect, useRef } from "react";
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";

export function AppPostHogProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initializedRef = useRef(false);
  const enabled = Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST,
  );

  useEffect(() => {
    if (!enabled || initializedRef.current) {
      return;
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
    initializedRef.current = true;
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
