import { NextResponse } from "next/server";
import { getCourseById } from "@/lib/db/repositories";

interface PodcastRouteProps {
  params: Promise<{ id: string }>;
}

/** GET /api/courses/:id/podcast — 重定向到完整播客音频 URL，无则 503。 */
export async function GET(_request: Request, { params }: PodcastRouteProps) {
  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (!course.podcastUrl) {
    return NextResponse.json(
      { error: "Podcast audio not ready", message: "TTS pipeline not run for this course." },
      { status: 503 },
    );
  }

  return NextResponse.redirect(course.podcastUrl, 302);
}
