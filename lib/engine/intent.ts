import { callLLM, type LlmCallResult } from "@/lib/llm";
import { extractJson } from "./json";
import { intentSystemPrompt, intentUserPrompt } from "./prompts/intent";
import type { EngineQuestion, IntentResult, Locale } from "./types";

const MAX_QUESTIONS = 3; // docs/02 2.2

interface RawIntent {
  intentGuess?: unknown;
  needsQuestions?: unknown;
  questions?: unknown;
}

function sanitizeQuestions(raw: unknown): EngineQuestion[] {
  if (!Array.isArray(raw)) return [];
  const questions: EngineQuestion[] = [];
  raw.slice(0, MAX_QUESTIONS).forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const q = item as Record<string, unknown>;
    const text = typeof q.text === "string" ? q.text.trim() : "";
    const options = Array.isArray(q.options)
      ? q.options.filter((o): o is string => typeof o === "string" && o.trim() !== "")
      : [];
    if (!text || options.length < 2) return; // 보기 2개 미만이면 질문으로 무효
    questions.push({
      id: typeof q.id === "string" && q.id.trim() ? q.id.trim() : `q${i + 1}`,
      text,
      options: options.slice(0, 4), // 최대 4개
    });
  });
  return questions;
}

export interface RunIntentOutput {
  result: IntentResult;
  usage: LlmCallResult;
}

export async function runIntent(
  inputText: string,
  locale: Locale,
): Promise<RunIntentOutput> {
  const usage = await callLLM({
    layer: "intent",
    system: intentSystemPrompt(locale),
    user: intentUserPrompt(inputText),
  });

  const raw = extractJson<RawIntent>(usage.text);
  const questions = sanitizeQuestions(raw.questions);
  // 모델이 needsQuestions 를 잘못 줘도 실제 질문 유무로 보정한다.
  const needsQuestions =
    questions.length > 0 && raw.needsQuestions !== false;

  const result: IntentResult = {
    intentGuess:
      typeof raw.intentGuess === "string" ? raw.intentGuess.trim() : "",
    needsQuestions,
    questions: needsQuestions ? questions : [],
  };

  return { result, usage };
}
