import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { captureServerEvent } from "@/lib/analytics/server";
import {
  ensureCourseCompletedAchievement,
  getChapterIdByCourseAndIndex,
  getConceptIdsByNames,
  getCourseById,
  insertQuizAttempts,
  upsertCourseProgress,
  upsertUserConcept,
} from "@/lib/db/repositories";
import { checkRateLimit } from "@/lib/rate-limit";
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

/** 根据章节 quizQuestions 与用户 answers 计算得分（正确数/总题数）。 */
function computeQuizScore(
  questions: Array<{ options: string[]; correct: string }>,
  answers: (string | number)[],
): number {
  if (questions.length === 0 || answers.length !== questions.length) {
    return 0;
  }
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const a = answers[i];
    const selected =
      typeof a === "number"
        ? q.options[a]
        : String(a);
    if (selected === q.correct) correct++;
  }
  return correct / questions.length;
}

export async function POST(request: Request, { params }: QuizRouteProps) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const quizLimit = await checkRateLimit(
    `quiz:${authContext.userId}`,
    30,
  );
  if (!quizLimit.allowed) {
    return NextResponse.json(
      err("RATE_LIMITED", "Quiz submissions limited to 30 per hour.", quizLimit),
      { status: 429 },
    );
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

  const { answers, score: clientScore } = parsed.data;
  let quizScore: number | null = clientScore ?? null;

  if (answers.length > 0) {
    const course = await getCourseById(courseId);
    const chapter = course?.chapters[chapterIndex];
    const questions = chapter?.quizQuestions;
    if (Array.isArray(questions) && questions.length > 0) {
      quizScore = computeQuizScore(
        questions as Array<{ options: string[]; correct: string }>,
        answers,
      );
    } else if (quizScore === null) {
      quizScore = 0;
    }
  }
  if (quizScore === null && answers.length > 0) {
    quizScore = 0;
  }

  const record = await upsertCourseProgress({
    userId: authContext.userId,
    courseId,
    chapterIndex,
    status: "completed",
    quizScore: quizScore ?? undefined,
    quizAnswers: answers as unknown,
  });

  const course = await getCourseById(courseId);
  const chapter = course?.chapters[chapterIndex];
  const questions = Array.isArray(chapter?.quizQuestions) ? chapter.quizQuestions : [];
  const chapterId = await getChapterIdByCourseAndIndex(courseId, chapterIndex);
  if (chapterId && questions.length > 0 && answers.length === questions.length) {
    const attempts = (questions as Array<{ options: string[]; correct: string }>).map((q, i) => {
      const a = answers[i];
      const selected = typeof a === "number" ? q.options[a] : String(a);
      return {
        questionIndex: i,
        selectedAnswer: selected ?? null,
        correct: selected === q.correct,
        timeSpentSeconds: 0,
      };
    });
    await insertQuizAttempts({
      userId: authContext.userId,
      courseId,
      chapterId,
      attempts,
    });
  }
  if (chapterId && chapter?.conceptNames?.length && quizScore != null) {
    const conceptIds = await getConceptIdsByNames(chapter.conceptNames);
    for (const [, conceptId] of conceptIds) {
      await upsertUserConcept({
        userId: authContext.userId,
        conceptId,
        masteryLevel: quizScore,
        incrementReview: true,
      });
    }
  }

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
