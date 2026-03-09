"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DifficultyLevel } from "@/lib/engine/types";

const DIFFICULTIES: { value: DifficultyLevel; label: string }[] = [
  { value: "explorer", label: "Explorer" },
  { value: "builder", label: "Builder" },
  { value: "researcher", label: "Researcher" },
];

interface DifficultySwitcherProps {
  slug: string;
  courseId: string;
  currentDifficulty: DifficultyLevel;
  /** 当前论文已发布的难度列表（用于灰显未生成的）. */
  availableDifficulties?: DifficultyLevel[];
  /** 章节页时传入，用于保持在同一章. */
  chapterIndex?: number;
  className?: string;
}

/** 同一论文三种难度切换（Explorer / Builder / Researcher）. */
export function DifficultySwitcher({
  slug,
  courseId,
  currentDifficulty,
  availableDifficulties = ["explorer", "builder", "researcher"],
  chapterIndex,
  className = "",
}: DifficultySwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const basePath = `/paper/${slug}`;
  const chapterPath = chapterIndex != null ? `${basePath}/chapter/${chapterIndex}` : basePath;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs text-slate-500">难度</span>
      {DIFFICULTIES.map((d) => {
        const available = availableDifficulties.includes(d.value);
        const isActive = currentDifficulty === d.value;
        const href = `${chapterPath}?difficulty=${d.value}`;
        if (!available) {
          return (
            <span
              key={d.value}
              className="cursor-not-allowed rounded-full px-3 py-1.5 text-xs font-medium text-slate-600"
              title="该难度课程尚未生成"
            >
              {d.label}
            </span>
          );
        }
        const handleClick = (e: React.MouseEvent) => {
          if (isActive) return;
          e.preventDefault();
          fetch(`/api/courses/${courseId}/difficulty-switch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromLevel: currentDifficulty, toLevel: d.value }),
          }).catch(() => {});
          router.push(href);
        };

        return (
          <Link
            key={d.value}
            href={href}
            onClick={handleClick}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? "bg-cyan-500/20 text-cyan-300"
                : "border border-white/10 text-slate-400 hover:border-cyan-500/30 hover:text-slate-300"
            }`}
            aria-current={isActive ? "true" : undefined}
          >
            {d.label}
          </Link>
        );
      })}
    </div>
  );
}
