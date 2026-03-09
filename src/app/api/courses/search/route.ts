import { NextResponse } from "next/server";
import { z } from "zod";
import { searchCourses } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const querySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

/** GET /api/courses/search?q= — 全文搜索（title / abstract / slug） */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? "24",
  });

  if (!parsed.success || !parsed.data.q.trim()) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "请提供搜索关键词 q"),
      { status: 400 },
    );
  }

  const courses = await searchCourses(parsed.data.q.trim(), parsed.data.limit);

  return NextResponse.json(
    ok({
      items: courses,
    }),
    { status: 200 },
  );
}
