# 배포 안내 (사람이 할 일)

코드쇼퍼는 **Cloudflare Workers 무료 플랜**에 올린다: 정적 파일(`dist/`) + 익명 집계 `/api/event`(D1). 저장소는 비공개로 둔다. 배포는 Cloudflare의 **Workers Builds**가 한다(D72). 대시보드에서 GitHub 저장소를 한 번 연결해 두면, 지켜보는 브랜치에 푸시될 때마다 빌드해서 올린다. 정식으로 공개하기 전까지 지켜보는 브랜치는 작업 브랜치(`claude/…`, 세션마다 바뀔 수 있음)이고, 11단계에서 `main`으로 바꾼다. 에이전트는 실제 배포·원격 D1·비밀 값 명령을 쓰지 않는다.

> 화면 이름과 동작은 2026-10-14에 Cloudflare 공식 문서 원본 저장소 `cloudflare/cloudflare-docs`의 파일로 확인했다. 파일과 그 파일을 마지막으로 고친 날은 맨 아래 '근거 문서'에 있다. 문서에 없는 동작은 이 저장소에 설치된 wrangler 4.141.0 코드로 확인했다. 문서끼리 이름이 다른 곳(**Save and Deploy**/**Deploy**, **Settings** → **Build**/**Builds**, **Variables & Secrets**/**Variables and secrets**/**Environment variables**, **Build variables and secrets**/**Build Variables and Secrets**)은 화면에서 가장 비슷한 이름을 고른다. 안내는 영어 화면을 기준으로 쓴다(화면 언어는 **Profile** → **Settings** → **Language**). 실제 화면이 다르면 다른 점을 `docs/HUMAN.md`에 적어 주면 고친다.
>
> '한눈에'부터 11단계까지의 글과 1~11단계 번호는 소유자에게 보낸 설정 안내(2026-10-14)와 같다. 그 부분은 소유자에게 하는 해요체이고, '저'는 에이전트다. `main`에 있는 이 파일은 그 전의 옛 판이다(0~7절, `/receipt`가 301로 넘어간다고 적힘). 작업 브랜치를 `main`에 합치기 전까지는 작업 브랜치의 이 판을 보고, 합치면 이 줄을 지운다.

## 0절. 비용: 왜 Cloudflare인가 (2026-10-14)

| 안 | 하루 수천 명일 때 비용 | 책스책(booklogbook)에 주는 영향 | 코드쇼퍼에서 못 쓰게 되는 것 |
|---|---|---|---|
| **Cloudflare Workers 무료 + 비공개로 둔 저장소 (고름)** | **0원.** 정적 파일 요청은 무료·무제한이고 세지 않는다. Worker는 `/api/event`(`run_worker_first: ["/api/*"]`)에서만 돌고 하루 10만 요청까지 무료, D1 쓰기는 하루 10만 행까지 무료 | 없음 (다른 계정·다른 서비스) | 없음 |
| Vercel Pro (지금 쓰는 팀) | 화면 하나에 요청 약 25개 → 하루 3,000명·8화면이면 한 달 약 1,800만 요청. Pro 포함분(1,000만)을 넘어 100만당 약 $2 | 같은 팀의 포함 사용량을 나눠 쓴다 | 없음 |
| GitHub Pages | 0원 | 없음 | 무료 요금제에서는 비공개로 둔 저장소에 쓸 수 없다. 익명 집계·보안 머리글(`_headers`)·주소 넘기기(`_redirects`) 없음. 고르는 일은 `docs/HUMAN.md` H13 |

**한도를 넘으면:** 카드를 넣지 않았고 유료 플랜(Workers Paid)도 아니라서 돈이 청구될 길이 없다. 공식 문서는 넘으면 오류가 난다고만 쓴다. Workers는 하루 요청 한도를 넘으면 오류 1027을 내고, `run_worker_first`로 Worker가 먼저 받는 요청(`/api/*`)에는 429를 낸다. D1은 무료 플랜에서 넘으면 오류만 나고, 유료로 올려야 한도가 풀린다.

**계산:** 한 사람이 보내는 익명 이벤트는 몇 개다(장바구니 담기, 계산, .md 받기·복사, 스타터 키트 담기 — v5, D110~D113). 하루 3,000명이면 약 2만 4천 요청·행 쓰기로, 무료 한도(10만)의 4분의 1이다. 하루 1만 명을 넘어 한도에 닿아도 `/api/event`만 그날 멈추고(Worker는 저장이 실패해도 204로 끝낸다) 화면은 그대로 열린다.

**빌드 시간:** 비공개로 둔 저장소의 GitHub Actions 무료 시간은 월 2,000분이다. 그래서 `check` 작업은 `main` 푸시·PR에서만 e2e까지 돌리고, 작업 브랜치 푸시에서는 빠른 검사만 돌린다(새 푸시가 오면 앞 실행을 취소). 배포 빌드는 Cloudflare 쪽(무료 플랜 월 3,000분, 한 번에 하나씩)이라 Actions 시간을 쓰지 않는다. 빌드 시간을 아끼는 법은 맨 아래 '에이전트 메모'에 있다.

출처: [Workers 요금](https://developers.cloudflare.com/workers/platform/pricing/) · [Workers 한도](https://developers.cloudflare.com/workers/platform/limits/) · [D1 요금](https://developers.cloudflare.com/d1/platform/pricing/) · [Workers Builds 한도](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/) · [Workers Builds 설정](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) · [Vercel Pro](https://vercel.com/docs/plans/pro) · [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) · [GitHub 요금제](https://docs.github.com/en/get-started/learning-about-github/githubs-plans). 원본 파일과 고친 날은 '근거 문서'의 '비용·한도' 줄.

## 저장소 비공개 (H12)

저장소는 이미 비공개다(2026-10-14 GitHub REST API 응답 `private: true`). 같은 응답의 `has_pages`도 `false`라 켜진 Pages는 없어 보인다. 남은 일은 눈으로 한 번 확인하는 것 하나다.

1. GitHub 저장소 → **Settings** → **Pages**를 열어 켜진 Pages가 없는지 본다. 켜져 있으면 끈다(**Source**를 **None**으로, 또는 **Unpublish**).

알아 둘 것: 비공개로 돌리기 전에 만들어진 포크와 받아 간 사본은 그대로 남는다(되돌릴 수 없음).

---

## 한눈에

- **하는 일:** Cloudflare에 작은 데이터베이스를 하나 만들고, GitHub 저장소를 Cloudflare에 연결해요. 그러면 제가 작업을 올릴 때마다 사이트가 저절로 새로 만들어져요.
- **순서:** 1~3단계 → 4단계(번호를 대화창에 보내기) → 5~7단계 → 대화창에 "다 했어요, 빌드 돌려 줘"라고 쓰기 → 제가 빌드를 돌리고 끝났다고 알려 드리면 8단계 확인 → 결과를 대화창에 알려 주기. **10·11단계는 지금 하지 않아요.**
- **시간:** 직접 하는 일은 40분쯤 걸려요. 기다리는 시간이 10분쯤 더 들어요.
- **비용:** 0원이에요. 무료 플랜이라 카드를 넣지 않아요. 방문이 많아도 무료 한도 안에서 돌아요. 한도를 넘으면 그날만 방문 횟수 세기가 잠시 멈추고, 화면은 그대로 열려요. 돈은 나가지 않아요.
- **어느 단계에서든** 카드 번호를 묻거나 **Upgrade**·**Purchase**·**Paid** 같은 말이 나오면 누르지 마세요. 창을 닫고 저에게 알려 주세요.

## 읽는 법

- **대화창**은 저(Claude)와 이야기하던 창이에요. "알려 주세요"는 모두 그 대화창에 써 달라는 뜻이에요.
- 컴퓨터 브라우저(크롬 등)에서 하세요. 휴대폰으로는 하지 마세요.
- **→**는 차례로 눌러 들어가라는 뜻이에요. 버튼이 안 보이면 화면을 아래로 내려 보세요.
- 회색 칸 안의 글자(예: `code-chauffeur`)는 손으로 치지 말고 복사해 붙여 넣으세요. 앞뒤에 빈칸이 붙지 않게 조심하세요.
- 굵은 영어 글씨는 화면에 보이는 이름이고, 괄호 안은 뜻풀이예요. 화면 이름이 조금 달라도 가장 비슷한 것을 고르세요.
- **(확인 필요)**가 붙은 곳은 화면 이름이나 자리가 다를 수 있어요. 비슷한 것이 안 보이면 멈추고 화면을 캡처해서(윈도: Win+Shift+S, 맥: Cmd+Shift+4) 대화창에 붙여 넣어 주세요.
- 화면 이름은 2026-10-14에 Cloudflare 공식 문서 원본에서 확인했어요. 근거는 맨 아래에 모았어요(읽지 않아도 돼요).

자주 나오는 말:
- **빌드**: 저장소의 코드를 사이트 파일로 만드는 일
- **배포**: 만든 사이트를 인터넷에 내놓는 일
- **로그**: 빌드하면서 찍히는 기록 글
- **브랜치**: 코드의 작업 줄기. 지금 만드는 화면은 `claude/focused-bell-a92t1m` 줄기에 있어요
- **Worker**: Cloudflare에서 사이트 하나를 내보내는 단위
- **하위 도메인**: 내 계정에 붙는 주소 이름. 사이트 주소 가운데에 들어가요
- **드롭다운**: 눌러서 펼치는 고르기 목록
- **PR**: GitHub에서 "이 바뀐 내용을 합쳐 주세요"라고 하는 요청

## 하지 말 것 (시작 전에 읽어 주세요)

- **API 토큰 값**은 저장소, GitHub, 문서, 대화창 어디에도 붙이지 마세요. API 토큰은 **My Profile** → **API Tokens**에 있는 긴 비밀 글자예요. 데이터베이스 번호(4단계)와 방문 통계 번호(10단계)는 비밀이 아니라서 보내도 괜찮아요.
- 유료 플랜(**Workers Paid**, 한 달 5달러부터)으로 바꾸지 마세요. 카드도 등록하지 마세요.
- 도메인(내 주소)을 사는 것, R2(파일 보관 기능), 그 밖에 결제를 묻는 기능은 켜지 마세요. 필요해지면 제가 먼저 말할게요.
- **Enable Preview Builds**(미리 보기 빌드)를 켜지 마세요. 지금 설정 파일로는 실패하고 빌드 시간만 써요.
- 화면 위쪽에 **Switch to Worker Previews**라고 쓰인 알림 막대나 버튼이 보여도 누르지 마세요. 되돌릴 수 없어요.
- Cloudflare가 GitHub에 저절로 연 PR을 합치지 마세요. 보이면 그대로 두고 알려 주세요.
- GitHub 저장소의 기본 브랜치를 바꾸지 마세요.
- Worker 이름(`code-chauffeur`)과 데이터베이스 이름(`code-chauffeur-events`)을 바꾸지 마세요. 같은 데이터베이스를 또 만들지도 마세요. 무료로는 10개까지만 만들 수 있어요.
- 빌드 변수 `PUBLIC_STAGE`를 지금 `release`로 바꾸지 마세요. 빌드가 멈춰요.

알아 둘 것:
- 빌드 시간은 무료로 한 달 3,000분이에요. 제가 하루에 수십 번 올리면 빠듯할 수 있어서, 올리는 횟수를 모아서 줄일게요. 가끔 빌드 기록(9단계 '로그 보는 곳')에서 한 번에 몇 분 걸리는지 봐 주세요.
- 빌드 기록에 건너뛴 빌드(Canceled·Skipped 같은 말)가 보여도 고장이 아니에요. 새 빌드가 들어오면 기다리던 옛 빌드는 저절로 건너뛰어요.

## 왜 작업 브랜치를 올리나요 (읽기만 하세요. 할 일 없음)

- `main`에는 예전 화면만 있어요. 지금 만드는 화면은 작업 브랜치 `claude/focused-bell-a92t1m`에 있어요.
- 그래서 정식으로 공개하기 전까지는 이 작업 브랜치를 사이트에 올려요. 제가 올릴 때마다 몇 분 뒤 같은 주소에 새 화면이 나와요.
- 사이트에는 제가 GitHub에 올린 것까지만 나와요. 제가 아직 만들고 있는 부분은 올린 뒤에 보여요.

---

## 1단계. 로그인하고 내 주소 이름 확인하기 (5분)

1. **가입 확인 메일:** Cloudflare에 가입할 때 확인 메일이 왔어요. 메일 속 링크를 아직 안 눌렀다면 눌러 주세요(스팸함도 보세요).
   - 메일을 못 찾으면 https://dash.cloudflare.com/profile 을 열고 **Email Address** 옆 **Send verification email**을 눌러요.
   - 이 버튼이 없거나 메일 주소 뒤에 `(verified)`가 붙어 있으면 이미 확인된 거예요.
   - 확인하지 않으면 첫 배포가 막힐 수 있어요.
2. **화면 언어:** 이 안내는 영어 화면을 기준으로 써 있어요. 화면이 한국어로 보이면 같은 프로필 화면(https://dash.cloudflare.com/profile)의 **Settings** 아래 **Language**에서 **English**를 골라요. 한국어 화면에서는 '설정', '언어'처럼 보일 거예요 (확인 필요). 고르면 화면이 바로 바뀌어요.
3. 처음 들어가면 도메인을 추가하라는 화면이 나올 수 있어요. 추가하지 말고 4번의 주소를 바로 여세요.
4. **Workers & Pages** 화면을 열어요: https://dash.cloudflare.com/?to=/:account/workers-and-pages
   - 왼쪽 메뉴로 가려면 **Compute & AI** → **Workers & Pages**예요.
   - 공식 문서를 보면 이 화면을 처음 열 때 하위 도메인이 저절로 만들어져요.
5. 화면에서 **Your subdomain**(내 하위 도메인)을 찾아요. 계정 정보 칸(**Account Details**)에 있을 거예요 (확인 필요). 옆에 `무엇무엇.workers.dev`가 보이면 그 앞부분을 적어 두세요. 이 안내에서는 이 글자를 **〈내 하위 도메인〉**이라고 불러요.
   - 예: 화면에 `hong-gil.workers.dev`가 보이면 〈내 하위 도메인〉은 `hong-gil`이고, 사이트 주소는 `https://code-chauffeur.hong-gil.workers.dev`예요.
6. 그 이름이 메일 주소 앞부분처럼 남에게 보이기 싫은 것이면 지금 바꿔요. 첫 배포 뒤에 바꾸면 사이트 주소도 바뀌어요.
   - **Your subdomain** 옆 **Change**(바꾸기)를 눌러요.
   - 영문 소문자, 숫자, `-`만 써서 새 이름을 넣고 저장 버튼을 눌러요. 확인 창이 나오면 한 번 더 눌러요.
   - '이미 있다'는 말이 나오면 뒤에 숫자를 붙여요(예: `hong-gil-7`).
   - 바뀐 이름을 다시 적어 두세요.
7. **Your subdomain**이 안 보이면 다음 단계로 가지 마세요. 하위 도메인이 없으면 첫 배포가 실패해요.
   - 화면을 새로 고침(F5) 해 봐요.
   - 그래도 없으면 https://dash.cloudflare.com/?to=/:account/workers/onboarding 을 열어 하위 도메인을 정해요.
   - 그래도 안 되면 화면을 캡처해 대화창에 보내 주세요.

## 2단계. 데이터베이스(D1) 만들기 (3분)

D1은 Cloudflare의 작은 데이터베이스예요. 코드쇼퍼는 여기에 '오늘 설계도가 몇 번 나갔나' 같은 횟수만 세요. 누가 왔는지는 남기지 않아요.

1. D1 화면을 열어요: https://dash.cloudflare.com/?to=/:account/workers/d1
   - 왼쪽 메뉴로 가려면 **Storage & databases** → **D1 SQL database**예요.
2. **Create Database**(데이터베이스 만들기)를 눌러요. **Create database**로 쓰여 있기도 해요.
3. 이름 칸에 `code-chauffeur-events`를 붙여 넣어요. 칸에 원래 글이 있으면 지우고 넣어요.
   - 설정 파일에 적힌 이름과 똑같아야 해요. 다르면 배포 도구가 같은 이름의 데이터베이스를 하나 더 만들어서 횟수가 둘로 나뉠 수 있어요.
4. **Location**(위치)과 **Data location**(자료 보관 지역)은 손대지 말고 그대로 둬요. **Data location**은 만든 뒤에 바꿀 수 없어요.
5. **Create**(만들기)를 눌러요.

**잘 됐으면:** `code-chauffeur-events` 화면이 열려요.

## 3단계. 표 만들기: 명령 글 붙여 넣기 (3분)

1. `code-chauffeur-events` 화면에서 **Console**(명령을 넣는 창) 탭을 눌러요.
2. 글 쓰는 칸을 한 번 누르고, 원래 있던 글은 모두 지워요(Ctrl+A를 누르고 Delete. 맥은 Cmd+A).
3. 아래 글을 통째로 복사해 붙여 넣어요.

```sql
CREATE TABLE IF NOT EXISTS daily_events (
  day    TEXT    NOT NULL,
  type   TEXT    NOT NULL,
  bucket TEXT    NOT NULL DEFAULT '',
  count  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, type, bucket)
);
```

4. 붙여 넣은 글의 첫 줄이 `CREATE TABLE`로 시작하고 마지막 줄이 `);`로 끝나는지 봐요.
5. **Execute**(실행)를 눌러요. 빨간 글이 나오지 않으면 된 거예요.
6. **Tables**(표 목록) 탭을 눌러 `daily_events`가 보이면 다 됐어요. 아직은 빈 표예요.

**다르게 보이면:**
- 빨간 글이 나오면 2~5번을 한 번 더 해요. 두 번 실행해도 괜찮아요. 표가 이미 있으면 건너뛰도록 써 두었어요.
- 두 번 해도 빨간 글이 나오면 그 글을 복사해 대화창에 보내 주세요.
- 이 표가 없어도 사이트 화면은 열려요. 방문 횟수만 저장되지 않아요.

## 4단계. 데이터베이스 번호를 대화창에 보내기 (2분)

1. `code-chauffeur-events` 화면에서 **Database ID**(데이터베이스 번호)를 찾아요 (확인 필요).
   - `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`처럼 생긴 36글자예요. 영문 소문자와 숫자가 `-`로 이어져 있어요.
   - 옆에 복사 아이콘이 있으면 눌러요. 없으면 마우스로 끌어 고르고 Ctrl+C(맥은 Cmd+C)를 눌러요.
   - 못 찾으면 화면 전체를 캡처하거나, 주소창의 주소를 통째로 복사해 보내 주세요.
2. 대화창에 붙여 넣어 주세요. **비밀 값이 아니에요.** 이 번호만으로는 아무것도 할 수 없어요.
3. 받으면 제가 이 번호를 설정 파일에 넣어 작업 브랜치에 올리고 "넣었어요"라고 답할게요. 5단계까지 끝나 있으면 이 올리기로 빌드가 저절로 한 번 돌아요.

**왜 필요한가요:** 이 번호가 설정에 들어가야 사이트가 데이터베이스를 찾아요. 번호가 없으면 사이트 전체가 올라가지 못할 수 있어요.

제 답을 기다리지 말고 5단계로 가도 돼요.

## 5단계. GitHub 저장소를 연결해 Worker 만들기 (15분)

1. **Workers & Pages** 화면(https://dash.cloudflare.com/?to=/:account/workers-and-pages)에서 **Create application**(앱 만들기) 버튼을 눌러요. 화면 위쪽에 있을 거예요 (확인 필요).
   - Worker가 하나도 없으면 2번의 고르는 화면이 바로 나올 수 있어요. 그러면 2번으로 가요.
   - **Pages**라고 쓰인 탭이나 버튼은 누르지 마세요. 이 안내에서는 **Import a repository**만 써요.
2. **Import a repository**(저장소 가져오기) 옆 **Get started**를 눌러요.
3. **Git account**(Git 계정)에서 GitHub를 골라요. 처음이면 **+ Add account** 버튼이 보여요. 누르면 GitHub 창이 열려요.
   - 아무 창도 안 뜨면 주소창 오른쪽의 팝업 차단 표시를 눌러 허용하고 다시 눌러요.
   - GitHub 로그인 화면이 나오면 `yoorrard` 계정으로 로그인해요.
4. GitHub 창에서 **Cloudflare Workers and Pages** 앱을 설치해요.
   - 계정을 고르는 화면이 나오면 `yoorrard`를 눌러요.
   - 이 앱이 할 수 있는 일의 목록이 나와요. 코드를 읽어 사이트를 만들고 빌드 결과를 GitHub에 표시하려고 받는 허락이라 괜찮아요.
   - **Repository access**(저장소 접근)에서 **Only select repositories**(고른 저장소만)를 골라요.
   - 그 아래 **Select repositories**(저장소 고르기)를 누르고, 검색 칸에 `code-chauffeur`를 써서 목록에 나온 것을 눌러요.
   - 아래에 `code-chauffeur` 하나만 보이는지 확인해요. 다른 저장소(책스책 등)까지 열어 줄 필요는 없어요.
   - **Install & Authorize**(설치하고 허락하기)를 눌러요. **Authorize** 버튼이 한 번 더 나오면 그것도 눌러요. GitHub 비밀번호나 2단계 인증을 물으면 넣어요.
   - 끝나면 GitHub 창이 닫혀요. 안 닫히면 직접 닫고 Cloudflare 탭으로 돌아와요.
5. Cloudflare 화면의 목록에서 `code-chauffeur`를 골라요. 검색 칸을 써도 돼요. 비공개로 둔 저장소여도 괜찮아요.
   - 목록에 없으면 https://github.com/settings/installations 를 열어요. **Cloudflare Workers and Pages** 옆 **Configure**를 누르고, **Repository access**에 `code-chauffeur`가 들어 있는지 보고 저장해요. 그다음 Cloudflare 화면을 새로 고침해요.
6. 설정 화면이 나오면 아래 표대로 넣어요.
   - 칸에 원래 글이 있으면 모두 지우고 표의 글로 바꿔요. 이미 같으면 그대로 둬요.
   - 칸 이름은 화면마다 조금 달라요. 표에는 있는데 화면에 없는 칸은 건너뛰어요.
   - **Advanced settings**(고급 설정)는 눌러서 펼쳐야 안의 칸이 보여요.

| 칸 | 넣을 것 |
|---|---|
| 이름 (**Project name** 또는 **Worker name**) | `code-chauffeur` |
| **Build command**(빌드 명령) | `npm run build:cf` |
| **Deploy command**(배포 명령) | `npx wrangler deploy` |
| **Git branch**(지켜볼 브랜치) | `claude/focused-bell-a92t1m` |
| **Enable Preview Builds**(미리 보기 빌드 켜기) | 꺼 두기 |
| **Preview command** | 그대로 두기 |
| **Path** 또는 **Root directory** (Advanced settings 안) | 비었거나 `/`면 그대로 두기. 다른 글이면 지우기 |
| **API token** | 그대로 두기 (**Create new token**) |
| **Build variables and secrets** | 여기서는 넣지 않기 (7단계에서 넣어요) |

   - **이름:** 한 글자라도 다르면 빌드가 실패하거나, 사이트가 다른 주소로 올라가요. 이름을 바꾸자는 PR이 열릴 수도 있어요. 그 PR은 합치지 말고 알려 주세요.
   - **Git branch:** 드롭다운을 누르고 `focused`를 쳐서 찾아요. 목록에 없으면 `main`인 채로 두고 대화창에 "브랜치가 목록에 없어요"라고 알려 주세요. 칸이 아예 없으면 6단계에서 바꿔요.
   - **Enable Preview Builds:** 네모 안에 ✓ 표시가 있으면 눌러서 빈 네모로 만들어요. 스위치 모양이면 꺼진 쪽(회색)으로 둬요. 예전 이름인 **Builds for non-production branches**로 보일 수도 있어요.
7. **Save and Deploy** 또는 **Deploy**를 눌러요. 문서마다 이름이 달라서, 화면에 있는 쪽을 누르면 돼요.

**잘 됐으면:** 빌드 화면으로 넘어가고 로그가 흘러요. 몇 분 걸려요.
- 글이 멈추고 성공이나 실패 표시가 나오면 끝난 거예요. 표시 이름은 문서에 없어요(Success나 Failed 같은 말일 거예요).
- 창을 닫아도 빌드는 계속돼요.
- **결과와 상관없이 6단계로 가요.** 이 첫 빌드는 실패해도 괜찮아요. 아직 데이터베이스 번호와 7단계 설정이 없을 수 있거든요. 4·6·7단계가 끝나면 해결돼요.

## 6단계. 지켜볼 브랜치를 작업 브랜치로 맞추기 (3분)

1. **Workers & Pages** → `code-chauffeur` → **Settings**(설정) 탭으로 가요.
2. 화면을 내려 **Build**(빌드) 칸을 찾고, 그 안의 **Branch control**(브랜치 관리)을 봐요. **Build**가 **Builds**로 쓰여 있기도 해요.
3. 드롭다운에서 `claude/focused-bell-a92t1m`을 골라요. `focused`를 쳐서 찾으면 쉬워요.
   - 5단계에서 이미 골랐으면 맞게 들어갔는지만 봐요.
   - 목록에 없으면 대화창에 "브랜치가 목록에 없어요"라고 알려 주세요.
4. 같은 곳의 **Enable Preview Builds**가 꺼져 있는지(빈 네모인지) 봐요.
5. 저장 버튼을 눌러요. 저장만 하고 7단계로 가요.

**알아 둘 것:** 제가 새 대화에서 일을 이어 가면 이 브랜치 이름이 바뀔 수 있어요. 바뀌면 제가 먼저 알려 드릴게요. 이 칸만 새 이름으로 바꾸면 돼요. 사이트가 며칠째 그대로라면 이 칸을 의심하고 저에게 물어봐 주세요.

## 7단계. 빌드 변수 넣기 (5분)

빌드 변수는 빌드할 때만 읽는 설정 값이에요. 아래 값은 모두 비밀이 아니에요.

1. 같은 **Settings** → **Build** 칸에서 **Build variables and secrets**(빌드 변수와 비밀 값)를 찾아요. **Build Variables and Secrets**로 쓰여 있기도 해요.
   - 이름이 비슷한 **Variables & Secrets**(또는 **Variables and secrets**, **Environment variables**)는 다른 칸이에요. 사이트가 돌아갈 때 쓰는 칸이라, 여기에 넣으면 빌드가 값을 읽지 못해요.
2. 더하기 버튼(**+ Add** 같은 이름)을 누르면 이름 칸과 값 칸이 한 줄 생겨요 (확인 필요). 왼쪽에는 이름, 오른쪽에는 값을 넣어요.
   - 종류를 고르는 칸이 있으면 **Text**(글자)를 골라요.
   - 이름은 대문자와 밑줄(`_`)까지 똑같이 붙여 넣어요.
3. 아래 다섯 줄을 넣어요.

| 이름 | 값 |
|---|---|
| `NODE_VERSION` | `22` |
| `PUBLIC_STAGE` | `preview` |
| `PUBLIC_SITE_URL` | `https://code-chauffeur.〈내 하위 도메인〉.workers.dev` |
| `ASTRO_TELEMETRY_DISABLED` | `1` |
| `WRANGLER_SEND_METRICS` | `false` |

   - `PUBLIC_SITE_URL`은 〈내 하위 도메인〉 자리에 1단계에서 적은 글자를 넣어요. 〈 〉 기호는 빼고, 끝에 `/`를 붙이지 않아요. 예: `https://code-chauffeur.hong-gil.workers.dev`. 하위 도메인을 모르면 이 줄만 비워 두세요.
4. 다 넣었으면 저장 버튼을 눌러요.

**왜 넣나요 (읽지 않아도 돼요):**
- `NODE_VERSION`: 빌드 도구의 판을 우리가 시험해 본 판(22)으로 맞춰요.
- `PUBLIC_STAGE`: 바닥글의 '시험판이에요' 줄과 검색 막기를 켜요. 지금은 빼도 결과가 같지만, 정식으로 공개할 때 이 값만 바꾸면 되도록 미리 넣어 둬요.
- `PUBLIC_SITE_URL`: 페이지마다 적히는 대표 주소예요. 비우면 예시 주소가 들어가요.
- 나머지 두 줄: 빌드 도구들이 사용 통계를 보내지 않게 해요.

**넣지 않는 것:** 아래 이름들은 지금 넣지 마세요.
- `PUBLIC_CONTACT_EMAIL`(연락받을 메일): 정식으로 공개할 때 제가 말하면 넣어요.
- `PUBLIC_CF_BEACON_TOKEN`(방문 통계): 10단계에서 넣어요.
- `PUBLIC_BASE_PATH`, `PUBLIC_HOST`: Cloudflare에서는 쓰지 않아요. 넣으면 사이트 일부가 꺼질 수 있어요.

### 다 됐으면 대화창에 알려 주세요

아래 셋이 모두 됐으면 대화창에 **"다 했어요, 빌드 돌려 줘"**라고 써 주세요.

- [ ] 4단계 번호를 보냈고, 제가 "넣었어요"라고 답했어요
- [ ] 6단계에서 브랜치를 `claude/focused-bell-a92t1m`으로 맞추고 저장했어요
- [ ] 7단계 변수 다섯 줄을 저장했어요

그러면 제가 작업 브랜치에 올려서 새 설정으로 빌드를 돌리고, 끝나면 결과를 알려 드릴게요. 그 사이에 빌드가 저절로 한 번 더 돌 수도 있어요. 신경 쓰지 않아도 돼요.

## 8단계. 사이트를 열어 확인하기 (10분)

제가 "빌드가 끝났어요"라고 하면 확인해 주세요.

- **사이트 주소:** `https://code-chauffeur.〈내 하위 도메인〉.workers.dev`
- 이 주소는 빌드 로그 끝쪽에도 찍혀요. Worker 화면의 **Domains** 탭 → **Worker URL**에서도 볼 수 있어요. **Domains** 탭이 없으면 **Settings** → **Domains & Routes**에 있어요.
- 사이트를 열어서 즐겨찾기(Ctrl+D, 맥은 Cmd+D) 해 두세요.

확인할 것:
- [ ] **1.** 사이트 주소를 열면 홈이 나와요.
- [ ] **2.** 맨 아래 바닥글에 **'시험판이에요. 도구 정보가 바뀔 수 있어요.'**가 보여요.
- [ ] **3.** 홈 → 카테고리 → 재료 몇 개 담기(메모 포함) → 장바구니 → 계산 → 영수증에서 .md 받기까지 끝까지 가 봐요.
- [ ] **4. 새 화면인지 확인:** 홈 제목이 '코드쇼퍼: 바이브코딩 재료 쇼핑몰'이고 머리줄에 장바구니 로고가 보이면 v5 화면이다.
- [ ] **5.** 휴대폰으로도 열어 봐요. 카카오톡 '나와의 채팅'에 주소를 보낸 뒤 휴대폰에서 누르면 쉬워요.
- [ ] **6.** (선택) 방문 횟수가 쌓이는지 확인하기:
  - 시크릿 창(크롬: Ctrl+Shift+N, 맥: Cmd+Shift+N)에서 사이트를 열어요.
  - 카테고리에 들어가 재료 하나를 [담기]로 담아요. 화면만 열면 세지 않아요.
  - D1 → `code-chauffeur-events` → **Console**에 아래 글을 붙여 넣고 **Execute**를 눌러요.

    ```sql
    SELECT * FROM daily_events ORDER BY day DESC LIMIT 20;
    ```

  - `cart_add` 줄이 보이면 돼요(v5 S2부터 이벤트는 cart_add·checkout·md_download·md_copy·bundle_add). 안 보이면 알려 주세요.
- [ ] **7.** (선택, 기술 확인) `…workers.dev/robots.txt`를 열면 `Disallow: /` 줄이 있어요. 검색에 나오지 않게 막는 줄이에요. `…workers.dev/manifest.webmanifest`를 열면 `"start_url": "/"` 줄이 있어요.

**다 맞으면** 대화창에 "확인 끝"이라고 써 주세요. 다른 칸이 있으면 몇 번 칸이 어떻게 달랐는지 쓰거나 캡처를 보내 주세요.

이 주소는 아는 사람이면 누구나 열 수 있어요. 다만 검색 결과에는 나오지 않아요.

## 9단계. 빌드가 실패할 때

**로그 보는 곳:** **Workers & Pages** → `code-chauffeur` → **Deployments**(배포) 탭 → 맨 아래 **View build history**(빌드 기록 보기)로 가요. 실패한 빌드를 누르면 로그가 나와요.

**로그 보내는 법:** 로그 맨 아래로 내려요. 빨간 글이 처음 보이는 곳부터 맨 끝까지 마우스로 끌어 고르고 Ctrl+C(맥은 Cmd+C)를 눌러요. 복사 버튼이 있으면 그걸 써요. 어려우면 화면 캡처를 보내 주세요. 대화창에 붙여 넣어 주시면 원인을 찾아 알려 드릴게요.

**고친 뒤에는** 대화창에 "고쳤어요, 빌드 돌려 줘"라고 써 주세요. 제가 빌드를 다시 돌릴게요.

로그에서 아래 말이 보이면 이렇게 해요.

| 로그에 보이는 말 | 뜻 | 할 일 |
|---|---|---|
| `You need to register a workers.dev subdomain` 또는 `register a workers.dev subdomain here` | 하위 도메인이 없어요 | 1단계 7번을 하고 알려 주세요 |
| `Please verify your account's email address` | 가입 확인 메일을 아직 안 눌렀어요 | 1단계 1번을 하고 알려 주세요 |
| `You must use a real database in the database_id configuration`, `must have a valid id specified`, `Skipping automatic provisioning` | 데이터베이스 번호가 들어가지 않은 코드로 빌드했어요 | 4단계 번호를 보냈는지, 6단계 브랜치가 맞는지 보고 알려 주세요 |
| `must match the name of your Worker` 또는 `Failed to match Worker name` | 5단계 이름 칸이 `code-chauffeur`가 아니에요 | 알려 주세요. Cloudflare가 연 PR은 합치지 말고 그대로 둬요 |
| `빌드를 멈췄어요: …`로 시작하는 한국어 줄 | 우리 빌드가 스스로 멈췄어요. 7단계 값의 모양이 틀렸을 때 나와요 | 그 줄을 보내 주세요 |
| `Build was timed out` | 빌드가 20분을 넘었어요 | 알려 주세요 |
| `build token ... has been deleted or rolled` | 빌드용 열쇠(토큰)를 쓸 수 없어요 | 알려 주세요. 새 열쇠를 만드는 순서를 함께 볼게요 |

**빌드는 됐는데 빈 화면이나 404가 나오면:** **Settings** → **Build**에서 **Build command**가 `npm run build:cf`인지 봐요. 다르면 편집(연필) 버튼을 눌러 바꾸고 저장한 뒤 알려 주세요. 같은데도 빈 화면이면 화면 캡처를 보내 주세요.

**빌드 열쇠에 데이터베이스 권한 더하기 (제가 "토큰 권한이에요"라고 말한 뒤에만 하세요)**

Cloudflare가 자동으로 만든 빌드 열쇠(API 토큰)에는 문서상 데이터베이스(D1) 권한이 없어요. 4단계 번호를 넣으면 대개 괜찮지만, 그래도 막히면 이 일을 부탁드릴 수 있어요. 로그만 보고 스스로 판단해서 하지는 마세요.

1. https://dash.cloudflare.com/profile/api-tokens 를 열어요(**My Profile** → **API Tokens**).
2. 목록에서 Worker를 연결한 날 만들어진 토큰을 찾아요. 토큰 이름은 문서에 나와 있지 않아요. 헷갈리면 목록을 캡처해 보내 주세요.
3. 그 줄의 메뉴(점 세 개 등)에서 편집(**Edit**)을 골라요 (확인 필요).
4. **Permissions**(권한) 아래에서 줄을 더하는 버튼을 눌러요. 원래 있던 줄은 그대로 둬요.
5. 새 줄의 칸 세 개를 차례로 골라요. 첫 칸은 **Account**, 둘째 칸은 **D1**, 셋째 칸은 **Edit**예요.
6. **Continue to summary**를 누르고, 다음 화면에서 저장 버튼을 눌러요.
7. 긴 토큰 값이 화면에 나오면 복사하지 말고 창을 닫아요.
8. 대화창에 "권한 더했어요"라고 알려 주세요.

## 10단계 (선택, 나중에). 방문 통계 Web Analytics

Web Analytics는 무료예요. 쿠키를 쓰지 않고, 방문자가 누구인지 알아내지 않아요. 제가 "이제 해도 돼요"라고 말한 뒤에 해요.

1. Web Analytics 화면을 열어요: https://dash.cloudflare.com/?to=/:account/web-analytics
   - 왼쪽 메뉴로 가려면 **Analytics & logs** → **Web analytics**예요.
2. **Add a site**를 눌러요.
3. **Set up hostname** 칸에 `code-chauffeur.〈내 하위 도메인〉.workers.dev`를 써요(〈 〉 자리에는 1단계에서 적은 글자).
4. 아래에 나타나는 상자에서 방금 쓴 이름을 누르고 **Done**을 눌러요.
   - 오류가 나거나 고를 이름이 나오지 않으면 그만두고 알려 주세요. Web Analytics가 workers.dev 주소를 받아 주는지는 문서에 나와 있지 않아요.
5. **Manage site**에서 코드 조각(JS snippet)을 찾아요. 그중 `"token": "…"` 부분의 따옴표 안 값만 복사해요.
   - 이 token은 방문 통계용 공개 번호예요. '하지 말 것'에 나온 API 토큰(비밀 값)과 달라서 빌드 변수에 넣어도 돼요.
6. 7단계처럼 빌드 변수에 한 줄을 더해요. 이름은 `PUBLIC_CF_BEACON_TOKEN`, 값은 5번에서 복사한 것이에요. 저장해요.
7. 대화창에 "통계 번호 넣었어요, 빌드 돌려 줘"라고 써 주세요.
8. 빌드가 끝나면 확인해요.
   - 홈 화면에서 Ctrl+U(맥은 Cmd+Option+U)를 누르면 페이지 소스가 새 탭에 열려요. Ctrl+F(맥은 Cmd+F)로 `data-cf-beacon`을 찾으면 하나가 나와야 해요.
   - 영수증 화면(`…workers.dev/receipt`)의 소스에서는 `data-cf-beacon`이 나오지 않아야 해요.
   - 몇 분 뒤 Web Analytics에 방문이 잡히는지 봐요.

알아 둘 것:
- **자동 설치는 쓰지 않아요.** 자동 설치는 모든 페이지에 통계 코드를 넣어서 영수증 화면에도 들어가요. 우리는 영수증 화면에는 통계를 싣지 않기로 했어요. workers.dev 주소는 원래 직접 넣는 방식만 돼요.
- 지금 사이트의 보안 설정 하나(Referrer-Policy) 때문에 방문이 0으로 나올 수 있어요. 하루가 지나도 0이면 알려 주세요. 제가 설정을 고칠게요.
- 광고 차단기를 켠 방문자는 잡히지 않아요. 내가 시험 삼아 들어간 방문은 통계에 섞여요.

## 11단계 (나중에, 정식으로 공개할 때). `main`으로 바꾸기

제가 "이제 정식으로 공개해도 돼요"라고 말한 뒤에만 해요. 도구 정보 확인과 법 문서 문구가 끝나야 공개할 수 있어요.

1. **Settings** → **Build** → **Branch control**에서 브랜치를 `main`으로 바꾸고 저장해요.
2. **Build variables and secrets**에서 값을 고쳐요. 이미 있는 줄은 편집(연필) 버튼을 눌러 값만 바꾸고, 없는 줄은 더해요.

| 이름 | 값 |
|---|---|
| `PUBLIC_STAGE` | `release` |
| `PUBLIC_SITE_URL` | 제가 알려 드리는 최종 주소 |
| `PUBLIC_CONTACT_EMAIL` | 연락받을 메일 주소 |

3. 제가 작업 브랜치를 `main`에 합치는 PR을 만들어 링크를 보내 드려요. 대화창에 "합쳐 줘"라고 쓰시면 제가 합쳐요. 직접 하시려면 링크를 열고 초록 버튼 **Merge pull request** → **Confirm merge**를 차례로 눌러요. 그 뒤에 나오는 **Delete branch**는 누르지 마세요.
   - PR을 합치면 `main`이 바뀌고, 빌드가 저절로 돌아요.
4. 값이 빠졌거나 확인이 덜 끝났으면 빌드가 멈춰요. 그때는 배포되지 않고 예전 화면이 그대로 남아요. 로그를 보내 주세요.
5. **되돌리기:** 이전 화면으로 돌아가려면 **Deployments** 탭에서 원하는 버전 오른쪽 **⋯**(점 세 개) → **Rollback**을 눌러요.
   - 데이터베이스에 쌓인 횟수는 되돌아가지 않아요.
   - 다음에 `main`이 바뀌면 다시 새 버전이 나가요.
6. **내 도메인(주소):** 도메인을 사는 데는 돈이 들어요. 제가 먼저 말할 때만 해요.
   - 도메인을 먼저 Cloudflare에 추가해야 해요.
   - 붙이는 곳: Worker의 **Domains** 탭 → **Custom Domains and Routes** → **+ Add Domain**이에요. **Enable for**가 나오면 **Production**이 들어간 쪽을 골라요. 이 탭이 없으면 **Settings** → **Domains & Routes** → **Add** → **Custom Domain** → **Add Custom Domain**으로 가요.
   - 도메인을 붙인 뒤에는 Web Analytics의 **Manage site**에서 **Enable with JS Snippet installation**을 꼭 골라요. 그래야 영수증 화면에 통계가 들어가지 않아요.

---

## 예비 길: GitHub Actions로 배포

Workers Builds를 쓰지 못할 때만 쓴다. `.github/workflows/deploy.yml`을 손으로 돌린다(**Actions** → **deploy** → **Run workflow**, 올릴 브랜치를 고른다). 이 길은 Actions 시간(비공개로 둔 저장소는 월 2,000분)을 쓰고, 저장소 설정에 아래 값이 있어야 한다.

- **Secrets**(비밀 값): `CLOUDFLARE_API_TOKEN`(Workers 스크립트·D1 편집 권한), `CLOUDFLARE_ACCOUNT_ID`. 둘 중 하나라도 없으면 빌드까지만 하고 배포는 건너뛴다.
- **Variables**(비밀 아님): `SITE_STAGE`(`preview` 또는 `release`), `SITE_URL`, `CF_BEACON_TOKEN`, `CONTACT_EMAIL`. `deploy.yml`이 차례로 빌드 변수 `PUBLIC_STAGE`·`PUBLIC_SITE_URL`·`PUBLIC_CF_BEACON_TOKEN`·`PUBLIC_CONTACT_EMAIL`로 넘긴다.

이 길은 `wrangler.jsonc`의 database_id가 비어 있으면 멈춘다(4단계). 표는 `wrangler d1 migrations apply --remote`로 만든다. 3단계에서 Console로 이미 만든 표는 `IF NOT EXISTS`라 다시 돌려도 해가 없다. Workers Builds와 같은 Worker(`code-chauffeur`)로 올라가므로, 두 길을 함께 쓰면 나중에 올린 쪽이 사이트에 남는다.

## 에이전트 메모 (소유자는 읽지 않아도 된다)

소유자 안내에 넣지 않은 것이다. 근거는 2026-10-14에 확인한 문서 원본과 wrangler 4.141.0 코드(`node_modules/wrangler/wrangler-dist/cli.js`)다.

- **빌드 시간(무료 월 3,000분, 한 번에 하나씩):** 작업 브랜치가 지켜보는 브랜치라 푸시할 때마다 빌드가 돈다. 2026-10-12에는 커밋 약 40개, 10-13에는 약 36개를 푸시했다. 빌드 한 번에 `npm ci` 약 30초, build 약 12초가 들고 배포와 준비 시간이 더 든다. 푸시는 모아서 한다. 그래도 빠듯하면 **Settings** → **Build** → **Build watch paths**의 exclude에 `docs/*`를 넣는 것을 검토한다. 그 전에 빌드가 `docs/`를 읽지 않는지 확인한다.
- **Referrer-Policy (10단계 전에 정할 것, 아직 정하지 않음):** `public/_headers`의 `Referrer-Policy: same-origin` 때문에 방문 통계 요청(beacon)에 Referer가 붙지 않는다. Web Analytics FAQ(2026-07-14)는 "The Referer header is required"라고 쓰고, 없으면 CORS 오류가 난다고 한다. 소유자가 10단계에서 통계 번호를 넣기 전에 `strict-origin-when-cross-origin`으로 바꿀지 정하고 `docs/DECISIONS.md`에 적는다. 바꾸면 다른 주소로 가는 요청에는 출처(origin)만 붙는다.
- **빌드 다시 돌리기:** 소유자가 "빌드 돌려 줘"라고 하면 작업 브랜치에 푸시한다. 바뀐 파일이 없는 빈 푸시도 빌드를 일으킨다(build-watch-paths.mdx: "A push event contains 0 file changes"). 그래서 `git commit --allow-empty`로 커밋해 푸시하면 된다. 소유자에게 **Retry build** 길은 주지 않는다. 어느 빌드가 어느 브랜치였는지 가려 보기 어렵다.
- **Worker 이름이 다를 때:** 문서(troubleshoot.mdx)는 빌드가 실패한다고 쓴다. 하지만 wrangler 4.141.0의 `mergeSharedConfigArgs`(cli.js 약 213052줄)는 `WRANGLER_CI_OVERRIDE_NAME`이 다르면 `Failed to match Worker name ... Overriding using the CI provided Worker name ...` 경고만 내고 대시보드 이름으로 배포한다. Workers Builds는 이름을 맞추자는 PR을 연다(automatic-prs.mdx). 그래서 안내에는 "실패하거나, 다른 주소로 올라가고 이름 PR이 열린다. PR은 합치지 않는다"로 쓴다.
- **미리 보기 빌드:** **Enable Preview Builds**(옛 이름 Builds for non-production branches)는 끈다. 켜려면 `wrangler.jsonc`에 `"previews": {}`가 있어야 한다. 없으면 `wrangler preview`(**Preview command** 기본값 `npx wrangler preview`)가 CI에서 오류를 낸다. 미리 보기는 운영 설정을 물려받지 않아서, D1을 쓰려면 `previews.d1_databases`도 따로 넣는다. 2026-09-22부터 'Preview URLs'는 브랜치 미리 보기 주소를 뜻하고, 예전 버전별 주소는 'Version URLs'로 이름이 바뀌었다.

그 밖에:

- **database_id(4단계):** 받은 id는 Workers Builds가 지켜보는 브랜치(지금은 작업 브랜치)에 커밋한다. `main`에는 PR을 합쳐서만 들어간다(훅이 `main` 푸시를 막는다). id가 `""`이면 wrangler가 자원 자동 만들기를 시도한다. 자동 빌드 토큰에는 문서상 D1 권한이 없어 403으로 건너뛰고, 빈 id로 올리다 배포 전체가 실패할 수 있다(`You must use a real database in the database_id configuration`). 그래서 D1과 id를 저장소 연결보다 먼저 한다.
- **D1 이름:** id가 채워지면 연결은 id로 된다. 이름은 id가 빈 동안의 자동 찾기·만들기와 `wrangler d1 migrations`가 쓴다. 이름이 다르면 연결이 끊기지는 않지만, 같은 이름의 D1이 하나 더 생겨 집계가 나뉠 수 있다.
- **3단계 Console:** Console로 실행하면 `d1_migrations`에 기록이 남지 않는다. 표 글이 `IF NOT EXISTS`라 나중에 `migrations apply`로 다시 돌려도 해가 없다. 안내에는 `--` 설명 줄을 뺀 글을 싣는다.
- **8단계 확인 글자:** 방문 통계는 `data-cf-beacon`으로 찾는다(CSP `<meta>`에 `https://cloudflareinsights.com`이 모든 페이지에 있어 그 낱말로 찾으면 틀린 판정이 난다). manifest는 `"start_url": "/"`(콜론 뒤 빈칸)다. 집계는 v5에서 장바구니 담기·계산·.md 받기 때 쌓인다(D110~D113).
- **9단계에서 뺀 것:** 초안의 "`Authentication error [code: 10000]`이 D1과 함께 나온다"는 문서·코드 근거가 없어 뺐다. id가 채워져 있으면 wrangler는 D1 API를 직접 부르지 않는다.
- **11단계 순서:** **Branch control**을 `main`으로 → 변수 고치기 → PR 합치기(소유자가 "합쳐 줘"라고 하면 에이전트가 합친다). PR을 합치는 것이 `main` 빌드를 일으킨다. 순서를 바꾸면 `main`에 푸시될 때 지켜보는 브랜치가 아직 작업 브랜치라서, 미리 보기 빌드가 꺼진 채로는 빌드가 돌지 않는다. `PUBLIC_STAGE=release` 빌드는 `validate:release`(지금 needsReview 46개로 실패)와 정식 빌드 지킴(L-04: 빈 주소·예시 주소·초안 표시)을 통과해야 한다. 실패하면 배포되지 않고 이전 화면이 남는다.
- **코드에 남은 옛 번호:** `scripts/lib/build-guard.ts`의 "docs/DEPLOY.md 4단계"(빌드 변수는 이제 7단계), `.github/workflows/deploy.yml`의 "docs/DEPLOY.md 3단계"(database_id는 이제 2~4단계)와 2번째 줄의 '검토 중인 시험판' 띠 주석(지금 화면과 맞지 않음)은 코드라서 2026-10-14 문서 고침에서 건드리지 않았다. 그 파일을 고칠 때 함께 고친다.

---

## 근거 문서 (읽지 않아도 돼요)

Cloudflare 공식 문서 원본 저장소 `cloudflare/cloudflare-docs`를 2026-10-14에 받은 판(eeca142b3)으로 확인했어요. 경로는 `src/content/` 아래이고, 괄호 안은 그 파일을 마지막으로 고친 날이에요. 문서에 없는 동작은 이 저장소에 설치된 wrangler 4.141.0 코드(`node_modules/wrangler/wrangler-dist/cli.js`)로 확인했어요.

- **1단계:** `docs/fundamentals/user-profiles/verify-email-address.mdx` (2026-04-20), `docs/fundamentals/user-profiles/customize-account.mdx` (2026-04-20, Profile > Settings > Language), `dash-routes/core.json` (2026-09-16, 왼쪽 메뉴 위치), `docs/workers/configuration/routing/workers-dev.mdx` (2026-09-22), `docs/workers/framework-guides/web-apps/redwoodsdk.mdx` (2026-04-23, 첫 화면에서 하위 도메인이 자동으로 생김), `docs/workers/ci-cd/builds/troubleshoot.mdx` (2026-10-08, Account Details). wrangler 코드: CI에서 하위 도메인이 없으면 등록을 묻지 않고 실패하며 `/workers/onboarding` 주소를 알려 줌. 이메일을 확인하지 않은 계정에는 `Please verify your account's email address` 오류를 냄.
- **2~3단계:** `docs/d1/get-started.mdx` (2026-08-25, Create Database·Create·Console·Execute·Tables), `docs/d1/configuration/data-location.mdx` (2026-10-02).
- **4단계:** `docs/workers/wrangler/configuration.mdx` (2026-10-12, 자원 자동 만들기), `docs/workers/ci-cd/builds/configuration.mdx` (2026-09-22, 자동 토큰 권한에 D1이 없음). **Database ID**라는 칸 이름은 공식 문서에 없어요.
- **5단계:** `docs/workers/ci-cd/builds/index.mdx` (2026-10-01, Save and Deploy), `docs/workers/get-started/dashboard.mdx` (2026-06-25, Deploy), `docs/workers/ci-cd/builds/configuration.mdx` (2026-09-22, 칸 목록), `docs/workers/ci-cd/builds/git-integration/github-integration.mdx` (2026-09-22), `docs/workers/ci-cd/builds/git-integration/index.mdx` (2026-10-01), `docs/workers/ci-cd/builds/automatic-prs.mdx` (2026-10-12). wrangler 코드: 이름이 다르면 대시보드 이름으로 바꿔 배포하고 PR을 열겠다는 경고를 냄.
- **6단계:** `docs/workers/ci-cd/builds/build-branches.mdx` (2026-10-01, Branch control·Enable Preview Builds·Switch to Worker Previews).
- **7단계:** `docs/workers/ci-cd/builds/configuration.mdx` (2026-09-22, 저장한 설정은 다음 빌드부터), `docs/workers/ci-cd/builds/build-image.mdx` (2026-10-08, 기본 Node 24.18.0, 22.23.2도 있음).
- **7단계 다음:** `docs/workers/ci-cd/builds/build-watch-paths.mdx` (2026-05-29, 바뀐 파일이 없는 푸시도 빌드를 일으킴).
- **8단계:** `docs/workers/previews/custom-domains.mdx` (2026-09-24, Domains 탭·Worker URL), `changelog/workers/2026-05-14-domains-tab.mdx` (2026-10-12).
- **9단계:** `docs/workers/ci-cd/builds/troubleshoot.mdx` (2026-10-08, 이름·시간 초과·토큰·404 오류), `docs/workers/ci-cd/builds/index.mdx` (2026-10-01, View build history), `partials/d1/generate-d1-api-token.mdx` (2025-09-03, Account·D1·Edit, Continue to summary).
- **10단계:** `docs/web-analytics/get-started/index.mdx` (2026-04-17), `docs/web-analytics/faq.mdx` (2026-07-14, Referer 머리글이 필요함), `docs/web-analytics/limits.mdx` (2026-08-12).
- **11단계:** `docs/workers/versions-and-deployments/rollbacks.mdx` (2026-07-15), `docs/workers/configuration/routing/custom-domains.mdx` (2026-09-29), `docs/workers/previews/custom-domains.mdx` (2026-09-24).
- **비용·한도:** `docs/workers/platform/limits.mdx` (2026-10-12), `docs/workers/platform/pricing.mdx` (2026-10-02), `docs/workers/static-assets/billing-and-limitations.mdx` (2026-04-23), `docs/d1/platform/limits.mdx` (2026-04-21), `partials/d1/faq-pricing.mdx` (2026-03-27, 무료 플랜에서 한도를 넘으면 오류만 나고, 유료로 바꿔야 한도가 풀림), `docs/workers/ci-cd/builds/limits-and-pricing.mdx` (2026-05-29), `changelog/workers/2026-07-24-skip-superseded-builds.mdx` (2026-08-12).
- **저장소 비공개:** GitHub REST API `repos/yoorrard/code-chauffeur` 응답(2026-10-14, `private: true`·`has_pages: false`).
- **예비 길:** 이 저장소의 `.github/workflows/deploy.yml`.
