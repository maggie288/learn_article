/**
 * 统一 LLM 调用层：支持 Claude (Anthropic) 与 MiniMax 双 Key，
 * 策略为「最先返回」或「最便宜」自动选择。
 */
import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";

export type LlmProviderId = "anthropic" | "minimax";

export type LlmStrategy = "first" | "cheapest";

/** 单次调用的文本结果与使用的 provider */
export interface LlmChatResult {
  text: string;
  provider: LlmProviderId;
  model: string;
}

const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const MINIMAX_MODEL = "M2-her";
const MINIMAX_CHAT_URL = "https://api.minimax.io/v1/text/chatcompletion_v2";

/** 相对成本权重（数值越小越便宜，用于 cheapest 策略）。仅作比较用。 */
const COST_WEIGHT: Record<LlmProviderId, number> = {
  anthropic: 1,
  minimax: 0.5,
};

function getStrategy(): LlmStrategy {
  const v = serverEnv.LLM_STRATEGY?.toLowerCase();
  return v === "cheapest" ? "cheapest" : "first";
}

/** 当前可用的 LLM 列表（按策略排序：first 时顺序无关，cheapest 时便宜优先） */
function getAvailableProviders(): LlmProviderId[] {
  const hasAnthropic = Boolean(serverEnv.ANTHROPIC_API_KEY?.trim());
  const hasMiniMax = Boolean(serverEnv.MINIMAX_API_KEY?.trim());
  const list: LlmProviderId[] = [];
  if (hasAnthropic) list.push("anthropic");
  if (hasMiniMax) list.push("minimax");
  if (getStrategy() === "cheapest") {
    list.sort((a, b) => COST_WEIGHT[a] - COST_WEIGHT[b]);
  }
  return list;
}

export function hasAnyLlmKey(): boolean {
  return getAvailableProviders().length > 0;
}

/** 调用 Anthropic Claude */
async function callAnthropic(params: {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
}): Promise<LlmChatResult> {
  const key = serverEnv.ANTHROPIC_API_KEY;
  if (!key?.trim()) throw new Error("ANTHROPIC_API_KEY not set");
  const client = new Anthropic({ apiKey: key });
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  });
  const text =
    response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n") || "";
  return { text, provider: "anthropic", model: CLAUDE_MODEL };
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
  const res = await fetch(MINIMAX_CHAT_URL, {
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

async function callOne(
  provider: LlmProviderId,
  params: { system: string; user: string; maxTokens: number; temperature: number },
): Promise<LlmChatResult> {
  if (provider === "anthropic") return callAnthropic(params);
  return callMiniMax(params);
}

/**
 * 统一 LLM 对话调用。
 * - 策略 first：并发请求所有已配置的 Key，采用最先成功返回的结果。
 * - 策略 cheapest：仅用当前配置中「最便宜」的一个 Key 调用。
 */
export async function unifiedChat(params: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<LlmChatResult | null> {
  const providers = getAvailableProviders();
  if (providers.length === 0) return null;

  const maxTokens = params.maxTokens ?? 2000;
  const temperature = params.temperature ?? 0.3;
  const options = { system: params.system, user: params.user, maxTokens, temperature };

  if (getStrategy() === "cheapest") {
    const provider = providers[0];
    try {
      return await callOne(provider, options);
    } catch (e) {
      if (providers.length > 1) {
        try {
          return await callOne(providers[1], options);
        } catch {
          throw e;
        }
      }
      throw e;
    }
  }

  // first: 并发，取最先成功返回的
  const results = await Promise.allSettled(
    providers.map((p) => callOne(p, options)),
  );
  const fulfilled = results.find((r) => r.status === "fulfilled") as
    | PromiseFulfilledResult<LlmChatResult>
    | undefined;
  if (fulfilled) return fulfilled.value;
  const firstRejection = results.find((r) => r.status === "rejected") as
    | PromiseRejectedResult
    | undefined;
  if (firstRejection) throw firstRejection.reason;
  return null;
}
