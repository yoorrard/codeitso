# 엔진 명세

`src/lib/engine/`의 동작을 글로 적은 것이다. 코드와 이 문서가 다르면 버그다. 동작을 바꾸면 이 문서, `data/golden/`, 필요하면 `/about/criteria`(추천 기준) 화면을 함께 고친다.

엔진은 화면·브라우저·Node API를 쓰지 않는 순수 함수다. 같은 자료와 같은 `Session`을 넣으면 늘 같은 결과가 나온다. 정렬은 로캘과 무관한 문자열 비교(`cmp`)를 쓴다.

**이름 대응.** 이 문서는 코드와 자료의 내부 이름을 쓰고, 화면 이름은 `docs/CONCEPT.md` 3절을 따른다. id와 함수 이름은 바꾸지 않았다.

| 내부 이름 (코드·자료) | 화면에서 부르는 이름 |
|---|---|
| 인터뷰 (`interview`, `questions.json`) | 목적지 (단계), 목적지 질문 |
| 장보기 (`shop`, 칸마다 순위) | 경유지 |
| 재확인 (`recheck`) | 점검 (제목: 출발 전 점검) |
| 계산대 (`checkout`, 발행) | 도착 |
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

`evaluate`는 먼저 `normalizeSession`으로 입력을 정리한다: 없는 질문·보기의 답, 없는 상품, 문자열이 아닌 값, 겹친 id를 버린다. 그다음 나중으로 미룰 수 없는 칸은 `deferred`에서, 지금 생기지 않았거나 그대로 둘 수 없는 충돌은 `kept`에서 뺀다. 정리된 상태는 `r.session`에 있다.

## 1. 목적지 질문 (`interview.ts`)

1. `questions.json`의 질문을 적힌 순서대로 훑는다.
2. `showIf`가 있으면 **지금까지 보인 질문의 답과 태그만으로** 판단한다. 맞지 않으면 숨긴다. (`showIf`에는 장바구니·미룬 칸 조건을 쓸 수 없다.)
3. 보인 질문에 유효한 답이 있으면 그 보기의 `tags`를 더한다 (같은 태그는 합산).
4. 다음 질문 = 보인 질문 중 답이 없는 첫 질문. 없으면 목적지 질문 끝 (`done`). 경유지와 점검은 이때 열린다.
5. 앞 답을 바꿔 숨겨진 질문의 답은 지우지 않고 무시한다. 되돌리면 다시 살아난다.

'길 찾는 중' 미리 보기 (목적지 화면의 지도): `answerChips()`(답한 질문의 짧은 이름 + 고른 보기. 설계도 1번 '고른 답'에도 쓴다), `buildSlots()`(지금 생긴 칸 = 고를 것), `matchingRecipes()`(지금까지의 답과 어긋나지 않고 같은 답이 하나 이상인 레시피(미리 짠 코스)를 같은 답이 많은 순으로 2개, 같으면 `recipes.json` 순서. '모르겠어요'(isUnknown) 답은 어긋남으로도 같은 답으로도 세지 않는다. 첫 답 전에는 비어 있다).

## 2. 칸 만들기 (`shop.ts` buildSlots)

- 종류가 `slot`인 규칙 중 `when`이 맞는 것을 모은다.
- 같은 칸 id는 하나로 합친다. `required`는 하나라도 true면 true. 나머지 속성은 같아야 한다 (자료 검사가 확인).
- 칸 순서: `order` → id.
- 지금 자료의 칸: 화면(10, 비워 둘 수 없음) · 저장(20) · 로그인(30, 미룰 수 있음) · 외부 데이터(40, 분야 맞춤) · 알림(45, 미룰 수 있음) · 배포·공유(50, 나만 쓰면 선택).
- 칸의 `help`는 경유지에서 칸 제목 아래 한 줄 설명이다. 필수 칸은 화면에서 '꼭 고를 것', 선택 칸은 '있으면 좋은 것'이다.

