"use client";

import { useEffect } from "react";
import type { QuizQuestionForSubmit } from "./chapter-quiz-submit";
import { ChapterQuizSubmit } from "./chapter-quiz-submit";

interface QuizModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  chapterIndex: number;
  quizQuestions?: QuizQuestionForSubmit[] | null;
}

/** 章节测验弹窗：以 modal 形态展示测验并提交 */
export function QuizModal({
  open,
  onClose,
  courseId,
  chapterIndex,
  quizQuestions,
}: QuizModalProps) {
  useEffect(() => {
    if (open) {
      const onEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", onEscape);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onEscape);
        document.body.style.overflow = "";
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="quiz-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-5 py-3 backdrop-blur-sm">
          <h2 id="quiz-modal-title" className="text-lg font-semibold text-white">
            本章测验
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="关闭"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">
          <ChapterQuizSubmit
            courseId={courseId}
            chapterIndex={chapterIndex}
            quizQuestions={quizQuestions}
          />
        </div>
      </div>
    </div>
  );
}
