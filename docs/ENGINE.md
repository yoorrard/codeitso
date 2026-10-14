# 엔진 명세

`src/lib/engine/`의 동작을 글로 적은 것이다. 코드와 이 문서가 다르면 버그다. 동작을 바꾸면 이 문서, `data/golden/`, 필요하면 `/about/criteria`(추천 기준) 화면을 함께 고친다.

엔진은 화면·브라우저·Node API를 쓰지 않는 순수 함수다. 같은 자료와 같은 `Session`을 넣으면 늘 같은 결과가 나온다. 정렬은 로캘과 무관한 문자열 비교(`cmp`)를 쓴다.

**이름 대응.** 이 문서는 코드와 자료의 내부 이름을 쓰고, 화면 이름은 `docs/CONCEPT.md` 3절을 따른다. id와 함수 이름은 바꾸지 않았다.

| 내부 이름 (코드·자료) | 화면에서 부르는 이름 |
|---|---|
| 인터뷰 (`interview`, `questions.json`) | 만들 앱 정하기 (1단계, D64. D56에서는 목적지), 그 질문 |
| 장보기 (`shop`, 칸마다 순위) | 도구 고르기 (2단계. D56에서는 경유지) |
| 재확인 (`recheck`) | 도구끼리 맞춰 보기 (3단계. D56에서는 점검) |
| 계산대 (`checkout`, 발행) | 설계도 받기 (4단계. D56에서는 도착) |
| 상품 (`product`), 진열(`shelf`)·색인(`index`) 상품 | 도구, 원문만 있는 도구 |
| 장바구니 (`cart`) | 고른 도구 |
| 칸 (`slot`) | 고를 것 (꼭 고를 것 / 있으면 좋은 것), 지도 위 마디 |
| 충돌 (`conflict`), 그대로 둠 (`kept`) | 막힌 곳, 그대로 가기 (상태: 서행) |
| 2차로 미룸 (`deferred`), 1차 (`firstPhase`) | 나중에 붙일 것 (나중으로 미루기), 먼저 만들 것 |
| 꾸러미 (`pack`) | 설계도 |
| 조사 카드·조사할 것 (`research`) | 알아볼 것 |
| 개념 카드·공부할 것 (`concept`, `study`) | 용어 카드, 읽어 둘 용어 |
| 대화 카드 (`conversationCards`) | AI에게 할 말 |
| 레시피 (`recipe`) | 미리 짠 코스 |
| 공유 상태 (`ShareState`) | 영수증 링크 (`/arrival#r=…`) |

## 0. 입구

```ts
const cat = makeCatalog(data);                       // 자료 묶음 → id 찾기 표
const r = evaluate(cat, session);                    // 목적지 질문부터 도착까지 한 번에
renderPack(cat, r, { siteUrl, issuedAt });           // 설계도 .md
packFileName(date);                                  // codechauffeur-plan-YYYYMMDD-HHmm.md
renderReceiptText(receiptModel(cat, r, issuedAt));   // 텍스트 영수증
conversationCards(cat, r);                           // AI에게 할 말 5장
```

`evaluate`는 먼저 `normalizeSession`으로 입력을 정리한다: 없는 질문·보기의 답, 없는 상품, 문자열이 아닌 값, 겹친 id를 버린다. 직접 쓴 것(내 말 40자, 직접 쓴 도구 5개, 빈틈)의 정리는 9절. 그다음 나중으로 미룰 수 없는 칸은 `deferred`에서, 지금 생기지 않았거나 그대로 둘 수 없는 충돌은 `kept`에서 뺀다. 정리된 상태는 `r.session`에 있다.

## 1. 목적지 질문 (`interview.ts`)

1. `questions.json`의 질문을 적힌 순서대로 훑는다.
2. `showIf`가 있으면 **지금까지 보인 질문의 답과 태그만으로** 판단한다. 맞지 않으면 숨긴다. (`showIf`에는 장바구니·미룬 칸 조건을 쓸 수 없다.)
3. 보인 질문에 유효한 답이 있으면 그 보기의 `tags`를 더한다 (같은 태그는 합산).
4. 다음 질문 = 보인 질문 중 답이 없는 첫 질문. 없으면 만들 앱 정하기 끝 (`done`). 도구 고르기와 도구끼리 맞춰 보기는 이때 열린다.
5. 앞 답을 바꿔 숨겨진 질문의 답은 지우지 않고 무시한다. 되돌리면 다시 살아난다.
6. **고르지 않아도 되는 질문**(`optional: true`, '쓰는 AI' `q.aitool-*`, D87): 차례가 오면 다른 질문처럼 묻는다(다음 질문이 된다). 하지만 답하지 않은 채 다른 질문을 모두 마쳤으면(미리 짠 코스, v3 전의 저장·영수증 링크) 보인 질문에서 빼고 끝난 것으로 본다. 그 답은 '모르겠어요' 보기('아직 안 정했어요', 태그 없음)와 같다. 이런 질문의 보기 태그는 `aitool.*`뿐이고 점수·규칙·노출 조건에 쓰지 않는다(`npm run validate`가 막는다). 그래서 골든 23개의 '물어본 질문'은 그대로다.
7. **직접 쓰기 보기**(`isCustom: true`, id `custom`, D74): 질문마다 하나 있는 보통 보기다. 엔진은 다른 보기처럼 그 `tags`를 더한다(`like`가 있으면 그 보기와 같은 태그, 없으면 `q.type` → `type.custom`, `q.domain` → `need.data`). 쓴 말을 읽어 보기를 고르는 일(낱말 찾기)은 화면이 하고 `evaluate()`에는 들어오지 않는다. 낱말표 `data/aliases.json`은 엔진 계산이 읽지 않는다.

'길 찾는 중' 미리 보기 (목적지 화면의 지도): `answerChips()`(답한 질문의 짧은 이름 + 고른 보기. 설계도 1번 '고른 답'에도 쓴다), `buildSlots()`(지금 생긴 칸 = 고를 것), `matchingRecipes()`(지금까지의 답과 어긋나지 않고 같은 답이 하나 이상인 레시피(미리 짠 코스)를 같은 답이 많은 순으로 2개, 같으면 `recipes.json` 순서. '모르겠어요'(isUnknown) 답은 어긋남으로도 같은 답으로도 세지 않는다. 첫 답 전에는 비어 있다).

## 2. 칸 만들기 (`shop.ts` buildSlots)

- 종류가 `slot`인 규칙 중 `when`이 맞는 것을 모은다.
- 같은 칸 id는 하나로 합친다. `required`는 하나라도 true면 true. 나머지 속성은 같아야 한다 (자료 검사가 확인).
- 칸 순서: `order` → id.
- 지금 자료의 칸: 화면(10, 비워 둘 수 없음) · 저장(20) · 로그인(30, 미룰 수 있음) · 외부 데이터(40, 분야 맞춤) · 알림(45, 미룰 수 있음) · 배포·공유(50, 나만 쓰면 선택).
- 칸의 `help`는 도구 고르기에서 칸 제목 아래 한 줄 설명이다. 필수 칸은 화면에서 '꼭 고를 것', 선택 칸은 '있으면 좋은 것'이다.

