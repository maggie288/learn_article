import { NextResponse } from "next/server";
import { canAccessChapter, getAuthContext } from "@/lib/auth/session";
import { getCourseById } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

interface ChapterRouteProps {
  params: Promise<{
    id: string;
    index: string;
  }>;
}

export async function GET(_request: Request, { params }: ChapterRouteProps) {
  const { id, index } = await params;
  const course = await getCourseById(id);

  if (!course) {
    return NextResponse.json(err("NOT_FOUND", `Course ${id} not found.`), {
      status: 404,
    });
  }

  const chapterIndex = Number(index);
  const chapter = course.chapters[chapterIndex];

  if (Number.isNaN(chapterIndex) || !chapter) {
    return NextResponse.json(
      err("NOT_FOUND", `Chapter ${index} not found for course ${id}.`),
      { status: 404 },
    );
  }

  const authContext = await getAuthContext();

  if (!canAccessChapter(chapterIndex, authContext.isAuthenticated)) {
    return NextResponse.json(
      err("LOGIN_REQUIRED", "Please sign in to unlock chapter 3 and beyond."),
      { status: 401 },
    );
  }

  return NextResponse.json(
    ok({
      courseId: course.id,
      chapter,
    }),
  );
}
