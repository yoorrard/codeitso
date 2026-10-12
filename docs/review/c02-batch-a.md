# C02 묶음 A 대조표 — 기반 도구 (화면·저장·로그인·알림·배포)

초안 파일: `.qa/c02/batch-a.json` (10개, 모두 `needsReview: true`, `checkedAt: "2026-10"`, `layer: "shelf"`, `recommendable: true`)

## 어떻게 확인했나

- 이 환경에서는 WebFetch와 curl이 공식 사이트에 닿지 않는다 (DNS 실패, 프록시 403).
- 그래서 **공식 도메인만 허용한 WebSearch**로 공식 페이지의 검색 결과 내용을 확인했다. 아래 "원문에서 확인한 내용"은 그 검색 결과에 나온 공식 페이지 문장의 요약이다. 사람이 C01에서 원문을 직접 열어 대조해야 한다.
- 예외: Streamlit은 공식 문서 저장소(`github.com/streamlit/docs`)를 내려받아 원문을 직접 읽었다 (넣지 않은 후보 절 참고).
- 검색 결과끼리 숫자가 어긋나면 숫자를 쓰지 않았다 (Firebase Authentication 무료 사용자 수).
- `prep`의 가입 페이지 주소(`app.netlify.com/signup`, `vercel.com/signup`, `console.firebase.google.com`, `accounts.google.com/signup`, `api.slack.com/apps`, `devcenter.heroku.com/articles/heroku-cli`)는 열어 보지 못했다. 사람이 열리는지 확인한다.
- `difficulty`, `setupMinutes`, `goodFor`, `capabilities`는 사실이 아니라 판단이다. 판단 근거는 각 표 아래에 적었다.

---

## 1. netlify — Netlify (host, proxy)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | 무료 플랜 $0/월, "300 credits/month with credit hard limit", 자동 충전 없음 | https://www.netlify.com/pricing/ |
| cost.note | 무료 플랜으로 시작 (한도를 넘어도 돈은 나가지 않아요) | 무료 플랜은 "hard monthly limits that cannot be exceeded or incur any costs" | https://www.netlify.com/pricing/ |
| freeLimit | 한 달 300크레디트, 배포 15크레디트, 전송량 1GB 20크레디트, 다 쓰면 다음 달까지 멈춤 | 성공한 프로덕션 배포 1번 15 credits, 대역폭 1GB 20 credits, 웹 요청 1만 건 2 credits. 다 쓰면 다음 결제 주기까지 프로젝트 일시 정지, 무료 플랜은 크레디트 추가 구매 불가 | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ · https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ |
| stuck 1 (모든 사이트가 멈춤) | 계정의 모든 사이트가 멈춰요 | 요금 FAQ: 한 사이트가 한도를 넘으면 계정의 모든 사이트·프로젝트가 정지 | https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/ |
| stuck 2 (가입 없이 올린 사이트) | 잠시만 열려요 | Netlify Drop은 가입 없이도 올릴 수 있고, 가입하지 않은 사이트는 임시로 취급 (정확한 유지 시간은 확인 못 함) | https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/ |
| stuck 3 (환경 변수) | 바꾼 뒤 다시 배포 | 환경 변수 값을 바꾸면 새 배포를 해야 반영. netlify.toml에 적은 변수는 함수에서 못 씀 | https://docs.netlify.com/build/functions/environment-variables/ |
| access | signup | 가입하면 Drop 사이트를 계정에 둘 수 있음. 카드 필요 여부는 **확인 못 함** (2025년 무료 플랜 발표 글에만 "카드 필요 없음") | https://www.netlify.com/pricing/ |
| serverRegion | none | 정적 파일 배포. 이용자 데이터를 보관하지 않음 (판단) | — |
| capabilities | host, proxy | Drop으로 폴더 배포(Git 필요 없음), Netlify Functions에서 `process.env`로 키를 읽음 | https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/ · https://docs.netlify.com/build/functions/environment-variables/ |
| difficulty / setupMinutes | 2 / 20 | 판단: 화면만 올리면 1에 가깝지만, 함수(proxy)를 쓰면 폴더 구조와 배포 방식이 더 필요 | — |
| goodFor | chat-free, chat-paid, agent | 판단: Drop은 채팅에서 받은 파일을 그대로 끌어다 놓으면 됨 | — |

