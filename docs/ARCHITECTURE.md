# 구조 설계

## 1. 기술 구성

| 영역 | 선택 | 메모 |
|---|---|---|
| 사이트 | Astro (정적 출력) + TypeScript strict | 서버 없이 HTML로 빌드한다. 버전은 T01에서 최신 안정판으로 정하고 `docs/DECISIONS.md`에 적는다. |
| 움직이는 부분 | Preact 섬(island) | 인터뷰·장보기·재확인·계산대·사전처럼 상태가 있는 곳만 섬으로 만든다. 나머지는 정적 HTML. |
| 상태 | nanostores + @nanostores/persistent | 브라우저 localStorage에 저장. 키 이름은 아래 4절. |
| 판단 | `src/lib/engine/` (이미 있음) | 데이터와 규칙만으로 계산하는 순수 함수. 명세는 `docs/ENGINE.md`. |
| 자료 | `data/*.json` + `schemas/*.schema.json` | 빌드 때 import. 검사는 `npm run validate`. |
| 검색 | MiniSearch | 빌드 때 색인을 만들어 `public/search-index.json`으로 내보낸다. 한글 처리는 7절. |
| 공유 링크 | lz-string | 주소의 `#r=` 뒤에 압축해 넣는다. 서버로 가지 않는다. |
| 배포 | Cloudflare Workers 정적 파일(static assets) 무료 플랜 | 정적 파일 요청은 무료·무제한. 주소는 처음엔 `이름.하위도메인.workers.dev`. |
| 집계 | Worker 함수 `/api/event` + D1 | 날짜별 이벤트 횟수만. 무료 플랜: Worker 요청 하루 10만 건, D1 쓰기 하루 10만 행. |
| 방문 통계 | Cloudflare Web Analytics | 쿠키 없음. `/receipt`에는 싣지 않는다. |
| 자동화 | GitHub Actions | 검사·시험·배포, 2단계부터 색인 갱신. 공개 저장소는 무료. |
| 시험 | Vitest(엔진·자료), Playwright 1.56.1 + @axe-core/playwright(화면·접근성) | Playwright는 컨테이너 Chromium에 맞춰 고정 (D33). 시각 점검·예산은 `scripts/qa/` |
| 글꼴 | Pretendard(본문), `CC Receipt`(영수증·전광판, D2Coding에서 글자를 골라 이름을 바꿈) | 둘 다 OFL. Pretendard는 가변 글꼴 동적 하위 집합(D38), 영수증 글꼴은 고정 문구 글자만 고른 하위 집합 (D29·D37). `public/fonts/`에 직접 두고 라이선스 파일을 함께 둔다. |
| 모션 | CSS 전환·키프레임·`@starting-style`·`offset-path`·CSS 3D, 문서 간 View Transitions, 직접 쓴 `src/lib/motion.ts` (약 2KB) | 라이브러리 없음. 계산대 색종이만 `canvas-confetti`(ISC, 4.3KB) 지연 로드 (D25, D26) |
| 효과음 | `src/lib/sfx.ts` + 켰을 때만 동적 import하는 합성기 | 기본 꺼짐, 소리 파일 없음 (D28) |
| 아이콘·그림 | Fluent Emoji 3D(MIT) 128px webp는 `public/emoji/`, Phosphor(MIT) SVG는 빌드 때 인라인, 기사님은 `src/assets/mascot/`(Astro `<Picture>`로 크기별 webp·avif), 나머지는 직접 그린 SVG | D27 |

Cloudflare Pages가 아니라 Workers로 가는 이유는 `docs/DECISIONS.md`의 D04.

## 2. 폴더

