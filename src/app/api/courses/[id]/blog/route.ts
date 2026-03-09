import { NextResponse } from "next/server";
import { getCourseById, getSourceById } from "@/lib/db/repositories";
import { renderBlogFromChapters } from "@/lib/engine/rendering/blog";

interface BlogRouteProps {
  params: Promise<{ id: string }>;
}

/** GET /api/courses/:id/blog — 返回课程博客长文（完整 HTML 文档）。 */
export async function GET(_request: Request, { params }: BlogRouteProps) {
  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const source = course.sourceId ? await getSourceById(course.sourceId) : null;
  const html =
    course.blogHtml ??
    renderBlogFromChapters(course.chapters, {
      courseTitle: source?.title ?? undefined,
      language: course.language,
      fragment: false,
    });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
