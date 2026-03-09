import type {
  CourseStatus,
  DifficultyLevel,
  ExtractionResult,
  GeneratedChapter,
  SourceDocument,
} from "@/lib/engine/types";

export interface SourceRecord {
  id: string;
  type: "paper";
  url: string;
  slug: string;
  title: string;
  authors: string[];
  abstract: string;
  rawContent: SourceDocument;
  conceptGraph: ExtractionResult["conceptGraph"] | null;
  thinkingChain: ExtractionResult["thinkingChain"] | null;
  extractionMeta: ExtractionResult["extractionMeta"] | null;
  extractionStatus: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
}

export interface CourseRecord {
  id: string;
  sourceId: string;
  difficulty: DifficultyLevel;
  language: string;
  status: CourseStatus;
  totalChapters: number | null;
  estimatedMinutes: number | null;
  qualityScores: Record<string, number> | null;
  chapters: GeneratedChapter[];
  blogHtml: string | null;
  podcastUrl: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface GenerationTaskRecord {
  id: string;
  sourceUrl: string;
  difficulty: DifficultyLevel;
  language: string;
  status: CourseStatus;
  courseId: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  /** 总章节数（生成 outline 后设置），用于逐章进度展示 */
  progressTotalChapters: number | null;
  /** 已完成章节数 */
  progressChaptersDone: number | null;
}

export interface CourseWithSourceRecord extends CourseRecord {
  slug: string;
  sourceTitle: string;
  sourceAbstract: string;
  sourceUrl: string;
}

export interface CourseListItem {
  id: string;
  slug: string;
  title: string;
  abstract: string;
  difficulty: DifficultyLevel;
  status: CourseStatus;
  totalChapters: number | null;
  estimatedMinutes: number | null;
  publishedAt: string | null;
}

export interface AppUserRecord {
  id: string;
  clerkUserId: string | null;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  stripeCustomerId: string | null;
  knowledgeLevel: DifficultyLevel;
  preferredLanguage: string;
  referrerId: string | null;
}

export interface AppSubscriptionRecord {
  id: string;
  userId: string;
  plan: "free" | "pro" | "team";
  status: string;
}

export interface UsageQuotaRecord {
  id: string;
  userId: string;
  period: string;
  coursesGenerated: number;
}

export interface CourseProgressRecord {
  id: string;
  userId: string;
  courseId: string;
  chapterId: string;
  chapterIndex: number;
  status: "not_started" | "in_progress" | "completed";
  completedAt: string | null;
  quizScore: number | null;
  quizAnswers: unknown;
}

export interface AchievementRecord {
  id: string;
  userId: string;
  courseId: string;
  achievementType: string;
  badgeImageUrl: string | null;
  shared: boolean;
  createdAt: string;
}

export interface FavoriteRecord {
  userId: string;
  courseId: string;
  createdAt: string;
}

export interface ShortVideoExportRecord {
  id: string;
  courseId: string;
  userId: string;
  status: "queued" | "processing" | "completed" | "failed";
  fileUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MasteredConceptEdge {
  from: string;
  to: string;
  relationType?: string;
}

export interface DashboardSummary {
  completedChapters: number;
  inProgressCourses: number;
  favoritesCount: number;
  currentStreak: number;
  recentCourses: CourseListItem[];
  /** 已掌握概念（来自已完成章节的 concept_names） */
  masteredConcepts: string[];
  /** 已掌握概念之间的边（用于概念图谱可视化） */
  masteredConceptEdges: MasteredConceptEdge[];
}
