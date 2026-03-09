import type {
  DifficultyLevel,
  ExtractionResult,
  GeneratedChapter,
  LearningPathChapter,
} from "@/lib/engine/types";

export function createNarrationForChapter(params: {
  chapter: LearningPathChapter;
  extraction: ExtractionResult;
  difficulty: DifficultyLevel;
  orderIndex: number;
}): GeneratedChapter {
  const intro =
    params.difficulty === "explorer"
      ? "我们先用直觉抓住这个概念的核心。"
      : params.difficulty === "builder"
        ? "下面把直觉和结构化细节连接起来。"
        : "下面从更接近研究语境的角度展开。";

  const reasoning = params.extraction.thinkingChain
    .slice(0, 2)
    .map((step) => `${step.title}: ${step.rationale}`)
    .join(" ");

  return {
    orderIndex: params.orderIndex,
    title: params.chapter.title,
    subtitle: `Focused on ${params.chapter.concepts.map((concept) => concept.name).join(", ")}`,
    narration: `${intro} ${params.chapter.summary} ${reasoning}`.trim(),
    conceptNames: params.chapter.concepts.map((concept) => concept.name),
    sourceCitations: params.chapter.concepts.map((concept) => `[${concept.name}]`),
  };
}
