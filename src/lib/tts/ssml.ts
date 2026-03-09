/**
 * SSML 韵律预处理：在 TTS 前将叙述文本转为 SSML，便于控制停顿与段落。
 * ElevenLabs 等支持部分 SSML（如 <break>）；不支持的引擎会忽略标签或仅读正文。
 */

const PARAGRAPH_BREAK_SECONDS = 0.4;
const SENTENCE_BREAK_SECONDS = 0.2;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 将纯文本叙述转为 SSML：包在 <speak> 内，段落间插入 <break>，句子间短停顿。
 */
export function narrationToSsml(narration: string): string {
  const trimmed = narration.trim();
  if (!trimmed) return "<speak></speak>";

  const paragraphs = trimmed.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const parts: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]!.trim();
    const escaped = escapeXml(p);
    parts.push(escaped);
    if (i < paragraphs.length - 1) {
      parts.push(`<break time="${PARAGRAPH_BREAK_SECONDS}s"/>`);
    }
  }

  const inner = parts.join(" ");
  return `<speak>${inner}</speak>`;
}

/**
 * 若引擎不支持 SSML，可从 SSML 中提取纯文本（用于回退）。
 */
export function ssmlToPlainText(ssml: string): string {
  return ssml
    .replace(/<speak[^>]*>/gi, "")
    .replace(/<\/speak>/gi, "")
    .replace(/<break[^/]*\/>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
