import { randomUUID } from "node:crypto";
import { deleteCacheKeys, getJsonCache, setJsonCache } from "@/lib/cache/json-cache";
import { getSupabaseAdminClient } from "@/lib/db/client";
import type {
  AchievementRecord,
  AppSubscriptionRecord,
  AppUserRecord,
  CourseRecord,
  CourseListItem,
  CourseProgressRecord,
  CourseWithSourceRecord,
  DashboardSummary,
  FavoriteRecord,
  GenerationTaskRecord,
  ShortVideoExportRecord,
  SourceRecord,
  UsageQuotaRecord,
} from "@/lib/db/types";
import type {
  CourseStatus,
  DifficultyLevel,
  ExtractionResult,
  GeneratedChapter,
  LearningPath,
  LearningPathChapter,
  SourceDocument,
} from "@/lib/engine/types";

const sourceStore = new Map<string, SourceRecord>();
const courseStore = new Map<string, CourseRecord>();
const taskStore = new Map<string, GenerationTaskRecord>();
const userStore = new Map<string, AppUserRecord>();
const subscriptionStore = new Map<string, AppSubscriptionRecord>();
const usageQuotaStore = new Map<string, UsageQuotaRecord>();
const progressStore = new Map<string, CourseProgressRecord>();
const favoriteStore = new Map<string, FavoriteRecord>();

const COURSE_CACHE_TTL_SECONDS = 60 * 60;
const COURSE_LIST_CACHE_TTL_SECONDS = 60 * 60;

function getCourseCacheKey(courseId: string) {
  return `course:${courseId}`;
}

function getCourseBySlugCacheKey(slug: string) {
  return `course:slug:${slug}`;
}

function getPublishedCoursesCacheKey(limit: number) {
  return `courses:published:${limit}`;
}

function getPublishedCourseListInvalidationKeys() {
  return [
    getPublishedCoursesCacheKey(6),
    getPublishedCoursesCacheKey(12),
    getPublishedCoursesCacheKey(24),
    getPublishedCoursesCacheKey(1000),
    "sitemap",
  ];
}

function toSourceRecord(row: Record<string, unknown>): SourceRecord {
  return {
    id: String(row.id),
    type: "paper",
    url: String(row.url),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    authors: Array.isArray(row.authors) ? (row.authors as string[]) : [],
    abstract: String(row.abstract ?? ""),
    rawContent: row.raw_content as SourceDocument,
    conceptGraph: (row.concept_graph as SourceRecord["conceptGraph"]) ?? null,
    thinkingChain: (row.thinking_chain as SourceRecord["thinkingChain"]) ?? null,
    extractionMeta: (row.extraction_meta as SourceRecord["extractionMeta"]) ?? null,
    extractionStatus: (row.extraction_status as SourceRecord["extractionStatus"]) ?? "pending",
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function toCourseRecord(
  row: Record<string, unknown>,
  chapters: GeneratedChapter[] = [],
): CourseRecord {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    difficulty: row.difficulty as DifficultyLevel,
    language: String(row.language ?? "zh-CN"),
    status: row.status as CourseStatus,
    totalChapters:
      typeof row.total_chapters === "number"
        ? row.total_chapters
        : Number(row.total_chapters ?? 0),
    estimatedMinutes:
      typeof row.estimated_minutes === "number"
        ? row.estimated_minutes
        : Number(row.estimated_minutes ?? 0),
    qualityScores: (row.quality_scores as Record<string, number> | null) ?? null,
    chapters,
    blogHtml: row.blog_html ? String(row.blog_html) : null,
    podcastUrl: row.podcast_url ? String(row.podcast_url) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    publishedAt: row.published_at ? String(row.published_at) : null,
  };
}

function toTaskRecord(row: Record<string, unknown>): GenerationTaskRecord {
  return {
    id: String(row.id),
    sourceUrl: String(row.source_url),
    difficulty: row.difficulty as DifficultyLevel,
    language: String(row.language ?? "zh-CN"),
    status: row.status as CourseStatus,
    courseId: row.course_id ? String(row.course_id) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
    progressTotalChapters:
      typeof row.progress_total_chapters === "number" ? row.progress_total_chapters : null,
    progressChaptersDone:
      typeof row.progress_chapters_done === "number" ? row.progress_chapters_done : null,
  };
}

function toAppUserRecord(row: Record<string, unknown>): AppUserRecord {
  return {
    id: String(row.id),
    clerkUserId: row.clerk_user_id ? String(row.clerk_user_id) : null,
    email: String(row.email ?? ""),
    name: row.name ? String(row.name) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null,
    knowledgeLevel: (row.knowledge_level as DifficultyLevel) ?? "explorer",
    preferredLanguage: String(row.preferred_language ?? "zh-CN"),
    referrerId: row.referrer_id ? String(row.referrer_id) : null,
  };
}

function toSubscriptionRecord(row: Record<string, unknown>): AppSubscriptionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    plan: (row.plan as AppSubscriptionRecord["plan"]) ?? "free",
    status: String(row.status ?? "inactive"),
  };
}

function toUsageQuotaRecord(row: Record<string, unknown>): UsageQuotaRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    period: String(row.period),
    coursesGenerated:
      typeof row.courses_generated === "number"
        ? row.courses_generated
        : Number(row.courses_generated ?? 0),
  };
}

function toProgressRecord(
  row: Record<string, unknown>,
  chapterIndex: number,
): CourseProgressRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    courseId: String(row.course_id),
    chapterId: String(row.chapter_id),
    chapterIndex,
    status: (row.status as CourseProgressRecord["status"]) ?? "not_started",
    completedAt: row.completed_at ? String(row.completed_at) : null,
    quizScore: typeof row.quiz_score === "number" ? row.quiz_score : null,
    quizAnswers: row.quiz_answers ?? null,
  };
}

