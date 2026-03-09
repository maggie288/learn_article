import { ENHANCED_VISUALIZER_SYSTEM } from "@/lib/agents/visualizer-prompts";
import { callLlmJson } from "@/lib/agents/llm-json";
import type { DifficultyLevel, ExtractionResult, LearningPathChapter } from "@/lib/engine/types";

export interface VisualizerResult {
  components: Record<string, unknown>[];
}

function parseComponents(jsonStr: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(jsonStr) as { components?: unknown[] };
    if (!Array.isArray(parsed.components)) return [];
    return parsed.components.filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null);
  } catch {
    return [];
  }
}

export async function visualizerAgent(
  chapter: LearningPathChapter,
  _extraction: ExtractionResult,
  _difficulty: DifficultyLevel,
): Promise<VisualizerResult> {
  const user = JSON.stringify(
    { chapterTitle: chapter.title, concepts: chapter.concepts.map((c) => ({ name: c.name, definition: c.definition })) },
    null,
    2,
  );
  const out = await callLlmJson<VisualizerResult>({
    system: ENHANCED_VISUALIZER_SYSTEM,
    user,
    parse: (raw) => ({ components: parseComponents(raw) }),
  });
  return { components: out?.components ?? [] };
}
