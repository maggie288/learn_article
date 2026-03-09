"use client";

import { useState } from "react";

interface ChapterProgressButtonProps {
  courseId: string;
  chapterIndex: number;
}

export function ChapterProgressButton({
  courseId,
  chapterIndex,
}: ChapterProgressButtonProps) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function markCompleted() {
    setStatus("saving");
    setError(null);

    const response = await fetch(`/api/courses/${courseId}/progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chapterIndex,
        status: "completed",
      }),
    });

    const result = (await response.json()) as {
      success: boolean;
      error?: { message: string };
    };

    if (!response.ok || !result.success) {
      setStatus("idle");
      setError(result.error?.message ?? "Failed to save progress.");
      return;
    }

    setStatus("saved");
  }

  return (
    <div className="mt-8 space-y-2">
      <button
        className="rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
        disabled={status === "saving" || status === "saved"}
        onClick={markCompleted}
        type="button"
      >
        {status === "saving"
          ? "Saving..."
          : status === "saved"
            ? "Completed"
            : "Mark chapter complete"}
      </button>
      {error ? <div className="text-sm text-rose-300">{error}</div> : null}
    </div>
  );
}
