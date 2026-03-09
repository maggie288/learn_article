import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { sanitizeNarration } from "@/lib/utils/narration";
import { FavoriteToggleButton } from "@/components/course/favorite-toggle-button";
import { ShareBar } from "@/components/share/share-bar";
import { getCourseBySlug, isFavoriteCourse } from "@/lib/db/repositories";

interface PaperPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PaperPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    return {
      title: "Course not found | PaperFlow",
    };
  }

  return {
    title: `${course.sourceTitle} | PaperFlow`,
    description:
      course.sourceAbstract || `Structured course for ${course.sourceTitle} on PaperFlow.`,
    alternates: {
      canonical: `/paper/${slug}`,
    },
    openGraph: {
      title: `${course.sourceTitle} | PaperFlow`,
      description:
        course.sourceAbstract || `Structured course for ${course.sourceTitle} on PaperFlow.`,
      url: `/paper/${slug}`,
      type: "article",
    },
  };
}

export default async function PaperPage({ params }: PaperPageProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  const authContext = await getAuthContext();

  if (!course) {
    notFound();
  }

  const favorited =
    authContext.isAuthenticated && authContext.userId
      ? await isFavoriteCourse(authContext.userId, course.id)
      : false;

  const totalChapters = course.totalChapters ?? course.chapters.length;

  return (
    <main className="min-h-screen font-reading">
      {/* Header: engine-architecture style */}
      <div
        className="border-b border-white/5 bg-gradient-to-b from-cyan-500/[0.08] to-transparent px-5 py-5 sm:px-6"
        style={{ paddingBottom: "18px" }}
      >
        <div className="mx-auto max-w-reading">
          <span className="mb-3 inline-block rounded border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-cyan-400">
            Course · {course.difficulty}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {course.sourceTitle || slug}
          </h1>
          <p className="mt-1.5 text-sm italic text-slate-500">
            {course.sourceAbstract || "Abstract pending."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>{totalChapters} chapters</span>
            <span className="text-white/30">·</span>
            <span>Status: {course.status}</span>
            <a
              href={course.sourceUrl}
              rel="noreferrer"
              target="_blank"
              className="text-cyan-400 hover:text-cyan-300"
            >
              View source
            </a>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ShareBar
              courseId={course.id}
              shareUrl={`/paper/${slug}`}
              title={course.sourceTitle ?? undefined}
            />
            {authContext.isAuthenticated ? (
              <FavoriteToggleButton courseId={course.id} initialFavorited={favorited} />
            ) : null}
          </div>
        </div>
      </div>

      {/* Chapters: block cards with accent left border */}
      <div className="mx-auto max-w-reading px-5 py-8 sm:px-6 sm:py-10">
        <h2 className="mb-5 text-lg font-semibold text-white">Chapters</h2>
        <div className="flex flex-col gap-3">
          {course.chapters.map((chapter) => (
            <Link
              key={`${course.id}-${chapter.orderIndex}`}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] py-4 pl-5 pr-5 transition hover:border-cyan-500/20 hover:bg-cyan-500/[0.04] sm:py-5 sm:pl-6"
              style={{ borderLeftWidth: "3px", borderLeftColor: "rgba(6, 182, 212, 0.35)" }}
              href={`/paper/${slug}/chapter/${chapter.orderIndex}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-cyan-400">
                    Chapter {chapter.orderIndex + 1} / {totalChapters}
                  </span>
                  <h3 className="mt-1.5 text-lg font-semibold text-white group-hover:text-cyan-100 sm:text-xl">
                    {chapter.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">
                    {sanitizeNarration(chapter.narration) || "—"}
                  </p>
                </div>
                {!authContext.isAuthenticated && chapter.orderIndex >= 2 ? (
                  <span className="shrink-0 rounded-full border border-slate-600 px-2.5 py-1 text-xs text-slate-400">
                    Login required
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
