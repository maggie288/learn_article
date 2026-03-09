"use client";

import { useState } from "react";

interface ChapterQuizSubmitProps {
  courseId: string;
  chapterIndex: number;
}

export function ChapterQuizSubmit({
  courseId,
  chapterIndex,
}: ChapterQuizSubmitProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">(
    "idle",
  );
  const [score, setScore] = useState<number | null>(null);
  const [achievement, setAchievement] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function submitQuiz() {
    setStatus("submitting");
    setError(null);

    const response = await fetch(
      `/api/courses/${courseId}/chapters/${chapterIndex}/quiz`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: [] }),
      },
    );

    const result = (await response.json()) as {
      success: boolean;
      data?: { item?: { quizScore?: number }; achievement?: unknown };
      error?: { message: string };
    };

    if (!response.ok || !result.success) {
      setStatus("idle");
      setError(result.error?.message ?? "Failed to submit quiz.");
      return;
    }

    setScore(result.data?.item?.quizScore ?? null);
    setAchievement(Boolean(result.data?.achievement));
    setStatus("submitted");
  }

  return (
    <div className="mt-6 space-y-2">
      <button
        className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
        disabled={status === "submitting" || status === "submitted"}
        onClick={submitQuiz}
        type="button"
      >
        {status === "submitting"
          ? "Submitting..."
          : status === "submitted"
            ? "Quiz submitted"
            : "Submit quiz"}
      </button>
      {status === "submitted" ? (
        <p className="text-sm text-slate-400">
          {achievement ? "Course completed! Achievement unlocked." : "Done."}
        </p>
      ) : null}
      {error ? <div className="text-sm text-rose-300">{error}</div> : null}
    </div>
  );
}
