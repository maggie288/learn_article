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

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-16">
      <div className="space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight">
          {course.sourceTitle || slug}
        </h1>
        <p className="text-slate-300">{course.sourceAbstract || "Abstract pending."}</p>
        <div className="flex flex-wrap gap-3 text-sm text-slate-400">
          <span>Difficulty: {course.difficulty}</span>
          <span>Status: {course.status}</span>
          <span>Chapters: {course.totalChapters ?? course.chapters.length}</span>
          <a href={course.sourceUrl} rel="noreferrer" target="_blank">
            View source
          </a>
        </div>
        <ShareBar
          courseId={course.id}
          shareUrl={`/paper/${slug}`}
          title={course.sourceTitle ?? undefined}
        />
        {authContext.isAuthenticated ? (
          <FavoriteToggleButton courseId={course.id} initialFavorited={favorited} />
        ) : null}
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-2xl font-semibold">Chapters</h2>
        <div className="grid gap-4">
          {course.chapters.map((chapter) => (
            <Link
              key={`${course.id}-${chapter.orderIndex}`}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-400/40"
              href={`/paper/${slug}/chapter/${chapter.orderIndex}`}
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-sky-300">Chapter {chapter.orderIndex + 1}</span>
                {!authContext.isAuthenticated && chapter.orderIndex >= 2 ? (
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">
                    Login required
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-xl font-medium">{chapter.title}</div>
              <p className="mt-3 line-clamp-3 text-sm text-slate-300">
                {sanitizeNarration(chapter.narration) || "—"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
