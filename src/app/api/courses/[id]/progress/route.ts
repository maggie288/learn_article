import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { captureServerEvent } from "@/lib/analytics/server";
import {
  ensureCourseCompletedAchievement,
  getCourseProgress,
  upsertCourseProgress,
} from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const progressSchema = z.object({
  chapterIndex: z.number().int().min(0),
  status: z.enum(["in_progress", "completed"]),
});

interface ProgressRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: ProgressRouteProps) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const { id } = await params;
  const progress = await getCourseProgress(authContext.userId, id);

  return NextResponse.json(
    ok({
      items: progress,
    }),
  );
}

export async function POST(request: Request, { params }: ProgressRouteProps) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const payload = await request.json().catch(() => null);
  const parsed = progressSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      err("INVALID_REQUEST", "Invalid progress payload.", parsed.error.flatten()),
      { status: 400 },
    );
  }

  const { id } = await params;
  const record = await upsertCourseProgress({
    userId: authContext.userId,
    courseId: id,
    chapterIndex: parsed.data.chapterIndex,
    status: parsed.data.status,
  });

  if (parsed.data.status === "completed") {
    await captureServerEvent({
      distinctId: authContext.userId,
      event: "chapter_completed",
      properties: {
        courseId: id,
        chapterIndex: parsed.data.chapterIndex,
      },
    });
    const achievement = await ensureCourseCompletedAchievement(authContext.userId, id);
    if (achievement) {
      await captureServerEvent({
        distinctId: authContext.userId,
        event: "course_completed",
        properties: { courseId: id },
      });
    }
  }

  return NextResponse.json(
    ok({
      item: record,
    }),
  );
}
