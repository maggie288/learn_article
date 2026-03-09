"use client";

import { useState } from "react";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/stripe/create-portal", {
      method: "POST",
    });

    const result = (await response.json()) as {
      success: boolean;
      data?: { url: string | null };
      error?: { message: string };
    };

    setLoading(false);

    if (!response.ok || !result.success || !result.data?.url) {
      setError(result.error?.message ?? "Unable to open billing portal.");
      return;
    }

    window.location.href = result.data.url;
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-100 disabled:opacity-60"
        disabled={loading}
        onClick={handleClick}
        type="button"
      >
        {loading ? "Opening..." : "Manage subscription"}
      </button>
      {error ? <div className="text-sm text-rose-300">{error}</div> : null}
    </div>
  );
}