## 2. vercel — Vercel (host, proxy)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | Hobby 플랜 무료, "personal, non-commercial use" | https://vercel.com/docs/plans/hobby · https://vercel.com/pricing |
| cost.note | 개인·비상업 용도는 무료 (Hobby 플랜) | Fair Use: Hobby는 비상업 개인 용도만. 결제 받기, 상품·서비스 광고, 애드센스 같은 광고는 상업 용도. 기부 요청은 상업 아님 | https://vercel.com/docs/limits/fair-use-guidelines |
| freeLimit | 한 달 빠른 데이터 전송 100GB, 함수 실행 100만 번, 넘으면 30일 기다리거나 유료 | Hobby 포함량: Fast Data Transfer 100GB, 함수 호출 1,000,000번. Hobby는 추가 사용량 구매 불가, 넘으면 30일이 지나야 다시 씀. (Fluid compute가 꺼진 옛 프로젝트는 10만 번이라는 커뮤니티 답변도 있음) | https://vercel.com/docs/plans/hobby · https://vercel.com/pricing |
| stuck 2 (Drop 프로젝트) | 저장소와 이어지지 않음, 다시 끌어다 놓기 | Vercel Drop은 Hobby에서 됨. 떨어뜨린 프로젝트는 Git 연결이 없어 푸시로 배포되지 않고, 대시보드의 프로젝트에 폴더를 다시 떨어뜨리면 새 프로덕션 배포 | https://vercel.com/docs/drop |
| stuck 3 (환경 변수) | 새로 배포해야 반영 | 환경 변수 변경은 이전 배포에 적용되지 않고 새 배포에만 적용 | https://vercel.com/docs/environment-variables |
| stuck 4 (NEXT_PUBLIC_) | 화면 코드에 그대로 들어감 | `NEXT_PUBLIC_` 접두어 변수는 빌드 때 브라우저로 가는 JavaScript에 박힘. 키는 Secret 형식 권장 | https://vercel.com/docs/environment-variables/sensitive-environment-variables |
| access | signup | Drop은 Vercel 계정이 필요 | https://vercel.com/docs/drop |
| serverRegion | none | 판단 (정적 파일·함수, 이용자 데이터 보관 안 함) | — |
| difficulty / setupMinutes | 2 / 20 | 판단: Netlify와 같음 | — |

## 3. firebase-hosting — Firebase Hosting (host)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | 무료 Spark 플랜, 시작할 때 결제 정보 필요 없음 | https://firebase.google.com/docs/projects/billing/firebase-pricing-plans |
| freeLimit | 저장 10GB, 하루 전송량 360MB, 넘으면 그 기능이 멈춤 | 요금 페이지 Spark: Hosting 저장 10GB, 전송 360MB/일. 무료 할당량을 넘으면 그 제품이 그달 남은 기간 동안 꺼짐 (Spark) | https://firebase.google.com/pricing · https://firebase.google.com/products/hosting · https://firebase.google.com/docs/projects/billing/firebase-pricing-plans |
| stuck 1 (CLI) | CLI 설치, firebase login | `npm install -g firebase-tools` (Node.js 18 이상) 또는 단독 실행 파일. `firebase login`으로 로그인 | https://firebase.google.com/docs/cli |
| stuck 2 (App Hosting) | App Hosting은 다른 서비스, Blaze 필요 | 기존 Hosting은 결제 계정이 필요 없고, App Hosting의 CLI 배포는 Blaze 필요 | https://firebase.google.com/docs/studio/deploy-app |
| stuck 3 / summary (주소) | 프로젝트 ID.web.app | `firebase deploy --only hosting` → PROJECT_ID.web.app, PROJECT_ID.firebaseapp.com | https://firebase.google.com/docs/hosting/quickstart |
| promptFragment 명령 | firebase init hosting, firebase deploy --only hosting | 시작 안내의 명령 그대로 | https://firebase.google.com/docs/hosting/quickstart |
| serverRegion | none | 판단 (정적 파일) | — |
| goodFor | agent | 판단: 터미널 CLI가 꼭 필요 | — |

