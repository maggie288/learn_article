import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import {
  getChapterIdByCourseAndIndex,
  getCourseById,
  insertContentInteraction,
} from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const bodySchema = z.object({
  elementType: z.enum(["analogy", "formula", "code", "svg", "audio"]),
  action: z.enum(["viewed", "expanded", "collapsed", "replayed", "skipped"]),
});

interface Params { params: Promise<{ id: string; index: string }> }

/**
 * POST /api/courses/:id/chapters/:index/interact
 * 护城河：记录内容交互（content_interaction）。
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

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(err("VALIDATION_ERROR", "请提供 elementType, action"), { status: 400 });
  }

  await insertContentInteraction({
    userId: auth.userId,
    chapterId,
    elementType: parsed.data.elementType,
    action: parsed.data.action,
  });

  return NextResponse.json(ok({ recorded: true }), { status: 200 });
}
