import Link from "next/link";
import { notFound } from "next/navigation";
import { canAccessChapter, getAuthContext } from "@/lib/auth/session";
import { splitNarrationIntoParagraphs } from "@/lib/utils/narration";
import { ChapterViewedTracker } from "@/components/analytics/chapter-viewed-tracker";
import { ChapterProgressButton } from "@/components/course/chapter-progress-button";
import { DifficultySwitcher } from "@/components/course/difficulty-switcher";
import { QuizModalTrigger } from "@/components/course/quiz-modal-trigger";
import { ReadAloudButton } from "@/components/course/read-aloud-button";
import { StepController } from "@/components/svg/step-controller";
import {
  getCourseBySlug,
  getCourseBySlugAndDifficulty,
  getPublishedDifficultiesBySlug,
} from "@/lib/db/repositories";
import type { DifficultyLevel } from "@/lib/engine/types";

const VALID_DIFFICULTIES: DifficultyLevel[] = ["explorer", "builder", "researcher"];

interface ChapterPageProps {
  params: Promise<{ slug: string; index: string }>;
  searchParams?: Promise<{ difficulty?: string }>;
}

export default async function ChapterPage({ params, searchParams }: ChapterPageProps) {
  const { slug, index } = await params;
  const sp = await searchParams;
  const difficultyParam = sp?.difficulty;
  const difficulty: DifficultyLevel | undefined =
    difficultyParam && VALID_DIFFICULTIES.includes(difficultyParam as DifficultyLevel)
      ? (difficultyParam as DifficultyLevel)
      : undefined;

  const chapterIndex = Number(index);
  const course = difficulty
    ? await getCourseBySlugAndDifficulty(slug, difficulty)
    : await getCourseBySlug(slug);
  const authContext = await getAuthContext();
  const availableDifficulties = await getPublishedDifficultiesBySlug(slug);

  const displayCourse = course ?? (await getCourseBySlug(slug));
  if (!displayCourse || Number.isNaN(chapterIndex)) {
    notFound();
  }
  const effectiveCourse = course ?? displayCourse;

  const chapter = effectiveCourse.chapters[chapterIndex];

  if (!chapter) {
    notFound();
  }

  const unlocked = canAccessChapter(chapterIndex, authContext.isAuthenticated);
  const paragraphs = splitNarrationIntoParagraphs(chapter.narration);
  const totalChapters = effectiveCourse.chapters.length;
  const prevIndex = chapterIndex > 0 ? chapterIndex - 1 : null;
  const nextIndex = chapterIndex < totalChapters - 1 ? chapterIndex + 1 : null;
  const progressPercent = totalChapters > 0 ? ((chapterIndex + 1) / totalChapters) * 100 : 0;
  const chapterQuery = difficulty ? `?difficulty=${difficulty}` : "";

  return (
    <main className="min-h-screen font-reading">
      {unlocked ? (
        <ChapterViewedTracker
          chapterIndex={chapter.orderIndex}
          courseId={effectiveCourse.id}
          difficulty={effectiveCourse.difficulty}
        />
      ) : null}

      {/* Sticky top bar + progress (podcast-explainer style) */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-reading flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link
            className="text-sm text-cyan-400 hover:text-cyan-300"
            href={`/paper/${slug}${chapterQuery}`}
          >
            ← Back to course
          </Link>
          <div className="flex items-center gap-3">
            <DifficultySwitcher
              slug={slug}
              currentDifficulty={effectiveCourse.difficulty}
              availableDifficulties={availableDifficulties}
              chapterIndex={chapterIndex}
            />
            <span className="font-mono text-xs text-slate-500">
              {chapterIndex + 1} / {totalChapters}
            </span>
          </div>
        </div>
        <div className="h-0.5 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-reading px-5 pb-24 pt-8 sm:px-6 sm:pt-10">
        <header className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Chapter {chapter.orderIndex + 1}: {chapter.title}
              </h1>
              {chapter.subtitle ? (
                <p className="mt-1.5 text-sm italic text-slate-500">{chapter.subtitle}</p>
              ) : null}
            </div>
            {unlocked && chapter.narration?.trim() ? (
              <ReadAloudButton
                text={chapter.narration}
                labelIdle="朗读本章"
                labelSpeaking="停止"
                lang="zh-CN"
              />
            ) : null}
          </div>
        </header>

        {unlocked ? (
          <>
            {/* Optional chapter audio (when TTS pipeline produces it) */}
            {chapter.audioUrl ? (
              <section className="mb-6" aria-label="本章音频">
                <audio
                  controls
                  className="w-full"
                  src={chapter.audioUrl}
                  preload="metadata"
                >
                  您的浏览器不支持音频播放。
                </audio>
              </section>
            ) : null}

            {/* Chapter SVG (when pipeline produces it; else placeholder) */}
            <section className="mb-8" aria-label="本章图示">
              {chapter.svgComponents && chapter.svgComponents.length > 0 ? (
                <div className="space-y-4">
                  {chapter.svgComponents.map((comp, i) => {
                    const compObj = comp as { type?: string; steps?: unknown[] };
                    const steps = Array.isArray(compObj?.steps) ? compObj.steps : undefined;
                    const title = compObj?.type
                      ? `可视化：${compObj.type}`
                      : `图示 ${i + 1}`;
                    if (typeof comp === "string") {
                      return (
                        <StepController key={i} steps={steps} title={title}>
                          <div
                            className="[&>svg]:max-h-[320px] [&>svg]:w-full [&>svg]:object-contain"
                            dangerouslySetInnerHTML={{ __html: comp }}
                          />
                        </StepController>
                      );
                    }
                    return (
                      <StepController key={i} steps={steps} title={title}>
                        <div className="text-sm text-slate-500">
                          {compObj?.type ?? `图示 ${i + 1}`}（JSON 描述，待渲染器接入）
                        </div>
                      </StepController>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center text-sm text-slate-500">
                  本章图示（生成引擎接入后显示）
                </div>
              )}
            </section>

            {/* Narration blocks: 分页式段落，每段可单独朗读 */}
            <article className="space-y-4">
              {paragraphs.length > 0 ? (
                paragraphs.map((paragraph, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.06] px-5 py-4 sm:px-6 sm:py-4"
                  >
                    <div className="flex gap-3">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/80"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-[1.85] text-slate-300 whitespace-pre-wrap">
                          {paragraph}
                        </p>
                        <div className="mt-3">
                          <ReadAloudButton
                            text={paragraph}
                            labelIdle="朗读本段"
                            labelSpeaking="停止"
                            lang="zh-CN"
                            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-5 py-6 text-slate-500">
                  No content for this chapter yet.
                </div>
              )}
            </article>

            {/* Analogies (Analogist Agent) */}
            {chapter.analogies && chapter.analogies.length > 0 ? (
              <section className="mt-8">
                <h2 className="mb-3 text-sm font-semibold text-slate-400">类比</h2>
                <div className="space-y-3">
                  {chapter.analogies.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-cyan-500/15 bg-cyan-500/[0.06] px-4 py-3 text-sm text-slate-300"
                    >
                      {item.concept ? <span className="font-medium text-cyan-300">{item.concept}：</span> : null}
                      {item.analogy}
                      {item.limitation ? (
                        <p className="mt-1.5 text-xs text-slate-500">类比局限：{item.limitation}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Concepts */}
            {chapter.conceptNames.length > 0 ? (
              <section className="mt-8">
                <h2 className="mb-3 text-sm font-semibold text-slate-400">Concepts</h2>
                <div className="flex flex-wrap gap-2">
                  {chapter.conceptNames.map((concept) => (
                    <span
                      key={concept}
                      className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Code snippets (Coder Agent, Builder/Researcher) */}
            {chapter.codeSnippets && chapter.codeSnippets.length > 0 ? (
              <section className="mt-8">
                <h2 className="mb-3 text-sm font-semibold text-slate-400">代码示例</h2>
                <div className="space-y-4">
                  {chapter.codeSnippets.map((snip, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-slate-900/80 p-4">
                      <p className="mb-2 text-xs text-slate-500">{snip.language}</p>
                      <pre className="overflow-x-auto text-sm text-slate-300">
                        <code>{snip.code}</code>
                      </pre>
                      {snip.explanation ? (
                        <p className="mt-2 text-xs text-slate-500">{snip.explanation}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Quiz (Examiner Agent)：弹窗形态 QuizModal */}
            {chapter.quizQuestions && chapter.quizQuestions.length > 0 ? (
              <section className="mt-8">
                <h2 className="mb-3 text-sm font-semibold text-slate-400">本章测验</h2>
                {authContext.isAuthenticated ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <ChapterProgressButton chapterIndex={chapter.orderIndex} courseId={effectiveCourse.id} />
                    <QuizModalTrigger
                      courseId={effectiveCourse.id}
                      chapterIndex={chapter.orderIndex}
                      quizQuestions={chapter.quizQuestions}
                      hasQuestions
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">登录后可作答并查看得分。</p>
                )}
              </section>
            ) : null}

            {authContext.isAuthenticated && (!chapter.quizQuestions || chapter.quizQuestions.length === 0) ? (
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ChapterProgressButton
                  chapterIndex={chapter.orderIndex}
                  courseId={effectiveCourse.id}
                />
                <QuizModalTrigger
                  courseId={effectiveCourse.id}
                  chapterIndex={chapter.orderIndex}
                  hasQuestions={false}
                />
              </div>
            ) : null}
          </>
        ) : (
          <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-8">
            <h2 className="text-xl font-semibold text-white">Sign in to continue</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              按产品规则，前 2 章对未登录用户免费开放；从第 3 章开始需要登录后继续学习。
            </p>
          </section>
        )}

        {/* Bottom nav: prev/next (podcast-explainer style) */}
        <nav
          className="mt-12 flex items-center justify-between border-t border-white/5 pt-6"
          aria-label="Chapter navigation"
        >
          <div className="min-w-0 flex-1">
            {prevIndex !== null ? (
              <Link
                href={`/paper/${slug}/chapter/${prevIndex}${chapterQuery}`}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:border-cyan-500/30 hover:bg-cyan-500/10 hover:text-cyan-300"
              >
                ← 上一章
              </Link>
            ) : (
              <span />
            )}
          </div>
          <span className="font-mono text-xs text-slate-600">
            {chapterIndex + 1} / {totalChapters}
          </span>
          <div className="flex min-w-0 flex-1 justify-end">
            {nextIndex !== null ? (
              <Link
                href={`/paper/${slug}/chapter/${nextIndex}${chapterQuery}`}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-400 transition hover:bg-cyan-500/20"
              >
                下一章 →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </nav>
      </div>
    </main>
  );
}
