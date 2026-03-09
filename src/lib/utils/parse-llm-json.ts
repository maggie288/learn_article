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
 * 解析 LLM 返回的 JSON，兼容常见错误：尾部多余逗号、控制字符、截断等。
 * 用于 narrator、extraction、examiner 等 Agent 的 JSON 输出。
 */
export function parseJsonFromLlm<T = unknown>(raw: string): T {
  let str = raw.trim();

  // 去掉 markdown 代码块包裹
  const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    str = codeBlock[1].trim();
  }

  // 只取第一个完整 { ... } 或 [ ... ]
  const objectMatch = str.match(/^\{[\s\S]*\}/);
  const arrayMatch = str.match(/^\[[\s\S]*\]/);
  const match = objectMatch ?? arrayMatch;
  if (match) {
    str = match[0];
  }

  // 移除尾部逗号：, ] 或 , }（LLM 常犯）
  str = str.replace(/,(\s*[}\]])/g, "$1");

  // 转义字符串字面量内的未转义控制字符（如 \n \r \t），避免 Bad control character
  str = escapeControlCharsInJsonStrings(str);

  try {
    return JSON.parse(str) as T;
  } catch (e) {
    const err = e as SyntaxError;
    const msg =
      err.message && typeof err.message === "string"
        ? err.message
        : "Invalid JSON";
    throw new Error(
      `LLM JSON 解析失败: ${msg}。可能是返回被截断或含非法字符，请重试。`,
      { cause: e },
    );
  }
}
