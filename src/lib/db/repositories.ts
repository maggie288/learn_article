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
  SourceRecord,
  UsageQuotaRecord,
} from "@/lib/db/types";
import type {
  CourseStatus,
  DifficultyLevel,
  ExtractionResult,
  GeneratedChapter,
  LearningPath,
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
  patch: Partial<Pick<GenerationTaskRecord, "status" | "courseId" | "errorMessage">>,
) {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("generation_tasks")
      .update({
        status: patch.status,
        course_id: patch.courseId,
        error_message: patch.errorMessage,
        updated_at: new Date().toISOString(),
      })
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

export async function publishCourse(params: {
  courseId: string;
  chapters: GeneratedChapter[];
  qualityScores?: Record<string, number>;
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
    publishedAt: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase
      .from("courses")
      .update({
        status: published.status,
        quality_scores: published.qualityScores,
        published_at: published.publishedAt,
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
    ...(source?.slug ? [getCourseBySlugCacheKey(source.slug)] : []),
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

  return {
    completedChapters,
    inProgressCourses,
    favoritesCount: favorites.length,
    currentStreak: 0,
    recentCourses,
  };
}
