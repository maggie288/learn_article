/**
 * 短视频导出 Inngest 流水线：取课程首章（或首章有音频的章节），
 * 使用已有 audioUrl 或生成 TTS，上传为 MP3 剪辑（后续可扩展为真实视频合成）。
 */

import { getSupabaseAdminClient } from "@/lib/db/client";
import {
  getCourseById,
  getShortVideoExportById,
  updateShortVideoExport,
} from "@/lib/db/repositories";
import { generateChapterAudio } from "@/lib/tts/elevenlabs";

const BUCKET = "course-audio";
const EXPORT_PREFIX = "short-exports";

export interface ShortVideoExportPayload {
  exportId: string;
  courseId: string;
  userId: string;
}

export async function runShortVideoExport(
  payload: ShortVideoExportPayload,
): Promise<{ fileUrl: string | null }> {
  await updateShortVideoExport(payload.exportId, { status: "processing" });

  const course = await getCourseById(payload.courseId);
  if (!course || !course.chapters?.length) {
    await updateShortVideoExport(payload.exportId, {
      status: "failed",
      errorMessage: "Course or chapters not found",
    });
    return { fileUrl: null };
  }

  const firstChapter = course.chapters.find((ch) => ch.narration?.trim());
  if (!firstChapter) {
    await updateShortVideoExport(payload.exportId, {
      status: "failed",
      errorMessage: "No chapter with narration",
    });
    return { fileUrl: null };
  }

  let audioBuffer: Buffer | null = null;

  if (firstChapter.audioUrl) {
    try {
      const res = await fetch(firstChapter.audioUrl);
      if (res.ok) {
        audioBuffer = Buffer.from(await res.arrayBuffer());
      }
    } catch (e) {
      console.warn("[short-video-export] fetch existing audio failed", e);
    }
  }

  if (!audioBuffer && firstChapter.narration?.trim()) {
    const result = await generateChapterAudio(
      payload.courseId,
      firstChapter.orderIndex,
      firstChapter.narration,
    );
    if (result.audioUrl) {
      const res = await fetch(result.audioUrl);
      if (res.ok) {
        audioBuffer = Buffer.from(await res.arrayBuffer());
      }
    }
  }

  if (!audioBuffer) {
    await updateShortVideoExport(payload.exportId, {
      status: "failed",
      errorMessage: "Could not obtain or generate chapter audio",
    });
    return { fileUrl: null };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    await updateShortVideoExport(payload.exportId, {
      status: "failed",
      errorMessage: "Storage not configured",
    });
    return { fileUrl: null };
  }

  const path = `${EXPORT_PREFIX}/${payload.exportId}.mp3`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, audioBuffer, {
      contentType: "audio/mpeg",
      upsert: true,
    });

  if (uploadError) {
    await updateShortVideoExport(payload.exportId, {
      status: "failed",
      errorMessage: uploadError.message,
    });
    return { fileUrl: null };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const fileUrl = urlData?.publicUrl ?? null;
  await updateShortVideoExport(payload.exportId, {
    status: "completed",
    fileUrl,
  });
  return { fileUrl };
}
