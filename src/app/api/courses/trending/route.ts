import { NextResponse } from "next/server";
import { z } from "zod";
import { listTrendingCourses } from "@/lib/db/repositories";
import { ok } from "@/lib/types/api";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/** GET /api/courses/trending — 热门课程（按 view_count、published_at） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    limit: url.searchParams.get("limit") ?? "12",
  });
  const limit = parsed.success ? parsed.data.limit : 12;

  const courses = await listTrendingCourses(limit);

  return NextResponse.json(
    ok({
      items: courses,
    }),
    { status: 200 },
  );
}
