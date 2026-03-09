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

/** 默认用 MiniMax-M2.5，Coding Plan 套餐扣额度；M2-her 可能走余额会 1008 */
const DEFAULT_MINIMAX_MODEL = "MiniMax-M2.5";
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
  const model = serverEnv.MINIMAX_MODEL?.trim() || DEFAULT_MINIMAX_MODEL;
  const res = await fetch(getMinimaxChatUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      max_completion_tokens: Math.min(params.maxTokens, 8192),
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
    const code = data.base_resp.status_code;
    const msg = data.base_resp.status_msg ?? "";
    if (code === 1008) {
      throw new Error(
        "MiniMax 余额不足 (1008)。请到 MiniMax 开放平台充值后再试。国内: platform.minimaxi.com，海外: platform.minimax.io",
      );
    }
    throw new Error(`MiniMax error ${code}: ${msg}`);
  }
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, provider: "minimax", model };
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