## 4. firebase-firestore — Cloud Firestore (store)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | Spark 무료, 결제 정보 없이 | https://firebase.google.com/docs/projects/billing/firebase-pricing-plans |
| freeLimit | 저장 1GiB, 하루 읽기 5만·쓰기 2만·삭제 2만, 무료는 데이터베이스 하나에만 | Standard 무료 등급: 저장 1GiB, 읽기 50,000/일, 쓰기 20,000/일, 삭제 20,000/일, 태평양 시간 자정 무렵 초기화. 무료 등급은 프로젝트당 데이터베이스 하나 | https://firebase.google.com/docs/firestore/quotas · https://firebase.google.com/pricing |
| serverRegion | selectable | 위치 목록에 asia-northeast3(서울). 데이터베이스를 만든 뒤에는 위치를 바꿀 수 없음 | https://firebase.google.com/docs/firestore/locations |
| stuck 1 (테스트 모드) | 누구나 읽고 고칠 수 있음 | 테스트 모드는 "anyone to read and overwrite your data". 모두 허용 규칙은 운영에 쓰지 말 것 | https://firebase.google.com/docs/firestore/quickstart · https://firebase.google.com/docs/rules/insecure-rules |
| stuck 3 / promptFragment (apiKey) | apiKey는 화면에 들어가도 되는 값, 서비스 계정 키는 넣지 마 | Firebase API 키는 코드나 설정 파일에 넣어도 됨(프로젝트 식별용). 데이터는 보안 규칙으로 지킴. 서비스 계정 비공개 키는 민감 정보 | https://firebase.google.com/docs/projects/api-keys |
| keyExposureRisk / publicKey | false / 비움 | Supabase 카드와 같은 처리. publicKey를 켜면 안전 규칙 문장("사이트 주소에서만 쓰이게 막아 둔다")이 붙는데, Firebase 키는 사이트 주소보다 API 종류로 제한하라고 안내함 | https://firebase.google.com/docs/projects/api-keys |
| difficulty / setupMinutes | 3 / 60 | 판단: Supabase와 같은 무게 (보안 규칙을 직접 짜야 함) | — |

## 5. firebase-auth — Firebase Authentication (auth)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | Spark 무료, 결제 정보 없이. 기본 인증(소셜·이메일)은 무료 | https://firebase.google.com/docs/projects/billing/firebase-pricing-plans · https://firebase.google.com/pricing |
| freeLimit | (비움) | **확인 못 함**: 요금 페이지는 Identity Platform 5만 MAU 무료, 인증 한도 문서는 Spark에서 Identity Platform으로 올리면 하루 활성 사용자 3,000명. 서로 어긋나서 숫자를 쓰지 않음 | https://firebase.google.com/pricing · https://firebase.google.com/docs/auth/limits |
| stuck 1 (로그인 방법 켜기) | Authentication → 로그인 방법에서 먼저 켜기 | 로그인하기 전에 콘솔 Authentication → Sign-in method에서 공급자를 켬 | https://firebase.google.com/docs/auth/web/google-signin |
| stuck 2 (승인된 도메인) | 사이트 주소를 승인된 도메인에, 2025-04-28 뒤 프로젝트는 localhost도 직접 | 승인된 도메인 목록(Authentication 설정)에 내 도메인을 넣음. 2025년 4월 28일 이후 만든 프로젝트는 localhost가 기본으로 들어 있지 않음 | https://firebase.google.com/docs/auth/web/email-link-auth |
| stuck 3 (문자 로그인) | 유료 Blaze에서만 | 요금 페이지: 전화번호(SMS) 인증은 Blaze 전용 | https://firebase.google.com/pricing |
| serverRegion | unknown | 로그인 정보가 저장되는 곳 **확인 못 함** | — |
| difficulty / goodFor | 2 / agent | 판단 | — |

