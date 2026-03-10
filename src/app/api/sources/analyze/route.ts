import { NextResponse } from "next/server";
import { z } from "zod";
import { extractPaperInsights } from "@/lib/engine/extraction/extract-paper-insights";
import { ingestPaperFromUrl } from "@/lib/engine/ingestion/paper";
import { err, ok } from "@/lib/types/api";

/** 拉取 + 解析论文并做洞察提取，LLM 调用可能较久 */
export const maxDuration = 60;

const analyzeSchema = z.object({
  sourceUrl: z.string().url(),
});

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = analyzeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      err("INVALID_REQUEST", "Invalid analyze payload.", parsed.error.flatten()),
      { status: 400 },
    );
  }

  const document = await ingestPaperFromUrl(parsed.data.sourceUrl);
  const extraction = await extractPaperInsights(document);

  return NextResponse.json(
    ok({
      source: document,
      extraction,
    }),
  );
}
