# 구조 설계

화면의 세계관·구성·장면은 `docs/CONCEPT.md`(D56)가 정본이다. 이 문서는 그것을 어떤 기술과 파일로 만드는지를 적는다. 문서끼리 어긋나면 PRD > CONCEPT > 이 문서 순으로 따른다.

## 1. 기술 구성

| 영역 | 선택 | 메모 |
|---|---|---|
| 사이트 | Astro (정적 출력) + TypeScript strict | 서버 없이 HTML로 빌드한다. 판은 D35. |
| 움직이는 부분 | Preact 섬(island) | 만들 앱 정하기·도구 고르기·도구끼리 맞춰 보기·설계도 받기·사전·지도처럼 상태가 있는 곳만 섬으로 만든다. 홈은 지도를 지시어 없이 그린 정적 SVG로 싣고, 섬은 주 버튼과 묶음 목록(`HomeStart`, `client:load`)과 기본 틀의 섬(설정·사전·풀이, `client:idle`)뿐이다. 홈 첫 화면 JS에는 엔진·자료가 없다: 이어 갈 곳(`src/lib/continue.ts`)은 저장된 진행이 있을 때만, 코스로 채우는 모듈(`src/lib/course.ts`)은 [이 코스로 출발]을 누를 때 늦게 불러온다 (CONCEPT 6.1, 11절, D70). 나머지는 정적 HTML. |
| 상태 | nanostores + @nanostores/persistent | 브라우저 localStorage에 저장. 키 이름은 아래 4절. |
| 판단 | `src/lib/engine/` | 데이터와 규칙만으로 계산하는 순수 함수. 명세는 `docs/ENGINE.md`. |
| 지도 | (T28) `src/lib/map/model.ts`의 `mapModel(session, evaluate())` + `MapBoard.tsx` 섬 | 엔진 결과를 그대로 그리는 순수 함수다. 땅 판과 표지는 SVG이고 색은 모두 CSS 변수라 낮·밤·느낌 팔레트가 같은 파일을 쓴다. 홈, 다섯 단계, 코스·지난 영수증 썸네일, 공유 미리 보기 그림이 같은 모형을 쓴다 (CONCEPT 6절 머리, 9절). |
| 자료 | `data/*.json` + `schemas/*.schema.json` | 빌드 때 import. 검사는 `npm run validate`. |
| 검색 | MiniSearch | 빌드 때 색인을 만들어 정적 끝점 `/search-index.json`으로 내보낸다 (D47). 한글 처리와 묶음은 7절. |
| 영수증 링크 | lz-string | 주소의 `#r=` 뒤에 압축해 넣는다 (`/arrival#r=…`). 서버로 가지 않는다. 5절. |
| 배포 | Cloudflare Workers 정적 파일(static assets) 무료 플랜 | 정적 파일 요청은 무료·무제한. 주소는 처음엔 `이름.하위도메인.workers.dev`. |
| 주소 바탕·호스트 | 빌드 변수 `PUBLIC_BASE_PATH`(기본 `/`) · `PUBLIC_HOST`(`cloudflare` 기본 \| `static`) | 모든 사이트 안 주소가 `src/lib/routes.ts`의 `withBase()`를 거친다. 하위 주소 호스트(GitHub Pages 프로젝트 사이트)도 같은 코드로 빌드한다 (3.1절, D81). 옛 주소 301(`public/_redirects` 10줄)은 공개 배포 전이라 T35에서 지웠다. |
| 집계 | Worker 함수 `/api/event` + D1 | 날짜별 이벤트 횟수만. 무료 플랜: Worker 요청 하루 10만 건, D1 쓰기 하루 10만 행. |
| 방문 통계 | Cloudflare Web Analytics | 쿠키 없음. 설계도 받기 화면 `/arrival`에는 싣지 않는다 (D17). |
| 자동화 | GitHub Actions | 검사·시험(`check.yml`, 12절), 손으로만 돌리는 예비 배포(`deploy.yml`), 2단계부터 색인 갱신. 저장소가 비공개라 무료 시간이 월 2,000분이어서 e2e는 `main` 푸시·PR·수동 실행에서만 돈다 (D72). 배포는 Cloudflare Workers Builds가 한다 (9절). |
| 시험 | Vitest(엔진·자료), Playwright 1.56.1 + @axe-core/playwright(화면·접근성) | Playwright는 컨테이너 Chromium에 맞춰 고정 (D33). 시각 점검·예산은 `scripts/qa/` |
| 글꼴 | Pretendard(모든 화면 글), `CC Receipt`(영수증 종이와 '요금 0원' 칩, D2Coding에서 글자를 골라 이름을 바꿈) | 둘 다 OFL. Pretendard는 가변 글꼴 동적 하위 집합(D38), 영수증 글꼴은 고정 문구 글자만 고른 하위 집합 (D29·D37). 쓰는 곳은 CONCEPT 5.4. `public/fonts/`에 직접 두고 라이선스 파일을 함께 둔다. |
| 화면 색 | 낮 지도(기본)와 밤 지도 | `src/styles/tokens.css`가 `@media (prefers-color-scheme: dark)` 안에서 같은 토큰 이름에 밤 값을 다시 준다. 화면 코드는 모드를 모른다. 대비 검사(`npm run tokens`)는 두 모드를 모두 돈다. 사이트 안 색 설정은 v3 설정 시트의 '화면 밝기'(기기 따라 · 밝게 · 어둡게, T41, CONCEPT 3.10절)로 더한다. |
| 모션 | CSS 전환·키프레임·`@starting-style`, WAAPI, SVG `stroke-dashoffset`·`offset-path`, FLIP, 직접 쓴 `src/lib/motion.ts` | 라이브러리 없음. `canvas-confetti`와 `@types/canvas-confetti`를 뺀다 (D56, T25). CSS 3D는 대표 장면의 지도 기울이기 하나만. 장면은 CONCEPT 7절. 문서 간 View Transitions는 꺼 두었다(D71 검토 반영: 붙기 전 지도는 땅만 그려 섞어 비추면 길이 사라졌다 나타난다). 다시 켤 때 켜기(`@view-transition`)는 기본 틀 머리 맨 앞의 인라인 style에 둔다(바깥 CSS 묶음에만 두면 섬 모듈을 받는 중에 크롬이 전환을 건너뛴다, D71 W5b). 조건은 `src/styles/frame.css` 머리 주석. |
| 효과음 | `src/lib/sfx.ts` + 켰을 때만 동적 import하는 합성기 | 기본 꺼짐, 소리 파일 없음 (D28) |
| 아이콘·그림 | Phosphor Regular(MIT, 빌드 때 인라인 SVG), 직접 그린 SVG(기능 그림, 질문 그림, 지도 표지 묶음 `src/assets/map/map-sprite.svg`, 청사진 자리 표시), 미리 구운 3D 렌더(`src/assets/art/`, Astro `<Picture>`로 AVIF/WebP) | 사람 그림(마스코트)과 Fluent 3D 그림 문자(`public/emoji/`)는 쓰지 않는다 (D56, T25에서 걷어 냄). 렌더가 없으면 `Art.astro`가 청사진 자리 표시를 쓴다 (CONCEPT 5.7, 9절). |
| 그림 굽기 (개발용) | (T33) `scripts/assets/render-art.ts` (`npm run art`, `npm run art:sheet`) + three·@gltf-transform(devDependency만) | 컨테이너의 Playwright Chromium을 화면 없이 띄워 소유자가 준 GLB를 조명 한 벌에서 굽고 투명 PNG를 만든다. **three는 devDependency에만 두고 `src`에서 import하지 않는다** (품질 바닥선이 막는다). 실행 중 WebGL은 쓰지 않는다 (D26·D54·D56). 화면에 실리는 JS는 0KB. |

