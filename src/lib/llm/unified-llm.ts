/**
 * 统一 LLM 调用层：仅使用 MiniMax API。
 */
import { serverEnv } from "@/lib/env";

export type LlmProviderId = "minimax";

/** 单次调用的文本结果与使用的 provider */
export interface LlmChatResult {
  text: string;
  provider: LlmProviderId;
  model: string;
}

const MINIMAX_MODEL = "M2-her";
const MINIMAX_CHAT_PATH = "/v1/text/chatcompletion_v2";

function getMinimaxChatUrl(): string {
  const base = serverEnv.MINIMAX_API_BASE?.trim() || "https://api.minimax.io";
  return `${base.replace(/\/$/, "")}${MINIMAX_CHAT_PATH}`;
}

export function hasAnyLlmKey(): boolean {
  return Boolean(serverEnv.MINIMAX_API_KEY?.trim());
}

/** 调用 MiniMax Chat V2 */
async function callMiniMax(params: {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
}): Promise<LlmChatResult> {
  const key = serverEnv.MINIMAX_API_KEY;
  if (!key?.trim()) throw new Error("MINIMAX_API_KEY not set");
  const res = await fetch(getMinimaxChatUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      max_completion_tokens: Math.min(params.maxTokens, 2048),
      temperature: Math.max(0.01, Math.min(1, params.temperature)),
    }),
  });
  if (!res.ok) {
    const err = (await res.text()) || res.statusText;
    throw new Error(`MiniMax API ${res.status}: ${err}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    base_resp?: { status_code?: number; status_msg?: string };
  };
  if (data.base_resp?.status_code !== undefined && data.base_resp.status_code !== 0) {
    throw new Error(
      `MiniMax error ${data.base_resp.status_code}: ${data.base_resp.status_msg ?? ""}`,
    );
  }
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, provider: "minimax", model: MINIMAX_MODEL };
}

/**
 * 统一 LLM 对话调用，仅使用 MiniMax。
 */
export async function unifiedChat(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<LlmChatResult | null> {
  if (!hasAnyLlmKey()) return null;

  const maxTokens = params.maxTokens ?? 2000;
  const temperature = params.temperature ?? 0.3;
  return callMiniMax({
    system: params.system,
    user: params.user,
    maxTokens,
    temperature,
  });
}