## 6. google-forms — 구글 설문지 (store)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| capabilities | store | **판단.** 아래 근거 참고 | — |
| cost.free | true | 소개 페이지에 개인용(Free) 표시. 구글 계정 필요 | https://www.google.com/forms/about/ |
| freeLimit | (비움) | 응답 수 같은 무료 한도 **확인 못 함** | — |
| serverRegion | unknown | 개인 계정 데이터 저장 위치 **확인 못 함** | — |
| promptFragment (삽입용 HTML) | 화면에 삽입용 HTML 코드 넣을 자리 | 설문지에서 Embed HTML(보내기 → 삽입 아이콘) 코드를 복사해 웹사이트에 붙여 넣음 | https://support.google.com/a/users/answer/9308623 · https://support.google.com/docs/answer/2839588 |
| stuck 1 (화면 입력 칸과 이어지지 않음) | 끼워 넣거나 링크 | Forms API의 responses는 get·list(읽기)만 있음. 응답 제출 API 없음 (앱스 스크립트 Forms 서비스에는 응답을 만드는 메서드가 있음) | https://developers.google.com/workspace/forms/api/guides |
| stuck 2 (시트 연결) | 응답 탭에서 시트 연결 | 응답 → 응답 저장 위치 선택에서 새 시트나 기존 시트를 고름 | https://support.google.com/docs/answer/2917686 |
| stuck 3 (로그인 필요) | 파일 업로드·응답 1회 제한이면 로그인 | 파일 업로드 질문은 응답자가 구글 계정에 로그인해야 함. 1회 제한도 로그인 필요 | https://support.google.com/docs/answer/7322334 · https://support.google.com/docs/answer/2839588 |
| goodFor | (비움) | 판단: 설문지는 사람이 구글 편집기에서 직접 만들고, AI는 삽입 코드 자리만 만든다 | — |
| difficulty / setupMinutes | 1 / 20 | 판단 | — |

capability 판단 근거: 화면(screen)으로 넣으면 공식 제공 +1 때문에 모든 프로젝트의 화면 칸에서 HTML 한 장을 이긴다. 저장(store)으로 넣고, 화면은 HTML 한 장이 설문지를 끼워 넣는 꼴로 쓰는 것이 칸 모델에 가장 가깝다. 다만 엔진은 프로젝트 종류(type.form인지)를 상품 점수에 쓰지 않아서, 기록장·퀴즈 같은 앱의 저장 칸에도 후보로 나온다. 이 한계를 stuck 4에 적었다.

## 7. airtable — Airtable (store)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | 무료 플랜 있음 | https://support.airtable.com/docs/airtable-plans |
| freeLimit | 베이스 하나에 기록 1,000개, 워크스페이스 하나에 한 달 API 호출 1,000번 | Free: 베이스당 1,000 records, 워크스페이스당 월 1,000 API calls. 넘으면 30일 유예 뒤 막힘, 매달 1일 초기화. 모든 플랜 베이스당 초당 5요청 | https://support.airtable.com/docs/airtable-plans · https://support.airtable.com/docs/managing-api-call-limits-in-airtable |
| access | key | 개인 액세스 토큰을 /create/tokens에서 만들고 권한(scope)과 베이스를 고름 | https://airtable.com/developers/web/guides/personal-access-tokens |
| keyExposureRisk | true | 토큰은 내 계정처럼 동작, 비밀로 두고 공유하지 말 것. 만들 때 한 번만 보여 줌 | https://support.airtable.com/articles/9934989703-creating-personal-access-tokens |
| serverRegion | overseas | 기본 미국. 지역 고르기는 Enterprise Scale만 | https://support.airtable.com/docs/data-residency-at-airtable |
| difficulty / goodFor | 2 / agent | 판단: 토큰을 숨길 중간 서버가 있어야 안전 | — |

## 8. slack-webhook — 슬랙 수신 웹후크 알림 (notify)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | 무료 슬랙에서 앱 10개까지 설치 가능 (직접 만든 앱도 셈) | https://slack.com/help/articles/27204752526611-Feature-limitations-on-the-free-version-of-Slack · https://slack.com/help/articles/115002422943-Usage-limits-for-free-workspaces |
| keyExposureRisk | true | 웹후크 주소는 비밀 값. 공개 저장소에 올리지 말 것. 슬랙이 새어 나간 비밀 값을 찾아 끊음 | https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/ |
| stuck 2 (채널 하나) | 주소 하나는 채널 하나 | 웹후크를 추가할 때 채널을 고르고, 그 주소는 그 채널에 묶임 | https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/ |
| stuck 3 (관리자 승인) | 승인이 필요할 수 있음 | 워크스페이스 소유자가 "승인된 앱만 허용"을 켜면 앱 설치에 승인 필요. 기본값은 승인 없이 설치 | https://slack.com/help/articles/222386767-Manage-app-approval-for-your-workspace |
| access | signup | 기본값에서는 승인 없이 설치. 승인이 켜진 곳은 stuck으로 안내 | 위와 같음 |
| serverRegion | unknown | **확인 못 함** | — |
| difficulty / setupMinutes | 1 / 15 | 판단: 앱 만들기 → 수신 웹후크 켜기 → 채널 고르기 → 주소 복사. 코드 없이 디스코드와 비슷 | — |

