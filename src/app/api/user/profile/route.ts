import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/session";
import { getAppUserById, updateUserProfile } from "@/lib/db/repositories";
import { err, ok } from "@/lib/types/api";

const patchSchema = z.object({
  knowledgeLevel: z.enum(["explorer", "builder", "researcher"]).optional(),
  preferredLanguage: z.string().min(1).max(20).optional(),
});

export async function GET() {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const user = await getAppUserById(authContext.userId);
  if (!user) {
    return NextResponse.json(err("NOT_FOUND", "User profile not found."), {
      status: 404,
    });
  }

  return NextResponse.json(
    ok({
      profile: {
        knowledgeLevel: user.knowledgeLevel,
        preferredLanguage: user.preferredLanguage,
        name: user.name,
        email: user.email,
      },
    }),
  );
}

export async function PATCH(request: Request) {
  const authContext = await getAuthContext();
  if (!authContext.isAuthenticated || !authContext.userId) {
    return NextResponse.json(err("UNAUTHORIZED", "Please sign in first."), {
      status: 401,
    });
  }

  const payload = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      err("INVALID_REQUEST", "Invalid profile payload.", parsed.error.flatten()),
      { status: 400 },
    );
  }

  const updated = await updateUserProfile(authContext.userId, {
    knowledgeLevel: parsed.data.knowledgeLevel,
    preferredLanguage: parsed.data.preferredLanguage,
  });

  if (!updated) {
    return NextResponse.json(err("NOT_FOUND", "User not found."), {
      status: 404,
    });
  }

  return NextResponse.json(
    ok({
      profile: {
        knowledgeLevel: updated.knowledgeLevel,
        preferredLanguage: updated.preferredLanguage,
        name: updated.name,
        email: updated.email,
      },
    }),
  );
}
