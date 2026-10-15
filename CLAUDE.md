# 코드쇼퍼 (code-chauffeur)

**바이브코딩 재료 쇼핑몰.** 앱을 만들 때 쓸 수 있는 공개 재료(폰트·색·아이콘·UI·API·MCP 서버·에이전트 스킬·오픈소스·템플릿·데이터셋)를 카테고리별로 진열하고, 이용자가 쇼핑하듯 둘러보며 장바구니에 담는다. 결제 대신 0원 영수증과 재료 목록(.md)을 받아 자기 AI에게 준다. 사이트는 AI를 부르지 않고, 소유자는 자료만 갱신한다.
소개: "폰트·API·MCP·템플릿까지, 앱 만들 재료를 담아 내 AI에게 건넨다."

정본은 `docs/review/v5/brief.md`(2026-10-14 소유자 결정)와 그것을 줄인 `docs/CONCEPT.md`다. v1~v4(기사·지도·단계·설계도·판단 엔진)는 버렸고 옛 문서·자료는 `docs/archive/v4/`에 있다.

## 지금 상태

- 끝난 것: **D1 자료 가져오기**(6개 대분류 131,370개, `data/catalog/**`, 가져오기 스크립트·스키마·시험), **S1 새 틀**(옛 단계·엔진·자료·화면 지우기, 장바구니 로고·토큰, 머리줄·홈·카테고리·소분류 목록·쪽 번호·상세·장바구니 최소판·임시 검색·용어 사전, 진열대 빌드).
- 끝난 것: **S2 장바구니·영수증·.md**(머리줄 서랍, `/cart`, 담은 뒤 작은 창, 계산 → 0원 영수증 `/receipt?id=`, .md 받기·복사, 지난 영수증 `/receipts`, 최근 본 재료, 스타터 키트 `data/kits.json`, 공유 링크 `/cart#s=`, 설치 명령 한꺼번에 복사, 집계 이벤트 다섯 교체).
- 끝난 것: **S3 찾기·미리 보기·마무리**(전체 검색 `/search?q=&cat=&page=`: 낱말 조각 + 결과 카드 블록, 한글↔영어 같은 뜻 묶음 `data/search-words.json` · 목록 거르기: 소분류마다 자료에서 뽑은 칸, PC 왼쪽 칸·휴대폰 시트, 주소에 남음 · 종류별 상세 미리 보기와 폰트 견본 글꼴 지연 로드 · 넓은 화면 1680, D114~D118).
- 다음: 실제 사이트 점검을 이어 가며 버그를 고치고, 사람 몫(배포 계정·법·상표)을 기다린다.
- 사람 몫은 `docs/HUMAN.md`(계정·배포 H01·H11, 법·상표 H03·H04). 푸시마다 https://code-chauffeur.yoorrard.workers.dev 에 배포되므로 검사가 통과한 것만 푸시한다.

## 일하는 방식 (사람 개입 최소)

소유자는 개입을 최소로 원한다. **묻고 기다리지 말고, 정하고 기록하고 계속한다.**

1. **되돌릴 수 있는 결정**(라이브러리, 배치, 문구, 파일 구조)은 문서와 원칙에 가장 맞는 쪽을 골라 `docs/DECISIONS.md`에 `(자동 결정)`으로 적고 계속한다. 형식: 결정 — 이유 — 틀렸을 때 비용.
2. 문서끼리 어긋나면 v5 brief > CONCEPT > ARCHITECTURE·DATA > TASKS 순으로 따르고, 어긋난 문서를 고친다.
3. **사람만 할 수 있는 일**(계정, 돈, 법·약관, 상표·도메인, 그림 생성)은 `docs/HUMAN.md`에 적고 기다리지 않고 다른 작업을 한다.
4. 완료라고 말하기 전에 증거를 돌린다 (`npm run check`, `npm run build`, 바꾼 것의 e2e, 화면은 390×844·1440×900 스크린샷을 직접 본다). 하위 에이전트의 "끝났다"는 `git diff`로 확인한다.
5. 진행 기록은 `docs/TASKS.md` 맨 아래 한 줄씩. `.claude/` 아래에는 진행 파일을 두지 않는다.

## 꼭 지킬 것