## 9. emailjs — EmailJS (notify)

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | true | Free $0, 가입은 이름과 이메일만, 카드 필요 없음 | https://www.emailjs.com/pricing/ · https://www.emailjs.com/docs/faq/can-i-use-emailjs-for-free/ |
| freeLimit | 한 달 200번, 템플릿 2개, 넘으면 보내지지 않고 돈 안 나감 | Free: 월 200 requests, 템플릿 2개, 요청 50KB. 초과 요금 없음, 한도를 넘은 요청은 서버가 버림 | https://www.emailjs.com/pricing/ |
| access | key | 공개 키(Public Key)를 `emailjs.init`에 넣음 | https://www.emailjs.com/docs/sdk/init/ |
| keyExposureRisk / publicKey | false / 비움 | 공개 키는 드러나도 됨: 복사해도 내 템플릿과 내 내용으로만 보냄. 비공개 키(Private Key)는 Account → Security에서 켜는 별도 키 | https://www.emailjs.com/docs/faq/is-it-okay-to-expose-my-public-key/ · https://www.emailjs.com/docs/sdk/options/ |
| stuck 3 (사이트 주소 제한은 유료) | 유료 플랜에 있음 | 요금 비교표에서 Whitelist가 Professional·Business에만 있음 (검색 결과 요약 기준, 원문 표 직접 확인 필요). 그래서 publicKey를 켜지 않았다: 켜면 붙는 안전 문장 "사이트 주소에서만 쓰이게 막아 둔다"를 무료로는 지킬 수 없음 | https://www.emailjs.com/pricing/ |
| stuck 1 (메일 계정 연결·템플릿) | 먼저 연결하고 템플릿 만들기 | 문서의 동작 방식·연락 폼 안내 (세부 단계는 원문 직접 확인 필요) | https://www.emailjs.com/docs/ |
| serverRegion | unknown | **확인 못 함** | — |
| difficulty / goodFor | 2 / 세 가지 모두 | 판단: 서버 없이 HTML 한 장에서 동작 | — |

## 10. heroku — Heroku (host, proxy) · 유료

| 필드 | 적은 값 | 원문에서 확인한 내용(요약) | 원문 링크 |
|---|---|---|---|
| cost.free | **false** | 무료 다이노·무료 데이터 플랜은 2022년 11월 28일부터 없음 | https://www.heroku.com/blog/new-low-cost-plans/ · https://www.heroku.com/pricing/ |
| cost.note | 가장 싼 Eco 한 달 5달러, 카드 등록 필요 | Eco: 1,000 다이노 시간 $5/월, 쓰지 않은 달도 구독 중이면 청구. 앱 만들기·배포·다이노 사용에 계정 확인(카드 등록, $1 임시 승인) 필요 | https://devcenter.heroku.com/articles/eco-dyno-hours · https://devcenter.heroku.com/articles/account-verification |
| stuck 3 (잠듦) | 30분 방문 없으면 잠듦 | Eco 다이노는 웹 요청이 30분 없으면 잠들고, 시간을 다 쓰면 그달 내내 잠듦 | https://devcenter.heroku.com/articles/eco-dyno-hours |
| access | signup | 판단: 카드는 비용(cost)으로 다룸. `account-or-business`(계좌·사업자)는 증권 계좌 같은 경우라 쓰지 않음 | — |
| serverRegion | none | 판단 (호스팅만, 이용자 데이터 보관 안 함) | — |
| difficulty / goodFor | 3 / agent | 판단: CLI, Git, 설정 파일이 필요 | — |
| 넣은 이유 | — | 후보 목록 밖. AI 채팅이 옛 글을 보고 아직도 "무료"로 권하는 일이 많아, '0원만 + 유료 상품' 충돌(`conflict.paid-on-free`)을 시험할 유료 상품으로 넣음. 메모리 시험에서 이 충돌이 켜지는 것을 확인함 | — |

---

## 넣지 않은 후보

