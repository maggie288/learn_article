/**
 * 解析 LLM 返回的 JSON，兼容常见错误：尾部多余逗号、截断等。
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