## 3. 후보와 점수 (`shop.ts`)

**후보**: 칸의 기능(`capability`)을 가진 모든 상품. 칸이 `matchDomain`이면 상품의 `domains`가 이용자의 domain 태그와 하나라도 겹쳐야 한다.

**이용자 수준**: `scoring.userLevelByAi`에서 이용자의 ai 태그에 맞는 값 (무료·유료 채팅 1, 코딩 에이전트 2). 없으면 `defaultUserLevel`.

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

**추천**: 진열 상품(`layer: shelf`) 중 `recommendable`이고 점수가 `recommendThreshold`(3) 이상인 첫 상품. 색인 상품(원문만 있는 도구)은 추천하지 않는다. 칸마다 추천은 하나뿐이다.

**다른 후보** (`runnerUp`, 예전 이름 '2위'): 추천이 있을 때, 추천이 아닌 진열 상품 중 첫 번째.

**다른 후보와 비교**: 항목마다 (추천 값 − 다른 후보 값). 양수인 항목은 "추천이 나은 점", 음수인 항목은 "다른 후보가 나은 점". 화면 문장은 `templates.reasonLabels`.

**채움**: 칸의 기능을 가진 장바구니 상품은 모두 그 칸을 채운다. 한 상품이 여러 칸을 채울 수 있다 (예: Supabase = 저장 + 로그인).

## 4. 출발 전 점검 (`recheck.ts`)

**충돌 순서**: 조건이 맞는 `conflict` 규칙(규칙 순서) → 비어 있는 필수 칸(칸 순서). 빈 칸 충돌 id는 `conflict.empty-slot:칸id`이고, 문장은 칸의 `emptyMessage`/`emptyFix`, 없으면 `templates.emptySlot`. 화면은 충돌을 '막힌 곳'으로 보이고, 상태를 막힘(빨강) · 서행(노랑, kept) · 원활(초록)로 그린다.

- 나중으로 미룬 칸은 비어 있어도 충돌이 아니다.
- 이용자가 '그대로 가기'(아래 한 줄: "'알아볼 것'에 적어 둘게요.")를 고르면 `session.kept`에 충돌 id가 들어간다. 화면 상태는 서행이다.
- `mustFill` 칸(화면)이 비면 그 충돌은 `keepable: false`다. 그대로 갈 수 없고, 상품을 골라야 한다 (화면: 통행 불가).
- **`anchorSlot`**: 지도에서 막힌 곳을 붙일 칸. 규칙 충돌은 규칙의 `anchorSlot`이 **지금 열린 칸일 때만** 넘긴다. 없거나 열리지 않은 칸이면 키도 없다 = 길 전체 (예: 유료 도구). 빈 칸 충돌은 그 칸 id다. 지금 자료: realtime-mismatch → `slot.data`, personal-server → `slot.store`, key-in-static-page·key-on-public-host → `slot.host`(고치는 곳이 배포·공유), shared-without-login·paid-on-free → 없음 (고치는 곳이 목적지 답이나 길 전체).
- **`deferrable`**: 빈 칸 충돌에서 그 칸이 나중으로 미룰 수 있는 칸(`deferrable`)이면 `true`. 화면은 이 막힌 곳에 '나중으로 미루기'를 함께 보인다. 미루면 그 칸은 충돌이 아니므로 막힌 곳이 사라진다.
- **출발 가능** (`canIssue`) = 목적지 질문이 끝났고, 모든 충돌이 kept. 화면의 '출발하기' 버튼이 이 값으로 켜진다.