## 3. 후보와 점수 (`shop.ts`)

**후보**: 칸의 기능(`capability`)을 가진 모든 상품. 칸이 `matchDomain`이면 상품의 `domains`가 이용자의 domain 태그와 하나라도 겹쳐야 한다.

**이용자 수준**: `scoring.userLevelByAi`에서 이용자의 ai 태그에 맞는 값 (무료·유료 채팅 1, 웹에서 만드는 도구 1, 코딩 에이전트 2). 없으면 `defaultUserLevel`.

**점수** = 아래 항목의 합. 값은 `data/scoring.json`의 `weights`.

| 항목 키 | 조건 | 가중치 |
|---|---|---|
| domain | 상품 분야가 이용자 분야와 겹침 | domainMatch (+3) |
| topic | 이용자가 주제를 골랐고 상품에 주제가 있을 때: 겹치면 / 안 겹치면 | topicMatch (+3) / topicMissed (−3) |
| aiTool | 상품 `goodFor`에 이용자의 ai 태그가 있음 | aiToolMatch (+2) |
| budget | 0원으로 시작할 수 있는 상품 / 유료인데 이용자가 0원만 | freeProduct (+2) / paidWhenBudgetFree (−4) |
| realtime | 이용자가 실시간이 필요하고 데이터 상품일 때: realtime·frequent / daily·static (상품에 갱신 주기가 없으면 이 항목 없음) | realtimeMet (+2) / realtimeMissed (−3) |
| difficulty | 상품 난이도와 이용자 수준의 차이 × | difficultyGap (−1) |
| official | 공식 제공 | providerOfficial (+1) |
| access | 필요한 자격 (없음·가입 0, 키 −1, 승인 −2, 계좌·사업자 −4) | accessPenalty |
| proxy | 상품에 proxy 기능이 있고, 이 칸의 기능이 없는 다른 장바구니 상품 중 키 노출 위험 상품이 있음 | proxyNeeded (+2) |
| shared | 상품이 이미 장바구니에 있고, 이 칸보다 **앞선** 열린 칸의 기능도 가짐 (앞 칸을 채우려고 고른 상품이 이 칸도 맡을 수 있을 때). 고른 그 칸에서는 더하지 않는다 | sharedTool (+2) |
| local | 저장(store) 상품이고 저장 위치가 이용자 기기(local)일 때: 나만 씀 / 그 밖 (쓰는 사람 태그가 아직 없을 때도 여럿이 씀으로 본다) | localForMe (+2) / localForShared (−6) |

- 항목 값이 0이면 기록하지 않는다.
- **추천 이유**: 값이 양수인 항목을 큰 순(같으면 위 표 순서)으로 최대 `reasonsMax`(3)개. 화면 말은 `templates.reasonLabels` (예: budget → '0원으로 시작', shared → '이미 고른 도구로 해결').
- **아쉬운 점**: 값이 음수인 항목을 많이 깎인 순으로. 화면 말은 `templates.conLabels`.

**정렬**: 점수 높은 순 → 공식 제공 먼저 → 맡는 칸 수가 많은 상품 먼저 → 난이도 낮은 순 → id 순. 점수 공식은 바뀌지 않는다.

**맡는 칸 수** (`Scored.slotsCovered`, D55): 이 칸 1 + 다른 열린 칸(미룬 칸·선택 칸 포함) 중 ① 이 상품의 기능이 맞고 ② 다른 상품이 아직 채우지 않았고 ③ 그 칸에서 이 상품의 점수가 추천할 수 있는 상품 중 가장 높은(같아도 됨) 칸의 수. 예: 회원제 기록장의 저장 칸에서 4점이 셋이면 로그인 칸에서도 최고 점수인 Supabase가 앞선다. 브라우저 저장을 이미 고른 사람에게는 앱스 스크립트가 저장 칸을 맡는다고 배포 칸에서 앞서지 않는다. 동점이면 `compare.tieBy`가 무엇으로 갈렸는지 알려 준다(`official`·`coverage`·`difficulty`·`id`).

**추천**: 진열 상품(`layer: shelf`) 중 `recommendable`이고 점수가 `recommendThreshold`(3) 이상인 첫 상품. 색인 상품(원문만 있는 도구)은 추천하지 않는다. 칸마다 추천은 하나뿐이다. 웹에서 만드는 도구(`ai.builder`)의 배포·공유 칸은 추천하지 않는다(10절).

**다른 후보** (`runnerUp`, 예전 이름 '2위'): 추천이 있을 때, 추천이 아닌 진열 상품 중 첫 번째.

**다른 후보와 비교**: 항목마다 (추천 값 − 다른 후보 값). 양수인 항목은 "추천이 나은 점", 음수인 항목은 "다른 후보가 나은 점". 화면 문장은 `templates.reasonLabels`.

**채움**: 칸의 기능을 가진 장바구니 상품은 모두 그 칸을 채운다. 한 상품이 여러 칸을 채울 수 있다 (예: Supabase = 저장 + 로그인).

## 4. 도구끼리 맞춰 보기 (`recheck.ts`)

**충돌 순서**: 조건이 맞는 `conflict` 규칙(규칙 순서) → 비어 있는 필수 칸(칸 순서) → 열린 칸을 채운 직접 쓴 도구(고른 순서, 처음부터 kept, 9절). 빈 칸 충돌 id는 `conflict.empty-slot:칸id`이고, 문장은 칸의 `emptyMessage`/`emptyFix`, 없으면 `templates.emptySlot`. 화면은 충돌을 '막힌 곳'으로 보이고, 상태를 막힘(빨강) · 서행(노랑, kept) · 원활(초록)로 그린다.

- 나중으로 미룬 칸은 비어 있어도 충돌이 아니다.
- 이용자가 '그대로 가기'(아래 한 줄: "'알아볼 것'에 적어 둘게요.")를 고르면 `session.kept`에 충돌 id가 들어간다. 화면 상태는 서행이다.
- `mustFill` 칸(화면)이 비면 그 충돌은 `keepable: false`다. 그대로 갈 수 없고, 상품을 골라야 한다 (화면: 통행 불가).
- **`anchorSlot`**: 지도에서 막힌 곳을 붙일 칸. 규칙 충돌은 규칙의 `anchorSlot`이 **지금 열린 칸일 때만** 넘긴다. 없거나 열리지 않은 칸이면 키도 없다 = 길 전체 (예: 유료 도구). 빈 칸 충돌은 그 칸 id다. 지금 자료: realtime-mismatch → `slot.data`, personal-server → `slot.store`, key-in-static-page·key-on-public-host → `slot.host`(고치는 곳이 배포·공유), shared-without-login·paid-on-free → 없음 (고치는 곳이 목적지 답이나 길 전체). 엔진이 채운 빌더의 게시 기능은 어떤 규칙 조건에도 맞지 않는다(10절).
- **`deferrable`**: 빈 칸 충돌에서 그 칸이 나중으로 미룰 수 있는 칸(`deferrable`)이면 `true`. 화면은 이 막힌 곳에 '나중으로 미루기'를 함께 보인다. 미루면 그 칸은 충돌이 아니므로 막힌 곳이 사라진다.
- **출발 가능** (`canIssue`) = 목적지 질문이 끝났고, 모든 충돌이 kept. 화면의 '출발하기' 버튼이 이 값으로 켜진다.

