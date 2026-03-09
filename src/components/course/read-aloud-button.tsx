"use client";

import { useCallback, useEffect, useState } from "react";

interface ReadAloudButtonProps {
  /** Full text to speak (e.g. chapter narration or a paragraph). */
  text: string;
  /** Button label when idle. */
  labelIdle?: string;
  /** Button label when speaking. */
  labelSpeaking?: string;
  /** Optional lang for speech (e.g. zh-CN). */
  lang?: string;
  className?: string;
}

export function ReadAloudButton({
  text,
  labelIdle = "朗读",
  labelSpeaking = "停止",
  lang = "zh-CN",
  className,
}: ReadAloudButtonProps) {
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    if (!text.trim()) return;
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    if (speaking) {
      stop();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = lang;
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }, [text, lang, speaking, stop]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  if (!text.trim()) return null;

  return (
    <button
      type="button"
      onClick={speak}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/20"
      }
      aria-pressed={speaking}
      aria-label={speaking ? labelSpeaking : labelIdle}
    >
      {speaking ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" aria-hidden />
          {labelSpeaking}
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
          {labelIdle}
        </>
      )}
    </button>
  );
}
