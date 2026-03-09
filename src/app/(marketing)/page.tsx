import Link from "next/link";
import { getAuthContext } from "@/lib/auth/session";
import { listPublishedCourses } from "@/lib/db/repositories";
import { EmailCapture } from "@/components/landing/email-capture";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SampleCourses } from "@/components/landing/sample-courses";

export default async function HomePage() {
  const auth = await getAuthContext();
  const sampleCourses = await listPublishedCourses(5);

  return (
    <main className="mx-auto max-w-4xl px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl">
          论文变课程，
          <br />
          <span className="text-sky-400">一键生成</span>学习路径
        </h1>
        <p className="mt-6 text-lg text-slate-400 sm:text-xl">
          输入论文链接，选择难度，获得结构化课程与测验。
          <br className="hidden sm:block" />
          登录即可开始生成。
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {auth.isAuthenticated ? (
            <>
              <Link
                href="/generate"
                className="w-full rounded-full bg-sky-500 px-8 py-4 text-center font-medium text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 sm:w-auto"
              >
                进入生成页
              </Link>
              <Link
                href="/explore"
                className="w-full rounded-full border border-slate-600 px-8 py-4 text-center font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/50 sm:w-auto"
              >
                浏览课程
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="w-full rounded-full bg-sky-500 px-8 py-4 text-center font-medium text-slate-950 shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 sm:w-auto"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="w-full rounded-full border border-slate-600 px-8 py-4 text-center font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/50 sm:w-auto"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </section>

      <HowItWorks />

      <SampleCourses courses={sampleCourses} />

      <EmailCapture />

      {/* Footer links */}
      <section className="mt-24 border-t border-slate-800/60 pt-16">
        <p className="text-center text-sm text-slate-500">
          论文 URL → 结构化提取 → 学习路径 → 异步生成课程
        </p>
        <div className="mt-6 flex justify-center gap-6 text-sm">
          <Link href="/pricing" className="text-slate-400 hover:text-slate-300">
            定价
          </Link>
          <Link href="/explore" className="text-slate-400 hover:text-slate-300">
            探索课程
          </Link>
        </div>
      </section>
    </main>
  );
}
