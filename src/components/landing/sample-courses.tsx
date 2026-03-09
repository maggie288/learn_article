import Link from "next/link";
import type { CourseListItem } from "@/lib/db/types";

const DIFFICULTY_LABEL: Record<string, string> = {
  explorer: "入门",
  builder: "进阶",
  researcher: "深入",
};

interface SampleCoursesProps {
  courses: CourseListItem[];
  title?: string;
  subtitle?: string;
}

/** 首页示例课程区块：展示若干已发布课程卡片 */
export function SampleCourses({
  courses,
  title = "示例课程",
  subtitle = "先体验已生成的课程，再生成自己的",
}: SampleCoursesProps) {
  if (courses.length === 0) {
    return null;
  }

  return (
    <section className="mt-24 border-t border-slate-800/60 pt-16">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        <p className="mt-3 text-slate-400">{subtitle}</p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.slice(0, 6).map((course) => (
          <Link
            key={course.id}
            href={`/paper/${course.slug}`}
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-sky-400/40 hover:bg-slate-800/60"
          >
            <span className="rounded border border-slate-600 px-2 py-0.5 font-mono text-xs text-slate-400">
              {DIFFICULTY_LABEL[course.difficulty] ?? course.difficulty}
            </span>
            <h3 className="mt-3 font-medium text-white group-hover:text-sky-100">
              {course.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm text-slate-400">
              {course.abstract}
            </p>
            <span className="mt-3 inline-block text-sm text-sky-400 group-hover:underline">
              开始学习 →
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Link
          href="/explore"
          className="rounded-full border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800/50"
        >
          浏览更多课程
        </Link>
      </div>
    </section>
  );
}
