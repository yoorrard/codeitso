# v3 조사: 가입·설치·설정 안내 — 서비스 편 (docs/review/v3/services.md)

> 쓴 날 2026-10-14 · 역할: 조사·설계. 소유자 새 요청 (4) "AI 도구 설치부터 관련 플랫폼 회원가입과 각종 설정까지 바이브코딩 전 과정을 최신 버전 기준으로 구체적으로, 알맞은 자리에 기능으로", (5) "고르는 곳마다 직접 입력", (6) "공개 출시 완성도"에 답한다.
> 짝 문서: `docs/review/v3/aitools.md`(AI 코딩 도구 설치·규칙 파일). 이 문서는 **그 밖의 모든 준비**를 맡는다: 컴퓨터 준비(터미널·Node.js·Git·VS Code), GitHub, 화면 올리기(배포), 저장과 로그인(Supabase·Firebase), 데이터 키(공공데이터포털·나이스·카카오·네이버·OpenWeather 등).
> 이 문서는 조사와 제안이다. 코드·자료는 아직 바꾸지 않았다. 문서 순위(PRD > CONCEPT > …)는 그대로이고, 채택하는 결정은 작업을 시작할 때 `docs/DECISIONS.md`로 옮긴다. 자료 모델은 aitools.md 6절의 `data/guides.json`을 넓혀 쓴다(따로 만들지 않는다).

---

## 0. 한눈에: 결정 제안 열네 줄

1. **안내 모음은 하나다.** aitools.md가 제안한 `/guides`(AI 도구 안내)를 넓혀 이름을 **'준비 안내'**로 하고, 일곱 갈래로 나눈다: 컴퓨터 준비 · AI 도구 · GitHub · 화면 올리기 · 저장과 로그인 · 데이터 키 · 안전하게 공개하기 (10절).
2. **자료도 하나다.** `data/guides.json`에 `tools[]`(AI 도구) 옆에 `services[]`(서비스 카드)를 더하고, `guides[].task`에 `signup`·`key`·`connect-repo`·`env`·`domain`·`security`·`limits`를 더한다. 서비스 카드는 `productId`로 상품 카드(`data/products.json`)와 잇고, 상품의 `prep[]` 줄마다 `guideId`를 단다 (12절).
3. **명령과 메뉴 이름은 원문으로 읽은 것만 단계로 보인다.** 이번 조사에서 단계까지 낼 수 있는 것: Node.js·VS Code·GitHub 전부·Cloudflare Workers·Supabase·Vite/Astro 설정. 나머지(Vercel·Netlify·Firebase·공공데이터포털·나이스·카카오·네이버·OpenWeather·Git 설치 페이지)는 이 환경에서 공식 사이트가 막혀 **검색 요약**뿐이라, 사람이 화면을 한 번 확인할 때까지(H14·G03) "공식 안내 열기" 카드 + 무엇을 고르면 되는지 한두 줄로만 낸다. aitools.md 결정 8과 같은 원칙이다.
4. **'설계도 다음 할 일'은 새 단계가 아니다.** 4단계 '설계도 받기'의 **준비물**을 키운 것이다. 고른 도구·AI·OS에 맞춰 다섯 때로 묶는다: 오늘 신청해 둘 것 → 만들기 전에 → 만들면서 → 공개하기 전에 → 공개한 뒤. 엔진의 순수 함수 `nextSteps()`가 만들고, 진행 표시는 브라우저에만 저장한다(`cc:prep:v1`, 11절).
5. **'공개하기 전에' 묶음을 고른 도구마다 자동으로 넣는다.** 키 이름 앞머리(`VITE_`·`PUBLIC_`·`NEXT_PUBLIC_`), Supabase RLS, Firestore 보안 규칙, 지도 키의 사이트 제한, 저장소 공개 여부와 `.env`. 초심자가 가장 많이 다치는 곳이 여기다 (8절).
6. **소유자의 404 문제를 그대로 안내로 만든다.** GitHub 공식 문서: "시작 파일(`index.html`)은 고른 게시 위치의 **맨 위**에 있어야 한다." 저장소의 모든 파일이 폴더 하나 안에 들어가 있으면 Pages가 시작 파일을 못 찾아 404가 난다. 에러 카드 `pages-404-entry`와 '루트 폴더(Root directory)' 설정 안내(Vercel·Netlify·Cloudflare 모두 있다)로 만든다 (2절).
7. **"비공개 저장소니까 키를 올려도 된다"는 오해를 막는다.** 무료 요금제에서 저장소를 비공개로 바꾸면 Pages가 자동으로 내려가고, GitHub의 '푸시 보호(사용자)'는 **공개 저장소에서만** 기본으로 켜져 있다. 비공개 저장소에서는 키를 올려도 막아 주지 않는다 (4.6절).
8. **화면 올리기 기본 제안은 그대로 둔다.** 키가 없는 화면은 GitHub Pages(공개 저장소)나 Cloudflare Workers, 키를 숨겨야 하면 Cloudflare Workers(지금 엔진 규칙 그대로). Vercel·Netlify는 한도를 정직하게 보인다: Netlify 무료는 운영 배포 한 번에 15크레디트를 쓰므로, AI 에이전트가 자주 올리면 한 달 몫이 빨리 끝나고 **팀의 모든 사이트가 다음 달까지 멈춘다** (5절).
9. **카드가 필요한 곳에 '카드 필요' 꼬리표를 단다.** Firebase Blaze(Cloud Storage는 2026-02-03부터 Blaze가 있어야 쓴다), Google Maps, 네이버 클라우드(지도·파파고·API HUB), Heroku. 카카오는 비즈월렛에 카드를 넣으면 무료 한도를 넘을 때 **자동으로 요금이 나간다**는 것도 적는다 (8.3절).
10. **기다림이 있는 신청은 '오늘 신청해 둘 것' 맨 위에 둔다.** 공공데이터포털(자동승인이어도 바로 안 될 수 있고, 심의승인은 며칠), 도서관 정보나루(관리자 승인), 커리어넷(담당자 승인), 운영계정(심의). 상품의 `prep.lead`(`days` > `hours` > `instant`) 순서를 그대로 쓴다.
11. **바뀐 사실을 자료에 반영한다(C 작업):** 네이버 개발자센터 검색 API 신규 신청 종료와 NAVER API HUB 이관(2026-07-31, 검색 요약) · 카카오 앱 키 개편(2025-12-03, 메뉴가 [앱] > [플랫폼 키]로) · Firebase Studio 종료 예정(2027-03-22, 새 작업 공간은 2026-06-22에 막힘) · Supabase 키 이름(publishable·secret, 옛 anon·service_role은 2026년 말까지) · Node.js 26이 2026-10-28에 LTS가 됨 (13.1절).
12. **고르는 곳마다 '직접 입력'이 있다(요청 5).** 안내에 없는 서비스는 "다른 서비스(직접 입력)"로 받는다. 사이트는 AI를 부르지 않으므로, 대신 ① 공통 안내(가입 → 키 받기 → 키 숨기기 → 무료 한도 → 결제 알림) ② 설계도 9번 '알아볼 것'에 다섯 질문 ③ 내 AI에게 붙여 넣을 질문 한 줄을 준다 (10.6절).
13. **OS는 브라우저 값으로 미리 고르고 바꿀 수 있게 한다(aitools.md 9.2절과 같다).** 저장은 `cc:prefs:v1.os`. '다른 컴퓨터(직접 입력)'를 고르면 설치가 필요 없는 길(웹 업로드·웹 빌더)을 먼저 보인다.
14. **열지 못한 공식 사이트가 많다.** 이 환경에서 vercel.com, docs.netlify.com, firebase.google.com, supabase.com, developers.cloudflare.com, git-scm.com, code.visualstudio.com, docs.github.com, data.go.kr, open.neis.go.kr, developers.kakao.com, developers.naver.com, openweathermap.org가 모두 막혔다. 공식 문서 저장소(GitHub)와 공식 문서 검색 도구로 돌아가 읽은 것이 많지만, 한국 서비스 넷은 검색 요약뿐이다. 허용 목록 요청(H14)과 사람 실측(G03)을 올린다 (14절).

---

## 1. 어떻게 조사했나, 얼마나 믿을 수 있나

조사한 날은 모두 **2026-10-14**다. 표시는 aitools.md와 같다. 하나를 더했다.

| 표 | 뜻 | 믿음 |
|---|---|---|
| **[원문]** | 공식 페이지를 직접 읽었다 | 높음 |
| **[저장소]** | 공식 문서가 들어 있는 공식 GitHub 저장소의 원본 파일을 읽었다(`raw.githubusercontent.com`). 게시된 사이트보다 며칠 앞설 수 있다 | 높음 |
| **[문서 도구]** | 서비스가 직접 운영하는 문서 검색 도구(Supabase MCP `search_docs`)가 돌려준 공식 문서 본문을 읽었다 | 높음 |
| **[레지스트리]** | npm 레지스트리, nodejs.org 배포 목록을 직접 조회했다 | 높음(버전·파일 이름만) |
| **[검색 요약]** | 사이트가 막혀 검색 엔진 요약으로만 봤다. 공식 도메인 결과를 우선했지만 원문 대조가 필요하다 | 중간. `needsReview: true` |
| **[기억·미확인]** | 내가 알던 내용이고 이번에 확인하지 못했다 | 낮음. 화면에 쓰지 않는다 |

**직접 읽은 곳:** `nodejs.org`(다운로드·지난 판 페이지, `dist/index.json`, `dist/v24.21.0/`), `github.com/nodejs/Release`(`schedule.json`), `github.com/nodejs/nodejs.org`(다운로드 명령 조각), `github.com/github/docs`(Pages·2FA·저장소·파일 올리기·Desktop·CLI·공개 범위·Actions 요금·푸시 보호), `github.com/microsoft/vscode-docs`(설치·언어, `DateApproved: 10/7/2026`), `github.com/MicrosoftDocs/terminal`(`ms.date: 11/10/2025`), `github.com/MicrosoftDocs/PowerShell-Docs`(실행 정책, `ms.date: 08/31/2026`), `github.com/cloudflare/cloudflare-docs`(가입·Workers Builds·한도·비밀 값·도메인·Pages 한도·언어), `github.com/cli/cli`(설치), `github.com/git-for-windows/git/releases/latest`, `github.com/vitejs/vite`(`docs/guide/static-deploy.md`, `env-and-mode.md`), `github.com/withastro/docs`(GitHub Pages 배포·환경 변수), `github.com/firebase/firebase-tools`(README), `github.com/supabase/supabase`(지역·RLS·빠른 시작), Supabase 문서 도구(API 키·키 이전·요금·일시 정지·운영 확인 목록·API 보안), `github.com/pricing`, npm 레지스트리.

**막힘(검색 요약만):** vercel.com(Vercel MCP 문서 검색은 결과가 엉뚱해 거의 못 씀), docs.netlify.com, firebase.google.com, git-scm.com, support.apple.com, data.go.kr, open.neis.go.kr, developers.kakao.com·apis.map.kakao.com, developers.naver.com·api.ncloud-docs.com, openweathermap.org.

### 1.1 2026-10-14 버전 표

| 무엇 | 지금 판 | 근거 |
|---|---|---|
| Node.js LTS | **v24.21.0** (2026-09-07, 'Krypton', npm 11.19.0). v22.23.3(2026-09-23, 'Jod')도 LTS | [레지스트리] `nodejs.org/dist/index.json` |
| Node.js Current | v26.11.1 (2026-10-07, npm 11.20.0) | [레지스트리] |
| Node.js 일정 | v24: 2026-10-20부터 유지보수 LTS, 2028-04-30 끝 · **v26: 2026-10-28부터 LTS**, 2029-04-30 끝 · v22: 2027-04-30 끝 · v27부터 해마다 한 판 | [저장소] `nodejs/Release/schedule.json`, [원문] nodejs.org 지난 판 페이지 |
| Node.js 설치 파일 | `node-v24.21.0-x64.msi`, `node-v24.21.0-arm64.msi`, `node-v24.21.0.pkg` | [레지스트리] `nodejs.org/dist/v24.21.0/` |
| Git for Windows | 2.56.0.windows.2 (10월 5일), `Git-2.56.0.2-64-bit.exe`, `Git-2.56.0.2-arm64.exe` | [원문] GitHub 릴리스 페이지 |
| VS Code 문서 | DateApproved 10/7/2026. 매주 새 판, 자동 업데이트 | [저장소] vscode-docs |
| GitHub Desktop 지원 OS | Windows 10 64비트 이상, macOS 12.0 이상. 리눅스 없음 | [저장소] github/docs `data/variables/desktop.yml` |
| `firebase-tools` | 15.33.0 (Node `>=20 \|\| >=22 \|\| >=24`) | [레지스트리] |
| `firebase` (JS SDK) | 13.0.0 | [레지스트리] |
| `@supabase/supabase-js` | 2.117.3 | [레지스트리] |
| `wrangler` | 4.150.0 (Node `>=22.0.0`) | [레지스트리] |
| `vercel` CLI | 64.0.2 | [레지스트리] |
| `netlify-cli` | 27.12.1 | [레지스트리] |

**안내에 쓰는 법:** 판 번호를 문장에 박지 않는다. "LTS라고 적힌 것을 받으세요"라고 쓰고, 확인 단계의 기대 결과만 "`v24`나 `v26`으로 시작하면 돼요"처럼 쓴다. 2026-10-28 뒤에는 nodejs.org 첫 화면의 LTS가 26으로 바뀐다. `wrangler`가 Node 22 이상을 요구하므로 **22보다 낮으면 다시 설치**하라고 한다.

---

## 2. 소유자에게 바로 쓸모 있는 발견 (요청 1·3과 만나는 곳)

### 2.1 GitHub Pages가 404를 내는 까닭 [저장소]

GitHub 문서 'Troubleshooting 404 errors for GitHub Pages sites'와 'Creating a GitHub Pages site':

