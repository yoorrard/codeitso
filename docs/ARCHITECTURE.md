# 구조 설계 (v5 바이브코딩 재료 쇼핑몰)

정본은 `docs/review/v5/brief.md`와 `docs/CONCEPT.md`다. 이 문서는 그것을 어떤 기술과 파일로 만드는지 적는다. v4까지의 구조(단계 화면·판단 엔진·지도)는 `docs/archive/v4/docs/ARCHITECTURE.md`에 있다.

## 1. 기술 구성

| 영역 | 선택 | 메모 |
|---|---|---|
| 사이트 | Astro 7 (정적 출력) + TypeScript strict | 서버 없이 HTML로 빌드한다. |
| 움직이는 부분 | Preact 섬 | 목록+거르기(`Listing`), 상세(`ItemDetail` + 종류별 미리 보기 `DetailPreview`), 장바구니(`CartDrawer`·`CartPage`), 전체 검색(`SearchPage`), 어려운 말 풀이(`TermPopover`). 쪽 번호 줄 `Pager`는 목록·검색이 같이 쓴다. 나머지는 정적 HTML. 카드의 [담기]는 섬이 아니라 `src/lib/cart-buttons.ts` 한 곳이 문서 전체의 누름을 받는다. |
| 상태 | nanostores + @nanostores/persistent | localStorage. 저장 코드는 `src/lib/store.ts` 한 곳 (5절). |
| 진열대 자료 | `data/catalog/<대분류>/<출처>.json` (약 13만 개, 124MB) | 가져오기 스크립트 `scripts/import/`(`npm run import`, 네트워크 필요)가 쓴다. 빌드는 커밋된 자료만 쓴다. 안내는 `docs/DATA.md`. |
| 진열대 빌드 | `scripts/catalog/build.ts` (`npm run catalog`, `build`·`dev`가 먼저 돌린다) | 원본을 읽어 화면용 JSON(`public/catalog/`)과 Astro용 요약(`.cache/catalog/site.json`)을 쓴다. 4절. |
| 진열대 계산 | `src/lib/catalog/core.ts` (순수 함수) | 정렬·인기 점수·쪽과 묶음·상세 조각 번호·카드 모양·관련 상품. 빌드와 섬이 같이 쓴다. |
| 배포 | Cloudflare Workers 정적 파일 무료 플랜 | 한 판 2만 개·파일 하나 25MiB 한도. 진열대 자료는 5천 개 아래로 (4절). |
| 집계 | Worker 함수 `/api/event` + D1 | 날짜별 이벤트 횟수만 (7절). |
| 방문 통계 | Cloudflare Web Analytics | 쿠키 없음. 장바구니·영수증 쪽은 싣지 않는다. |
| 글꼴 | Pretendard(화면 글), `CC Receipt`(코드 조각·영수증, D2Coding 하위 집합) | `public/fonts/`에 직접 둔다 (`npm run fonts`). |
| 아이콘·로고 | Phosphor(MIT, 빌드 때 인라인 SVG), 장바구니 로고 | 로고는 `assets-src/brand/logo-cart-source.webp`에서 `npm run logo`(`scripts/brand/make-logo.ts`)가 머리줄·밤 짝·OG·앱 아이콘·파비콘(장바구니만)을 만든다. |
| 시험 | Vitest, Playwright 1.56.1 + @axe-core/playwright | 12절. |

## 2. 폴더

