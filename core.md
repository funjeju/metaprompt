# core.md — 오케스트레이터 (프로젝트 두뇌)

> 가칭: **PromptForge** (제품명 [결정 필요])
> 한 줄 정의: 유저가 한두 줄만 입력하면, 적응형 객관식 질문으로 의도를 추출해
> "그 분야 최적 실전 프롬프트"를 생성해주는 멀티버티컬 SaaS.
>
> 이 파일은 프로젝트 전체를 통제하는 인덱스다. 세부는 `docs/`에 위임한다.

---

## 1. 이 프로젝트가 뭔가 (30초 요약)

대부분의 프롬프트 생성 도구는 정적 폼이다. 이 제품은 **적응형 의도추론**으로
최소 질문 → 최대 의도 확정을 달성한 뒤, 분야별 전문가 관점으로 최적 프롬프트를 만든다.

핵심 엔진은 3층이다 (상세는 `docs/02-engine.md`):
```
[1층] 의도측정·라우터  → 한두 줄 입력에서 의도 추론 + 객관식 질문(최대 3개)
[2층] 모듈 분기        → 확정 형태를 모듈로 라우팅 (MVP: 1개만 활성)
[3층] 전문가 체인      → 프롬프트 전문가 + 도메인 전문가 → 최종 프롬프트
```

---

## 2. 📍 작업 라우팅 표 (작업 전 해당 문서를 읽어라)

| 지금 하려는 작업 | 먼저 읽을 문서 |
|------------------|----------------|
| 스택·폴더구조·배포·시스템 흐름 | `docs/01-architecture.md` |
| 엔진 로직·LLM 호출·API 입출력 규격·프롬프트 자산 | `docs/02-engine.md` |
| Firestore 스키마·보안규칙·인증·환경변수 | `docs/03-backend-data.md` |
| 페이지/라우트·UI 플로우·어드민·다국어·다크모드 | `docs/04-frontend-ux.md` |
| 무엇을 먼저 만들지·MVP 단계·결정사항 | `docs/05-roadmap.md` |
| 색·폰트·모서리·그림자·컴포넌트 스타일(디자인 토큰) | `docs/06-design-system.md` |

@docs/01-architecture.md
@docs/02-engine.md
@docs/03-backend-data.md
@docs/04-frontend-ux.md
@docs/05-roadmap.md
@docs/06-design-system.md

---

## 3. 전역 개발 원칙 (모든 문서에 우선 적용)

- **보안 우선**: LLM 키는 서버 전용. (`CLAUDE.md` 절대규칙 1)
- **MVP 우선**: 모듈 1개로 증명 후 확장. 범위 폭발 금지.
- **비용 의식**: LLM 호출은 1층(저비용)/3층(고품질)으로 분리. 호출·토큰을 로깅.
- **추측 금지**: 도메인 전문가 역할이 구체 사실(수치·성분 등)을 지어내지 않게 한다.
  값이 없으면 `(자동설정)`/`(확인필요)`로 표시.
- **명령형 지시**: 코드 주석/커밋은 모호하게 쓰지 말고 구체적으로.

## 4. 기술 스택 (한눈에 — 상세는 docs/01)
- Frontend/배포: **Next.js 14 (App Router) + Vercel**
- 인증/DB/분석: **Firebase (Auth + Firestore + Analytics)**
- 서버 로직: **Vercel Route Handlers** (권장. [결정 필요: vs Firebase Functions])
- 스타일: **Tailwind CSS** (`darkMode: "class"`)
- 다국어: **next-intl** (가정)
- LLM: Anthropic / OpenAI (서버에서만 호출)

## 5. 지금 당장 정해야 하는 것 (개발 막힘 방지)
→ `docs/05-roadmap.md` 12장 참조. 특히:
1. 첫 모듈 1개 (상세페이지 / 카드뉴스 / PPT원고 …)
2. 서버 로직 위치 (Vercel vs Firebase Functions)
3. 제품명