Cloudflare Pages가 아니라 Workers로 가는 이유는 `docs/DECISIONS.md`의 D04.

## 2. 폴더

```text
code-chauffeur/
├─ CLAUDE.md                 Claude Code가 매번 읽는 규칙
├─ .claude/                  규칙(rules), 스킬(skills), 전문가 에이전트(agents), 훅(hooks), settings.json
├─ THIRD_PARTY_NOTICES.md    가져온 스킬·글꼴·아이콘·라이브러리·그림의 라이선스
├─ assets-src/art/           (T33) 소유자가 준 참고 그림 PNG와 GLB (CONCEPT 9절 (c))
├─ data/                     자료 (사람이 고치는 곳)
│  ├─ golden/                추천 회귀 검사 사례
│  └─ index/                 (T19) 자동 수집 색인. 저장소 기록에는 올리지 않는다
├─ schemas/                  자료 스키마
├─ scripts/                  검사·예시·색인 스크립트 (Node로 바로 실행)
│  ├─ lib/                   부작용 없는 도우미 (자료 읽기, 골든 비교, 색 대비, 쓰지 않는 말, 자료 칸 나누기 Vite 플러그인). 시험에서도 import
│  ├─ guard/                 품질 바닥선(floor-guard), 쓰지 않는 말(check-words), 하네스 앞머리 검사
│  ├─ assets/                (T28·T33) 땅 판 만들기(make-map), 렌더 굽기(render-art)
│  ├─ fonts/                 글꼴 만들기 (Pretendard 조각 복사, CC Receipt 하위 집합·이름 바꾸기)
│  └─ qa/                    시각 점검(shots), 성능 예산(budget), 정적 서버(serve)
├─ src/
│  ├─ lib/engine/            판단 엔진 (화면과 무관한 순수 함수)
│  ├─ lib/                   주소(routes), 자료 싣기, 상태 저장, 영수증 링크, 단계(stages)와 진행(단계 상태·남은 개수), 모션·효과음, 집계 보내기, 검색 / (T28) map/ 지도 모형
│  ├─ assets/                concepts/ 용어 카드 그림, (T28) map/ 땅 판·지도 표지 묶음, (T33) art/ 구운 렌더
│  ├─ components/            Astro 컴포넌트와 Preact 섬
│  ├─ layouts/               기본 틀: 머리줄·단계 줄·아래 막대, 사전 옆 창
│  ├─ pages/                 라우트 (3절)
│  ├─ copy/ko.ts             화면 고정 문구. 엔진이 쓰는 문장은 data/templates.json
│  └─ styles/tokens.css      디자인 토큰 (낮·밤)
├─ tests/                    Vitest 시험, tests/fixtures/ 가짜 자료, tests/e2e/ Playwright
├─ worker/index.ts           (T18) /api/event 집계 함수 (따로 tsconfig)
├─ migrations/               (T18) D1 표 만들기 SQL
├─ public/                   글꼴(fonts/), 아이콘, 보안 머리글(_headers), 주소 넘기기(_redirects, 지금은 빈 파일. Cloudflare 전용)
└─ docs/                     문서 (순위: PRD > CONCEPT > UX·DESIGN·ARCHITECTURE·ENGINE > TASKS)
```

## 3. 라우트

| 주소 | 화면 | 만드는 방식 |
|---|---|---|
| `/` | 홈: 본보기 지도, "어디로 모실까요?", 만들 앱 정하기(다시 온 손님은 이어서 가기)·내 AI 써 보기·도구 둘러보기, 이렇게 가요, 미리 짠 코스 3개(미리 보기 시트) | 정적 SVG + HomeStart 섬 + 늦게 불러오는 페이지 스크립트 (엔진·자료 없음, 11절, D70) |
| `/test-drive` | 내 AI 써 보기 (연습, 번호 밖. 연습 1·2·3) | 정적 + 복사 버튼 섬 |
| `/destination` | 1단계 만들 앱 정하기: 질문 하나씩, 아래 막대 [이전]·[도구 고르러 가기] | 질문 섬(Interview) + 아래 막대 섬(InterviewAction) + 지도 섬. 질문 자리는 `src/lib/interview-nav.ts` atom으로 나눠 쓴다 (D70) |
| `/waypoints` | 2단계 도구 고르기: 기능마다 추천 줄을 미리 누르고 아래 막대 [{도구}로 정하기]로 저장 | 도구 섬(Shop) + 아래 막대 섬(WaypointsAction) + 지도 섬. 여는 칸·'고를 예정'은 `src/lib/pick-nav.ts` atom으로 나눠 쓴다(저장하지 않음, D70) |
| `/check` | 3단계 도구끼리 맞춰 보기 (H1 '고른 도구끼리 잘 맞을까요?'): 막힌 곳·그대로 가는 곳·나누기·원활·이렇게 이해했어요. 아래 막대 주 버튼 섬(`IssueButton`) | 섬 |
| `/arrival` | 4단계 설계도 받기: 칸 고르개 영수증·설계도·용어·AI에게 할 말, 아래 막대 [설계도 내려받기 (.md)] 섬(`ArrivalAction`). `#r=`로 다시 열기(보는 영수증은 `src/lib/arrival-view.ts`의 atom을 세 섬이 함께 읽는다) | 섬 |
| `/receipts` | (T32) 지난 영수증: 최대 30장, 줄을 누르면 `/arrival#r=…` | 섬 |
| `/terms` | 용어 카드 20장. 목적지를 정했으면 맨 위에 읽어 둘 용어(먼저 읽어 둘 용어 → 만들면서 볼 용어) | 정적 + 섬 |
| `/terms/[id]` | 용어 카드 (검색 유입용 정적 페이지 + 확인 문제 섬) | 정적 생성 |
| `/tools` | 도구 모음: 분야·기능별 둘러보기, 검색 | 정적 + 섬 |
| `/tools/[id]` | 도구 상세 (`layer: shelf`만. 원문만 있는 도구는 만들지 않는다) | 정적 생성 |
| `/courses` | 미리 짠 코스, "이 코스로 출발" | 정적 + 섬 |
| `/dictionary` | 사전 전체 화면 (옆 창과 같은 내용, 에러 묶음 바로 가기 `/dictionary#errors`) | 섬 |
| `/about` | 서비스 소개, 하지 않는 것, AI를 안 쓰는 이유, 틀린 곳을 알려 주세요 + [의견 보내기](빌드 변수 `PUBLIC_CONTACT_EMAIL`이 있을 때만, `src/lib/feedback.ts`, v3 L-01) | 정적 |
| `/about/criteria` | 추천 기준: `data/scoring.json` 값을 그대로 표로 | 정적 |
| `/about/credits` | 크레딧: 글꼴·아이콘·그림·라이브러리의 출처와 라이선스 | 정적 |
| `/legal/privacy` | 개인정보 처리방침 (초안, 사람 검토) | 정적 |
| `/legal/notice` | 이용 안내·면책 (초안, 사람 검토) | 정적 |
| `/404` | 길을 잘못 들었어요 | 정적 |
| `/search-index.json`, `/glossary.json`, `/glossary-tools.json`, `/robots.txt`, `/manifest.webmanifest` | 검색 색인, 어려운 말 풀이 자료(손으로 쓴 용어 213개, D66·D69)와 도구 이름 풀이(products.json에서), 로봇 안내, 웹 앱 설명서(`start_url`·`scope`·아이콘에 주소 바탕, T35·D81) (빌드 때 만드는 정적 끝점) | 정적 생성 |

