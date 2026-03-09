import { NextResponse } from "next/server";
import { getCourseById, getCourseSlugById, getSourceById } from "@/lib/db/repositories";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** GET /api/courses/:id/podcast/rss — 播客 RSS feed，供 Apple Podcasts / 小宇宙等订阅。 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { params } = context;
  const { id } = await params;
  const course = await getCourseById(id);

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const hasChapterAudio = course.chapters?.some(
    (ch: { audioUrl?: string | null }) => ch.audioUrl,
  );
  if (!course.podcastUrl && !hasChapterAudio) {
    return NextResponse.json(
      { error: "Podcast not ready", message: "No audio URL for this course." },
      { status: 503 },
    );
  }

  const source = course.sourceId ? await getSourceById(course.sourceId) : null;
  const slug = await getCourseSlugById(id);
  const origin = new URL(request.url).origin;
  const courseUrl = slug ? `${origin}/paper/${slug}` : `${origin}/course/${id}`;
  const title = source?.title ?? `Course ${id}`;
  const description = source?.abstract ?? `Course podcast: ${title}`;

  const items: string[] = [];
  if (hasChapterAudio && Array.isArray(course.chapters)) {
    for (const ch of course.chapters as { title?: string; audioUrl?: string | null }[]) {
      if (!ch.audioUrl) continue;
      const enclosureUrl = ch.audioUrl.startsWith("http")
        ? ch.audioUrl
        : `${origin}${ch.audioUrl}`;
      items.push(
        "<item>",
        `<title>${escapeXml(ch.title ?? "Chapter")}</title>`,
        `<link>${escapeXml(courseUrl)}</link>`,
        `<description>${escapeXml(ch.title ?? "Chapter")}</description>`,
        `<enclosure url="${escapeXml(enclosureUrl)}" type="audio/mpeg" />`,
        "</item>",
      );
    }
  }
  if (items.length === 0 && course.podcastUrl?.startsWith("http")) {
    const enclosureUrl = course.podcastUrl;
    items.push(
      "<item>",
      `<title>${escapeXml(title)} (full course)</title>`,
      `<link>${escapeXml(courseUrl)}</link>`,
      `<description>${escapeXml(description)}</description>`,
      `<enclosure url="${escapeXml(enclosureUrl)}" type="audio/mpeg" />`,
      "</item>",
    );
  }
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Podcast not ready", message: "No audio URL for this course." },
      { status: 503 },
    );
  }

  const rss = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">',
    "<channel>",
    `<title>${escapeXml(title)}</title>`,
    `<link>${escapeXml(courseUrl)}</link>`,
    `<description>${escapeXml(description)}</description>`,
    `<language>${course.language === "zh-CN" ? "zh-cn" : "en"}</language>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
