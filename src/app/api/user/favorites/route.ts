import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { listFavoriteCourses } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

export async function GET() {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const favorites = await listFavoriteCourses(authContext.userId);

  return NextResponse.json(
    ok({
      items: favorites,
    }),
  );
}