```text
code-chauffeur/
├─ CLAUDE.md                 Claude Code가 매번 읽는 규칙
├─ .claude/                  규칙(rules), 스킬, 전문가 에이전트, 훅, settings.json
├─ assets-src/brand/         소유자가 준 로고 원본 (고치지 않는다)
├─ data/catalog/             진열대 자료: <대분류>/index.json(소분류·출처·뺀 출처) + <출처>.json
├─ data/glossary.json        어려운 말 풀이·용어 사전
├─ schemas/                  자료 스키마 (catalog-*.json, glossary)
├─ scripts/
│  ├─ import/                가져오기 (design-*, ai-*, api-*, oss-*·data-*·tpl-*, 네 갈래 함께 refresh-all.ts)
│  ├─ i18n/                  한국어 설명: 번역(translate.ts, 열쇠가 있을 때만)·Claude 세션 묶음(agent-batch·merge)·상태 세기(ko-coverage.ts) → data/catalog-ko/ (D128·D140). 자료 한 줄은 빌드 때 lib/ko-rule.ts (D143)
│  ├─ catalog/               진열대 읽기(load.ts)와 빌드(build.ts)
│  ├─ brand/                 로고 크기별 만들기
│  ├─ guard/ · lib/ · qa/    품질 바닥선·쓰지 않는 말·하네스 / 도우미 / 시각 점검·예산·정적 서버
│  ├─ fonts/ · deploy/       글꼴 만들기 / Cloudflare 빌드 명령
├─ src/
│  ├─ lib/catalog/           types.ts(모양·상수), core.ts(순수 계산), site.ts(Astro가 읽는 요약)
│  ├─ lib/                   routes(주소), store·saved(저장), cart-buttons, 풀이(glossary·term-*), color, track(집계)
│  ├─ components/            머리줄·메뉴·바닥글(Astro), 카드·미리 보기 판, 섬
│  ├─ layouts/Base.astro     기본 틀
│  ├─ pages/                 라우트 (3절)
│  ├─ copy/ko.ts             화면 고정 문구 (다체)
│  └─ styles/                tokens.css(낮·밤), base.css, shop.css, term-pop.css, fonts.css(만들어짐)
├─ public/catalog/           진열대 빌드 결과 (저장소에 올리지 않는다)
├─ tests/                    Vitest(lib·import·guard), tests/e2e/ Playwright
└─ worker/index.ts           /api/event 집계 함수
```

## 3. 라우트

