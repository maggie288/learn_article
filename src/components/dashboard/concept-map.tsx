"use client";

import { useMemo } from "react";
import type { MasteredConceptEdge } from "@/lib/db/types";

interface ConceptMapProps {
  concepts: string[];
  edges: MasteredConceptEdge[];
  /** 最多展示的概念数量（避免过多节点难以阅读） */
  maxConcepts?: number;
}

/**
 * 已掌握概念图谱可视化：节点 + 边，简单环形布局 + SVG 连线
 */
export function ConceptMap({
  concepts,
  edges,
  maxConcepts = 40,
}: ConceptMapProps) {
  const displayConcepts = useMemo(
    () => concepts.slice(0, maxConcepts),
    [concepts, maxConcepts],
  );
  const displayEdges = useMemo(
    () =>
      edges.filter(
        (e) =>
          displayConcepts.includes(e.from) && displayConcepts.includes(e.to),
      ),
    [edges, displayConcepts],
  );

  const nodePositions = useMemo(() => {
    const n = displayConcepts.length;
    if (n === 0) return new Map<string, { x: number; y: number }>();
    const r = 120;
    const center = 140;
    const map = new Map<string, { x: number; y: number }>();
    displayConcepts.forEach((name, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      map.set(name, {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      });
    });
    return map;
  }, [displayConcepts]);

  if (displayConcepts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-sm text-slate-500">
        完成更多章节后，已掌握的概念将显示在这里。
      </div>
    );
  }

  const width = 280;
  const height = 280;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">已掌握概念图谱</h2>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto h-[280px] w-full max-w-[280px]"
          aria-label="概念图谱"
        >
          {displayEdges.map((e, i) => {
            const fromPos = nodePositions.get(e.from);
            const toPos = nodePositions.get(e.to);
            if (!fromPos || !toPos) return null;
            return (
              <line
                key={`${e.from}-${e.to}-${i}`}
                x1={fromPos.x}
                y1={fromPos.y}
                x2={toPos.x}
                y2={toPos.y}
                stroke="rgba(34, 211, 238, 0.35)"
                strokeWidth={1}
              />
            );
          })}
          {displayConcepts.map((name) => {
            const pos = nodePositions.get(name);
            if (!pos) return null;
            return (
              <g key={name}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={14}
                  fill="rgba(34, 211, 238, 0.2)"
                  stroke="rgba(34, 211, 238, 0.6)"
                  strokeWidth={1}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-300 text-[10px] font-medium"
                  style={{ fontSize: "10px" }}
                >
                  {name.length > 8 ? name.slice(0, 7) + "…" : name}
                </text>
              </g>
            );
          })}
        </svg>
        {concepts.length > maxConcepts ? (
          <p className="mt-2 text-center text-xs text-slate-500">
            共 {concepts.length} 个概念，仅展示前 {maxConcepts} 个
          </p>
        ) : null}
      </div>
    </section>
  );
}
