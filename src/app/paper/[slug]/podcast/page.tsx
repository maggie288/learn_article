import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseBySlug } from "@/lib/db/repositories";
import { PodcastPlayer } from "./podcast-player";

interface PodcastPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PodcastPage({ params }: PodcastPageProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const hasFullPodcast = Boolean(course.podcastUrl);

  return (
    <main className="min-h-screen font-reading">
      <div className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-reading items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link
            className="text-sm text-cyan-400 hover:text-cyan-300"
            href={`/paper/${slug}`}
          >
            ← Back to course
          </Link>
          <span className="font-mono text-xs text-slate-500">Podcast</span>
        </div>
      </div>

      <div className="mx-auto max-w-reading px-5 py-8 sm:px-6 sm:py-10">
        <header className="mb-8">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            {course.sourceTitle ?? slug}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {course.sourceAbstract ?? "Listen to the full course as a podcast."}
          </p>
        </header>

        {hasFullPodcast ? (
          <PodcastPlayer
            courseId={course.id}
            podcastUrl={course.podcastUrl!}
            courseTitle={course.sourceTitle ?? slug}
            chapters={course.chapters.map((ch) => ({
              index: ch.orderIndex,
              title: ch.title,
              audioUrl: ch.audioUrl ?? undefined,
            }))}
          />
        ) : (
          <div className="mb-8 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
            播客音频生成中，TTS 接入后将提供完整连播。当前可按章节收听（若该章节已生成音频）。
          </div>
        )}

        <section aria-label="Chapters">
          <h2 className="mb-4 text-sm font-semibold text-slate-400">Chapters</h2>
          <ul className="space-y-2">
            {course.chapters.map((ch) => (
              <li key={ch.orderIndex}>
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                  <span className="font-mono text-xs text-cyan-400">
                    {ch.orderIndex + 1}
                  </span>
                  <span className="flex-1 font-medium text-slate-200">
                    {ch.title}
                  </span>
                  <div className="flex items-center gap-2">
                    {ch.audioUrl ? (
                      <audio
                        src={ch.audioUrl}
                        controls
                        className="h-8 max-w-[200px]"
                        preload="metadata"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">No audio</span>
                    )}
                    <Link
                      href={`/paper/${slug}/chapter/${ch.orderIndex}`}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      Read
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