| 주소 | 만드는 법 | 내용 |
|---|---|---|
| `/` | 정적 | 한 줄 소개 · 검색 · 대분류 타일(상품 수) · 기획전 여섯 줄(인기 폰트, 스타 많은 템플릿, 인기 MCP 서버, AI API, 인증 없이 쓰는 API, 최근 갱신) |
| `/kits` | 정적 | 스타터 키트 모두(K1 D131, `data/kits.json`): 주제 칩(교육·게임·업무·행정·가게·생활·요즘 인기 AI) → 주제마다 카드 격자. 카드는 재료(상세 링크)·구현안(3~6줄)·[키트 담기]. 홈은 주제마다 한 장씩 다섯 장과 '모두 보기'. |
| `/c` | 정적 | 전체 카테고리(K1): 대분류 여섯과 소분류 타일 모두 (홈 '카테고리로 둘러보기'의 모두 보기) |
| `/recent` | 정적 + 섬 | 최근 본 재료 모두(K1, 이 브라우저의 최근 20개, 비면 빈 안내) |
| `/wishlist` | 정적 + 섬 | 찜한 재료(N1 D137, 이 브라우저의 300개까지): 소분류마다 묶어 [담기]·[빼기](되돌리기), [모두 장바구니에 담기], 묶음마다 2~4개를 골라 비교. 방문 통계를 싣지 않는다. |
| `/compare?ids=a,b,c` | 정적 + 섬 | 재료 비교(N1): 2~4개를 한 표에(소분류·설명·출처·라이선스·인기·갱신일·특징·설치·공식 주소, 모두 상세 조각 그대로). 상세의 [비슷한 재료와 비교](이 재료 + 관련 상품 3개)와 찜에서 온다. 휴대폰은 표만 옆으로 민다. |
| `/models?p=&in=&f=&max=&ctx=&old=&q=&sort=&dir=` | 정적 + 섬 | AI 모델 비교(D141): 여러 회사 모델을 가격(100만 토큰당 입력·출력·캐시 읽기)·컨텍스트·최대 출력·입력 종류·추론·도구 호출·출시일로 한 표에(휴대폰은 모델 카드). 회사(주요 14곳 기본·직접 만드는 회사·모든 곳·한 곳)·입력 종류·기능·최대 입력 가격·최소 컨텍스트·지원 끝난 모델·이름 찾기, 머리 칸 정렬(aria-sort). 상태는 주소에 남는다. 줄 [담기]는 그 모델을 고른 채 담기 창. 자료는 `/catalog/models/direct.json`(처음), `hosts.json`(호스팅까지 볼 때만), 한 곳은 `p/<id>.json`. API 대분류·AI 언어 모델·호스팅 소분류 띠와 상세 '모델·요금'에서 온다 |
| `/c/<대분류>` | 정적, 6쪽 | 이 대분류 안 검색창(N1, `/search?q=&cat=`로 보낸다) · 소분류 타일(상품 수·출처) · 소분류마다 1등 상품 |
| `/c/<대분류>/<소분류>?<거르기 칸>=&sort=&page=` | 정적, 소분류마다 1쪽 (100쪽) | 인기순 1쪽 60개를 HTML에 그린다. 다른 쪽·정렬·거르기는 목록 섬이 JSON을 받아 같은 카드로 다시 그린다(D115). 거르기 칸(출처·라이선스·인증·HTTPS·CORS·무료 한도·연결 방식·쓰는 곳·작업·언어·글꼴 모양·글자·형식·분야·태그…)은 넓은 화면 왼쪽 칸, 좁은 화면 [거르기] 시트(`<dialog>`). 같은 칸 안은 '또는', 칸끼리는 '그리고', 주소는 `license=MIT&license=Apache-2.0&auth=none`처럼 되풀이. 쪽·정렬·거르기는 진짜 주소(새 탭·공유 가능)이고 그냥 누르면 `pushState`. 주소가 인기순 1쪽(거르기 없음)이 아니면 첫 그림 전에 빌드 때 그린 카드를 감춘다(`html[data-list-pending]`, 4초 안전판). 맨 위 검색창 `?q=`(N1 D137)는 이 소분류 안에서만 찾고(관련도순 기본, 거르기·정렬·쪽과 함께, 거르기 칸의 개수도 결과 안에서 센다), 좁은 화면에서는 거르기·정렬 줄이 머리줄 아래에 붙어 따라온다. |
| `/item?id=<id>` | 정적 1쪽 | 상세 섬이 id 해시로 상세 조각을 받아 그린다: 종류별 큰 미리 보기(D118: 폰트 견본 글꼴·색 띠와 대비 등급·색 단계표·아이콘 견본·스타일 견본 화면·API 배지와 무료 한도 원문·MCP 연결 정보·프롬프트 앞부분·저장소/모델/데이터셋 한눈에 칸) · 이름·설명·[장바구니에 담기]+메모 · 정보 표(출처·라이선스·인기·갱신일·공식 주소·태그) · 쓰는 법(출처가 준 설치 명령·설정 조각·문서 주소만) · 관련 상품. 검색 엔진 색인은 목록 쪽이 맡는다. |
| `/cart` (`#s=<id>,…`) | 정적 + 섬 | 만들 앱 한 줄 · 대분류별 줄(메모 고치기·빼기) · 설치 명령 한꺼번에 복사 · 공유 링크 복사 · 모두 비우기 · 주문 요약(대분류별 개수, 합계 0원, [계산하기]). `#s=`로 열면 위에 공유받은 목록과 [모두 담기]. 머리줄 장바구니는 어느 쪽에서나 오른쪽 서랍(모달 `<dialog>`)을 연다. |
| `/receipt?id=<id>` | 정적 + 섬 | 이 브라우저에 남긴 영수증 한 장: 0원 영수증(번호 `YYYYMMDD-NNNN`·때·만들 앱·대분류별 재료와 개수) · [.md 받기]·[복사]·[공유 링크 복사]·[장바구니에 다시 담기] · .md 미리 보기 |
| `/receipts` | 정적 + 섬 | 지난 영수증(최근 30장): [열기]·[.md 받기]·[지우기] |
| `/search?q=&cat=&page=` | 정적 + 섬 | 전체 검색(D114): 이름·태그·설명, 한글↔영어 같은 뜻 묶음(`data/search-words.json`). 대분류별 묶음 10장씩 + 맞는 소분류 칩, 대분류를 고르면 60장씩 쪽. 치는 대로 찾고(`replaceState`) 대분류·쪽은 `pushState`. 대분류를 골랐거나 대분류 쪽에서 왔으면 고쳐 쳐도 그 대분류를 지키고, 거기에 결과가 없으면 알리고 전체 결과로 가는 길을 둔다(N1). |
| `/terms` | 정적 | 용어 사전 (`data/glossary.json`) |
| `/about`, `/about/credits`, `/legal/terms`, `/legal/privacy`, `/legal/notice`, `/legal/copyright` | 정적 | 소개, 자료 출처(출처 파일마다 이름·수·이용 조건), 이용약관, 처리방침, 이용 안내, 저작권·게시 중단 요청 (D136, 틀 `LegalDoc.astro`, 운영자·메일은 `src/lib/site-config.ts`) |
| `/sitemap.xml`, `/robots.txt` | 정적 | 정적 쪽 사이트맵(상세·검색·장바구니 제외), 정식이면 robots가 열고 사이트맵을 알림 (D136) |
| `/glossary.json`, `/manifest.webmanifest`, `/robots.txt` | 빌드 끝점 | 풀이 자료, 앱 정보, 검색 로봇 안내 |
| `/api/event` | Worker | 익명 집계 |

