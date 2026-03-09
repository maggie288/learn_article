import type { CodeSnippet, DifficultyLevel, ExtractionResult, LearningPathChapter } from "@/lib/engine/types";
import { callLlmJson } from "@/lib/agents/llm-json";

const SYSTEM = `你是一位资深工程师。为章节编写代码示例。

Builder 难度：简化的核心代码片段，重在理解思路。
Researcher 难度：可直接运行的完整代码，含注释。

直接输出结构化结果；不要解释推理过程。只输出 JSON，不要 markdown 代码块或解释。
{
  "snippets": [
    { "language": "python", "code": "代码内容", "explanation": "简短说明" }
  ]
}`;

export interface CoderResult {
  snippets: CodeSnippet[];
}

function parseSnippets(jsonStr: string): CodeSnippet[] {
  try {
    const parsed = JSON.parse(jsonStr) as { snippets?: unknown[] };
    if (!Array.isArray(parsed.snippets)) return [];
    return parsed.snippets
      .filter(
        (s): s is { language: string; code: string; explanation?: string } =>
          typeof (s as { language?: string })?.language === "string" && typeof (s as { code?: string })?.code === "string",
      )
      .map((s) => ({ language: s.language, code: s.code, explanation: s.explanation }));
  } catch {
    return [];
  }
}

export async function coderAgent(
  chapter: LearningPathChapter,
  extraction: ExtractionResult,
  difficulty: DifficultyLevel,
): Promise<CoderResult | null> {
  if (difficulty === "explorer") return null;
  const user = JSON.stringify(
    {
      chapterTitle: chapter.title,
      concepts: chapter.concepts.map((c) => ({ name: c.name, definition: c.definition })),
      difficulty,
    },
    null,
    2,
  );
  const out = await callLlmJson<CoderResult>({
    system: SYSTEM,
    user,
    parse: (raw) => ({ snippets: parseSnippets(raw) }),
  });
  return out ? { snippets: out.snippets ?? [] } : null;
}
