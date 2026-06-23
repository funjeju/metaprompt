// LLM 텍스트 응답에서 JSON 객체를 견고하게 추출한다.
// 모델이 코드펜스(```json ... ```)나 앞뒤 설명을 붙여도 복구한다.

export class JsonParseError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "JsonParseError";
  }
}

export function extractJson<T>(text: string): T {
  const trimmed = text.trim();

  // 1) 그대로 파싱 시도
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // continue
  }

  // 2) 코드펜스 제거 후 시도
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // continue
    }
  }

  // 3) 첫 '{' ~ 마지막 '}' 구간 추출 시도
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const slice = trimmed.slice(first, last + 1);
    try {
      return JSON.parse(slice) as T;
    } catch {
      // continue
    }
  }

  throw new JsonParseError("LLM 응답에서 JSON을 파싱하지 못했습니다.", text);
}