**먼저 만들 것 / 나중에 붙일 것 나누기** (`suggestSplit`):
- 난이도 = 장바구니 상품 난이도의 합 (같은 상품은 한 번).
- 먼저 만들 것의 난이도(`difficultyFirst`) = 나중으로 미룬 칸에만 쓰이는 상품을 뺀 합. 어느 칸에도 안 쓰이는 상품은 먼저 만들 것에 남긴다.
- **제안할지(needed)** = 먼저 만들 것의 난이도 > `phaseSplitDifficulty`(6). 미루고 나서 6 이하가 되면 제안이 사라진다.
- **미룰 수 있는 칸(defer)** = 아직 미루지 않은, 미룰 수 있는 칸. 칸을 미뤄도 그 칸의 상품이 다른 칸에도 쓰이면 난이도 숫자는 그대로일 수 있다 (예: Supabase가 저장과 로그인을 함께 맡을 때 로그인을 미룸). 그래도 그 기능을 만드는 일은 나중으로 넘어간다.
- **더 쉬운 길(easier)** = 미루지 않은 칸마다, 그 칸만 맡은 상품 하나가 골라져 있을 때 같은 칸 진열 상품 중 추천 기준을 넘고 난이도가 더 낮은 첫 상품. `{ slotId, from, to }`.
- 화면은 needed일 때 defer('나중으로 미루기')와 easier('더 쉬운 길')를 보여 주고, 둘 다 비면 이대로 가도 된다고 알린다 (문구는 `src/copy/ko.ts`).

**칸 밖 상품**: 열린 칸 어디에도 쓰이지 않는 장바구니 상품 (도구끼리 맞춰 보기에서 '어디에도 쓰이지 않는 도구'로 알려 주고, 설계도 7번 표에 '기타'로 적는다).

## 5. 설계도 받기에서 받는 것 (`checkout.ts`)

여기서 '먼저 만들 상품'은 나중으로 미룬 칸에만 쓰이는 상품을 뺀 장바구니다. 맞춰 보기 뒤 규칙(`conflict`, `research`, `safety`, `stuck`, `notBuildRules`)의 조건에서는 `{ "deferred": "slot.notify" }`처럼 나중으로 미룬 칸을 볼 수 있다.

**알아볼 것** (`research`, 설계도 9번 '만들기 전에 알아볼 것'. id가 같으면 앞의 것만):
1. 조건이 맞는 `research` 규칙의 카드 (규칙 순서)
2. kept인 규칙 충돌의 `researchCard`
3. kept인 빈 칸 충돌 → `templates.emptySlot.research`로 만든 항목, id `research.empty:칸id`
4. 장바구니의 색인 상품(원문만 있는 도구) → `templates.indexResearch`로 만든 항목, id `research.index:상품id` (직접 쓴 도구는 빼고)
5. 장바구니의 직접 쓴 도구 → `research.custom:custom-n` (9절)
6. 빌더의 게시 기능이 배포 칸을 채우면 → `research.builder-publish` (10절)
7. 빈틈 → `session.gaps` 순서로 조사 카드 `research.gap-<id>` (9절)

**안전 지시**: `templates.safetyDefaults` 여섯 줄 + 조건이 맞는 `safety` 규칙 줄 (같은 문장은 한 번).

**막히기 쉬운 곳** (`stuck`): 장바구니 상품의 `stuck` (고른 순서) + 조건이 맞는 `stuck` 규칙.

**준비물**: 먼저 만들 상품의 `prep`. 걸리는 시간을 모르는 것(직접 쓴 도구, `lead: 'unknown'`) → 며칠 → 몇 시간 → 바로 순서, 같으면 고른 순서. 이름이 같으면 하나만.

**읽어 둘 용어** (`study`):
1. 먼저 만들 상품의 `needsConcepts`를 모으고 선수 개념(`prerequisites`)을 끝까지 더한다.
2. 선수 개념이 먼저 오게 줄 세운다 (위상 정렬). 동시에 배울 수 있으면 `order` → id.
3. 먼저 읽어 둘 용어(`study.required`) = 줄에서 `level: must`인 것 앞에서부터 `studyRequiredMax`(3)개. 나머지는 단계마다 '만들면서 볼 용어'로 나온다.

**진행 순서 (단계)**:
1. 열린 칸 중 나중으로 미루지 않았고, 채웠거나 빈 칸을 kept한 칸만 단계가 된다 (칸 순서).
2. **중간 서버 준비 단계**: 먼저 만들 상품에 키 노출 위험 상품과 proxy 기능 상품이 함께 있으면, 키 노출 위험 상품이 처음 나오는 단계 바로 앞에 `step.proxy` 단계를 넣는다 (문장은 `templates.proxyStep`, 쓰는 도구는 proxy 상품). 키를 화면에 넣지 않은 채 데이터를 붙이게 하려는 것이다.
3. 상품의 필요 개념은 그 상품이 처음 나오는 단계에 붙인다. 개념의 `stepHint`가 `proxy`이고 중간 서버 단계가 있으면 그 단계에, 다른 기능이고 상품이 그 기능의 칸도 맡으면 그 칸의 단계에 붙인다 (예: 배포 개념은 배포·공유 단계).
4. 선수 개념은 함께 붙이고, 이미 앞 단계에 붙은 개념은 다시 붙이지 않는다.
5. 단계 제목과 완성 확인 기준은 `templates.slotSteps`.

**예상 시간(분)** = `baseMinutes`(30) + 먼저 만들 상품의 `setupMinutes` 합 (없으면 `unknownSetupMinutes` 60). 빌더의 게시 기능은 더하지 않는다(10절).

**만들지 않을 것**: `templates.notBuildRules` 중 조건이 맞는 문장.

## 6. 영수증과 설계도