**먼저 만들 것 / 나중에 붙일 것 나누기** (`suggestSplit`):
- 난이도 = 장바구니 상품 난이도의 합 (같은 상품은 한 번).
- 먼저 만들 것의 난이도(`difficultyFirst`) = 나중으로 미룬 칸에만 쓰이는 상품을 뺀 합. 어느 칸에도 안 쓰이는 상품은 먼저 만들 것에 남긴다.
- **제안할지(needed)** = 먼저 만들 것의 난이도 > `phaseSplitDifficulty`(6). 미루고 나서 6 이하가 되면 제안이 사라진다.
- **미룰 수 있는 칸(defer)** = 아직 미루지 않은, 미룰 수 있는 칸. 칸을 미뤄도 그 칸의 상품이 다른 칸에도 쓰이면 난이도 숫자는 그대로일 수 있다 (예: Supabase가 저장과 로그인을 함께 맡을 때 로그인을 미룸). 그래도 그 기능을 만드는 일은 나중으로 넘어간다.
- **더 쉬운 길(easier)** = 미루지 않은 칸마다, 그 칸만 맡은 상품 하나가 골라져 있을 때 같은 칸 진열 상품 중 추천 기준을 넘고 난이도가 더 낮은 첫 상품. `{ slotId, from, to }`.
- 화면은 needed일 때 defer('나중으로 미루기')와 easier('더 쉬운 길')를 보여 주고, 둘 다 비면 이대로 가도 된다고 알린다 (문구는 `src/copy/ko.ts`).

**칸 밖 상품**: 열린 칸 어디에도 쓰이지 않는 장바구니 상품 (점검에서 '어디에도 쓰이지 않는 도구'로 알려 주고, 설계도 7번 표에 '기타'로 적는다).

## 5. 도착에서 받는 것 (`checkout.ts`)

여기서 '먼저 만들 상품'은 나중으로 미룬 칸에만 쓰이는 상품을 뺀 장바구니다. 점검 뒤 규칙(`conflict`, `research`, `safety`, `stuck`, `notBuildRules`)의 조건에서는 `{ "deferred": "slot.notify" }`처럼 나중으로 미룬 칸을 볼 수 있다.

**알아볼 것** (`research`, 설계도 9번 '만들기 전에 알아볼 것'. id가 같으면 앞의 것만):
1. 조건이 맞는 `research` 규칙의 카드 (규칙 순서)
2. kept인 규칙 충돌의 `researchCard`
3. kept인 빈 칸 충돌 → `templates.emptySlot.research`로 만든 항목, id `research.empty:칸id`
4. 장바구니의 색인 상품(원문만 있는 도구) → `templates.indexResearch`로 만든 항목, id `research.index:상품id`

**안전 지시**: `templates.safetyDefaults` 여섯 줄 + 조건이 맞는 `safety` 규칙 줄 (같은 문장은 한 번).

**막히기 쉬운 곳** (`stuck`): 장바구니 상품의 `stuck` (고른 순서) + 조건이 맞는 `stuck` 규칙.

**준비물**: 먼저 만들 상품의 `prep`. 걸리는 시간이 긴 것(며칠 → 몇 시간 → 바로) 먼저, 같으면 고른 순서. 이름이 같으면 하나만.

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

**예상 시간(분)** = `baseMinutes`(30) + 먼저 만들 상품의 `setupMinutes` 합 (없으면 `unknownSetupMinutes` 60).

**만들지 않을 것**: `templates.notBuildRules` 중 조건이 맞는 문장.

## 6. 영수증과 설계도

