"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-200">
            Something went wrong
          </h1>
          <p className="max-w-md text-slate-400">
            We have been notified and are looking into it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