**v3에서 더할 주소 (계획, `docs/review/v3/brief.md` 3.4·3.6절).** 만들면 이 표 위로 올린다.

| 주소 | 화면 | 만드는 방식 | 묶음 |
|---|---|---|---|
| `/guides`, `/guides/[id]` | 만들기 안내: 때 다섯 › 갈래 열하나 › 안내 한 장(약 50쪽, OS 탭은 `#windows` `#mac` `#linux`) | 정적 + 작은 섬(각 5KB, 엔진·자료 묶음을 싣지 않음) | T39 |
| `/looks` | 디자인 둘러보기: 느낌 여섯을 앱 종류별 첫 화면에 칠한 미리 보기 | 정적 + 작은 섬(4KB) | T38 (P1) |
| `/help` · `/about/accessibility` · `/about/changes` | 자주 묻는 것 · 접근성 안내 · 바뀐 점(판 번호) | 정적 | T41 (P1) |
| `/sitemap.xml` | 사이트맵 (상태 화면 `/waypoints` `/check` `/arrival` `/receipts` `/404`는 빼고 `noindex`) | 의존성 없는 정적 끝점 | T41 |
| `/og/default.png` · `/look/*.svg` | 공유 그림 1200×630 · 제목 글꼴 견본 | 정적 파일 | T41 · T38 (P1) |

주소는 `src/lib/routes.ts`의 `ROUTES`(화면)·`FILES`(아이콘·끝점) 한 곳에서 정하고, 화면 코드에 주소를 직접 쓰지 않는다 (도구·용어 상세는 `toolPath`·`termPath`). 모두 주소 바탕을 거친다(3.1절). 품질 바닥선이 `src/components`·`src/lib`(이 파일 빼고)의 사이트 안 주소 글자를 막는다. 사전 옆 창은 기본 틀(layout)에 들어가 모든 화면에서 열린다. 단계마다 열리는 조건은 `docs/UX.md` 2.1절 (정본은 CONCEPT 2.1절).

### 3.1 주소 바탕과 호스트 종류 (설계서 9.4절, D81)

호스트를 소유자가 고른다(H13). 기본은 Cloudflare Workers(D72)이고 주소가 루트 `/`에서 시작한다. GitHub Pages 프로젝트 사이트처럼 하위 주소(`/code-chauffeur`)에서 열리는 곳도 같은 코드로 빌드한다.

| 빌드 변수 | 값 | 하는 일 |
|---|---|---|
| `PUBLIC_BASE_PATH` | 기본 `/`. 예 `/code-chauffeur` | `astro.config.mjs`의 `base`. `/`로 시작하고 끝 빗금 없이, 영문 소문자·숫자·`-` 마디만(빌드 지킴이 꼴을 본다). |
| `PUBLIC_HOST` | `cloudflare`(기본) \| `static` | `static`이면 `track.ts`가 아무것도 보내지 않고(`/api/event` 없음), 방문 통계 스크립트를 싣지 않고 CSP에서도 뺀다. 개인정보 처리방침의 익명 집계·방문 통계·맡기는 곳 묶음이 "이 주소에서는 세지 않아요"로 바뀐다(`ko.legal.privacyStatic`). |

- **주소 만들기:** `src/lib/routes.ts`의 `withBase(path)`가 `import.meta.env.BASE_URL`을 앞에 붙인다(루트면 그대로, 홈은 `/code-chauffeur/`). `ROUTES`·`FILES`·`toolPath`·`termPath`·`waypointPath`가 모두 이것을 거친다. 바탕을 붙이기 전 주소는 `PATHS`. Vite 밖(e2e·Node 스크립트)에서 읽으면 루트로 본다.
- **사이트 첫 주소:** `siteRoot()` = `location.origin` + 바탕. 영수증 링크(`shareUrl(siteRoot(), …)` + `PATHS.arrival`)와 설계도 속 용어 주소(`renderPack`의 `siteUrl`)가 바탕을 품는다. 바깥에서 읽는 절대 주소(robots·사이트맵·공유 그림)는 `absoluteUrl(site, path)`.
- **고친 곳:** 기본 틀의 아이콘·설명서 링크 4곳, 검색 색인·풀이 자료 `fetch`, `EVENT_URL`, 사전 시트의 '지금 사전 화면인가' 판단, 대표 주소(canonical, 홈은 바탕 폴더 주소), 방문 통계를 빼는 `/arrival` 판단(`stripBase`). `/manifest.webmanifest`는 정적 파일에서 끝점(`src/pages/manifest.webmanifest.ts`)으로 바꿨다(`npm run logo`는 아이콘만 만든다). `robots.txt`는 바탕 안을 막고 연다.
- **CSS 글꼴 주소 `url('/fonts/…')`는 고치지 않는다.** Vite가 CSS 안의 `public/` 파일 주소에 `base`를 붙여 다시 쓴다(바탕 빌드 결과로 확인: `url(/code-chauffeur/fonts/…)`). Astro가 만드는 `_astro/` 묶음·섬 주소·그림도 바탕을 스스로 붙인다.
- **`public/_headers`·`_redirects`는 Cloudflare 전용이다.** 옛 주소 10줄(`/lesson`·`/receipt` 같은 v1 주소의 301)은 사이트를 공개 배포한 적이 없어 옛 주소를 가진 사람이 없으므로 T35에서 지웠다(설계서 3.6절). 시험 `REDIRECTS`도 함께 지웠다. 출시 뒤 주소를 바꾸면 영수증 링크가 주소째 퍼져 있으므로 여기에 301을 더하고 끝까지 지킨다(L-11).
- **지킴:** 품질 바닥선(`base-path` 규칙)이 화면 부품·도우미의 사이트 안 주소 글자를 막고, `npm run qa:base`(빌드 시험)와 `npm run e2e:base`(하위 주소 e2e)가 결과를 본다(12절). GitHub Pages로 가기로 하면 `.github/workflows/pages.yml`을 그때 만든다(설계서 9.5절).

