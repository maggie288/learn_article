import Link from "next/link";
import { BadgeShareBar } from "@/components/share/badge-share-bar";

interface CompletionCelebrationProps {
  courseId: string;
  courseTitle: string;
  slug: string;
  shareUrl: string;
  difficulty?: string;
}

/** 全课程学完庆祝区块：学完徽章 + 一键分享 */
export function CompletionCelebration({
  courseId,
  courseTitle,
  slug,
  shareUrl,
  difficulty,
}: CompletionCelebrationProps) {

  return (
    <section
      className="mt-10 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-8"
      aria-label="课程学完"
    >
      <div className="flex flex-col items-center text-center">
        <span className="text-4xl" aria-hidden>
          🎓
        </span>
        <h2 className="mt-4 text-xl font-semibold text-white">
          恭喜学完本课程
        </h2>
        <p className="mt-2 text-slate-400">
          {courseTitle}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <BadgeShareBar
            courseId={courseId}
            courseTitle={courseTitle}
            shareUrl={shareUrl}
          />
        </div>
        <Link
          href={`/paper/${slug}${difficulty ? `?difficulty=${difficulty}` : ""}`}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800/80 px-5 py-2.5 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-700"
        >
          返回课程概览
        </Link>
      </div>
    </section>
  );
}
