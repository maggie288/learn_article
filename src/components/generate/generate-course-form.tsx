"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Difficulty = "explorer" | "builder" | "researcher";

interface GenerateResponse {
  success: boolean;
  data?: {
    taskId: string | null;
    courseId: string | null;
    status: string;
    estimatedMinutes: number | null;
    cacheHit: boolean;
    resumed?: boolean;
  };
  error?: {
    message: string;
  };
}

interface StatusResponse {
  success: boolean;
  data?: {
    taskId: string;
    status: string;
    courseId: string | null;
    errorMessage: string | null;
    updatedAt: string;
    progressTotalChapters?: number;
    progressChaptersDone?: number;
  };
  error?: {
    message: string;
  };
}

const difficulties: Array<{ id: Difficulty; label: string; description: string }> = [
  {
    id: "explorer",
    label: "Explorer",
    description: "更偏直觉解释，适合先跑通生产链路。",
  },
  {
    id: "builder",
    label: "Builder",
    description: "保留结构化细节和部分技术上下文。",
  },
  {
    id: "researcher",
    label: "Researcher",
    description: "面向更深的分析语境。",
  },
];

export function GenerateCourseForm() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("explorer");
  const [status, setStatus] = useState("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const buttonLabel = useMemo(() => {
    if (status === "submitting") {
      return "Submitting...";
    }
    if (status === "polling") {
      return "Generating...";
    }
    return "Generate course";
  }, [status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const response = await fetch("/api/courses/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceUrl,
        difficulty,
        language: "zh-CN",
      }),
    });

    const result = (await response.json()) as GenerateResponse;

    if (!response.ok || !result.success || !result.data) {
      setStatus("idle");
      setError(result.error?.message ?? "Failed to submit generation task.");
      return;
    }

    if (result.data.status === "published" && result.data.courseId) {
      router.push(`/course/${result.data.courseId}`);
      return;
    }

    if (!result.data.taskId) {
      setStatus("idle");
      setError("The request did not return a task id.");
      return;
    }

    setTaskId(result.data.taskId);
    setStatus("polling");
    setProgress(null);
    await pollUntilReady(result.data.taskId);
  }

  async function handleResume() {
    if (!taskId) return;
    setError(null);
    setStatus("submitting");

    const response = await fetch("/api/courses/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeTaskId: taskId }),
    });

    const result = (await response.json()) as GenerateResponse;

    if (!response.ok || !result.success || !result.data) {
      setStatus("idle");
      setError(result.error?.message ?? "Failed to resume.");
      return;
    }

    if (result.data.status === "published" && result.data.courseId) {
      router.push(`/course/${result.data.courseId}`);
      return;
    }

    const nextId = result.data.taskId ?? taskId;
    setTaskId(nextId);
    setStatus("polling");
    setProgress(null);
    await pollUntilReady(nextId);
  }

  async function pollUntilReady(nextTaskId: string) {
    for (;;) {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 2000);
      });

      const response = await fetch(`/api/courses/status/${nextTaskId}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as StatusResponse;

      if (!response.ok || !result.success || !result.data) {
        setStatus("idle");
        setError(result.error?.message ?? "Failed to fetch task status.");
        return;
      }

      if (result.data.status === "failed") {
        setStatus("idle");
        setProgress(null);
        setError(result.data.errorMessage ?? "Course generation failed.");
        return;
      }

      const total = result.data.progressTotalChapters ?? 0;
      const done = result.data.progressChaptersDone ?? 0;
      if (total > 0) {
        setProgress({ done, total });
      }

      if (result.data.status === "published" && result.data.courseId) {
        router.push(`/course/${result.data.courseId}`);
        return;
      }
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
      <form
        className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-8"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200" htmlFor="source-url">
            Paper URL
          </label>
          <input
            id="source-url"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-50 outline-none ring-0 placeholder:text-slate-500"
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://arxiv.org/abs/1706.03762"
            required
            value={sourceUrl}
          />
          <p className="text-sm text-slate-400">
            当前生产链路优先支持论文 URL，会自动走 PDF 抓取和 ar5iv fallback。
          </p>
        </div>

        <div className="space-y-3">
          <span className="block text-sm font-medium text-slate-200">Difficulty</span>
          <div className="grid gap-3 md:grid-cols-3">
            {difficulties.map((item) => {
              const active = difficulty === item.id;

              return (
                <button
                  key={item.id}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-sky-400 bg-sky-400/10 text-sky-100"
                      : "border-slate-800 bg-slate-950 text-slate-300"
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    setDifficulty(item.id);
                  }}
                  type="button"
                >
                  <div className="font-medium">{item.label}</div>
                  <div className="mt-2 text-sm">{item.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            className="rounded-full bg-sky-400 px-5 py-3 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={status === "submitting" || status === "polling"}
            type="submit"
          >
            {buttonLabel}
          </button>
          {status === "polling" && progress && progress.total > 0 ? (
            <span className="text-sm text-slate-400">
              正在生成第 {progress.done}/{progress.total} 章
            </span>
          ) : null}
          {taskId ? <span className="text-sm text-slate-400">taskId: {taskId}</span> : null}
        </div>

        {error ? (
          <div className="space-y-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <p>{error}</p>
            {taskId ? (
              <button
                className="rounded-full border border-rose-400/60 bg-rose-500/20 px-4 py-2 font-medium text-rose-100 hover:bg-rose-500/30"
                onClick={(e) => {
                  e.preventDefault();
                  handleResume();
                }}
                type="button"
              >
                继续生成
              </button>
            ) : null}
          </div>
        ) : null}
      </form>

      <aside className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
        <h2 className="text-xl font-semibold">Production flow</h2>
        <ol className="space-y-3 text-sm text-slate-300">
          <li>1. 提交 URL 到 `POST /api/courses/generate`。</li>
          <li>2. 任务进入异步工作流并持久化状态。</li>
          <li>3. 轮询 `GET /api/courses/status/:taskId`。</li>
          <li>4. 课程生成完成后跳转到 SSR 课程页。</li>
        </ol>
      </aside>
    </div>
  );
}
