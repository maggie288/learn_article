import { ImageResponse } from "next/og";
import { getCourseBySlug } from "@/lib/db/repositories";

export const runtime = "nodejs";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

interface OpenGraphImageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 45%, rgba(14,116,144,1) 100%)",
          color: "white",
          padding: "56px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            color: "#7dd3fc",
            fontSize: 28,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9999,
              background: "#38bdf8",
            }}
          />
          PaperFlow
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>
            {course?.sourceTitle ?? slug}
          </div>
          <div style={{ fontSize: 26, color: "#cbd5e1", lineHeight: 1.4 }}>
            {(course?.sourceAbstract ?? "Structured AI-generated course for papers and code.").slice(
              0,
              180,
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#e2e8f0",
          }}
        >
          <div>{course?.difficulty ?? "explorer"}</div>
          <div>{course?.totalChapters ?? course?.chapters.length ?? 0} chapters</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
