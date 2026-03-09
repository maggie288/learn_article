/**
 * 思维链压缩指令：减少 output token 40-60%
 * @see docs/paperflow-architecture.md 思维链压缩指令
 */
export const COT_COMPRESSION_INSTRUCTION = `
直接输出结构化结果。不要解释你的推理过程。
不要使用「让我思考一下」「首先我注意到」等过渡语。
如果输出是 JSON，只输出 JSON，不加任何 markdown 包裹或解释。`;