- `receiptModel`: 품목(상품마다 맡은 칸 이름, 나중 여부, 가격 '0원'/'유료'/'모름'(직접 쓴 도구·빌더의 게시 기능, `unknown: true`)), 도구 비용 합계(유료 도구가 있으면 '유료 포함', 없고 비용을 모르는 도구(직접 쓴 도구·빌더의 게시 기능)가 있으면 `receipt.totalUnchecked` '0원 + 확인 필요', 모두 0원으로 시작할 수 있으면 `receipt.totalFree` '0원으로 시작'), 예상 시간, 먼저 만들 것의 난이도(`difficulty` 숫자는 모형에만 두고, 글은 쉬움(3 이하)·보통(6 이하)·어려움 말만), 준비물·읽어 둘 용어·알아볼 것 개수(글은 `receipt.count` '{{n}}개'). 글자는 모두 `templates.receipt`. '요금'은 코드쇼퍼 이용료(늘 0원, 도장과 맺음말)에만 쓰고 도구 비용에는 쓰지 않는다.
- 맡은 칸이 여럿이면 '화면, 저장'처럼 잇고, 11칸을 넘으면 '저장 외 1개' (예: '저장, 배포·공유'는 15칸이라 '저장 외 1개').
- `difficultyWord(cat, n)`: 난이도 합을 말로. `toolDifficultyWord(cat, d)`: 도구 하나의 난이도(1~3)를 쉬움·보통·어려움으로 (화면의 '난이도 보통').
- 예상 시간: 55분 미만은 10분 단위('약 40분'), 그 위는 30분 단위('약 1시간', '약 2시간 30분').
- `renderReceiptText`: 고정폭 36칸. 한글은 2칸으로 센다. 긴 이름은 '…'로 자른다. 품목 줄은 칸 이름 자리 + 도구 이름 자리 + 띄움 + 가격 4칸이다. 칸 이름 자리는 기본 12칸(이름 11칸)이고, 11칸을 넘는 이름(예: '로그인(나중)' 12칸)이 있으면 그 영수증만 13칸으로 넓히고 도구 이름 자리를 19칸에서 18칸으로 줄인다. '(나중)' 표시는 늘 보이게 칸 이름 쪽을 먼저 자르고 붙인다 (예: '로그…(나중)'). 그림 문자(이모지)는 2칸으로 센다. 합계·시간·난이도·개수는 한 줄에 하나씩, 값을 오른쪽 끝에 붙인다.
- `renderPack`: 12개 항목의 마크다운. 모든 문장은 `templates.json`과 상품 카드에서 온다. 형식은 `docs/RECEIPT.md`. 나중으로 미룬 칸에만 쓰이는 도구는 7번에 '(나중)'을 붙인다. 용어 링크는 `{{site}}/terms/{{id}}`. 6번 '디자인 지시' 본문은 `PackOptions.design`(11절 `renderLookSection`)으로 받고, 없으면 느낌·화면 크기·접근성 줄과 `pack.designPending` 한 줄만 쓴다 (T38). 디자인 정하기의 앱 이름(`look.appName`)은 1번에, 더하고 싶은 화면(`look.screens`)은 3번 끝에 `pack.screenAdded`와 함께 넣는다 (P1).
- `packFileName(date)`: `codechauffeur-plan-YYYYMMDD-HHmm.md` (이용자 기기 시간).
- 프로젝트 이름(설계도 제목, 영수증 목적지): 자유 입력(30자) → 만들 것의 내 말(`notes['q.type']`, 30자) → 유형 이름(`type.custom`이면 '직접 쓴 앱') → '내 앱'.

## 7. 그 밖의 함수 (`extras.ts`)

- `badges(cat, product)`: 0원으로 시작, 처음 쓰기 쉬움(난이도 1), 공식, 실시간, 자주 갱신, 주의(추천 제외). 글자는 `templates.badges`.
- `prepWait(product)`: 준비물(`prep`) 가운데 가장 오래 걸리는 것이 며칠이면 `'days'`, 몇 시간이면 `'hours'`, 아니면 `null`. 도구 고르기 꼬리표 '승인 기다림 · 며칠/몇 시간'만 그리고(결제 카드는 상품 칸 `paymentCard`), 점수·규칙 조건에는 쓰지 않는다 (T37, 설계서 5.6절).
- `matchErrors(cat, text)`: 에러 안내의 정규식(대소문자 무시) 중 하나라도 맞는 항목, 적힌 순서.
- `toShareState(session)` / `fromShareState(raw)`: 영수증 링크(`/arrival#r=…`)용. 자유 입력·내 말·직접 쓴 도구 이름은 넣지 않는다(9절의 `x`·`g`만, 디자인은 11절의 `l`). 받는 쪽은 모양만 검사하고, id 검사는 `normalizeSession`이 한다(디자인 id는 11절 `normalizeLook`).
- `checkQuiz(cat, conceptId, index, choice)`: 용어 카드의 확인 문제 채점.

## 8. 바꿀 때 절차

1. 무엇을 왜 바꾸는지 `docs/DECISIONS.md`에 한 줄 적는다.
2. 코드나 `data/scoring.json`을 바꾼다.
3. `npm run explain -- 사례id`로 바뀐 점수를 확인한다.
4. `npm run golden`이 실패하면 차이를 읽고, 의도한 변경인 사례만 기대 결과를 손으로 고친다. 고친 사례와 이유를 커밋 메시지에 적는다.
5. `npm run examples`로 예시를 다시 만들고, `npm run check`가 통과해야 커밋한다.

알려진 빈틈: 분야 안에서 점수·공식·맡는 칸 수·난이도가 모두 같아 **영문 id 순서로** 추천이 갈리는 곳이 남아 있다 (예: 사전 API 셋, 하루 단위 교통·공공·문화). 주제를 더 나눌지 `docs/BACKLOG.md`에서 정한다. `npm run explain`이 동점을 가른 값(공식·맡는 칸 수·난이도)을 함께 찍는다.

## 9. 직접 쓴 답과 도구 (`custom.ts`, `match.ts`, D74·D88)

설계서 `docs/review/v3/brief.md` 7절, 정본 `docs/review/v3/input.md` 6~8절. 엔진은 이용자가 **확정한 것**(`answers`·`notes`·`customTools`·`gaps`)만 본다. 낱말 찾기 결과는 `evaluate()`에 들어가지 않는다. 그래서 낱말표를 고쳐도 골든이 흔들리지 않는다.

**세션 칸** (`Session`, 저장 키 `cc:session:v1`):
- `notes`: 질문 id → 직접 쓴 글(내 말). 보기를 골랐어도 남는다. `normalizeSession`이 있는 질문 id만, 한 줄로(`oneLine`) 40자(코드 포인트)까지 남기고 빈 글·글이 아닌 값은 버린다.
- `customTools`: 목록에 없는 도구 `{ id: 'custom-1'~'custom-5', name, capability }`. 모양·id·기능이 맞는 것만, 같은 id·같은 이름(띄어쓰기·대소문자 무시, 빈 이름은 겹침으로 보지 않음)은 앞의 것 하나, 5개까지, 이름은 한 줄 40자. 장바구니의 `custom-n`은 이 목록에 있을 때만 남는다.
- `gaps`: 화면이 직접 쓴 글에서 찾은 빈틈 id. 조사 카드 `research.gap-<id>`가 있는 id만 남긴다(엔진은 낱말표를 읽지 않는다).
- `freeText`(마지막 한 줄)는 그대로 둔다. 화면의 한 줄 칸이 이 값을 그대로 보이므로 정리하면 쓰는 중에 띄어쓰기를 먹는다. 줄바꿈·앞뒤 공백·80자(`LINE_MAX`)는 쓰는 곳(설계도 1번 한 줄 설명, 이름 30자)이 `oneLine`으로 정리하고, 저장 값은 `readSession`이 200자로 자른다.
- 넷 다 비면 칸을 만들지 않는다(옛 세션·링크와 같은 모양).

**그대로 둔 답**: 직접 쓰기 보기(`custom`)는 자료의 `tags`를 그대로 더한다. 대부분 `like` 보기('모르겠어요')와 같은 태그이고, 예외 셋은 `q.type` → `type.custom`(알림 질문 `q.notify`도 묻는다), `q.domain` → `need.data`만, `q.audience` → '몇 명이 같이'. `matchingRecipes`는 직접 쓰기 답을 '모르겠어요'처럼 센다.

