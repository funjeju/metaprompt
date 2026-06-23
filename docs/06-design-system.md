# 06 · 디자인 시스템 (업로드 참조 이미지 기반)

> 상위: `core.md`. UI 색·폰트·모서리·그림자·컴포넌트 스타일은 이 문서가 단일 출처다.
> 본 토큰은 유저 제공 디자인 이미지에서 **실제 추출한 값** 기반이다.
> 폰트 등 이미지로 100% 확정 불가한 항목은 `(추정)` 표시. 확정 시 갱신.

---

## 6.1 디자인 컨셉 (무드)

- 한 줄: **"부드럽고 친근한 데이터 대시보드"** — 파스텔 베이스 + 따뜻한 코랄 액센트.
- 특징: 큰 둥근 모서리, 넉넉한 여백, 낮고 부드러운 그림자, 카드형 정보 블록.
- **시그니처 요소: 코랄→살구 그라데이션.** 이 그라데이션이 브랜드의 얼굴이다.
  핵심 카드·주요 CTA에만 쓰고, 남발하지 마라(스킬 원칙: 보돌드함은 한 곳에).

---

## 6.2 컬러 토큰 — 추출값

| 역할 | HEX | 설명 |
|------|-----|------|
| 배경 (canvas) | `#F2F2F2` | 메인 배경(오프화이트) — 비중 51% |
| 서피스 (card) | `#FFFFFF` ~ `#E4E4EA` | 카드/패널. 기본 흰색, 보조 톤 라벤더그레이 |
| 보더/구분선 | `#CFCFD3` | 카드 테두리·divider |
| **액센트 1 (코랄)** | `#EC807F` | **시그니처 메인** |
| **액센트 1-grad** | `#EC997C` | 코랄→살구 그라데이션 짝 |
| 액센트 1 틴트 | `#E7BAB2` | 연한 코랄(배경 강조·배지) |
| 잉크 (다크) | `#20212E` | 다크 카드 배경·본문 텍스트(네이비블랙) |
| 액센트 2 (블루) | `#707FD3` | 보조 — 버튼·강조 |
| 액센트 3 (그린) | `#59846D` | 보조 — 긍정/성장 지표 |
| 텍스트 보조 | `#919496` | 캡션·라벨 |
| 텍스트 흐림 | `#B0B3BD` | placeholder·비활성 |

### 시그니처 그라데이션
```css
--gradient-brand: linear-gradient(135deg, #EC807F 0%, #EC997C 100%);
```

---

## 6.3 CSS 변수 (라이트 / 다크 매핑)

