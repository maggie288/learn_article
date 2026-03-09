export type SourceType = "paper" | "github";

export type DifficultyLevel = "explorer" | "builder" | "researcher";

export type RelationType = "requires" | "related" | "extends" | "contrasts";

export type CourseStatus =
  | "queued"
  | "extracting"
  | "generating"
  | "verifying"
  | "fixing"
  | "published"
  | "failed";

export interface PaperMetadata {
  title: string;
  authors: string[];
  abstract: string;
  publishedAt?: string;
  sourceUrl: string;
}

export interface Section {
  heading: string;
  content: string;
}

export interface SourceDocument {
  type: "paper";
  url: string;
  slug: string;
  metadata: PaperMetadata;
  sections: Section[];
  paragraphs: string[];
  rawText: string;
  fallbackUsed: boolean;
}

export interface ConceptNode {
  name: string;
  definition: string;
  difficulty: number;
  domain: string;
  prerequisites: string[];
  commonMisconceptions: string[];
  importance?: number;
  isCore?: boolean;
}

export interface ConceptEdge {
  from: string;
  to: string;
  relationType: RelationType;
  strength: number;
}

export interface ThinkingStep {
  step: number;
  title: string;
  rationale: string;
}

export interface ExtractionResult {
  conceptGraph: {
    concepts: ConceptNode[];
    edges: ConceptEdge[];
    externalPrerequisites: string[];
  };
  thinkingChain: ThinkingStep[];
  extractionMeta: {
    provider: "anthropic" | "mock";
    model: string;
    generatedAt: string;
  };
}

export interface LearningPathChapter {
  title: string;
  summary: string;
  concepts: ConceptNode[];
}

export interface LearningPath {
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  chapters: LearningPathChapter[];
}

export interface GeneratedChapter {
  orderIndex: number;
  title: string;
  subtitle?: string;
  narration: string;
  conceptNames: string[];
  sourceCitations: string[];
}

export interface CourseTaskPayload {
  taskId: string;
  sourceUrl: string;
  difficulty: DifficultyLevel;
  language: string;
}
