import Link from "next/link";
import { listPublishedCourses } from "@/lib/db/repositories";

export default async function ExplorePage() {
  const courses = await listPublishedCourses(24);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Explore</h1>
        <p className="max-w-2xl text-slate-300">
          当前发现页先提供已发布课程列表，后续再补热门、搜索和分类。
        </p>
      </div>

      {courses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-sky-400/40"
              href={`/paper/${course.slug}`}
            >
              <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                <span>{course.difficulty}</span>
                <span>{course.totalChapters ?? 0} chapters</span>
              </div>
              <h2 className="mt-3 text-xl font-medium">{course.title}</h2>
              <p className="mt-3 line-clamp-4 text-sm text-slate-300">{course.abstract}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-slate-400">
          暂无公开课程。先从 `Generate` 页面生成一篇课程即可在这里看到。
        </div>
      )}
    </section>
  );
}
