import { NextResponse } from "next/server";
import { getEnvSummary } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/db/client";
import { err, ok } from "@/lib/types/api";

export async function GET() {
  try {
    const env = getEnvSummary();
    const supabase = getSupabaseAdminClient();

    let dbStatus: "ok" | "error" | "missing_env" = "missing_env";
    if (supabase) {
      const { error } = await supabase
        .from("users")
        .select("id")
        .limit(1)
        .maybeSingle();
      dbStatus = error ? "error" : "ok";
    }

    const response = env.ready
      ? ok({
          db: dbStatus,
          env: env.appEnv,
          missing: env.missing,
        })
      : err("ENV_INCOMPLETE", "Missing required environment variables.", {
          db: dbStatus,
          env: env.appEnv,
          missing: env.missing,
        });

    const httpStatus = env.ready && dbStatus === "ok" ? 200 : 503;
    return NextResponse.json(response, { status: httpStatus });
  } catch (e) {
    return NextResponse.json(
      err("HEALTH_CHECK_FAILED", "Health check threw.", {
        db: "error",
        env: process.env.NEXT_PUBLIC_APP_ENV ?? "unknown",
      }),
      { status: 503 },
    );
  }
}
