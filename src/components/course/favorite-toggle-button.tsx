"use client";

import { useState } from "react";

interface FavoriteToggleButtonProps {
  courseId: string;
  initialFavorited: boolean;
}

export function FavoriteToggleButton({
  courseId,
  initialFavorited,
}: FavoriteToggleButtonProps) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState<string | null>(null);

  async function toggleFavorite() {
    setError(null);

    const response = await fetch(`/api/courses/${courseId}/favorite`, {
      method: "POST",
    });

    const result = (await response.json()) as {
      success: boolean;
      data?: { favorited: boolean };
      error?: { message: string };
    };

    if (!response.ok || !result.success || !result.data) {
      setError(result.error?.message ?? "Unable to update favorite.");
      return;
    }

    setFavorited(result.data.favorited);
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-100"
        onClick={toggleFavorite}
        type="button"
      >
        {favorited ? "Favorited" : "Add to favorites"}
      </button>
      {error ? <div className="text-sm text-rose-300">{error}</div> : null}
    </div>
  );
}