**고른 답 칩** (`answerChips(cat, state, notes)`): 직접 쓰기 답은 '직접 쓰기' 대신 내 말 “앞 20자…”, 내 말이 없으면(링크로 받음) `templates.customAnswer.hidden`('직접 쓴 답'). 보기를 골랐으면 보기 이름 그대로.

**직접 쓴 도구** (`customProduct`, 카탈로그에 넣지 않는다):
- `cartProducts(cat, ids, customTools)`가 `custom-n`을 '모름' 도구로 만든다: `custom: true`, `layer: 'index'`, 기능 = 쓴 칸의 기능, `serverRegion: 'unknown'`, `recommendable: false`, 제공 `generic`, 난이도 `scoring.unknownDifficulty`(2), 준비 시간 없음(→ `unknownSetupMinutes` 60), 링크·필요 개념·막힘·지시 없음. 준비물은 한 줄 `templates.customTool.prep`("{{name}}: 가입이나 키가 필요한지 먼저 확인", `lead: 'unknown'` → `leadLabels.unknown` '걸리는 시간 모름'): 설계도 8번이 '따로 가입하거나 발급받을 것이 없다'고 단정하지 않게(T37 검토, 골든 case-28·29). 이름이 비면 `templates.customTool.hiddenName`('직접 쓴 도구').
- **규칙 조건**: 모르는 사실(`provider.type`·`access`·`realtime`·`cost.free`·`keyExposureRisk`·`publicKey`)은 `productField`가 값 없음을 돌려줘 `is`·`in`이 맞지 않는다. 그래서 유료·키 노출·실시간 막힌 곳이 켜지지 않는다(모르는 도구에 사실을 단정하지 않는다). 서버 위치만 `unknown`이라 개인정보 막힌 곳(`conflict.personal-server`)은 켜진다. `custom` 칸은 참이라 `safety.custom-tool`이 켜진다.
- **도구 고르기** (`rankSlot`): 칸을 채운다(`filledBy`에 `custom-n`). 후보·점수·추천·비교에는 끼지 않는다. `SlotRanking.custom` = 그 칸 기능의 직접 쓴 도구(쓴 순서, 장바구니에 없어도).
- **맞춰 보기**: 열린 칸을 채운 직접 쓴 도구마다 `conflict.custom-tool:custom-n`(`kind: 'custom-tool'`, `customTool`, `anchorSlot` = 그 칸, `keepable: true`, **늘 `kept: true`**). 쓰는 순간 확인 못 한 길을 고른 것이라 출발(`canIssue`)을 막지 않는다. 문장 `templates.customTool.message`·`fixHint`(이름 없이 받은 도구는 `messageHidden`, 아래). 칸이 사라진 직접 쓴 도구는 서행 없이 '어디에도 쓰이지 않는 도구'(`orphans`)다.
- **알아볼 것**: 도구마다 `research.custom:custom-n` = 조사 카드 `templates.customTool.researchCard`의 본문 + 머리 `templates.customTool.researchArea`({{name}}). 영수증 링크로 받아 이름 자리가 `hiddenName`인 도구(`nameHidden`)는 '직접 쓴 도구 확인하기: 직접 쓴 도구'처럼 겹치지 않게 `researchAreaHidden`·`messageHidden`을 쓰고 7번에 `customTool.mark`를 붙이지 않는다. 그 도구의 '무엇을 확인' 앞과 7번 메모에는 `customTool.memoHidden`(어떤 도구인지 먼저 물어보게)을 쓴다. `research.index:*`는 만들지 않는다.
- **막힌 곳을 직접 쓴 도구로 풀 수 있나** (`customToolClears(cat, r, conflictId)`, T37·D95): 그 막힌 곳이 붙은 칸을 맡던 도구를 빼고(다른 칸을 혼자 맡으면 남긴다, 도구 고르기의 정하기와 같다) 이름 없는 직접 쓴 도구 하나를 넣어 `evaluate`를 다시 돌려, 같은 id의 풀지 않은 막힌 곳이 없으면 true. 빈 꼭 고를 칸·실시간처럼 고른 도구의 사실로 켜진 막힌 곳은 풀리고, 서버 위치 '모름'으로 켜지는 개인정보 막힌 곳과 다른 도구 때문에 켜진 키 노출 막힌 곳은 그대로다. 기능에 붙지 않은 막힌 곳, 그대로 둔 막힌 곳, 직접 쓴 도구를 5개 다 썼을 때는 false. 화면은 도구끼리 맞춰 보기의 '바꾸기' 끝 [목록에 없는 도구 쓰기 ›]를 이 값이 true일 때만 단다.
- **영수증**: 비용 '모름'(`receipt.unknown`, 4칸), 합계는 6절. **설계도 7번**: 이름 + `customTool.mark`('(직접 씀)'), 링크 없음, 제공·자격·비용·라이선스·확인한 때는 `customTool.unchecked`('확인 필요'), 메모 `customTool.memo`(이름이 없으면 `memoHidden`). 2·5·10번의 도구 이름은 `productOf(cat, r, id)`(결과의 장바구니 → 세션의 직접 쓴 도구 → 카탈로그)로 찾는다.

**설계도 1번** (`renderPack`): 한 줄 설명 = 한 줄 입력 → `notes['q.type']` → 종류 목표. 고른 답 다음에 내 말이 하나라도 있으면 `- 내 말 그대로: {pack.mine.rule}` 한 줄과 질문 순서로 아래 줄: 보기를 골랐으면 `pack.mine.picked`(“내 말” → 고른 답 보기), 그대로 뒀으면 `pack.mine.kept`(도구를 고른 기준 `{{as}}` = `like` 보기 이름, 없으면 그 보기 태그 이름: '외부 데이터'). 만들 것(`q.type`)을 그대로 뒀으면 아래 `customType` 줄이 따로 붙으므로 `pack.mine.keptType`(꼬리 없음). '쓰는 AI'처럼 보기마다 `aiTool`이 있는 이름 질문은 계산에 쓰지 않으므로 `pack.mine.keptName`(꼬리 없음). `type.custom`이면 `pack.mine.customType` 한 줄. 직접 쓴 답이 있는데 내 말이 없으면(영수증 링크로 받음) `- 내 말 그대로: {pack.mine.hidden}` 한 줄. `pack.mine.rule`은 AI가 내 말을 고른 답보다 앞에 두되, 7번 도구로 할 수 있는지 9번에서 함께 확인하고 2번 범위 밖이면 먼저 묻게 한다(T37 검토). '만드는 AI' 줄은 `q.ai` 보기 이름 뒤에 쓰는 AI 이름을 괄호로 붙인다(목록에서 골랐으면 보기 이름, 직접 썼으면 “내 말”, 안 정했으면 붙이지 않음, 설계서 7.1절). 내 말은 한 줄 40자에 “ ”로 감싸 새 제목을 만들 수 없다.