## 4. 상태와 저장

모든 저장은 `src/lib/store.ts` 한 곳에서만 한다 (nanostores + @nanostores/persistent). 읽은 값의 모양 고르기는 `src/lib/saved.ts`, 엔진 결과 파생 store(`$result`, `commitSession`)는 자료 전체를 불러오므로 `src/lib/result.ts`에 따로 둔다 (설정 대화 상자처럼 결과가 필요 없는 섬이 자료를 싣지 않게). localStorage를 못 쓰는 환경(사생활 보호 모드 등)에서는 메모리에만 두고 안내 한 줄을 보여 준다.

| 키 | 내용 |
|---|---|
| `cc:session:v1` | `Session` (`src/lib/engine/types.ts`): answers(목적지 답), cart(고른 도구), kept(그대로 간 막힌 곳), deferred(나중으로 미룬 기능), freeText(한 줄 입력). v3(T36, D74·D88)에서 선택 칸 셋을 더했다: notes(질문 id → 내 말, 20개·40자, 열쇠 `q.*`), customTools(직접 쓴 도구 `{ id: custom-1~5, name 40자, capability }`, 5개), gaps(빈틈 id, 10개). 한도는 읽을 때 `saved.ts` `readSession`이, 뜻은 `normalizeSession`이 다시 거른다. 넷 다 비면 칸을 두지 않아 옛 모양 그대로다. 엔진이 채운 빌더의 게시 기능(`builder-publish`, B-02)은 cart에 넣지 않는다. 이름이 바뀌어도 키와 모양은 그대로라 저장된 답이 살아남는다 (D56) |
| `cc:study:v1` | `{ [conceptId]: { read: boolean, quiz: number[] } }` 용어 카드 읽음과 정답 맞힌 문제 번호 |
| `cc:meta:v1` | `{ interviewStartedAt?: number, sent: string[], lessonDone?: true, issued?: true, checkJams?: string[] }` 만들 앱 정하기 첫 답 시각, 보낸 이벤트 열쇠 (최근 20개만 둔다, 8절), 내 AI 써 보기를 끝까지 함·영수증을 한 번 이상 받음 (단계 상태 계산용, D40·D56), 도구끼리 맞춰 보기에서 마지막으로 본 막힌 마디(칸 id, 12개까지. 고치고 돌아오면 빨강이 걷히는 장면 S4, D71) |
| `cc:prefs:v1` | `{ motion: 'auto' \| 'reduce', sound: boolean, quiet: boolean, glossary: boolean, marks: boolean }` (효과음·조용히 모시기 기본 false, 어려운 말 풀이·점선 밑줄 기본 true, D67) |
| `cc:seen:v1` | `{ scenes: string[] }` 처음 한 번만 다 보이는 장면을 이미 본 기록: S1 홈 첫 방문 `home`, S5+S6 출발 → 도착 `arrival`, 어려운 말 풀이 처음 안내 `glossary-hint`, S7 단계 줄에서 그 단계의 ✓를 찍은 `done:{단계}`. 다시 열면 끝 상태가 바로 보인다. 이 키가 있으면 기본 틀이 다시 온 사람(`data-visit`)으로 보고 홈 장면을 돌리지 않는다. 설계도 받기에서는 기본 틀의 첫 그림 전 스크립트가 이 키(`arrival`)와 `cc:meta:v1.issued`, 앞 화면(`document.referrer`가 도구끼리 맞춰 보기)·이동 종류(새로 연 이동)를 읽어 출발 → 도착 장면을 고른다(`html[data-depart]`: play · still, 읽기만, CONCEPT 7절, D71) |
| `cc:terms:v1` | (D69) 어려운 말 풀이를 한 번 연 용어 id(최근 300개). 다음 화면부터 그 말에 점선 밑줄을 긋지 않는다. 고른 글은 저장하지 않는다 |
| `cc:receipts:v1` | (T25) 지난 영수증 최대 30장. 장마다 영수증 링크 조각(`#r=` 뒤), 앱 종류 id(`q.type`의 답), 받은 날만 둔다. 넘치면 가장 오래된 것을 빼고 그렇다고 알린다 (CONCEPT 8절) |

**v3에서 넓히거나 더할 키 (계획, `docs/review/v3/brief.md` 3.7절).** 저장 코드는 그대로 `store.ts` 한 곳이다.

| 키 | 모양 | '저장한 기록 지우기' | 묶음 |
|---|---|---|---|
| `cc:session:v1` (넓힘) | `notes: Record<질문 id, string>`(직접 쓴 말), `customTools`(직접 쓴 도구, 최대 5), `gaps: string[]` (T36에서 했다, 위 표), `look`(디자인 정하기) | 지움 | T36·T38 |
| `cc:prep:v1` (새) | 영수증마다 `{ done, mine, guideIds }`, 최근 30장. `done`에는 안내가 걸리지 않은 줄만 | 지움 | T40 |
| `cc:guides:v1` (새) | `{ done: { [안내 id]: string[] }, finished: string[] }`, 다 마친 안내 최근 200. 안내가 걸린 줄의 마침은 여기만 진실이다(D79, `src/lib/progress.ts`의 `lineDone`·`progressCount`) | 지움 | T39 |
| `cc:prefs:v1` (넓힘) | 지금 값에 `scheme: 'auto' \| 'light' \| 'dark'`(화면 밝기), `text: 100 \| 112.5 \| 125`(글자 크기), `os: 'windows' \| 'mac' \| 'linux' \| 'other' \| 'mobile'`, `osText?`(직접 쓴 컴퓨터 이름)을 더한다 | 설정 값은 남기고 `osText`만 지움 | T39·T41 |
| `cc:drafts:v1` (새) | 만들다 만 앱 최대 5개(세션 통째) | 지움 | T41 |