```text
code-chauffeur/
├─ CLAUDE.md                 Claude Code가 매번 읽는 규칙
├─ .claude/                  규칙(rules), 스킬(skills), 전문가 에이전트(agents), 훅(hooks), settings.json
├─ THIRD_PARTY_NOTICES.md    가져온 스킬·글꼴·아이콘·라이브러리의 라이선스
├─ data/                     자료 (사람이 고치는 곳)
│  ├─ golden/                추천 회귀 검사 사례
│  └─ index/                 (T19) 자동 수집 색인. 저장소 기록에는 올리지 않는다
├─ schemas/                  자료 스키마
├─ scripts/                  검사·예시·색인 스크립트 (Node로 바로 실행)
│  ├─ lib/                   부작용 없는 도우미 (자료 읽기, 골든 비교, 색 대비). 시험에서도 import
│  ├─ guard/                 품질 바닥선(floor-guard), 하네스 앞머리 검사
│  ├─ fonts/                 글꼴 만들기 (Pretendard 조각 복사, CC Receipt 하위 집합·이름 바꾸기)
│  └─ qa/                    시각 점검(shots), 성능 예산(budget), 정적 서버(serve)
├─ src/
│  ├─ lib/engine/            판단 엔진 (화면과 무관한 순수 함수)
│  ├─ lib/                   (T05~T06) 자료 싣기, 상태 저장, 공유 링크, 진행(주행 거리·도장) / (T06b) 모션·효과음 / (T18) 집계 보내기 / (T15) 검색
│  ├─ assets/mascot/         기사님 그림 원본 (소유자 제공)
│  ├─ components/            (T07~) Astro 컴포넌트와 Preact 섬
│  ├─ layouts/               (T05) 기본 틀: 노선 띠·전광판, 사전 버튼
│  ├─ pages/                 (T01, T07~) 라우트
│  ├─ copy/ko.ts             (T05) 화면 고정 문구. 엔진이 쓰는 문장은 data/templates.json
│  └─ styles/tokens.css      디자인 토큰 (이미 있음)
├─ tests/                    (T03~) Vitest 시험, tests/fixtures/ 가짜 자료
├─ worker/index.ts           (T18) /api/event 집계 함수 (따로 tsconfig)
├─ migrations/               (T18) D1 표 만들기 SQL
├─ public/                   글꼴(fonts/), 3D 그림 문자(emoji/), 빌드 때 만든 검색 색인
└─ docs/                     문서
```

## 3. 라우트

| 주소 | 화면 | 만드는 방식 |
|---|---|---|
| `/` | 홈: "어디로 모실까요?", 두 입구, 레시피 3개, 이어서 하기 | 정적 + 작은 섬 |
| `/lesson` | 첫 수업 | 정적 + 복사 버튼 섬 |
| `/interview` | 인터뷰 | 섬 |
| `/shop` | 장보기 | 섬 |
| `/check` | 재확인 | 섬 |
| `/receipt` | 계산대: 영수증·설계 꾸러미·대화 카드. `#r=`로 다시 열기 | 섬 |
| `/study` | 공부할 것 (영수증 기준 목록) | 섬 |
| `/concepts/[id]` | 개념 카드 (검색 유입용 정적 페이지 + 확인 문제 섬) | 정적 생성 |
| `/shelf` | 진열대: 코너별 구경, 검색 | 정적 + 섬 |
| `/products/[id]` | 진열 상품 상세 (색인 상품은 만들지 않는다) | 정적 생성 |
| `/recipes` | 레시피 목록, "이 레시피로 출발" | 정적 + 섬 |
| `/dictionary` | 사전 전체 화면 (옆 창과 같은 내용) | 섬 |
| `/about` | 서비스 소개, 하지 않는 것, AI를 안 쓰는 이유 | 정적 |
| `/about/scoring` | 추천 공식: `data/scoring.json` 값을 그대로 표로 | 정적 |
| `/legal/privacy` | 개인정보 처리방침 (초안, 사람 검토) | 정적 |
| `/legal/notice` | 이용 안내·면책 (초안, 사람 검토) | 정적 |
| `/404` | 길을 잘못 들었어요 | 정적 |

