// LLM 호출 계층(docs/02 2.3). 1층=저비용, 3층=고품질.
export type LlmLayer = "intent" | "generate";

export interface LlmCallParams {
  layer: LlmLayer;
  system: string;
  user: string;
  /** 응답 상한 토큰. 기본은 호출부에서 결정. */
  maxTokens?: number;
  temperature?: number;
}

export interface LlmCallResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}
