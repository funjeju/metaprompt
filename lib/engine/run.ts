import { callLLM, type LlmCallResult } from "@/lib/llm";
import { extractJson } from "./json";
import type { ExtractedImagePrompt, Locale } from "./types";

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

// ── 마스터 프롬프트 실행 (우리 사이트에서 결과 만들기) ──────────────
// 마스터(메타프롬프트)를 실행해 ① 사람이 읽는 결과물과 ② 그 안의 이미지 생성
// 프롬프트들을 구조화해 반환한다(렌더용). docs/04 4.2 "한 단계 더".
function runMasterSystemPrompt(lang: Locale): string {
  const L = LANG_LABEL[lang];
  return `너는 아래 "마스터 프롬프트"를 실제로 실행하는 AI다. 마스터의 모든 지시를 충실히 수행해 결과물을 ${L}로 만들어라.
- 마스터에 (확인필요)/(자동설정) 슬롯이 있고 사용자가 값을 안 줬으면, 합리적인 예시 값으로 채워 데모를 완성하되 그 자리에 (예시) 표시.
- 마스터가 "이미지 생성 프롬프트들을 출력하라"고 하면, 그 이미지 프롬프트들을 빠짐없이 만들어라.
출력은 아래 JSON만:
{
 "result": "사람이 읽는 전체 결과물(마크다운). 기획/카피/구조 등 마스터가 요구한 전부.",
 "imagePrompts": [{"label":"단위 이름(예: 섹션1 후킹)","prompt":"이미지 모델에 바로 넣을 이미지 생성 프롬프트 전문"}]
}
이미지가 필요 없는 결과물이면 imagePrompts 는 [].`;
}

export interface RunMasterOutput {
  result: string;
  imagePrompts: ExtractedImagePrompt[];
  usage: LlmCallResult;
}

export async function runMaster(
  masterPrompt: string,
  outputLang: Locale,
): Promise<RunMasterOutput> {
  const usage = await callLLM({
    layer: "run",
    system: runMasterSystemPrompt(outputLang),
    user: masterPrompt,
    json: true,
    maxTokens: 16384,
  });
  const raw = extractJson<{ result?: unknown; imagePrompts?: unknown }>(
    usage.text,
  );
  const imagePrompts: ExtractedImagePrompt[] = Array.isArray(raw.imagePrompts)
    ? raw.imagePrompts
        .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
        .map((p, i) => ({
          label: typeof p.label === "string" ? p.label : `이미지 ${i + 1}`,
          prompt: typeof p.prompt === "string" ? p.prompt.trim() : "",
        }))
        .filter((p) => p.prompt)
    : [];
  return {
    result: typeof raw.result === "string" ? raw.result.trim() : "",
    imagePrompts,
    usage,
  };
}
