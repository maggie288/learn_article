"use client";

import { useState } from "react";

export interface StepControllerProps {
  /** Steps from visualizer (e.g. step labels or partial content). When length > 1, show prev/next. */
  steps?: unknown[];
  /** Optional title for this diagram (e.g. type). */
  title?: string;
  /** Content to show for the current step (e.g. SVG or placeholder). */
  children: React.ReactNode;
  /** Optional class for the wrapper. */
  className?: string;
}

/**
 * 分步动画控制：当 svg_components[].steps 有多步时显示「上一步/下一步」与步骤指示。
 */
export function StepController({
  steps: stepsProp,
  title,
  children,
  className = "",
}: StepControllerProps) {
  const steps = Array.isArray(stepsProp) ? stepsProp : [];
  const [currentStep, setCurrentStep] = useState(0);
  const stepCount = Math.max(1, steps.length);
  const effectiveStep = steps.length > 0 ? Math.min(currentStep, steps.length - 1) : 0;

  const goPrev = () => setCurrentStep((s) => Math.max(0, s - 1));
  const goNext = () => setCurrentStep((s) => Math.min(stepCount - 1, s + 1));

  return (
    <div
      className={`rounded-lg border border-white/10 bg-white/[0.02] p-4 ${className}`}
      aria-label={title ?? "图示"}
    >
      {title ? (
        <p className="mb-2 text-xs font-medium text-slate-500">{title}</p>
      ) : null}
      <div className="[&>svg]:max-h-[320px] [&>svg]:w-full [&>svg]:object-contain">
        {children}
      </div>
      {stepCount > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={effectiveStep === 0}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
          >
            上一步
          </button>
          <span className="text-xs text-slate-500">
            步骤 {effectiveStep + 1} / {stepCount}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={effectiveStep >= stepCount - 1}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none"
          >
            下一步
          </button>
        </div>
      ) : null}
    </div>
  );
}
