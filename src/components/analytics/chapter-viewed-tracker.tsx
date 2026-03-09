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

  useEffect(() => {
    fetch(`/api/courses/${courseId}/chapters/${chapterIndex}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration_seconds: 0 }),
    }).catch(() => {});
  }, [courseId, chapterIndex]);

  return null;
}