사전 옆 창은 기본 틀(layout)에 들어가 모든 화면에서 열린다. 정류장마다 열리는 조건은 `docs/UX.md` 2.1절.

## 4. 상태와 저장

모든 저장은 `src/lib/store.ts` 한 곳에서만 한다 (nanostores + @nanostores/persistent). 읽은 값의 모양 고르기는 `src/lib/saved.ts`, 엔진 결과 파생 store(`$result`, `commitSession`)는 자료 전체를 불러오므로 `src/lib/result.ts`에 따로 둔다 (설정 메뉴처럼 결과가 필요 없는 섬이 자료를 싣지 않게). localStorage를 못 쓰는 환경(사생활 보호 모드 등)에서는 메모리에만 두고 안내 한 줄을 보여 준다.

| 키 | 내용 |
|---|---|
| `cc:session:v1` | `Session` (`src/lib/engine/types.ts`): answers, cart, kept, deferred, freeText |
| `cc:study:v1` | `{ [conceptId]: { read: boolean, quiz: number[] } }` 정답 맞힌 문제 번호 |
| `cc:meta:v1` | `{ interviewStartedAt?: number, sent: string[], lessonDone?: true, issued?: true }` 보낸 이벤트 열쇠 (최근 20개만 둔다, 8절), 첫 수업을 끝까지 봄·영수증을 한 번 이상 뽑음 (도장 계산용, D40) |
| `cc:prefs:v1` | `{ motion: 'auto' \| 'reduce', sound: boolean }` (효과음 기본 false) |
| `cc:trip:v1` | `{ seenStamps: string[] }` 이미 장면을 본 도장 id (도장 장면은 처음 한 번만). 주행 거리·도장 자체는 저장하지 않고 계산한다 (D32) |

- 화면은 `Session`을 바꾸고, 결과는 매번 `evaluate(catalog, session)`로 다시 계산한다. 계산 결과를 저장하지 않는다. 저장할 때는 `r.session`(정리된 상태)을 쓴다.
- '저장한 기록 지우기'는 진행 기록 네 키(`session`·`study`·`meta`·`trip`)를 지운다. 설정(`cc:prefs:v1`: 동작 줄이기·효과음)은 기록이 아니라서 남긴다 (멀미 때문에 켠 동작 줄이기가 풀리면 안 된다, D41).
- 주행 거리와 도장은 `src/lib/progress.ts`가 `Session`, `evaluate()` 결과, `cc:study:v1`에서 매번 계산한다 (순수 함수, 시험 있음). 공유 링크로 연 영수증도 같은 규칙으로 계산된다.
- 저장 형식을 바꾸면 키의 `v1`을 올리고, 옛 값은 읽어서 옮긴 뒤 지운다.

## 5. 공유 링크

- 모양: `https://사이트/receipt#r=<압축 문자열>`
- 압축 전 값: `toShareState(session)` → `{ v: 1, a: 답, c: 장바구니, k: 그대로 둔 충돌, d: 2차로 미룬 칸 }`. 자유 입력(freeText)은 넣지 않는다.
- 압축: `LZString.compressToEncodedURIComponent(JSON.stringify(state))`
- 여는 쪽: 압축 풀기 → `fromShareState()`로 모양 검사 → `evaluate()`가 모르는 id를 버린다. 읽자마자 `history.replaceState`로 주소에서 `#r=`를 지운다. 실패하면 "링크가 깨졌어요" 안내 후 홈으로.
- 링크로 연 영수증은 읽기 전용으로 보여 주고, "이 영수증으로 이어 하기"를 누를 때만 저장한다 (지금 상태와 다르면 묻는다).

## 6. 자료를 화면에 싣는 법

