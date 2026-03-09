import type { GeneratedChapter } from "@/lib/engine/types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Layer 6: 从引擎产出的章节生成博客长文 HTML。
 * 各章 narration 按顺序拼接，每章为 section，便于 SEO 与独立阅读。
 * @param fragment 为 true 时只返回 <article> 片段，便于嵌入页面；为 false 时返回完整 HTML 文档（用于 API/导出）。
 */
export function renderBlogFromChapters(
  chapters: Pick<GeneratedChapter, "orderIndex" | "title" | "subtitle" | "narration">[],
  options?: { courseTitle?: string; language?: string; fragment?: boolean },
): string {
  const title = options?.courseTitle ? escapeHtml(options.courseTitle) : "Course";
  const parts: string[] = [`<article class="blog-article">`, `<header><h1>${title}</h1></header>`];

  for (const ch of chapters) {
    const chTitle = escapeHtml(ch.title);
    const chSub = ch.subtitle ? `<p class="subtitle">${escapeHtml(ch.subtitle)}</p>` : "";
    const paragraphs = ch.narration
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("\n");
    parts.push(
      `<section id="chapter-${ch.orderIndex + 1}" aria-label="${chTitle}">`,
      `<h2>Chapter ${ch.orderIndex + 1}: ${chTitle}</h2>`,
      chSub,
      paragraphs,
      `</section>`,
    );
  }

  parts.push(`</article>`);

  if (options?.fragment === false) {
    const lang = options?.language ?? "zh-CN";
    return [
      `<!DOCTYPE html>`,
      `<html lang="${lang === "zh-CN" ? "zh-CN" : "en"}">`,
      `<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>`,
      `<title>${title}</title>`,
      `<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:1.5rem;line-height:1.6;color:#1e293b;}h1{font-size:1.5rem;}h2{font-size:1.25rem;margin-top:2rem;}section{margin-bottom:2rem;}p{white-space:pre-wrap;}</style>`,
      `</head><body>`,
      parts.join("\n"),
      `</body></html>`,
    ].join("\n");
  }

  return parts.join("\n");
}
