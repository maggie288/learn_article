import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessChapter, getAuthContext } from "@/lib/auth/session";
import { splitNarrationIntoParagraphs } from "@/lib/utils/narration";
import { ChapterViewedTracker } from "@/components/analytics/chapter-viewed-tracker";
import { ChapterProgressButton } from "@/components/course/chapter-progress-button";
import { ChapterQuizSubmit } from "@/components/course/chapter-quiz-submit";
import { getCourseBySlug } from "@/lib/db/repositories";

interface ChapterPageProps {
  params: Promise<{
    slug: string;
    index: string;
  }>;
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { slug, index } = await params;
  const chapterIndex = Number(index);
  const course = await getCourseBySlug(slug);
  const authContext = await getAuthContext();

  if (!course || Number.isNaN(chapterIndex)) {
    notFound();
  }

  const chapter = course.chapters[chapterIndex];

  if (!chapter) {
    notFound();
  }

  const unlocked = canAccessChapter(chapterIndex, authContext.isAuthenticated);
  const paragraphs = splitNarrationIntoParagraphs(chapter.narration);
  const totalChapters = course.chapters.length;
  const prevIndex = chapterIndex > 0 ? chapterIndex - 1 : null;
  const nextIndex = chapterIndex < totalChapters - 1 ? chapterIndex + 1 : null;
  const progressPercent = totalChapters > 0 ? ((chapterIndex + 1) / totalChapters) * 100 : 0;

  return (
    <main className="min-h-screen font-reading">
      {unlocked ? (
        <ChapterViewedTracker
          chapterIndex={chapter.orderIndex}
          courseId={course.id}
          difficulty={course.difficulty}
        />
      ) : null}

      {/* Sticky top bar + progress (podcast-explainer style) */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-reading items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link
            className="text-sm text-cyan-400 hover:text-cyan-300"
            href={`/paper/${slug}`}
          >
            ← Back to course
          </Link>
          <span className="font-mono text-xs text-slate-500">
            {chapterIndex + 1} / {totalChapters}
          </span>
        </div>
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-reading px-5 pb-24 pt-8 sm:px-6 sm:pt-10">
        <header className="mb-8">
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            Chapter {chapter.orderIndex + 1}: {chapter.title}
          </h1>
          {chapter.subtitle ? (
            <p className="mt-1.5 text-sm italic text-slate-500">{chapter.subtitle}</p>
          ) : null}
        </header>

        {unlocked ? (
          <>
            {/* Narration blocks (engine-architecture style: each block with accent) */}
            <article className="space-y-4">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.06] px-5 py-4 sm:px-6 sm:py-4"
                  >
                    <div className="flex gap-3">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80"
                        aria-hidden
                      />
                      <p className="text-[15px] leading-[1.85] text-slate-300 whitespace-pre-wrap">
                        {paragraph}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-5 py-6 text-slate-500">
                  No content for this chapter yet.
                </div>
              )}
            </article>

            {/* Concepts */}
            {chapter.conceptNames.length > 0 ? (
              <section className="mt-8">
                <h2 className="mb-3 text-sm font-semibold text-slate-400">Concepts</h2>
                <div className="flex flex-wrap gap-2">
                  {chapter.conceptNames.map((concept) => (
                    <span
                      key={concept}
                      className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {authContext.isAuthenticated ? (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ChapterProgressButton
                  chapterIndex={chapter.orderIndex}
                  courseId={course.id}
                />
                <ChapterQuizSubmit
                  courseId={course.id}
                  chapterIndex={chapter.orderIndex}
                />
              </div>
            ) : null}
          </>
        ) : (
          <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-8">
            <h2 className="text-xl font-semibold text-white">Sign in to continue</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              按产品规则，前 2 章对未登录用户免费开放；从第 3 章开始需要登录后继续学习。
            </p>
          </section>
        )}

        {/* Bottom nav: prev/next (podcast-explainer style) */}
        <nav
          className="mt-12 flex items-center justify-between border-t border-white/5 pt-6"
          aria-label="Chapter navigation"
        >
          <div className="min-w-0 flex-1">
            {prevIndex !== null ? (
              <Link
                href={`/paper/${slug}/chapter/${prevIndex}`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300"
              >
                ← 上一章
              </Link>
            ) : (
              <span />
            )}
          </div>
          <span className="font-mono text-xs text-slate-600">
            {chapterIndex + 1} / {totalChapters}
          </span>
          <div className="flex min-w-0 flex-1 justify-end">
            {nextIndex !== null ? (
              <Link
                href={`/paper/${slug}/chapter/${nextIndex}`}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-400 transition hover:bg-cyan-500/20"
              >
                下一章 →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </nav>
      </div>
    </main>
  );
}
