import Link from "next/link";
import { listPublishedCourses } from "@/lib/db/repositories";
import { WaitlistForm } from "@/components/landing/waitlist-form";

const highlights = [
  "论文 URL -> 结构化提取 -> 学习路径 -> 异步课程生成",
  "Phase 1 优先：项目骨架、全量 Schema、Layer 1-3、Inngest 骨架",
  "首阶段暂缓认证，但保留完整扩展位",
];

export default async function HomePage() {
  const sampleCourses = await listPublishedCourses(6);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-16 px-6 py-16">
      <section className="space-y-6">
        <span className="inline-flex rounded-full border border-sky-500/40 px-3 py-1 text-sm text-sky-200">
          PaperFlow Phase 1
        </span>
        <div className="space-y-4">
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-6xl">
            用统一引擎把论文转换成可学习的结构化课程。
          </h1>
          <p className="max-w-3xl text-lg text-slate-300">
            当前仓库已完成 Phase 1 的应用骨架初始化，后续会把论文解析、提取、
            路径生成和异步编排逐步接入到这里。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-sky-400 px-5 py-3 font-medium text-slate-950"
            href="/generate"
          >
            进入生成页
          </Link>
          <Link
            className="rounded-full border border-slate-700 px-5 py-3 font-medium text-slate-100"
            href="/pricing"
          >
            查看定价
          </Link>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-200">
            Get early access
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            留下邮箱，上线或大版本发布时我们会通知你。
          </p>
          <div className="mt-4">
            <WaitlistForm />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-slate-200"
          >
            {item}
          </article>
        ))}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Sample courses</h2>
            <p className="mt-2 text-slate-300">
              公开课程会在这里展示，首页直接消费已发布课程数据。
            </p>
          </div>
          <Link className="text-sm text-sky-300" href="/explore">
            查看全部
          </Link>
        </div>

        {sampleCourses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sampleCourses.map((course) => (
              <Link
                key={course.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-sky-400/40"
                href={`/paper/${course.slug}`}
              >
                <div className="text-sm text-sky-300">{course.difficulty}</div>
                <h3 className="mt-2 text-lg font-medium">{course.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm text-slate-300">{course.abstract}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 p-6 text-slate-400">
            还没有已发布课程。可以先去 `Generate` 页面生成一篇论文课程。
          </div>
        )}
      </section>
    </main>
  );
}