### 3.1 주소 바탕과 호스트 (D81)

빌드 변수 `PUBLIC_BASE_PATH`(기본 `/`)와 `PUBLIC_HOST`(`cloudflare` 기본 | `static`). 모든 사이트 안 주소는 `src/lib/routes.ts`의 `withBase()`를 거친다(진열대 JSON 주소 `listDataPath`·`itemDataPath`도). 화면 코드에 주소를 글자로 쓰면 품질 바닥선이 막는다. `npm run qa:base`가 `/code-chauffeur` 하위 주소로 빌드해 모든 `href`·`src`를 본다.

### 3.2 화면 사이 오가기 (N1, D137)

- 처음 화면 말고 모든 화면 본문 맨 위에 [뒤로] + 위치 한 줄(`src/components/PageTop.tsx`, Base가 그리고 상세 섬은 상품을 읽은 뒤 그린다). [뒤로]는 진짜 링크(위 단계: 상세 → 소분류, 소분류 → 대분류, 대분류·그 밖 → 처음 화면, 출처 → 소개)이고, 이전 화면이 이 사이트(같은 출처·바탕, 이 탭에 앞 기록)면 `src/lib/page-nav.ts`가 `history.back()`으로 바꾼다.
- `/` 키는 글을 치는 중이 아니면 이 쪽의 검색창(소분류·대분류 안 검색창이 먼저, 없으면 머리줄)으로 초점을 옮긴다. 화면 두 장 넘게 내려가면 오른쪽 아래 [맨 위로](아래에 붙은 [담기]·[프롬프트 뽑기] 줄 위).
- 찜 하트(`button[data-wish]`, `src/lib/wish-buttons.ts`)는 카드·상세에 있고 머리줄 [찜]에 개수가 붙는다. 상세에는 [공유](기기 공유 창, 없으면 주소 복사)와 관련 상품 머리의 [비슷한 재료와 비교].

## 4. 진열대 자료 흐름 (D103)