- 빌드 때 `data/*.json`을 import해 `Data` 모양으로 묶는 `src/lib/data.ts`를 만든다. 섬은 여기서 `makeCatalog(data)`를 한 번 만들어 쓴다.
- 자료 전체(지금 약 120KB, gzip 약 30KB)는 섬이 필요한 화면에서만 불러온다. 진열 상품이 늘어 200KB를 넘으면 칸별로 나누는 방법을 `docs/DECISIONS.md`에 정하고 바꾼다.
- `data/index/`(T19 자동 색인)는 분야별 JSON으로 `public/index/분야.json`에 내보내고, 장보기·진열대에서 필요한 분야만 불러온다. 파일 수 2만 개, 파일당 25MiB 한도를 지킨다.

## 7. 검색 (사전·진열대)

- 빌드 전에 `scripts/build-search.ts`(T15)가 개념 카드, 에러 안내, 상품(진열·색인), 예상 막힘 문장을 모아 MiniSearch 색인을 만들고 JSON으로 저장한다.
- 낱말 나누기:
  1. 영문·숫자 덩어리와 한글 덩어리를 따로 자른다 ("API키는" → "api", "키는").
  2. 한글 덩어리 끝의 흔한 조사(은·는·이·가·을·를·에·에서·으로·로·와·과·의·도·만)를 떼어 낸 형태도 넣는다 ("키는" → "키").
  3. 한 글자 낱말도 버리지 않고, 두 글자 이상이면 두 글자씩 끊은 조각(bigram)도 함께 넣는다 ("환경변수" → "환경", "경변", "변수").
  4. 영문은 소문자로.
- 같은 낱말 조각이 이름(title)에 걸리면 본문보다 높게 친다 (boost). 그래서 "API키는"은 'API 키' 카드가 'API' 카드보다 위에 온다.
- 에러 붙여 넣기는 검색과 따로 `matchErrors()`(정규식)로 찾는다.

## 8. 집계 (Worker + D1)

이벤트 다섯 개만 받는다. 이름과 구간 값은 정해진 목록만 받고 나머지는 버린다.

| 이벤트 | 구간(bucket) | 보내는 때 |
|---|---|---|
| `interview_start` | 없음 | 답이 하나도 없던 상태에서 첫 답을 고를 때. 이때 `interviewStartedAt`을 적는다 |
| `receipt_issued` | `m00-05`, `m05-10`, `m10-15`, `m15-20`, `m20-30`, `m30+`, `none` | 처음 보는 상태의 영수증이 화면에 나올 때. 구간은 `interviewStartedAt`부터 걸린 시간(첫 수업 제외), 시작 시각이 없으면(레시피·공유 링크) `none` |
| `card_copy` | `first`, `next`, `verify`, `error`, `change` | 대화 카드 복사 |
| `required_done` | 없음 | 그 영수증의 시작 전 필수 개념을 모두 읽었을 때 |
| `quiz_answer` | `ok`, `ng` | 확인 문제 답 (같은 문제는 처음 한 번만) |

- '처음 보는 상태'는 공유 링크 조각(`shareHash(session)`)의 짧은 해시(FNV-1a, `stateKey`)로 가린다. 보낸 이벤트 열쇠를 `cc:meta:v1.sent`에 최근 20개까지 둔다. 같은 열쇠는 다시 보내지 않는다: `receipt_issued:해시`, `card_copy:카드:해시`, `required_done:해시`, `quiz_answer:개념.번호`(처음 고른 답만).
- 레시피로 출발하거나 공유 링크로 이어 하면 `interviewStartedAt`을 지운다 (그 영수증의 구간은 `none`).
- 이벤트 목록·구간·본문 검사·걸린 시간 구간은 `src/lib/event-spec.ts` 한 곳에 두고 화면(`src/lib/track.ts`)과 Worker(`worker/index.ts`)가 같이 쓴다 (시험: `tests/lib/event-spec.test.ts`, `tests/worker/`).

D1 표 (`migrations/0001_events.sql`):