- `receiptModel`: 품목(상품마다 맡은 칸 이름, 나중 여부, 가격 '0원'/'유료'), 도구 비용 합계(모두 0원으로 시작할 수 있으면 `receipt.totalFree` '0원으로 시작', 아니면 '유료 포함'), 예상 시간, 먼저 만들 것의 난이도(`difficulty` 숫자는 모형에만 두고, 글은 쉬움(3 이하)·보통(6 이하)·어려움 말만), 준비물·읽어 둘 용어·알아볼 것 개수(글은 `receipt.count` '{{n}}개'). 글자는 모두 `templates.receipt`. '요금'은 코드쇼퍼 이용료(늘 0원, 도장과 맺음말)에만 쓰고 도구 비용에는 쓰지 않는다.
- 맡은 칸이 여럿이면 '화면, 저장'처럼 잇고, 11칸을 넘으면 '저장 외 1개' (예: '저장, 배포·공유'는 15칸이라 '저장 외 1개').
- `difficultyWord(cat, n)`: 난이도 합을 말로. `toolDifficultyWord(cat, d)`: 도구 하나의 난이도(1~3)를 쉬움·보통·어려움으로 (화면의 '난이도 보통').
- 예상 시간: 55분 미만은 10분 단위('약 40분'), 그 위는 30분 단위('약 1시간', '약 2시간 30분').
- `renderReceiptText`: 고정폭 36칸. 한글은 2칸으로 센다. 긴 이름은 '…'로 자른다. 품목 줄은 칸 이름 자리 + 도구 이름 자리 + 띄움 + 가격 4칸이다. 칸 이름 자리는 기본 12칸(이름 11칸)이고, 11칸을 넘는 이름(예: '로그인(나중)' 12칸)이 있으면 그 영수증만 13칸으로 넓히고 도구 이름 자리를 19칸에서 18칸으로 줄인다. '(나중)' 표시는 늘 보이게 칸 이름 쪽을 먼저 자르고 붙인다 (예: '로그…(나중)'). 그림 문자(이모지)는 2칸으로 센다. 합계·시간·난이도·개수는 한 줄에 하나씩, 값을 오른쪽 끝에 붙인다.
- `renderPack`: 12개 항목의 마크다운. 모든 문장은 `templates.json`과 상품 카드에서 온다. 형식은 `docs/RECEIPT.md`. 나중으로 미룬 칸에만 쓰이는 도구는 7번에 '(나중)'을 붙인다. 용어 링크는 `{{site}}/terms/{{id}}`.
- `packFileName(date)`: `codechauffeur-plan-YYYYMMDD-HHmm.md` (이용자 기기 시간).
- 프로젝트 이름(설계도 제목, 영수증 목적지): 자유 입력(30자) → 유형 이름 → '내 앱'.

## 7. 그 밖의 함수 (`extras.ts`)

- `badges(cat, product)`: 0원으로 시작, 처음 쓰기 쉬움(난이도 1), 공식, 실시간, 자주 갱신, 주의(추천 제외). 글자는 `templates.badges`.
- `matchErrors(cat, text)`: 에러 안내의 정규식(대소문자 무시) 중 하나라도 맞는 항목, 적힌 순서.
- `toShareState(session)` / `fromShareState(raw)`: 영수증 링크(`/arrival#r=…`)용. 자유 입력은 넣지 않는다. 받는 쪽은 모양만 검사하고, id 검사는 `normalizeSession`이 한다.
- `checkQuiz(cat, conceptId, index, choice)`: 용어 카드의 확인 문제 채점.

## 8. 바꿀 때 절차

1. 무엇을 왜 바꾸는지 `docs/DECISIONS.md`에 한 줄 적는다.
2. 코드나 `data/scoring.json`을 바꾼다.
3. `npm run explain -- 사례id`로 바뀐 점수를 확인한다.
4. `npm run golden`이 실패하면 차이를 읽고, 의도한 변경인 사례만 기대 결과를 손으로 고친다. 고친 사례와 이유를 커밋 메시지에 적는다.
5. `npm run examples`로 예시를 다시 만들고, `npm run check`가 통과해야 커밋한다.

알려진 빈틈: 분야 안에서 점수·공식·맡는 칸 수·난이도가 모두 같아 **영문 id 순서로** 추천이 갈리는 곳이 남아 있다 (예: 사전 API 셋, 하루 단위 교통·공공·문화). 주제를 더 나눌지 `docs/BACKLOG.md`에서 정한다. `npm run explain`이 동점을 가른 값(공식·맡는 칸 수·난이도)을 함께 찍는다.
