import { getSupabaseAdminClient } from "@/lib/db/client";
import { serverEnv } from "@/lib/env";
import { narrationToSsml } from "@/lib/tts/ssml";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const MODEL_ID = "eleven_multilingual_v2";
const BUCKET = "course-audio";

export interface ChapterAudioResult {
  orderIndex: number;
  audioUrl: string | null;
  durationSeconds: number | null;
}

function getApiKey(): string | null {
  const key = serverEnv.ELEVENLABS_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function isTtsConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Generate TTS audio for one chapter narration and upload to Supabase Storage.
 * Returns public URL and estimated duration (by character count if API doesn't return it).
 */
export async function generateChapterAudio(
  courseId: string,
  orderIndex: number,
  narration: string,
): Promise<ChapterAudioResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { orderIndex, audioUrl: null, durationSeconds: null };
  }

  const text = narration.trim();
  if (!text) {
    return { orderIndex, audioUrl: null, durationSeconds: null };
  }

  const textForTts = narrationToSsml(text);

  async function doRequest(bodyText: string, apiKeyVal: string): Promise<Response> {
    return fetch(`${ELEVENLABS_BASE}/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKeyVal,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: bodyText,
        model_id: MODEL_ID,
      }),
    });
  }

  try {
    let res = await doRequest(textForTts, apiKey);
    if (!res.ok && textForTts !== text) {
      const errText = await res.text();
      console.warn("[tts/elevenlabs] SSML request failed, retrying with plain text", res.status, errText);
      res = await doRequest(text, apiKey);
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("[tts/elevenlabs] API error", res.status, errText);
      return { orderIndex, audioUrl: null, durationSeconds: null };
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return { orderIndex, audioUrl: null, durationSeconds: null };
    }

    const path = `${courseId}/${orderIndex}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[tts/elevenlabs] Storage upload error", uploadError);
      return { orderIndex, audioUrl: null, durationSeconds: null };
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const audioUrl = urlData?.publicUrl ?? null;
    const durationSeconds = Math.max(1, Math.ceil(text.length / 15)); // 仍按原文长度估算时长

    return {
      orderIndex,
      audioUrl,
      durationSeconds,
    };
  } catch (e) {
    console.error("[tts/elevenlabs]", e);
    return { orderIndex, audioUrl: null, durationSeconds: null };
  }
}

/** 并发上限，避免 TTS 接口限流 */
const TTS_CONCURRENCY = 3;

/**
 * Generate TTS for all chapters and return results. When all succeed, podcastUrl
 * can be set to the RSS URL (feed lists each chapter as item with enclosure).
 * Chapters are processed in parallel with concurrency limit.
 */
export async function generateCourseAudio(
  courseId: string,
  chapters: { orderIndex: number; narration: string }[],
): Promise<ChapterAudioResult[]> {
  if (!getApiKey()) {
    return chapters.map((ch) => ({
      orderIndex: ch.orderIndex,
      audioUrl: null,
      durationSeconds: null,
    }));
  }

  const results: ChapterAudioResult[] = [];
  for (let start = 0; start < chapters.length; start += TTS_CONCURRENCY) {
    const batch = chapters.slice(start, start + TTS_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((ch) =>
        generateChapterAudio(courseId, ch.orderIndex, ch.narration),
      ),
    );
    results.push(...batchResults);
  }
  return results.sort((a, b) => a.orderIndex - b.orderIndex);
}
