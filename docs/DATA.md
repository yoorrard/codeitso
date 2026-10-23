# 자료 안내 (v5 진열대)

진열대 자료는 `data/catalog/<대분류>/<출처>.json`에 있다. 가져오기 스크립트가 공개 목록·API에서 받아 쓰고, 사람은 손으로 고치지 않는다. 규칙은 `.claude/rules/data.md`. v4의 상품·질문·규칙 자료 안내는 `docs/archive/v4/docs/DATA.md`.

## 1. 파일

| 파일 | 담는 것 |
|---|---|
| `data/catalog/<대분류>/index.json` | 대분류 이름(`nameKo`), 받은 날, 소분류 목록(id·이름·설명·출처별 개수), 뺀 출처와 이유(`rejected`) |
| `data/catalog/<대분류>/<출처>.json` | `{ source, fetchedAt, count, available?, cut?, note?, items[] }`. `source.license`는 이 목록을 실어도 되는 이유, `cut`은 너무 큰 출처의 상위 기준 |
| `data/glossary.json` | 어려운 말 풀이·용어 사전 (216개, D141에 AI API 요금 말 9개) |
| `data/kits.json` | 스타터 키트 (홈에서 한 번에 담는 재료 묶음 4개, 손으로 고른 진열대 id). 키트 id는 `src/lib/kits.ts` `KIT_IDS`(집계 구간)와 같아야 하고, 진열대에 없는 id가 있으면 진열대 빌드가 멈춘다 (`tests/lib/kits.test.ts`). 자료를 다시 받아 재료가 빠지면 여기를 고친다 |
| `data/catalog-media/readme-images.json` | 저장소 README의 첫 그림 (v5.1 D126): `images`(상품 id → 그림 주소), `stills`(그림이 GIF일 때 카드에 쓸 멈춘 그림), `none`(README에 쓸 그림이 없던 id), `fetchedAt`. `npm run import:media`(`scripts/import/media-readme.ts`, 처음 약 6분, 다음부터는 새 상품만, `--refresh`면 모두)가 쓴다. 진열대 빌드가 미리 보기 자료에 `readmeImage`·`readmeStill`로 붙인다 |
| `data/catalog-ko/*.json` | 코드잇소가 쓴 한국어 설명 `{ "<상품 id>": "다체 한 줄" }` (D122·D128): `agent.json`(사람이 연 Claude 세션이 보이는 앞쪽을 한 번 번역한 것, D140·D142. 다시 채울 때는 `agent-batch.ts` → 번역 → `agent-merge.ts`), `auto-<n>.json`(열쇠가 있을 때만 도는 번역 `npm run ko:translate`, 파일당 5천 개, 기본은 꺼짐). 겹치면 agent → auto 순서. 진열대 빌드가 `summaryKo`로 붙이고, 출처가 준 한국어가 있으면 그것이 먼저다. 여기 없는 상품은 진열대 빌드가 자료로 한 줄을 만든다(D143, `scripts/lib/ko-rule.ts`: 모양이 정해진 상품은 자세한 자료 문장, 그 밖은 '무엇인지' 한 줄 `koBy: 'rule'`). 그래서 모든 상품이 한국어로 먼저 읽힌다. `npm run ko`는 대분류마다 한국어 상태를 센다 |
| `data/catalog-models/models-dev.json` | AI 모델마다의 사실 (D141, 스키마 `schemas/catalog-models.json`, 시험 `tests/import/models.test.ts`): `{ source, fetchedAt, providers, count, models: { <models.dev 제공자 id>: 모델[] } }`. 모델은 models.dev `api.json`의 칸 이름 그대로 `id`·`name`·`cost`(100만 토큰당 달러: `input`·`output`·`cache_read`·`cache_write`·`input_audio`·`output_audio`·`context_over_200k`)·`limit`(`context`·`input`·`output` 토큰)·`modalities{input,output}`·`reasoning`·`tool_call`·`attachment`·`open_weights`·`knowledge`·`release_date`·`last_updated`·`status`(deprecated·beta·alpha). 값은 그대로 옮기고 모양이 틀린 값은 버린다. 제공자 id 순, 모델 id 순, 모델 하나가 한 줄(날마다 바뀐 가격이 diff에 한 줄씩 보인다). `scripts/import/api-curated.ts`가 `data/catalog/api/models-dev.json`과 함께 쓰고, 매일 자료 새로 받기('api' 줄)가 다시 받는다. 진열대 빌드가 제공자마다 `public/catalog/models/p/<id>.json`, 비교 쪽 묶음 `direct.json`(직접 만드는 회사)·`hosts.json`(호스팅·라우터)으로 줄인다 |
| `schemas/catalog-*.json` | 대분류마다 출처 파일·`index.json` 스키마 |

## 2. 항목 하나의 모양 (`src/lib/catalog/types.ts`의 `CatalogItem`)

