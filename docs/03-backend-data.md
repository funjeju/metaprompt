# 03 · 백엔드 & 데이터 (Firestore · 보안 · 인증)

> 상위: `core.md`. DB·권한·환경 관련 작업은 반드시 이 문서를 따른다.

## 3.1 Firestore 컬렉션

```
users/{uid}
  email, displayName, photoURL
  role: "user" | "admin"          // 서버에서만 설정. 클라이언트 변경 금지
  locale: "ko" | "en" | ...
  theme: "dark" | "light" | "system"
  planTier: "free" | "pro"        // (가정: 추후 결제)
  createdAt, lastLoginAt

sessions/{sessionId}              // 프롬프트 생성 1회 = 1세션
  uid (없으면 익명 게스트 id)
  inputText
  intentGuess
  questions[]                     // 던진 질문 + 보기
  answers[]                       // 유저 선택
  routedModule
  finalPrompt
  createdAt, completedAt

usage_logs/{logId}                // 원가/통계용
  sessionId, uid
  layer: "intent" | "generate"
  model, inputTokens, outputTokens
  latencyMs, createdAt

access_logs/{logId}               // 접속 통계용
  uid (or null), ipHash, country, device, path
  event: "login" | "page_view" | "generate"
  createdAt
```

## 3.2 보안 규칙 (Firestore Rules 요지)

- **YOU MUST:** 아래는 클라이언트가 직접 write 금지 → 전부 서버(Admin SDK) 경유.
  - `sessions`, `usage_logs`, `access_logs`
  - `users/{uid}.role`, `users/{uid}.planTier` (권한·과금 필드)
- `users/{uid}` 일반 필드: 본인만 read/write.
- 어드민 전용 조회: 토큰 커스텀 클레임 `admin == true` 검증.

```
// 예시 (의사 규칙)
match /users/{uid} {
  allow read, write: if request.auth.uid == uid
    && !request.resource.data.diff(resource.data).affectedKeys()
         .hasAny(['role','planTier']);   // 권한 필드 자기수정 차단
}
match /sessions/{id}      { allow read: if isOwnerOrAdmin(); allow write: if false; }
match /usage_logs/{id}    { allow read: if isAdmin();        allow write: if false; }
match /access_logs/{id}   { allow read: if isAdmin();        allow write: if false; }
```

## 3.3 인증 / 권한

- Firebase Auth: 구글 로그인 + 이메일/비번 (가정).
- 어드민: Firebase Custom Claims로 `admin: true` 부여. **서버에서만** 설정.
- `middleware.ts`: `/admin/*` 접근 시 토큰 클레임 검증, 실패 시 리다이렉트.
- 게스트: 비로그인 체험 허용. 단 **rate limit 권장** [정책 결정 필요].

## 3.4 개인정보 주의

- **IP는 해시(`ipHash`)로 저장.** 국가 통계만 필요하면 원본 IP 미저장.
- 한국 개인정보보호법 / AI 생성물 표시 의무 [확인필요] — 출시 전 법적 검토.
- 트랜스크립트·로그에 민감정보가 들어가지 않게 LLM 호출 입력을 점검.

## 3.5 통계 집계

- 어드민 대시보드 수치는 `access_logs` / `usage_logs` / `sessions` / `users` 집계.
- 실시간 집계 쿼리 또는 일배치(스케줄 Functions)로 요약 문서 생성 [방식 결정 필요].
- 대시보드 화면 정의 → `docs/04-frontend-ux.md`.
