/**
 * 将 JSON 字符串字面量内的未转义控制字符转义，避免 "Bad control character in string literal"。
 * 仅处理双引号内的内容，不破坏结构换行。
 */
function escapeControlCharsInJsonStrings(json: string): string {
  let result = "";
  let i = 0;
  let inString = false;
  let escapeNext = false;

  while (i < json.length) {
    const c = json[i]!;

    if (escapeNext) {
      result += c;
      escapeNext = false;
      i++;
      continue;
    }

    if (c === "\\" && inString) {
      result += c;
      escapeNext = true;
      i++;
      continue;
    }

    if (c === '"' && !escapeNext) {
      inString = !inString;
      result += c;
      i++;
      continue;
    }

    if (inString && c >= "\x00" && c <= "\x1f") {
      // 在字符串内：将控制字符转义
      if (c === "\n") result += "\\n";
      else if (c === "\r") result += "\\r";
      else if (c === "\t") result += "\\t";
      else result += `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
      i++;
      continue;
    }

    result += c;
    i++;
  }

  return result;
}

/**
 * 移除 JSON 中多余的连续逗号（仅在不处于字符串内时），避免 "Expected ',' or ']' after array element"。
 */
function removeDuplicateCommas(json: string): string {
  let result = "";
  let i = 0;
  let inString = false;
  let escapeNext = false;
  let afterComma = false; // 上一字符（在结构层面）是否为逗号

  while (i < json.length) {
    const c = json[i]!;

    if (escapeNext) {
      result += c;
      escapeNext = false;
      afterComma = false;
      i++;
      continue;
    }
    if (c === "\\" && inString) {
      result += c;
      escapeNext = true;
      afterComma = false;
      i++;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      result += c;
      afterComma = false;
      i++;
      continue;
    }
    if (inString) {
      result += c;
      afterComma = false;
      i++;
      continue;
    }

    if (c === "," && afterComma) {
      i++;
      continue;
    }
    afterComma = c === ",";
    result += c;
    i++;
  }
  return result;
}

/**
 * 尝试修复被截断的 JSON：在字符串末尾补全未闭合的引号与括号。
 * 仅在不处于字符串内时统计 [ { } ]，避免把字符串内的括号算入。
 */
function repairTruncatedJson(str: string): string {
  const stack: ("]" | "}")[] = [];
  let inString = false;
  let escapeNext = false;
  let i = 0;

  while (i < str.length) {
    const c = str[i]!;

    if (escapeNext) {
      escapeNext = false;
      i++;
      continue;
    }
    if (c === "\\" && inString) {
      escapeNext = true;
      i++;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      i++;
      continue;
    }
    if (inString) {
      i++;
      continue;
    }

    if (c === "[") stack.push("]");
    else if (c === "{") stack.push("}");
    else if (c === "]" || c === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === c) stack.pop();
    }
    i++;
  }

  let repaired = str;
  if (inString) repaired += '"';
  while (stack.length > 0) repaired += stack.pop();
  return repaired;
}

/**
 * 解析 LLM 返回的 JSON，兼容常见错误：尾部多余逗号、控制字符、截断等。
 * 用于 narrator、extraction、examiner 等 Agent 的 JSON 输出。
 */
/**
 * 从 SyntaxError.message 中解析 "position N" 或 "column N"，用于截断重试。
 */
function getPositionFromSyntaxError(err: SyntaxError): number | null {
  const msg = err.message && typeof err.message === "string" ? err.message : "";
  const posMatch = msg.match(/position\s+(\d+)/i) ?? msg.match(/column\s+(\d+)/i);
  if (posMatch) return parseInt(posMatch[1], 10);
  return null;
}

/**
 * 在 position 之前找最后一个「结构层」的逗号（用于截断到上一完整元素）。
 */
function lastCompleteElementEnd(str: string, beforePos: number): number {
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let lastComma = -1;
  let i = 0;
  while (i < beforePos && i < str.length) {
    const c = str[i]!;
    if (escapeNext) {
      escapeNext = false;
      i++;
      continue;
    }
    if (c === "\\" && inString) {
      escapeNext = true;
      i++;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      i++;
      continue;
    }
    if (inString) {
      i++;
      continue;
    }
    if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) lastComma = i;
    i++;
  }
  return lastComma >= 0 ? lastComma : -1;
}

export function parseJsonFromLlm<T = unknown>(raw: string): T {
  let str = raw.trim();
  str = str.replace(/^\uFEFF/, ""); // BOM

  // 去掉 markdown 代码块包裹（允许内容未闭合）
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
  if (codeBlock) {
    str = codeBlock[1].trim();
  }

  // 只取第一个完整 { ... } 或 [ ... ]；若无闭合括号则整段当作可能截断的 JSON
  const objectMatch = str.match(/^\{[\s\S]*\}/);
  const arrayMatch = str.match(/^\[[\s\S]*\]/);
  const match = objectMatch ?? arrayMatch;
  if (match) {
    str = match[0];
  }

  // 移除尾部逗号：, ] 或 , }
  str = str.replace(/,(\s*[}\]])/g, "$1");
  // 移除多余连续逗号（仅结构层）
  str = removeDuplicateCommas(str);
  // 转义字符串字面量内的未转义控制字符
  str = escapeControlCharsInJsonStrings(str);

  const candidates: string[] = [str, repairTruncatedJson(str)];
  let lastError: SyntaxError | null = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (e) {
      lastError = e as SyntaxError;
    }
  }

  // 最后尝试：在报错位置截断，保留到上一完整元素后补全
  const pos = lastError ? getPositionFromSyntaxError(lastError) : null;
  if (pos != null && pos > 0) {
    const truncated = str.slice(0, pos);
    const lastComma = lastCompleteElementEnd(truncated, pos);
    const toParse =
      lastComma >= 0 ? repairTruncatedJson(truncated.slice(0, lastComma)) : repairTruncatedJson(truncated);
    try {
      return JSON.parse(toParse) as T;
    } catch {
      // 保持 lastError 用于最终抛出
    }
  }

  const msg =
    lastError?.message && typeof lastError.message === "string"
      ? lastError.message
      : "Invalid JSON";
  throw new Error(
    `LLM JSON 解析失败: ${msg}。可能是返回被截断或含非法字符，请重试。`,
    { cause: lastError },
  );
}
