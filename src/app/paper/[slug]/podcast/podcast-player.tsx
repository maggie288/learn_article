"use client";

import { useRef, useState } from "react";
import posthog from "posthog-js";

interface ChapterItem {
  index: number;
  title: string;
  audioUrl?: string | null;
  narration?: string | null;
}

interface PodcastPlayerProps {
  podcastUrl: string;
  courseTitle: string;
  courseId: string;
  chapters: ChapterItem[];
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export function PodcastPlayer({
  podcastUrl,
  courseTitle,
  courseId,
  chapters,
}: PodcastPlayerProps) {
  const playedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const handlePlay = () => {
    if (playedRef.current) return;
    playedRef.current = true;
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture("podcast_played", { courseId });
    }
  };

  const handleSpeedChange = (rate: number) => {
    setSpeed(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  };

  const isRssFeed = podcastUrl.includes("/rss");
  const firstChapterAudio = chapters.find((ch) => ch.audioUrl)?.audioUrl;

  return (
    <section className="mb-8 space-y-6" aria-label="Podcast player">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-400">
          {isRssFeed ? "订阅与收听" : "Full course audio"}
        </h2>
        {isRssFeed ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">
              使用 RSS 链接在 Apple Podcasts、小宇宙等应用中订阅并连播。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={podcastUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-400 ring-1 ring-sky-500/40 hover:bg-sky-500/30"
              >
                打开 RSS 订阅
              </a>
              {firstChapterAudio && (
                <a
                  href={firstChapterAudio}
                  download
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  下载首章音频
                </a>
              )}
            </div>
          </div>
        ) : (
          <>
            <audio
              ref={audioRef}
              src={podcastUrl}
              controls
              className="h-12 w-full"
              preload="metadata"
              aria-label={`Play podcast: ${courseTitle}`}
              onPlay={handlePlay}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-500">倍速：</span>
              {SPEEDS.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  className={`rounded px-2 py-1 text-xs font-medium transition ${
                    speed === rate
                      ? "bg-sky-500/20 text-sky-400"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {rate}x
                </button>
              ))}
              <a
                href={podcastUrl}
                download
                className="ml-2 text-xs text-cyan-400 hover:text-cyan-300"
              >
                下载
              </a>
            </div>
          </>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {chapters.length} 章 · 下方可展开文稿。
        </p>
      </div>

      {/* Transcript */}
      {chapters.some((ch) => ch.narration) ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
          <button
            type="button"
            onClick={() => setTranscriptOpen((o) => !o)}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-400 hover:text-slate-300"
          >
            文稿 (Transcript)
            <span className="text-slate-500">{transcriptOpen ? "▼" : "▶"}</span>
          </button>
          {transcriptOpen && (
            <div className="mt-4 space-y-6 border-t border-white/5 pt-4">
              {chapters.map((ch) => (
                <div key={ch.index}>
                  <h3 className="text-sm font-medium text-cyan-100">
                    {ch.index + 1}. {ch.title}
                  </h3>
                  {ch.narration ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-400">
                      {ch.narration}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">暂无文稿</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