```text
data/catalog/**  ──npm run import(네트워크)──  출처 API·목록   (매일: daily-refresh.yml, 바뀐 것만 쓴다 D143)
data/catalog-ko/*.json · data/catalog-media/  ── 번역한 한국어 설명·README 그림 (빌드가 붙인다)
                                                 + 그 밖의 상품은 빌드가 자료로 한국어 한 줄을 만든다 (scripts/lib/ko-rule.ts, D143)
      │
      ▼ scripts/catalog/build.ts  (약 13초, 네트워크 없음, --if-stale면 자료·코드가 그대로일 때 건너뜀)
public/catalog/list/<대분류>/<소분류>/<정렬>-<묶음>.json   카드 480장(8쪽)씩, 정렬 셋(popular·name·recent)  ≈1,020개
public/catalog/item/<n>.json                              상세 조각 1,024개 (n = FNV-1a(id) % 1024), 관련 상품 [id, 이름] 6개 포함
public/catalog/search/meta.json · t-<n>.json · b-<대분류>-<k>.json   전체 검색: 메타 1 + 낱말 조각 512 + 결과 카드 블록 ≈720 (D114)
public/catalog/search/s-<대분류>-<소분류>.json             소분류 안 검색: 소분류 인기순 자리 → 문서 번호 100개 (N1 D137, 가장 큰 MCP 20KB·gzip 6KB)
public/catalog/facet/<대분류>/<소분류>.json · -name.json · -recent.json  거르기: 값마다 인기순 자리 목록 + 정렬 순서 (D115, ≈300)
public/catalog/models/p/<제공자>.json · direct.json · hosts.json   AI 모델·요금 (D141): 제공자마다 모델 줄(새것부터, 상세 표·담기 창) 231개 + 비교 쪽 묶음 둘 (data/catalog-models/)
.cache/catalog/site.json                                  Astro용 요약: 대분류·소분류·출처·홈 기획전·스타터 키트(data/kits.json)·대분류 1등·소분류 1쪽 카드·소분류 거르기 칸(값·개수)
      │
      ▼ astro build  → dist/ (쪽 118 + 진열대 JSON 3,514 + 정적 파일 ≈ 3,780개)
```

