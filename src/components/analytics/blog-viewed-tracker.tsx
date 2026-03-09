"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface BlogViewedTrackerProps {
  courseId: string;
}

/** 博客页浏览埋点：blog_viewed */
export function BlogViewedTracker({ courseId }: BlogViewedTrackerProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture("blog_viewed", { courseId });
    }
  }, [courseId]);
  return null;
}
