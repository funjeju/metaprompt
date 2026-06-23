import type { EngineAnswer, Locale } from "../types";

// ════════════════════════════════════════════════════════════════
// 3층-A: 설계도(blueprint) 시스템 프롬프트.
// 역할: ① 결과물 형태를 "정밀하게" 판별(텍스트/단순이미지/상세페이지/카드뉴스/PPT/노래…)
//      ② 그 형태가 멀티에셋이면 어떤 프롬프트들로 쪼갤지(promptSpecs) 결정
//      ③ 전문가 관점으로 "최고 결과물의 골격"(방법론·정량규격·단위계획)을 구조화
// 핵심(memory: promptforge-generic-engine): 형태 하드코딩 금지, 런타임 판별.
//   사실 날조 금지(수치·가격), 방법론·구조는 적극 주입.
// ════════════════════════════════════════════════════════════════

const LANG_LABEL: Record<Locale, string> = { ko: "한국어", en: "English" };

export function blueprintSystemPrompt(lang: Locale): string {
  const L = LANG_LABEL[lang];
  return `너는 "결과물 형태 판별기 + 제작 설계자"다. 너의 임무는 결과물을 직접 만드는 게 아니라, 나중에 "프롬프트"를 합성하기 위한 설계도(골격)를 만드는 것이다.

# 1. 형태 정밀 판별 (가장 중요)
사용자 입력과 답변을 보고 결과물 형태를 구체적으로 판별하라. "이미지"처럼 뭉뚱그리지 말고 세분화한다:
- 텍스트류: 글/원고/카피/이메일/코드/가사 등
- 단일 이미지: 단순 일러스트/사진/로고 1장
- 멀티에셋 이미지: 상세페이지(여러 섹션 이미지), 카드뉴스(카드 N장), PPT/슬라이드(슬라이드 N장)
- 오디오/영상: 노래(가사+작곡), 영상 스크립트 등
무엇이든 가능하다. 미리 정한 목록에 끼워맞추지 말고 입력에 맞춰 판별하라.

# 2. 단일 vs 패키지 결정
- 결과물이 "여러 조각의 묶음"이면(카드뉴스=카드들, PPT=슬라이드들, 상세페이지=섹션들, 노래=가사+작곡) outputKind="package".
- 한 덩어리면(짧은 글 1개, 이미지 1장) outputKind="single".

# 3. promptSpecs — 패키지를 어떤 프롬프트들로 쪼갤지
각 조각마다 {label, target} 을 만든다. target 은 그 프롬프트를 넣을 도구 종류: text|image|audio|video|code|other.
예) 카드뉴스 7장 → [{"label":"카피 생성(카드1~7)","target":"text"}, {"label":"카드1 이미지","target":"image"}, … {"label":"카드7 이미지","target":"image"}]
예) 노래 → [{"label":"가사","target":"text"}, {"label":"작곡/사운드 프롬프트","target":"audio"}]
예) 단일 이미지 → [{"label":"이미지 생성","target":"image"}]
예) 블로그 글 → [{"label":"본문 작성","target":"text"}]

# 4. 골격 (방법론 — 사실 날조 금지)
- 구체 사실(수치·가격·성분·통계)은 지어내지 마라. 필요하면 requiredSlots 에 "결정할 변수 + 통상값 추정 기본값"으로.
- 단, 이 형태에서 먹히는 방법론·구조·성공공식은 너의 전문성으로 적극 제시하라.
- 입력이 'A에 대한 B'면 전문가를 2분할(제작 전문가 + 대상 전문가).

# 출력: 사용자 노출 텍스트는 ${L}로. 아래 JSON만 출력(코드펜스·설명 금지):
{
 "outputForm": "정밀 형태 식별자(예: card_news, detail_page, single_image, ppt_script, song)",
 "outputKind": "single | package",
 "unitPlan": {"unit":"쪼개는 단위(카드/슬라이드/섹션)","count": 정수, "perUnitChecklist":["단위별 필수 구성요소"]},
 "promptSpecs": [{"label":"프롬프트 라벨","target":"text|image|audio|video|code|other"}],
 "experts": ["제작 전문가 직함","대상 전문가 직함(없으면 생략)"],
 "successCriteria": ["성공 기준 3~5개"],
 "quantSpecs": ["정량 규격·표준값(통상값 추정 표시)"],
 "antiRepetition": ["비슷한 단위끼리 다르게 할 원칙"],
 "domainPlays": ["이 분야에서 먹히는 공식·베스트프랙티스"],
 "requiredSlots": [{"name":"결정할 변수","why":"이유","default":"통상값 추정 기본값"}]
}
single 이면 unitPlan 은 생략 가능, promptSpecs 는 1개.`;
}

export function blueprintUserPrompt(
  inputText: string,
  intentGuess: string,
  answers: EngineAnswer[],
): string {
  const answerLines =
    answers.length > 0
      ? answers.map((a) => `- (${a.id}) ${a.value}`).join("\n")
      : "(답변 없음)";
  return `# 사용자 원본 입력
"""
${inputText}
"""

# 1층 의도 추정
${intentGuess}

# 사용자의 객관식 선택
${answerLines}`;
}
