// LLM 원가 추정 (docs/04 4.3 사용량/원가).
// DECISION: 모델별 단가는 공개 기준가 근사치(USD / 1M tokens). 정확 청구액이 아니라
//   대시보드 추정치다. 단가 변동 시 이 표만 갱신한다.

interface Rate {
  input: number; // USD per 1M input tokens
  output: number; // USD per 1M output tokens
}

// 모델 id 부분일치로 매칭. 미매칭 시 보수적 기본값.
const RATES: Array<{ match: RegExp; rate: Rate }> = [
  { match: /opus/i, rate: { input: 15, output: 75 } },
  { match: /sonnet/i, rate: { input: 3, output: 15 } },
  { match: /haiku/i, rate: { input: 1, output: 5 } },
];
const DEFAULT_RATE: Rate = { input: 3, output: 15 };

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
