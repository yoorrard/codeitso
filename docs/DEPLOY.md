# 배포 안내 (사람이 할 일)

코드쇼퍼는 Cloudflare Workers 무료 플랜에 올린다: 정적 파일(`dist/`) + 익명 집계 `/api/event`(D1). 배포는 GitHub Actions(`.github/workflows/deploy.yml`)가 하고, 에이전트는 실제 배포·원격 D1·비밀 값 명령을 쓰지 않는다. 아래는 소유자가 한 번 하는 일이다. 다 하면 `main`에 합칠 때마다 자동으로 올라간다.

> 이 문서의 화면 이름과 권한 이름은 2026-10-12에 확인하지 못했다 (작업 환경에서 Cloudflare 문서에 닿지 않음). 화면이 다르면 가장 가까운 것을 고르고, 다른 점을 `docs/HUMAN.md`에 적어 주면 고친다.

## 1. 계정 (H01)

1. Cloudflare 계정을 만든다 (무료 플랜).
2. 대시보드 오른쪽(또는 Workers 개요)에서 **계정 ID(Account ID)**를 복사해 둔다.

## 2. API 토큰과 GitHub Secrets (H01b)

1. 내 프로필 → API 토큰 → 토큰 만들기 → '사용자 지정 토큰'.
2. 권한은 이 계정에만, 꼭 필요한 것만: **Workers 스크립트: 편집**, **D1: 편집** (Workers 하위 도메인을 처음 쓰면 **Workers 하위 도메인: 편집**이 더 필요할 수 있다).
3. GitHub 저장소 → Settings → Secrets and variables → Actions → **Secrets**에 넣는다:
   - `CLOUDFLARE_API_TOKEN` = 방금 만든 토큰
   - `CLOUDFLARE_ACCOUNT_ID` = 1단계의 계정 ID
4. 토큰은 저장소 파일·이슈·대화에 붙여 넣지 않는다.

## 3. D1 데이터베이스와 database_id

1. 대시보드 → Storage & Databases → D1 → 만들기. 이름은 **`code-chauffeur-events`**.
   (또는 내 컴퓨터에서 `npx wrangler login` 뒤 `npx wrangler d1 create code-chauffeur-events`)
2. 나온 **database_id**를 `wrangler.jsonc`의 `"database_id": ""` 자리에 넣고 커밋한다. 이 값은 비밀이 아니다 (CLAUDE.md 꼭 지킬 것 11). 에이전트에게 값을 알려 주면 대신 넣는다.
3. 표는 배포 작업이 `migrations/`로 만든다 (직접 만들 필요 없음).

## 4. 저장소 변수 (Variables, 비밀 아님)

GitHub 저장소 → Settings → Secrets and variables → Actions → **Variables**:

| 이름 | 값 | 없으면 |
|---|---|---|
| `SITE_STAGE` | `preview`(기본) 또는 `release` | 미리 보기 |
| `SITE_URL` | 사이트 주소 (예: `https://code-chauffeur.<하위도메인>.workers.dev`) | 대표 주소가 예시 주소로 나간다 |
| `CF_BEACON_TOKEN` | Web Analytics 사이트 토큰 (5단계) | 방문 통계를 싣지 않는다 |

## 5. 방문 통계 (선택, R-61)

1. 대시보드 → Web Analytics → 사이트 추가 → 사이트 주소 입력.
2. **자동 설치(automatic setup)는 끈다.** 자동으로 넣으면 도착 화면(`/arrival`, 영수증)에도 실려 R-04를 어긴다. 우리 사이트는 토큰만 받아 도착 화면을 빼고 직접 싣는다.
3. 보여 주는 코드 조각의 `"token": "…"` 값을 4단계 `CF_BEACON_TOKEN`에 넣는다.

## 6. 첫 배포와 확인 (T21 완성 확인)

1. `main`에 합치거나, Actions → deploy → Run workflow.
2. 끝나면 `https://code-chauffeur.<하위도메인>.workers.dev`에서:
   - 모든 화면 맨 위에 '검토 중인 시험판' 띠가 보인다.
   - 홈 → 목적지 → 경유지 → 점검 → 도착(영수증)까지 간다.
   - 옛 주소 하나(예: `/receipt`)를 열면 새 주소(`/arrival`)로 넘어간다 (`public/_redirects`의 301).
   - 방문 통계를 켰다면(5단계), 다른 화면에는 `cloudflareinsights` 스크립트가 있고 도착 화면의 페이지 소스에는 없다.
   - `/robots.txt`가 `Disallow: /`이다.
3. 집계가 쌓이는지 (운영자만): `npx wrangler d1 execute code-chauffeur-events --remote --command "SELECT * FROM daily_events ORDER BY day DESC LIMIT 20"`

## 7. 정식 출시 (T22)

1. C01(진열 상품 원문 대조)을 마쳐 `npm run validate:release`가 통과해야 한다.
2. 저장소 변수 `SITE_STAGE`를 `release`로 바꾸고 배포 작업을 돌린다. 띠와 `noindex`가 떨어지고 `robots.txt`가 열린다. release 검사가 실패하면 배포되지 않는다.