| 칸 | 뜻 |
|---|---|
| `id` | `<출처>:<slug>`, 소문자·숫자·점·하이픈. 주소에 그대로 쓴다. 바꾸지 않는다 |
| `name`, `kind`(소분류), `category`(대분류) | |
| `summary` | 출처 원문 그대로 (최대 300자) |
| `summaryKo`, `written` | 한국어 한 줄. 코드잇소가 쓴 것이면 `written: 'codeshopper'` |
| `url`, `source{name,url}`, `license`(SPDX, 모르면 비움) | |
| `metrics{stars,downloads,likes,updatedAt}` | 출처가 준 값만. `downloads`의 뜻은 출처마다 다르다(30일 조회·한 달 내려받기·전체 내려받기·활용신청 수) → 파일의 `note`. 다른 꾸러미의 값이면 `preview.downloadsOf`에 그 이름 |
| `metrics{views,trend,siteRank}` | 인기순에만 쓰는 사실 신호 (D133, `scripts/import/signals.ts`): 조회 수, 요즘 뜨는 정도(HF trendingScore), Chrome UX Report 세계 순위 묶음(다른 지표가 없을 때만). 카드에는 보이지 않는다 |
| `tags` | 출처의 분류·주제 |
| `preview{type,…}` | 미리 보기 재료: font·palette·icons·asset·style·site·repo·template·model·dataset·api·mcp·skill·prompt… AI API(`models-dev:*`)는 `modelCount`·`models`(새 모델 이름 몇 개)·`pricingUrl`·`freeTierQuote`(요금 쪽 원문)와 `limitsUrl`·`limitsCheckedAt`(손으로 확인한 공식 사용 한도·등급 안내 쪽과 확인한 날, `scripts/import/api-curated-data.ts` `RATE_LIMIT_DOCS`, 가져올 때마다 살아 있는지 본다, D141) |
| `use{install,snippet,docs}` | 출처가 준 설치 명령·설정 조각·문서 주소만 |
| `fetchedAt` | 받은 날 |

## 3. 다시 받기

- `npm run import`(전체) 또는 `import:design`·`import:ai`·`import:api`·`import:oss`(오픈소스·데이터셋·템플릿). 네트워크가 필요하고 처음에는 오래 걸린다(공식 MCP 등록소 약 60분, 공공데이터포털 약 15분). 요청 캐시는 저장소 밖.
- 같은 날 다시 돌리면 바이트가 같은 파일이 나온다. 다 받은 뒤 `npx vitest run tests/import`로 스키마·id·개수를 본다.
- **바뀐 것만 쓴다 (D143):** 출처 파일은 지난 파일과 견줘 뜻 있게 바뀐 상품만 새 스냅숏을 쓰고(`scripts/lib/catalog-stable.ts`), 나머지는 지난 스냅숏(받은 날 포함)을 그대로 둔다. 새·빠진 상품과 글·주소·라이선스·꼬리표·쓰는 법 같은 사실은 늘, 스타·내려받기 같은 수는 10%(50 아래는 5) 넘게, HF 뜨는 정도는 약 세 배 넘게, 갱신일은 7일 넘게 바뀔 때만 올린다. 상품이 모두 그대로면 파일도 받은 날도 그대로다. 출처가 절반 아래로 줄면 지난 파일을 지킨다(일부러 줄일 때 `REFRESH_ALLOW_SHRINK=1`). 그래서 상품의 `fetchedAt`은 '그 값들을 출처에서 받은 날'이다.
- GitHub 검색 API가 막힌 환경에서는 repos.ecosyste.ms와 awesome 목록으로 대신 받는다. `GITHUB_TOKEN`이 있으면 GitHub 주제 검색을 더한다.
- **매일 (D128 → D143):** `.github/workflows/daily-refresh.yml`이 03:17 KST에 오늘(한국 요일) 차례인 출처를 16줄로 함께 받는다(`npm run refresh`, 받는 날은 `scripts/lib/refresh-plan.ts`, 기록은 `.cache/refresh/`). 매일 = HF·Kaggle·AI 확장·MCP 등록소의 바뀐 것(`ai-mcp.ts --since`, updated_since)·shadcn 레지스트리·GitHub 오픈소스 목록·공개 API 목록·공식 API와 AI 모델 가격, 화 = 글꼴·색·그라디언트·3D 에셋·세계은행·데이터 모음, 수 = 템플릿, 목 = 디자인 저장소·디자인 시스템·디자인 사이트, 금 = npm·PyPI·pub, 토 = GitLab·Codeberg, 월 = MCP 등록소 전체·Iconify·공공데이터포털·OWID. → 새 상품 README 그림 → 번역(열쇠가 있을 때만, 기본 꺼짐) → 요약(`scripts/import/refresh-summary.ts`: 출처 파일마다 새·빠짐·바뀜을 작업 흐름 요약에) → 바뀐 자료가 있을 때만 `npm test` → `npm run catalog` → `data/`를 배포 가지에 올린다. 지표만 흔들린 날은 커밋·배포가 없다. 손 실행은 줄 이름(`oss-hf`)·갈래·요일(`day`)·모두(`all`)를 고를 수 있다. 예약 실행은 이 파일이 main에 있어야 돌고(HUMAN H24), 공개 저장소의 60일 규칙에 걸리지 않게 예약 실행마다 작업 흐름을 다시 켠다.

## 4. 화면에 싣기

`scripts/catalog/build.ts`가 이 자료를 읽어 목록 묶음·상세 조각·검색 색인·Astro 요약을 만든다 (`docs/ARCHITECTURE.md` 4절). 빌드는 네트워크를 쓰지 않는다.
