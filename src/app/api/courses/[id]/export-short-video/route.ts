import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import {
  createShortVideoExport,
  getCourseById,
  getShortVideoExportById,
} from "@/lib/db/repositories";
import { dispatchShortVideoExport } from "@/lib/inngest/dispatch";
import { checkRateLimitDaily } from "@/lib/rate-limit";
import { err, ok } from "@/lib/types/api";

interface ExportShortVideoProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/courses/:id/export-short-video
 * 导出短视频（异步）：首章音频剪辑，Inngest 流水线生成并上传 MP3。
 */
export async function POST(_request: Request, { params }: ExportShortVideoProps) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), { status: 401 });
  }

  if (authContext.plan === "free") {
    return NextResponse.json(
      err("PLAN_RESTRICTED", "Short video export is available for Pro users only."),
      { status: 403 },
    );
  }

  const dailyLimit = await checkRateLimitDaily(
    `export-short-video:${authContext.userId}`,
    5,
  );
  if (!dailyLimit.allowed) {
    return NextResponse.json(
      err("RATE_LIMITED", "Short video export limited to 5 per day.", dailyLimit),
      { status: 429 },
    );
  }

  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    return NextResponse.json(err("NOT_FOUND", "Course not found."), { status: 404 });
  }

  const exportRecord = await createShortVideoExport({
    courseId: id,
    userId: authContext.userId,
  });

  await dispatchShortVideoExport({
    exportId: exportRecord.id,
    courseId: id,
    userId: authContext.userId,
  });

  return NextResponse.json(
    ok({
      taskId: exportRecord.id,
      status: "queued",
      message: "Short video export queued. Poll status with taskId.",
    }),
    { status: 202 },
  );
}

/**
 * GET /api/courses/:id/export-short-video?taskId=...
 * 查询导出任务状态与结果 URL。
 */
export async function GET(
  request: Request,
  { params }: ExportShortVideoProps,
) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), { status: 401 });
  }

  const { id } = await params;
  const taskId = new URL(request.url).searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json(err("VALIDATION_ERROR", "taskId required"), { status: 400 });
  }

  const exportRecord = await getShortVideoExportById(taskId);
  if (!exportRecord) {
    return NextResponse.json(err("NOT_FOUND", "Export task not found."), { status: 404 });
  }
  if (exportRecord.courseId !== id || exportRecord.userId !== authContext.userId) {
    return NextResponse.json(err("FORBIDDEN", "Not your export."), { status: 403 });
  }

  return NextResponse.json(
    ok({
      taskId: exportRecord.id,
      status: exportRecord.status,
      fileUrl: exportRecord.fileUrl ?? undefined,
      errorMessage: exportRecord.errorMessage ?? undefined,
    }),
  );
}