function toFavoriteRecord(row: Record<string, unknown>): FavoriteRecord {
  return {
    userId: String(row.user_id),
    courseId: String(row.course_id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function upsertSourceDocument(document: SourceDocument) {
  const sourceRecord: SourceRecord = {
    id: randomUUID(),
    type: "paper",
    url: document.url,
    slug: document.slug,
    title: document.metadata.title,
    authors: document.metadata.authors,
    abstract: document.metadata.abstract,
    rawContent: document,
    conceptGraph: null,
    thinkingChain: null,
    extractionMeta: null,
    extractionStatus: "processing",
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("sources")
      .upsert(
        {
          id: sourceRecord.id,
          type: sourceRecord.type,
          url: sourceRecord.url,
          slug: sourceRecord.slug,
          title: sourceRecord.title,
          authors: sourceRecord.authors,
          abstract: sourceRecord.abstract,
          raw_content: sourceRecord.rawContent,
          extraction_status: sourceRecord.extractionStatus,
        },
        { onConflict: "url" },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    const persisted = toSourceRecord(data);
    sourceStore.set(document.url, persisted);
    return persisted;
  }

  sourceStore.set(document.url, sourceRecord);
  return sourceRecord;
}

export async function saveExtractionResult(sourceUrl: string, extraction: ExtractionResult) {
  const supabase = getSupabaseAdminClient();
  const source =
    sourceStore.get(sourceUrl) ??
    (supabase
      ? await supabase
          .from("sources")
          .select("*")
          .eq("url", sourceUrl)
          .single()
          .then(({ data }) => (data ? toSourceRecord(data) : null))
      : null);

  if (!source) {
    throw new Error(`Source not found for ${sourceUrl}`);
  }

  const updated: SourceRecord = {
    ...source,
    conceptGraph: extraction.conceptGraph,
    thinkingChain: extraction.thinkingChain,
    extractionMeta: extraction.extractionMeta,
    extractionStatus: "completed",
  };

  sourceStore.set(sourceUrl, updated);

  if (supabase) {
    const { error } = await supabase
      .from("sources")
      .update({
        concept_graph: updated.conceptGraph,
        thinking_chain: updated.thinkingChain,
        extraction_meta: updated.extractionMeta,
        extraction_status: updated.extractionStatus,
      })
      .eq("id", source.id);

    if (error) {
      throw error;
    }
  }

  return updated;
}

/**
 * Merge extraction concept graph into global concepts and concept_edges tables.
 * 每处理一篇论文，全局概念图谱增长（架构 1.4 护城河：累积知识图谱）。
 */
export async function updateGlobalConceptGraph(
  conceptGraph: ExtractionResult["conceptGraph"],
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const names = conceptGraph.concepts.map((c) => c.name);
  for (const c of conceptGraph.concepts) {
    await supabase.from("concepts").upsert(
      {
        name: c.name,
        domain: c.domain ?? null,
        difficulty_level: c.difficulty,
        description: c.definition ?? null,
        common_misconceptions: Array.isArray(c.commonMisconceptions) ? c.commonMisconceptions : [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" },
    );
  }

  const { data: conceptRows } = await supabase
    .from("concepts")
    .select("id, name")
    .in("name", names);
  const nameToId = new Map<string, string>();
  for (const r of conceptRows ?? []) {
    nameToId.set(String(r.name), String(r.id));
  }

  for (const e of conceptGraph.edges) {
    const fromId = nameToId.get(e.from);
    const toId = nameToId.get(e.to);
    if (!fromId || !toId) continue;

    await supabase.from("concept_edges").upsert(
      {
        from_concept_id: fromId,
        to_concept_id: toId,
        relation_type: e.relationType ?? null,
        strength: typeof e.strength === "number" ? e.strength : 1,
      },
      { onConflict: "from_concept_id,to_concept_id" },
    );
  }
}

/** 按概念名查询全局概念图中的边（用于 Connector Agent 等）。 */
export async function getGlobalConceptEdges(
  conceptNames: string[],
): Promise<Array<{ from: string; to: string; relationType?: string }>> {
  const supabase = getSupabaseAdminClient();
  if (!supabase || conceptNames.length === 0) {
    return [];
  }

  const { data: conceptRows } = await supabase
    .from("concepts")
    .select("id, name")
    .in("name", conceptNames);
  const idToName = new Map<string, string>();
  const ids: string[] = [];
  for (const r of conceptRows ?? []) {
    const id = String(r.id);
    idToName.set(id, String(r.name));
    ids.push(id);
  }
  if (ids.length === 0) return [];

  const [fromEdges, toEdges] = await Promise.all([
    supabase.from("concept_edges").select("from_concept_id, to_concept_id, relation_type").in("from_concept_id", ids),
    supabase.from("concept_edges").select("from_concept_id, to_concept_id, relation_type").in("to_concept_id", ids),
  ]);
  const seen = new Set<string>();
  const edgeRows = [...(fromEdges.data ?? []), ...(toEdges.data ?? [])].filter((e) => {
    const key = `${e.from_concept_id}-${e.to_concept_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result: Array<{ from: string; to: string; relationType?: string }> = [];
  for (const e of edgeRows ?? []) {
    const fromName = idToName.get(String(e.from_concept_id));
    const toName = idToName.get(String(e.to_concept_id));
    if (fromName && toName) {
      result.push({
        from: fromName,
        to: toName,
        relationType: e.relation_type ?? undefined,
      });
    }
  }
  return result;
}

const VERIFICATION_CHECK_IDS = [
  "coverage",
  "faithfulness",
  "prerequisites",
  "pedagogy",
  "exam_simulation",
  "narrative_quality",
  "engagement_prediction",
] as const;

/** 自验证结果写入 verification_logs 表，便于审计与后续修复。 */
export async function writeVerificationLogs(
  courseId: string,
  scores: Record<string, number>,
  passThreshold = 0.85,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  for (const checkType of VERIFICATION_CHECK_IDS) {
    const score = scores[checkType];
    if (score === undefined) continue;
    const passed = score >= passThreshold;
    await supabase.from("verification_logs").insert({
      course_id: courseId,
      check_type: checkType,
      score,
      details: null,
      passed,
      model_used: null,
    });
  }
}

export async function getSourceRecord(sourceUrl: string) {
  const cached = sourceStore.get(sourceUrl);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from("sources").select("*").eq("url", sourceUrl).single();
  if (!data) {
    return null;
  }

  const source = toSourceRecord(data);
  sourceStore.set(source.url, source);
  return source;
}

export async function getSourceById(sourceId: string) {
  const cached = Array.from(sourceStore.values()).find((source) => source.id === sourceId);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from("sources").select("*").eq("id", sourceId).maybeSingle();
  if (!data) {
    return null;
  }

  const source = toSourceRecord(data);
  sourceStore.set(source.url, source);
  return source;
}

export async function findPublishedCourseBySourceUrlAndDifficulty(
  sourceUrl: string,
  difficulty: DifficultyLevel,
) {
  const source = await getSourceRecord(sourceUrl);
  if (!source) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("source_id", source.id)
      .eq("difficulty", difficulty)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? toCourseRecord(data) : null;
  }

  const course = Array.from(courseStore.values()).find(
    (item) =>
      item.sourceId === source.id &&
      item.difficulty === difficulty &&
      item.status === "published",
  );

  return course ?? null;
}

export async function findActiveGenerationTask(
  sourceUrl: string,
  difficulty: DifficultyLevel,
) {
  const activeStatuses: CourseStatus[] = [
    "queued",
    "extracting",
    "generating",
    "verifying",
    "fixing",
  ];

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data } = await supabase
      .from("generation_tasks")
      .select("*")
      .eq("source_url", sourceUrl)
      .eq("difficulty", difficulty)
      .in("status", activeStatuses)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? toTaskRecord(data) : null;
  }

  const task = Array.from(taskStore.values())
    .filter(
      (item) =>
        item.sourceUrl === sourceUrl &&
        item.difficulty === difficulty &&
        activeStatuses.includes(item.status),
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

  return task ?? null;
}

export async function createGenerationTask(params: {
  sourceUrl: string;
  difficulty: DifficultyLevel;
  language: string;
}) {
  const task: GenerationTaskRecord = {
    id: randomUUID(),
    sourceUrl: params.sourceUrl,
    difficulty: params.difficulty,
    language: params.language,
    status: "queued",
    courseId: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progressTotalChapters: null,
    progressChaptersDone: null,
  };

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("generation_tasks")
      .insert({
        id: task.id,
        source_url: task.sourceUrl,
        difficulty: task.difficulty,
        language: task.language,
        status: task.status,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const persisted = toTaskRecord(data);
    taskStore.set(persisted.id, persisted);
    return persisted;
  }

  taskStore.set(task.id, task);
  return task;
}

export async function updateGenerationTask(
  taskId: string,
  patch: Partial<
    Pick<
      GenerationTaskRecord,
      "status" | "courseId" | "errorMessage" | "progressTotalChapters" | "progressChaptersDone"
    >
  >,
) {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.courseId !== undefined) updatePayload.course_id = patch.courseId;
    if (patch.errorMessage !== undefined) updatePayload.error_message = patch.errorMessage;
    if (patch.progressTotalChapters !== undefined)
      updatePayload.progress_total_chapters = patch.progressTotalChapters;
    if (patch.progressChaptersDone !== undefined)
      updatePayload.progress_chapters_done = patch.progressChaptersDone;

    const { data, error } = await supabase
      .from("generation_tasks")
      .update(updatePayload)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const persisted = toTaskRecord(data);
    taskStore.set(taskId, persisted);
    return persisted;
  }

  const task = taskStore.get(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  const nextTask: GenerationTaskRecord = {
    ...task,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  taskStore.set(taskId, nextTask);
  return nextTask;
}

export async function getGenerationTask(taskId: string) {
  const cached = taskStore.get(taskId);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from("generation_tasks").select("*").eq("id", taskId).single();
  if (!data) {
    return null;
  }

  const task = toTaskRecord(data);
  taskStore.set(task.id, task);
  return task;
}

export async function createCourseShell(params: {
  sourceId: string;
  difficulty: DifficultyLevel;
  language: string;
  path: LearningPath;
}) {
  const id = randomUUID();
  const course: CourseRecord = {
    id,
    sourceId: params.sourceId,
    difficulty: params.difficulty,
    language: params.language,
    status: "generating",
    totalChapters: params.path.chapters.length,
    estimatedMinutes: params.path.estimatedMinutes,
    qualityScores: null,
    chapters: [],
    blogHtml: null,
    podcastUrl: null,
    createdAt: new Date().toISOString(),
    publishedAt: null,
  };

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("courses")
      .insert({
        id,
        source_id: params.sourceId,
        difficulty: params.difficulty,
        language: params.language,
        status: course.status,
        total_chapters: course.totalChapters,
        estimated_minutes: course.estimatedMinutes,
        path_config: params.path,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const persisted = toCourseRecord(data);
    courseStore.set(id, persisted);
    return persisted;
  }

  courseStore.set(id, course);
  return course;
}

/** 骨架课程：插入仅含标题与概念的章节占位，narration 为空，供按需生成。 */
export async function insertSkeletonChapters(
  courseId: string,
  path: LearningPath,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const rows = path.chapters.map((ch, i) => ({
    course_id: courseId,
    order_index: i,
    title: ch.title,
    subtitle: null,
    narration: "",
    concept_names: ch.concepts.map((c) => c.name),
    source_citations: [],
    analogies: null,
    quiz_questions: null,
    code_snippets: null,
    svg_components: null,
    audio_url: null,
    audio_duration_seconds: null,
  }));
  const { error } = await supabase.from("chapters").insert(rows);
  if (error) throw error;
}

/** 从 SourceRecord 还原 ExtractionResult（用于按需章节生成）。 */
export function buildExtractionFromSource(source: SourceRecord): ExtractionResult | null {
  if (!source.conceptGraph || source.extractionStatus !== "completed") return null;
  return {
    conceptGraph: source.conceptGraph,
    thinkingChain: source.thinkingChain ?? [],
    extractionMeta: source.extractionMeta ?? {
      provider: "mock",
      model: "",
      generatedAt: new Date().toISOString(),
    },
  };
}

/** 读取课程的 path_config（用于按需章节生成时取 path.chapters[i]）。 */
export async function getCoursePathConfig(
  courseId: string,
): Promise<LearningPath | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("courses")
    .select("path_config")
    .eq("id", courseId)
    .single();
  const raw = data?.path_config;
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const chapters = Array.isArray(obj.chapters)
    ? (obj.chapters as LearningPathChapter[]).filter(
        (c): c is LearningPathChapter =>
          c != null &&
          typeof c === "object" &&
          typeof (c as { title?: unknown }).title === "string" &&
          Array.isArray((c as { concepts?: unknown }).concepts),
      )
    : [];
  return {
    difficulty: (obj.difficulty as DifficultyLevel) ?? "explorer",
    estimatedMinutes: typeof obj.estimatedMinutes === "number" ? obj.estimatedMinutes : 0,
    chapters,
  };
}

/** 更新或插入单章（按需生成后写入）。 */
export async function upsertChapter(
  courseId: string,
  chapter: GeneratedChapter,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const { data: existing } = await supabase
    .from("chapters")
    .select("id")
    .eq("course_id", courseId)
    .eq("order_index", chapter.orderIndex)
    .maybeSingle();

  const row = {
    course_id: courseId,
    order_index: chapter.orderIndex,
    title: chapter.title,
    subtitle: chapter.subtitle ?? null,
    narration: chapter.narration,
    concept_names: chapter.conceptNames,
    source_citations: chapter.sourceCitations ?? [],
    analogies: chapter.analogies ?? null,
    quiz_questions: chapter.quizQuestions ?? null,
    code_snippets: chapter.codeSnippets ?? null,
    svg_components: chapter.svgComponents ?? null,
    audio_url: chapter.audioUrl ?? null,
    audio_duration_seconds: chapter.audioDurationSeconds ?? null,
  };

  if (existing?.id) {
    await supabase.from("chapters").update(row).eq("id", existing.id);
  } else {
    await supabase.from("chapters").insert(row);
  }

  courseStore.delete(courseId);
  await deleteCacheKeys([getCourseCacheKey(courseId)]);
}

export async function publishCourse(params: {
  courseId: string;
  chapters: GeneratedChapter[];
  qualityScores?: Record<string, number>;
  blogHtml?: string | null;
  podcastUrl?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const course =
    courseStore.get(params.courseId) ??
    (supabase
      ? await supabase
          .from("courses")
          .select("*")
          .eq("id", params.courseId)
          .single()
          .then(({ data }) => (data ? toCourseRecord(data) : null))
      : null);

  if (!course) {
    throw new Error(`Course ${params.courseId} not found`);
  }

  const published: CourseRecord = {
    ...course,
    status: "published",
    qualityScores: params.qualityScores ?? null,
    chapters: params.chapters,
    blogHtml: params.blogHtml ?? course.blogHtml ?? null,
    podcastUrl: params.podcastUrl ?? course.podcastUrl ?? null,
    publishedAt: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase
      .from("courses")
      .update({
        status: published.status,
        quality_scores: published.qualityScores,
        published_at: published.publishedAt,
        blog_html: published.blogHtml,
        podcast_url: published.podcastUrl,
      })
      .eq("id", course.id);

    if (error) {
      throw error;
    }

    if (params.chapters.length > 0) {
      await supabase.from("chapters").delete().eq("course_id", course.id);

      const { error: chapterError } = await supabase.from("chapters").insert(
        params.chapters.map((chapter) => ({
          course_id: course.id,
          order_index: chapter.orderIndex,
          title: chapter.title,
          subtitle: chapter.subtitle ?? null,
          narration: chapter.narration,
          concept_names: chapter.conceptNames,
          source_citations: chapter.sourceCitations,
          analogies: chapter.analogies ?? null,
          quiz_questions: chapter.quizQuestions ?? null,
          code_snippets: chapter.codeSnippets ?? null,
          svg_components: chapter.svgComponents ?? null,
          audio_url: chapter.audioUrl ?? null,
          audio_duration_seconds: chapter.audioDurationSeconds ?? null,
        })),
      );

      if (chapterError) {
        throw chapterError;
      }
    }
  }

  courseStore.set(course.id, published);

  const source = await getSourceById(course.sourceId);
  await deleteCacheKeys([
    getCourseCacheKey(course.id),
    ...(source?.slug
      ? [
          getCourseBySlugCacheKey(source.slug),
          getCourseBySlugAndDifficultyCacheKey(source.slug, course.difficulty),
        ]
      : []),
    ...getPublishedCourseListInvalidationKeys(),
  ]);

  return published;
}

export async function updateCourseStatus(courseId: string, status: CourseStatus) {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("courses")
      .update({ status })
      .eq("id", courseId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const persisted = toCourseRecord(data, courseStore.get(courseId)?.chapters ?? []);
    courseStore.set(courseId, persisted);
    return persisted;
  }

  const course = courseStore.get(courseId);
  if (!course) {
    throw new Error(`Course ${courseId} not found`);
  }

  const updated: CourseRecord = {
    ...course,
    status,
  };

  courseStore.set(courseId, updated);
  return updated;
}

export async function getCourseById(courseId: string) {
  const cached = courseStore.get(courseId);
  if (cached) {
    return cached;
  }

  const redisCached = await getJsonCache<CourseRecord>(getCourseCacheKey(courseId));
  if (redisCached) {
    courseStore.set(courseId, redisCached);
    return redisCached;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data: courseRow } = await supabase.from("courses").select("*").eq("id", courseId).single();
  if (!courseRow) {
    return null;
  }

  const { data: chapterRows } = await supabase
    .from("chapters")
    .select("*")
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });

  const course = toCourseRecord(
    courseRow,
    (chapterRows ?? []).map((row) => ({
      orderIndex: Number(row.order_index),
      title: String(row.title),
      subtitle: row.subtitle ? String(row.subtitle) : undefined,
      narration: String(row.narration),
      conceptNames: Array.isArray(row.concept_names) ? (row.concept_names as string[]) : [],
      sourceCitations: Array.isArray(row.source_citations)
        ? (row.source_citations as string[])
        : [],
      svgComponents: Array.isArray(row.svg_components) ? (row.svg_components as Record<string, unknown>[]) : undefined,
      audioUrl: row.audio_url ? String(row.audio_url) : null,
      analogies: Array.isArray(row.analogies) ? (row.analogies as { concept?: string; analogy: string; limitation?: string }[]) : undefined,
      quizQuestions: Array.isArray(row.quiz_questions) ? (row.quiz_questions as { type?: string; question: string; options: string[]; correct: string; explanation?: string }[]) : undefined,
      codeSnippets: Array.isArray(row.code_snippets) ? (row.code_snippets as { language: string; code: string; explanation?: string }[]) : undefined,
    })),
  );

  courseStore.set(course.id, course);
  await setJsonCache(getCourseCacheKey(courseId), course, COURSE_CACHE_TTL_SECONDS);
  return course;
}

export async function getCourseSlugById(courseId: string) {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data: courseRow } = await supabase
      .from("courses")
      .select("source_id")
      .eq("id", courseId)
      .single();

    if (!courseRow?.source_id) {
      return null;
    }

    const { data: sourceRow } = await supabase
      .from("sources")
      .select("slug")
      .eq("id", String(courseRow.source_id))
      .single();

    return sourceRow?.slug ? String(sourceRow.slug) : null;
  }

  const course = courseStore.get(courseId);
  if (!course) {
    return null;
  }

  const source = Array.from(sourceStore.values()).find((item) => item.id === course.sourceId);
  return source?.slug ?? null;
}

export async function getCourseBySlug(slug: string): Promise<CourseWithSourceRecord | null> {
  const redisCached = await getJsonCache<CourseWithSourceRecord>(getCourseBySlugCacheKey(slug));
  if (redisCached) {
    courseStore.set(redisCached.id, redisCached);
    return redisCached;
  }

  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data: sourceRow } = await supabase.from("sources").select("*").eq("slug", slug).single();
    if (!sourceRow) {
      return null;
    }

    const { data: courseRow } = await supabase
      .from("courses")
      .select("*")
      .eq("source_id", sourceRow.id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!courseRow) {
      return null;
    }

    const course = await getCourseById(String(courseRow.id));
    if (!course) {
      return null;
    }

    const result = {
      ...course,
      slug: String(sourceRow.slug),
      sourceTitle: String(sourceRow.title ?? ""),
      sourceAbstract: String(sourceRow.abstract ?? ""),
      sourceUrl: String(sourceRow.url),
    };

    await setJsonCache(getCourseBySlugCacheKey(slug), result, COURSE_CACHE_TTL_SECONDS);
    return result;
  }

  const source = Array.from(sourceStore.values()).find((item) => item.slug === slug);
  if (!source) {
    return null;
  }

  const course = Array.from(courseStore.values()).find(
    (item) => item.sourceId === source.id && item.status === "published",
  );
  if (!course) {
    return null;
  }

  const result = {
    ...course,
    slug: source.slug,
    sourceTitle: source.title,
    sourceAbstract: source.abstract,
    sourceUrl: source.url,
  };

  await setJsonCache(getCourseBySlugCacheKey(slug), result, COURSE_CACHE_TTL_SECONDS);
  return result;
}

function getCourseBySlugAndDifficultyCacheKey(slug: string, difficulty: string) {
  return `course:slug:${slug}:${difficulty}`;
}

/** 按 slug + 难度取已发布课程（同一论文三种难度切换）. */
export async function getCourseBySlugAndDifficulty(
  slug: string,
  difficulty: DifficultyLevel,
): Promise<CourseWithSourceRecord | null> {
  const cacheKey = getCourseBySlugAndDifficultyCacheKey(slug, difficulty);
  const redisCached = await getJsonCache<CourseWithSourceRecord>(cacheKey);
  if (redisCached) {
    courseStore.set(redisCached.id, redisCached);
    return redisCached;
  }

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data: sourceRow } = await supabase.from("sources").select("*").eq("slug", slug).single();
    if (!sourceRow) return null;

    const { data: courseRow } = await supabase
      .from("courses")
      .select("*")
      .eq("source_id", sourceRow.id)
      .eq("status", "published")
      .eq("difficulty", difficulty)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!courseRow) return null;

    const course = await getCourseById(String(courseRow.id));
    if (!course) return null;

    const result: CourseWithSourceRecord = {
      ...course,
      slug: String(sourceRow.slug),
      sourceTitle: String(sourceRow.title ?? ""),
      sourceAbstract: String(sourceRow.abstract ?? ""),
      sourceUrl: String(sourceRow.url),
    };
    await setJsonCache(cacheKey, result, COURSE_CACHE_TTL_SECONDS);
    return result;
  }

  const source = Array.from(sourceStore.values()).find((s) => s.slug === slug);
  if (!source) return null;
  const course = Array.from(courseStore.values()).find(
    (c) => c.sourceId === source.id && c.status === "published" && c.difficulty === difficulty,
  );
  if (!course) return null;
  const result: CourseWithSourceRecord = {
    ...course,
    slug: source.slug,
    sourceTitle: source.title,
    sourceAbstract: source.abstract,
    sourceUrl: source.url,
  };
  await setJsonCache(cacheKey, result, COURSE_CACHE_TTL_SECONDS);
  return result;
}

/** 返回某 slug 下已发布课程的难度列表（用于难度切换器）. */
export async function getPublishedDifficultiesBySlug(
  slug: string,
): Promise<DifficultyLevel[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const { data: sourceRow } = await supabase.from("sources").select("id").eq("slug", slug).single();
  if (!sourceRow) return [];

  const { data: rows } = await supabase
    .from("courses")
    .select("difficulty")
    .eq("source_id", sourceRow.id)
    .eq("status", "published");

  const set = new Set<string>();
  for (const r of rows ?? []) {
    if (r.difficulty) set.add(r.difficulty);
  }
  return Array.from(set) as DifficultyLevel[];
}

export async function listPublishedCourses(limit = 12): Promise<CourseListItem[]> {
  const redisCached = await getJsonCache<CourseListItem[]>(getPublishedCoursesCacheKey(limit));
  if (redisCached) {
    return redisCached;
  }

  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data: courseRows } = await supabase
      .from("courses")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    const rows = courseRows ?? [];
    const items = await Promise.all(
      rows.map(async (courseRow) => {
        const { data: sourceRow } = await supabase
          .from("sources")
          .select("slug, title, abstract")
          .eq("id", String(courseRow.source_id))
          .single();

        return {
          id: String(courseRow.id),
          slug: String(sourceRow?.slug ?? ""),
          title: String(sourceRow?.title ?? "Untitled course"),
          abstract: String(sourceRow?.abstract ?? ""),
          difficulty: courseRow.difficulty as DifficultyLevel,
          status: courseRow.status as CourseStatus,
          totalChapters:
            typeof courseRow.total_chapters === "number"
              ? courseRow.total_chapters
              : Number(courseRow.total_chapters ?? 0),
          estimatedMinutes:
            typeof courseRow.estimated_minutes === "number"
              ? courseRow.estimated_minutes
              : Number(courseRow.estimated_minutes ?? 0),
          publishedAt: courseRow.published_at ? String(courseRow.published_at) : null,
        };
      }),
    );

    const result = items.filter((item) => item.slug);
    await setJsonCache(
      getPublishedCoursesCacheKey(limit),
      result,
      COURSE_LIST_CACHE_TTL_SECONDS,
    );
    return result;
  }

  const result = Array.from(courseStore.values())
    .filter((course) => course.status === "published")
    .slice(0, limit)
    .map((course) => {
      const source = Array.from(sourceStore.values()).find((item) => item.id === course.sourceId);

      return {
        id: course.id,
        slug: source?.slug ?? "",
        title: source?.title ?? "Untitled course",
        abstract: source?.abstract ?? "",
        difficulty: course.difficulty,
        status: course.status,
        totalChapters: course.totalChapters,
        estimatedMinutes: course.estimatedMinutes,
        publishedAt: course.publishedAt,
      };
    })
    .filter((item) => item.slug);

  await setJsonCache(
    getPublishedCoursesCacheKey(limit),
    result,
    COURSE_LIST_CACHE_TTL_SECONDS,
  );
  return result;
}

/** 热门课程：按 view_count 降序，其次 published_at */
export async function listTrendingCourses(limit = 12): Promise<CourseListItem[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return listPublishedCourses(limit);
  }
  const { data: courseRows } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("view_count", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  const rows = courseRows ?? [];
  const items = await Promise.all(
    rows.map(async (courseRow) => {
      const { data: sourceRow } = await supabase
        .from("sources")
        .select("slug, title, abstract")
        .eq("id", String(courseRow.source_id))
        .single();

      return {
        id: String(courseRow.id),
        slug: String(sourceRow?.slug ?? ""),
        title: String(sourceRow?.title ?? "Untitled course"),
        abstract: String(sourceRow?.abstract ?? ""),
        difficulty: courseRow.difficulty as DifficultyLevel,
        status: courseRow.status as CourseStatus,
        totalChapters:
          typeof courseRow.total_chapters === "number"
            ? courseRow.total_chapters
            : Number(courseRow.total_chapters ?? 0),
        estimatedMinutes:
          typeof courseRow.estimated_minutes === "number"
            ? courseRow.estimated_minutes
            : Number(courseRow.estimated_minutes ?? 0),
        publishedAt: courseRow.published_at ? String(courseRow.published_at) : null,
      };
    }),
  );
  return items.filter((item) => item.slug);
}

/** 全文搜索：按 source 的 title / abstract / slug 匹配 */
export async function searchCourses(q: string, limit = 24): Promise<CourseListItem[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];

  const escaped = trimmed.replace(/"/g, '""');
  const pattern = `"%${escaped}%"`;
  const { data: sourceRows } = await supabase
    .from("sources")
    .select("id")
    .or(`title.ilike.${pattern},abstract.ilike.${pattern},slug.ilike.${pattern}`)
    .limit(100);

  const sourceIds = (sourceRows ?? []).map((r) => String(r.id));
  if (sourceIds.length === 0) return [];

  const { data: courseRows } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .in("source_id", sourceIds)
    .order("published_at", { ascending: false })
    .limit(limit);

  const rows = courseRows ?? [];
  const items = await Promise.all(
    rows.map(async (courseRow) => {
      const { data: sourceRow } = await supabase
        .from("sources")
        .select("slug, title, abstract")
        .eq("id", String(courseRow.source_id))
        .single();

      return {
        id: String(courseRow.id),
        slug: String(sourceRow?.slug ?? ""),
        title: String(sourceRow?.title ?? "Untitled course"),
        abstract: String(sourceRow?.abstract ?? ""),
        difficulty: courseRow.difficulty as DifficultyLevel,
        status: courseRow.status as CourseStatus,
        totalChapters:
          typeof courseRow.total_chapters === "number"
            ? courseRow.total_chapters
            : Number(courseRow.total_chapters ?? 0),
        estimatedMinutes:
          typeof courseRow.estimated_minutes === "number"
            ? courseRow.estimated_minutes
            : Number(courseRow.estimated_minutes ?? 0),
        publishedAt: courseRow.published_at ? String(courseRow.published_at) : null,
      };
    }),
  );
  return items.filter((item) => item.slug);
}

export async function upsertAppUser(params: {
  clerkUserId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  referrerId?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const draft: AppUserRecord = {
    id: randomUUID(),
    clerkUserId: params.clerkUserId,
    email: params.email,
    name: params.name ?? null,
    avatarUrl: params.avatarUrl ?? null,
    stripeCustomerId: null,
    knowledgeLevel: "explorer",
    preferredLanguage: "zh-CN",
    referrerId: params.referrerId ?? null,
  };

  if (supabase) {
    const payload: Record<string, unknown> = {
      id: draft.id,
      clerk_user_id: draft.clerkUserId,
      email: draft.email,
      name: draft.name,
      avatar_url: draft.avatarUrl,
      stripe_customer_id: draft.stripeCustomerId,
      knowledge_level: draft.knowledgeLevel,
      preferred_language: draft.preferredLanguage,
      referrer_id: draft.referrerId,
    };
    const { data, error } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "clerk_user_id" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const user = toAppUserRecord(data);
    if (user.clerkUserId) {
      userStore.set(user.clerkUserId, user);
    }
    return user;
  }

  userStore.set(params.clerkUserId, draft);
  return draft;
}

export async function getAppUserByClerkId(clerkUserId: string) {
  const cached = userStore.get(clerkUserId);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const user = toAppUserRecord(data);
  userStore.set(clerkUserId, user);
  return user;
}

export async function getAppUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase
    .from("users")
    .select("*")
    .ilike("email", normalized)
    .maybeSingle();
  if (!data) {
    return null;
  }
  return toAppUserRecord(data);
}

export async function getPasswordHashByUserId(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }
  const { data } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", userId)
    .maybeSingle();
  return data?.password_hash ? String(data.password_hash) : null;
}

export async function createAppUserWithPassword(params: {
  email: string;
  name?: string | null;
  passwordHash: string;
  referrerId?: string | null;
}) {
  const supabase = getSupabaseAdminClient();
  const id = randomUUID();
  const record: AppUserRecord = {
    id,
    clerkUserId: null,
    email: params.email.trim().toLowerCase(),
    name: params.name ?? null,
    avatarUrl: null,
    stripeCustomerId: null,
    knowledgeLevel: "explorer",
    preferredLanguage: "zh-CN",
    referrerId: params.referrerId ?? null,
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .insert({
        id: record.id,
        clerk_user_id: null,
        email: record.email,
        name: record.name,
        avatar_url: record.avatarUrl,
        stripe_customer_id: record.stripeCustomerId,
        knowledge_level: record.knowledgeLevel,
        preferred_language: record.preferredLanguage,
        referrer_id: record.referrerId,
        password_hash: params.passwordHash,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return toAppUserRecord(data);
  }

  return record;
}

export async function getAppUserById(userId: string) {
  const cached = Array.from(userStore.values()).find((user) => user.id === userId);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (!data) {
    return null;
  }

  const user = toAppUserRecord(data);
  if (user.clerkUserId) {
    userStore.set(user.clerkUserId, user);
  }
  return user;
}

export async function getUserSubscription(userId: string): Promise<AppSubscriptionRecord | null> {
  const cached = subscriptionStore.get(userId);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const subscription = toSubscriptionRecord(data);
  subscriptionStore.set(userId, subscription);
  return subscription;
}

/** 用户取消订阅：将当前有效订阅设为周期末取消，并清除缓存。返回取消前的订阅信息（用于埋点）。 */
export async function setSubscriptionCancelAtPeriodEnd(
  userId: string,
): Promise<AppSubscriptionRecord | null> {
  const sub = await getUserSubscription(userId);
  if (!sub) return null;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { error } = await supabase
    .from("subscriptions")
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .in("status", ["active", "trialing"]);
  if (error) return null;
  subscriptionStore.delete(userId);
  return sub;
}

export async function updateUserStripeCustomerId(userId: string, stripeCustomerId: string) {
  const supabase = getSupabaseAdminClient();
  const user = await getAppUserById(userId);

  if (supabase) {
    const { error } = await supabase
      .from("users")
      .update({
        stripe_customer_id: stripeCustomerId,
      })
      .eq("id", userId);

    if (error) {
      throw error;
    }
  }

  if (user?.clerkUserId) {
    userStore.set(user.clerkUserId, {
      ...user,
      stripeCustomerId,
    });
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { knowledgeLevel?: DifficultyLevel; preferredLanguage?: string },
) {
  const user = await getAppUserById(userId);
  if (!user) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const payload: Record<string, unknown> = {};
  if (updates.knowledgeLevel !== undefined) payload.knowledge_level = updates.knowledgeLevel;
  if (updates.preferredLanguage !== undefined) payload.preferred_language = updates.preferredLanguage;
  if (Object.keys(payload).length === 0) {
    return user;
  }

  if (supabase) {
    const { error } = await supabase.from("users").update(payload).eq("id", userId);
    if (error) {
      throw error;
    }
  }

  const updated: AppUserRecord = {
    ...user,
    ...(updates.knowledgeLevel !== undefined && { knowledgeLevel: updates.knowledgeLevel }),
    ...(updates.preferredLanguage !== undefined && { preferredLanguage: updates.preferredLanguage }),
  };
  if (user.clerkUserId) {
    userStore.set(user.clerkUserId, updated);
  }
  return updated;
}

export async function getAppUserByStripeCustomerId(stripeCustomerId: string) {
  const cached = Array.from(userStore.values()).find(
    (user) => user.stripeCustomerId === stripeCustomerId,
  );
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (!data) {
    return null;
  }

  const user = toAppUserRecord(data);
  if (user.clerkUserId) {
    userStore.set(user.clerkUserId, user);
  }
  return user;
}

export async function upsertSubscriptionRecord(params: {
  userId: string;
  stripeSubscriptionId: string;
  plan: "free" | "pro" | "team";
  status: string;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const supabase = getSupabaseAdminClient();
  const draft: AppSubscriptionRecord = {
    id: randomUUID(),
    userId: params.userId,
    plan: params.plan,
    status: params.status,
  };

  if (supabase) {
    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          id: draft.id,
          user_id: params.userId,
          stripe_subscription_id: params.stripeSubscriptionId,
          plan: params.plan,
          status: params.status,
          current_period_start: params.currentPeriodStart,
          current_period_end: params.currentPeriodEnd,
          cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
        },
        { onConflict: "stripe_subscription_id" },
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    const subscription = toSubscriptionRecord(data);
    subscriptionStore.set(subscription.userId, subscription);
    return subscription;
  }

  subscriptionStore.set(params.userId, draft);
  return draft;
}

export async function markSubscriptionStatus(
  stripeSubscriptionId: string,
  status: string,
  plan?: "free" | "pro" | "team",
) {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        status,
        ...(plan ? { plan } : {}),
      })
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const subscription = toSubscriptionRecord(data);
    subscriptionStore.set(subscription.userId, subscription);
    return subscription;
  }

  return null;
}

export interface UsdtPaymentRequestRecord {
  id: string;
  userId: string;
  plan: string;
  amountUsdt: string | null;
  txHash: string | null;
  status: string;
  createdAt: string;
}

function toUsdtPaymentRequestRecord(row: Record<string, unknown>): UsdtPaymentRequestRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    plan: String(row.plan ?? ""),
    amountUsdt: row.amount_usdt != null ? String(row.amount_usdt) : null,
    txHash: row.tx_hash != null ? String(row.tx_hash) : null,
    status: String(row.status ?? "pending"),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

/** 联盟营销：注册时若存在 referrer_id，写入 referral_stats 待后续付费时更新为 paid。 */
export async function insertReferralStat(
  referrerId: string,
  referredUserId: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("referral_stats").insert({
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    status: "pending",
  });
}

/** USDT 开通订阅后，将该用户作为被推荐人的 referral_stats 更新为 paid。 */
export async function updateReferralStatsPaid(
  referredUserId: string,
  subscriptionId: string,
  commissionAmount?: number | null,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase
    .from("referral_stats")
    .update({
      subscription_id: subscriptionId,
      commission_amount: commissionAmount ?? null,
      status: "paid",
    })
    .eq("referred_user_id", referredUserId)
    .eq("status", "pending");
}

export async function createUsdtPaymentRequest(params: {
  userId: string;
  plan: string;
  amountUsdt: string;
}) {
  const supabase = getSupabaseAdminClient();
  const id = randomUUID();
  if (supabase) {
    const { error } = await supabase.from("usdt_payment_requests").insert({
      id,
      user_id: params.userId,
      plan: params.plan,
      amount_usdt: params.amountUsdt,
      tx_hash: null,
      status: "pending",
    });
    if (error) throw error;
  }
  return { id };
}

export async function getUsdtPaymentRequestById(
  id: string,
): Promise<UsdtPaymentRequestRecord | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("usdt_payment_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return toUsdtPaymentRequestRecord(data);
}

export async function listUsdtPaymentRequestsByUserId(
  userId: string,
): Promise<UsdtPaymentRequestRecord[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("usdt_payment_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(toUsdtPaymentRequestRecord);
}

export async function updateUsdtPaymentRequestTxHash(
  id: string,
  txHash: string,
): Promise<UsdtPaymentRequestRecord | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("usdt_payment_requests")
    .update({ tx_hash: txHash })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .single();
  if (error || !data) return null;
  return toUsdtPaymentRequestRecord(data);
}

/** Map USDT plan to subscription plan and period months */
function usdtPlanToSubscription(plan: string): { plan: "pro" | "team"; months: number } {
  if (plan === "team") return { plan: "team", months: 1 };
  if (plan === "pro-yearly") return { plan: "pro", months: 12 };
  return { plan: "pro", months: 1 };
}

export async function approveUsdtPaymentRequest(
  paymentRequestId: string,
): Promise<AppSubscriptionRecord | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const req = await getUsdtPaymentRequestById(paymentRequestId);
  if (!req || req.status !== "pending") return null;

  const { plan: subPlan, months } = usdtPlanToSubscription(req.plan);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + months);

  const { error: updateReqError } = await supabase
    .from("usdt_payment_requests")
    .update({ status: "confirmed" })
    .eq("id", paymentRequestId);

  if (updateReqError) throw updateReqError;

  await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", req.userId)
    .in("status", ["active", "trialing"]);

  const newId = randomUUID();
  const { data: subData, error: insertError } = await supabase
    .from("subscriptions")
    .insert({
      id: newId,
      user_id: req.userId,
      stripe_subscription_id: null,
      payment_request_id: paymentRequestId,
      plan: subPlan,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  await updateReferralStatsPaid(req.userId, newId);
  const subscription = toSubscriptionRecord(subData);
  subscriptionStore.set(subscription.userId, subscription);
  return subscription;
}

export async function getOrCreateUsageQuota(userId: string, period: string) {
  const cacheKey = `${userId}:${period}`;
  const cached = usageQuotaStore.get(cacheKey);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdminClient();
  const draft: UsageQuotaRecord = {
    id: randomUUID(),
    userId,
    period,
    coursesGenerated: 0,
  };

  if (supabase) {
    const existing = await supabase
      .from("usage_quotas")
      .select("*")
      .eq("user_id", userId)
      .eq("period", period)
      .maybeSingle();

    if (existing.data) {
      const record = toUsageQuotaRecord(existing.data);
      usageQuotaStore.set(cacheKey, record);
      return record;
    }

    const { data, error } = await supabase
      .from("usage_quotas")
      .insert({
        id: draft.id,
        user_id: draft.userId,
        period: draft.period,
        courses_generated: draft.coursesGenerated,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const record = toUsageQuotaRecord(data);
    usageQuotaStore.set(cacheKey, record);
    return record;
  }

  usageQuotaStore.set(cacheKey, draft);
  return draft;
}

export async function incrementUsageQuota(userId: string, period: string) {
  const current = await getOrCreateUsageQuota(userId, period);
  const nextValue = current.coursesGenerated + 1;
  const next: UsageQuotaRecord = {
    ...current,
    coursesGenerated: nextValue,
  };

  const cacheKey = `${userId}:${period}`;
  usageQuotaStore.set(cacheKey, next);

  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase
      .from("usage_quotas")
      .update({
        courses_generated: nextValue,
      })
      .eq("id", current.id);

    if (error) {
      throw error;
    }
  }

  return next;
}

export async function getCourseProgress(userId: string, courseId: string) {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data: chapterRows } = await supabase
      .from("chapters")
      .select("id, order_index")
      .eq("course_id", courseId);

    const chapterIndexMap = new Map<string, number>(
      (chapterRows ?? []).map((row) => [String(row.id), Number(row.order_index)]),
    );

    const { data } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .order("completed_at", { ascending: false });

    return (data ?? []).map((row) => {
      const progress = toProgressRecord(row, chapterIndexMap.get(String(row.chapter_id)) ?? 0);
      progressStore.set(`${progress.userId}:${progress.chapterId}`, progress);
      return progress;
    });
  }

  return Array.from(progressStore.values()).filter(
    (progress) => progress.userId === userId && progress.courseId === courseId,
  );
}

export async function upsertCourseProgress(params: {
  userId: string;
  courseId: string;
  chapterIndex: number;
  status: CourseProgressRecord["status"];
  quizScore?: number | null;
  quizAnswers?: unknown;
}) {
  const course = await getCourseById(params.courseId);
  if (!course) {
    throw new Error(`Course ${params.courseId} not found`);
  }

  const chapter = course.chapters[params.chapterIndex];
  if (!chapter) {
    throw new Error(`Chapter ${params.chapterIndex} not found`);
  }

  const chapterId = `${params.courseId}:${params.chapterIndex}`;
  const completedAt = params.status === "completed" ? new Date().toISOString() : null;
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data: chapterRow } = await supabase
      .from("chapters")
      .select("id")
      .eq("course_id", params.courseId)
      .eq("order_index", params.chapterIndex)
      .single();

    if (!chapterRow?.id) {
      throw new Error(`Chapter row not found for ${params.chapterIndex}`);
    }

    const payload: Record<string, unknown> = {
      id: randomUUID(),
      user_id: params.userId,
      course_id: params.courseId,
      chapter_id: String(chapterRow.id),
      status: params.status,
      completed_at: completedAt,
    };
    if (params.quizScore !== undefined) payload.quiz_score = params.quizScore;
    if (params.quizAnswers !== undefined) payload.quiz_answers = params.quizAnswers;

    const { data, error } = await supabase
      .from("user_progress")
      .upsert(payload, { onConflict: "user_id,chapter_id" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const record = toProgressRecord(data, params.chapterIndex);
    progressStore.set(`${record.userId}:${record.chapterId}`, record);
    return record;
  }

  const record: CourseProgressRecord = {
    id: randomUUID(),
    userId: params.userId,
    courseId: params.courseId,
    chapterId,
    chapterIndex: params.chapterIndex,
    status: params.status,
    completedAt,
    quizScore: params.quizScore ?? null,
    quizAnswers: params.quizAnswers ?? null,
  };
  progressStore.set(`${record.userId}:${record.chapterId}`, record);
  void chapter;
  return record;
}

/** If user has completed all chapters of the course, upsert course_completed achievement. */
export async function ensureCourseCompletedAchievement(userId: string, courseId: string) {
  const course = await getCourseById(courseId);
  if (!course || (course.totalChapters ?? 0) === 0) {
    return null;
  }
  const progress = await getCourseProgress(userId, courseId);
  const completedCount = progress.filter((p) => p.status === "completed").length;
  const total = course.totalChapters ?? course.chapters.length;
  if (completedCount < total) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_achievements")
    .upsert(
      {
        id: randomUUID(),
        user_id: userId,
        course_id: courseId,
        achievement_type: "course_completed",
        badge_image_url: null,
        shared: false,
      },
      { onConflict: "user_id,course_id,achievement_type" },
    )
    .select()
    .single();

  if (error) {
    return null;
  }

  return toAchievementRecord(data);
}

function toAchievementRecord(row: Record<string, unknown>): AchievementRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    courseId: String(row.course_id),
    achievementType: String(row.achievement_type),
    badgeImageUrl: row.badge_image_url ? String(row.badge_image_url) : null,
    shared: Boolean(row.shared),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function listUserAchievements(userId: string): Promise<AchievementRecord[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return [];
  }
  const { data } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => toAchievementRecord(row));
}

export async function isFavoriteCourse(userId: string, courseId: string) {
  const key = `${userId}:${courseId}`;
  const cached = favoriteStore.get(key);
  if (cached) {
    return true;
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return false;
  }

  const { data } = await supabase
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!data) {
    return false;
  }

  favoriteStore.set(key, toFavoriteRecord(data));
  return true;
}

export async function toggleFavoriteCourse(userId: string, courseId: string) {
  const key = `${userId}:${courseId}`;
  const currentlyFavorite = await isFavoriteCourse(userId, courseId);
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    if (currentlyFavorite) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("user_id", userId)
        .eq("course_id", courseId);

      if (error) {
        throw error;
      }
    } else {
      const { data, error } = await supabase
        .from("user_favorites")
        .insert({
          user_id: userId,
          course_id: courseId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      favoriteStore.set(key, toFavoriteRecord(data));
    }
  } else if (!currentlyFavorite) {
    favoriteStore.set(key, {
      userId,
      courseId,
      createdAt: new Date().toISOString(),
    });
  }

  if (currentlyFavorite) {
    favoriteStore.delete(key);
  }

  return !currentlyFavorite;
}

export async function listFavoriteCourses(userId: string): Promise<CourseListItem[]> {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data } = await supabase
      .from("user_favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const favorites = data ?? [];
    const courses = await Promise.all(
      favorites.map(async (favoriteRow) => {
        const course = await getCourseById(String(favoriteRow.course_id));
        if (!course) {
          return null;
        }
        const source = await getSourceById(course.sourceId);
        if (!source) {
          return null;
        }
        return {
          id: course.id,
          slug: source.slug,
          title: source.title,
          abstract: source.abstract,
          difficulty: course.difficulty,
          status: course.status,
          totalChapters: course.totalChapters,
          estimatedMinutes: course.estimatedMinutes,
          publishedAt: course.publishedAt,
        } satisfies CourseListItem;
      }),
    );

    return courses.filter((course): course is CourseListItem => Boolean(course));
  }

  const favoriteIds = Array.from(favoriteStore.values())
    .filter((favorite) => favorite.userId === userId)
    .map((favorite) => favorite.courseId);

  const items = await Promise.all(
    favoriteIds.map(async (courseId) => {
      const course = await getCourseById(courseId);
      if (!course) {
        return null;
      }
      const source = await getSourceById(course.sourceId);
      if (!source) {
        return null;
      }
      return {
        id: course.id,
        slug: source.slug,
        title: source.title,
        abstract: source.abstract,
        difficulty: course.difficulty,
        status: course.status,
        totalChapters: course.totalChapters,
        estimatedMinutes: course.estimatedMinutes,
        publishedAt: course.publishedAt,
      } satisfies CourseListItem;
    }),
  );

  return items.filter((course): course is CourseListItem => Boolean(course));
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const supabase = getSupabaseAdminClient();
  let allProgress = Array.from(progressStore.values()).filter((item) => item.userId === userId);

  if (supabase) {
    const { data } = await supabase.from("user_progress").select("*").eq("user_id", userId);
    const chapterIds = (data ?? []).map((item) => String(item.chapter_id));
    const chapterRows =
      chapterIds.length > 0
        ? await supabase.from("chapters").select("id, order_index").in("id", chapterIds)
        : { data: [] as Array<{ id: string; order_index: number }> };
    const chapterIndexMap = new Map<string, number>(
      (chapterRows.data ?? []).map((row) => [String(row.id), Number(row.order_index)]),
    );

    allProgress = (data ?? []).map((row) =>
      toProgressRecord(row, chapterIndexMap.get(String(row.chapter_id)) ?? 0),
    );
  }

  const completedChapters = allProgress.filter((item) => item.status === "completed").length;
  const inProgressCourses = new Set(
    allProgress
      .filter((item) => item.status === "in_progress" || item.status === "completed")
      .map((item) => item.courseId),
  ).size;
  const favorites = await listFavoriteCourses(userId);
  const recentCourseIds = [...new Set(allProgress.map((item) => item.courseId))].slice(0, 5);
  const recentCourses = (
    await Promise.all(
      recentCourseIds.map(async (courseId) => {
        const course = await getCourseById(courseId);
        if (!course) {
          return null;
        }
        const source = await getSourceById(course.sourceId);
        if (!source) {
          return null;
        }
        return {
          id: course.id,
          slug: source.slug,
          title: source.title,
          abstract: source.abstract,
          difficulty: course.difficulty,
          status: course.status,
          totalChapters: course.totalChapters,
          estimatedMinutes: course.estimatedMinutes,
          publishedAt: course.publishedAt,
        } satisfies CourseListItem;
      }),
    )
  ).filter((course): course is CourseListItem => Boolean(course));

  const completedDates = new Set<string>();
  for (const p of allProgress) {
    if (p.status === "completed" && p.completedAt) {
      const d = new Date(p.completedAt);
      completedDates.add(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
    }
  }

  const toDateKey = (date: Date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  const today = new Date();
  const todayKey = toDateKey(today);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayKey = toDateKey(yesterday);

  let currentStreak = 0;
  let start: Date;
  if (completedDates.has(todayKey)) {
    start = new Date(today);
  } else if (completedDates.has(yesterdayKey)) {
    start = new Date(yesterday);
  } else {
    start = new Date(0);
  }
  if (start.getTime() > 0) {
    let check = new Date(start);
    while (completedDates.has(toDateKey(check))) {
      currentStreak++;
      check.setUTCDate(check.getUTCDate() - 1);
    }
  }

  const completedChapterIds = allProgress
    .filter((p) => p.status === "completed")
    .map((p) => p.chapterId);
  let masteredConcepts: string[] = [];
  let masteredConceptEdges: Array<{ from: string; to: string; relationType?: string }> = [];
  if (supabase && completedChapterIds.length > 0) {
    const { data: chapterConceptRows } = await supabase
      .from("chapters")
      .select("concept_names")
      .in("id", completedChapterIds);
    const nameSet = new Set<string>();
    for (const row of chapterConceptRows ?? []) {
      const names = Array.isArray(row?.concept_names) ? (row.concept_names as string[]) : [];
      names.forEach((n) => nameSet.add(String(n)));
    }
    masteredConcepts = [...nameSet];
    if (masteredConcepts.length > 0) {
      masteredConceptEdges = await getGlobalConceptEdges(masteredConcepts);
    }
  }

  return {
    completedChapters,
    inProgressCourses,
    favoritesCount: favorites.length,
    currentStreak,
    recentCourses,
    masteredConcepts,
    masteredConceptEdges,
  };
}

export async function createShortVideoExport(params: {
  courseId: string;
  userId: string;
}): Promise<ShortVideoExportRecord> {
  const supabase = getSupabaseAdminClient();
  const id = randomUUID();
  const now = new Date().toISOString();
  const record: ShortVideoExportRecord = {
    id,
    courseId: params.courseId,
    userId: params.userId,
    status: "queued",
    fileUrl: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
  if (supabase) {
    await supabase.from("short_video_exports").insert({
      id: record.id,
      course_id: record.courseId,
      user_id: record.userId,
      status: record.status,
      file_url: record.fileUrl,
      error_message: record.errorMessage,
      updated_at: record.updatedAt,
    });
  }
  return record;
}

export async function getShortVideoExportById(
  id: string,
): Promise<ShortVideoExportRecord | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("short_video_exports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: String(data.id),
    courseId: String(data.course_id),
    userId: String(data.user_id),
    status: data.status as ShortVideoExportRecord["status"],
    fileUrl: data.file_url ? String(data.file_url) : null,
    errorMessage: data.error_message ? String(data.error_message) : null,
    createdAt: String(data.created_at),
    updatedAt: String(data.updated_at),
  };
}

export async function updateShortVideoExport(
  id: string,
  patch: Partial<Pick<ShortVideoExportRecord, "status" | "fileUrl" | "errorMessage">>,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) payload.status = patch.status;
  if (patch.fileUrl !== undefined) payload.file_url = patch.fileUrl;
  if (patch.errorMessage !== undefined) payload.error_message = patch.errorMessage;
  await supabase.from("short_video_exports").update(payload).eq("id", id);
}

// ---------- 护城河：用户学习行为与 PKG（CURSOR.md） ----------

/** 按课程与章节序号取 chapter_id */
export async function getChapterIdByCourseAndIndex(
  courseId: string,
  orderIndex: number,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("chapters")
    .select("id")
    .eq("course_id", courseId)
    .eq("order_index", orderIndex)
    .maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function insertChapterView(params: {
  userId: string;
  chapterId: string;
  durationSeconds?: number;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("chapter_views").insert({
    user_id: params.userId,
    chapter_id: params.chapterId,
    duration_seconds: params.durationSeconds ?? 0,
  });
}

export interface QuizAttemptRow {
  questionIndex: number;
  selectedAnswer: string | null;
  correct: boolean;
  timeSpentSeconds?: number;
}

export async function insertQuizAttempts(params: {
  userId: string;
  courseId: string;
  chapterId: string;
  attempts: QuizAttemptRow[];
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase || params.attempts.length === 0) return;
  await supabase.from("quiz_attempts").insert(
    params.attempts.map((a) => ({
      user_id: params.userId,
      course_id: params.courseId,
      chapter_id: params.chapterId,
      question_index: a.questionIndex,
      selected_answer: a.selectedAnswer,
      correct: a.correct,
      time_spent_seconds: a.timeSpentSeconds ?? 0,
    })),
  );
}

const CONTENT_ELEMENT_TYPES = ["analogy", "formula", "code", "svg", "audio"] as const;
const CONTENT_ACTIONS = ["viewed", "expanded", "collapsed", "replayed", "skipped"] as const;

export async function insertContentInteraction(params: {
  userId: string;
  chapterId: string;
  elementType: (typeof CONTENT_ELEMENT_TYPES)[number];
  action: (typeof CONTENT_ACTIONS)[number];
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("content_interactions").insert({
    user_id: params.userId,
    chapter_id: params.chapterId,
    element_type: params.elementType,
    action: params.action,
  });
}

export async function insertDifficultySwitch(params: {
  userId: string;
  courseId: string;
  fromLevel: string;
  toLevel: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("difficulty_switches").insert({
    user_id: params.userId,
    course_id: params.courseId,
    from_level: params.fromLevel,
    to_level: params.toLevel,
  });
}

export async function insertCourseShare(params: {
  userId: string;
  courseId: string;
  platform: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("course_shares").insert({
    user_id: params.userId,
    course_id: params.courseId,
    platform: params.platform,
  });
}

/** 按概念名解析 concept_id（concepts 表） */
export async function getConceptIdsByNames(names: string[]): Promise<Map<string, string>> {
  const supabase = getSupabaseAdminClient();
  const map = new Map<string, string>();
  if (!supabase || names.length === 0) return map;
  const { data } = await supabase.from("concepts").select("id, name").in("name", names);
  for (const row of data ?? []) {
    map.set(String(row.name), String(row.id));
  }
  return map;
}

/** 更新用户对某概念的掌握度（测验后调用，mastery_level 0–1） */
export async function upsertUserConcept(params: {
  userId: string;
  conceptId: string;
  masteryLevel: number;
  incrementReview?: boolean;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const level = Math.max(0, Math.min(1, params.masteryLevel));
  const { data: existing } = await supabase
    .from("user_concepts")
    .select("mastery_level, review_count")
    .eq("user_id", params.userId)
    .eq("concept_id", params.conceptId)
    .maybeSingle();

  const reviewCount = (existing?.review_count ?? 0) + (params.incrementReview ? 1 : 0);
  const newMastery = existing
    ? (existing.mastery_level + level) / 2
    : level;

  await supabase.from("user_concepts").upsert(
    {
      user_id: params.userId,
      concept_id: params.conceptId,
      mastery_level: Math.round(newMastery * 100) / 100,
      last_reviewed: new Date().toISOString(),
      review_count: reviewCount,
    },
    { onConflict: "user_id,concept_id" },
  );
}
