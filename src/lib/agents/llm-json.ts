import { unifiedChat } from "@/lib/llm/unified-llm";

export async function callLlmJson<T>(params: {
  system: string;
  user: string;
  parse: (content: string) => T;
}): Promise<T | null> {
  const result = await unifiedChat({
    system: params.system,
    user: params.user,
    maxTokens: 2000,
    temperature: 0.3,
  });
  if (!result) return null;
  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return params.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}
