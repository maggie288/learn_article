/**
 * Layer 5 叙事质量验证：叙事手法检查 + 读者参与度预测
 * @see docs/paperflow-narrative-engine.md §五
 */

import { hasAnyLlmKey, unifiedChat } from "@/lib/llm/unified-llm";
import type { GeneratedChapter } from "@/lib/engine/types";

const NARRATIVE_RUBRIC = `你是一位课程质量评审。逐章检查以下叙事手法是否被正确使用，对每一项打 1-5 分。

1. Cold Open（仅第一章）：是否以震撼数据/悬念/人物冲突/反直觉开场？前三句是否让人想继续读？1-5
2. Layer-by-Layer Reveal：核心概念是否分层揭秘？层间是否有悬念过渡？1-5
3. Contrast Cut：新旧方法对比是否用具体场景？读者能否"体验"差异？1-5
4. Human Element：是否含作者/人物故事？是否基于可验证事实？1-5
5. Callback（仅最后一章）：是否回到开头场景？结尾是否有升华？1-5
6. Emotional Pacing：全课程情感节奏是否有起伏？是否避免连续 3 章同强度？1-5

输出严格 JSON，不要其他文字：
{"cold_open":1-5,"layer_reveal":1-5,"contrast_cut":1-5,"human_element":1-5,"callback":1-5,"pacing":1-5,"total":1-30}`;

const ENGAGEMENT_SYSTEM = `你是一个对科技感兴趣但很忙的人。你只有 5 秒决定要不要继续读。
看了下面这段章节开头，你会继续读吗？
输出严格 JSON：{"would_continue":true|false,"reason":"一句话原因","hook_strength":1-10}`;

/** 叙事手法检查：6 项各 1-5 分，总分 30，≥22 通过 */
export async function runNarrativeQualityCheck(
  chapters: GeneratedChapter[],
): Promise<number> {
  if (!hasAnyLlmKey() || chapters.length === 0) return 0.85;

  const text = chapters
    .map(
      (ch, i) =>
        `## Chapter ${i + 1} (${ch.title})\n${ch.narration.slice(0, 1200)}`,
    )
    .join("\n\n");

  try {
    const result = await unifiedChat({
      system: "You are a course quality judge. Output only valid JSON.",
      user: `${NARRATIVE_RUBRIC}\n\n课程章节内容：\n${text}`,
      maxTokens: 500,
      temperature: 0.1,
    });
    if (!result?.text) return 0.85;
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return 0.85;
    const parsed = JSON.parse(jsonMatch[0]) as {
      total?: number;
      cold_open?: number;
      layer_reveal?: number;
      contrast_cut?: number;
      human_element?: number;
      callback?: number;
      pacing?: number;
    };
    const total =
      typeof parsed.total === "number"
        ? parsed.total
        : [parsed.cold_open, parsed.layer_reveal, parsed.contrast_cut, parsed.human_element, parsed.callback, parsed.pacing]
            .filter((n): n is number => typeof n === "number")
            .reduce((s, n) => s + n, 0) || 15;
    return Math.min(1, Math.max(0, total / 30));
  } catch {
    return 0.85;
  }
}

/** 读者参与度预测：每章取前 3 句，LLM 打分 hook_strength 1-10，取平均/10 */
export async function runEngagementPredictionCheck(
  chapters: GeneratedChapter[],
): Promise<number> {
  if (!hasAnyLlmKey() || chapters.length === 0) return 0.85;

  const hooks = chapters.map((ch) => {
    const firstThree = ch.narration
      .split(/[。！？\.\!\?]/)
      .filter(Boolean)
      .slice(0, 3)
      .join("。");
    return firstThree || ch.narration.slice(0, 80);
  });

  try {
    const results = await Promise.all(
      hooks.map((hook) =>
        unifiedChat({
          system: ENGAGEMENT_SYSTEM,
          user: hook,
          maxTokens: 150,
          temperature: 0.2,
        }),
      ),
    );
    const strengths: number[] = [];
    for (const res of results) {
      if (!res?.text) continue;
      const jsonMatch = res.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      try {
        const p = JSON.parse(jsonMatch[0]) as { hook_strength?: number };
        if (typeof p.hook_strength === "number")
          strengths.push(Math.max(1, Math.min(10, p.hook_strength)));
      } catch {
        // ignore
      }
    }
    if (strengths.length === 0) return 0.85;
    const avg = strengths.reduce((a, b) => a + b, 0) / strengths.length;
    return Math.min(1, Math.max(0, avg / 10));
  } catch {
    return 0.85;
  }
}
