import { NextResponse } from "next/server";
import { getGenerationTask } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

interface StatusRouteProps {
  params: Promise<{
    taskId: string;
  }>;
}

export async function GET(_request: Request, { params }: StatusRouteProps) {
  const { taskId } = await params;
  const task = await getGenerationTask(taskId);

  if (!task) {
    return NextResponse.json(
      err("TASK_NOT_FOUND", `No generation task found for ${taskId}.`),
      { status: 404 },
    );
  }

  return NextResponse.json(
    ok({
      taskId: task.id,
      status: task.status,
      courseId: task.courseId,
      errorMessage: task.errorMessage,
      updatedAt: task.updatedAt,
      progressTotalChapters: task.progressTotalChapters ?? undefined,
      progressChaptersDone: task.progressChaptersDone ?? undefined,
    }),
  );
}