**가져올 정보를 직접 썼을 때**: 빈 외부 데이터 칸을 그대로 두면 `research.empty:slot.data`의 '무엇을 확인'만 `templates.emptySlot.researchWithNote`(내 말)로 바꾼다. id는 그대로.

**영수증 링크** (`ShareState`, 판 번호 `v: 1` 그대로): 직접 쓴 글·도구 이름은 넣지 않는다. 장바구니의 직접 쓴 도구는 `x: { 'custom-n': 기능 }`, 빈틈은 `g: [id]`로 있을 때만 넣는다. `fromShareState`는 `x`의 id 모양·기능 이름을 검사해 이름 없는 도구를 만들고, 모르는 값은 버린다. 그래서 링크로 연 영수증·설계도에는 이름 자리에 '직접 쓴 도구'가 보인다. 옛 화면은 모르는 칸 `x`·`g`를 버린다.

**낱말 찾기** (`match.ts`, AI 아님, 화면이 직접 쓰기 칸을 처음 열 때 낱말표 `data/aliases.json`과 함께 `import()`로 늦게 받는다. `index.ts`에서 내보내지 않는다):
- `normalizeForMatch`: NFKC·소문자·폭 없는 글자 지움·글자와 숫자와 `+`·`#` 밖은 띄어쓰기(`src/lib/aliases.ts` `normalizeWords`). 견줌은 띄어쓰기를 뺀 글에서, 어절 경계는 따로 든다.
- `findAliases(text, entries)`: 모든 자리를 찾고 **긴 말부터 겹치지 않게**(같으면 앞 자리 → 자료 순서). `=` 열쇠는 어절 전체가 같을 때만. 한 칸에서 쓰는 낱말표(보기 · 도구 이름 · 갈래 짐작 · 빈틈)를 한 번에 넘긴다('업비트'가 '비트'를 이긴다).
- `matchAnswer(cat, aliases, questionId, text)`: 보기마다 찾은 서로 다른 말의 개수 → 가장 긴 말 → 보기 순서로 최대 3개(보기 낱말 질문은 ‘모르겠어요’·‘직접 쓰기’ 보기를 제안하지 않음). 예·아니요 질문(`yesNo.topics`)은 아니요 말·부정된 주제어(주제어 뒤 `negWindow` 6글자 안의 `negAfter`) → 모름 말 → 아마 말 → 예 말·주제어 순서로 하나(모름 말이면 ‘모르겠어요’ 보기 `unknown`을 제안한다, `input.md` 6.5절). `q.ai`는 에이전트 → 빌더 → 유료 → 채팅·무료 이름 순서. `q.budget`은 돈 단위가 붙은 숫자를 한 달 기준(한 달 말이 있으면 그대로, 년 ÷12, 주 ×4, 하루 ×30. '년'·'연'은 숫자 바로 뒤나 따로 선 어절일 때만이라 '청소년'·'작년'은 기간이 아니다)으로 읽어 0원 → 0원만, 1만 원 미만 → 몇천 원까지, 이상 → 필요하면 더(숫자가 없으면 보기 낱말). `q.realtime`은 숫자 + 초·분·시간 → 실시간, 숫자 + 일·주·달 → 하루 한 번. 아무것도 못 찾았고 영문 글자뿐이면 두벌식으로 되돌려(`qwertyToHangul`, 완성 글자 70% 이상) 한 번 더 찾고 `readAs`를 붙인다. 빈틈은 그 질문이 `gaps[].where`에 있을 때만.
- `matchTool(cat, aliases, r, slotId, text)`: `same` = 진열 상품의 공식 이름이나 `toolHints`의 한글 표기로 찾은 도구(그 도구가 보이는 열린 칸, 이 칸인지), `near` = 갈래 짐작(기능 + 분야)의 진열 도구 2개(이 칸의 목록에 있으면 그 순위 순서, 없으면 카탈로그 자료 순서와 `inSlot: false`). 순위 계산을 새로 하지 않는다.
- `gapsIn(cat, aliases, texts)`: 여러 글(`q.*` · `line` · `tool`)의 빈틈을 자료 순서로. `gapsOfSession(cat, aliases, session)`: 세션의 직접 쓴 글 전부(내 말 `notes`·마지막 한 줄·직접 쓴 도구 이름)에서 `gapsIn` — 화면이 내 말을 정하거나 지울 때 `session.gaps`를 이 값으로 바꾼다(T37, D91). `looksLikeContact(text)`: 전화·전자 우편처럼 보이는 글(막지 않고 화면이 경고). `readMoney(text)`: 한 달 기준 원.
- 시험 `tests/engine/match.test.ts`: 맞춘 묶음 73개 모두, 맞추지 않은 묶음 27개 중 26개(못 맞힌 1개: '기차 시간표' → 학교 정보, 같은 개수일 때 긴 말이 이김), 찾으면 안 되는 글 10개 제안 0, 도구 이름 12개.

## 10. 웹에서 만드는 도구의 공개 (`builder.ts`, B-02·D89)

설계서 `docs/review/v3/brief.md` 7.7절·8.1절 B-02. 웹에서 만드는 도구(Lovable·Bolt·v0 같은 것, `q.ai`의 `builder` 보기 → 태그 `ai.builder`)는 공개도 그 도구 안의 게시 기능으로 한다. 계산 없이 두면 이 이용자의 영수증과 설계도에 GitHub Pages나 Cloudflare가 추천되어, 빌더의 게시 기능과 겹치는 틀린 안내가 된다. 그래서 P0 최소안으로 배포·공유 칸만 따로 계산한다.

