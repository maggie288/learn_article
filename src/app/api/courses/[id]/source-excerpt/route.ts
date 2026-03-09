import { NextResponse } from "next/server";
import { getCourseById, getSourceById } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

/**
 * GET /api/courses/:id/source-excerpt?section=3.2
 * 第三级：「看原文」—— 返回论文中对应小节的内容（heading + content）。
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: courseId } = await params;
  const course = await getCourseById(courseId);
  if (!course) {
    return NextResponse.json(err("NOT_FOUND", "课程不存在"), { status: 404 });
  }

  const source = await getSourceById(course.sourceId);
  if (!source?.rawContent?.sections?.length) {
    return NextResponse.json(err("NOT_FOUND", "暂无原文小节"), { status: 404 });
  }

  const sectionParam = new URL(request.url).searchParams.get("section");
  const query = (sectionParam ?? "").trim().toLowerCase();

  const sections = source.rawContent.sections;
  const match = query
    ? sections.find(
        (s) =>
          s.heading.toLowerCase().includes(query) ||
          s.heading.replace(/\s/g, "").includes(query.replace(/\s/g, "")),
      )
    : sections[0];

  if (!match) {
    return NextResponse.json(
      ok({
        excerpt: null,
        message: "未找到匹配小节，可省略 section 参数查看首节",
      }),
      { status: 200 },
    );
  }

  return NextResponse.json(
    ok({
      excerpt: {
        heading: match.heading,
        content: match.content,
      },
      sourceUrl: source.url,
    }),
    { status: 200 },
  );
}