> Tailwind `darkMode: "class"`(→ `docs/04`)와 연동. `:root`=라이트, `.dark`=다크.
> 다크 팔레트는 추출한 잉크색(#20212E)을 베이스로 **설계(일부 추정)**.

```css
:root {
  /* surface */
  --bg:            #F2F2F2;
  --surface:       #FFFFFF;
  --surface-2:     #E9E9EF;
  --border:        #CFCFD3;
  /* text */
  --text:          #20212E;
  --text-muted:    #919496;
  --text-faint:    #B0B3BD;
  /* accents */
  --accent:        #EC807F;
  --accent-grad-a: #EC807F;
  --accent-grad-b: #EC997C;
  --accent-tint:   #E7BAB2;
  --blue:          #707FD3;
  --green:         #59846D;
  /* feedback (제안값) */
  --success:       #59846D;
  --warning:       #EC997C;
  --danger:        #EC807F;
}

.dark {
  --bg:            #16171F;
  --surface:       #20212E;
  --surface-2:     #2A2C3A;
  --border:        #34374A;
  --text:          #F2F2F2;
  --text-muted:    #9A9DAB;
  --text-faint:    #6B6E80;
  --accent:        #EC807F;   /* 액센트는 양쪽 동일 — 브랜드 일관성 */
  --accent-grad-a: #EC807F;
  --accent-grad-b: #EC997C;
  --accent-tint:   #3A2E30;
  --blue:          #8A98E0;
  --green:         #6FA587;
  --success:       #6FA587;
  --warning:       #EC997C;
  --danger:        #EC807F;
}
```
> ⚠ 다크모드 값은 라이트 기반 설계안이다. 다크 디자인 시안을 받으면 교체하라.

---

## 6.4 모서리 · 그림자 · 여백

이미지의 카드가 크게 둥글고 그림자가 낮고 부드럽다. 그 톤을 토큰화:

```css
--radius-sm:  10px;
--radius-md:  16px;
--radius-lg:  24px;   /* 카드 기본 */
--radius-xl:  32px;   /* 큰 히어로 카드 */
--radius-pill: 999px; /* 검색바·토글·버튼 */

--shadow-sm: 0 1px 2px rgba(32,33,46,0.04);
--shadow-md: 0 4px 16px rgba(32,33,46,0.06);   /* 카드 기본 */
--shadow-lg: 0 12px 32px rgba(32,33,46,0.08);
```

- 간격 스케일(8px 기준): 4 / 8 / 12 / 16 / 24 / 32 / 48.
- 카드 내부 패딩: 기본 24px, 큰 카드 32px.

---

## 6.5 타이포그래피 (일부 추정)

> 이미지에서 폰트를 단정할 수 없다. 한국어 SaaS이므로 한글 지원을 우선해 제안:

| 역할 | 글꼴 (제안) | 비고 |
|------|-------------|------|
| 본문/UI | **Pretendard** `(추정·권장)` | 한글+라틴, 대시보드 가독성 우수 |
| 디스플레이/숫자 | Pretendard SemiBold~Bold, 또는 라틴 강조 시 **Sora**/**Poppins** `(추정)` | 큰 메트릭 숫자에 무게감 |
| 데이터/캡션 | Pretendard Regular, tabular-nums | 숫자 정렬 |

타입 스케일(권장):
```
Display  32–40px / Bold        (대시보드 큰 숫자)
H1       24px / SemiBold
H2       18px / SemiBold
Body     14–15px / Regular
Caption  12px / Medium, --text-muted
```
- 숫자 메트릭은 `font-variant-numeric: tabular-nums` 적용(자릿수 정렬).

---

## 6.6 컴포넌트 스타일 가이드

- **카드**: `--surface`, `--radius-lg`, `--shadow-md`, 패딩 24px. 보더 `--border` 옵션.
- **히어로/주요 카드**: `--gradient-brand` 배경 + 흰 텍스트, `--radius-xl`.
- **버튼(주)**: 코랄 채움 또는 그라데이션, `--radius-pill`, 흰 텍스트.
- **버튼(보조)**: `--surface` + `--border`, 텍스트 `--text`.
- **검색바·토글**: pill, `--surface`, 옅은 보더.
- **통계 타일**: 큰 숫자(Display) + 작은 라벨(Caption) + 미니 차트/배지. 카드별로
  액센트를 코랄/블루/그린/다크 중 하나로 번갈아(이미지 패턴 반영).
- **다크 카드**: `#20212E` 배경 + 흰 텍스트(라이트 모드 안에서도 강조용으로 등장).
- **차트**: 코랄 메인 라인/바, 보조 블루·그린. 그리드선은 `--border` 옅게.

---

## 6.7 Tailwind 매핑 (요지)

```js
// tailwind.config — theme.extend
colors: {
  bg: 'var(--bg)', surface: 'var(--surface)', 'surface-2': 'var(--surface-2)',
  border: 'var(--border)', ink: 'var(--text)',
  muted: 'var(--text-muted)', faint: 'var(--text-faint)',
  accent: 'var(--accent)', blue: 'var(--blue)', green: 'var(--green)',
},
borderRadius: { lg: '24px', xl: '32px' },
boxShadow: { card: 'var(--shadow-md)' },
backgroundImage: { brand: 'var(--gradient-brand)' },
```

---

## 6.8 적용 원칙 (Claude Code에게)
- 모든 색은 **위 CSS 변수만** 사용. 코드에 raw hex 직접 입력 금지(테마 전환 깨짐).
- 코랄 그라데이션은 **시그니처**다. 핵심 1~2곳에만. 전면 남용 금지.
- 다크모드 값은 시안 수령 전 임시. `// DESIGN: dark tentative` 주석 표시.
- 폰트 `(추정)`은 확정 전까지 Pretendard로 두고 교체 가능하게 변수화.
- 이 문서가 `docs/04-frontend-ux.md` 7장(디자인 대기)의 채움본이다.
