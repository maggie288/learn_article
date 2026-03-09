"use client";

import { useRef } from "react";
import posthog from "posthog-js";

interface ChapterItem {
  index: number;
  title: string;
  audioUrl?: string | null;
}

interface PodcastPlayerProps {
  podcastUrl: string;
  courseTitle: string;
  courseId: string;
  chapters: ChapterItem[];
}

export function PodcastPlayer({
  podcastUrl,
  courseTitle,
  courseId,
  chapters,
}: PodcastPlayerProps) {
  const playedRef = useRef(false);

  const handlePlay = () => {
    if (playedRef.current) return;
    playedRef.current = true;
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture("podcast_played", { courseId });
    }
  };

  return (
    <section className="mb-8" aria-label="Full podcast">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-400">
          Full course audio
        </h2>
        <audio
          src={podcastUrl}
          controls
          className="h-12 w-full"
          preload="metadata"
          aria-label={`Play podcast: ${courseTitle}`}
          onPlay={handlePlay}
        />
        <p className="mt-2 text-xs text-slate-500">
          {chapters.length} chapters · Use the player above to listen in order.
        </p>
      </div>
    </section>
  );
}
