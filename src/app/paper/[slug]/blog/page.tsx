import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogViewedTracker } from "@/components/analytics/blog-viewed-tracker";
import { getCourseBySlug } from "@/lib/db/repositories";
import { renderBlogFromChapters } from "@/lib/engine/rendering/blog";

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const html =
    course.blogHtml ??
    renderBlogFromChapters(course.chapters, {
      courseTitle: course.sourceTitle ?? undefined,
      language: course.language,
    });

  return (
    <main className="min-h-screen font-reading">
      <BlogViewedTracker courseId={course.id} />
      <div className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-reading items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link
            className="text-sm text-cyan-400 hover:text-cyan-300"
            href={`/paper/${slug}`}
          >
            ← Back to course
          </Link>
          <span className="font-mono text-xs text-slate-500">Blog view</span>
        </div>
      </div>
      <div
        className="blog-embed mx-auto max-w-reading px-5 py-8 sm:px-6 sm:py-10 [&_.blog-article]:text-slate-300 [&_.blog-article_h1]:text-xl [&_.blog-article_h1]:font-bold [&_.blog-article_h1]:text-white [&_.blog-article_h2]:mt-8 [&_.blog-article_h2]:text-lg [&_.blog-article_h2]:font-semibold [&_.blog-article_h2]:text-cyan-100 [&_.blog-article_section]:mb-8 [&_.blog-article_p]:whitespace-pre-wrap [&_.blog-article_p]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
