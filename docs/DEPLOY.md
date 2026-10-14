# 배포 안내 (사람이 할 일)

코드쇼퍼는 **Cloudflare Workers 무료 플랜**에 올린다: 정적 파일(`dist/`) + 익명 집계 `/api/event`(D1). 저장소는 **비공개**로 두고, 배포는 Cloudflare의 **Workers Builds**(대시보드에서 GitHub 저장소를 한 번 연결)가 `main`에 푸시될 때마다 한다 (D72). 에이전트는 실제 배포·원격 D1·비밀 값 명령을 쓰지 않는다.

> 화면 이름은 2026-10-14에 공식 문서 검색 요약으로 확인했다(작업 환경에서 문서 페이지를 직접 열지 못함). 화면이 다르면 가장 가까운 것을 고르고, 다른 점을 `docs/HUMAN.md`에 적어 주면 고친다.

## 0. 왜 Cloudflare인가 (비용 비교, 2026-10-14)

| 안 | 하루 수천 명일 때 비용 | 책스책(booklogbook)에 주는 영향 | 코드쇼퍼에서 못 쓰게 되는 것 |
|---|---|---|---|
| **Cloudflare Workers 무료 + 비공개 저장소 (고름)** | **0원.** 정적 파일 요청은 무료·무제한이고 세지 않는다. Worker는 `/api/event`(`run_worker_first: ["/api/*"]`)에서만 돌고 하루 10만 요청까지 무료, D1 쓰기는 하루 10만 행까지 무료. 무료 플랜은 넘어도 청구되지 않는다 | 없음 (다른 계정·다른 서비스) | 없음 |
| Vercel Pro (지금 쓰는 팀) | 화면 하나에 요청 약 25개 → 하루 3,000명·8화면이면 한 달 약 1,800만 요청. Pro 포함분(1,000만)을 넘어 100만당 약 $2 | 같은 팀의 포함 사용량을 나눠 쓴다 | 없음 |
| Supabase Pro | 코드쇼퍼는 사용자 데이터베이스가 없어 필요 없다. 새 프로젝트를 만들면 컴퓨트가 따로 든다 | 같은 조직의 사용량 | — |
| GitHub Pages (공개 저장소) | 0원 | 없음 | 코드가 공개됨, 익명 집계·보안 머리글(`_headers`)·주소 넘기기(`_redirects`) 없음. 무료 요금제에서는 비공개 저장소에 Pages를 쓸 수 없다. 고르면 빌드 변수 `PUBLIC_BASE_PATH=/code-chauffeur` · `PUBLIC_HOST=static`(4단계 표, 설계서 9.5절) |

계산: 한 사람이 보내는 익명 이벤트는 5~8개(만들 앱 정하기 시작, 영수증 받음, AI에게 할 말 복사, 먼저 읽을 용어 다 읽음, 확인 문제)다. 하루 3,000명이면 약 2만 4천 요청·행 쓰기로 무료 한도(10만)의 4분의 1이다. 하루 1만 명을 넘어 한도에 닿아도 `/api/event`만 그날 멈추고(Worker는 저장이 실패해도 204로 끝낸다) 화면은 그대로 열린다.

비공개 저장소의 GitHub Actions는 무료 시간이 **월 2,000분**이다(공개 저장소는 무료). 그래서 `check` 작업은 `main` 푸시·PR에서만 e2e까지 돌리고, 작업 브랜치 푸시에서는 빠른 검사만 돌린다(새 푸시가 오면 앞 실행 취소). 배포는 Cloudflare 쪽 빌드(무료 플랜 월 3,000분)라 Actions 시간을 쓰지 않는다.

