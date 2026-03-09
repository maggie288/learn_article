import type { ExtractionResult } from "@/lib/engine/types";
import type { GeneratedChapter } from "@/lib/engine/types";

/**
 * Layer 5 auto-fix: 针对未通过的检查项修正章节内容，供重新验证。
 * - coverage: 为未在 narration 中出现的概念补充一句定义（从 conceptGraph 取）
 * - prerequisites: 在首章或依赖缺失的章节前补充简短前置说明（不改变顺序，仅补一句）
 * - 其他项（faithfulness / pedagogy / exam_simulation）当前为占位分，此处不修改内容
 */
export function autoFixFailedChapters(
  chapters: GeneratedChapter[],
  failedChecks: string[],
  extraction: ExtractionResult,
): GeneratedChapter[] {
  if (failedChecks.length === 0) return chapters;

  const conceptMap = new Map(
    extraction.conceptGraph.concepts.map((c) => [c.name, c]),
  );
  const allNarrationLower = chapters.map((ch) => ch.narration.toLowerCase()).join(" ");

  const missingConcepts: string[] = [];
  for (const c of extraction.conceptGraph.concepts) {
    if (!allNarrationLower.includes(c.name.toLowerCase())) {
      missingConcepts.push(c.name);
    }
  }

  let next = chapters.map((ch) => ({ ...ch, narration: ch.narration }));

  if (failedChecks.includes("coverage") && missingConcepts.length > 0) {
    next = next.map((ch) => {
      const toAdd = ch.conceptNames.filter(
        (name) =>
          missingConcepts.includes(name) && conceptMap.has(name),
      );
      if (toAdd.length === 0) return ch;
      const supplement = toAdd
        .map((name) => {
          const def = conceptMap.get(name);
          return def
            ? `【补充】${name}：${def.definition}`
            : `【补充】${name}。`;
        })
        .join(" ");
      return {
        ...ch,
        narration: ch.narration.trimEnd() + "\n\n" + supplement,
      };
    });
  }

  if (failedChecks.includes("prerequisites") && extraction.conceptGraph.edges.length > 0) {
    const firstChapterIndex = new Map<string, number>();
    for (const ch of next) {
      for (const name of ch.conceptNames) {
        if (!firstChapterIndex.has(name)) firstChapterIndex.set(name, ch.orderIndex);
      }
    }
    const edges = extraction.conceptGraph.edges;
    const broken: string[] = [];
    for (const e of edges) {
      const fromCh = firstChapterIndex.get(e.from);
      const toCh = firstChapterIndex.get(e.to);
      if (
        fromCh !== undefined &&
        toCh !== undefined &&
        toCh < fromCh
      ) {
        broken.push(`${e.from} 应先于 ${e.to}`);
      }
    }
    if (broken.length > 0) {
      const firstCh = next.find((c) => c.orderIndex === 0);
      if (firstCh) {
        const idx = next.findIndex((c) => c.orderIndex === 0);
        next = [...next];
        next[idx] = {
          ...firstCh,
          narration:
            `【前置说明】学习顺序建议：${broken.slice(0, 3).join("；")}。\n\n` +
            firstCh.narration,
        };
      }
    }
  }

  return next;
}
