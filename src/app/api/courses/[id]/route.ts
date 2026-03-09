import { NextResponse } from "next/server";
import { getCourseById, getCourseSlugById } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

interface CourseRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: CourseRouteProps) {
  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    return NextResponse.json(err("NOT_FOUND", `Course ${id} not found.`), {
      status: 404,
    });
  }

  const slug = await getCourseSlugById(id);

  return NextResponse.json(
    ok({
      ...course,
      slug,
    }),
  );
}