- 옛 `cc:trip:v1`(도장 장면을 본 기록)은 `cc:seen:v1`로 바뀌었다. 옮길 값이 없으므로 읽지 않고, 남아 있으면 지운다 (`saved.ts`의 `LEGACY_KEYS`, `store.ts`가 처음 불릴 때).
- 화면은 `Session`을 바꾸고, 결과는 매번 `evaluate(catalog, session)`로 다시 계산한다. 계산 결과를 저장하지 않는다. 저장할 때는 `r.session`(정리된 상태)을 쓴다.
- '저장한 기록 지우기'는 진행 기록 여섯 키(`session`·`study`·`meta`·`seen`·`receipts`·`terms`)를 지운다. 설정(`cc:prefs:v1`: 동작 줄이기·효과음·조용히 모시기·풀이·점선 밑줄)은 기록이 아니라서 남긴다 (멀미 때문에 켠 동작 줄이기가 풀리면 안 된다, D41).
- 단계마다 마쳤는지와 남은 개수(꼭 고를 것, 막힌 곳)는 `src/lib/progress.ts`가, 단계가 열렸는지(아직 못 가요와 그 이유)는 `src/lib/stages.ts`가 `evaluate()` 결과와 `cc:meta:v1`에서 매번 계산한다 (순수 함수, 시험 있음, D32 원칙 유지). 따로 쌓는 점수(km·도장)는 없다 (D56). 영수증 링크로 연 영수증도 같은 규칙으로 계산된다.
- 저장 형식을 바꾸면 키의 `v1`을 올리고, 옛 값은 읽어서 옮긴 뒤 지운다.

## 5. 영수증 링크 (공유 링크)

- 모양: `https://사이트/arrival#r=<압축 문자열>`. 주소 바탕이 있으면 `https://사이트/code-chauffeur/arrival#r=…`(3.1절 `siteRoot()`).
- 압축 전 값: `toShareState(session)` → `{ v: 1, a: 답, c: 고른 도구, k: 그대로 간 막힌 곳, d: 나중으로 미룬 기능 }`. 한 줄 입력(freeText)은 넣지 않는다.
- 직접 쓴 것(T36, D88): 내 말(`notes`)과 직접 쓴 도구 이름은 넣지 않는다. 빌더의 게시 기능(B-02, D89)은 세션 장바구니에 없으므로 링크에도 없고, 여는 쪽에서 답(`q.ai`)으로 다시 계산된다. 장바구니의 직접 쓴 도구는 `x: { 'custom-n': 기능 }`, 빈틈은 `g: [id]`로 **있을 때만** 넣고 판 번호는 `v: 1` 그대로다(옛 화면은 모르는 칸을 버린다). 링크로 연 영수증·설계도에는 이름 자리에 '직접 쓴 도구'가 보인다. 보기 id `custom`과 `custom-n`은 그대로 넣는다.
- 압축: `LZString.compressToEncodedURIComponent(JSON.stringify(state))`
- 여는 쪽: 압축 풀기 → `fromShareState()`로 모양 검사 → `evaluate()`가 모르는 id를 버린다. 읽자마자 `history.replaceState`로 주소에서 `#r=`를 지운다. 실패하면 "링크가 깨졌어요" 안내 후 홈으로.
- 링크로 연 영수증은 읽기 전용으로 보여 주고, "이 영수증으로 이어서 가기"를 누를 때만 저장한다 (지금 상태와 다르면 묻는다).
- 지난 영수증(`/receipts`)의 줄을 누르면 저장해 둔 조각으로 `/arrival#r=…`를 연다. 이렇게 다시 열 때는 대표 장면 S5가 돌지 않는다 (S5는 도구끼리 맞춰 보기의 [설계도 받으러 출발하기]로 왔을 때만, `history.state` 표시로 가린다).

## 6. 자료를 화면에 싣는 법

- 빌드 때 `data/*.json`을 import해 `Data` 모양으로 묶는 `src/lib/data.ts`를 만든다. 섬은 여기서 `makeCatalog(data)`를 한 번 만들어 쓴다.
- 자료는 두 판이다 (D82, 설계서 L-08):
  - `src/lib/data.ts` (섬이 처음 싣는 판, gzip 약 35KB): 용어 카드는 엔진이 쓰는 칸(id·title·level·order·prerequisites·stepHint)만, 진열 상품은 출처 칸(`sources`, 자료 검사 전용) 없이, 에러 안내는 싣지 않는다. 여기 없는 용어 칸·에러 안내를 읽으면 바로 멈춘다(열거하지 않는 getter).
  - `src/lib/data-full.ts` (+ 용어 풀이 칸 + 에러 안내, gzip 약 18KB 더): 사전 섬(시트를 열 때 `import()`), 용어 화면의 섬과 `term-scene.ts`, 빌드 때만 도는 곳(용어 화면, 검색 색인·풀이 끝점).
  - 칸 나누기는 Vite 플러그인 `scripts/lib/data-parts-plugin.ts`가 가상 모듈(`virtual:cc-data/concepts-core` · `concepts-detail` · `products`)로 한다. 규칙과 칸 목록은 `src/lib/data-parts.ts`(시험: 스키마의 용어 칸은 둘 중 한쪽에 꼭 있다, 골든 전부에서 두 판의 결과가 같다). 용어 카드에 칸을 더하면 `CONCEPT_CORE`·`CONCEPT_DETAIL` 중 하나에 넣는다.
  - Node 스크립트·시험은 `scripts/lib/load-data.ts`로 모든 칸을 읽는다.
- 섬이 쓰는 자료는 섬이 필요한 화면에서만 불러온다. 진열 상품(`layer: shelf`)이 늘어 `data.ts` 판이 gzip 50KB를 넘으면 기능(칸)별로 나누는 방법을 `docs/DECISIONS.md`에 정하고 바꾼다.
- `data/index/`(T19 자동 색인)는 분야별 JSON으로 `public/index/분야.json`에 내보내고, 도구 고르기·도구 모음에서 필요한 분야만 불러온다. 화면에서는 '원문만 있는 도구'로 보인다. 파일 수 2만 개, 파일당 25MiB 한도를 지킨다.

## 7. 검색 (사전·도구 모음)

- 빌드 때 `src/pages/search-index.json.ts`가 용어 카드, 에러 안내, 도구(진열 상품과 색인 상품), 막히기 쉬운 곳 문장, 어려운 말 풀이 용어를 모아 MiniSearch 색인을 만든다 (D47). 풀이 용어는 용어 카드가 있으면 그 카드 문서의 열쇠 말로 더하고, 없으면 `term` 종류 문서로 넣어 '용어' 묶음에 나온다 (D69). `scripts/build-search.ts`는 색인 크기와 예시 질문의 첫 결과를 찍어 보는 점검 도구다.
- 결과는 네 묶음으로, 이 순서로 보인다 (CONCEPT 3.6·6.9절):

  | 묶음 이름 (화면) | 문서 종류 (`DocType`, 내부 id) | 그림 |
  |---|---|---|
  | 에러가 났을 때 | `error` | 계기판 경고등 |
  | 용어 | `concept` | 청사진 판 |
  | 막히기 쉬운 곳 | `stuck` | — |
  | 도구 | `product` (색인 상품은 꼬리표 '원문만') | 기능 그림 |

