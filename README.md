# 코드잇소 (codeitso)

**폰트·API·MCP·템플릿까지, 앱 만들 재료를 담아 내 AI에게 건넨다.**

https://codeitso.yoorrard.workers.dev

코드잇소는 바이브코딩 재료 쇼핑몰입니다. 앱을 만들 때 쓸 수 있는 공개 재료 14만여 개를 카테고리별로 진열해 두었습니다(폰트·색·아이콘·UI 컴포넌트·AI API·공공데이터·MCP 서버·에이전트 스킬·오픈소스·템플릿·데이터셋).
둘러보며 장바구니에 담고 쓸 곳을 메모한 뒤 **[프롬프트 뽑기]** 를 누르면, 담은 재료와 쓸 곳이 프롬프트 한 장으로 나옵니다. 그 프롬프트를 Claude Code·Cursor·ChatGPT 같은 내 AI에 붙여 넣으면 됩니다.

- **사이트는 AI를 부르지 않습니다.** 모든 화면은 미리 만든 정적 파일이고, 서버는 익명 방문 수만 셉니다.
- **회원가입·쿠키·광고·제휴 링크·추적이 없습니다.** 장바구니와 메모는 내 브라우저(localStorage)에만 남습니다.
- **상품 정보는 출처 자료 그대로입니다.** 설명·라이선스·인증 방식·무료 여부·인기 지표를 지어내지 않고, 출처에 없으면 비워 둡니다.
- **운영비는 0원입니다.** Cloudflare Workers 무료 요금제에서 돌고, 자료는 GitHub Actions가 매일 새로 받습니다.

## 할 수 있는 것

| 기능 | 내용 |
|---|---|
| 진열대 | 대분류 6개(디자인·AI 확장·API·오픈소스·데이터셋·템플릿)와 소분류마다 인기순·이름순·최근 갱신순, 자료에서 뽑은 거르기 |
| 검색 | 모든 재료에서 찾기. 한글로 써도 같은 뜻의 영어 이름까지 찾습니다 (`data/search-words.json`) |
| 상세 | 한국어 설명과 원문, 라이선스, 설치 명령, 종류별 미리 보기(폰트 견본, 색, 아이콘, README 그림), 비슷한 재료 비교 |
| AI 모델·요금 | GPT·Claude·Gemini 등 AI API의 모델별 가격·한도·기능 비교(`/models`), 담을 때 모델 고르기 |
| 스타터 키트 | 만들 앱(학교 정보 앱, 게임, 업무 자동화 등)에 맞춰 처음 담기 좋은 재료와 만드는 차례 |
| 장바구니 | 쓸 곳 메모, 프롬프트 뽑기·복사·.md 받기, 설치 명령 한꺼번에 복사, 공유 링크, 지난 프롬프트, 찜, 최근 본 재료 |
| 용어 사전 | 바이브코딩에 자주 나오는 말을 쉬운 한국어로 풀이 |

## 어떻게 돌아가나

```text
공개 출처(GitHub·Hugging Face·npm·공공데이터포털·각 등록소 …)
   │  scripts/import/   매일 GitHub Actions가 받기 (.github/workflows/daily-refresh.yml)
   ▼
data/catalog/**        출처 자료 그대로 (JSON, 스키마 검사)
   │  scripts/catalog/  진열대 빌드: 정렬·인기 점수·쪽 나누기·검색 조각 (src/lib/catalog/core.ts 순수 함수)
   ▼
public/catalog/ + Astro 정적 화면 (Preact 섬은 상태가 필요한 곳에만)
   ▼
Cloudflare Workers 정적 파일 + /api/event·/api/stats (D1, 익명 방문 수)
```

자세한 구조는 `docs/ARCHITECTURE.md`, 자료와 출처는 `docs/DATA.md`, 배포는 `docs/DEPLOY.md`에 있습니다.

## 직접 돌려 보기