- **왜 이렇게:** 상품마다 HTML을 만들면 13만 개라 Cloudflare 한 판 2만 개 한도와 빌드 시간을 넘는다. 쪽은 소분류마다 하나만 두고 나머지는 작은 JSON을 섬이 받아 그린다.
- **목록 묶음:** 한 쪽 60개(2·3·4·5열이 모두 꽉 찬다), 파일 하나에 8쪽. 쪽 p는 묶음 `⌊(p−1)/8⌋`, 자리 `((p−1) mod 8)×60` (`chunkOf`). 받은 묶음은 섬이 기억해 이웃 쪽은 다시 받지 않는다. 보통 gzip 30KB 안팎, 배경 패턴처럼 SVG 조각을 싣는 소분류만 150KB.
- **카드 모양(`Card`):** id·이름·대분류·소분류·한 줄 설명(110자)·출처 이름·라이선스·인기 지표 하나·갱신일·미리 보기 판(`Thumb`: 색 띠·그라디언트·아이콘·패턴·폰트 견본·스타일·이모지·출처 그림·머리글자)·짧은 사실(인증·HTTPS·CORS·언어·작업…) 3개.
- **전체 검색 (D114):** 문서 번호 = 대분류 순서 → 대분류 안 인기순. 낱말 조각은 낱말 앞 세 글자(영문)·두 글자(한글)의 해시라 앞부분으로 찾아도 조각 하나만 받는다. 조각에는 낱말마다 [이름에 든 문서, 태그·설명에 든 문서]를 차이·연속 줄임 글자로(`encodePostings`). 이름 밖에서 8천 문서 넘게 나오는 말(mcp·remote·api…)은 흔한 말로 보고 이름 밖 목록을 싣지 않으며 질의에서 꼭 들 낱말로 치지 않는다. 결과 카드는 대분류마다 인기순 200장씩 블록(무거운 아이콘 SVG는 머리글자로). 질의 하나에 보통 조각 2~4개(gzip 5~55KB)와 블록 몇 개를 받는다.
- **거르기 (D115):** 소분류마다 칸 7개까지(값 둘 이상, 상품의 5%·10개 넘게 덮을 때), 값은 많은 순 24개(태그는 3개 넘게 붙고 90% 밑인 것). 값마다 인기순 자리 목록을 거르기 파일에, 이름순·최근 갱신순 순서를 순서 파일에 둔다. 섬은 자리 표시(Uint8Array)로 거르고, 정렬 순위가 든 목록 묶음만 받아 카드를 꺼낸다. 값마다 남는 개수는 그 칸의 고름을 빼고 센다.
- **소분류 안 검색 (N1 D137):** 전체 검색과 같은 메타·낱말 조각을 받고, 소분류 파일(`SubDocsFile`)로 문서 번호를 소분류 인기순 자리로 바꾼다. 대분류 문서 번호도 같은 인기 비교로 매겼으므로 자리 순서대로 번호가 커져 차이·연속 줄임 글자로 짧게 싣고, 순서를 어기는 자리(다른 소분류에 먼저 놓인 같은 재료)만 따로 싣는다. 질의는 낱말마다 소분류 문서만 남긴 뒤 '그리고'·넓히기를 정한다(`runQuery` keep). 결과가 목록과 같은 자리 번호라 거르기(`applySelection` within)·정렬 순서 파일·목록 묶음을 그대로 쓴다(정렬 순서 파일은 거르기 칸이 없는 소분류에도 쓴다).
- **상세 조각:** 원본 항목 그대로(거르기·미리 보기가 쓸 칸을 줄이지 않는다) + 관련 상품. 평균 gzip 40KB, 가장 큰 것 85KB. 같은 id가 두 진열대에 있으면(10건) 상세는 처음 것.
- **인기순 (D133):** 소분류 안에서 지표마다 log 크기를 가장 큰 값으로 나눠 출처끼리 견준다(`rankScores`). 가장 많이 채워진 지표가 으뜸, 없는 상품은 다른 지표 × 0.85, 오래 멈춘 저장소의 스타는 깎고 요즘 뜨는 정도는 얹는다. 손으로 고른 상품은 잰 상품 24개 뒤에는 서고, 같은 신호를 나눠 가진 상품은 두 번째부터 줄인다. 지표가 없는 사이트·API는 가져오기가 붙인 Chrome UX Report 순위 묶음(`metrics.siteRank`)으로 잰다.
- **한도 지킴:** 빌드가 파일 수가 5천 개(`MAX_CATALOG_FILES`)를 넘으면 실패하고, 시험(`tests/lib/catalog.test.ts`)과 `npm run qa:budget`이 다시 본다.

## 5. 상태와 저장

모든 저장은 `src/lib/store.ts` 한 곳(nanostores + @nanostores/persistent). 읽은 값의 모양 고르기는 `src/lib/saved.ts`. localStorage를 못 쓰면 메모리에만 두고 안내 한 줄을 보인다.

