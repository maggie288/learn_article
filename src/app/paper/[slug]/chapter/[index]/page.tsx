import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessChapter, getAuthContext } from "@/lib/auth/session";
import { sanitizeNarration } from "@/lib/utils/narration";
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
  const safeNarration = sanitizeNarration(chapter.narration);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      {unlocked ? (
        <ChapterViewedTracker
          chapterIndex={chapter.orderIndex}
          courseId={course.id}
          difficulty={course.difficulty}
        />
      ) : null}
      <div className="space-y-3">
        <Link
          className="inline-flex items-center text-sm text-sky-400 hover:text-sky-300"
          href={`/paper/${slug}`}
        >
          ← Back to course
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Chapter {chapter.orderIndex + 1}: {chapter.title}
        </h1>
        {chapter.subtitle ? (
          <p className="text-slate-400">{chapter.subtitle}</p>
        ) : null}
      </div>

      {unlocked ? (
        <>
          <article className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
            <div className="prose prose-invert prose-p:leading-relaxed prose-p:text-slate-200 max-w-none">
              {safeNarration
                .split(/\n\n+/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              {!safeNarration && (
                <p className="text-slate-500">No content for this chapter yet.</p>
              )}
            </div>
          </article>

          {chapter.conceptNames.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Concepts</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {chapter.conceptNames.map((concept) => (
                  <span
                    key={concept}
                    className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {authContext.isAuthenticated ? (
            <>
              <ChapterProgressButton
                chapterIndex={chapter.orderIndex}
                courseId={course.id}
              />
              <ChapterQuizSubmit
                courseId={course.id}
                chapterIndex={chapter.orderIndex}
              />
            </>
          ) : null}
        </>
      ) : (
        <section className="mt-8">
          <div className="rounded-3xl border border-sky-500/30 bg-sky-500/10 p-8">
            <h2 className="text-2xl font-semibold">Sign in to continue</h2>
            <p className="mt-3 max-w-2xl text-slate-300">
              按产品规则，前 2 章对未登录用户免费开放；从第 3 章开始需要登录后继续学习。
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
