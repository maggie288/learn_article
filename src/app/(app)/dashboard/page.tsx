import Link from "next/link";
import { getAuthContext } from "@/lib/auth/session";
import { getDashboardSummary } from "@/lib/db/repositories";
import { ConceptMap } from "@/components/dashboard/concept-map";
import { DashboardAchievements } from "@/components/dashboard/dashboard-achievements";

export default async function DashboardPage() {
  const authContext = await getAuthContext();

  if (!authContext.isAuthenticated || !authContext.userId) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="max-w-2xl text-slate-300">
          Sign in to view your learning dashboard.
        </p>
      </section>
    );
  }

  const summary = await getDashboardSummary(authContext.userId);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="max-w-2xl text-slate-300">
          个人学习进度、收藏和近期学习内容现在已经接到真实数据。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm text-slate-400">Completed chapters</div>
          <div className="mt-2 text-2xl font-semibold">{summary.completedChapters}</div>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm text-slate-400">In-progress courses</div>
          <div className="mt-2 text-2xl font-semibold">{summary.inProgressCourses}</div>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm text-slate-400">Favorites</div>
          <div className="mt-2 text-2xl font-semibold">{summary.favoritesCount}</div>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="text-sm text-slate-400">Current streak</div>
          <div className="mt-2 text-2xl font-semibold">{summary.currentStreak}</div>
        </article>
      </div>

      <DashboardAchievements />

      <ConceptMap
        concepts={summary.masteredConcepts}
        edges={summary.masteredConceptEdges}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Recent courses</h2>
          <Link className="text-sm text-sky-300" href="/dashboard/favorites">
            View favorites
          </Link>
        </div>

        {summary.recentCourses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {summary.recentCourses.map((course) => (
              <Link
                key={course.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-sky-400/40"
                href={`/paper/${course.slug}`}
              >
                <div className="text-sm text-sky-300">{course.difficulty}</div>
                <div className="mt-2 text-xl font-medium">{course.title}</div>
                <p className="mt-3 line-clamp-3 text-sm text-slate-300">{course.abstract}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-slate-400">
            No recent learning activity yet.
          </div>
        )}
      </section>
    </section>
  );
}
