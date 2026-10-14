# 자료 안내 (v5 진열대)

진열대 자료는 `data/catalog/<대분류>/<출처>.json`에 있다. 가져오기 스크립트가 공개 목록·API에서 받아 쓰고, 사람은 손으로 고치지 않는다. 규칙은 `.claude/rules/data.md`. v4의 상품·질문·규칙 자료 안내는 `docs/archive/v4/docs/DATA.md`.

## 1. 파일

| 파일 | 담는 것 |
|---|---|
| `data/catalog/<대분류>/index.json` | 대분류 이름(`nameKo`), 받은 날, 소분류 목록(id·이름·설명·출처별 개수), 뺀 출처와 이유(`rejected`) |
| `data/catalog/<대분류>/<출처>.json` | `{ source, fetchedAt, count, available?, cut?, note?, items[] }`. `source.license`는 이 목록을 실어도 되는 이유, `cut`은 너무 큰 출처의 상위 기준 |
| `data/glossary.json` | 어려운 말 풀이·용어 사전 (204개) |
| `schemas/catalog-*.json` | 대분류마다 출처 파일·`index.json` 스키마 |

## 2. 항목 하나의 모양 (`src/lib/catalog/types.ts`의 `CatalogItem`)

| 칸 | 뜻 |
|---|---|
| `id` | `<출처>:<slug>`, 소문자·숫자·점·하이픈. 주소에 그대로 쓴다. 바꾸지 않는다 |
| `name`, `kind`(소분류), `category`(대분류) | |
| `summary` | 출처 원문 그대로 (최대 300자) |
| `summaryKo`, `written` | 한국어 한 줄. 코드쇼퍼가 쓴 것이면 `written: 'codeshopper'` |
| `url`, `source{name,url}`, `license`(SPDX, 모르면 비움) | |
| `metrics{stars,downloads,likes,updatedAt}` | 출처가 준 값만. `downloads`의 뜻은 출처마다 다르다(30일 조회·한 달 내려받기·전체 내려받기·활용신청 수) → 파일의 `note` |
| `tags` | 출처의 분류·주제 |
| `preview{type,…}` | 미리 보기 재료: font·palette·icons·asset·style·site·repo·template·model·dataset·api·mcp·skill·prompt… |
| `use{install,snippet,docs}` | 출처가 준 설치 명령·설정 조각·문서 주소만 |
| `fetchedAt` | 받은 날 |

## 3. 다시 받기

- `npm run import`(전체) 또는 `import:design`·`import:ai`·`import:api`·`import:oss`(오픈소스·데이터셋·템플릿). 네트워크가 필요하고 처음에는 오래 걸린다(공식 MCP 등록소 약 60분, 공공데이터포털 약 15분). 요청 캐시는 저장소 밖.
- 같은 날 다시 돌리면 바이트가 같은 파일이 나온다. 다 받은 뒤 `npx vitest run tests/import`로 스키마·id·개수를 본다.
- GitHub 검색 API가 막힌 환경에서는 repos.ecosyste.ms와 awesome 목록으로 대신 받는다. `GITHUB_TOKEN`이 있으면 GitHub 주제 검색을 더한다.

## 4. 화면에 싣기

`scripts/catalog/build.ts`가 이 자료를 읽어 목록 묶음·상세 조각·검색 색인·Astro 요약을 만든다 (`docs/ARCHITECTURE.md` 4절). 빌드는 네트워크를 쓰지 않는다.
