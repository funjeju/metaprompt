// 엔진 입출력 타입 — docs/02 2.4 API 규격과 일치시킨다.

export type Locale = "ko" | "en";

export interface EngineQuestion {
  id: string;
  text: string;
  /** 2~4개 객관식 보기. 마지막에 "기타: 직접 입력" 여지를 둔다. */
  options: string[];
  /** 복수 선택 가능 여부. 여러 답이 동시에 성립하는 질문이면 true. */
  multiSelect: boolean;
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

// ── 프롬프트 패키지 (v6) ─────────────────────────────────────────
// 산출물은 "작업 실행 지시"가 아니라 사용자가 결과물을 만들 때 쓸 "프롬프트(들)" 그 자체.
// 멀티에셋(카드뉴스·PPT·상세페이지)이면 단위별 프롬프트 N개로 쪼갠다.
// 형태는 코드 하드코딩이 아니라 런타임 판별값(자유 문자열).

/** 이 프롬프트를 넣을 대상 도구 종류. 렌더 가능 여부 판단에 사용. */
export type PromptTarget = "text" | "image" | "audio" | "video" | "code" | "other";

export interface PromptItem {
  id: string;
  /** 사람이 읽는 라벨. 예: "카피 생성", "카드 1 이미지". */
  label: string;
  target: PromptTarget;
  /** 복사해서 바로 쓰는 완성 프롬프트. */
  prompt: string;
}

export interface GenerateResult {
  /** 런타임에 정밀 판별한 결과물 형태(예: card_news, detail_page, single_image, ppt_script, song). */
  routedModule: string;
  /** 단일 프롬프트인지, 멀티에셋 패키지인지. */
  outputKind: "single" | "package";
  /** 이 패키지가 무엇인지 한 줄 요약(사용 안내). */
  summary: string;
  /** 항상 배열. single이면 길이 1. */
  prompts: PromptItem[];
  /** 입력에 없어 자동 설정한 값들. (자동설정)/(확인필요) 원칙. */
  assumptions: string[];
  editHint: string;
}

// ── 설계도 (blueprint, 3-A) — 합성 단계로 넘기는 중간 산출 ─────────
export interface Blueprint {
  outputForm: string;
  outputKind: "single" | "package";
  /** 멀티에셋일 때 단위 계획(카드/슬라이드/섹션 수 등). */
  unitPlan?: {
    unit: string;
    count: number;
    perUnitChecklist: string[];
  };
  /** 패키지에 포함될 프롬프트 항목 사양(라벨 + target). 합성이 이걸 채운다. */
  promptSpecs: { label: string; target: PromptTarget }[];
  experts: string[];
  successCriteria: string[];
  quantSpecs: string[];
  antiRepetition: string[];
  domainPlays: string[];
  requiredSlots: { name: string; why: string; default: string }[];
}
