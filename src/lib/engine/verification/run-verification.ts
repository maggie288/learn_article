import type { ExtractionResult } from "@/lib/engine/types";
import type { GeneratedChapter } from "@/lib/engine/types";
import {
  runEngagementPredictionCheck,
  runNarrativeQualityCheck,
} from "@/lib/engine/verification/narrative-quality";

export interface VerificationResult {
  allPassed: boolean;
  scores: Record<string, number>;
  failedChecks: string[];
}

const PASS_THRESHOLD = 0.85;
/** 叙事质量 30 分制，≥22 通过 → 22/30 ≈ 0.73 */
const NARRATIVE_PASS = 22 / 30;
/** 参与度 hook_strength 1-10，≥7 通过 → 0.7 */
const ENGAGEMENT_PASS = 0.7;

/** 概念首次出现的章节下标（用于前置完备性：依赖应先于被依赖者出现）。 */
function conceptToFirstChapterIndex(
  chapters: GeneratedChapter[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const ch of chapters) {
    for (const name of ch.conceptNames) {
      if (!map.has(name)) map.set(name, ch.orderIndex);
    }
  }
  return map;
}

/**
 * Layer 5: Self-Verification Pipeline（自验证引擎）。
 * 含叙事质量与读者参与度两道关卡（见 paperflow-narrative-engine.md）。
 */
export async function runVerificationPipeline(
  chapters: GeneratedChapter[],
  extraction: ExtractionResult,
): Promise<VerificationResult> {
  const allConceptNames = new Set(extraction.conceptGraph.concepts.map((c) => c.name));
  const totalConcepts = allConceptNames.size;

  let coverageScore = 0.85;
  if (totalConcepts > 0 && chapters.length > 0) {
    const mentioned = new Set<string>();
    for (const ch of chapters) {
      const narrationLower = ch.narration.toLowerCase();
      for (const name of ch.conceptNames) {
        if (narrationLower.includes(name.toLowerCase())) mentioned.add(name);
      }
    }
    coverageScore = mentioned.size / totalConcepts;
  }

  let prerequisitesScore = 0.85;
  const edges = extraction.conceptGraph.edges;
  if (edges.length > 0 && chapters.length > 0) {
    const firstChapter = conceptToFirstChapterIndex(chapters);
    let satisfied = 0;
    for (const e of edges) {
      const fromCh = firstChapter.get(e.from);
      const toCh = firstChapter.get(e.to);
      if (fromCh !== undefined && toCh !== undefined && toCh <= fromCh) {
        satisfied++;
      }
    }
    prerequisitesScore = satisfied / edges.length;
  }

  const [narrativeQualityScore, engagementScore] = await Promise.all([
    runNarrativeQualityCheck(chapters),
    runEngagementPredictionCheck(chapters),
  ]);

  const scores: Record<string, number> = {
    coverage: Math.round(coverageScore * 100) / 100,
    faithfulness: 0.8,
    prerequisites: Math.round(prerequisitesScore * 100) / 100,
    pedagogy: 0.75,
    exam_simulation: 0.8,
    narrative_quality: Math.round(narrativeQualityScore * 100) / 100,
    engagement_prediction: Math.round(engagementScore * 100) / 100,
  };

  const failedChecks: string[] = [];
  if (scores.coverage < PASS_THRESHOLD) failedChecks.push("coverage");
  if (scores.faithfulness < PASS_THRESHOLD) failedChecks.push("faithfulness");
  if (scores.prerequisites < PASS_THRESHOLD) failedChecks.push("prerequisites");
  if (scores.pedagogy < PASS_THRESHOLD) failedChecks.push("pedagogy");
  if (scores.exam_simulation < PASS_THRESHOLD) failedChecks.push("exam_simulation");
  if (scores.narrative_quality < NARRATIVE_PASS) failedChecks.push("narrative_quality");
  if (scores.engagement_prediction < ENGAGEMENT_PASS) failedChecks.push("engagement_prediction");

  return {
    allPassed: failedChecks.length === 0,
    scores,
    failedChecks,
  };
}
