import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createGenerationTask,
  findActiveGenerationTask,
  findPublishedCourseBySourceUrlAndDifficulty,
} from "@/lib/db/repositories";
import {
  canGenerateWithPlan,
  consumeGenerationQuota,
  getAuthContext,
  isQuotaExceeded,
} from "@/lib/auth/session";
import { normalizePaperUrl } from "@/lib/engine/ingestion/paper";
import { dispatchCourseGeneration } from "@/lib/inngest/dispatch";
import { checkRateLimit } from "@/lib/rate-limit";
import { err, ok } from "@/lib/types/api";

const generateCourseSchema = z.object({
  sourceUrl: z.string().url(),
  difficulty: z.enum(["explorer", "builder", "researcher"]).default("explorer"),
  language: z.string().default("zh-CN"),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = generateCourseSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      err("INVALID_REQUEST", "Invalid course generation payload.", parsed.error.flatten()),
      { status: 400 },
    );
  }

  const authContext = await getAuthContext();

  if (!authContext.authConfigured) {
    return NextResponse.json(
      err("AUTH_NOT_CONFIGURED", "Clerk must be configured before protected generation is enabled."),
      { status: 503 },
    );
  }

  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(
      err("UNAUTHORIZED", "You must sign in before generating a course."),
      { status: 401 },
    );
  }

  if (!canGenerateWithPlan(authContext.plan, parsed.data.difficulty)) {
    return NextResponse.json(
      err("PLAN_RESTRICTED", "Free users can only generate Explorer courses."),
      { status: 403 },
    );
  }

  if (isQuotaExceeded(authContext.plan, authContext.monthlyCourseCount)) {
    return NextResponse.json(
      err("QUOTA_EXCEEDED", "Free users can generate up to 3 courses per month."),
      { status: 403 },
    );
  }

  const rateLimit = await checkRateLimit(
    `${authContext.userId}:courses:generate`,
    authContext.plan === "free" ? 3 : 10,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      err("RATE_LIMITED", "Too many generate requests. Please try again later.", rateLimit),
      { status: 429 },
    );
  }

  const normalizedSourceUrl = normalizePaperUrl(parsed.data.sourceUrl).sourceUrl;
  const publishedCourse = await findPublishedCourseBySourceUrlAndDifficulty(
    normalizedSourceUrl,
    parsed.data.difficulty,
  );

  if (publishedCourse) {
    await consumeGenerationQuota(authContext.userId);

    return NextResponse.json(
      ok({
        taskId: null,
        courseId: publishedCourse.id,
        status: publishedCourse.status,
        estimatedMinutes: publishedCourse.estimatedMinutes,
        cacheHit: true,
      }),
      { status: 200 },
    );
  }

  const existingTask = await findActiveGenerationTask(
    normalizedSourceUrl,
    parsed.data.difficulty,
  );

  if (existingTask) {
    return NextResponse.json(
      ok({
        taskId: existingTask.id,
        courseId: existingTask.courseId,
        status: existingTask.status,
        estimatedMinutes: null,
        cacheHit: true,
      }),
      { status: 200 },
    );
  }

  await consumeGenerationQuota(authContext.userId);

  const task = await createGenerationTask({
    ...parsed.data,
    sourceUrl: normalizedSourceUrl,
  });

  await dispatchCourseGeneration({
    taskId: task.id,
    sourceUrl: normalizedSourceUrl,
    difficulty: parsed.data.difficulty,
    language: parsed.data.language,
  });

  return NextResponse.json(
    ok({
      taskId: task.id,
      courseId: null,
      status: task.status,
      estimatedMinutes: null,
      cacheHit: false,
    }),
    { status: 202 },
  );
}
