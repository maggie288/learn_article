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