- 낱말 나누기:
  1. 영문·숫자 덩어리와 한글 덩어리를 따로 자른다 ("API키는" → "api", "키는").
  2. 한글 덩어리 끝의 흔한 조사(은·는·이·가·을·를·에·에서·으로·로·와·과·의·도·만)를 떼어 낸 형태도 넣는다 ("키는" → "키").
  3. 한 글자 낱말도 버리지 않고, 두 글자 이상이면 두 글자씩 끊은 조각(bigram)도 함께 넣는다 ("환경변수" → "환경", "경변", "변수").
  4. 영문은 소문자로.
- 같은 낱말 조각이 이름(title)에 걸리면 본문보다 높게 친다 (boost). 그래서 "API키는"은 'API 키' 용어 카드가 'API' 용어 카드보다 위에 온다.
- 에러 붙여 넣기는 검색과 따로 `matchErrors()`(정규식)로 찾아 맨 위에 둔다.
- 검색 동의어 (v3 설계서 3.5절, D83): 화면 문구에서 쓰지 않는 말(테마·폰트·가이드·다크 모드…)도 검색어로는 받는다. `data/aliases.json`의 `searchSynonyms`를 색인을 만들 때 펼쳐(`applySynonyms`), `to`의 이름(용어 카드·풀이 용어·에러 안내·도구의 이름이나 다른 이름, 띄어쓰기·대소문자 무시)을 가진 문서에 이용자가 칠 말을 열쇠 말(`keys`)로 붙인다. 브라우저 코드는 늘지 않는다. 아직 없는 화면(만들기 안내·디자인 둘러보기)의 이름도 미리 적어 두어, 그 문서가 색인에 들어오면 저절로 붙는다. 지금은 '테마'·'폰트'·'다크 모드' → CSS, '가이드'·'튜토리얼' → 공식 문서, '화면 올리기' → 배포. 붙은 문서는 `node scripts/build-search.ts`가 찍는다.

## 8. 집계 (Worker + D1)

이벤트 다섯 개만 받는다. 이름과 구간 값은 정해진 목록만 받고 나머지는 버린다. 이벤트 이름은 내부 id라 화면 이름이 바뀌어도 그대로 둔다 (D56).

| 이벤트 | 구간(bucket) | 보내는 때 |
|---|---|---|
| `interview_start` | 없음 | 답이 하나도 없던 상태에서 목적지 첫 답을 고를 때. 이때 `interviewStartedAt`을 적는다 |
| `receipt_issued` | `m00-05`, `m05-10`, `m10-15`, `m15-20`, `m20-30`, `m30+`, `none` | 처음 보는 상태의 영수증이 설계도 받기 화면에 나올 때. 구간은 `interviewStartedAt`부터 걸린 시간(시운전 제외), 시작 시각이 없으면(미리 짠 코스·영수증 링크) `none` |
| `card_copy` | `first`, `next`, `verify`, `error`, `change` | AI에게 할 말 한 장을 복사 |
| `required_done` | 없음 | 그 영수증의 먼저 읽어 둘 용어를 모두 읽었을 때 |
| `quiz_answer` | `ok`, `ng` | 용어 카드 확인 문제 답 (같은 문제는 처음 한 번만) |

- '처음 보는 상태'는 영수증 링크 조각(`shareHash(session)`)의 짧은 해시(FNV-1a, `stateKey`)로 가린다. 보낸 이벤트 열쇠를 `cc:meta:v1.sent`에 최근 20개까지 둔다. 같은 열쇠는 다시 보내지 않는다: `receipt_issued:해시`, `card_copy:카드:해시`, `required_done:해시`, `quiz_answer:개념.번호`(처음 고른 답만).
- 미리 짠 코스로 출발하거나 영수증 링크로 이어서 가면 `interviewStartedAt`을 지운다 (그 영수증의 구간은 `none`).
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
- `/api/*`만 Worker 함수를 먼저 거치고, 나머지는 정적 파일이 바로 나간다. 정적 파일 쪽은 `public/_headers`(보안 머리글)와 `public/_redirects`(주소 넘기기, 지금은 줄 없음, 3.1절)를 읽는다.
- 화면의 링크는 끝 빗금 없이(`/check`) 쓰므로 `html_handling`을 `drop-trailing-slash`로 둔다 (기본값이면 `/check` → `/check/`로 한 번 돌려보낸다). 대표 주소(canonical)도 끝 빗금을 뗀다 (D50).
- Workers 로그(observability)는 끈다. 요청 기록에 IP 같은 정보가 남지 않게 한다 (R-60).
- 배포는 둘로 나눈다.
  - **미리 보기 배포** (T21): main에 합쳐지면 `npm run validate`(개발용)가 통과할 때 배포한다. 바닥글에 시험판 안내 한 줄('시험판이에요. 도구 정보가 바뀔 수 있어요.', D67)을 두고, 검색 엔진이 색인하지 않게 `noindex`를 붙인다.
  - **정식 배포** (T22): `npm run validate:release`가 통과해야 한다 (사람 확인이 남은 진열 상품이 없어야 함). 그 한 줄과 `noindex`를 뗀다.
