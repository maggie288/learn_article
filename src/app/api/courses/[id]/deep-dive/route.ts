import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import {
  buildExtractionFromSource,
  getCourseById,
  getSourceById,
} from "@/lib/db/repositories";
import { unifiedChat } from "@/lib/llm/unified-llm";
import { checkRateLimit } from "@/lib/rate-limit";
import { err, ok } from "@/lib/types/api";

/** 单次 LLM 深度解读，可能较慢 */
export const maxDuration = 60;

const bodySchema = z.object({
  concept: z.string().min(1).max(200),
});

/**
 * POST /api/courses/:id/deep-dive
 * 第三级：深度内容。「深入这个概念」→ 调 Sonnet 生成专家级解释。限流 20 次/小时/用户。
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "请先登录"), { status: 401 });
  }

  const rateLimit = await checkRateLimit(`deep-dive:${auth.userId}`, 20);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      err("RATE_LIMITED", "深度解读请求过于频繁，请稍后再试", rateLimit),
      { status: 429 },
    );
  }

  const { id: courseId } = await params;
  const course = await getCourseById(courseId);
  if (!course) {
    return NextResponse.json(err("NOT_FOUND", "课程不存在"), { status: 404 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(err("VALIDATION_ERROR", "请提供 concept 字符串"), { status: 400 });
  }

  const source = await getSourceById(course.sourceId);
  if (!source) {
    return NextResponse.json(err("NOT_FOUND", "课程来源不存在"), { status: 404 });
  }
  const extraction = buildExtractionFromSource(source);
  if (!extraction) {
    return NextResponse.json(err("SERVER_ERROR", "无法加载课程提取结果"), { status: 500 });
  }

  const conceptNode = extraction.conceptGraph.concepts.find(
    (c) => c.name.toLowerCase() === parsed.data.concept.toLowerCase(),
  );
  const context = conceptNode
    ? `概念定义：${conceptNode.definition}\n领域：${conceptNode.domain}\n前置：${(conceptNode.prerequisites ?? []).join("、")}`
    : `概念名：${parsed.data.concept}（来自课程《${course.chapters[0]?.title ?? "未命名"}》相关上下文）`;

  const result = await unifiedChat({
    system: `你是该领域的专家。用 200–400 字给出「${parsed.data.concept}」的深度解读：定义、直觉、与前后概念的关系、常见误区。直接输出正文，不要用「好的」「让我来」等开场。`,
    user: `课程难度：${course.difficulty}。\n${context}\n\n请给出专家级深度解读。`,
    maxTokens: 800,
    temperature: 0.4,
  });

  if (!result?.text?.trim()) {
    return NextResponse.json(err("SERVER_ERROR", "生成解读失败"), { status: 500 });
  }

  return NextResponse.json(ok({ explanation: result.text.trim() }), { status: 200 });
}