| 키 | 내용 |
|---|---|
| `cc:cart:v1` | 담은 재료 `{ id, name, cat, sub, addedAt, memo? }[]` (메모 200자, 최대 300개, 같은 재료는 한 줄. S1 판의 `at`도 읽는다) |
| `cc:project:v1` | 만들 앱 한 줄 (300자, 계산해도 남는다) |
| `cc:receipts:v2` | 지난 영수증 `{ id, no, at, project?, lines: { id, name, cat, sub, memo?, url?, license?, source?, install?, snippet?, docs? }[] }[]` (계산한 때의 재료 사본, 최근 30장) |
| `cc:recent:v1` | 최근 본 재료 `{ id, name, cat, sub, at }[]` (20개) |
| `cc:wish:v1` | 찜한 재료 `{ id, name, cat, sub, at }[]` (N1, 새것이 앞, 300개까지. 저장한 기록 지우기에 든다) |
| `cc:meta:v1` | `{ sent: string[] }` 보낸 집계 이벤트 열쇠 |
| `cc:prefs:v1` | `{ motion: 'auto' \| 'reduce', glossary: boolean }` |
| `cc:terms:v1` | 풀이를 연 용어 id (최근 300개) |
| `cc:guide:v1` | `{ tour, hint }` 처음 방문 가이드를 열었는지·상세의 '어려운 말 풀이' 안내를 닫았는지 (O1, D138. 기록 지우기에 들지 않는다) |

- 옛 v4 키(`cc:session:v1`·`cc:study:v1`·`cc:seen:v1`·`cc:receipts:v1`·`cc:trip:v1`)는 처음 불릴 때 지운다(`LEGACY_KEYS`). 공유 링크(`/cart#s=…`, `src/lib/share.ts`)에는 재료 id와 고른 모델 id(`<id>@<모델 id>`, D141)만 들어가고 메모·만들 앱은 들어가지 않는다. 장바구니 줄의 `model{id,name}`은 AI API 옵션(D141)이다. 계산(`src/lib/checkout.ts`)은 담은 재료의 상세 조각을 받아 영수증 사본을 만들고(`buildReceipt`, 출처 자료 그대로) 장바구니를 비운다. .md는 `src/lib/receipt-md.ts`가 만든다.

## 6. 바깥 자원과 보안 머리글 (brief 5절, D107)

- 스크립트·스타일·글꼴은 사이트 안 파일만. 예외는 쿠키 없는 Cloudflare Web Analytics 하나.
- 상품 미리 보기 그림은 출처의 공식 주소(https)에서 지연 로드한다(`loading="lazy"`, 실패하면 머리글자). 그래서 CSP `img-src`에 `https:`를 연다. 검색 엔진 파비콘 서비스처럼 출처가 아닌 곳의 주소는 카드에 쓰지 않는다(`previewImage`). 자료 속 SVG 조각은 스크립트·이벤트·바깥 참조가 있으면 버린다(`safeSvg`).
- 폰트 견본 글꼴(D116)은 화면에 보일 때만 출처의 공식 CDN에서 받는다(`src/lib/font-preview.ts`, IntersectionObserver). 호스트는 `src/lib/catalog/hosts.ts` 한 곳(CSS: fonts.googleapis.com·api.fontshare.com·cdn.jsdelivr.net·hangeul.pstatic.net·spoqa.github.io, 파일: fonts.gstatic.com·cdn.fontshare.com·위와 같은 곳)이고 CSP `style-src`·`font-src`가 이 목록을 그대로 쓴다. Google Fonts 카드는 견본 글자만 담은 작은 글꼴(`text=`)을 받는다. 사이트 글꼴과 이름이 같은 Pretendard는 부르지 않는다.
- CSP는 Astro가 해시로 `<meta>`에 넣는다(`astro.config.mjs`). `frame-ancestors` 같은 나머지는 `public/_headers`.

## 7. 집계 (Worker + D1)

`worker/index.ts`가 `/api/event`의 `{"t":종류,"b":구간}`만 받아 날짜별로 센다. 종류·구간은 `src/lib/event-spec.ts`가 화면과 Worker의 약속이다. S2부터 이벤트는 다섯: `cart_add`(구간 = 대분류), `checkout`(재료 수 구간 n01·n02-03·n04-06·n07-10·n11-20·n21+), `md_download`, `md_copy`, `bundle_add`(구간 = 스타터 키트 id). 재료 id·메모·검색어는 보내지 않는다. 개인 정보·쿠키·IP는 저장하지 않는다.

## 8. 배포

