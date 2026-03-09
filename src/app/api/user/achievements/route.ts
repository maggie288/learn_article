import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import {
  getCourseById,
  getSourceById,
  listUserAchievements,
} from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

export async function GET() {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const achievements = await listUserAchievements(authContext.userId);
  const withCourse = await Promise.all(
    achievements.map(async (a) => {
      const course = await getCourseById(a.courseId);
      const source = course ? await getSourceById(course.sourceId) : null;
      return {
        ...a,
        courseSlug: source?.slug ?? null,
        courseTitle: source?.title ?? null,
      };
    }),
  );

  return NextResponse.json(
    ok({
      items: withCourse,
    }),
  );
}
