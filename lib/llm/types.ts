// LLM 호출 계층(docs/02 2.3). 1층=저비용, 3층=고품질, run=프롬프트 실행(결과물 바로 보기).
export type LlmLayer = "intent" | "generate" | "run";

export interface LlmCallParams {
  layer: LlmLayer;
  system: string;
  user: string;
  /** 응답 상한 토큰. 기본은 호출부에서 결정. */
  maxTokens?: number;
  temperature?: number;
  /** JSON 모드 여부. 기본 true(엔진용). 평문 결과가 필요한 run 등은 false. */
  json?: boolean;
}

export interface LlmCallResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
