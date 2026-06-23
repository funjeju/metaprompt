# 01 · 아키텍처 (스택 · 폴더구조 · 흐름)

> 상위: `core.md`. 이 문서는 "무엇으로, 어떻게 배치하는가"를 정의한다.

## 1.1 기술 스택 & 선택 근거

| 영역 | 선택 | 근거 |
|------|------|------|
| 프론트엔드 | Next.js 14 (App Router) | Vercel 네이티브, SSR·i18n·다크모드 용이 |
| 배포 | Vercel | Next.js 최적, 프리뷰 배포 |
| 인증 | Firebase Auth | 구글/이메일 로그인 빠른 구현 |
| DB | Firestore | 서버리스, 실시간, 로그/통계 적재 용이 |
| 서버 로직 | **Vercel Route Handlers** (권장) | 배포·디버깅 단일화. [결정 필요: vs Firebase Functions] |
| 분석 | Firebase Analytics + 자체 로그 컬렉션 | 어드민 대시보드 소스 |
| LLM | Anthropic / OpenAI API | 서버에서만 호출 |
| 스타일 | Tailwind CSS | 다크모드·디자인토큰 |
| 다국어 | next-intl (가정) | App Router 호환 우선 [결정 필요] |

> ⚠ 서버 로직 위치를 Vercel Route Handlers로 통일하면 Firebase는 Auth·DB·Analytics만
> 담당한다. Firebase Functions를 별도로 쓰면 배포 파이프라인이 둘로 갈리니 주의.

## 1.2 요청 흐름

```
브라우저 (Next.js / Vercel)
   │  ① 한 줄 입력
   ▼
POST /api/intent  ──②──►  LLM (1층: 의도측정 + 객관식 질문)   ← 저비용 모델
   │  ③ 질문 JSON 반환
   ▼
유저가 객관식 선택  ──④──►  POST /api/generate
   │                         └─⑤─►  LLM (3층: 전문가 체인)     ← 고품질 모델
   ▼
최종 프롬프트 표시(복사) + Firestore에 session/usage/access 로그 적재
```

자세한 엔드포인트 입출력 규격 → `docs/02-engine.md`.

## 1.3 폴더 구조 (제안)

```
/
├── CLAUDE.md
├── core.md
├── docs/
├── app/
│   ├── (public)/page.tsx          # 랜딩 + 입력창
│   ├── generate/page.tsx          # 생성 플로우(입력→질문→결과)
│   ├── history/page.tsx           # 내 기록(로그인)
│   ├── settings/page.tsx          # 언어·테마·계정
│   ├── admin/                     # 어드민(role=admin)
│   │   ├── page.tsx               # 대시보드
│   │   ├── users/page.tsx
│   │   ├── sessions/page.tsx
│   │   └── usage/page.tsx
│   └── api/
│       ├── intent/route.ts        # 1층
│       ├── generate/route.ts      # 3·4층
│       └── log/route.ts           # 이벤트 로깅
├── lib/
│   ├── firebase/                  # client & admin SDK 초기화
│   ├── llm/                       # LLM 호출 래퍼(키는 여기서만)
│   ├── engine/                    # 1·2·3층 로직 + 프롬프트 템플릿
│   └── i18n/
├── components/                    # 입력창, 객관식 카드, 프롬프트 블록, 토글 등
├── messages/                      # ko.json, en.json (i18n 문자열)
└── middleware.ts                  # /admin 권한 가드, locale 처리
```

## 1.4 환경 변수 (.env)

```
# 클라이언트 공개 가능
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# 서버 전용 — NEXT_PUBLIC 금지
FIREBASE_ADMIN_PRIVATE_KEY=
ANTHROPIC_API_KEY=          # 또는 OPENAI_API_KEY
LLM_MODEL_INTENT=           # 1층용(저비용)
LLM_MODEL_GENERATE=         # 3층용(고품질)
```
> 상세 보안 규칙은 `docs/03-backend-data.md`.
