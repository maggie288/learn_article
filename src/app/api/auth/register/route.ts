import { NextResponse } from "next/server";
import { z } from "zod";
import { registerWithEmail } from "@/lib/auth/next-auth-options";
import { checkRateLimit } from "@/lib/rate-limit";
import { err, ok } from "@/lib/types/api";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(200).optional(),
});

function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : null;
  return ip ?? request.headers.get("x-real-ip") ?? "anonymous";
}

export async function POST(request: Request) {
  const clientId = getClientId(request);
  const rateLimit = await checkRateLimit(`register:${clientId}`, 10);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      err("RATE_LIMITED", "Too many registrations. Try again later.", rateLimit),
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const msg =
      Object.keys(flat.fieldErrors).length > 0
        ? Object.values(flat.fieldErrors).flat().join("; ")
        : "Invalid request.";
    return NextResponse.json(err("VALIDATION_ERROR", msg), { status: 400 });
  }

  const { email, password, name } = parsed.data;
  const result = await registerWithEmail(email, password, name ?? undefined);

  if (result.error === "EMAIL_EXISTS") {
    return NextResponse.json(
      err("EMAIL_EXISTS", "An account with this email already exists."),
      { status: 409 },
    );
  }

  return NextResponse.json(ok({ registered: true }));
}
