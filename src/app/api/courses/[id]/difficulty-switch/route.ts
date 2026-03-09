import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { getCourseById, insertDifficultySwitch } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const bodySchema = z.object({
  fromLevel: z.string().min(1).max(32),
  toLevel: z.string().min(1).max(32),
});

interface Params { params: Promise<{ id: string }> }

/**
 * POST /api/courses/:id/difficulty-switch
 * 护城河：记录难度切换（difficulty_switch）。
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
    return NextResponse.json(err("VALIDATION_ERROR", "请提供 fromLevel, toLevel"), { status: 400 });
  }

  await insertDifficultySwitch({
    userId: auth.userId,
    courseId,
    fromLevel: parsed.data.fromLevel,
    toLevel: parsed.data.toLevel,
  });

  return NextResponse.json(ok({ recorded: true }), { status: 200 });
}