```sql
CREATE TABLE IF NOT EXISTS daily_events (
  day    TEXT    NOT NULL,             -- UTC 날짜 YYYY-MM-DD
  type   TEXT    NOT NULL,
  bucket TEXT    NOT NULL DEFAULT '',
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, type, bucket)
);
```

Worker는 받은 값을 검사한 뒤 한 줄만 쓴다.

```sql
INSERT INTO daily_events (day, type, bucket, count) VALUES (?1, ?2, ?3, 1)
ON CONFLICT (day, type, bucket) DO UPDATE SET count = count + 1;
```

- `POST /api/event`, 본문 `{"t":"card_copy","b":"first"}` (200바이트 이하). 같은 사이트에서 온 요청(`Sec-Fetch-Site: same-origin` 또는 Origin 확인)만 받는다. 응답은 204.
- IP, 기기 정보, 쿠키를 저장하거나 기록하지 않는다. 화면 쪽은 `navigator.sendBeacon`을 쓰고 실패해도 이용자에게 알리지 않는다.
- 하루 한도를 넘으면 그날 집계만 멈춘다 (사이트는 정적이라 영향 없음).
- 통계는 운영자가 `npx wrangler d1 execute code-chauffeur-events --remote --command "SELECT ..."`로 본다. 통계를 보여 주는 공개 주소는 만들지 않는다.
- 로컬 개발(T18): `wrangler.jsonc` 뼈대와 `npx wrangler d1 migrations apply code-chauffeur-events --local`로 로컬 D1을 만들고 `npx wrangler dev`로 시험한다.

## 9. 배포 (Cloudflare Workers 정적 파일)

