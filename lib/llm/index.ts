import Anthropic from "@anthropic-ai/sdk";
import type { LlmCallParams, LlmCallResult, LlmLayer } from "./types";

export type { LlmCallParams, LlmCallResult, LlmLayer } from "./types";

// ════════════════════════════════════════════════════════════════
// LLM 호출 래퍼 — YOU MUST: LLM 호출은 오직 이 모듈을 통해서만 한다
// (CLAUDE.md 절대규칙 1). 다른 곳에서 직접 fetch/SDK 호출 금지.
// 키는 서버 전용 env(ANTHROPIC_API_KEY)에서만 읽는다.
// DECISION: 기본 프로바이더 Anthropic (docs/01 1.4 env 예시 기준).
// ════════════════════════════════════════════════════════════════

// 모델 기본값 — env 미설정 시 폴백. claude-api 스킬 기준 최신 모델 id.
const DEFAULT_MODEL: Record<LlmLayer, string> = {
  intent: "claude-haiku-4-5-20251001", // 저비용
  generate: "claude-opus-4-8", // 고품질
};

function modelFor(layer: LlmLayer): string {
  const fromEnv =
    layer === "intent"
      ? process.env.LLM_MODEL_INTENT
      : process.env.LLM_MODEL_GENERATE;
  return fromEnv?.trim() || DEFAULT_MODEL[layer];
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new LlmConfigError(
      "ANTHROPIC_API_KEY 가 설정되지 않았습니다. 서버 환경변수를 확인하세요.",
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

/** 키 미설정 등 설정 오류. 라우트에서 503으로 매핑. */
export class LlmConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmConfigError";
  }
}

/** 환경변수만으로 LLM 사용 가능 여부 확인(라우트 사전 점검용). */
export function isLlmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function callLLM(params: LlmCallParams): Promise<LlmCallResult> {
  const { layer, system, user, maxTokens, temperature } = params;
  const model = modelFor(layer);
  const anthropic = getClient();

  const startedAt = Date.now();
  const message = await anthropic.messages.create({
    model,
    max_tokens: maxTokens ?? (layer === "intent" ? 1024 : 4096),
    temperature: temperature ?? (layer === "intent" ? 0.4 : 0.7),
    system,
    messages: [{ role: "user", content: user }],
  });
  const latencyMs = Date.now() - startedAt;

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    text,
    model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    latencyMs,
  };
}
