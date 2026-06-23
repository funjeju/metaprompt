import OpenAI from "openai";
import type { LlmCallParams, LlmCallResult, LlmLayer } from "./types";

export type { LlmCallParams, LlmCallResult, LlmLayer } from "./types";

// ════════════════════════════════════════════════════════════════
// LLM 호출 래퍼 — YOU MUST: LLM 호출은 오직 이 모듈을 통해서만 한다
// (CLAUDE.md 절대규칙 1). 다른 곳에서 직접 fetch/SDK 호출 금지.
// 키는 서버 전용 env(OPENAI_API_KEY)에서만 읽는다.
// DECISION: 프로바이더 OpenAI, 모델 GPT-5.4-mini (2026-06, 가성비·400K 컨텍스트).
//   엔진은 프로바이더 비종속(프롬프트 기반)이라 추후 모델/프로바이더 교체는 이 파일만 수정.
// ════════════════════════════════════════════════════════════════

// 모델 기본값 — env 미설정 시 폴백.
const DEFAULT_MODEL: Record<LlmLayer, string> = {
  intent: "gpt-5.4-mini",
  generate: "gpt-5.4-mini",
  run: "gpt-5.4-mini",
};

function modelFor(layer: LlmLayer): string {
  // run 은 별도 env 없으면 generate 모델을 따른다.
  const fromEnv =
    layer === "intent"
      ? process.env.LLM_MODEL_INTENT
      : layer === "run"
        ? process.env.LLM_MODEL_RUN || process.env.LLM_MODEL_GENERATE
        : process.env.LLM_MODEL_GENERATE;
  return fromEnv?.trim() || DEFAULT_MODEL[layer];
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LlmConfigError(
      "OPENAI_API_KEY 가 설정되지 않았습니다. 서버 환경변수를 확인하세요.",
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey });
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
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function callLLM(params: LlmCallParams): Promise<LlmCallResult> {
  const { layer, system, user, maxTokens, temperature, json } = params;
  const model = modelFor(layer);
  const openai = getClient();

  // GPT-5 계열(reasoning 모델)은 파라미터 규약이 다르다:
  //  - max_tokens → max_completion_tokens (필수)
  //  - temperature 는 기본값(1)만 허용 → 커스텀 값 전달 금지
  //  - reasoning 토큰이 출력 예산을 잠식하므로 한도를 넉넉히 준다.
  const isGpt5 = /gpt-5/i.test(model);

  const req: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  // JSON 모드는 엔진 호출(intent/generate)용. run 등 평문 결과는 json=false.
  // (json_object 모드는 프롬프트에 "json" 문구가 있어야 한다 — 엔진 프롬프트 모두 충족.)
  if (json !== false) {
    req.response_format = { type: "json_object" };
  }

  if (isGpt5) {
    req.max_completion_tokens =
      maxTokens ?? (layer === "intent" ? 4096 : 16384);
    // temperature 미지정 (기본값 사용)
  } else {
    req.max_tokens = maxTokens ?? (layer === "intent" ? 1024 : 4096);
    req.temperature = temperature ?? (layer === "intent" ? 0.4 : 0.7);
  }

  const startedAt = Date.now();
  const completion = await openai.chat.completions.create(req);
  const latencyMs = Date.now() - startedAt;

  const text = completion.choices[0]?.message?.content ?? "";

  return {
    text,
    model,
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
    latencyMs,
  };
}

// ── 이미지 생성 (결과물 바로 보기 — target=image 렌더) ──────────────
// DECISION: 기본 gpt-image-1-mini (2026-06 최저가, 카드당 ~$0.005). env LLM_MODEL_IMAGE 로 교체.
export interface ImageResult {
  b64: string;
  model: string;
  latencyMs: number;
}

export async function generateImage(
  prompt: string,
  opts?: { size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto" },
): Promise<ImageResult> {
  const model = process.env.LLM_MODEL_IMAGE?.trim() || "gpt-image-1-mini";
  const openai = getClient();
  const startedAt = Date.now();
  const res = await openai.images.generate({
    model,
    prompt,
    size: opts?.size ?? "1024x1024",
    n: 1,
  });
  return {
    b64: res.data?.[0]?.b64_json ?? "",
    model,
    latencyMs: Date.now() - startedAt,
  };
}
