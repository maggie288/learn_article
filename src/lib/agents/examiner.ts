import type { DifficultyLevel, ExtractionResult, LearningPathChapter, QuizQuestion } from "@/lib/engine/types";
import { callLlmJson } from "@/lib/agents/llm-json";

const SYSTEM = `你是一位严格但公正的考官。为每个章节设计检查题。

题目分布：40% 事实回忆，40% 概念理解，20% 应用迁移。
规则：
1. 只用课程中已讲过的知识就能回答
2. 错误选项必须是常见误解，不能明显荒谬
3. 每道题的解答要解释正确和错误的原因

直接输出结构化结果；不要解释推理过程。只输出 JSON，不要 markdown 代码块或解释。
{
  "questions": [
    {
      "type": "concept_understanding",
      "question": "题目文本",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "B",
      "explanation": "解释"
    }
  ]
}`;

export interface ExaminerResult {
  questions: QuizQuestion[];
}

function parseQuestions(jsonStr: string): QuizQuestion[] {
  try {
    const parsed = JSON.parse(jsonStr) as { questions?: unknown[] };
    if (!Array.isArray(parsed.questions)) return [];
    return parsed.questions
    .filter((q): q is { question: string; options: string[]; correct: string; explanation?: string } => {
      const o = q as Record<string, unknown> | null | undefined;
      return (
        o != null &&
        typeof o === "object" &&
        typeof o.question === "string" &&
        Array.isArray(o.options) &&
        typeof o.correct === "string"
      );
    })
    .map((q) => ({
      type: (q as { type?: string }).type ?? "concept_understanding",
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation,
    }));
  } catch {
    return [];
  }
}

export async function examinerAgent(
  chapter: LearningPathChapter,
  extraction: ExtractionResult,
  _difficulty: DifficultyLevel,
): Promise<ExaminerResult> {
  const user = JSON.stringify(
    {
      chapterTitle: chapter.title,
      concepts: chapter.concepts.map((c) => ({ name: c.name, definition: c.definition })),
      narrationContext: chapter.summary.slice(0, 800),
    },
    null,
    2,
  );
  const out = await callLlmJson<ExaminerResult>({
    system: SYSTEM,
    user,
    parse: (raw) => ({ questions: parseQuestions(raw) }),
  });
  return { questions: out?.questions ?? [] };
}
