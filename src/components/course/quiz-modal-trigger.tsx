"use client";

import { useState } from "react";
import type { QuizQuestionForSubmit } from "./chapter-quiz-submit";
import { QuizModal } from "./quiz-modal";

interface QuizModalTriggerProps {
  courseId: string;
  chapterIndex: number;
  quizQuestions?: QuizQuestionForSubmit[] | null;
  /** 有测验题目时显示「本章测验」按钮；无题目时显示「标记完成」类按钮打开空测验弹窗 */
  hasQuestions: boolean;
}

/** 章节页：触发本章测验弹窗的按钮 + QuizModal */
export function QuizModalTrigger({
  courseId,
  chapterIndex,
  quizQuestions,
  hasQuestions,
}: QuizModalTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/20"
      >
        {hasQuestions ? "本章测验" : "标记完成"}
      </button>
      <QuizModal
        open={open}
        onClose={() => setOpen(false)}
        courseId={courseId}
        chapterIndex={chapterIndex}
        quizQuestions={quizQuestions}
      />
    </>
  );
}
