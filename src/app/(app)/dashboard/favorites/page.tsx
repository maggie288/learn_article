import Link from "next/link";
import { getAuthContext } from "@/lib/auth/session";
import { listFavoriteCourses } from "@/lib/db/repositories";

export default async function FavoritesPage() {
  const authContext = await getAuthContext();

  if (!authContext.isAuthenticated || !authContext.userId) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold">Favorites</h1>
        <p className="max-w-2xl text-slate-300">
          Sign in to view your favorite courses.
        </p>
      </section>
    );
  }

  const favorites = await listFavoriteCourses(authContext.userId);

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <Link className="text-sm text-sky-300" href="/dashboard">
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-semibold">Favorites</h1>
      </div>

      {favorites.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favorites.map((course) => (
            <Link
              key={course.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-sky-400/40"
              href={`/paper/${course.slug}`}
            >
              <div className="text-sm text-sky-300">{course.difficulty}</div>
              <h2 className="mt-2 text-xl font-medium">{course.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm text-slate-300">{course.abstract}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-slate-400">
          You have not favorited any courses yet.
        </div>
      )}
    </section>
  );
}
