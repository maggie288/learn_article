"use client";

import { useEffect, useState } from "react";
import { BadgeShareBar } from "@/components/share/badge-share-bar";

interface AchievementItem {
  id: string;
  userId: string;
  courseId: string;
  achievementType: string;
  createdAt: string;
  courseSlug: string | null;
  courseTitle: string | null;
}

export function DashboardAchievements() {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/achievements")
      .then((res) => res.json())
      .then((json: { success: boolean; data?: { items: AchievementItem[] } }) => {
        if (json.success && json.data?.items) {
          setItems(json.data.items);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || items.length === 0) {
    return null;
  }

  const completed = items.filter((a) => a.achievementType === "course_completed");
  if (completed.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Achievements</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {completed.map((a) => (
          <div
            key={a.id}
            className="rounded-2xl border border-emerald-800/50 bg-emerald-950/30 p-6"
          >
            <div className="text-sm font-medium text-emerald-300">
              Course completed
            </div>
            <div className="mt-1 text-slate-200">
              {a.courseTitle ?? "Course"}
            </div>
            <div className="mt-4">
              <BadgeShareBar
                courseId={a.courseId}
                courseTitle={a.courseTitle ?? undefined}
                shareUrl={a.courseSlug ? `/paper/${a.courseSlug}` : `/paper/${a.courseId}`}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
