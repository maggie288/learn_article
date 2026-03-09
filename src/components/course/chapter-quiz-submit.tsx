"use client";

import { useState } from "react";

export interface QuizQuestionForSubmit {
  question: string;
  options: string[];
  correct: string;
  explanation?: string;
}

interface ChapterQuizSubmitProps {
  courseId: string;
  chapterIndex: number;
  /** 有题目时展示选项并提交所选答案，由 API 判分。 */
  quizQuestions?: QuizQuestionForSubmit[] | null;
}

export function ChapterQuizSubmit({
  courseId,
  chapterIndex,
  quizQuestions,
}: ChapterQuizSubmitProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "submitted">(
    "idle",
  );
  const [score, setScore] = useState<number | null>(null);
  const [achievement, setAchievement] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const hasQuestions = Array.isArray(quizQuestions) && quizQuestions.length > 0;
  const [selectedAnswers, setSelectedAnswers] = useState<(string | number)[]>(
    () => (hasQuestions ? quizQuestions!.map(() => "") : []),
  );

  async function submitQuiz() {
    setStatus("submitting");
    setError(null);

    const answers = hasQuestions
      ? selectedAnswers.map((a, i) => {
          if (typeof a === "number") return quizQuestions![i]!.options[a] ?? "";
          return String(a);
        })
      : [];
    const body = hasQuestions ? { answers } : { answers: [] };

    const response = await fetch(
      `/api/courses/${courseId}/chapters/${chapterIndex}/quiz`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const allSelected =
    !hasQuestions || selectedAnswers.every((a) => a !== "" && a !== undefined);

  return (
    <div className="mt-6 space-y-4">
      {hasQuestions ? (
        <ul className="space-y-4">
          {quizQuestions!.map((q, i) => (
            <li key={i} className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-sm font-medium text-slate-200">
                {i + 1}. {q.question}
              </p>
              <ul className="mt-2 space-y-1.5">
                {q.options.map((opt, j) => (
                  <li key={j}>
                    <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name={`quiz-${i}`}
                        checked={selectedAnswers[i] === opt || selectedAnswers[i] === j}
                        onChange={() => {
                          const next = [...selectedAnswers];
                          next[i] = opt;
                          setSelectedAnswers(next);
                        }}
                        className="mt-1 shrink-0"
                      />
                      <span>{opt}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <button
          className="rounded-full border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
          disabled={
            status === "submitting" ||
            status === "submitted" ||
            (hasQuestions && !allSelected)
          }
          onClick={submitQuiz}
          type="button"
        >
          {status === "submitting"
            ? "Submitting..."
            : status === "submitted"
              ? "Quiz submitted"
              : "Submit quiz"}
        </button>
        {status === "submitted" && score !== null ? (
          <p className="text-sm text-slate-400">
            Score: {Math.round(score * 100)}%
            {achievement ? " · Course completed! Achievement unlocked." : ""}
          </p>
        ) : null}
        {status === "submitted" && !hasQuestions ? (
          <p className="text-sm text-slate-400">
            {achievement ? "Course completed! Achievement unlocked." : "Done."}
          </p>
        ) : null}
      </div>
      {error ? (
        <div className="text-sm text-rose-300">{error}</div>
      ) : null}
    </div>
  );
}