- **빌더의 게시 기능** (`builderPublishProduct`, id `builder-publish`): `products.json`에 넣지 않는 엔진 상수 + `templates.builderPublish` 문장. 기능은 `host` 하나, `builderPublish: true`, `layer: 'index'`, `recommendable: false`, 제공 `generic`(`builderPublish.provider` '쓰는 웹 빌더'), 링크·준비물·필요 개념·막힘·지시 없음. 자료 검사가 `products.json`의 같은 id를 막는다.
- **언제 채우나** (`withBuilderPublish`, `evaluate` 안): `ai.builder` 태그가 있고, 공개(`host`) 기능 칸이 **꼭 고를 칸**(여럿이·아무나 쓰는 앱)으로 열려 있고, 고른 도구 중 공개 기능이 있는 것이 없을 때 결과의 고른 도구(`r.cart`) 끝에 더한다. 나만 쓰는 앱의 선택 칸은 채우지 않고 비워 둔다(추천은 아래 `rankSlot`이 여전히 막는다). 채우면 10번 '공개하기' 단계와 `safety.local-key`의 '키가 든 파일은 공개 주소에 올리지 않는다'가 한 설계도에 함께 나오고, 이 상품은 규칙 조건에 끼지 않아 `conflict.key-on-public-host`도 켜지지 않기 때문이다. 세션 장바구니(`r.session.cart`)와 영수증 링크에는 넣지 않는다(이용자가 고른 것이 아니다). 링크로 열면 답에서 다시 계산된다.
- **다른 곳에 공개하고 싶을 때**: 이용자가 공개 기능이 있는 도구(진열 도구나 직접 쓴 도구)를 고르면 그 도구가 칸을 채우고 빌더의 게시 기능은 빠진다. 다른 칸을 맡으려고 고른 도구가 공개 기능도 있으면(구글 시트 + 앱스 스크립트, Cloudflare Workers) 그 도구가 채운다. 지금 계산 그대로이고, 빌더 이용자에게 맞는지는 BACKLOG에서 본다.
- **도구 고르기** (`rankSlot`): 칸 기능이 `host`이고 `ai.builder`면 `SlotRanking.builder` = 빌더의 게시 기능, 아니면 `null`. 이 칸은 추천·다른 후보·비교가 없다(`recommended`·`runnerUp`·`compare` 모두 `null`). 진열 목록과 점수는 그대로 계산해 둔다(화면의 [다른 곳에 공개하기]가 펼친다). 꼭 고를 칸이고 고른 공개 도구가 없으면 `filledBy` = `['builder-publish']`라서 남은 칸이 아니고 빈 칸 막힌 곳도 없다. 선택 칸이면 `filledBy`는 비어 있고 `builder`만 있다. 화면(T37): "쓰는 웹 빌더가 공개를 맡아요." + [다른 곳에 공개하기] (`ko.shop.builderLine`·`builderOther`, 칩의 숨은 상태 '쓰는 웹 빌더가 맡아요'는 `pick-nav.ts`의 `builderFills`). 화면의 '정한 도구'(`pick-nav.ts`의 `savedFor`)는 세션 장바구니에 있는 것만 세므로, 이 상품은 정한 도구로도 뺄 도구로도 보이지 않는다.
- **규칙 조건**: `matchProduct`는 이 상품을 어떤 조건에도 맞지 않게 본다. 배포 칸에 걸린 막힌 곳 규칙(`conflict.key-on-public-host`: 나만 쓰는 앱 + 키 노출 데이터 도구 + 공개 도구)은 나만 쓰는 앱에서만 켜지는데, 그때는 이 상품이 칸을 채우지 않으므로(위 '언제 채우나') 둘이 만나지 않는다. 나만 쓰는 빌더 앱에는 공개 단계가 없고 `safety.local-key`가 키가 든 파일을 공개 주소에 올리지 말라고 지시한다. 키 자체를 보는 막힌 곳(`conflict.key-in-static-page`: 여럿이 쓰는 앱 + 키 노출 도구 + 중간 서버 없음)은 공개 도구와 상관없이 그대로 켜진다. 고치려면 중간 서버 기능이 있는 공개 도구를 고르고, 그러면 그 도구가 배포 칸을 채운다. 이 고치는 법 문장("Workers나 앱스 스크립트를 배포·공유에 쓸 도구로 고르세요")은 빌더 이용자에게는 빌더의 게시 기능을 빼라는 말이 되어 맞지 않는다. 빌더의 비밀 값·서버 함수 기능을 원문으로 확인한 뒤 빌더용 고치는 법을 더한다(BACKLOG).
- **알아볼 것**: 이 상품이 칸을 채우면 조사 카드 `templates.builderPublish.researchCard`(`research.builder-publish`, 출처 `builder`)를 직접 쓴 도구 다음, 빈틈 앞에 붙인다: 무료 요금제로 공개할 수 있나 · 내 주소를 붙일 수 있나 · 공개 범위. 숫자(한도·요금)는 싣지 않는다. `research.index:*`는 만들지 않는다.
- **비용·난이도·시간**: 비용은 '모름'과 같다(`costUnchecked`: 영수증 비용 칸 '모름', 유료 도구가 없으면 합계 '0원 + 확인 필요'). 난이도 합(`split`)과 예상 시간(`minutes`)에는 더하지 않는다(`toolsToSetUp`). 쓰던 빌더 안의 기능이라 새로 붙일 도구가 아니다. 진행 순서에는 배포 단계로 나온다(`slotSteps['slot.host']`).
- **설계도 7번**: 이름 `builderPublish.name` · 제공 `builderPublish.provider` · 자격·비용·라이선스·확인한 때 `customTool.unchecked`('확인 필요'), 링크 없음, 메모 `builderPublish.memo`. 2·10번의 도구 이름은 `productOf`로 찾는다.
- 다른 칸(화면·저장·로그인)은 지금 계산 그대로다. 빌더 자체 저장소·로그인 계산은 BACKLOG.
- 지키는 것: 골든 case-31(웹에서 만드는 도구 + 안내 페이지, 배포 칸 = `builder-publish`), 시험 `tests/engine/builder.test.ts`(GitHub Pages·Cloudflare가 추천되지 않음, 고른 공개 도구가 이김, 나만 쓰는 앱의 선택 칸은 비워 둠, 공개 주소 막힌 곳이 켜지지 않음, 영수증 '0원 + 확인 필요', 설계도 7번).

## 11. 디자인 정하기 (`look.ts`, `look-render.ts`, `look-choice.ts`, `color.ts`, T38·D76·D96)

설계서 `docs/review/v3/brief.md` 4절, `docs/review/v3/design.md` 5·7절. 디자인은 추천·막힌 곳과 상관없다. `evaluate()`는 `session.look`을 모양만 골라(`normalizeLookShape`) 결과에 실어 둘 뿐이고, 점수·칸·막힌 곳·영수증 숫자는 그대로다. 그래서 골든 기대값은 바뀌지 않는다. 예외 하나: 글꼴을 직접 고르면(`look.font = 'custom'`) 알아볼 것에 `research.look-font`(글꼴 라이선스, 출처 `look`)를 빈틈 다음에 더한다. 영수증 링크에도 글꼴 `custom`이 실려 다른 기기에서 열어도 알아볼 것 수가 같다(이름은 싣지 않는다).

