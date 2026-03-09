"use client";

import { useState } from "react";
import posthog from "posthog-js";

export type SharePlatform = "copy" | "twitter" | "linkedin";

interface ShareBarProps {
  courseId: string;
  shareUrl: string;
  title?: string;
}

function trackShare(platform: SharePlatform, courseId: string) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture("course_shared", { courseId, platform });
  } catch {
    // ignore
  }
  fetch(`/api/courses/${courseId}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform }),
  }).catch(() => {});
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
  return url;
}

export function ShareBar({ courseId, shareUrl, title }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const absoluteUrl = toAbsoluteUrl(shareUrl);
  const encodedUrl = encodeURIComponent(absoluteUrl);
  const text = title
    ? encodeURIComponent(`${title} — learn on PaperFlow`)
    : encodeURIComponent("Check out this course on PaperFlow");

  function handleCopy() {
    navigator.clipboard.writeText(absoluteUrl).then(
      () => {
        setCopied(true);
        trackShare("copy", courseId);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  function handleTwitter() {
    trackShare("twitter", courseId);
    window.open(
      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handleLinkedIn() {
    trackShare("linkedin", courseId);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-400">Share:</span>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-700"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={handleTwitter}
        className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-700"
      >
        Twitter
      </button>
      <button
        type="button"
        onClick={handleLinkedIn}
        className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-700"
      >
        LinkedIn
      </button>
    </div>
  );
}
