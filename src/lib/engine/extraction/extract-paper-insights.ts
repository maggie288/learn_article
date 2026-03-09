import { hasAnyLlmKey, unifiedChat } from "@/lib/llm/unified-llm";
import { serverEnv } from "@/lib/env";
import type { ConceptEdge, ConceptNode, ExtractionResult, SourceDocument } from "@/lib/engine/types";
import { parseJsonFromLlm } from "@/lib/utils/parse-llm-json";

const SYSTEM_PROMPT = `
你是一位资深科学教育家。请阅读论文内容，直接输出结构化结果；不要解释推理过程。只输出 JSON，不要 markdown 包裹或解释。
{
  "concepts": [
    {
      "name": "string",
      "definition": "string",
      "difficulty": 0.0,
      "domain": "string",
      "prerequisites": ["string"],
      "commonMisconceptions": ["string"],
      "importance": 0.5,
      "isCore": true
    }
  ],
  "edges": [
    {
      "from": "string",
      "to": "string",
      "relationType": "requires|related|extends|contrasts",
      "strength": 1.0
    }
  ],
  "externalPrerequisites": ["string"],
  "thinkingChain": [
    {
      "step": 1,
      "title": "string",
      "rationale": "string"
    }
  ]
}
`;

function createMockExtraction(document: SourceDocument): ExtractionResult {
  const sections = document.sections.slice(0, 5);
  const concepts: ConceptNode[] = sections.map((section, index) => ({
    name: section.heading,
    definition: section.content.slice(0, 220),
    difficulty: Math.min(0.2 + index * 0.12, 0.9),
    domain: "paper",
    prerequisites: index === 0 ? [] : [sections[index - 1]?.heading].filter(Boolean),
    commonMisconceptions: [],
    importance: Math.max(0.9 - index * 0.1, 0.4),
    isCore: index < 3,
  }));

  const edges: ConceptEdge[] = concepts.slice(1).map((concept, index) => ({
    from: concepts[index].name,
    to: concept.name,
    relationType: "requires",
    strength: 1,
  }));

  return {
    conceptGraph: {
      concepts,
      edges,
      externalPrerequisites: [],
    },
    thinkingChain: sections.map((section, index) => ({
      step: index + 1,
      title: section.heading,
      rationale: section.content.slice(0, 260),
    })),
    extractionMeta: {
      provider: "mock",
      model: "local-heuristic",
      generatedAt: new Date().toISOString(),
    },
  };
}

function safeParseJson(content: string) {
  const jsonBlock = content.match(/\{[\s\S]*\}/);

  if (!jsonBlock) {
    throw new Error("Model response did not contain JSON.");
  }

  return parseJsonFromLlm(jsonBlock[0]);
}

export async function extractPaperInsights(
  document: SourceDocument,
): Promise<ExtractionResult> {
  if (!hasAnyLlmKey()) {
    return createMockExtraction(document);
  }

  const userPayload = JSON.stringify(
    {
      title: document.metadata.title,
      abstract: document.metadata.abstract,
      sections: document.sections.slice(0, 12),
    },
    null,
    2,
  );

  const result = await unifiedChat({
    system: SYSTEM_PROMPT,
    user: userPayload,
    maxTokens: 4000,
    temperature: 0.1,
  });

  if (!result) {
    return createMockExtraction(document);
  }

  const parsed = safeParseJson(result.text) as {
    concepts: ConceptNode[];
    edges: ConceptEdge[];
    externalPrerequisites?: string[];
    thinkingChain: ExtractionResult["thinkingChain"];
  };

  return {
    conceptGraph: {
      concepts: parsed.concepts,
      edges: parsed.edges,
      externalPrerequisites: parsed.externalPrerequisites ?? [],
    },
    thinkingChain: parsed.thinkingChain,
    extractionMeta: {
      provider: result.provider,
      model: result.model,
      generatedAt: new Date().toISOString(),
    },
  };
}
