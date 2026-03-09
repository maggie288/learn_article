/**
 * Strip script/HTML remnants from narration (e.g. from ar5iv HTML fallback ingestion).
 * Keeps plain text and normalizes whitespace.
 */
export function sanitizeNarration(narration: string): string {
  if (!narration || typeof narration !== "string") return "";

  return narration
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/function\s+detectColorScheme\s*\([^)]*\)\s*\{[\s\S]*?\}\s*detectColorScheme\s*\(\)\s*;/gi, " ")
    .replace(/function\s+toggleColorScheme\s*\([^)]*\)\s*\{[\s\S]*?\}\s*;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MAX_PARAGRAPH_CHARS = 520;
const SENTENCE_END = /[.!?]\s+/;

/**
 * Split narration into paragraphs for display. Uses existing double newlines first;
 * if a block is too long (e.g. from ar5iv single-line dump), splits by sentences
 * into readable chunks so the page doesn't show one giant paragraph.
 */
export function splitNarrationIntoParagraphs(narration: string): string[] {
  const safe = sanitizeNarration(narration);
  if (!safe) return [];

  const blocks = safe.split(/\n\n+/).filter(Boolean);
  const result: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.length <= MAX_PARAGRAPH_CHARS) {
      result.push(trimmed);
      continue;
    }

    const sentences = trimmed.split(SENTENCE_END).filter(Boolean);
    if (sentences.length <= 1) {
      result.push(trimmed);
      continue;
    }

    let chunk = "";
    for (let i = 0; i < sentences.length; i++) {
      const s = sentences[i];
      const withEnd = i < sentences.length - 1 && !/[-.!?]$/.test(s) ? s + "." : s;
      const next = chunk ? `${chunk} ${withEnd}` : withEnd;

      if (next.length >= MAX_PARAGRAPH_CHARS && chunk) {
        result.push(chunk.trim());
        chunk = withEnd;
      } else {
        chunk = next;
      }
    }
    if (chunk.trim()) result.push(chunk.trim());
  }

  return result;
}