- **자료**: 값과 이름표는 `data/looks.json`(`schemas/looks.schema.json`, `Looks`), 6번 문장은 `templates.look`, 미리 보기 이름표는 `templates.lookSummary`. `looks.json`은 `Data`에 넣지 않는다(낱말표 `aliases.json`과 같이 부르는 쪽이 넘긴다). 화면은 `src/lib/look-data.ts`(디자인 정하기 묶음)와 `src/lib/look-render-data.ts`(설계도 6번 묶음)를 누를 때·설계도 받기에서 `import()`로 받는다. 단계 화면 첫 묶음의 문장 틀에는 `templates.look`이 없다(`virtual:cc-data/templates-core`).
- **고른 것** (`LookChoice`, `Session.look`): 대표 색(견본 id 또는 `#RRGGBB`)·밝기(`light`·`dark`·`both`)·글꼴 짝·모서리·촘촘함·움직임·아이콘·그림·첫 화면 배치·말투 id, 그리고 글 칸(색 이름 20 · 글꼴 30 · 아이콘 30 · 그림 40 · 배치 40 · 바라는 점 80 · 닮고 싶은 앱 60 · 앱 이름 20 · 말투 20 · 더하고 싶은 화면 40×3). 느낌은 여기 없다: `q.style`의 답이 느낌이고, 느낌 직접 쓰기 글은 `notes['q.style']`이다. `normalizeLookShape`는 모양만(id 꼴, `#RRGGBB`는 대문자, 글은 `oneLine`과 글자 수) 보고, `looks.json`에 없는 id는 `normalizeLook`이 버린다.
- **정하는 순서** (`lookSpec(cat, looks, r)`): 직접 고른 값 > 쓴 말에서 찾은 값 > 기본값. 느낌은 `q.style` 답이 느낌이면 그것, 아니면 `notes['q.style']`에서 `keywords.mood`, 그다음 앱 종류 추천 첫째. 대표 색은 `look.accent`, 아니면 `notes['q.style']`·`look.accentName`에서 `keywords.accent`, 그다음 느낌의 색. 밝기는 `look.theme`, 아니면 `notes['q.style']`에 어두운 말(`keywords.theme`)이 있으면 '둘 다'(어둡게만이 아니다), 그다음 '밝게만'. 찾기는 직접 쓰기와 같은 `findAliases`(`match.ts`)이고 칸마다 따로 찾는다. 한 칸에서 여러 대상이 걸리면 찾은 말 수 → 앞 글 → 앞자리 → 자료 순서. 글꼴·모서리(느낌의 `radiusValues`가 먼저)·깊이·아이콘·움직임은 느낌의 짝, 촘촘함·그림은 앱 종류(`defaultsByType`), 배치는 앱 종류의 첫째. 앱 종류 열쇠: 기본값은 `q.type` 답(직접 쓴 앱·안 정함은 `custom`), 화면·배치는 앱 종류 태그(`LOOK_TYPE_OF_TAG`). 타일 순서(`order`)는 앱 종류 추천 셋 + 나머지 자료 순서. 짧은 판은 `ai.chat-free`(또는 AI를 안 고름).
- **대비** (`deriveAccent`, 엔진 목표 4.6:1, 화면·설계도에는 기준 4.5:1을 적는다): 견본은 `looks.json` 값 그대로이고 `npm run validate`가 80쌍(대표 색 10 × 바탕 4 × 밝기 2, 대표 색 글자/면·바탕)·버튼 글자·옅은 면 위 글자·어두운 옅은 면 위 글자 4.6:1, 바탕 묶음 글자·약한 글자·오류·성공 4.6:1, 입력 테두리 3.1:1을 본다. 모자라면 L을 0.01씩 옮긴 값을 알려 주고, 그 값을 자료에 넣는다(청록 밝음 #0B7A80 → #02777D). 직접 고른 색: 1) 버튼 바탕은 그대로, 글자는 흰색 → #111111 순서로 4.6:1을 넘는 것. 둘 다 못 넘는 좁은 띠(L≈0.18 근처, 예: #E4007F)는 바탕을 가까운 쪽으로 옮긴다(`buttonAdjusted`). 2) 글자·링크 색은 바탕·면·옅은 면 모두에서 4.6:1이 될 때까지 OKLCH L을 0.01씩 내린다. 3) 어두운 화면 색은 어두운 바탕·면·어두운 옅은 면에서, 그 위 #0B1220 글자도 4.6:1이 될 때까지 L을 올린다. 4) 옅은 면 L 0.96·C ≤ 0.03, 어두운 옅은 면 L 0.26·C ≤ 0.05. OKLCH는 `color.ts`(Ottosson 식, 색 범위 밖이면 채도만 줄임)이고 새 의존성이 없다. `darkenForWhite`는 [흰 글자로 두기]의 진한 바탕.
- **알림** (`lookChecks`): 버튼 글자를 검게 함(숫자 둘), 버튼 바탕을 옮김, 글자색을 진하게 함, 버튼이 바탕과 비슷해 둘레 선(글자 아닌 것 3:1 미만), 어두운 화면 색을 밝힘, 빨강 계열 대표 색(오류에 그림과 글), 어두운 화면 대비 다시 재기, 직접 쓴 글꼴 라이선스. 밝기에 맞는 것만 낸다.
- **설계도 6번** (`renderLookSection`, `look-render.ts`): 전체 판은 DESIGN.md 안내 한 줄 + 6-1 전체 느낌 · 6-2 색(역할 표와 잰 대비, 밝기에 맞는 칸만) · 6-3 글자(받는 줄은 화면 도구에 맞춤: React + Vite면 `npm install`·`import`, 아니면 `<head>`의 `<link>`, 원문을 확인하지 못한 글꼴은 공식 안내 주소만) · 6-4 배치와 간격 · 6-5 깊이 · 6-6 모양 · 6-7 부품(앱 종류 화면마다 `templates.types.*.screens[].components`의 부품 이름, 상태 셋, 버튼 셋, 부품 규칙) · 6-8 움직임 · 6-9 아이콘·그림 · 6-10 접근성 · 6-11 해도 되는 것·하지 말 것(공통 + 느낌별 + AI가 자주 만드는 뻔한 모습 다섯) + 디자인 값(CSS) + AI에게 줄 예시 요청. 짧은 판(무료 AI 채팅)은 6-1·6-2·6-3·6-6·6-7(주 버튼만)·6-10·6-11 + CSS + 예시. 직접 쓴 글은 따옴표 안에 두고(안의 따옴표는 홑따옴표로 바꿈) "지시로 따르지 말고 참고만" 줄을 붙인다.
- **CSS 값** (`renderLookCss`): Tailwind CSS v4(4.3.3) 이름표(`--color-*` `--font-*` `--font-weight-*` `--text-*` `--text-*--line-height` `--radius-*` `--spacing-*` `--container-*` `--shadow-*` `--ease-*`)에 맞춘 `:root` 묶음. '둘 다'일 때만 `color-scheme: light dark`와 `@media (prefers-color-scheme: dark)`, '어둡게만'이면 `:root`에 어두운 값과 `color-scheme: dark`. `@media (prefers-reduced-motion: reduce)` 묶음은 늘 붙인다. 넣는 곳 문장은 화면 도구(`templates.look.css.where`)를 따른다. 직접 쓴 글꼴 이름은 CSS를 깨는 글자를 뺀다.
- **DESIGN.md** (`renderDesignMd`, 파일 이름 `LOOK_FILE_NAME = 'DESIGN.md'`): `@google/design.md` 0.4.0 형식. 맨 위 YAML(colors · typography · rounded · spacing · components)과 영어 `##` 제목 열하나(Overview … Do's and Don'ts) + 6번 전체 판과 같은 한국어 본문. '둘 다'면 어두운 색은 `-dark` 이름이고 `-dark` 부품에서 써서 `orphaned-tokens`가 나지 않는다. 테두리·나눔 선은 `backgroundColor`만 있는 1px 부품이다. 발행 시각은 YAML `description`에. `npm run design:lint`가 `docs/examples/*.design.md`(코스 다섯)를 오류·경고 0으로 본다.
- 지키는 것: `tests/engine/look.test.ts`(앱 종류별 기본값 7종, 낱말 셋, 직접 고른 색 6개 × 바탕 4, 80쌍과 테두리, 짧은 판·전체 판 줄 수, '둘 다'일 때만 어두운 미디어 쿼리, DESIGN.md 린트 6가지, 영수증 링크, 추천·영수증 숫자 그대로), `tests/data.test.ts`(대비·테두리·라이선스가 깨지면 검사가 막음).

