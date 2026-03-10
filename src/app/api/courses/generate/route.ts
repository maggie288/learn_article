import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createGenerationTask,
  findActiveGenerationTask,
  findPublishedCourseBySourceUrlAndDifficulty,
  getGenerationTask,
  updateGenerationTask,
} from "@/lib/db/repositories";
import {
  canGenerateWithPlan,
  consumeGenerationQuota,
  getAuthContext,
  isQuotaExceeded,
} from "@/lib/auth/session";
import { normalizeSourceUrl } from "@/lib/engine/ingestion/paper";
import { dispatchCourseGeneration } from "@/lib/inngest/dispatch";
import { checkRateLimit } from "@/lib/rate-limit";
import { err, ok } from "@/lib/types/api";

const generateCourseSchema = z.object({
  sourceUrl: z.string().url().optional(),
  difficulty: z.enum(["explorer", "builder", "researcher"]).default("explorer"),
  language: z.string().default("zh-CN"),
  /** 为 true 时仅生成骨架（标题+章节列表+概念），不生成正文，用户按需生成本章 */
  skeleton: z.boolean().optional().default(false),
  /** 继续上次未完成的任务：传 taskId，将从中断处继续生成，不扣配额 */
  resumeTaskId: z.string().uuid().optional(),
});

const RESUMABLE_STATUSES = ["extracting", "generating", "skeleton", "verifying", "fixing", "failed"] as const;

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
      err("AUTH_NOT_CONFIGURED", "Auth must be configured (NEXTAUTH_SECRET) before protected generation is enabled."),
      { status: 503 },
    );
  }

  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(
      err("UNAUTHORIZED", "You must sign in before generating a course."),
      { status: 401 },
    );
  }

  // 继续未完成的任务：不扣配额，仅重新派发 Inngest，从已有骨架逐章补全
  if (parsed.data.resumeTaskId) {
    const task = await getGenerationTask(parsed.data.resumeTaskId);
    if (!task) {
      return NextResponse.json(err("NOT_FOUND", "Task not found"), { status: 404 });
    }
    if (task.status === "published") {
      return NextResponse.json(
        ok({
          taskId: task.id,
          courseId: task.courseId,
          status: task.status,
          estimatedMinutes: null,
          cacheHit: true,
        }),
        { status: 200 },
      );
    }
    if (!RESUMABLE_STATUSES.includes(task.status as (typeof RESUMABLE_STATUSES)[number])) {
      return NextResponse.json(
        err("INVALID_STATE", "Task cannot be resumed (only extracting/generating/skeleton/failed can be resumed)"),
        { status: 400 },
      );
    }
    if (!task.courseId) {
      return NextResponse.json(
        err("INVALID_STATE", "Task has no course yet; wait for phase1 or retry without resumeTaskId"),
        { status: 400 },
      );
    }
    await updateGenerationTask(task.id, { status: "generating", errorMessage: null });
    await dispatchCourseGeneration({
      taskId: task.id,
      sourceUrl: task.sourceUrl,
      difficulty: task.difficulty,
      language: task.language,
      skeleton: false,
    });
    return NextResponse.json(
      ok({
        taskId: task.id,
        courseId: task.courseId,
        status: "generating",
        estimatedMinutes: null,
        cacheHit: false,
        resumed: true,
      }),
      { status: 202 },
    );
  }

  if (!parsed.data.sourceUrl) {
    return NextResponse.json(err("INVALID_REQUEST", "sourceUrl is required for new generation"), { status: 400 });
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

  const normalizedSourceUrl = normalizeSourceUrl(parsed.data.sourceUrl).sourceUrl;
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
    sourceUrl: normalizedSourceUrl,
    difficulty: parsed.data.difficulty,
    language: parsed.data.language,
  });

  // 仅触发后台任务，不执行生成逻辑；整课生成在 Inngest 分步执行，客户端轮询 /api/courses/status/:taskId
  await dispatchCourseGeneration({
    taskId: task.id,
    sourceUrl: normalizedSourceUrl,
    difficulty: parsed.data.difficulty,
    language: parsed.data.language,
    skeleton: parsed.data.skeleton,
  });

  return NextResponse.json(
    ok({
      taskId: task.id,
      courseId: null,
      status: task.status,
      estimatedMinutes: null,
      cacheHit: false,
      skeleton: parsed.data.skeleton,
    }),
    { status: 202 },
  );
}
