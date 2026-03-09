import { NextResponse } from "next/server";
import {
  getCourseById,
  getCourseSlugById,
  getSourceById,
} from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

interface CourseRouteProps {
  params: Promise<{
    id: string;
  }>;
}

/** GET /api/courses/:id — 课程详情；?embed=1 时返回精简结构（供 Notion/Obsidian/Widget 嵌入） */
export async function GET(request: Request, { params }: CourseRouteProps) {
  const { id } = await params;
  const url = new URL(request.url);
  const embed = url.searchParams.get("embed") === "1";

  const course = await getCourseById(id);

  if (!course) {
    return NextResponse.json(err("NOT_FOUND", `Course ${id} not found.`), {
      status: 404,
    });
  }

  const slug = await getCourseSlugById(id);

  if (embed) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const source = course.sourceId
      ? await getSourceById(course.sourceId)
      : null;
    return NextResponse.json(
      ok({
        id: course.id,
        slug,
        title: source?.title ?? "Untitled",
        abstract: source?.abstract ?? "",
        link: slug ? `${appUrl}/paper/${slug}` : "",
        difficulty: course.difficulty,
        totalChapters: course.totalChapters,
      }),
    );
  }

  return NextResponse.json(
    ok({
      ...course,
      slug,
    }),
  );
}
