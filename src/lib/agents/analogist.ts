import type { AnalogyItem, DifficultyLevel, ExtractionResult, LearningPathChapter } from "@/lib/engine/types";
import { callLlmJson } from "@/lib/agents/llm-json";

const SYSTEM = `你是一位类比大师。为抽象概念找到完美的生活类比。

好类比的标准：具体（五感可体验）、准确（映射正确）、有限（说明类比在哪里破裂）、文化通用。
为每个概念提供候选类比，按准确性排序。
直接输出结构化结果；不要解释推理过程。只输出 JSON，不要 markdown 代码块或解释。
{
  "selected": [
    { "concept": "概念名", "analogy": "类比描述", "limitation": "类比局限" }
  ]
}`;

export interface AnalogistResult {
  selected: AnalogyItem[];
}

function parseSelected(jsonStr: string): AnalogyItem[] {
  try {
    const parsed = JSON.parse(jsonStr) as { selected?: unknown[] };
    if (!Array.isArray(parsed.selected)) return [];
    return parsed.selected
      .filter((s): s is { concept?: string; analogy: string; limitation?: string } => typeof (s as { analogy?: string })?.analogy === "string")
      .map((s) => ({ concept: s.concept, analogy: s.analogy, limitation: s.limitation }));
  } catch {
    return [];
  }
}

export async function analogistAgent(
  chapter: LearningPathChapter,
  _extraction: ExtractionResult,
  _difficulty: DifficultyLevel,
): Promise<AnalogistResult> {
  const user = JSON.stringify(
    { chapterTitle: chapter.title, concepts: chapter.concepts.map((c) => ({ name: c.name, definition: c.definition })) },
    null,
    2,
  );
  const out = await callLlmJson<AnalogistResult>({
    system: SYSTEM,
    user,
    parse: (raw) => ({ selected: parseSelected(raw) }),
  });
  return { selected: out?.selected ?? [] };
}
