import Link from "next/link";
import { Suspense } from "react";
import {
  listPublishedCourses,
  listTrendingCourses,
  searchCourses,
} from "@/lib/db/repositories";
import { ExploreToolbar } from "@/components/explore/explore-toolbar";

interface ExplorePageProps {
  searchParams?: Promise<{ q?: string; sort?: string }>;
}

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const sp = await searchParams;
  const q = sp?.q?.trim() ?? "";
  const sort = sp?.sort ?? "latest";

  const courses = q
    ? await searchCourses(q, 24)
    : sort === "trending"
      ? await listTrendingCourses(24)
      : await listPublishedCourses(24);

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Explore</h1>
        <p className="max-w-2xl text-slate-300">
          搜索或按最新/热门浏览已发布课程。
        </p>
        <Suspense fallback={<div className="h-20 animate-pulse rounded-xl bg-slate-800/50" />}>
          <ExploreToolbar />
        </Suspense>
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
          {q
            ? "未找到匹配的课程，试试其他关键词。"
            : "暂无公开课程。先从 Generate 页面生成一篇课程即可在这里看到。"}
        </div>
      )}
    </section>
  );
}
