import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { err, ok } from "@/lib/types/api";

const schema = z.object({
  email: z.string().email(),
});

function getClientId(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0]?.trim() : null;
  return ip ?? request.headers.get("x-real-ip") ?? "anonymous";
}

export async function POST(request: Request) {
  const clientId = getClientId(request);
  const rateLimit = await checkRateLimit(`lead:${clientId}`, 10);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      err("RATE_LIMITED", "Too many signups. Try again later.", rateLimit),
      { status: 429 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "PaperFlow <onboarding@resend.dev>";
  const notifyEmail = process.env.LEAD_NOTIFY_EMAIL ?? process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    return NextResponse.json(
      err("NOT_CONFIGURED", "Email signup is not configured."),
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      err("INVALID_REQUEST", "Invalid email.", parsed.error.flatten()),
      { status: 400 },
    );
  }

  if (notifyEmail) {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [notifyEmail],
      subject: "[PaperFlow] New waitlist signup",
      text: `New lead: ${parsed.data.email}`,
      html: `<p>New waitlist signup:</p><p><strong>${parsed.data.email}</strong></p>`,
    });
    if (error) {
      return NextResponse.json(
        err("SEND_FAILED", "Failed to record signup."),
        { status: 502 },
      );
    }
  }

  return NextResponse.json(ok({ submitted: true }));
}