1. 사이트는 AI를 부르지 않는다. 화면에서 부르는 API는 자기 사이트의 `/api/event`(익명 집계) 하나, 바깥 스크립트는 쿠키 없는 Cloudflare Web Analytics(장바구니·영수증 쪽 제외) 하나뿐이다. **예외(brief 5절):** 상품 미리 보기를 위해 출처의 공식 CDN에서 그림과 견본 글꼴을 지연 로드할 수 있다. 추적·광고 스크립트는 없다.
2. 쿠키·광고·제휴 링크·추적·회원가입이 없다. 이용자 상태(장바구니·만들 앱 메모·지난 영수증·최근 본 재료·설정)는 localStorage에만 두고, 저장 코드는 `src/lib/store.ts` 한 곳에만 둔다. 공유 링크에는 재료 id만 싣는다(메모는 싣지 않는다).
3. **상품의 사실(설명·라이선스·인증·무료 여부·인기 지표)은 출처 자료 그대로만 쓴다.** 지어내지 않고, 출처가 없으면 비운다. 진열대 자료(`data/catalog/**`)는 손으로 고치지 않고 가져오기 스크립트를 고쳐 다시 받는다.
4. 정렬·인기 점수·쪽 나누기·카드 모양 같은 진열대 계산은 `src/lib/catalog/core.ts`(순수 함수)에서만 한다. 빌드(`scripts/catalog/build.ts`)와 화면 섬이 같은 함수를 쓴다.
5. 문장을 코드에 박지 않는다. 화면 고정 문구는 `src/copy/ko.ts`. 문체는 **다체**, 표준 용어·외래어는 그대로 (`.claude/rules/copy.md`).
6. 접근성 WCAG 2.2 AA. 휴대폰 360~390px부터 1440px 이상까지(구간 <600 · 600~1023 · 1024~1439 · ≥1440, 최대 폭 1440, 1680px 이상 화면은 1680, D117). 모션은 하나에 1초 안쪽, 누르면 끝, '동작 줄이기'를 따른다.
7. 색·글꼴·크기·모션 길이는 `src/styles/tokens.css`의 변수만 쓴다 (품질 바닥선 검사가 막는다).
8. **Cloudflare 정적 파일은 한 판 2만 개까지.** 상품마다 HTML을 만들지 않는다. 진열대 JSON은 5천 개 아래(`MAX_CATALOG_FILES`), 첫 화면 JS 100KB(gzip), 쪽마다 사이트 안 그림 300KB.
9. 새 의존성은 꼭 필요할 때만 더하고, 이유와 크기(gzip)를 `docs/DECISIONS.md`에 적는다.
10. 비밀 값(Cloudflare API 토큰 같은 것)은 저장소에 넣지 않는다. 실제 배포·원격 D1·비밀 값 명령은 쓰지 않는다 (훅이 막는다). D1의 database_id는 비밀이 아니어서 `wrangler.jsonc`에 둔다.
11. 사람 캐릭터 그림은 쓰지 않는다. 로고는 소유자가 준 장바구니 로고(`assets-src/brand/logo-cart-source.webp`) 하나이고, 화면용은 `npm run logo`가 만든다. 옛 기사 로고는 쓰지 않는다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run check` | 토큰 대비 + 글꼴 글자 + 품질 바닥선 + 쓰지 않는 말 + 하네스 + 타입 검사 + 단위 시험(진열대 계산·실제 자료 개수·가져온 자료 스키마 포함). 커밋 전에 반드시 |
| `npm run build` | 진열대 빌드(`npm run catalog`, 자료·코드가 그대로면 건너뜀) → Astro 빌드 → `dist/` |
| `npm run catalog` | `data/catalog/**` → `public/catalog/`(목록 묶음·상세 조각·검색 조각·결과 블록·거르기 파일, 약 25초) + `.cache/catalog/site.json`(Astro 요약) |
| `npm run import` / `import:design` · `import:ai` · `import:api` · `import:oss` | 진열대 자료 다시 받기 (네트워크 필요, `docs/DATA.md`) |
| `npm test` | Vitest 단위 시험 |
| `npm run guard` / `words` | 품질 바닥선 (토큰 밖 값, 외부 자원, 코드 속 문장, any, 시험 건너뛰기, 주소 글자) / 쓰지 않는 말·해요체 |
| `npm run e2e` | Playwright 주요 흐름(홈 → 카테고리 → 2쪽 → 상세 → 담기 → 장바구니, 390·1440), 정렬, 메뉴, 전체 검색, 거르기, 폰트 견본, 종류별 미리 보기, 장바구니·영수증, 용어 풀이, CSP, axe. 먼저 `npm run build` |
| `npm run qa:budget` / `qa:shots` / `qa:base` | 성능 예산 / 시각 점검 스크린샷·axe → `.qa/` / 하위 주소 빌드 시험 |
| `npm run logo` / `fonts` | 로고 크기별 그림·파비콘 / 글꼴 |

`npm run dev`도 쓴다(진열대 빌드를 먼저 돌린다). Node 22.18 이상. `.ts` 스크립트를 빌드 없이 바로 실행한다. Playwright는 컨테이너의 Chromium과 맞춘 1.56.1로 고정한다. e2e 포트 4400이 바쁘면 `E2E_PORT`를 바꾼다.

## 폴더

```text
data/catalog/    진열대 자료 (<대분류>/index.json + <출처>.json), data/glossary.json 용어, data/kits.json 스타터 키트, data/search-words.json 검색 같은 뜻 묶음
schemas/         자료 스키마
scripts/import/  가져오기 · scripts/catalog/ 진열대 읽기·빌드 · scripts/brand/ 로고 · guard·qa·lib·fonts·deploy
src/lib/catalog/ 진열대 모양(types)·순수 계산(core·search·facets·preview)·미리 보기 CDN 호스트(hosts)·Astro 요약 읽기(site)
src/             components(머리줄·메뉴·카드·섬), pages(라우트), layouts/Base.astro, copy/ko.ts, styles/tokens.css
public/catalog/  진열대 빌드 결과 (저장소에 올리지 않는다)
docs/            문서 (아래), docs/archive/v4/ 옛 문서·자료
.claude/         규칙(rules), 스킬(skills), 전문가 에이전트(agents), 훅(hooks), 설정(settings.json)
```

## 문서 (필요할 때 읽는다)

- `docs/review/v5/brief.md` v5 설계서 (정본) · `docs/CONCEPT.md` 그 요약 · `docs/ARCHITECTURE.md` 기술 구성·라우트·진열대 자료 흐름·저장·배포·성능 · `docs/DATA.md` 진열대 자료 안내
- `docs/DECISIONS.md` 정한 것과 이유 · `docs/TASKS.md` 진행 기록 · `docs/HUMAN.md` 사람 확인 대기열 · `docs/DEPLOY.md` Cloudflare 배포 안내 · `docs/RISKS.md`

## 하네스 지도

- **스킬** (`.claude/skills/`): `/next-task`, `/verify`(모든 검사 보고), `/visual-qa`(화면을 찍어 직접 보기), 그리고 가져와 고친 것: `frontend-design`, `animate`, `web-interface-guidelines`, `accessibility`, `polish`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`. `add-product`·`game-motion`은 v4 것이라 v5에서는 쓰지 않는다. 출처·라이선스는 각 폴더와 `THIRD_PARTY_NOTICES.md`.
- **전문가 에이전트** (`.claude/agents/`, 검토는 보고만): `a11y-perf-auditor`(접근성·예산), `ko-copy-editor`(문장). `engine-guardian`·`game-ux-designer`·`reader-tester`·`svg-illustrator`는 v4 것이다.
- **훅** (`.claude/hooks/`): 세션 시작 때 의존성 설치와 진행 상황 알림, 위험한 git·배포 명령 차단, 만들어지는 파일(`public/catalog/`·`dist/`·글꼴·로고 원본) 직접 수정 차단, 고친 파일에 품질 바닥선 즉시 검사, 검사가 실패한 채 멈추지 못하게 한 번 붙잡기.

## 작업 규칙

- 작업은 한 번에 하나. 시작할 때 brief의 해당 절을 읽고, 무엇을 할지 3~5줄로 적은 뒤 진행한다.
- 커밋 메시지는 한국어로, 작업 번호로 시작한다. 예: `S2 장바구니 서랍과 0원 영수증`
- 작업 범위를 지킨다: 요청받지 않은 리팩터링·기능을 더하지 않는다. 가장 단순한 방법부터.
- 화면을 만들면 390×844·1440×900 스크린샷을 직접 보고, 키보드만으로 끝까지 가 본다.

## 코드 규칙 (요약)

- TypeScript strict. `any` 금지(불가피하면 `// any: 이유`). 타입만 쓰는 import는 `import type`.
- 스크립트와 `src/lib/catalog/`는 지울 수 있는 타입 문법만 쓴다: enum·namespace·매개변수 속성 금지, 상대 경로 import에 `.ts` 확장자.
- 정렬에 `localeCompare`를 쓰지 않는다. `cmpText`를 쓴다.
- 섬(Preact)은 상태가 필요한 곳에만. 나머지는 Astro 정적 HTML. 주소는 `src/lib/routes.ts`에서.
- 자세한 규칙은 파일 종류에 따라 `.claude/rules/`에서 자동으로 붙는다: 자료(`data.md`), 진열대 계산·스크립트·시험(`engine.md`), 화면(`ui.md`), 문장(`copy.md`).
