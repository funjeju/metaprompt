// 엔진 입출력 타입 — docs/02 2.4 API 규격과 일치시킨다.

export type Locale = "ko" | "en";

export interface EngineQuestion {
  id: string;
  text: string;
  /** 2~4개 객관식 보기. 마지막에 "기타: 직접 입력" 여지를 둔다. */
  options: string[];
}

export interface EngineAnswer {
  id: string;
  value: string;
}

// ── 1층 (의도측정 + 질문생성) ────────────────────────────────────
export interface IntentResult {
  intentGuess: string;
  needsQuestions: boolean;
  /** 최대 3개. needsQuestions=false 면 빈 배열. */
  questions: EngineQuestion[];
}

// ── 3층 (전문가 체인 → 최종 프롬프트) ────────────────────────────
export interface GenerateResult {
  /** 2층이 런타임에 판별한 결과물 형태(자유 문자열, 하드코딩 분기 아님). */
  routedModule: string;
  finalPrompt: string;
  /** 입력에 없어 자동 설정한 값들. (자동설정)/(확인필요) 원칙. */
  assumptions: string[];
  editHint: string;
}
