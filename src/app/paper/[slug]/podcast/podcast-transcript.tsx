"use client";

import { useState } from "react";

interface ChapterForTranscript {
  index: number;
  title: string;
  narration?: string | null;
}

export function PodcastTranscript({
  chapters,
}: {
  chapters: ChapterForTranscript[];
}) {
  const [open, setOpen] = useState(false);
  const hasAny = chapters.some((ch) => ch.narration);

  if (!hasAny) return null;

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left text-sm font-semibold text-slate-400 hover:text-slate-300"
      >
        文稿 (Transcript)
        <span className="text-slate-500">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
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
    </section>
  );
}