- Pages는 `index.html`(또는 `index.md`, `README.md`)을 **시작 파일**로 찾는다.
- 게시 위치를 '브랜치 + 폴더'로 고르면, 시작 파일은 **그 폴더의 맨 위**에 있어야 한다. 고를 수 있는 폴더는 **`/(root)`와 `/docs` 둘뿐**이다.
- GitHub Actions로 올리면, 올리는 결과물(artifact)의 맨 위에 시작 파일이 있어야 한다.
- 파일 이름은 대소문자를 가린다. `Index.html`, `index.HTML`은 안 된다.
- 변경이 사이트에 반영되기까지 **최대 10분**. 한 시간이 지나도 안 바뀌면 빌드 오류를 본다.
- 기본으로 Jekyll로 빌드한다. 다른 도구로 만든 결과를 브랜치에서 그대로 올리려면 게시 폴더 맨 위에 빈 파일 `.nojekyll`을 둔다. PHP·Ruby·Python 같은 서버 언어는 돌지 않는다.

그래서 저장소의 모든 파일이 `code-chauffeur/` 폴더 하나 안에 있으면 `/(root)`에도 `/docs`에도 시작 파일이 없어 404가 난다. 코드쇼퍼는 Astro라서 빌드가 필요하므로, Pages를 쓴다면 'GitHub Actions'를 게시 위치로 골라야 한다(Astro 공식 `withastro/action@v6`, [저장소] withastro/docs).

**Vite·Astro로 만든 이용자 앱에 같은 함정이 하나 더 있다:** 프로젝트 사이트 주소는 `https://<사용자>.github.io/<저장소>/`라서, Vite는 `base: '/<저장소>/'`, Astro는 `base: '/<저장소>'`를 설정해야 한다. 안 하면 화면은 비고 콘솔에 `/assets/...` 404가 쌓인다. 저장소 이름이 `<사용자>.github.io`이거나 내 도메인을 붙였으면 `'/'`다 [저장소: vite `static-deploy.md`, withastro/docs `deploy/github.mdx`].

### 2.2 비공개로 바꾸면 생기는 일 [저장소]

