"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface ChapterViewedTrackerProps {
  courseId: string;
  chapterIndex: number;
  difficulty: string;
}

export function ChapterViewedTracker({
  courseId,
  chapterIndex,
  difficulty,
}: ChapterViewedTrackerProps) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !process.env.NEXT_PUBLIC_POSTHOG_HOST) {
      return;
    }

    posthog.capture("chapter_viewed", {
      courseId,
      chapterIndex,
      difficulty,
    });
  }, [chapterIndex, courseId, difficulty]);

  return null;
}
