import { webSearchGround, type WebSearchResult } from "@/lib/llm";
import type { EngineAnswer, EngineSource, Locale } from "./types";

// ════════════════════════════════════════════════════════════════
// RAG grounding (필수·최신성). 정적 인덱스가 아니라 생성 시점 실시간 web_search 로
// 현재 사실/트렌드를 가져오고(출처 포함), 유저 제공 자료(URL/텍스트)를 우선 근거로 둔다.
// 결과는 synthesis 로 넘어가 마스터 프롬프트의 "[검증된 최신 정보]" 블록이 된다.
// ════════════════════════════════════════════════════════════════

const LANG_LABEL: Record<Locale, string> = { ko: "한국어", en: "English" };
const URL_RE = /^https?:\/\/\S+$/i;
const MATERIAL_MAX = 4000;

/** 유저 자료가 URL이면 본문을 가볍게 가져와 텍스트로 변환. 실패 시 원문 유지. */
async function resolveUserMaterial(raw: string): Promise<string> {
  const trimmed = raw.trim();
  if (!URL_RE.test(trimmed)) return trimmed.slice(0, MATERIAL_MAX);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(trimmed, {
      signal: ctrl.signal,
      headers: { "User-Agent": "PromptForgeBot/1.0" },
    });
    clearTimeout(timer);
    if (!res.ok) return trimmed;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return `${trimmed}\n${text}`.slice(0, MATERIAL_MAX);
  } catch {
    return trimmed; // 가져오기 실패해도 URL 자체는 근거로 전달
  }
}

export interface RunGroundingInput {
  inputText: string;
  intentGuess: string;
  answers: EngineAnswer[];
  /** 유저가 올린 참고 자료(URL 또는 텍스트, 선택). */
  userMaterial?: string;
  outputLang: Locale;
}

export interface RunGroundingOutput {
  /** synthesis 로 넘길 grounding 컨텍스트(검증된 최신 사실 + 유저 자료). */
  groundingText: string;
  sources: EngineSource[];
  usage: WebSearchResult | null;
}

export async function runGrounding(
  input: RunGroundingInput,
): Promise<RunGroundingOutput> {
  const { inputText, intentGuess, answers, userMaterial, outputLang } = input;
  const L = LANG_LABEL[outputLang];

  const answerLine = answers.map((a) => a.value).join(", ");
  const query = `다음 주제로 ${L} 결과물을 만들기 위한 "현재(최신) 사실·수치·트렌드·업계 관례"를 신뢰할 출처와 함께 조사해줘. 추측 금지, 확인되는 것만. 주제: "${inputText}". 의도: ${intentGuess}. 사용자 선택: ${answerLine || "(없음)"}. 핵심 사실 3~6개를 출처와 함께 ${L}로 간결히.`;

  let webText = "";
  let sources: EngineSource[] = [];
  let usage: WebSearchResult | null = null;
  try {
    const r = await webSearchGround(query);
    webText = r.text;
    sources = r.citations;
    usage = r;
  } catch (err) {
    console.warn("[grounding] web_search 실패(무시하고 진행):", err);
  }

  const materialText = userMaterial
    ? await resolveUserMaterial(userMaterial)
    : "";

  const parts: string[] = [];
  if (materialText) {
    parts.push(
      `## 유저 제공 자료 (최우선 근거 — 제품 고유 정보는 이걸 우선 사용)\n${materialText}`,
    );
  }
  if (webText) {
    const srcList = sources
      .map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`)
      .join("\n");
    parts.push(
      `## 실시간 웹 검색으로 확인한 최신 사실 (출처 포함)\n${webText}${
        srcList ? `\n\n출처:\n${srcList}` : ""
      }`,
    );
  }

  return {
    groundingText: parts.join("\n\n"),
    sources,
    usage,
  };
}
