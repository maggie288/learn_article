import { NextResponse } from "next/server";
import { z } from "zod";
import { listPublishedCourses } from "@/lib/db/repositories";
import { ok } from "@/lib/types/api";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.parse({
    limit: url.searchParams.get("limit") ?? "12",
  });

  const courses = await listPublishedCourses(parsed.limit);

  return NextResponse.json(
    ok({
      items: courses,
    }),
  );
}
