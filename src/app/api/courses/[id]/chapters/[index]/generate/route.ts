import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { getCourseById } from "@/lib/db/repositories";
import { generateChapterOnDemand } from "@/lib/engine/generate-chapter-on-demand";
import { checkRateLimit } from "@/lib/rate-limit";
import { err, ok } from "@/lib/types/api";

/** 按需生成单章含 LLM + 可能 TTS，需要较长超时（Vercel Pro 建议 ≤300） */
export const maxDuration = 120;

interface RouteParams {
  params: Promise<{ id: string; index: string }>;
}

/**
 * POST /api/courses/:id/chapters/:index/generate
 * 第二级：按需生成本章内容（仅 skeleton 课程可用）。限流 30 次/10 分钟/用户。
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    `chapter-generate:${auth.userId}`,
    30,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      err("RATE_LIMITED", "按需生成请求过于频繁，请稍后再试", rateLimit),
      { status: 429 },
    );
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
  if (course.status !== "skeleton") {
    return NextResponse.json(
      err("INVALID_STATE", "仅骨架课程支持按需生成本章"),
      { status: 400 },
    );
  }
  if (chapterIndex >= (course.totalChapters ?? course.chapters.length)) {
    return NextResponse.json(err("NOT_FOUND", "章节不存在"), { status: 404 });
  }

  try {
    const chapter = await generateChapterOnDemand(courseId, chapterIndex);
    if (!chapter) {
      return NextResponse.json(
        err("SERVER_ERROR", "生成本章失败，请稍后重试"),
        { status: 500 },
      );
    }
    return NextResponse.json(ok({ chapter }), { status: 200 });
  } catch (e) {
    console.error("[chapters/generate]", e);
    return NextResponse.json(
      err("SERVER_ERROR", "生成本章时发生错误"),
      { status: 500 },
    );
  }
}