| 후보 | 이유 | 확인한 사실 (나중에 넣을 때 쓰기) |
|---|---|---|
| Streamlit Community Cloud | 초심자가 AI와 만들기는 쉽다(파이썬 파일 하나 + requirements.txt). 하지만 화면 칸에 넣으면 엔진이 지금 진열대와의 짝을 모른다: 브라우저 저장(localStorage), GitHub Pages, HTML 한 장과 함께 담기면 동작하지 않는 장바구니가 된다. 또 공식 제공 +1 때문에 코딩 에이전트 이용자의 화면 칸에서 React + Vite(4점)를 이기고(5점, 난이도 2·에이전트 태그로 계산), 채팅 태그까지 주면 무료 채팅 이용자 화면 칸에서도 HTML 한 장과 4점 동점에서 '공식 제공 먼저'로 이긴다. 기술 묶음(파이썬 서버 앱)의 호환을 엔진이 다룰 때 넣는 것이 맞다 | 무료("all for free"), GitHub 저장소에서 배포, 가입은 이메일 코드·구글·GitHub, 앱마다 CPU 2코어·메모리 최대 2.7GB, 12시간 방문 없으면 잠듦, 모든 앱이 미국에서 돌고 바꿀 수 없음, 비공개 앱은 한 번에 1개, 비밀 값은 Advanced settings의 Secrets(`st.secrets`), 라이브러리는 Apache 2.0. 원문: `github.com/streamlit/docs`의 `content/deploy/community-cloud/` (status-and-limitations.md, manage-your-app/_index.md, deploy-your-app/secrets-management.md, share-your-app/_index.md, get-started/create-your-account.md) |
| Glitch | 프로젝트 호스팅이 2025년 7월 8일에 끝났다 | https://blog.glitch.com/post/changes-are-coming-to-glitch |
| Replit 배포 | 바뀐 서비스. 무료(Starter) 게시 앱은 1개이고 30일 뒤 자동으로 내려간다. 계속 쓰려면 Core 이상. 또 Replit은 자기 AI 편집기 안에서 만드는 도구라 "내 AI에게 넘길 꾸러미"와 결이 다르다 | https://docs.replit.com/billing/plans/starter-plan · https://docs.replit.com/billing/deployment-pricing |

---

## 엔진에 넣었을 때 달라지는 것 (메모리 시험, data/는 그대로)

`data/products.json`에 묶음 A만 더했다고 치고 골든 20개를 돌린 결과. **추천이 바뀌는 곳은 한 군데**, 나머지는 2위만 바뀐다.

| 사례 | 칸 | 기대 → 실제 | 까닭 |
|---|---|---|---|
| case-04 | 저장 **추천** | supabase → airtable | 세 상품이 4점 동점 (airtable: 무료+2 에이전트+2 공식+1 키−1 / supabase·firestore: 무료+2 에이전트+2 공식+1 난이도−1). 동점이면 난이도 낮은 순이라 airtable. airtable을 빼도 firebase-firestore가 id 순으로 supabase를 이긴다. 로그인 칸의 '함께 쓰기(+2)'는 저장 칸보다 뒤라 저장 칸 점수에 들어가지 않는다 |
| case-04 | 저장 2위 | google-sheets-apps-script → firebase-firestore | 위와 같음 |
| case-04·19 | 로그인 2위 | 없음 → firebase-auth | 로그인 상품이 처음으로 둘이 됨 |
| case-04·05 | 배포 2위 | github-pages → firebase-hosting | 5점 동점, id 순 |
| case-01·03·08·09·10·12·15·16·17·18·19·20 | 배포 2위 | cloudflare-workers 또는 github-pages → netlify | 키 숨기기(+2)와 AI 맞춤(+2)을 함께 받음 |
| case-02·14·19·20 | 저장 2위 | supabase → google-forms | 무료 채팅 이용자, AI 맞춤 태그 없이 3점 |
| case-03·08·12·17 | 알림 2위 | telegram-bot → slack-webhook | 디스코드와 4점 동점, id 순으로 디스코드가 추천 유지 |

판단할 거리:

- case-04는 '회원제 기록장'이라 supabase(저장+로그인 한 번에)가 더 맞다. 엔진이 저장 칸에서 "뒤 칸도 맡을 수 있는 상품"을 모른다. airtable·firestore를 넣으려면 골든을 고치거나, 저장 칸에서 로그인 칸이 열려 있을 때 auth 기능도 가진 상품에 점수를 주는 규칙을 검토해야 한다 (엔진 변경 → DECISIONS·ENGINE·골든 함께).
- google-forms는 기록장(case-14·19)에서도 저장 2위로 나온다. 기록을 다시 보여 줘야 하는 앱에는 맞지 않다 (stuck 4에 적음).
