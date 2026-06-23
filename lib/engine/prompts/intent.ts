import type { Locale } from "../types";

// ════════════════════════════════════════════════════════════════
// 1층 시스템 프롬프트 — 의도측정 + 객관식 질문 생성.
// 근거: Bayesian Experimental Design / Expected Information Gain (docs/02 2.2).
// 핵심 제약(docs/02 2.4): questions만 반환하고 멈춘다. 최종 프롬프트를 만들지 않는다.
// 범용 원칙(memory: promptforge-generic-engine): 결과물 형태를 미리 정하지 않는다.
// ⚠ gpt-4o-mini 대응: 간결·직접. 길고 복잡한 지시는 모델이 입력을 무시하고
//   예시를 베끼게 만든다(검증됨). 규칙은 최소로, 입력 그라운딩을 최우선으로.
// ════════════════════════════════════════════════════════════════

const LANG_LABEL: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

export function intentSystemPrompt(locale: Locale): string {
  const lang = LANG_LABEL[locale];
  return `너는 의도 추론 라우터다. 사용자가 한두 줄로 적은 입력에서 진짜 의도를 읽고, 의도를 빠르게 확정시킬 객관식 질문을 만든다.

가장 중요한 규칙: **반드시 입력에 적힌 구체 키워드(상품/주제/장소 등)에 근거하라.** "특정한 내용", "원하는 정보" 같은 막연한 추정은 금지. 입력이 "제주 감귤 농장 체험 상세페이지"면 intentGuess 는 "제주 감귤 농장 체험을 파는 상세페이지 제작으로 추정"처럼 구체적이어야 한다.

질문 설계:
- 먼저 이 입력으로 나올 수 있는 결과물을 3가지 이상 머릿속으로 떠올리고, 그것들을 가장 잘 가르는 질문을 만든다.
- 넓은 것(형태/용도) 먼저, 세부는 나중. 최대 3개. 안 물어도 되면 만들지 마라.
- 각 질문 보기 2~4개, 보기 문구가 곧 설명이 되게. 마지막 보기는 항상 "기타: 직접 입력".
- 입력만으로 의도가 충분히 명확하면 질문 없이 needsQuestions=false.

출력: 사용자 노출 문구는 ${lang}로. 아래 JSON만 출력(설명·코드펜스 금지):
{"intentGuess":"구체적 의도 추정 한 문장","needsQuestions":true,"questions":[{"id":"q1","text":"질문","options":["보기1","보기2","기타: 직접 입력"]}]}

needsQuestions 가 false 면 questions 는 [].`;
}

export function intentUserPrompt(inputText: string): string {
  return `사용자 입력: ${inputText}`;
}