Cloudflare Workers Builds가 푸시마다 `npm run build:cf`(= `npm run build`: 진열대 빌드 → Astro)를 돌리고 배포한다. 절차·변수·실패 원인은 `docs/DEPLOY.md`. `wrangler.jsonc`: 정적 파일 `./dist`, 끝 빗금 떼기(`drop-trailing-slash`), 없는 주소는 404 쪽, `/api/*`만 Worker가 먼저 받는다.

## 9. 성능 기준 (`npm run qa:budget`)

| 무엇 | 한도 |
|---|---|
| 처음 불러오는 JS (gzip) | 모든 쪽 100KB (지금 43~51KB: 목록 섬에 거르기, 상세에 종류별 미리 보기) |
| 처음 불러오는 CSS (gzip) | 30KB |
| 사이트 안 그림 | 쪽마다 300KB |
| 검색 메타 / 가장 큰 검색 조각·블록 (gzip) | 10KB / 80KB |
| 가장 큰 거르기 파일 (gzip, MCP 서버 4.6만 개) | 120KB |
| 목록 묶음 하나 / 상세 조각 하나 (gzip) | 160KB / 100KB |
| 배포 파일 수 / 파일 하나 | 6,000개 / 25MiB |

## 10. TypeScript

`tsconfig.json` strict + `noUncheckedIndexedAccess`. 스크립트와 `src/lib/catalog/`는 Node가 바로 돌리므로 지울 수 있는 타입 문법만(`.ts` 확장자 import, `import type`). Worker는 `worker/tsconfig.json`.

## 11. 명령

`npm run check`(토큰·글꼴·품질 바닥선·쓰지 않는 말·하네스·타입·단위 시험) · `npm run build` · `npm run e2e` · `npm run qa:budget` · `npm run qa:shots` · `npm run qa:base` · `npm run catalog` · `npm run import[:design|:ai|:api|:oss]` · `npm run logo` · `npm run fonts`.

## 12. 시험과 CI

- 단위: `tests/lib/`(진열대 계산·실제 자료 개수·파일 수, 주소, 저장, 풀이), `tests/import/`(가져온 자료의 스키마·id·개수), `tests/*.test.ts`(품질 바닥선·빌드 지킴·쓰지 않는 말).
- e2e(`tests/e2e/`, 먼저 `npm run build`): 홈 → 카테고리 → 소분류 2쪽 → 상세 → 메모와 담기 → 장바구니(390·1440), PC 첫 화면에 목록 첫 줄, 정렬 주소와 뒤로 가기, 카드 [담기], 카테고리 메뉴, 검색, 용어 풀이, 장바구니·영수증·.md, 전체 검색(대분류·쪽·뒤로 가기·치는 대로), 거르기(왼쪽 칸·시트·주소·정렬과 함께·쪽 끝), 폰트 견본 지연 로드, 종류별 미리 보기, 서랍 여러 번, CSP, axe(360·1440), 주소 바탕(`npm run e2e:base`).
- CI(`.github/workflows/check.yml`): 작업 브랜치 푸시는 빠른 검사(check·build·예산), `main` 푸시·PR·수동 실행은 e2e까지.
- 매일(`.github/workflows/daily-refresh.yml`, D128 → D143): 예약 실행 다시 켜기(60일 규칙) → 오늘 차례인 출처 받기(`scripts/lib/refresh-plan.ts`, 뜻 있게 바뀐 상품만 쓴다: `scripts/lib/catalog-stable.ts`) → README 그림 → 번역(열쇠가 있을 때만, 기본 꺼짐) → 요약(`refresh-summary.ts`, 작업 흐름 요약 표) → 바뀐 자료가 있을 때만 `npm test` → `npm run catalog` → 배포 가지에 커밋·푸시(그 푸시가 배포된다). 지표만 흔들린 날은 커밋·배포가 없다. 코드가 바뀌지 않으므로 타입 검사·e2e는 돌리지 않는다. AI를 부르지 않는다.