- 배포는 **Cloudflare Workers Builds**가 한다(D72): 대시보드에서 비공개 저장소를 한 번 연결하면 `main`에 푸시할 때마다 빌드 명령 `npm run build:cf`(단계에 맞는 자료 검사 + 빌드)로 빌드하고 올린다. GitHub Actions 배포(`deploy.yml`)는 손으로만 돌리는 예비 길이고, 그 길을 쓸 때만 비밀 값(CLOUDFLARE_API_TOKEN 등)을 저장소 설정의 Secrets에 둔다. 사람이 할 일은 `docs/DEPLOY.md`.
- 빌드 변수: `PUBLIC_STAGE`(`preview` 기본 / `release`), `PUBLIC_SITE_URL`(대표 주소), `PUBLIC_CONTACT_EMAIL`(의견 보내기 연락 주소, 비면 소개의 '틀린 곳을 알려 주세요'를 그리지 않음, H22), (선택) `PUBLIC_CF_BEACON_TOKEN`, `PUBLIC_BASE_PATH`(주소 바탕, 기본 `/`)·`PUBLIC_HOST`(`cloudflare` 기본 | `static`, 3.1절, D81). 호스트를 고르는 일은 사람 몫이다(H13).
- **빌드 지킴 (L-04, `scripts/lib/build-guard.ts`, `astro.config.mjs`의 통합이 불러 `npm run build`·`build:cf` 모두 걸림):** 주소 바탕·호스트 꼴은 늘 본다. `PUBLIC_STAGE=release`면 `PUBLIC_SITE_URL`이 비었거나 `example`을 품을 때, `PUBLIC_CONTACT_EMAIL`이 빌 때 빌드를 시작하지 않고, 빌드 뒤 결과 글(HTML·JS·CSS·JSON 등)에 `codechauffeur.example`·`(초안)`·`검토 중인 초안`이 남으면 실패한다. 실패는 '빌드를 멈췄어요: …' 한국어 한 줄이다. 그래서 법 문서 최종 문구(H04) 전에는 정식 빌드가 되지 않는다.
- 보안 헤더 (T21, D53): CSP 본체는 Astro `security.csp`가 페이지마다 `<meta>`로 넣는다(스크립트·스타일 해시, 외부는 `static.cloudflareinsights.com` 스크립트와 `cloudflareinsights.com` 전송만이고 `PUBLIC_HOST=static`이면 그 둘도 뺀다, 인라인 style 속성만 허용). meta로 안 되는 `frame-ancestors`와 `X-Content-Type-Options`·`Referrer-Policy: same-origin`·`Permissions-Policy`·`Cross-Origin-Opener-Policy`·`X-Frame-Options`, `/_astro/*` 오래 두기는 `public/_headers`(Workers가 정적 파일 응답에 적용). e2e `tests/e2e/csp.spec.ts`가 주요 조작에서 CSP 위반 0을 확인한다.
- 단계: 저장소 변수 `SITE_STAGE`(`preview` 기본 / `release`)가 빌드의 `PUBLIC_STAGE`가 된다 (`src/lib/stage.ts`). 미리 보기는 바닥글의 시험판 안내 한 줄(D67: 모든 화면 맨 위의 띠는 걷었다), `<meta name="robots" content="noindex, nofollow">`, `robots.txt`의 `Disallow: /`. 방문 통계는 `PUBLIC_HOST`가 `cloudflare`이고 `CF_BEACON_TOKEN`이 있을 때만, 도착 화면 `/arrival`(바탕을 뗀 주소로 판단)을 빼고 싣는다.
- 배포 작업은 `.github/workflows/deploy.yml`, 사람이 할 일은 `docs/DEPLOY.md`.

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

- 첫 화면: 모바일 기준 LCP 2.5초 이하, 자바스크립트 100KB 이하(gzip). 홈의 섬은 넷이다: 주 버튼과 묶음 목록(HomeStart, `client:load`)과 쉬는 시간에 붙는 셋(설정·사전·풀이). 엔진·자료 묶음(gzip 약 40KB, D82 전에는 59KB)은 홈 첫 화면에 싣지 않고, 다시 온 손님의 이어 갈 곳과 [이 코스로 출발]에서만 늦게 불러온다(다시 온 손님은 단계 화면에서 같은 묶음을 이미 받아 두었다). 예산 검사는 늦게 붙는 섬의 묶음도 모두 세고, `export … from`으로 다시 내보내는 섬 입구(여러 곳이 쓰는 MapBoard)도 따라간다(홈 98.3 → 39.2KB, 지도 단계 화면은 지도 묶음 7.9KB가 이제 잡힌다, D70). **단계 화면 다섯(`/test-drive` `/destination` `/waypoints` `/check` `/arrival`)은 처음 불러오는 JS 130KB 이하**(D82: v3 기능을 얹을 자리), 다른 페이지는 140KB 이하.
- 단계 화면 덜기 (D82, 설계서 L-08, 2026-10-14 잼): `/arrival` 136.0 → 115.0 · `/check` 133.8 → 114.7 · `/waypoints` 131.0 → 111.9 · `/destination` 130.0 → 110.8 · `/test-drive` 106.7 → 87.6KB. 자료 두 판(6절)으로 −17KB 안팎, 4단계 칸 지연으로 `/arrival` −1.8KB, 상품 출처 칸 뺌으로 −2.0KB.
- 4단계 칸 지연 (D82): 영수증 칸만 처음 묶음에 있다. 설계도·용어·AI에게 할 말 칸의 안(`ReceiptTabs.tsx`)은 영수증을 그린 뒤 쉬는 시간에(칸 이름에 초점·포인터가 가도) `import()`로 미리 받는다. 못 받으면 열린 칸에 한 줄 + [새로 고치기](실패한 `import()`는 브라우저가 기억해 같은 주소로 다시 받을 수 없다). [설계도 내려받기 (.md)]의 설계도 묶음(`src/lib/pack-file.ts` + 엔진 `pack.ts`)은 `/arrival` 아래 막대 섬의 첫 묶음에 함께 싣는다: 주 버튼이 망과 상관없이 같은 누름 안에서 내려받는다. 'AI에게 할 말 n장' 수는 엔진 `cards.ts`라 처음 묶음에 있다.
- 단계 화면에서 나중에 받는 묶음 (D82, gzip): 4단계 칸 셋(`ReceiptTabs`) 3KB 이하, 설계도 묶음(`pack-file` + `pack.ts`) 5KB 이하, 풀이 칸 + 에러 안내(`data-full`, 사전 시트를 열 때) 22KB 이하. 단계 화면의 첫 묶음에 끼면 예산 검사가 실패한다(설계도 묶음만 `/arrival` 첫 묶음에 있어도 된다). v3에서 더할 지연 묶음 상한(찾기 8 · 디자인 14 · 다음 할 일 12 · AI 설정 파일 10 · 안내 섬 5 · `/looks` 섬 4KB)은 그 묶음을 만들 때 예산 검사에 줄을 더한다 (빌드에 없으면 실패하는 규칙이라 미리 넣지 않는다).
- 직접 쓰기 찾기 묶음 (T36·T37, D88): 낱말 찾기 `src/lib/engine/match.ts`와 낱말표 `data/aliases.json`(사전 검색용 `searchSynonyms`는 빼고)을 화면이 직접 쓰기 칸을 처음 열 때 `import()`로 받는다. 엔진 입구 `index.ts`는 `match.ts`를 내보내지 않아 단계 화면 첫 묶음에 들지 않는다. T36에서 잰 값(esbuild + gzip): 찾기 코드 약 3.1KB + 낱말표 약 5.5KB = **약 8.7KB로 상한 8KB를 넘는다.** 묶음을 만드는 T37이 줄이고(낱말표를 질문별로 나누거나 도구 이름 표를 2단계에서만 받기) `qa:budget`에 줄을 더한다. 단계 화면 첫 묶음은 T36 뒤 `/arrival` 124.3 · `/check` 121.6 · `/waypoints` 118.8 · `/destination` 117.7 · `/test-drive` 94.1KB(모두 130KB 이하, 빌더의 게시 기능 `builder.ts`까지 넣은 값)였다.
- 처음 불러오는 CSS(글꼴 `@font-face` 포함)는 gzip 30KB 이하. CSS는 첫 화면 그리기를 막는다 (D38). 밤 지도 토큰도 이 안에 든다.
- 페이지마다 그림·애니메이션 파일 합계 300KB 이하. 글꼴은 하위 집합(subset)만 싣는다. 렌더 그림은 Astro `<Picture>`로 화면 크기에 맞는 AVIF/WebP 하나만 내려온다. 쪽별 그림 예산은 CONCEPT 9절 표 (가장 큰 곳은 목적지 첫 질문, 약 80KB).
- 지도 (T28, gzip, D68): 땅 판 한 장 24KB 이하, 지도 표지 묶음 10KB 이하, 지도 섬(MapBoard.tsx + `map/focus.ts`) 8KB 이하, 지도 모형(`map/model.ts`) 6.5KB 이하, 빌드한 MapBoard 묶음(섬 + 모형) 14.5KB 이하. 섬과 모형은 파일 하나씩 줄여(import한 엔진·문구·preact는 빼고) 잰다. 지도 CSS(`map.css`·`map-land.css`)는 지도를 그리는 페이지에만 실린다 (MapBoard.tsx가 불러온다).
- 나중에 불러오는 묶음(효과음 합성기 같은 것)은 하나에 200KB 이하. 유휴 시간이나 이용자 행동 뒤에만 불러온다.
- 어려운 말 풀이 (brief 8절, D69, gzip): 풀이 섬(`TermPopover`, 모든 페이지) 5KB 이하, 자료 + 매처(`/glossary.json` + `term-engine` 묶음) 17KB 이하, 도구 이름 풀이(`/glossary-tools.json`, 같은 때 따로 받음) 4KB 이하. 자료는 처음 고르기·처음 밑줄 누름·섬 화면의 쉬는 시간 가운데 먼저 오는 때 받는다.
- 사전 검색 색인(`/search-index.json`, 처음 찾을 때 받음)은 100KB 이하(gzip).
- 대표 장면 S5+S6(출발 → 도착 → 영수증 출력과 도장)은 합계 3.0초(`--dur-scene`)를 넘지 않는다 (brief 7절).
- 렌더 장치(three)는 개발용이라 화면에 실리는 JS에 들지 않는다.
- `npm run qa:budget`이 빌드 결과로 이 기준을 검사한다.

