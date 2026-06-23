// LLM 원가 추정 (docs/04 4.3 사용량/원가).
// DECISION: 모델별 단가는 공개 기준가 근사치(USD / 1M tokens). 정확 청구액이 아니라
//   대시보드 추정치다. 단가 변동 시 이 표만 갱신한다.

interface Rate {
  input: number; // USD per 1M input tokens
  output: number; // USD per 1M output tokens
}

// 모델 id 부분일치로 매칭(2026-06 기준). 구체 변형을 베이스보다 먼저 둔다.
// 미매칭 시 보수적 기본값.
const RATES: Array<{ match: RegExp; rate: Rate }> = [
  // OpenAI GPT-5 계열 (현재 사용)
  { match: /gpt-5\.5-pro/i, rate: { input: 30, output: 180 } },
  { match: /gpt-5\.5/i, rate: { input: 5, output: 30 } },
  { match: /gpt-5\.4-mini/i, rate: { input: 0.75, output: 4.5 } },
  { match: /gpt-5\.4-nano/i, rate: { input: 0.2, output: 1.25 } },
  { match: /gpt-5\.4-pro/i, rate: { input: 30, output: 180 } },
  { match: /gpt-5\.4/i, rate: { input: 2.5, output: 15 } },
  { match: /gpt-5-mini/i, rate: { input: 0.25, output: 2 } },
  { match: /gpt-5/i, rate: { input: 1.25, output: 10 } },
  // OpenAI GPT-4 계열 (레거시)
  { match: /gpt-4o-mini/i, rate: { input: 0.15, output: 0.6 } },
  { match: /gpt-4o/i, rate: { input: 2.5, output: 10 } },
  // Anthropic (추후 전환 대비)
  { match: /opus/i, rate: { input: 15, output: 75 } },
  { match: /sonnet/i, rate: { input: 3, output: 15 } },
  { match: /haiku/i, rate: { input: 1, output: 5 } },
];
const DEFAULT_RATE: Rate = { input: 5, output: 30 };

function rateFor(model: string): Rate {
  return RATES.find((r) => r.match.test(model))?.rate ?? DEFAULT_RATE;
}

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = rateFor(model);
  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}
