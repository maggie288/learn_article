import { getGlobalConceptEdges } from "@/lib/db/repositories";
import type { ExtractionResult, LearningPathChapter } from "@/lib/engine/types";

export interface ConnectorResult {
  connections: Array<{ from: string; to: string; relation?: string; explanation?: string }>;
}

/**
 * 将当前章节概念与全局知识图谱建立联系。
 * 合并本论文提取的边与全局 concepts/concept_edges 中的边，去重后返回。
 */
export async function connectorAgent(
  chapter: LearningPathChapter,
  extraction: ExtractionResult,
): Promise<ConnectorResult> {
  const fromNames = new Set(chapter.concepts.map((c) => c.name));
  const key = (a: string, b: string) => `${a}\0${b}`;
  const added = new Set<string>();

  const connections: ConnectorResult["connections"] = [];

  for (const edge of extraction.conceptGraph.edges) {
    if (!fromNames.has(edge.from)) continue;
    const k = key(edge.from, edge.to);
    if (added.has(k)) continue;
    added.add(k);
    connections.push({
      from: edge.from,
      to: edge.to,
      relation: edge.relationType,
      explanation: undefined,
    });
  }

  const globalEdges = await getGlobalConceptEdges(Array.from(fromNames));
  for (const e of globalEdges) {
    const k = key(e.from, e.to);
    if (added.has(k)) continue;
    added.add(k);
    connections.push({
      from: e.from,
      to: e.to,
      relation: e.relationType,
      explanation: undefined,
    });
  }

  return { connections };
}
