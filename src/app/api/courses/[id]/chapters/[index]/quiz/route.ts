import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { captureServerEvent } from "@/lib/analytics/server";
import {
  ensureCourseCompletedAchievement,
  upsertCourseProgress,
} from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const quizSchema = z.object({
  answers: z.array(z.union([z.string(), z.number()])).optional().default([]),
  score: z.number().min(0).max(1).optional(),
});

interface QuizRouteProps {
  params: Promise<{
    id: string;
    index: string;
  }>;
}

export async function POST(request: Request, { params }: QuizRouteProps) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const { id: courseId, index } = await params;
  const chapterIndex = Number(index);
  if (Number.isNaN(chapterIndex) || chapterIndex < 0) {
    return NextResponse.json(
      err("INVALID_REQUEST", "Invalid chapter index."),
      { status: 400 },
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = quizSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      err("INVALID_REQUEST", "Invalid quiz payload.", parsed.error.flatten()),
      { status: 400 },
    );
  }

  const { answers, score } = parsed.data;
  const quizScore = score ?? (answers.length > 0 ? 0 : null);

  const record = await upsertCourseProgress({
    userId: authContext.userId,
    courseId,
    chapterIndex,
    status: "completed",
    quizScore: quizScore ?? undefined,
    quizAnswers: answers,
  });

  await captureServerEvent({
    distinctId: authContext.userId,
    event: "quiz_submitted",
    properties: {
      courseId,
      chapterIndex,
      score: quizScore ?? 0,
    },
  });

  const achievement = await ensureCourseCompletedAchievement(
    authContext.userId,
    courseId,
  );
  if (achievement) {
    await captureServerEvent({
      distinctId: authContext.userId,
      event: "course_completed",
      properties: { courseId },
    });
  }

  return NextResponse.json(
    ok({
      item: record,
      achievement: achievement ?? undefined,
    }),
  );
}