출처: [Workers 요금](https://developers.cloudflare.com/workers/platform/pricing/) · [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/) · [D1 요금](https://developers.cloudflare.com/d1/platform/pricing/) · [Workers Builds 한도](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/) · [Workers Builds 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) · [Vercel Pro](https://vercel.com/docs/plans/pro) · [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [GitHub 요금제](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)

## 1. 저장소를 비공개로 (H12)

1. GitHub 저장소 → **Settings** → **Pages** → 지금 켜진 Pages가 있으면 끈다(Source를 None으로, 또는 Unpublish). 비공개로 바꾸면 무료 요금제에서는 어차피 꺼진다.
2. **Settings** → **General** → 맨 아래 **Danger Zone** → **Change repository visibility** → **Make private** → 저장소 이름을 입력해 확인.

## 2. Cloudflare 계정 (H01)

1. Cloudflare 계정을 만든다 (무료 플랜, 카드 등록 필요 없음).

## 3. D1 데이터베이스 (한 번)

1. 대시보드 → **Storage & Databases** → **D1** → 만들기. 이름은 **`code-chauffeur-events`**.
2. 만든 데이터베이스의 **Console**에 `migrations/0001_events.sql` 내용을 붙여 넣고 실행한다 (표 하나를 만든다).
3. 나온 **database_id**를 `wrangler.jsonc`의 `"database_id": ""` 자리에 넣고 커밋한다. 이 값은 비밀이 아니다 (CLAUDE.md 꼭 지킬 것 11). 에이전트에게 값을 알려 주면 대신 넣는다.

## 4. 저장소 연결 (Workers Builds)

1. 대시보드 → **Workers & Pages** → **Create application** → **Import a repository** 옆 **Get started**.
2. GitHub 계정을 연결하고(Cloudflare GitHub 앱이 이 저장소에 접근하도록 허락, 비공개 저장소도 된다) `yoorrard/code-chauffeur`를 고른다.
3. 설정:
   - 프로젝트 이름: `code-chauffeur` (`wrangler.jsonc`의 `name`과 같게)
   - **Build command**: `npm run build:cf`
   - **Deploy command**: `npx wrangler deploy` (기본값 그대로. Wrangler는 `package.json`의 판을 쓴다)
   - 운영 브랜치: `main`
4. **빌드 변수**(Settings → Builds의 변수 칸. 비밀 아님):

   | 이름 | 값 | 없으면 |
   |---|---|---|
   | `PUBLIC_STAGE` | `preview`(기본) 또는 `release` | 미리 보기(바닥글의 시험판 줄·`noindex`) |
   | `PUBLIC_SITE_URL` | 사이트 주소, 끝 빗금과 하위 주소 없이 (예: `https://code-chauffeur.<하위도메인>.workers.dev`) | 대표 주소가 예시 주소로 나간다. **`release`면 빌드가 멈춘다** (`example`이 든 주소도) |
   | `PUBLIC_CONTACT_EMAIL` | 연락 메일 주소 (H22) | 소개 페이지의 '틀린 곳을 알려 주세요'와 [의견 보내기]를 그리지 않는다. **`release`면 빌드가 멈춘다** |
   | `PUBLIC_BASE_PATH` | 주소 바탕. Cloudflare는 비워 둔다(기본 `/`). GitHub Pages 프로젝트 사이트면 `/저장소 이름`(예: `/code-chauffeur`) | 루트(`/`)에서 연다. 꼴이 틀리면(끝 빗금, 대문자 등) 빌드가 멈춘다 |
   | `PUBLIC_HOST` | `cloudflare`(기본) 또는 `static` | `cloudflare`. 서버가 없는 곳(GitHub Pages)은 `static`: 익명 집계를 보내지 않고 방문 통계를 싣지 않으며, 개인정보 처리방침이 "이 주소에서는 세지 않아요"로 바뀐다 |
   | `PUBLIC_CF_BEACON_TOKEN` | Web Analytics 사이트 토큰 (5단계) | 방문 통계를 싣지 않는다 |
   | `NODE_VERSION` | `22` | 빌드 환경 기본 판 (Node 22.18 이상이 필요하다) |

   `PUBLIC_STAGE=release`인데 사이트 주소·연락 주소가 비었거나, 빌드 결과에 예시 주소(`codechauffeur.example`)·법 문서 초안 표시(`(초안)`·`검토 중인 초안`)가 남으면 빌드가 '빌드를 멈췄어요: …' 한 줄을 남기고 실패해 배포되지 않는다(L-04).

5. **Save and Deploy**. 이후 `main`에 푸시할 때마다 자동으로 올라간다.

## 5. 방문 통계 (선택, R-61)

1. 대시보드 → **Web Analytics** → 사이트 추가 → 사이트 주소 입력.
2. **자동 설치(automatic setup)는 끈다.** 자동으로 넣으면 설계도 받기 화면(`/arrival`, 영수증)에도 실려 R-04를 어긴다. 우리 사이트는 토큰만 받아 그 화면을 빼고 직접 싣는다.
3. 보여 주는 코드 조각의 `"token": "…"` 값을 4단계 `PUBLIC_CF_BEACON_TOKEN`에 넣는다.

## 6. 첫 배포와 확인 (T21 완성 확인)

`https://code-chauffeur.<하위도메인>.workers.dev`에서:
- 바닥글에 '시험판이에요' 줄이 보인다 (미리 보기 단계).
- 홈 → 만들 앱 정하기 → 도구 고르기 → 도구끼리 맞춰 보기 → 설계도 받기(영수증)까지 간다.
- 없는 주소(예: `/receipt`, v1 옛 주소. 공개 배포 전이라 T35에서 넘기기를 지웠다)를 열면 '길을 잘못 들었어요' 화면이 나온다.
- `/manifest.webmanifest`가 열리고 `start_url`이 `/`이다 (주소 바탕을 넣었으면 `/바탕/`).
- 방문 통계를 켰다면, 다른 화면에는 `cloudflareinsights` 스크립트가 있고 설계도 받기 화면의 페이지 소스에는 없다.
- `/robots.txt`가 `Disallow: /`이다 (미리 보기).
- 집계가 쌓이는지 (운영자만): D1 → `code-chauffeur-events` → Console에서 `SELECT * FROM daily_events ORDER BY day DESC LIMIT 20`.

## 7. 정식 출시 (T22)

1. C01(진열 상품 원문 대조)을 마쳐 `npm run validate:release`가 통과해야 한다.
2. 빌드 변수 `PUBLIC_STAGE`를 `release`로 바꾸고, `PUBLIC_SITE_URL`(최종 주소)·`PUBLIC_CONTACT_EMAIL`을 채운 뒤 다시 배포한다(대시보드에서 다시 배포하거나 `main`에 푸시). 시험판 줄과 `noindex`가 떨어지고 `robots.txt`가 열린다. release 검사(자료 `validate:release`, 빌드 지킴 L-04: 빈 주소·예시 주소·초안 표시)가 실패하면 빌드가 멈춰 배포되지 않는다.

## 예비 길: GitHub Actions로 배포

Workers Builds를 쓰지 못할 때만. `.github/workflows/deploy.yml`을 손으로 돌린다(Actions → deploy → Run workflow). 이 길은 저장소 Secrets(`CLOUDFLARE_API_TOKEN`: Workers 스크립트·D1 편집 권한, `CLOUDFLARE_ACCOUNT_ID`)와 Variables(`SITE_STAGE`, `SITE_URL`, `CF_BEACON_TOKEN`)를 쓰고, 비공개 저장소의 Actions 시간을 쓴다.