`wrangler.jsonc` (T18에서 로컬용 뼈대를 만들고, T21에서 `database_id`를 채운다. `database_id`는 `npx wrangler d1 create code-chauffeur-events` 결과):

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "code-chauffeur",
  "main": "worker/index.ts",
  "compatibility_date": "2026-09-20",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    "html_handling": "drop-trailing-slash",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "code-chauffeur-events", "database_id": "채우기", "migrations_dir": "migrations" }
  ]
}
```

- 빌드: `npx astro build` → 배포: `npx wrangler deploy`. 사이트가 전부 정적이라 `@astrojs/cloudflare` 어댑터는 쓰지 않는다.
- `/api/*`만 Worker 함수를 먼저 거치고, 나머지는 정적 파일이 바로 나간다.
- 화면의 링크는 끝 빗금 없이(`/check`) 쓰므로 `html_handling`을 `drop-trailing-slash`로 둔다 (기본값이면 `/check` → `/check/`로 한 번 돌려보낸다). 대표 주소(canonical)도 끝 빗금을 뗀다 (D50).
- Workers 로그(observability)는 끈다. 요청 기록에 IP 같은 정보가 남지 않게 한다 (R-60).
- 배포는 둘로 나눈다.
  - **미리 보기 배포** (T21): main에 합쳐지면 `npm run validate`(개발용)가 통과할 때 배포한다. 모든 화면 위에 "검토 중인 시험판" 띠를 두고, 검색 엔진이 색인하지 않게 `noindex`를 붙인다.
  - **정식 배포** (T22): `npm run validate:release`가 통과해야 한다 (사람 확인이 남은 진열 상품이 없어야 함). 띠와 `noindex`를 뗀다.
- 배포는 GitHub Actions나 Cloudflare의 Git 연결 중 하나로 한다. 비밀 값(CLOUDFLARE_API_TOKEN 등)은 저장소 설정의 Secrets에만 둔다.
- 보안 헤더(Content-Security-Policy 등)를 정적 파일에 붙이는 방법은 T21에서 공식 문서로 확인한다. Web Analytics를 쓰면 `static.cloudflareinsights.com`(스크립트)과 `cloudflareinsights.com`(전송)을 허용해야 한다.

## 10. TypeScript 설정

T01에서 `tsconfig.json`을 아래 모양으로 만든다 (지금 파일은 엔진·스크립트만 검사하는 임시 설정).

```jsonc
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*", "scripts/**/*", "tests/**/*"],
  "exclude": ["dist", "worker"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "types": ["node"]
  }
}
```

- `npm run typecheck`는 `astro check && tsc -p tsconfig.json`으로 바꾼다 (`@astrojs/check` 필요).
- `worker/`는 DOM 타입과 부딪히지 않게 `worker/tsconfig.json`을 따로 두고 `npx wrangler types`로 만든 타입을 쓴다. 만든 타입 파일(`worker/worker-configuration.d.ts`, 약 600KB)은 저장소에 두지 않고 `npm run typecheck:worker`가 그때마다 만든다 (`npm run typecheck`에 들어 있음).

## 11. 성능 기준

- 첫 화면: 모바일 기준 LCP 2.5초 이하, 자바스크립트 100KB 이하(gzip). 다른 페이지는 처음 불러오는 JS 140KB 이하.
- 처음 불러오는 CSS(글꼴 `@font-face` 포함)는 gzip 30KB 이하. CSS는 첫 화면 그리기를 막는다 (D38).
- 페이지마다 그림·애니메이션 파일 합계 300KB 이하. 글꼴은 하위 집합(subset)만 싣는다. 기사님 그림은 `Mascot` 컴포넌트로 화면 크기에 맞는 avif 하나만 내려온다 (보이는 폭 200px일 때 1배 7KB, 2배 15KB).
- 나중에 불러오는 묶음(색종이, 선택 3D 장면)은 하나에 200KB 이하. 유휴 시간이나 이용자 행동 뒤에만 불러온다.
- 영수증 출력 모션은 3초를 넘지 않는다.
- `npm run qa:budget`이 빌드 결과로 이 기준을 검사한다.

## 12. 시험과 CI

| 명령 | 하는 일 |
|---|---|
| `npm run validate` | 스키마 + 교차 검사 |
| `npm run golden` | 추천 회귀 검사 |
| `npm run typecheck` | 타입 검사 |
| `npm run tokens` | 토큰 대비와 동작 줄이기 검사 |
| `npm run fonts:check` | 영수증 글꼴에 고정 문구 글자가 다 있는지 (`npm run fonts`로 다시 만듦) |
| `npm run guard` | 품질 바닥선 (토큰 밖 값, 외부 자원, 화면 코드 속 문장, any, 시험 건너뛰기, 엔진 순수성) |
| `npm run harness` | `.claude/` 스킬·에이전트·규칙 앞머리 검사 |
| `npm run check` | 위 일곱 개 + `npm test`. 커밋 전과 CI에서 돈다 |
| `npm run qa:shots` | 빌드 결과 스크린샷(360·768·1280·동작 줄이기), axe, 가로 스크롤, 작은 버튼, 외부 요청 |
| `npm run qa:budget` | 성능 예산 |
| `npm test` | Vitest: 골든 사례 + 자료 검사(망가뜨린 자료를 잡는지) + 엔진·스크립트 단위 시험 (`tests/*.test.ts`) |
| `npm run test:coverage` | 엔진(`src/lib/engine`) 시험 범위. 줄 기준 90% 이상 (T04부터 문턱으로 막음) |
| `npm run e2e` | Playwright(`tests/e2e/`, 360px): 레시피 5개로 영수증까지, 키보드만으로 인터뷰, 공유 링크 다시 열기, 사전·진열대 검색, 장면 중간 누르기, 동작 줄이기(기기·사이트) 흐름, 모든 화면 axe(처음 온 사람·진행 있음). 빌드한 `dist/`를 `scripts/qa/serve.ts`로 띄운다 |

GitHub Actions(`.github/workflows/check.yml`)는 모든 푸시와 PR에서 `npm ci && npm run check && npm run build && npm run qa:budget && npm run e2e`를 돌린다 (`check`에 `npm test`가 들어 있다). 배포 조건은 9절.
