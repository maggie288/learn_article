import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { getCourseById, insertCourseShare } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const bodySchema = z.object({
  platform: z.string().min(1).max(32),
});

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/courses/:id/share
 * 护城河：记录课程分享（course_share）。
 */
export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const { id: courseId } = await params;
  const course = await getCourseById(courseId);
  if (!course) {
    return NextResponse.json(err("NOT_FOUND", "课程不存在"), { status: 404 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(err("VALIDATION_ERROR", "请提供 platform"), { status: 400 });
  }

  await insertCourseShare({
    userId: auth.userId,
    courseId,
    platform: parsed.data.platform,
  });

  return NextResponse.json(ok({ recorded: true }), { status: 200 });
}
