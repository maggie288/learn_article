import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { isFavoriteCourse, toggleFavoriteCourse } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

interface FavoriteRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, { params }: FavoriteRouteProps) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(
      ok({
        favorited: false,
      }),
    );
  }

  const { id } = await params;
  const favorited = await isFavoriteCourse(authContext.userId, id);

  return NextResponse.json(
    ok({
      favorited,
    }),
  );
}

export async function POST(_request: Request, { params }: FavoriteRouteProps) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const { id } = await params;
  const favorited = await toggleFavoriteCourse(authContext.userId, id);

  return NextResponse.json(
    ok({
      favorited,
    }),
  );
}
