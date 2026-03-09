"use client";

import { useState } from "react";

interface SubscribeButtonProps {
  plan: "pro-monthly" | "pro-yearly" | "team";
  label: string;
}

export function SubscribeButton({ plan, label }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ plan }),
    });

    const result = (await response.json()) as {
      success: boolean;
      data?: { url: string | null };
      error?: { message: string };
    };

    setLoading(false);

    if (!response.ok || !result.success || !result.data?.url) {
      setError(result.error?.message ?? "Unable to create checkout session.");
      return;
    }

    window.location.href = result.data.url;
  }

  return (
    <div className="mt-5 space-y-2">
      <button
        className="rounded-full bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60"
        disabled={loading}
        onClick={handleClick}
        type="button"
      >
        {loading ? "Redirecting..." : label}
      </button>
      {error ? <div className="text-sm text-rose-300">{error}</div> : null}
    </div>
  );
}
