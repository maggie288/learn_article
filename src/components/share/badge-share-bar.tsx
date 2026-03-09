"use client";

import { useState } from "react";
import posthog from "posthog-js";

export type BadgePlatform = "copy" | "twitter" | "linkedin";

interface BadgeShareBarProps {
  courseId: string;
  courseTitle?: string;
  shareUrl: string;
}

function trackBadgeShare(platform: BadgePlatform, courseId: string) {
  if (typeof window === "undefined") return;
  try {
    posthog.capture("badge_shared", { courseId, platform });
  } catch {
    // ignore
  }
}

function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined")
    return `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;
  return url;
}

export function BadgeShareBar({
  courseId,
  courseTitle,
  shareUrl,
}: BadgeShareBarProps) {
  const [copied, setCopied] = useState(false);
  const absoluteUrl = toAbsoluteUrl(shareUrl);
  const text = courseTitle
    ? encodeURIComponent(`I completed "${courseTitle}" on PaperFlow 🎓`)
    : encodeURIComponent("I completed a course on PaperFlow 🎓");
  const encodedUrl = encodeURIComponent(absoluteUrl);

  function handleCopy() {
    navigator.clipboard.writeText(absoluteUrl).then(
      () => {
        setCopied(true);
        trackBadgeShare("copy", courseId);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  function handleTwitter() {
    trackBadgeShare("twitter", courseId);
    window.open(
      `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handleLinkedIn() {
    trackBadgeShare("linkedin", courseId);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-400">Share achievement:</span>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-700"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <button
        type="button"
        onClick={handleTwitter}
        className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-700"
      >
        Twitter
      </button>
      <button
        type="button"
        onClick={handleLinkedIn}
        className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-700"
      >
        LinkedIn
      </button>
    </div>
  );
}
