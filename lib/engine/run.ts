import { callLLM, type LlmCallResult } from "@/lib/llm";
import type { Locale } from "./types";

// ════════════════════════════════════════════════════════════════
// "결과물 바로 보기" — 생성된(또는 원본) 프롬프트를 실제로 실행해 결과물을 만든다.
// docs/04 4.2 step5 (2차 플래그십), docs/05 Phase 3.
// MVP: 텍스트 결과만. (이미지/음악 등은 추후 전용 모델 플러그인 자리 — 현재는 모델이
//   텍스트로 결과/설명을 산출한다.) JSON 모드를 끄고 평문으로 받는다.
// ════════════════════════════════════════════════════════════════

const LANG_LABEL: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

function runSystemPrompt(outputLang: Locale): string {
  const lang = LANG_LABEL[outputLang];
  return `너는 주어진 프롬프트를 충실히 수행하는 실행기다. 아래 프롬프트가 요구하는 결과물을 실제로 만들어서 출력하라. 프롬프트에 대한 설명·메타발언 없이 결과물 자체만 ${lang}로 출력한다. 결과물이 이미지/영상 등 텍스트로 직접 만들 수 없는 형태라면, 그 결과물을 충실히 묘사·기획한 텍스트로 대신 산출한다.`;
}

export interface RunPromptOutput {
  result: string;
  usage: LlmCallResult;
}

export async function runPrompt(
  prompt: string,
  outputLang: Locale,
): Promise<RunPromptOutput> {
  const usage = await callLLM({
    layer: "run",
    system: runSystemPrompt(outputLang),
    user: prompt,
    json: false, // 평문 결과
  });
  return { result: usage.text.trim(), usage };
}
