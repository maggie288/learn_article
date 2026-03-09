import {
  CALLBACK_INSTRUCTION,
  COLD_OPEN_INSTRUCTION,
  ENHANCED_NARRATOR_SYSTEM,
  EXPLORER_NARRATOR_EXTRA,
} from "@/lib/agents/narrator-prompts";
import { hasAnyLlmKey, unifiedChat } from "@/lib/llm/unified-llm";
import type {
  DifficultyLevel,
  ExtractionResult,
  GeneratedChapter,
  LearningPathChapter,
  SourceDocument,
} from "@/lib/engine/types";

function buildUserMessage(params: {
  chapter: LearningPathChapter;
  extraction: ExtractionResult;
  difficulty: DifficultyLevel;
  sourceDocument: SourceDocument;
  orderIndex: number;
  totalChapters: number;
}): string {
  const { chapter, extraction, difficulty, sourceDocument, orderIndex, totalChapters } = params;
  const difficultyHint =
    difficulty === "explorer"
      ? "用日常生活的类比解释，避免公式和代码。假设读者零基础。" + EXPLORER_NARRATOR_EXTRA
      : difficulty === "builder"
        ? "保留核心公式并给出直觉解释，可含简短代码示例。"
        : "可含完整推导和代码，面向研究者/高级工程师。";

  const narrativeRole: string[] = [];
  if (orderIndex === 0) narrativeRole.push(COLD_OPEN_INSTRUCTION);
  if (orderIndex === totalChapters - 1 && totalChapters > 1) narrativeRole.push(CALLBACK_INSTRUCTION);

  const sectionContext = sourceDocument.sections.slice(0, 12).map((s) => ({
    heading: s.heading,
    content: s.content.slice(0, 400),
  }));

  return JSON.stringify(
    {
      paperTitle: sourceDocument.metadata.title,
      paperAbstract: sourceDocument.metadata.abstract?.slice(0, 500),
      chapterTitle: chapter.title,
      chapterIndex: orderIndex + 1,
      totalChapters,
      narrativeRole: narrativeRole.length > 0 ? narrativeRole.join("\n") : undefined,
      chapterConcepts: chapter.concepts.map((c) => ({
        name: c.name,
        definition: c.definition,
        difficulty: c.difficulty,
      })),
      thinkingChain: extraction.thinkingChain.slice(0, 5),
      sectionContext,
      difficultyHint,
    },
    null,
    2,
  );
}

function parseNarratorResponse(content: string): { text: string; citations: string[] } {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Narrator response did not contain JSON.");
  }
  const parsed = JSON.parse(jsonMatch[0]) as {
    text?: string;
    citations?: Array<{ claim?: string; source_section?: string; source_quote?: string }>;
  };
  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  const citations: string[] = Array.isArray(parsed.citations)
    ? parsed.citations.map(
        (c) =>
          `[${c.source_section ?? "?"}]: ${(c.source_quote ?? c.claim ?? "").slice(0, 120)}`,
      )
    : [];
  return { text, citations };
}

export async function createNarrationForChapterWithLLM(params: {
  chapter: LearningPathChapter;
  extraction: ExtractionResult;
  difficulty: DifficultyLevel;
  orderIndex: number;
  totalChapters: number;
  sourceDocument: SourceDocument;
  language: string;
}): Promise<GeneratedChapter> {
  if (!hasAnyLlmKey()) {
    throw new Error("At least one of ANTHROPIC_API_KEY or MINIMAX_API_KEY is required for LLM narrator.");
  }

  const userMessage = buildUserMessage({
    chapter: params.chapter,
    extraction: params.extraction,
    difficulty: params.difficulty,
    sourceDocument: params.sourceDocument,
    orderIndex: params.orderIndex,
    totalChapters: params.totalChapters,
  });

  const result = await unifiedChat({
    system: ENHANCED_NARRATOR_SYSTEM,
    user: userMessage,
    maxTokens: 3000,
    temperature: 0.3,
  });

  if (!result) {
    throw new Error("LLM returned no response.");
  }

  const { text, citations } = parseNarratorResponse(result.text);

  return {
    orderIndex: params.orderIndex,
    title: params.chapter.title,
    subtitle: `Focused on ${params.chapter.concepts.map((c) => c.name).join(", ")}`,
    narration: text || `${params.chapter.summary}`.trim(),
    conceptNames: params.chapter.concepts.map((c) => c.name),
    sourceCitations: citations.length > 0 ? citations : params.chapter.concepts.map((c) => `[${c.name}]`),
  };
}
