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
  | "failed"
  | "skeleton";

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
    provider: "anthropic" | "minimax" | "mock";
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

/** 测验题（Examiner Agent 产出） */
export interface QuizQuestion {
  type?: string;
  question: string;
  options: string[];
  correct: string;
  explanation?: string;
}

/** 类比项（Analogist Agent 产出） */
export interface AnalogyItem {
  concept?: string;
  analogy: string;
  limitation?: string;
}

/** 代码片段（Coder Agent 产出） */
export interface CodeSnippet {
  language: string;
  code: string;
  explanation?: string;
}

export interface GeneratedChapter {
  orderIndex: number;
  title: string;
  subtitle?: string;
  narration: string;
  conceptNames: string[];
  sourceCitations: string[];
  /** SVG 描述或 markup（Visualizer Agent） */
  svgComponents?: string[] | Record<string, unknown>[];
  /** 类比列表（Analogist Agent） */
  analogies?: AnalogyItem[];
  /** 测验题（Examiner Agent） */
  quizQuestions?: QuizQuestion[];
  /** 代码片段（Coder Agent，Builder/Researcher） */
  codeSnippets?: CodeSnippet[] | null;
  /** URL to chapter audio (when TTS pipeline is used). */
  audioUrl?: string | null;
  /** Duration in seconds (when TTS pipeline is used). */
  audioDurationSeconds?: number | null;
}

export interface CourseTaskPayload {
  taskId: string;
  sourceUrl: string;
  difficulty: DifficultyLevel;
  language: string;
  /** 为 true 时仅跑骨架生成（第一级），不生成章节正文 */
  skeleton?: boolean;
}
