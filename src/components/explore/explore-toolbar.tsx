"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

type SortType = "latest" | "trending";

export function ExploreToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") as SortType) || "latest";

  const [inputValue, setInputValue] = useState(q);

  const setSort = useCallback(
    (s: SortType) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", s);
      params.delete("q");
      router.push(`/explore?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      const params = new URLSearchParams();
      if (trimmed) params.set("q", trimmed);
      else params.set("sort", sort);
      router.push(`/explore?${params.toString()}`);
    },
    [inputValue, sort, router],
  );

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="search"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="搜索课程标题、摘要…"
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-slate-200 placeholder:text-slate-500 focus:border-sky-500/50 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-sky-500 px-4 py-2.5 font-medium text-slate-950 transition hover:bg-sky-400"
        >
          搜索
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500">排序：</span>
        <button
          type="button"
          onClick={() => setSort("latest")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            sort === "latest" || (!searchParams.get("q") && !searchParams.get("sort"))
              ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          最新
        </button>
        <button
          type="button"
          onClick={() => setSort("trending")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            sort === "trending"
              ? "bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/40"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          热门
        </button>
      </div>
    </div>
  );
}
