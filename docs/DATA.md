# 자료 안내 (v5 진열대)

진열대 자료는 `data/catalog/<대분류>/<출처>.json`에 있다. 가져오기 스크립트가 공개 목록·API에서 받아 쓰고, 사람은 손으로 고치지 않는다. 규칙은 `.claude/rules/data.md`. v4의 상품·질문·규칙 자료 안내는 `docs/archive/v4/docs/DATA.md`.

## 1. 파일

| 파일 | 담는 것 |
|---|---|
| `data/catalog/<대분류>/index.json` | 대분류 이름(`nameKo`), 받은 날, 소분류 목록(id·이름·설명·출처별 개수), 뺀 출처와 이유(`rejected`) |
| `data/catalog/<대분류>/<출처>.json` | `{ source, fetchedAt, count, available?, cut?, note?, items[] }`. `source.license`는 이 목록을 실어도 되는 이유, `cut`은 너무 큰 출처의 상위 기준 |
| `data/glossary.json` | 어려운 말 풀이·용어 사전 (204개) |
| `data/kits.json` | 스타터 키트 (홈에서 한 번에 담는 재료 묶음 4개, 손으로 고른 진열대 id). 키트 id는 `src/lib/kits.ts` `KIT_IDS`(집계 구간)와 같아야 하고, 진열대에 없는 id가 있으면 진열대 빌드가 멈춘다 (`tests/lib/kits.test.ts`). 자료를 다시 받아 재료가 빠지면 여기를 고친다 |
| `data/catalog-media/readme-images.json` | 저장소 README의 첫 그림 (v5.1 D126): `images`(상품 id → 그림 주소), `stills`(그림이 GIF일 때 카드에 쓸 멈춘 그림), `none`(README에 쓸 그림이 없던 id), `fetchedAt`. `npm run import:media`(`scripts/import/media-readme.ts`, 처음 약 6분, 다음부터는 새 상품만, `--refresh`면 모두)가 쓴다. 진열대 빌드가 미리 보기 자료에 `readmeImage`·`readmeStill`로 붙인다 |
| `data/catalog-ko/*.json` | 코드잇소가 쓴 한국어 설명 `{ "<상품 id>": "다체 한 줄" }` (D122·D128): `agent.json`(번역 에이전트가 잘 보이는 상품 11,522개), `auto-<n>.json`(매일 번역 `npm run ko:translate`, 파일당 5천 개), `template.json`(모양이 정해진 상품 9,990개를 자료로 만든 한 줄, `npm run ko`). 겹치면 agent → auto → template 순서. 진열대 빌드가 `summaryKo`로 붙이고, 출처가 준 한국어가 있으면 그것이 먼저다 |
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
| `preview{type,…}` | 미리 보기 재료: font·palette·icons·asset·style·site·repo·template·model·dataset·api·mcp·skill·prompt… |
| `use{install,snippet,docs}` | 출처가 준 설치 명령·설정 조각·문서 주소만 |
| `fetchedAt` | 받은 날 |

## 3. 다시 받기

- `npm run import`(전체) 또는 `import:design`·`import:ai`·`import:api`·`import:oss`(오픈소스·데이터셋·템플릿). 네트워크가 필요하고 처음에는 오래 걸린다(공식 MCP 등록소 약 60분, 공공데이터포털 약 15분). 요청 캐시는 저장소 밖.
- 같은 날 다시 돌리면 바이트가 같은 파일이 나온다. 다 받은 뒤 `npx vitest run tests/import`로 스키마·id·개수를 본다.
- GitHub 검색 API가 막힌 환경에서는 repos.ecosyste.ms와 awesome 목록으로 대신 받는다. `GITHUB_TOKEN`이 있으면 GitHub 주제 검색을 더한다.
- **매일 (D128):** `.github/workflows/daily-refresh.yml`이 03:17 KST에 가져오기를 16줄로 함께 받고(`npm run refresh`, 기록은 `.cache/refresh/`, 공공데이터포털·Iconify 묶음·OWID·MCP 등록소는 월요일에만) → 새 상품 README 그림 → `npm run ko` → 번역(열쇠가 있을 때만) → `npm test` → `npm run catalog`가 통과하면 `data/`를 배포 가지에 올린다. 예약 실행은 이 파일이 main에 있어야 돈다(HUMAN H24).

## 4. 화면에 싣기

`scripts/catalog/build.ts`가 이 자료를 읽어 목록 묶음·상세 조각·검색 색인·Astro 요약을 만든다 (`docs/ARCHITECTURE.md` 4절). 빌드는 네트워크를 쓰지 않는다.
