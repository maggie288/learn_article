import type {
  ConceptNode,
  DifficultyLevel,
  ExtractionResult,
  LearningPath,
  LearningPathChapter,
} from "@/lib/engine/types";

interface DifficultyConfig {
  estimatedMinutes: number;
  maxConceptsPerChapter: number;
  userLevel: number;
}

const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  explorer: {
    estimatedMinutes: 15,
    maxConceptsPerChapter: 2,
    userLevel: 0.2,
  },
  builder: {
    estimatedMinutes: 30,
    maxConceptsPerChapter: 3,
    userLevel: 0.5,
  },
  researcher: {
    estimatedMinutes: 60,
    maxConceptsPerChapter: 4,
    userLevel: 0.8,
  },
};

export function generateLearningPath(
  extraction: ExtractionResult,
  difficulty: DifficultyLevel,
): LearningPath {
  const config = DIFFICULTY_CONFIGS[difficulty];
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const conceptMap = new Map<string, ConceptNode>();

  for (const concept of extraction.conceptGraph.concepts) {
    conceptMap.set(concept.name, concept);
    inDegree.set(concept.name, 0);
    graph.set(concept.name, []);
  }

  for (const edge of extraction.conceptGraph.edges.filter((item) => item.relationType === "requires")) {
    graph.set(edge.from, [...(graph.get(edge.from) ?? []), edge.to]);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const relevantConcepts = extraction.conceptGraph.concepts.filter(
    (concept) => concept.difficulty <= config.userLevel + 0.3 || concept.isCore,
  );

  const queue = relevantConcepts
    .filter((concept) => (inDegree.get(concept.name) ?? 0) === 0)
    .sort((left, right) => (right.importance ?? 0.5) - (left.importance ?? 0.5));

  const ordered: ConceptNode[] = [];
  const visited = new Set<string>();
  let userLevel = config.userLevel;

  while (queue.length > 0) {
    queue.sort(
      (left, right) =>
        Math.abs(left.difficulty - userLevel) - Math.abs(right.difficulty - userLevel),
    );

    const current = queue.shift();

    if (!current || visited.has(current.name)) {
      continue;
    }

    visited.add(current.name);
    ordered.push(current);
    userLevel = Math.max(userLevel, current.difficulty);

    for (const nextName of graph.get(current.name) ?? []) {
      const nextDegree = (inDegree.get(nextName) ?? 0) - 1;
      inDegree.set(nextName, nextDegree);

      if (nextDegree === 0) {
        const nextConcept = conceptMap.get(nextName);

        if (nextConcept && !visited.has(nextConcept.name)) {
          queue.push(nextConcept);
        }
      }
    }
  }

  const chapters: LearningPathChapter[] = [];
  let currentChapter: ConceptNode[] = [];
  let currentDifficulty = 0;

  for (const concept of ordered) {
    const shouldSplit =
      currentChapter.length >= config.maxConceptsPerChapter ||
      (currentChapter.length > 0 && concept.difficulty - currentDifficulty > 0.2);

    if (shouldSplit) {
      chapters.push(toChapter(currentChapter, chapters.length));
      currentChapter = [];
    }

    currentChapter.push(concept);
    currentDifficulty = concept.difficulty;
  }

  if (currentChapter.length > 0) {
    chapters.push(toChapter(currentChapter, chapters.length));
  }

  return {
    difficulty,
    estimatedMinutes: config.estimatedMinutes,
    chapters,
  };
}

function toChapter(concepts: ConceptNode[], index: number): LearningPathChapter {
  const primary = concepts[0];

  return {
    title: primary ? `${index + 1}. ${primary.name}` : `Chapter ${index + 1}`,
    summary: concepts.map((concept) => concept.definition).join(" "),
    concepts,
  };
}