## 12. 시험과 CI

| 명령 | 하는 일 |
|---|---|
| `npm run validate` | 스키마 + 교차 검사 |
| `npm run golden` | 추천 회귀 검사 |
| `npm run typecheck` | 타입 검사 |
| `npm run tokens` | 토큰 대비(낮·밤 두 모드)와 동작 줄이기 검사 |
| `npm run fonts:check` | 영수증 글꼴에 고정 문구 글자가 다 있는지 (`npm run fonts`로 다시 만듦) |
| `npm run guard` | 품질 바닥선 (토큰 밖 값, 외부 자원, 화면 코드 속 문장, any, 시험 건너뛰기, 엔진 순수성, `src`의 three import) |
| `npm run words` | 쓰지 않는 말 (CONCEPT 3.9·3.10절). 화면 문구(`src/copy/ko.ts`)와 자료 문장에서 버린 비유, 바꾼 말, 화면에서 쓰지 않는 영어 말을 찾는다. 낱말표 `data/aliases.json`은 `message` 칸만, 다른 자료의 `aliases`·`keywords` 칸은 보지 않는다(이용자가 칠 말, D83). `check`에 들어 있다 |
| `npm run harness` | `.claude/` 스킬·에이전트·규칙 앞머리 검사 |
| `npm run check` | 위 검사들 + `npm test`. 커밋 전과 CI에서 돈다 |
| `npm run qa:shots` | 빌드 결과 스크린샷(360·768·1280·동작 줄이기, T34부터 밤 모드도), axe, 가로 스크롤, 작은 버튼, 외부 요청 |
| `npm run qa:budget` | 성능 예산 |
| `npm run art` / `art:sheet` | (T33) 렌더 굽기 / 모든 렌더를 한 장에 놓은 견본 (빛과 색이 맞는지 본다) |
| `npm test` | Vitest: 골든 사례 + 자료 검사(망가뜨린 자료를 잡는지) + 엔진·스크립트·화면 도우미 단위 시험 (`tests/**/*.test.ts`, 주소 바탕 `withBase`·`siteRoot`, 빌드 지킴, 바탕 검사 포함) |
| `npm run test:coverage` | 엔진(`src/lib/engine`) 시험 범위. 줄 기준 90% 이상 (T04부터 문턱으로 막음) |
| `npm run e2e` | Playwright(`tests/e2e/`, 360px): 미리 짠 코스 5개로 영수증까지, 키보드만으로 목적지 끝까지, 영수증 링크 다시 열기·이어서 가기, 사전·도구 모음 검색, 장면 중간 누르기, 동작 줄이기(기기·사이트) 흐름, 모든 화면 axe(처음 온 사람·진행 있음). 빌드한 `dist/`를 `scripts/qa/serve.ts`로 띄운다 |
| `npm run qa:base` | 주소 바탕 빌드 시험: `PUBLIC_BASE_PATH=/code-chauffeur PUBLIC_HOST=static`으로 `.qa/dist-base`에 빌드하고(기본 `dist/`는 그대로), 모든 HTML의 `href`·`src`·`srcset`·섬 주소와 CSS `url()`이 `/code-chauffeur/`로 시작하는지(바깥 링크·`#`·`mailto:` 빼고), 설명서의 `start_url`·`scope`·아이콘, 방문 통계 스크립트 없음, 처리방침의 정적 호스트 문장을 본다 (`scripts/qa/base-build.ts`, 규칙 `scripts/lib/base-scan.ts`) |
| `npm run e2e:base` | `qa:base` + `tests/e2e/base-path.spec.ts`: 정적 서버를 `--base /code-chauffeur --dist .qa/dist-base`로 띄우고(바탕 밖 주소는 404) 홈 → 만들 앱 정하기 한 문항 → 사전 검색 → 용어 풀이 → 도구 상세에서 404·바탕 밖 요청·`/api/event` 요청이 0인지 본다. `E2E_BASE=1`일 때만 `playwright.config.ts`가 이 프로젝트(`base-path`)와 서버를 켜므로 `npm run e2e`는 기본 빌드만 본다 |

GitHub Actions(`.github/workflows/check.yml`)는 모든 푸시·PR·수동 실행에서 `npm ci && npm run check && npm run test:coverage && npm run build && npm run qa:budget`를 돌리고(`check`에 `npm test`가 들어 있다), e2e(`npm run e2e`)와 주소 바탕 시험(`npm run e2e:base`)은 `main` 푸시·PR·수동 실행에서만 더 돌린다. 작업 브랜치 푸시는 빠른 검사만 돌고, 같은 브랜치에 새로 푸시하면 앞 실행은 취소한다. 비공개 저장소의 Actions 무료 시간(월 2,000분)을 아끼려는 것이다 (D72). 배포 조건은 9절.