- Pages는 **GitHub Free(개인·조직)에서는 공개 저장소만**, GitHub Pro·Team·Enterprise Cloud·Enterprise Server에서는 공개·비공개 저장소 모두에서 쓸 수 있다 (`data/reusables/gated-features/pages.md`).
- GitHub Free에서 저장소를 비공개로 바꾸면 **이미 게시된 Pages 사이트가 자동으로 내려간다.** 내 도메인을 붙여 두었다면 비공개로 바꾸기 **전에** DNS 기록을 지우거나 고쳐야 도메인 가로채기를 막는다 ('Setting repository visibility').
- 비공개 저장소의 Pages 사이트도 인터넷에는 **공개**된다(유료 요금제). 저장소에 민감한 자료가 있으면 게시 전에 빼라고 문서가 경고한다.
- 공개 범위 바꾸기 메뉴: 저장소 **Settings** → 맨 아래 **Danger Zone** → **Change visibility**.
- GitHub Actions는 공개 저장소에서 무료. 비공개 저장소는 GitHub Free 월 **2,000분**, Pro 월 **3,000분**이 포함되고 넘으면 요금이 나간다 ('GitHub's plans', 'GitHub Actions billing').

이미 D72(Cloudflare Workers 무료 + 비공개 저장소)가 이 사실들과 맞는다. 이용자 안내에도 같은 내용을 쉬운 말로 넣는다(4.5절).

### 2.3 다른 배포 서비스의 '루트 폴더' 설정

저장소 안의 하위 폴더를 올려야 할 때 각 서비스가 주는 칸:

| 서비스 | 칸 이름 | 근거 |
|---|---|---|
| Cloudflare Workers Builds | **Root directory** (빌드 명령을 어디서 돌릴지) | [저장소] `workers/ci-cd/builds/configuration.mdx` |
| Vercel | **Root Directory** (가져오기 화면의 Edit, 나중엔 Build and Deployment 설정). 바꾸면 다음 배포부터 | [검색 요약] vercel.com/docs/monorepos, /docs/builds/configure-a-build |
| Netlify | **Base directory**(빌드 기준 폴더), **Publish directory**(다 만든 파일 폴더, Base 기준). 나중엔 Project configuration > Developer settings > Continuous deployment > Build settings 또는 `netlify.toml`의 `[build] base`·`publish` | [검색 요약] docs.netlify.com 빌드 설정 |
| GitHub Pages | 없음. `/(root)`·`/docs`만 고르거나 Actions로 원하는 폴더를 올린다 | [저장소] |

---

## 3. 컴퓨터 준비

### 3.1 터미널이 뭔지부터

- **한 줄 풀이(용어 `terminal`에 이미 있음):** 글자로 컴퓨터에 일을 시키는 창이다. AI 코딩 도구가 "이 명령을 실행해 주세요"라고 할 때 붙여 넣는 곳.
- **윈도우** [저장소: MicrosoftDocs/terminal]: Windows 터미널을 열면 기본 프로필이 **PowerShell**이다. 새 탭은 `Ctrl+Shift+T`, 명령 팔레트는 `Ctrl+Shift+P`. 모든 Windows 11과, 2023-05-23 업데이트(KB5026435)를 깐 Windows 10 22H2에서 Windows 터미널을 기본 터미널로 정할 수 있다(Windows 터미널의 설정 → **Startup**(시작) → **Default terminal application**). 줄 앞이 `PS C:\`면 PowerShell, `C:\`만 있으면 명령 프롬프트(CMD)다(aitools.md 3.10절, Claude Code 문서).
- **맥** [검색 요약: support.apple.com]: `Command(⌘)+스페이스`로 Spotlight를 열고 "터미널"(Terminal)을 쳐서 연다. 또는 Finder → 응용 프로그램 → 유틸리티 → 터미널.
- **크롬북** [저장소: github/docs 'Set up Git']: 2020년 이후 기기는 런처에서 'Linux'를 찾아 **켜기**를 누르면 Git이 든 리눅스 환경이 생긴다. 초심자에게는 무겁다 → '다른 컴퓨터'로 보고 웹 업로드·웹 빌더 길을 먼저 보인다.

### 3.2 Node.js 설치

| 단계 | 윈도우 | 맥 | 근거 |
|---|---|---|---|
| 1 받기 | nodejs.org 첫 화면에서 **LTS**를 고르고 설치 프로그램(`.msi`, 보통 `x64`, ARM 노트북은 `arm64`)을 받는다 | 같은 곳에서 `.pkg`를 받는다 | [레지스트리] 파일 이름 · [원문] 다운로드 페이지(이 환경에서 OS 판별이 안 돼 화면 글은 못 봄) |
| 2 설치 | 받은 파일을 열고 기본값 그대로 다음 → 설치 | 받은 파일을 열고 기본값 그대로 | [기억·미확인] 설치 화면 순서 → G03 실측 |
| 3 확인 | **터미널을 새로 열고** `node -v`, `npm -v` | 같음 | [저장소] nodejs.org 명령 조각 `node -v` |
| 다른 길 (익숙한 사람) | `winget install Schniz.fnm` → `fnm install 24` | `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh \| bash` → `nvm install 24`, 또는 `brew install node@24` | [저장소] nodejs.org `snippets/en/download/*.bash` |

- **함정 1 — 창을 새로 안 열었다:** 설치 전에 열어 둔 터미널은 새 PATH를 모른다. "인식되지 않는 명령" 에러 카드 `command-not-found`로 잇는다(이미 있음).
- **함정 2 — PowerShell 실행 정책:** Windows 클라이언트의 기본 실행 정책은 **Restricted**다 [저장소: PowerShell-Docs about_Execution_Policies]. 그래서 PowerShell에서 `npm`(실제로는 `npm.ps1`)이 막힐 수 있다. 공식 문서의 해결 명령: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`. 화면에 보이는 에러 문장("running scripts is disabled on this system")은 [기억·미확인] → 실측 뒤 에러 카드 `ps-execution-policy`(aitools.md 9.7절과 같은 카드, 하나로 합친다).
- **함정 3 — 판이 낮다:** 예전에 깐 Node 18·20이 남아 있으면 `wrangler`(Node 22 이상)가 안 된다. 확인 단계에서 22보다 낮으면 다시 설치하라고 한다.

### 3.3 Git 설치

| | 윈도우 | 맥 | 근거 |
|---|---|---|---|
| 쉬운 길 | Git for Windows 설치 프로그램 `Git-2.56.0.2-64-bit.exe`(ARM은 `-arm64.exe`). 설치 화면은 기본값 | 터미널에서 `xcode-select --install` (애플이 Git을 같이 준다. 판이 조금 늦다) | [원문] 릴리스 파일 이름 · [검색 요약] git-scm.com/install/mac |
| 명령 길 | `winget install --id Git.Git -e --source winget` | `brew install git` (Homebrew가 있으면) | [검색 요약] git-scm.com/install/windows, /mac |
| 확인 | 새 터미널에서 `git --version` | 같음 | [기억·미확인] 흔한 확인 명령 |
| 이름 정하기 | `git config --global user.name "내 이름"` — 실제 이름이 싫으면 아무 글이나 | 같음 | [저장소] github/docs 'Setting your username in Git' |

- Git for Windows에는 **Git Credential Manager**가 들어 있어, 처음 올릴 때 브라우저로 GitHub 로그인을 한 번 하면 기억한다. 옛 'Git Credential Manager for Windows'는 더는 GitHub에 OAuth로 붙지 못하니 최신 Git for Windows로 바꾸라고 문서가 말한다 [저장소: 'Caching your GitHub credentials in Git'].
- 맥에서 Git 설치 프로그램(바이너리 설치 파일)은 더 이상 갱신되지 않는다고 git-scm이 적어 두었다 [검색 요약] → 안내하지 않는다.
- **명령 없이 가는 길:** GitHub Desktop(4.3절)을 깔면 Git을 몰라도 올릴 수 있다. AI 코딩 에이전트를 쓰면 에이전트가 `git` 명령을 대신 친다. 그래서 '명령 길'은 접어 둔다.

### 3.4 VS Code 설치 [저장소: vscode-docs, DateApproved 10/7/2026]

- **윈도우:** **User setup**을 받는다(관리자 권한 필요 없음, `%LOCALAPPDATA%\Programs\Microsoft VS Code`에 설치, 업데이트가 가장 매끄럽다고 문서가 권함). `VSCodeUserSetup-{version}.exe`를 실행. 설치가 PATH에 VS Code를 넣으므로, 터미널을 다시 열고 폴더에서 `code .`를 치면 열린다. 관리자 권한으로 VS Code를 실행하면 User setup의 업데이트가 꺼진다.
- **맥:** `.dmg`를 열어 VS Code를 **응용 프로그램** 폴더로 끌어 놓는다. 애플 실리콘·인텔 둘 다 되는 Universal 판이 있다. `code` 명령을 쓰려면 VS Code에서 `Cmd+Shift+P` → **Shell Command: Install 'code' command in PATH** → 터미널을 다시 연다.
- **한국어 화면:** OS 언어가 한국어면 VS Code가 한국어 언어 팩을 권한다. 아니면 명령 팔레트에서 **Configure Display Language** → 한국어 → 다시 시작 (`docs/configure/locales.md`).
- VS Code는 매주 새 판이 나오고 자동으로 업데이트한다. 그래서 안내에 판 번호를 쓰지 않는다.

### 3.5 '컴퓨터 준비' 묶음이 필요한 사람

| 고른 AI 종류(aitools.md 9.2절) | Node.js | Git | VS Code | 터미널 |
|---|---|---|---|---|
| AI 채팅(웹) + HTML 한 장 + GitHub Pages | 필요 없음 | 필요 없음(웹 업로드) | 선택 | 필요 없음 |
| 웹에서 만드는 도구(Lovable·Bolt 등) | 필요 없음 | 필요 없음 | 필요 없음 | 필요 없음 |
| 편집기 안 AI(Copilot·Cursor 등) | React+Vite·Workers·Firebase CLI를 고르면 필요 | 필요 | 그 편집기 | 필요 |
| 터미널 에이전트(Claude Code·Codex·Gemini CLI) | 필요(도구에 따라 설치에도) | 필요 | 선택 | 필요 |

엔진은 고른 도구의 `needs`(12절)를 모아 이 표를 계산한다. 필요 없는 안내는 '다음 할 일'에 넣지 않는다.

---

## 4. GitHub

GitHub 화면은 **영어**다. 메뉴 이름은 영어 그대로 굵게 쓰고, 처음 나올 때 괄호로 뜻을 붙인다. 모두 [저장소: github/docs].

### 4.1 가입

1. https://github.com/ 에서 안내를 따라 가입한다. 강하고 다른 곳에 쓰지 않는 비밀번호.
2. **GitHub Free**와 **GitHub Pro** 중 고른다. 처음에는 Free. 나중에 언제든 올릴 수 있다.
3. 받은 메일로 **이메일 주소를 확인**한다(확인해야 기능을 다 쓴다).
4. 이중 인증(2FA)을 켠다(4.2절). 그다음 패스키를 더하면 비밀번호 없이 로그인할 수 있다.

- 요금 페이지에서 보이는 것: Free **$0**, Team **사용자당 월 $4(첫 12개월)**, Enterprise **사용자당 월 $21(첫 12개월)부터** [원문: github.com/pricing]. Pro 값은 그 페이지에 없었다 → 안내에 쓰지 않는다.
- 나이 조건(만 13세 이상 등)은 [기억·미확인]. 학생 대상 안내라 사람 확인이 필요하다(G04).

### 4.2 이중 인증(2FA)

1. 오른쪽 위 프로필 사진 → **Settings** → 왼쪽 'Access' 묶음의 **Password and authentication**.
2. 인증 앱(TOTP 앱)을 휴대폰이나 컴퓨터에 깐다. GitHub은 특정 앱을 정하지 않는다. 클라우드 백업이 되는 앱을 권한다.
3. 'Scan the QR code'에서 QR을 찍는다(못 찍으면 **setup key**를 눌러 나온 글자를 손으로 넣는다). 앱이 보여 주는 여섯 자리를 'Verify the code from the app' 칸에 넣는다.
4. **복구 코드(recovery codes)를 내려받아** 안전한 곳에 둔다. 휴대폰을 잃었을 때 유일한 길이다.
5. 켜고 나면 **28일 확인 기간**이 있다. 그 안에 한 번 2FA로 로그인하면 끝난다.

- 문서는 문자(SMS)보다 TOTP 앱을 강하게 권한다. 나라에 따라 SMS 목록에 없을 수 있다.
- 코드를 올리는 사람(릴리스·패키지·Actions 공개 등)은 GitHub이 2FA를 **의무**로 고른다. 메일을 받은 날부터 45일 + 유예 7일 안에 안 켜면 GitHub에 들어갈 수 없다 ('About mandatory two-factor authentication').
- Supabase를 GitHub으로 가입했다면 GitHub 계정이 곧 Supabase 관리자 권한이라, Supabase도 GitHub 2FA를 권한다 [문서 도구: Supabase Production Checklist].

### 4.3 저장소 만들고 파일 올리기 — 세 가지 길

| 길 | 누구에게 | 단계 | 한도·함정 |
|---|---|---|---|
| **A. 웹에서 올리기** (설치 없음) | AI 채팅으로 HTML 한 장을 만든 사람 | 오른쪽 위 **+** → **New repository** → 이름(예: `class-quiz`) → 공개 범위(**Public**: Free에서 Pages를 쓰려면) → **Add a README file** 켜기 → **Create repository**. 그다음 파일 목록 위 **Add file** → **Upload files** → 파일·폴더를 끌어다 놓기 → 아래 칸에 무엇을 바꿨는지 한 줄 → **Commit changes** | 브라우저로는 파일 하나 **25 MiB**까지, 한 번에 **100개**까지. 50 MiB 넘으면 경고, **100 MiB 넘으면 막힘**. 웹 업로드는 `.gitattributes`를 무시한다. **폴더째 끌어 놓으면 그 폴더가 한 겹 더 생긴다** → 2.1절의 404. "폴더 안의 파일들을 끌어 놓으세요"라고 쓴다 |
| **B. GitHub Desktop** (명령 없음) | 편집기·웹 빌더에서 폴더를 받은 사람 | desktop.github.com에서 받기 → 윈도우는 설치 파일 실행, 맥은 zip을 풀고 앱 실행 → 로그인: 윈도우 **File** → **Options** → **Accounts**, 맥 **GitHub Desktop** → **Settings** → **Accounts** → **Sign in** → **Continue With Browser** → 브라우저에서 로그인 | Windows 10 64비트·macOS 12 이상. 리눅스 없음. 메뉴 'Accounts'의 정확한 이름은 reusable 일부만 봄 → G03 |
| **C. 명령(GitHub CLI)** | 터미널 에이전트를 쓰는 사람(보통 에이전트가 대신 친다) | 설치: 윈도우 `winget install --id GitHub.cli --source winget`, 맥 `brew install gh` → `gh auth login` → 저장소 만들기 `gh repo create 이름 --private --clone` (공개는 `--public`) | 에이전트에게 "올리기 전에 무엇을 올리는지 보여 줘"를 규칙 파일에 넣는다(aitools.md 7.3절 안전 줄) |

### 4.4 Pages 기초 (공개 저장소, Free)

1. 저장소 **Settings** → 왼쪽 'Code, planning, and automation' 묶음의 **Pages**.
2. 'Build and deployment' → **Source**:
   - HTML 한 장·빌드 없는 사이트: **Deploy from a branch** → 브랜치 `main` → 폴더 **/(root)** → **Save**.
   - React+Vite·Astro처럼 빌드가 필요한 사이트: **GitHub Actions** → GitHub이 권하는 작업 흐름(workflow) 고르기. Vite는 `.github/workflows/deploy.yml`, Astro는 `withastro/action@v6`.
3. 몇 분 뒤 같은 화면 위쪽 **Visit site**로 확인한다. 반영은 최대 10분.
4. 주소: 사용자 사이트 `https://<사용자>.github.io`(저장소 이름이 `<사용자>.github.io`일 때, 대문자는 소문자로), 프로젝트 사이트 `https://<사용자>.github.io/<저장소>/`.

**한도** ('GitHub Pages limits'): 저장소 권장 1 GB, 게시된 사이트 최대 1 GB, 월 전송량 100 GB(소프트), 빌드 시간당 10번(소프트, Actions 작업 흐름은 제외), 배포는 10분 넘으면 실패. **온라인 사업·상업 SaaS용 무료 호스팅이 아니다.** 직접 짠 코드로 기존 사이트를 따라 만드는 연습은 되지만, 이용자 자료를 모으지 않고 '관계없음' 안내를 크게 달아야 한다.

**키가 있는 앱은 Pages에 올리지 않는다.** Pages는 정적 파일만 내보내므로 화면 코드에 넣은 키는 누구나 본다. 이건 엔진의 `conflict.key-on-public-host`가 이미 잡는다.

### 4.5 비공개 저장소와 안내 문장

- 무료 요금제에서 비공개 저장소 + Pages는 안 된다. 이용자가 '비공개로 하고 싶어요'를 고르면 엔진이 Pages 대신 Cloudflare Workers(비공개 저장소도 연결 가능, D72에서 확인)나 Vercel·Netlify를 보인다. → 13.2절 새 규칙 `conflict.pages-private-free`.
- 화면 문장 초안(ko.ts로 갈 것): "무료 GitHub에서는 공개 저장소만 Pages로 올릴 수 있어요. 비공개로 두려면 다른 곳에 올려요."

### 4.6 푸시 보호와 비밀 값

- **사용자 푸시 보호**는 GitHub.com 계정마다 **기본으로 켜져 있고**, **공개 저장소**에 비밀 값을 올리는 것을 막는다. 계정 설정에서 끌 수 있다. **저장소 푸시 보호**는 기본으로 꺼져 있고 관리자가 켠다 [저장소: `concepts/secret-security/push-protection.md`].
- 웹으로 올릴 때도 지원하는 비밀 값(토큰 등)이 든 파일은 막힌다 ('Adding a file to a repository').
- 명령으로 올리다 막히면 `remote:` 줄에 비밀 값 종류와 `commit:`·`path:` 위치가 나온다. 그 비밀 값을 **모든 커밋에서** 지워야 다시 올라간다 [저장소: `push-protection-on-the-command-line.md`] → 에러 카드 `git-push-secret-blocked`.
- 그러니 **비공개 저장소는 이 보호가 기본으로 없다.** 안내 문장: "비공개 저장소도 키를 올리면 안 돼요. 키는 `.env`에만 두고 `.gitignore`에 넣어요."

---

## 5. 화면 올리기(배포)

### 5.1 한눈에 비교 (무료로 시작할 때)

| | GitHub Pages | Cloudflare Workers (정적 파일) | Vercel Hobby | Netlify Free | Firebase Hosting (Spark) |
|---|---|---|---|---|---|
| 카드 | 필요 없음 | 필요 없음 | 필요 없음 | 필요 없음 | 필요 없음 |
| 비공개 저장소 | Free는 안 됨 [저장소] | 됨 (D72) | 개인 계정 저장소는 됨, **GitHub 조직의 비공개 저장소는 안 됨** [검색 요약] | 됨 [기억·미확인] | 저장소 연결 없이 CLI로 올림 |
| 상업 이용 | 온라인 사업 용도 아님 [저장소] | `workers.dev`는 개인·취미용 권장 [저장소] | **개인·비상업만** [검색 요약] | 확인 못 함 | 확인 못 함 |
| 무료 한도의 모양 | 월 전송 100 GB(소프트), 1 GB | **정적 파일 요청 무료·무제한**, Worker 함수는 하루 10만 요청(UTC 자정 초기화, 넘으면 Error 1027), 파일 20,000개·한 파일 25 MiB, 빌드 월 3,000분 [저장소] | 한 달 빠른 데이터 전송 100 GB, 함수 100만 번, 하루 배포 100번, 동시 빌드 1, 빌드 45분 [검색 요약] | 월 300크레디트(여러 곳) 또는 30(포럼) — **엇갈림**. 운영 배포 1번 15크레디트, 전송 1 GB 20크레디트(2026-04-14 바뀜, 제3자), 미리 보기 배포는 무료 [검색 요약] | 저장 10 GB, 하루 전송 360 MB (products.json, needsReview) |
| 넘으면 | 소프트 한도(연락 옴) | Worker 함수만 1027 에러, 정적 파일은 계속 | **프로젝트 일시 정지**, 청구는 안 함 [검색 요약] | **팀의 모든 사이트 정지**("Site not available"), 다음 달까지 또는 유료로 [검색 요약] | 그 기능이 멈춤 (products.json) |
| 키 숨기기 | 못 함 | Worker 비밀 값 | 함수 + 환경 변수 | 함수 + 환경 변수 | Functions는 Blaze 필요 [기억·미확인] |
| 화면 언어 | 영어 | **한국어 고를 수 있음** (Profile → Settings → Language) [저장소 + 검색 요약: 한국어 지원은 Cloudflare 블로그] | 영어 | 영어 | 한국어 있음 [기억·미확인] |

**AI 에이전트 이용자에게 중요한 한 줄:** 에이전트는 고칠 때마다 올리기 쉽다. Netlify 무료는 운영 배포가 한 번에 15크레디트라, 300크레디트면 전송량이 0이어도 **한 달 20번**이다(30이면 2번). 미리 보기 배포(다른 브랜치)는 무료다. 안내 문장: "Netlify 무료에서는 `main`에 자주 올리지 말고, 다 고친 뒤 한 번에 올려요." 크레디트 수는 엇갈려서 화면에는 "공식 요금 페이지에서 확인" 링크와 함께만 쓴다.

### 5.2 Cloudflare Workers — 단계까지 낼 수 있다 [저장소: cloudflare-docs]

1. **가입:** https://dash.cloudflare.com/sign-up → **Email**, **Password** → **Create Account** → 받은 메일로 주소 확인.
2. **한국어로 바꾸기(선택):** 대시보드 → **Profile** → **Settings** → **Language**.
3. **저장소 잇기:** **Workers & Pages** → **Create application** → **Import a repository** 옆 **Get started** → **Git account**(GitHub 연결, Cloudflare GitHub 앱 허락) → 저장소 고르기 → 설정 → **Save and Deploy** → `workers.dev` 주소로 확인.
   - 저장소에 Wrangler 설정 파일이 없으면 자동 설정이 프레임워크를 찾아 **설정을 더하는 끌어오기 요청(PR)**을 만들고 미리 보기를 띄운다. 합치면 준비 끝.
   - **Worker 이름은 Wrangler 설정의 `name`과 같아야** 한다. 다르면 빌드가 실패한다.
   - 빌드 설정 칸: Build command(예: `npm run build`), Deploy command(기본 `npx wrangler deploy`), **Root directory**.
4. **주소:** `<Worker 이름>.<내 하위 도메인>.workers.dev`. 하위 도메인은 Workers & Pages에서 **Your subdomain** 옆 **Change**로 바꾼다.
5. **비밀 값(키 숨기기):** Worker → **Settings** → **Variables and Secrets** → **Add** → 종류 **Secret**, 이름과 값 → **Deploy**. 또는 터미널 `npx wrangler secret put <KEY>`.
6. **내 도메인:** 도메인이 Cloudflare에 **활성 영역(zone)**으로 있어야 한다. Worker → **Settings** → **Domains & Routes** → **Add** → **Custom Domain**. 이미 CNAME 기록이 있는 이름에는 못 만든다.
7. **새 프로젝트는 Pages 말고 Workers로:** Pages 문서 맨 위에 "Workers가 Pages의 대부분을 하고 기능이 더 넓다. 새 프로젝트는 Workers로 시작하라"는 안내가 있다. Pages 무료 한도(참고): 빌드 월 500번, 동시 1, 20분, 파일 20,000개, 한 파일 25 MiB, 내 도메인 100개.
8. 유료 Workers Paid는 계정당 **월 최소 $5**.

### 5.3 Vercel — 링크 카드 + 무엇을 고를지 [검색 요약]

- 가입: 이메일(여섯 자리 일회용 비밀번호) 또는 GitHub·GitLab·Bitbucket. GitHub으로 가입하면 그 연결이 기본 로그인이 된다.
- 가져오기: 대시보드 **Add New…** → **Project** → 'Import Git Repository'에서 저장소 옆 **Import** → 프레임워크 자동 인식, 필요하면 **Root Directory** 옆 **Edit** → **Deploy**. 이후 커밋마다 자동 배포.
- 환경 변수: 프로젝트 **Settings** → **Environment Variables** → 키·값 → Production·Preview·Development 중 고르기. **바꾼 값은 새 배포부터** 적용된다 → **Redeploy**를 눌러야 한다. 미리 보기 배포는 Preview를 고른 값만 읽는다.
- 내 도메인: **Settings** → **Domains** → 도메인 넣고 **Add**. 최상위 도메인은 A 기록(문서상 많은 프로젝트가 `76.76.21.21`이지만 **도메인 카드에 보이는 값이 정답**), 하위 도메인은 카드에 보이는 CNAME 대상. 예전 호스트의 A·AAAA 기록을 먼저 지운다.
- Hobby: 개인·비상업. GitHub **조직**의 비공개 저장소는 Hobby에 못 올린다(2025-09 막힘이 고쳐짐, 커뮤니티 직원 답). 넘으면 일시 정지. Hobby의 되돌리기는 바로 앞 운영 배포로만 [Vercel 문서 도구: `vercel rollback`].
- products.json의 `vercel`과 같다. 다른 점 없음.

### 5.4 Netlify — 링크 카드 [검색 요약]

- 가져오기: 팀의 **Projects** 화면 → **Add new project** → **Import an existing project** → Git 제공자(GitHub·GitLab·Bitbucket·Azure DevOps) → 저장소 → Build command·Publish directory는 자동 채움, 하위 폴더면 Base directory(·Package directory) → **Deploy**.
- 환경 변수: 바꾸면 **빌드와 배포를 다시** 해야 적용. `netlify.toml`에 쓴 값이 화면 값보다 앞선다. 범위(Builds·Functions 등) 나누기는 Pro 이상.
- 내 도메인: 사이트 → **Domain management** → **Add domain** → **Add a domain you already own**. DNS 반영은 최대 48시간.
- 끌어다 놓아 올린 사이트(Netlify Drop)는 가입 전에는 잠깐만 열린다(products.json).
- **크레디트 수가 공식 문서로 확인되지 않았다**(300 vs 30). C 작업에서 사람 확인(G03).

### 5.5 Firebase Hosting — 링크 카드 + CLI 명령은 [저장소]

- CLI: `npm install -g firebase-tools` → `firebase login` → (프로젝트 폴더에서) `firebase init hosting` [기억·미확인: `init hosting` 하위 명령 이름] → `firebase deploy`. 원격 컴퓨터에서는 `firebase login --no-localhost` [저장소: firebase-tools README].
- 주소는 `프로젝트ID.web.app` (products.json).
- **Firebase Studio는 2027-03-22에 닫힌다**(2026-03-19 발표, 새 작업 공간은 2026-06-22부터 막힘, 다른 Firebase 서비스는 그대로) [검색 요약: 위키백과·보도]. products.json `firebase-hosting`의 링크 `firebase.google.com/docs/studio/deploy-app`은 빼야 한다(13.1절).

---

## 6. 저장과 로그인

### 6.1 Supabase — 단계까지 낼 수 있다 [문서 도구 + 저장소]

1. **가입:** supabase.com/dashboard (GitHub 계정으로도 가능, products.json). GitHub으로 가입했으면 GitHub 2FA부터(4.2절).
2. **프로젝트 만들기:** 대시보드에서 새 프로젝트 → 조직 고르기 → 프로젝트 이름 → **데이터베이스 비밀번호**(강하게, 따로 적어 둔다) → **지역(Region)** [검색 요약: 칸 이름]. 지역은 '일반 지역'(그 권역 안 아무 곳)과 '특정 지역' 중 고른다. 한국은 특정 지역 **Northeast Asia (Seoul)**, `ap-northeast-2` [저장소: `packages/shared-data/regions.ts`]. 개인정보를 다루면 특정 지역을 고르라고 한다(일반 지역은 정확한 나라가 정해지지 않는다는 문서 경고).
3. **키 찾기:** 프로젝트의 **Connect** 창, 또는 **Settings** → **API Keys**.
   - **Publishable key** `sb_publishable_...` — 권한 낮음, 화면·앱·공개 코드에 넣어도 됨.
   - **Secret key** `sb_secret_...` — **모든 자료를 RLS를 건너뛰고** 읽고 쓴다. 서버·Edge Functions에만. 브라우저에서 쓰면 401로 거절된다(User-Agent로 판별).
   - 옛 이름 `anon`(= publishable), `service_role`(= secret)은 **2026년 말까지** 동작한다. 옛 예제가 많아 헷갈리니 두 이름을 함께 적는다.
4. **RLS(행 단위 보안):** 대시보드에서 만든 표는 RLS가 **기본으로 켜진다**. **SQL Editor나 다른 길로 만든 표는 꺼진 채**일 수 있어 `alter table 표이름 enable row level security;`를 해야 한다. RLS가 꺼진 표는 publishable 키만으로 누구나 읽고 고친다. Supabase는 새 표에 자동으로 주던 권한(grant)도 거두는 쪽으로 바꾸는 중이라, 권한이 없으면 `42501` "permission denied for table" 에러와 함께 넣어야 할 `GRANT` 문장을 힌트로 준다.
   - **AI 에이전트가 SQL로 표를 만드는 일이 흔하므로** 이것이 바이브코딩 이용자에게 가장 큰 함정이다. 설계도 11번 안전 지시와 '공개하기 전에' 묶음에 넣는다.
5. **무료 플랜** [문서 도구: 'About billing on Supabase', 'Project Pausing']: 무료 프로젝트 **2개**(일시 정지된 것은 안 셈), 데이터베이스 프로젝트당 500 MB, 전송 5 GB, 월 활성 사용자 50,000, 저장 1 GB, Edge Function 50만 번. 일주일 동안 활동이 적으면 **일시 정지**: 약 일주일 전에 경고 메일, 정지되면 확인 메일, **90일 안에** 대시보드에서 **Resume project**로 되살린다. 무료 프로젝트의 백업은 내려받을 수 없다.
6. **결제:** 카드만, 달러로, 결제처가 싱가포르로 보일 수 있다 [문서 도구: Billing FAQ]. 무료 한도를 계속 넘으면 프로젝트 정지·읽기 전용·402 응답 같은 제한이 걸린다.
7. **공개 전 확인** [문서 도구: Production Checklist]: 모든 표에 RLS, **Security Advisor** 확인, 계정 MFA, 이메일 확인 켜기, 내장 메일은 보낼 수 있는 양이 작으니 사람이 많아지면 직접 SMTP.

### 6.2 Firebase — 링크 카드 + 무엇을 고를지 [검색 요약]

1. **프로젝트 만들기와 웹 앱 등록:** 콘솔에서 프로젝트를 만들고 앱을 등록하면 설정 객체를 준다: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`(`measurementId`는 선택). 운영용은 CDN보다 `npm install firebase`를 권한다.
2. **요금제:** **Spark**(카드 없음)와 **Blaze**(쓴 만큼, 카드). **Cloud Storage for Firebase는 Blaze가 있어야 한다.** 2026-02-03부터 적용되어 Spark 프로젝트는 기본 버킷에도 접근이 끊기고 402·403을 받는다. Blaze에서도 무료 사용량은 있다.
3. **Firestore 데이터베이스 만들기:** 데이터베이스 ID → **위치**(한 번 정하면 **바꿀 수 없다**, 서울은 `asia-northeast3`) → 시작 규칙:
   - **프로덕션 모드**: 앱·웹에서 오는 읽기·쓰기를 모두 막는다(서버는 됨).
   - **테스트 모드**: 누구나 읽고 덮어쓴다. 정해진 날짜까지만 열리는 규칙이 들어가고, 날짜가 지나면 모든 요청이 거절된다(제3자 자료는 '30일'). 
   - 안내: **테스트 모드로 시작했으면 공개하기 전에 규칙을 `request.auth != null` 같은 조건으로 바꾼다.**
4. **API 키:** Firebase 키는 프로젝트를 알리는 값이지 비밀이 아니다. 자료는 **보안 규칙**과 **App Check**가 지킨다. Firebase가 만든 키는 Firebase API로만 제한되어 있다. 지도·Gemini 같은 다른 API는 **따로 만든 키**에 그 API만 허락해서 쓴다. Firebase AI Logic은 2026-11-02부터 App Check가 필요하다. 옛 FCM 서버 키는 비밀이다.
5. **로그인(Authentication):** 콘솔 Authentication → 로그인 방법에서 방식을 켜고, 배포한 주소를 **승인된 도메인**에 넣는다. 2025-04-28 뒤에 만든 프로젝트는 `localhost`도 직접 넣는다(products.json `firebase-auth`, needsReview).
6. **학교 계정 주의:** 학교 구글 워크스페이스 계정은 관리자가 외부 서비스를 막을 수 있어 개인 계정을 권한다(products.json `google-sheets-apps-script` prep와 같은 말).

---

## 7. 데이터 키

### 7.1 공공데이터포털 (data.go.kr) — 링크 카드 [검색 요약]

| 단계 | 내용 |
|---|---|
| 가입 | 공공데이터포털 회원가입 |
| 활용신청 | API 상세 페이지에서 **활용신청**. 활용 목적을 적는다 |
| 승인 | API마다 다르다. "개발단계 자동승인 / 운영단계 심의승인"이 흔하고, 둘 다 자동승인인 API도 있다. 상세 페이지의 '심의유형'을 본다 |
| 키 찾기 | **마이페이지** → 데이터 활용(출처마다 '데이터 활용 내역') → **Open API** → **활용신청 현황**(또는 '인증키 발급 현황') → 상세의 **일반 인증키**. 메뉴 이름이 출처마다 조금씩 다르다 → G03 |
| 키 두 개 | **Encoding**과 **Decoding** — 같은 키를 다른 꼴로 보인 것. 코드가 주소에 붙일 때 인코딩하면 Decoding 키를 쓴다(products.json `kma-forecast` stuck과 같은 말) |
| 기다림 | 자동승인이어도 키가 서버에 반영되기까지 시간이 걸려 바로 부르면 에러가 날 수 있다. 블로그 안내는 '1~2시간 뒤 다시', 다른 안내는 '20~30분 뒤 마이페이지에서 확인'. **공식 수치는 못 찾았다** → 화면에는 "몇 시간 걸릴 수 있어요" |
| 한도 | 개발계정 트래픽은 API마다 다르다(예: 1,000건). 운영계정으로 늘리려면 활용사례를 등록하고 신청(심의가 있을 수 있다) |
| 에러 코드 | `20 SERVICE_ACCESS_DENIED_ERROR`(활용신청·승인·일시중지 확인) · `30 SERVICE_KEY_IS_NOT_REGISTERED_ERROR`(키가 맞는지, 신청이 끝났는지) · `31 DEADLINE_HAS_EXPIRED_ERROR`(**키의 사용 기한이 끝남**) |

- **함정:** 키를 화면 코드에 넣지 말고 서버(Cloudflare Worker 비밀 값)에 둔다. 엔진의 `safety.proxy-key`가 이미 지시한다.
- **'공개한 뒤' 묶음에 넣을 것:** 31번 에러 = 기한 만료 → 포털에서 연장 신청. 기한 길이는 확인 못 함 → '마이페이지에서 활용기간을 확인해요'만.

### 7.2 나이스 교육정보 개방 포털 (open.neis.go.kr) — 링크 카드 [검색 요약]

- 신청: **활용가이드** → **인증키 신청**. 로그인이 필요하다. 개발자 가이드는 "따로 가입하지 않고 구글·네이버·다음 계정으로 로그인"이라 하고, 이용약관은 "회원에게만"이라 해서 **엇갈린다** → G03.
- 발급: 신청하면 **바로** 나오고 마이페이지의 발급 내역에서 본다.
- 키 없이 부르면 **샘플 5건**만 나온다(용어 `sample-key`가 이미 있음).
- 약관: 키는 받은 본인만 쓰고 남과 나누지 않는다. 이용기간이 정해질 수 있고, 지나친 호출은 정지될 수 있다.
- 비용 무료. 하루 호출 한도는 공식 수치를 못 찾았다.
- 학교 코드부터: 학교기본정보 API로 시도교육청코드·학교 코드를 먼저 찾는다(products.json `neis-meal` stuck과 같다).

### 7.3 카카오 개발자 (developers.kakao.com) — 링크 카드 [검색 요약: 공식 문서 요약 + 데브톡]

1. 카카오계정으로 로그인 → **개발자 등록**(카카오 API는 모두 개발자 계정이 필요) → **앱 만들기**. 실서비스 앱은 하나만, 같은 서비스를 여러 앱에 나눠 등록하지 않는다(1앱 1서비스).
2. **2025-12-03 '앱 및 앱 키 개편'** 이후 위치:
   - REST API·JavaScript·네이티브 앱 키: **[앱] > [플랫폼 키]**, 어드민 키: **[앱] > [어드민 키]**. 종류마다 키를 5개까지 만들고 대표 키를 정한다. (FAQ 문서에는 [앱] > [일반] > [플랫폼 키]로 적힌 곳도 있어 엇갈림.)
   - 사이트 주소 등록이 키마다 따로다: **[앱] > [플랫폼 키] > [JavaScript 키] > JavaScript SDK 도메인**(옛 '사이트 도메인'). `localhost`도 따로 넣는다.
3. **카카오맵 사용 설정:** **[제품 설정] > [카카오맵]**에서 **사용 설정 ON**. 새 앱은 직접 켜야 한다. 안 켜면 `App disabled OPEN_MAP_AND_LOCAL service` 같은 에러.
4. **무료 한도:** 계정에서 **처음으로 카카오맵을 켠 앱에만** 무료 쿼터가 붙는다. 하루 쿼터는 **매일 0시**에 다시 찬다. `new kakao.maps.Map()`을 만들 때 한 번 센다(끌기·확대는 안 셈). 사용량은 앱 > 통계 > 기간별 사용량.
5. **결제 함정:** 결제 수단이 없으면 쿼터를 다 쓰는 순간 **막힌다.** 비즈월렛에 카드나 충전금이 있으면 넘는 만큼 **자동으로 요금이 나간다.** 하루 쿼터 숫자(30만 건 등)는 공식 확인 못 함.
6. JavaScript 키는 화면에 들어가는 공개 키다. 대신 도메인 등록이 지킨다(products.json `kakao-maps`의 `publicKey: true`와 같다). REST API 키·어드민 키는 화면에 넣지 않는다.

→ products.json `kakao-maps`의 stuck "카카오 개발자 사이트에 내 사이트 주소(도메인)를 등록해야 지도가 떠요"는 맞지만 메뉴 이름을 새 위치로 고치고, '카카오맵 사용 설정 ON'과 '첫 앱에만 무료' 두 줄을 더한다(13.1절).

### 7.4 네이버 — 개발자센터와 네이버 클라우드 [검색 요약]

- **검색 API:** 네이버 개발자센터의 검색 API는 **2026-07-31에 새 신청이 끝났고**(다른 기사는 7월 30일), 블로그·뉴스·카페 같은 일반 검색과 검색어 트렌드·쇼핑인사이트는 네이버 클라우드의 **NAVER API HUB**로 옮겨 **쓴 만큼 요금**이 된다. 기존 이용자는 **2027-06-30까지** 옛 방식을 쓸 수 있다. 쇼핑·책·전문자료 검색은 2026-07-31에 끝났고 대체가 없다. 검색 결과를 AI 학습·요약에 쓰는 것을 금지하는 약관이 9월 7일 시행. → **공식 공지 원문을 못 봤다**(G03). 그동안 코드쇼퍼는 네이버 검색 API를 안내하지 않는다(지금 products.json에도 없다).
- **옛 등록 절차(참고, 검색 API 외 다른 API에 남아 있을 수 있음):** 개발자센터 **Application** → **애플리케이션 등록** → 사용 API 고르기 → 비로그인 오픈 API 서비스 환경 **WEB 설정** → 웹 서비스 URL(`localhost` 포함) → 목록에서 이름을 누르면 **Client ID**·**Client Secret**. 요청 머리글 `X-Naver-Client-Id`, `X-Naver-Client-Secret`. 시크릿은 화면에 넣지 않는다.
- **지도·파파고:** 네이버 클라우드 플랫폼 가입과 **결제 수단 등록**이 먼저(products.json `naver-maps`, `papago-translation`). 지도는 애플리케이션 등록 때 **Dynamic Map**을 골라야 하고, 예전 `ncpClientId` 대신 `ncpKeyId`.

### 7.5 OpenWeather (openweathermap.org) — products.json에 없음 [검색 요약]

- 과제 지시문에 예로 나왔지만 **products.json에 없다.** 날씨는 이미 `kma-forecast`(기상청, 공공데이터포털)와 `open-meteo`(키 없음)가 있다.
- 사실(검색 요약): 무료 요금제 분당 60번, 월 100만 번(공식 요금 페이지 요약). 새 키는 자동으로 켜지는데 10분~2시간(공식이 아닌 Home Assistant 문서). One Call 3.0은 따로 구독하며 하루 1,000번 무료로 소개된다.
- **제안:** 상품으로 넣지 않는다. 이용자가 '다른 서비스(직접 입력)'로 "OpenWeather"를 쓰면 10.6절의 공통 안내를 보이고, 엔진이 같은 갈래의 `open-meteo`·`kma-forecast`를 "이미 확인한 도구"로 옆에 보인다(엔진 규칙, 새 낱말표 `aliases`에 `openweather` → `weather` 갈래).

### 7.6 그 밖의 상품 — 지금 자료 그대로 안내로 옮기기

products.json에 이미 `prep`·`stuck`·`cost`가 있는 상품은 그 값을 서비스 카드로 옮기고(`needsReview` 그대로), 기다림과 카드 꼬리표만 계산한다.

| 상품 | 기다림(`prep.lead`) | 카드 | 키를 화면에 넣어도 되나 |
|---|---|---|---|
| `data4library` 도서관 정보나루 | 며칠(관리자 승인) | 없음 | 안 됨 |
| `careernet` 커리어넷 | 며칠(담당자 승인) | 없음 | 안 됨 |
| `stdict`·`opendict`·`krdict` 국립국어원 사전 | 몇 시간 | 없음 | 안 됨 |
| `bok-ecos` 한국은행 ECOS | 몇 시간(만 14세 이상, 본인인증) | 없음 | 안 됨 |
| `koreaexim-exchange` 수출입은행 환율 | 몇 시간 | 없음 | 안 됨 |
| `seoul-open-data` 서울 열린데이터광장 | 몇 시간 | 없음 | 안 됨 (게다가 기본 주소가 http라 https 화면에서 바로 못 부름) |
| `google-maps-js` 구글 지도 | 바로 | **필요** | 공개 키 + 사이트 제한 |
| `naver-maps` 네이버 지도 | 바로 | **필요** | 공개 키 + 도메인 |
| `papago-translation` | 바로 | **필요(유료)** | 안 됨 |
| `deepl-api` | 바로 | 확인 필요 | 안 됨 |
| `unsplash-api` | 바로 | 없음 | 안 됨 |
| `telegram-bot`·`discord-webhook`·`slack-webhook` | 바로 | 없음 | 안 됨(토큰·웹후크 주소는 비밀) |
| `airtable` | 바로 | 없음 | 안 됨(개인 액세스 토큰) |
| `emailjs` | 바로 | 없음 | 공개 키(EmailJS 문서) |
| `kis-open-api` | 계좌·사업자 | — | 안 됨 |
| `heroku` | 바로 | **필요**(무료 없음) | — |

---

## 8. 초심자 함정 모음 (안내 전체에 걸쳐 쓰는 것)

### 8.1 키가 새는 길 다섯

| 길 | 사실 | 근거 |
|---|---|---|
| 앞머리 붙은 환경 변수 | Vite는 `VITE_`로 시작하는 값을 **빌드할 때 화면 코드에 넣는다.** 문서: "`VITE_*`에는 API 키 같은 민감한 값을 넣지 말 것". Astro는 `PUBLIC_`만 화면에 간다. Next.js `NEXT_PUBLIC_`도 같은 방식 | [저장소] vite `env-and-mode.md`, withastro/docs · products.json `vercel` stuck |
| `.env`를 올림 | Vite의 `.env.local`·`.env.*.local`은 비밀용이라 `.gitignore`에 `*.local`을 넣으라고 문서가 말한다 | [저장소] vite |
| 비공개 저장소라 안심 | 사용자 푸시 보호는 공개 저장소에서만 기본으로 막는다 | [저장소] 4.6절 |
| 비밀 키를 화면에 | Supabase secret 키는 RLS를 건너뛴다(브라우저에선 401로 막지만 키는 이미 샜다) | [문서 도구] |
| 정적 호스트에 키 | Pages·정적 파일은 누구나 내려받는다 | [저장소] · 엔진 `conflict.key-in-static-page` |

### 8.2 문을 열어 둔 채 공개하는 길

- Supabase: SQL로 만든 표의 RLS 꺼짐 (6.1절).
- Firestore: 테스트 모드 규칙 그대로 (6.2절).
- 지도 키: 사이트 제한을 안 건 공개 키(구글은 `https://`까지 정확히, 카카오는 키마다 도메인).
- Firebase 로그인: 배포 주소를 승인된 도메인에 안 넣음 → 로그인이 안 되는 쪽으로 실패(안전하지만 막힘).

### 8.3 돈이 나가는 길

| 서비스 | 무엇 | 근거 |
|---|---|---|
| Google Maps | 결제 계정 필수, 무료 사용량 넘으면 자동 요금 | products.json (needsReview) |
| 카카오맵 | 비즈월렛에 카드·충전금이 있으면 쿼터 초과분 자동 과금 | [검색 요약] 데브톡 운영진 |
| Firebase | Storage는 Blaze 필수(2026-02-03부터). Blaze는 쓴 만큼 | [검색 요약] |
| 네이버 클라우드 | 지도·파파고·API HUB 결제 수단 등록, 쓴 만큼 | products.json · [검색 요약] |
| Supabase | 무료는 넘어도 청구 안 하고 제한. 유료로 올리면 프로젝트마다 컴퓨트 비용 | [문서 도구] |
| Vercel·Netlify 무료 | 넘으면 청구 대신 **정지** | [검색 요약] |
| GitHub | 비공개 저장소의 Actions는 포함 분을 넘으면 청구 | [저장소] |
| Cloudflare 무료 | 넘으면 청구 대신 요청 거절(1027) | [저장소] |

안내 문장: **"카드를 넣는 화면에서는 '한도 알림'이나 '하루 이용 한도'를 먼저 정해요."** (구글 클라우드·네이버 클라우드 콘솔의 한도 기능은 products.json stuck에 있다.)

### 8.4 지역을 잘못 고르는 길

- Supabase 지역은 프로젝트를 만들 때 정한다. 일반 지역은 정확한 나라가 정해지지 않는다 → 개인정보면 **Northeast Asia (Seoul)**.
- Firestore 위치는 **영영 못 바꾼다** → `asia-northeast3`(서울).
- 엔진의 `research-rule.privacy-student`·`privacy-personal`이 이미 '서버 위치'를 알아볼 것으로 넣는다. 안내 단계에서 그 결과를 이어 받아 "여기서 Seoul을 골라요"를 보인다.

### 8.5 기다리는 길

공공데이터포털 반영 시간, 도서관 정보나루·커리어넷 승인, 운영계정 심의, OpenWeather 키 활성화, DNS 반영(최대 48시간, Netlify 문서), Pages 반영(최대 10분). → 모두 '오늘 신청해 둘 것'이나 단계의 "기다려요" 표시로.

---

## 9. 코드쇼퍼 안 어디에 놓나

| 자리 | 지금 | 더할 것 | 근거 섹션 |
|---|---|---|---|
| **도구 상세** `/tools/[id]` | 사실, 쓰기 전에(상세), 막히기 쉬운 곳, AI에게 줄 말, 링크, 미리 짠 코스, 관련 | 'pd-before' 아래에 **"시작하기"** 칸: 서비스 카드의 핵심 단계 3~5줄 + 꼬리표(기다림·카드 필요·키 공개 가능 여부) + [전체 안내 보기 → `/guides/{guideId}`]. 원문 확인 전인 서비스는 "공식 안내 열기"와 '무엇을 고를지' 한 줄만 | 5~7절 |
| **2 도구 고르기** `/waypoints` | 도구 카드 | 카드에 작은 꼬리표 둘: **기다림**(바로·몇 시간·며칠)과 **카드 필요**. 점수는 바꾸지 않는다(표시만, 자료에서 읽음) | 7.6절 |
| **3 도구끼리 맞춰 보기** `/check` | `conflict.*`, `stuck.*` | 새 규칙(13.2절): Pages + 비공개 저장소, Pages + Vite 하위 주소(base), Supabase RLS, Firestore 테스트 모드, Netlify 잦은 배포, 카카오 첫 앱 쿼터 | 2·5·6·7절 |
| **4 설계도 받기** `/arrival` | 영수증 + 설계도 + 준비물 + 대화 카드 | 준비물을 **'다음 할 일'**(다섯 때 묶음, 진행 저장)로 키운다. aitools.md의 '내 AI 준비'는 그 안 '만들기 전에' 묶음의 한 줄 | 11절 |
| **설계도 .md** | 8번 준비물, 10번 진행 순서, 11번 안전 | 8번 줄마다 안내 주소와 걸리는 시간. 10번 마지막에 **'공개하기'** 단계(고른 호스트의 완성 확인 기준). 11번에 고른 도구별 '공개 전 확인' 줄 | 11.4절 |
| **준비 안내** `/guides` | (aitools.md 제안) | 일곱 갈래, 거름, 진행 저장, 직접 입력 | 10절 |
| **어려운 말 풀이** | 212개 | 13.4절 새 말 | 13.4절 |
| **에러 안내** | 20개 | 13.3절 새 카드 | 13.3절 |
| **둘러보는 곳 머리줄** | 도구·용어·지난 영수증 등 | '준비 안내' 한 칸 | 10절 |
| **소개 · 기준** `/about/criteria` | 도구를 고르는 기준 | "안내는 공식 문서만 옮기고, 확인한 날을 적어요. 확인 못 한 단계는 공식 안내로 보내요" 한 문단 | 0절 3 |

---

## 10. 준비 안내(`/guides`) 정보 구조 제안

### 10.1 이름과 갈래

- 페이지 이름: **준비 안내**. (쓰지 않는 말 '길 안내서'·'세트'·'꾸러미'·'체크'를 피한다. aitools.md의 'AI 도구 안내'는 이 안의 한 갈래 이름이 된다.)
- 일곱 갈래와 안내 예:

| 갈래 (`kind`) | 안내 예 (`guides[].id`) |
|---|---|
| 컴퓨터 준비 `basics` | `terminal-open-{os}`, `node-install-{os}`, `git-install-{os}`, `vscode-install-{os}`, `ps-execution-policy` |
| AI 도구 `ai-tool` | aitools.md 6절 그대로 |
| GitHub `github` | `github-signup`, `github-2fa`, `github-repo-web`, `github-desktop-{os}`, `github-cli-{os}`, `github-visibility` |
| 화면 올리기 `deploy` | `pages-branch`, `pages-actions-vite`, `pages-actions-astro`, `cf-workers-connect`, `cf-workers-secret`, `cf-workers-domain`, `vercel-import`*, `netlify-import`*, `firebase-hosting-cli`* |
| 저장과 로그인 `backend` | `supabase-project`, `supabase-keys`, `supabase-rls`, `firebase-project`*, `firestore-create`*, `firebase-auth-domains`* |
| 데이터 키 `data-key` | `data-go-kr-apply`*, `neis-key`*, `kakao-app-key`*, `kakao-map-on`*, `naver-ncp-app`*, `other-service` |
| 안전하게 공개하기 `security` | `before-launch-keys`, `before-launch-rls`, `before-launch-rules`, `before-launch-limits` |

`*` = 원문 확인 전이라 처음엔 링크 카드(`needsReview: true`, 명령·메뉴 단계 없음).

### 10.2 첫 화면 배치 (360px 기준, 위에서 아래로)

1. 머리: 제목 "준비 안내" + 한 줄 "만들기 전에 필요한 가입과 설치를 공식 문서대로 모았어요. 2026-10-14 확인." (날짜는 자료의 가장 오래된 `checkedAt`).
2. **"내 설계도에 필요한 것만"** 스위치. 저장된 `cc:session:v1`이 있으면 기본으로 켠다. 켜면 엔진 `nextSteps()`가 고른 안내만 남긴다. 옆에 진행 "8개 중 3개 마침"(글자. 진행 막대는 `<progress>` + 같은 글).
3. **거르기**(접힌 단추 "거르기 (2)" — 고른 개수). 펼치면 네 묶음, 모두 라디오·확인란 묶음(`fieldset`+`legend`):
   - 컴퓨터: 윈도우 · 맥 · 리눅스 · **다른 컴퓨터(직접 입력)** — 기본값은 브라우저가 알려 준 값(aitools.md 9.2절), `cc:prefs:v1.os`에 저장.
   - 갈래: 일곱 갈래(여러 개).
   - 기다림: 바로 · 몇 시간 · 며칠.
   - 비용: 카드 없이 · 카드 필요.
   거른 상태는 주소 뒤 `?os=mac&k=deploy`로도 남겨 공유·뒤로 가기가 된다(추적 아님, 서버로 안 감).
4. 갈래별 목록. 카드 하나: 제목(동사로: "Cloudflare에 화면 올리기"), 걸리는 시간, 꼬리표(기다림·카드 필요·'공식 안내로'), 진행 상태(안 함·하는 중·마침, 아이콘 + 글).
5. 맨 아래: **다른 서비스(직접 입력)** 칸(10.6절).

키보드: 거르기 단추 → 묶음 → 목록 순. 거른 결과 개수는 `aria-live="polite"`로 한 번 알린다("안내 6개"). 스위치는 `role="switch"` + 글 라벨.

### 10.3 안내 한 장 `/guides/{id}`의 모양

| 순서 | 칸 | 내용 |
|---|---|---|
| 1 | 머리 | 제목, 걸리는 시간, 꼬리표, **"공식 문서로 확인한 날 2026-10-14"**, 기한이 지났으면 "확인한 지 n일 지났어요"(aitools.md 8절) |
| 2 | 이걸 하면 | 한 줄 결과("내 화면이 `https://내아이디.github.io/class-quiz/`에 열려요") |
| 3 | 먼저 할 것 | `needs` 안내 링크(마쳤으면 ✓) |
| 4 | OS 탭 | OS마다 다른 안내만. 탭은 `role="tablist"`, 고른 값은 `cc:prefs:v1.os` |
| 5 | 단계 | 번호 목록. 단계마다: 할 일(한 문장) · 메뉴 경로(굵게, 화면 글 그대로) · 명령(복사 단추, 원문 그대로) · **"이게 보이면 맞아요"** · 확인란("이 단계 마침", `cc:guides:v1`에 저장) |
| 6 | 막혔을 때 | `fixes[]` → 에러 카드(`/errors`가 아니라 지금처럼 에러 안내 자리)로 |
| 7 | 조심할 것 | 8절 함정 중 이 안내에 걸린 것 |
| 8 | 공식 안내 | 출처 목록(표시 [원문]/[저장소]…는 화면에서 "공식 문서" / "공식 문서 원본" / "검색으로만 확인"으로), 새 창 링크 |
| 9 | 다음 | 이 안내를 `needs`로 가진 안내 |

`needsReview: true`인 안내는 5칸 대신 "이 안내는 아직 공식 화면과 대조하지 못했어요. 공식 안내를 열어 이 순서로 찾아보세요"와 **무엇을 고르는지만**(예: "지역은 Seoul") 보인다.

### 10.4 진행 저장 (브라우저에만)

| 키 | 모양 | 비고 |
|---|---|---|
| `cc:guides:v1` | `{ done: { [guideId]: string[] /* 마친 단계 id */ }, finished: string[] /* 다 마친 안내 id, 최근 200개 */ }` | 단계 id가 자료에서 사라지면 읽을 때 버린다 |
| `cc:prep:v1` | `{ [stateKey]: string[] /* 마친 '다음 할 일' id */ }` 최근 30장(영수증 수와 같게) | `stateKey`는 지금 집계에 쓰는 FNV-1a 해시(ARCHITECTURE 8절) 그대로 |
| `cc:prefs:v1.os` | `'windows' \| 'mac' \| 'linux' \| 'other'` | 설정이므로 '저장한 기록 지우기'에서 남긴다 |

- 저장 코드는 `src/lib/store.ts` 한 곳(CLAUDE.md 꼭 지킬 것 2). `guides`·`prep`을 '저장한 기록 지우기' 목록에 더한다(지금 여섯 키 → 여덟).
- 집계: 새 이벤트를 만들지 않는다. 필요하면 나중에 `guide_done:안내id`를 `sent` 열쇠 규칙으로 한 번만(D 기록 필요). 이번 제안에는 넣지 않는다.

### 10.5 예산·구조

- 모든 안내 페이지는 Astro 정적 HTML. 섬은 둘뿐: ① 거르기 + 진행(허브) ② OS 탭 + 확인란 + 복사(안내 한 장). 각각 gzip 5KB 아래를 목표로 하고 첫 화면 JS 100KB 예산에 들어가지 않는다(홈에서 안 싣는다).
- 안내 수: aitools.md 약 70개 + 이 문서 약 45개(OS별 포함) ≈ 115개, JSON 약 150~200KB. 페이지마다 그 안내 몫만 구워 넣는다.
- 검색: 지금 `search-index.json`에 안내 제목·갈래를 더한다.

### 10.6 '다른 서비스(직접 입력)' (요청 5)

- 자리: 준비 안내 맨 아래, 그리고 2단계 도구 고르기의 "목록에 없는 도구"(이미 자유 입력이 있다면 그 값을 그대로 받는다).
- 입력: 한 줄 40자(지금 앱 설명 자유 입력과 같은 처리: 줄바꿈 지움, 설계도에 "내 말 그대로"로).
- 사이트가 하는 일(AI 없이):
  1. 낱말표(`data/guides.json`의 `aliases`: `openweather`·`오픈웨더` → `weather`, `mongodb` → `backend` …)로 갈래를 짐작해 같은 갈래의 확인된 도구를 옆에 보인다("이미 확인한 도구: Open-Meteo, 기상청 단기예보"). 못 찾으면 짐작하지 않는다.
  2. **공통 안내 다섯 단계**를 보인다: ① 공식 사이트에서 가입 ② 키·토큰 받는 곳 찾기 ③ 키를 숨길 곳 정하기(서버·환경 변수) ④ 무료 한도와 넘으면 무슨 일이 나는지 ⑤ 카드를 넣는다면 한도 알림부터.
  3. 설계도 9번 '알아볼 것'에 다섯 질문을 넣는다: "가입·키 받는 곳 / 무료 한도와 넘으면 / 카드가 필요한가 / 키를 화면에 넣어도 되는가 / 서버 위치" — 어디서: "공식 문서", 확인됐다고 볼 기준: "공식 주소의 페이지를 찾았다".
  4. 내 AI에게 붙여 넣을 말(복사): "{입력한 이름}의 공식 문서에서 가입하고 API 키 받는 순서를 찾아 줘. 공식 주소만 쓰고, 무료 한도와 카드가 필요한지, 키를 화면 코드에 넣어도 되는지도 알려 줘."
- 엔진 쪽: 자유 입력 도구는 엔진 태그를 만들지 않는다. 갈래(`capabilities`)는 이용자가 고르게 한다("이 도구가 맡는 일: 화면 올리기 · 저장 · 로그인 · 데이터 · 알림 · 모르겠어요").

---

## 11. '설계도 다음 할 일' 목록

### 11.1 무엇이 들어가나

엔진 함수 `nextSteps(evaluation, ctx: { os, aiToolId?, customTools? })` → `NextStepGroup[]`. 순수 함수, `src/lib/engine/`. 문장은 `data/templates.json`의 `nextSteps.*`, 안내 연결은 `data/guides.json`.

| 때 (`when`) | 들어가는 것 | 순서 |
|---|---|---|
| **오늘 신청해 둘 것** `today` | `prep.lead`가 `days`·`hours`인 상품의 가입·신청 | 며칠 → 몇 시간 |
| **만들기 전에** `before-build` | 계정(`github-signup`·`github-2fa`, 호스트 가입), 컴퓨터 준비(3.5절 표로 필요한 것만), AI 도구 설치(aitools.md), 바로 받는 키 | 걸리는 시간이 긴 것 먼저 |
| **만들면서** `during` | 키를 숨길 곳 만들기(Worker 비밀 값·환경 변수), Supabase 표 + RLS, Firestore 규칙, 저장소 만들기 | 설계도 10번 진행 순서를 따른다 |
| **공개하기 전에** `before-launch` | 8.1·8.2절 중 고른 도구에 걸린 것 + 고른 호스트의 '올리기' 안내 | 고정 순서: 키 → 문(RLS·규칙) → 저장소 공개 범위 → 올리기 |
| **공개한 뒤** `after-launch` | 한도 보기(호스트·지도 쿼터), 기한 있는 키(공공데이터 31번), 일시 정지(Supabase), 내 도메인(선택) | — |

각 줄: `{ id, label, minutes?, lead?, cost: 'free'|'card'|'paid', guideId?, productId?, why }`. `why`는 "고른 도구 Supabase 때문"처럼 어느 고름에서 왔는지 한 줄.

### 11.2 예: 미리 짠 코스 세 개로 나오는 목록

**우리 동네 날씨 현황판** (`react-vite` + `kma-forecast` + `cloudflare-workers`, AI = 터미널 에이전트, 윈도우)

- 오늘 신청해 둘 것: □ 공공데이터포털 가입하고 '기상청 단기예보' 활용신청 (몇 시간 걸릴 수 있어요)
- 만들기 전에: □ Node.js LTS 설치(10분) □ Git 설치(10분) □ GitHub 가입과 이중 인증(15분) □ Cloudflare 가입(5분) □ (AI 도구 설치 — aitools.md)
- 만들면서: □ 키를 Worker 비밀 값으로 넣기(`npx wrangler secret put SERVICE_KEY`) □ `.dev.vars`·`.env`를 `.gitignore`에
- 공개하기 전에: □ 화면 코드에 `VITE_`로 시작하는 키가 없는지 □ 저장소에 키가 없는지(비공개여도) □ Cloudflare에 저장소 잇기 → Save and Deploy
- 공개한 뒤: □ 하루 10만 요청(넘으면 Error 1027) □ 공공데이터 키 사용 기한(31번 에러가 나면 연장)

**우리 반 퀴즈** (`html-single` + `github-pages`, AI = 채팅)

- 오늘: (없음)
- 만들기 전에: □ GitHub 가입과 이중 인증
- 만들면서: □ 공개 저장소 만들기 □ `index.html`을 **폴더 없이** 맨 위에 올리기
- 공개하기 전에: □ 학생 이름 같은 개인정보가 화면에 없는지 □ Settings → Pages → Deploy from a branch → main → /(root) → Save
- 공개한 뒤: □ `https://내아이디.github.io/저장소/` 열기(최대 10분)

**급식 안내 페이지** (`html-single` + `neis-meal` + `google-sheets-apps-script`)

- 오늘: (없음 — 나이스 키는 바로 나온다)
- 만들기 전에: □ 나이스 교육정보 개방 포털 인증키 □ 개인 구글 계정(학교 계정은 막힐 수 있어요)
- 만들면서: □ 학교기본정보로 학교 코드 찾기 □ 키를 스크립트 속성에(지금 `stuck.apps-script-key`)
- 공개하기 전에: □ 키가 HTML에 없는지 □ 앱스 스크립트 배포 권한
- 공개한 뒤: □ 키 이용기간 확인

### 11.3 화면

- 4단계의 지금 '준비물' 자리를 **"다음 할 일"** 접이식 목록으로 바꾼다. 묶음 제목 + "n개 중 m개". 줄마다 확인란, 걸리는 시간, 꼬리표, [안내 보기]. 확인란은 `cc:prep:v1`.
- 영수증의 '준비물 n개' 줄은 그대로 두되 셈은 `today`+`before-build` 묶음만(만들면서·공개 전은 설계도 단계에 이미 있다). → 영수증 숫자가 바뀌므로 골든을 함께 고친다.
- "PC로 보내기"로 넘긴 영수증 링크를 PC에서 열면 같은 목록이 나온다(진행은 기기마다 따로라고 한 줄 알린다).

### 11.4 설계도(.md)에 들어가는 꼴

- 8번 준비물: `- [ ] 공공데이터포털 '기상청 단기예보' 활용신청 (몇 시간 걸릴 수 있어요) — https://코드쇼퍼주소/guides/data-go-kr-apply`
- 10번 진행 순서 맨 끝 새 단계 **'공개하기'**: 고른 호스트의 완성 확인 기준(예: "`https://….workers.dev`에서 오늘 날씨가 보인다") + '공개하기 전에' 줄들을 "~했는지 확인해 줘"로.
- 11번 안전: 고른 도구의 공개 전 확인을 "-한다"체로("Supabase의 모든 표에 RLS를 켠다. SQL로 만든 표도 확인한다.").
- `docs/RECEIPT.md` 2절 표와 `data/templates.json`(`pack.*`)을 함께 고치고, `docs/examples/`를 다시 만든다.

---

## 12. 자료 모델 (aitools.md 6절 `data/guides.json`에 더할 것)

```ts
type Guides = {
  version: 1;
  tools: Tool[];          // aitools.md 그대로
  services: Service[];    // 새로
  guides: Guide[];        // aitools.md + 아래 필드
  aliases: { match: string; kind: GuideKind; productIds?: string[] }[];  // 10.6절 낱말표
};

type GuideKind = 'basics' | 'ai-tool' | 'github' | 'deploy' | 'backend' | 'data-key' | 'security';

type Service = {
  id: string;                       // 'cloudflare-workers', 'supabase', 'data-go-kr', 'github'
  productId?: string;               // products.json id. GitHub·Node처럼 상품이 아니면 없음
  name: string;
  kind: GuideKind;
  uiLanguage: 'ko' | 'en' | 'ko-optional';   // 'ko-optional' = 설정에서 한국어로 (Cloudflare)
  account: ('email' | 'github' | 'google' | 'kakao' | 'naver' | 'phone-verify' | 'portal')[];
  card: 'none' | 'optional' | 'required';
  autoBilling?: string;             // "비즈월렛에 카드가 있으면 쿼터를 넘을 때 자동으로 요금이 나가요"
  overLimit: 'blocked' | 'paused' | 'billed' | 'soft' | 'unknown';
  keyKinds?: { name: string; public: boolean; where: string[] /* 메뉴 경로 */ }[];
  region?: { pick: string; why: string };    // { pick: 'Northeast Asia (Seoul)', why: '개인정보' }
  guideIds: string[];
  officialDocs: string;
  checkedAt: string;
  reviewEveryDays: number;          // 호스트·백엔드 30, 공공 API 60
  needsReview: boolean;
  sources: SourceRef[];             // aitools.md 6.1절, via에 'docs-tool' 추가
};

// Guide에 더할 필드
type GuideExtra = {
  kind: GuideKind;
  service?: string;                 // services[].id (AI 도구 안내는 tool)
  task: /* aitools.md 값 + */ 'signup' | 'key' | 'connect-repo' | 'env' | 'domain' | 'security' | 'limits' | 'apply';
  when: 'today' | 'before-build' | 'during' | 'before-launch' | 'after-launch';
  lead: 'instant' | 'hours' | 'days';   // products.json prep.lead와 같은 값
  waitNote?: string;                // "승인 뒤에도 몇 시간 걸릴 수 있어요"
};
```

- products.json `prep[]`에 `guideId?: string`을 더한다(스키마 `schemas/products.schema.json`). 엔진은 상품의 `prep`과 안내의 `when`·`lead`를 합쳐 11절 목록을 만든다.
- 검사(`scripts/validate-data.ts`): `service.productId`가 있고, `prep[].guideId`가 있고, `card: 'required'`면 `sources` 중 하나가 `page`·`repo`·`docs-tool`이어야 한다(아니면 `needsReview: true`). aitools.md 6.3절 규칙 2(명령이 있으면 원문 출처)를 메뉴 경로 `where`에도 적용한다.

### 12.1 예: GitHub Pages(브랜치) — 원문에서 옮긴 그대로

```json
{
  "id": "pages-branch",
  "kind": "deploy",
  "service": "github",
  "task": "connect-repo",
  "when": "before-launch",
  "lead": "instant",
  "os": "any",
  "title": "GitHub Pages로 화면 올리기 (HTML 한 장)",
  "minutes": 10,
  "needs": ["github-signup", "github-repo-web"],
  "steps": [
    { "id": "entry", "say": "index.html이 저장소 맨 위에 있는지 봐요.", "expect": "파일 목록 첫 화면에 index.html이 보여요.", "terms": ["entry-file"], "sourceRef": 0 },
    { "id": "settings", "say": "저장소의 Settings를 열고 왼쪽에서 Pages를 눌러요.", "where": ["Settings", "Pages"], "sourceRef": 1 },
    { "id": "source", "say": "Source에서 Deploy from a branch를 골라요.", "where": ["Build and deployment", "Source", "Deploy from a branch"], "sourceRef": 1 },
    { "id": "branch", "say": "브랜치는 main, 폴더는 /(root)로 두고 Save를 눌러요.", "where": ["main", "/(root)", "Save"], "sourceRef": 1 }
  ],
  "verify": { "id": "visit", "say": "몇 분 뒤 같은 화면 위쪽의 Visit site를 눌러요.", "expect": "내 화면이 열려요. 바뀐 것이 보이기까지 10분쯤 걸릴 수 있어요.", "sourceRef": 2 },
  "fixes": [
    { "match": "404", "errorId": "pages-404-entry", "say": "index.html이 폴더 안에 들어가 있으면 열리지 않아요. 폴더 밖 맨 위로 옮겨요.", "steps": [] }
  ],
  "checkedAt": "2026-10-14",
  "reviewEveryDays": 30,
  "needsReview": false,
  "sources": [
    { "url": "https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites", "label": "GitHub Docs: 404 문제 해결", "via": "repo", "checkedAt": "2026-10-14" },
    { "url": "https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site", "label": "GitHub Docs: 게시 위치 정하기", "via": "repo", "checkedAt": "2026-10-14" },
    { "url": "https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site", "label": "GitHub Docs: Pages 사이트 만들기", "via": "repo", "checkedAt": "2026-10-14" }
  ]
}
```

### 12.2 예: Supabase 키 — 서비스 카드 일부

```json
{
  "id": "supabase",
  "productId": "supabase",
  "kind": "backend",
  "uiLanguage": "en",
  "account": ["github", "email"],
  "card": "none",
  "overLimit": "blocked",
  "keyKinds": [
    { "name": "Publishable key (sb_publishable_…, 옛 이름 anon)", "public": true, "where": ["Settings", "API Keys"] },
    { "name": "Secret key (sb_secret_…, 옛 이름 service_role)", "public": false, "where": ["Settings", "API Keys"] }
  ],
  "region": { "pick": "Northeast Asia (Seoul)", "why": "개인정보를 다루면 서버가 한국에 있는 편이 알리기 쉬워요" },
  "checkedAt": "2026-10-14",
  "reviewEveryDays": 30,
  "needsReview": false,
  "sources": [
    { "url": "https://supabase.com/docs/guides/getting-started/api-keys", "label": "Supabase Docs: Understanding API keys", "via": "docs-tool", "checkedAt": "2026-10-14" }
  ]
}
```

(`card: "none"`은 무료 플랜 기준. 화면 문장은 `templates.json`/`ko.ts`로, 위 `name`·`why`는 자료 값이다.)

---

## 13. 엔진·자료에 더할 것

### 13.1 products.json 고칠 것 (C 작업, needsReview 유지)

| 상품 | 고칠 것 | 근거 |
|---|---|---|
| `kakao-maps` | stuck: 메뉴를 "[앱] > [플랫폼 키] > [JavaScript 키] > JavaScript SDK 도메인"으로. 새 줄: "제품 설정 > 카카오맵에서 사용 설정을 켜야 해요", "무료 한도는 계정에서 처음 카카오맵을 켠 앱에만 붙어요". freeLimit: "하루 한도는 매일 0시에 다시 차요. 결제 수단이 없으면 다 쓰는 순간 막혀요" | [검색 요약] |
| `firebase-hosting` | links에서 Firebase Studio 배포 문서 빼기. stuck에 "Firebase Studio는 2027-03-22에 닫혀요" 넣지 않음(쓰지 않으면 될 일) | [검색 요약] |
| `firebase-firestore`·`firebase-auth` | 새 stuck: "파일 저장(Cloud Storage)을 쓰려면 Blaze 요금제(카드)가 필요해요 (2026-02-03부터)" — 상품이 따로 없으니 `firebase-firestore`에 | [검색 요약] |
| `supabase` | promptFragment와 stuck을 publishable·secret 이름으로(옛 이름 괄호). 새 stuck: "SQL로 만든 표는 RLS가 꺼져 있을 수 있어요", "일주일 쓰지 않아 정지되면 90일 안에 Resume project로 되살려요". serverRegion 설명에 'Northeast Asia (Seoul)' | [문서 도구] |
| `github-pages` | stuck: "index.html은 저장소 맨 위(또는 /docs 맨 위)에 있어야 해요", "Vite·Astro로 만들었으면 base를 저장소 이름으로". cost.note: "공개 저장소는 무료" 그대로 + "비공개로 바꾸면 내려가요" | [저장소] |
| `netlify` | freeLimit의 '300크레디트'를 사람이 공식 요금 페이지로 확인(G03). stuck: "AI가 자주 올리면 크레디트가 빨리 줄어요. 운영 배포 한 번에 15크레디트" | [검색 요약] |
| `vercel` | stuck: "GitHub 조직의 비공개 저장소는 Hobby에 못 올려요" | [검색 요약] |
| `cloudflare-workers` | stuck: "Worker 이름과 wrangler 설정의 name이 같아야 해요", "하루 10만 요청을 넘으면 Error 1027이 나요(정적 파일은 계속 열려요)" | [저장소] |
| `data-go-kr` 등 공공데이터포털 상품 | stuck: "31번 에러(DEADLINE_HAS_EXPIRED_ERROR)는 키 사용 기한이 끝난 거예요. 마이페이지에서 연장을 신청해요" | [검색 요약] |

### 13.2 `data/rules.json`에 더할 규칙 후보 (`engine-guardian` 검토, 골든 함께)

| id | 언제 | 무엇 |
|---|---|---|
| `conflict.pages-private-free` | `github-pages`를 골랐고 새 질문 '저장소를 비공개로 두고 싶나요?'(선택, 기본 '상관없어요')가 '비공개' | 막힌 곳: "무료 GitHub에서는 비공개 저장소를 Pages로 못 올려요" → 고칠 길: Cloudflare Workers |
| `stuck.pages-base-path` | `github-pages` + `react-vite` | 막히기 쉬운 곳: base 설정 |
| `stuck.pages-entry-top` | `github-pages` | index.html 맨 위 |
| `stuck.supabase-rls-sql` | `supabase` + `ai.agent` | SQL로 만든 표의 RLS |
| `stuck.firestore-test-mode` | `firebase-firestore` | 테스트 모드 규칙 |
| `stuck.netlify-deploy-credits` | `netlify` + `ai.agent` | 잦은 운영 배포 |
| `stuck.kakao-first-app` | `kakao-maps` | 첫 앱 쿼터·사용 설정 |
| `safety.client-env-prefix` | 화면 도구가 `react-vite`이고 키가 필요한 상품이 있음 | "`VITE_`로 시작하는 이름에 키를 넣지 않는다" (설계도 11번) |

### 13.3 에러 안내에 더할 카드 (`data/errors.json`)

| id | 보이는 것 | 근거 |
|---|---|---|
| `pages-404-entry` | Pages 주소에서 404 | [저장소] 원인과 해결. 화면 문구("There isn't a GitHub Pages site here.")는 [기억·미확인] → 증상으로 매칭 |
| `pages-unpublished-private` | 비공개로 바꾼 뒤 사이트가 사라짐 | [저장소] |
| `vite-base-blank` | 빈 화면 + 콘솔에 `/assets/…` 404 | [저장소] vite. 지금 `blank-screen` 카드에 갈래로 더해도 된다 |
| `ps-execution-policy` | PowerShell에서 npm이 막힘 | [저장소] 해결 명령 · 문장은 [기억·미확인]. aitools.md 9.7절과 하나로 |
| `git-push-secret-blocked` | `git push`에서 `remote:` 줄에 비밀 값 종류와 `commit:`·`path:` | [저장소] |
| `supabase-42501` | `42501`, "permission denied for table" | [문서 도구] |
| `supabase-paused` | 프로젝트가 정지됨 | [문서 도구] |
| `firestore-permission` | Firestore 권한 거절 | 문장 "Missing or insufficient permissions"는 [기억·미확인] |
| `cf-1027` | Cloudflare Error 1027 | [저장소] |
| `cf-1102` | Error 1102 "Worker exceeded resource limits" | [저장소] |
| `kakao-map-disabled` | `App disabled OPEN_MAP_AND_LOCAL service` | [검색 요약] |
| `netlify-site-not-available` | "Site not available" | [검색 요약] |
| (고침) `data-go-kr-error` | 20·30·31 코드 뜻 더하기 | [검색 요약] |

### 13.4 어려운 말 풀이에 더할 말 (지금 212개에 없는 것)

이중 인증(2FA), 인증 앱(TOTP 앱), 복구 코드, 패스키, 시작 파일(index.html), 루트 폴더(Root directory), 게시 폴더(Publish directory), base 경로, 푸시 보호, 실행 정책(PowerShell), 설치 프로그램(.msi·.pkg), 플랫폼 키(카카오), 다시 배포(Redeploy), 미리 보기 배포, 기본 주소(`workers.dev`·`github.io`), 비밀 값(Worker Secret — 지금 `secret`과 합칠지 검토). aitools.md 9.6절 목록(PATH, WSL, PowerShell, CMD, Homebrew, WinGet, LTS…)과 겹치는 것은 하나로.

---

## 14. 작업 묶음과 기록

### 14.1 작업 묶음 (TASKS에 옮길 것, aitools.md X1~X5와 합친다)

| 묶음 | 하는 일 | 검토 |
|---|---|---|
| **S1 자료** | `services[]`·`aliases`·새 `guides`(원문 확인된 것: 3절·4절·5.2절·6.1절), 스키마, 검사 규칙, products.json `prep[].guideId`, 13.1절 고침, 13.3·13.4절 카드·말 | engine-guardian, ko-copy-editor |
| **S2 엔진** | `nextSteps()`, 13.2절 규칙, 새 선택 질문 '저장소 공개 범위', 자유 입력 도구의 갈래, `templates.json` `nextSteps.*`·`pack.*`, 골든·예시 | engine-guardian |
| **S3 화면** | `/guides` 허브(거르기·진행), `/guides/[id]`, 도구 상세 '시작하기', 2단계 꼬리표, 4단계 '다음 할 일', `store.ts` 세 키 | game-ux-designer, a11y-perf-auditor, reader-tester |
| **S4 확인** | H14 허용 목록 뒤 검색 요약 안내를 원문으로 대조해 `needsReview: false`로, G03 실측 | ko-copy-editor |

### 14.2 결정 기록 후보 (`docs/DECISIONS.md`, D73부터 — D72는 이미 씀)

- 준비 안내 하나에 일곱 갈래, 자료 하나(`data/guides.json`) — 이유: 이용자는 'AI 도구'와 '서비스'를 나눠 생각하지 않고, 진행·거르기·검색을 한 번만 만든다 — 틀렸을 때 비용: 갈래를 나눠 페이지만 따로 굽으면 된다.
- '다음 할 일'은 준비물을 키운 것(새 단계 아님), 다섯 때 — 이유: 단계 다섯(D64)을 지키고, 설계도 8·10·11번과 1:1로 맞는다 — 비용: 영수증 '준비물 n개' 셈이 바뀌어 골든 손질.
- 검색 요약뿐인 서비스는 단계 대신 링크 카드 — 이유: 메뉴 이름이 틀리면 초심자가 거기서 멈춘다 — 비용: 그 서비스 이용자는 공식 문서를 한 번 더 연다.
- 카드 필요·자동 과금 꼬리표 — 이유: 바이브코딩 초심자가 가장 크게 다치는 곳이 요금이다(요금 0원 슬로건과도 맞다) — 비용: 서비스 카드에 `card`·`autoBilling` 칸 관리.
- OpenWeather는 상품으로 넣지 않고 낱말표로 같은 갈래 도구에 잇는다 — 이유: 이미 공공·키 없는 날씨 도구가 있고, 공식 사실을 못 읽었다 — 비용: 그 이름으로 찾는 사람이 한 번 더 고른다.

### 14.3 HUMAN.md 항목 제안

aitools.md 10.3절이 H12를 제안했지만 H12는 이미 '저장소 비공개'로 쓰였다(D72). 그래서 번호를 옮긴다.

- [ ] **H13** (aitools.md의 H12를 옮김) AI 도구 문서 사이트 허용 목록 — aitools.md 10.3절 목록 그대로 — X1·X5 — (2026-10-14)
- [ ] **H14** 클라우드 환경 Network access의 Allowed domains에 `vercel.com`, `docs.netlify.com`, `firebase.google.com`, `supabase.com`, `developers.cloudflare.com`, `docs.github.com`, `git-scm.com`, `code.visualstudio.com`, `support.apple.com`, `www.data.go.kr`, `open.neis.go.kr`, `developers.kakao.com`, `apis.map.kakao.com`, `devtalk.kakao.com`, `developers.naver.com`, `api.ncloud-docs.com`, `guide.ncloud-docs.com`, `openweathermap.org` 더하기 — 이번 조사의 검색 요약을 원문으로 바꾸려면 — S4 — (2026-10-14). (H10의 data.go.kr 요청을 포함한다.)
- [ ] **G03** 화면 실측(가진 계정만): ① Node.js 설치 화면(윈도우·맥) ② GitHub Desktop 로그인 메뉴 ③ 공공데이터포털 마이페이지에서 일반 인증키 메뉴 이름과 승인 뒤 첫 호출까지 걸린 시간 ④ 나이스 인증키 신청에 가입이 필요한지 ⑤ 카카오 [앱] > [플랫폼 키] 위치와 카카오맵 사용 설정 ⑥ Netlify 무료 크레디트 수(300인지 30인지) ⑦ 네이버 개발자센터 공지(검색 API 이관) ⑧ Firebase 콘솔의 한국어 메뉴 이름 — S4 — (2026-10-14)
- [ ] **G04** 학생 이용 가능 나이 확인: GitHub·Supabase·Vercel·Netlify·Cloudflare·Firebase·카카오 개발자·공공데이터포털 가입 나이 조건 — 교사가 학생에게 권하는 길에 영향 — S3 출시 — (2026-10-14)

### 14.4 다른 v3 문서와 맞출 것

- **aitools.md**: `data/guides.json` 모양을 이 문서 12절로 넓힌다. `/guides` 이름을 '준비 안내'로, 'AI 도구 안내'는 갈래 이름으로. 에러 카드 `ps-execution-policy`는 하나만. H12 번호 충돌을 H13으로.
- **design.md**: '다른 서비스(직접 입력)'의 낱말표는 design.md 5번 결정(직접 쓴 말을 AI 없이 낱말표로 읽어 반영하고, 반영한 결과를 그대로 말함)과 같은 장치를 쓴다. 반영 문장 꼴도 맞춘다("'OpenWeather' → 날씨 갈래의 확인된 도구를 옆에 놓았어요").
- **D72(배포)**: 코드쇼퍼 자신은 Cloudflare Workers. 이용자 안내의 기본 제안도 같은 서비스라, 소유자가 한 번 해 본 순서(`docs/DEPLOY.md` 5단계)를 `cf-workers-connect` 안내의 실측 근거로 쓴다.

---

## 15. 확인하지 못한 것 (needsReview)

1. Vercel 전부(가입 화면, 가져오기 메뉴 이름, Hobby 한도 숫자, 조직 비공개 저장소 제한) — 검색 요약.
2. Netlify 전부, 특히 무료 크레디트 수(300 vs 30)와 넘었을 때 사이트가 정말 내려가는지(포럼은 "사이트는 살아 있고 배포만 멈춤"이라는 글도 있음).
3. Firebase 콘솔 단계와 한국어 메뉴 이름, 테스트 모드 기간(30일은 제3자 자료), `firebase init hosting` 하위 명령, Hosting Spark 한도.
4. Supabase 새 프로젝트 화면의 칸 이름(조직·이름·비밀번호·지역은 제3자 자료).
5. Git 설치 페이지(git-scm.com) 전부, 설치 화면 선택지.
6. Node.js 설치 프로그램 화면 순서, PowerShell 실행 정책 에러 문장.
7. 맥 터미널 열기(Apple 지원 문서는 검색 요약).
8. 공공데이터포털: 마이페이지 메뉴 이름, 키 반영 시간, 키 사용 기한 길이, 개발계정 기본 트래픽.
9. 나이스: 가입 필요 여부(가이드와 약관이 엇갈림), 하루 호출 한도.
10. 카카오: 앱 만들기 화면 칸, 하루 쿼터 숫자, 플랫폼 키 메뉴 경로의 두 표기.
11. 네이버: 검색 API 이관 공식 공지, API HUB 요금, 개발자센터에 남은 API 목록.
12. OpenWeather: 요금 페이지 원문, 키 활성화 시간 공식 문구.
13. GitHub Pro 가격, 가입 나이 조건, Pages 404 화면 문구.
14. Cloudflare 대시보드의 한국어 메뉴 이름(영어 이름은 원문으로 확인했지만 한국어로 바꾼 화면은 못 봄).

---

## 16. 출처 (모두 2026-10-14 확인)

**[원문]** — https://nodejs.org/en/download · https://nodejs.org/en/about/previous-releases · https://github.com/git-for-windows/git/releases/latest · https://github.com/pricing

**[레지스트리]** — https://nodejs.org/dist/index.json · https://nodejs.org/dist/v24.21.0/ · https://registry.npmjs.org (`firebase-tools`, `firebase`, `@supabase/supabase-js`, `wrangler`, `vercel`, `netlify-cli`의 latest)

**[저장소] Node.js** — https://github.com/nodejs/Release/blob/main/schedule.json · https://github.com/nodejs/nodejs.org/tree/main/apps/site/snippets/en/download (`nvm.bash`, `fnm.bash`, `brew.bash`, `choco.bash`, `node.bash`)

**[저장소] GitHub Docs** (게시 주소 https://docs.github.com/en/…) — `content/pages/getting-started-with-github-pages/` (`github-pages-limits.md`, `creating-a-github-pages-site.md`, `configuring-a-publishing-source-for-your-github-pages-site.md`, `troubleshooting-404-errors-for-github-pages-sites.md`), `data/reusables/gated-features/pages.md`, `data/reusables/pages/` (`private_pages_are_public_warning`, `twenty-minutes-to-publish`, `create-repo-name`, `check-workflow-run`, `sidebar-pages`, `admin-must-push`), `content/get-started/onboarding/getting-started-with-your-github-account.md`, `content/get-started/learning-about-github/githubs-plans.md`, `content/authentication/securing-your-account-with-two-factor-authentication-2fa/` (`configuring-two-factor-authentication.md`, `about-mandatory-two-factor-authentication.md`), `data/reusables/two_fa/`, `data/reusables/user-settings/`, `content/repositories/creating-and-managing-repositories/quickstart-for-repositories.md`, `content/repositories/working-with-files/managing-files/adding-a-file-to-a-repository.md`, `data/variables/large_files.yml`, `content/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility.md`, `content/desktop/installing-and-authenticating-to-github-desktop/` (`installing-github-desktop.md`, `authenticating-to-github-in-github-desktop.md`), `data/variables/desktop.yml`, `data/reusables/desktop/`, `content/get-started/git-basics/` (`set-up-git.md`, `setting-your-username-in-git.md`, `caching-your-github-credentials-in-git.md`), `content/billing/concepts/product-billing/github-actions.md`, `content/code-security/concepts/secret-security/push-protection.md`, `content/code-security/how-tos/secure-your-secrets/work-with-leak-prevention/push-protection-on-the-command-line.md`

**[저장소] GitHub CLI** — https://github.com/cli/cli (`README.md`, `docs/install_windows.md`, `docs/install_macos.md`)

**[저장소] Microsoft** — https://github.com/microsoft/vscode-docs (`docs/setup/windows.md`, `docs/setup/mac.md`, `docs/configure/locales.md`; DateApproved 10/7/2026) · https://github.com/MicrosoftDocs/terminal (`TerminalDocs/install.md`, ms.date 11/10/2025) · https://github.com/MicrosoftDocs/PowerShell-Docs (`reference/5.1/Microsoft.PowerShell.Core/About/about_Execution_Policies.md`, ms.date 08/31/2026)

**[저장소] Cloudflare** (게시 주소 https://developers.cloudflare.com/…) — `src/content/docs/fundamentals/account/create-account.mdx`, `fundamentals/user-profiles/customize-account.mdx`, `workers/ci-cd/builds/index.mdx`, `workers/ci-cd/builds/configuration.mdx`, `workers/ci-cd/builds/limits-and-pricing.mdx`, `workers/platform/limits.mdx`, `workers/platform/pricing.mdx`, `workers/static-assets/billing-and-limitations.mdx`, `workers/configuration/secrets.mdx`, `workers/configuration/routing/custom-domains.mdx`, `workers/configuration/routing/workers-dev.mdx`, `workers/framework-guides/web-apps/astro.mdx`, `pages/index.mdx`, `pages/platform/limits.mdx`, `src/content/partials/pages/workers-for-new-projects.mdx`

**[저장소] 프레임워크** — https://github.com/vitejs/vite (`docs/guide/static-deploy.md`, `docs/guide/env-and-mode.md`) · https://github.com/withastro/docs (`src/content/docs/en/guides/deploy/github.mdx`, `src/content/docs/en/guides/environment-variables.mdx`) · https://github.com/firebase/firebase-tools (`README.md`)

**[저장소·문서 도구] Supabase** — https://github.com/supabase/supabase (`apps/docs/content/guides/platform/regions.mdx`, `guides/database/postgres/row-level-security.mdx`, `guides/getting-started/quickstarts/reactjs.mdx`, `_partials/quickstart_create_project.mdx`, `_partials/quickstart_db_setup.mdx`, `packages/shared-data/regions.ts`) · Supabase 문서 도구로 읽은 페이지: https://supabase.com/docs/guides/getting-started/api-keys · https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys · https://supabase.com/docs/guides/api/securing-your-api · https://supabase.com/docs/guides/platform/billing-on-supabase · https://supabase.com/docs/guides/platform/billing-faq · https://supabase.com/docs/guides/platform/free-project-pausing · https://supabase.com/docs/guides/deployment/going-into-prod

**[문서 도구] Vercel** — https://vercel.com/docs/cli/rollback (Vercel MCP 문서 검색 결과)

**[검색 요약] Vercel** — https://vercel.com/docs/plans/hobby · https://vercel.com/docs/limits · https://vercel.com/docs/limits/fair-use-guidelines · https://vercel.com/docs/plans · https://vercel.com/docs/pricing · https://vercel.com/docs/git · https://vercel.com/docs/monorepos · https://vercel.com/docs/builds/configure-a-build · https://vercel.com/docs/accounts · https://vercel.com/kb/guide/how-to-add-vercel-environment-variables · https://vercel.com/docs/environment-variables/rotating-secrets · https://vercel.com/docs/domains/working-with-domains/add-a-domain · https://vercel.com/kb/guide/a-record-and-caa-with-vercel · https://community.vercel.com/t/why-cant-hobby-accounts-deploy-from-organizations/10015 · https://community.vercel.com/t/sudden-deployment-failure-from-private-github-repository-on-hobby-plan/16314

**[검색 요약] Netlify** — https://docs.netlify.com/manage/projects/add-new-project/ · https://docs.netlify.com/start/quickstarts/deploy-from-repository/ · https://docs.netlify.com/build/configure-builds/overview/ · https://docs.netlify.com/build/configure-builds/monorepos/ · https://docs.netlify.com/build/environment-variables/overview/ · https://docs.netlify.com/manage/domains/manage-domains/assign-a-domain-to-your-site-app/ · https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/ · https://docs.netlify.com/manage/accounts-and-billing/billing/resume-paused-projects/ · https://answers.netlify.com/t/free-plan-stuck-on-operational-credits-production-deploys-paused-despite-30-credits-available/170557 · https://toolchase.com/blog/netlify-pricing-guide/ (제3자)

**[검색 요약] Firebase** — https://firebase.google.com/docs/web/setup · https://firebase.google.com/docs/firestore/quickstart · https://firebase.google.com/docs/firestore/locations · https://firebase.google.com/docs/rules/basics · https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 · https://firebase.google.com/support/releases · https://firebase.google.com/docs/projects/api-keys · https://firebase.google.com/support/guides/security-checklist · https://en.wikipedia.org/wiki/Firebase_Studio · https://www.storyboard18.com/digital/google-to-shut-firebase-studio-in-2027-shifts-focus-to-ai-studio-and-antigravity-92922.htm · https://docs.flutterflow.io/client-access-to-firestore-expired (제3자, 테스트 모드 기간)

**[검색 요약] Git·Apple·Cloudflare 언어** — https://git-scm.com/install/windows · https://git-scm.com/install/mac · https://support.apple.com/guide/terminal/open-or-quit-terminal-apd5265185d-f365-44cb-8b09-71a064a42125/mac · https://blog.cloudflare.com/internationalizing-the-cloudflare-dashboard/

**[검색 요약] 공공데이터포털** — https://www.data.go.kr/data/15101578/openapi.do (TourAPI 심의유형·트래픽 예) · https://www.data.go.kr/data/15069635/openapi.do · https://wikidocs.net/292158 (제3자) · https://www.kick-off.co.kr/8077 (제3자) · https://www.elancer.co.kr/blog/detail/1045 (제3자)

**[검색 요약] 나이스** — https://open.neis.go.kr/portal/guide/apiGuidePage.do · https://open.neis.go.kr/portal/userAgreementPage.do · https://www.data.go.kr/data/15139198/openapi.do · https://www.gov.kr/portal/service/serviceInfo/B55062900031

**[검색 요약] 카카오** — https://developers.kakao.com/docs/latest/ko/getting-started/app-key-migration · https://developers.kakao.com/docs/latest/ko/javascript/getting-started · https://developers.kakao.com/docs/latest/ko/kakaomap/common · https://developers.kakao.com/docs/latest/ko/getting-started/faq · https://developers.kakao.com/docs/latest/ko/tutorial/start · https://devtalk.kakao.com/t/api/140875 · https://devtalk.kakao.com/t/local-api-open-map-and-local/151696 · https://devtalk.kakao.com/t/faq-api/60356 · https://devtalk.kakao.com/t/topic/148977

**[검색 요약] 네이버** — https://www.dataeconomy.co.kr/news/articleView.html?idxno=42307 · https://waffleboard.io/blog/naver-search-api-hub-migration-guide (제3자) · https://keyword-lab-delta.vercel.app/guide/naver-api-hub (제3자) · https://velog.io/@windowook/오픈API-네이버-검색-API-사용하기 (제3자, 옛 등록 절차)

**[검색 요약] OpenWeather** — https://m.openweathermap.org/full-price · https://openweather.co.uk/appid · https://www.home-assistant.io/integrations/openweathermap (제3자)
