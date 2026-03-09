import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import {
  getChapterIdByCourseAndIndex,
  getCourseById,
  insertChapterView,
} from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

interface Params { params: Promise<{ id: string; index: string }> }

/**
 * POST /api/courses/:id/chapters/:index/view
 * 护城河：记录章节浏览（chapter_view），可选 duration_seconds。
 */
export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const { id: courseId, index: indexStr } = await params;
  const chapterIndex = parseInt(indexStr, 10);
  if (Number.isNaN(chapterIndex) || chapterIndex < 0) {
    return NextResponse.json(err("VALIDATION_ERROR", "无效的章节索引"), { status: 400 });
  }

  const course = await getCourseById(courseId);
  if (!course) {
    return NextResponse.json(err("NOT_FOUND", "课程不存在"), { status: 404 });
  }

  const chapterId = await getChapterIdByCourseAndIndex(courseId, chapterIndex);
  if (!chapterId) {
    return NextResponse.json(err("NOT_FOUND", "章节不存在"), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const durationSeconds =
    typeof body === "object" && body !== null && typeof (body as { duration_seconds?: number }).duration_seconds === "number"
      ? (body as { duration_seconds: number }).duration_seconds
      : undefined;

  await insertChapterView({
    userId: auth.userId,
    chapterId,
    durationSeconds,
  });

  return NextResponse.json(ok({ recorded: true }), { status: 200 });
}
