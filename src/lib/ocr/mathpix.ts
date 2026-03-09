/**
 * Mathpix 数学公式 OCR（Layer 1 可选）：
 * 将 PDF 或图片中的公式识别为 LaTeX。
 * 配置 MATHPIX_APP_ID + MATHPIX_APP_KEY 后可用。
 * @see https://mathpix.com/docs/convert/endpoints
 */

import { serverEnv } from "@/lib/env";

const MATHPIX_PDF_URL = "https://api.mathpix.com/v3/pdf";

export function isMathpixConfigured(): boolean {
  const id = serverEnv.MATHPIX_APP_ID?.trim();
  const key = serverEnv.MATHPIX_APP_KEY?.trim();
  return Boolean(id && key);
}

export interface MathpixPdfResult {
  /** 任务 ID，用于轮询 v3/pdf-results */
  pdfId: string;
}

/**
 * 提交 PDF 到 Mathpix 进行公式/内容识别（异步任务）。
 * 未配置时返回 null。配置后可调用 Mathpix v3/pdf 并轮询 v3/pdf-results 获取 LaTeX/Markdown。
 */
export async function submitPdfForFormulaOcr(
  pdfBuffer: Buffer,
): Promise<MathpixPdfResult | null> {
  if (!isMathpixConfigured()) return null;

  const id = serverEnv.MATHPIX_APP_ID!.trim();
  const key = serverEnv.MATHPIX_APP_KEY!.trim();

  try {
    const form = new FormData();
    form.append("options_json", JSON.stringify({ conversion_formats: { md: true } }));
    form.append(
      "file",
      new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }),
      "paper.pdf",
    );

    const res = await fetch(MATHPIX_PDF_URL, {
      method: "POST",
      headers: {
        app_id: id,
        app_key: key,
      } as unknown as HeadersInit,
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[mathpix] submit PDF failed", res.status, text);
      return null;
    }

    const data = (await res.json()) as { pdf_id?: string };
    const pdfId = data.pdf_id;
    if (!pdfId) return null;
    return { pdfId };
  } catch (e) {
    console.warn("[mathpix]", e);
    return null;
  }
}