준비물: [Node.js](https://nodejs.org/ko) 22.18 이상, Git.

```bash
git clone https://github.com/yoorrard/codeitso.git
cd codeitso
npm ci
npm run dev        # 진열대를 빌드한 뒤 개발 서버 (http://localhost:4321)
```

| 명령 | 하는 일 |
|---|---|
| `npm run check` | 토큰 대비·글꼴·품질 바닥선·쓰지 않는 말·타입 검사·단위 시험 |
| `npm run build` | 진열대 빌드 → Astro 빌드 → `dist/` |
| `npm run e2e` | Playwright 주요 흐름·접근성(axe) 시험 (먼저 `npm run build`) |
| `npm run refresh` | 모든 출처에서 자료를 다시 받기 (네트워크 필요) |
| `npm run qa:budget` | 성능 예산 (첫 화면 JS 100KB gzip 등) |

## 폴더

```text
data/        진열대 자료(catalog), 한국어 설명(catalog-ko), AI 모델(catalog-models), 용어·키트·검색 같은 뜻 묶음
scripts/     가져오기(import)·진열대 빌드(catalog)·한국어 설명(i18n)·검사(guard)·QA
src/         화면(pages·components), 진열대 계산(lib/catalog), 화면 문구(copy/ko.ts), 디자인 토큰(styles/tokens.css)
worker/      익명 방문 수 API (Cloudflare Workers + D1)
tests/       단위 시험(Vitest)·e2e(Playwright)
docs/        설계·결정 기록(DECISIONS.md)·진행 기록(TASKS.md)
.claude/     이 저장소를 만든 Claude Code 작업 규칙·스킬·훅
```

## 함께 만들기

틀린 상품 정보, 빠진 재료, 버그는 [이슈](https://github.com/yoorrard/codeitso/issues)로 알려 주세요. 상품의 사실은 출처 자료에서만 가져오므로, 정보를 고칠 때는 `data/catalog/**`를 손으로 고치지 않고 가져오기 스크립트(`scripts/import/`)를 고칩니다. 화면 문구는 `src/copy/ko.ts`, 색·크기는 `src/styles/tokens.css`의 변수만 씁니다. 커밋 전에 `npm run check`를 돌려 주세요.

권리 침해 신고는 사이트의 [저작권·게시 중단 요청](https://codeitso.yoorrard.workers.dev/legal/copyright) 안내를 따릅니다.

## 라이선스

- **코드와 문서:** [MIT](LICENSE).
- **운영자가 쓴 글**(화면 문구·한국어 설명·용어 풀이·스타터 키트·검색 같은 뜻 묶음): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ko). 출처 "코드잇소(codeitso)"를 밝혀 주세요.
- **진열대 자료**(`data/catalog/`, `data/catalog-models/`, `data/catalog-media/`): 각 출처의 조건을 따릅니다. 파일마다 `source.license`에 적혀 있고, 사이트의 [자료 출처](https://codeitso.yoorrard.workers.dev/about/credits)에서도 볼 수 있습니다. 진열된 재료는 모두 자기 라이선스를 따릅니다.
- **이름 「코드잇소」·「codeitso」와 로고:** 허락하지 않습니다. 고쳐서 따로 공개할 때는 다른 이름과 로고를 써 주세요.
- **제3자 구성 요소**(글꼴·아이콘·가져온 스킬): `THIRD_PARTY_NOTICES.md`.

적용 범위 전체는 [`NOTICE.md`](NOTICE.md)에 있습니다.

운영자: 유영재 · yyj19962004@gmail.com

---

**codeitso** is a Korean "materials shop" for vibe coding: browse 140k+ public building blocks (fonts, colors, icons, UI kits, AI and public APIs, MCP servers, agent skills, open-source projects, templates, datasets), add them to a cart with notes, and turn the cart into one prompt for your own AI assistant. The site itself never calls an AI, has no accounts, cookies or tracking, and runs at zero cost on Cloudflare Workers with a daily GitHub Actions data refresh. Code is MIT; operator-written text is CC BY 4.0; catalog data follows each source's terms; the name and logo are not licensed.
