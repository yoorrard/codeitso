# 엔진 명세

`src/lib/engine/`의 동작을 글로 적은 것이다. 코드와 이 문서가 다르면 버그다. 동작을 바꾸면 이 문서, `data/golden/`, 필요하면 `/about/scoring` 화면을 함께 고친다.

엔진은 화면·브라우저·Node API를 쓰지 않는 순수 함수다. 같은 자료와 같은 `Session`을 넣으면 늘 같은 결과가 나온다. 정렬은 로캘과 무관한 문자열 비교(`cmp`)를 쓴다.

## 0. 입구

```ts
const cat = makeCatalog(data);                       // 자료 묶음 → id 찾기 표
const r = evaluate(cat, session);                    // 인터뷰부터 계산대까지 한 번에
renderPack(cat, r, { siteUrl, issuedAt });           // 설계 꾸러미 .md
renderReceiptText(receiptModel(cat, r, issuedAt));   // 텍스트 영수증
conversationCards(cat, r);                           // 대화 카드 5장
```

`evaluate`는 먼저 `normalizeSession`으로 입력을 정리한다: 없는 질문·보기의 답, 없는 상품, 문자열이 아닌 값, 겹친 id를 버린다. 그다음 2차로 미룰 수 없는 칸은 `deferred`에서, 지금 생기지 않았거나 그대로 둘 수 없는 충돌은 `kept`에서 뺀다. 정리된 상태는 `r.session`에 있다.

## 1. 인터뷰 (`interview.ts`)

1. `questions.json`의 질문을 적힌 순서대로 훑는다.
2. `showIf`가 있으면 **지금까지 보인 질문의 답과 태그만으로** 판단한다. 맞지 않으면 숨긴다. (`showIf`에는 장바구니·2차 조건을 쓸 수 없다.)
3. 보인 질문에 유효한 답이 있으면 그 보기의 `tags`를 더한다 (같은 태그는 합산).
4. 다음 질문 = 보인 질문 중 답이 없는 첫 질문. 없으면 인터뷰 끝.
5. 앞 답을 바꿔 숨겨진 질문의 답은 지우지 않고 무시한다. 되돌리면 다시 살아난다.

'좁혀지는 중' 미리 보기: `answerChips()`(답한 질문의 짧은 이름 + 고른 보기), `buildSlots()`(지금 생긴 칸), `matchingRecipes()`(지금까지의 답과 어긋나지 않고 같은 답이 하나 이상인 레시피를 같은 답이 많은 순으로 2개, 같으면 `recipes.json` 순서. 첫 답 전에는 비어 있다).

## 2. 칸 만들기 (`shop.ts` buildSlots)

- 종류가 `slot`인 규칙 중 `when`이 맞는 것을 모은다.
- 같은 칸 id는 하나로 합친다. `required`는 하나라도 true면 true. 나머지 속성은 같아야 한다 (자료 검사가 확인).
- 칸 순서: `order` → id.
- 지금 자료의 칸: 화면(10, 비워 둘 수 없음) · 저장(20) · 로그인(30, 미룰 수 있음) · 외부 데이터(40, 분야 맞춤) · 알림(45, 미룰 수 있음) · 배포·공유(50, 나만 쓰면 선택).
- 칸의 `help`는 장보기에서 칸 제목 아래 한 줄 설명이다.

## 3. 후보와 점수 (`shop.ts`)

**후보**: 칸의 기능(`capability`)을 가진 모든 상품. 칸이 `matchDomain`이면 상품의 `domains`가 이용자의 domain 태그와 하나라도 겹쳐야 한다.

**이용자 수준**: `scoring.userLevelByAi`에서 이용자의 ai 태그에 맞는 값 (무료·유료 채팅 1, 코딩 에이전트 2). 없으면 `defaultUserLevel`.

**점수** = 아래 항목의 합. 값은 `data/scoring.json`의 `weights`.

| 항목 키 | 조건 | 가중치 |
|---|---|---|
| domain | 상품 분야가 이용자 분야와 겹침 | domainMatch (+3) |
| topic | 이용자가 주제를 골랐고 상품에 주제가 있을 때: 겹치면 / 안 겹치면 | topicMatch (+3) / topicMissed (−3) |
| aiTool | 상품 `goodFor`에 이용자의 ai 태그가 있음 | aiToolMatch (+2) |
| budget | 무료로 시작할 수 있는 상품 / 유료인데 이용자가 0원만 | freeProduct (+2) / paidWhenBudgetFree (−4) |
| realtime | 이용자가 실시간이 필요하고 데이터 상품일 때: realtime·frequent / daily·static (상품에 갱신 주기가 없으면 이 항목 없음) | realtimeMet (+2) / realtimeMissed (−3) |
| difficulty | 상품 난이도와 이용자 수준의 차이 × | difficultyGap (−1) |
| official | 공식 제공 | providerOfficial (+1) |
| access | 필요한 자격 (없음·가입 0, 키 −1, 승인 −2, 계좌·사업자 −4) | accessPenalty |
| proxy | 상품에 proxy 기능이 있고, 이 칸의 기능이 없는 다른 장바구니 상품 중 키 노출 위험 상품이 있음 | proxyNeeded (+2) |
| shared | 상품이 이미 장바구니에 있고, 이 칸보다 **앞선** 열린 칸의 기능도 가짐 (앞 칸을 채우려고 담은 상품이 이 칸도 맡을 수 있을 때). 담은 그 칸에서는 더하지 않는다 | sharedTool (+2) |
| local | 저장(store) 상품이고 저장 위치가 이용자 기기(local)일 때: 나만 씀 / 그 밖 (쓰는 사람 태그가 아직 없을 때도 여럿이 씀으로 본다) | localForMe (+2) / localForShared (−6) |

- 항목 값이 0이면 기록하지 않는다.
- **추천 이유**: 값이 양수인 항목을 큰 순(같으면 위 표 순서)으로 최대 `reasonsMax`(3)개.
- **아쉬운 점**: 값이 음수인 항목을 많이 깎인 순으로.

**정렬**: 점수 높은 순 → 공식 제공 먼저 → 지금 열린 칸을 더 많이 맡는 상품 먼저(예: 저장 칸에서 같은 점수면 로그인 칸도 맡는 Supabase가 저장만 맡는 상품보다 앞, D55) → 난이도 낮은 순 → id 순. 점수 공식은 바뀌지 않는다.

**추천**: 진열 상품(`layer: shelf`) 중 `recommendable`이고 점수가 `recommendThreshold`(3) 이상인 첫 상품. 색인 상품은 추천하지 않는다. 칸마다 추천은 하나뿐이다.

**2위**: 추천이 있을 때, 추천이 아닌 진열 상품 중 첫 번째.

**2위와 비교**: 항목마다 (추천 값 − 2위 값). 양수인 항목은 "추천이 앞선 점", 음수인 항목은 "2위가 나은 점". 화면 문장은 `templates.reasonLabels`.

**채움**: 칸의 기능을 가진 장바구니 상품은 모두 그 칸을 채운다. 한 상품이 여러 칸을 채울 수 있다 (예: Supabase = 저장 + 로그인).

## 4. 재확인 (`recheck.ts`)

**충돌 순서**: 조건이 맞는 `conflict` 규칙(규칙 순서) → 비어 있는 필수 칸(칸 순서). 빈 칸 충돌 id는 `conflict.empty-slot:칸id`이고, 문장은 칸의 `emptyMessage`/`emptyFix`, 없으면 `templates.emptySlot`.

- 2차로 미룬 칸은 비어 있어도 충돌이 아니다.
- 이용자가 "그대로 두고 조사할 것에 추가"를 고르면 `session.kept`에 충돌 id가 들어간다.
- `mustFill` 칸(화면)이 비면 그 충돌은 `keepable: false`다. 그대로 둘 수 없고, 상품을 담아야 한다.
- **발행 가능** = 인터뷰가 끝났고, 모든 충돌이 kept.

**1차/2차 나누기** (`suggestSplit`):
- 난이도 = 장바구니 상품 난이도의 합 (같은 상품은 한 번).
- 1차 난이도 = 2차로 미룬 칸에만 쓰이는 상품을 뺀 합. 어느 칸에도 안 쓰이는 상품은 1차에 남긴다.
- **제안할지(needed)** = 1차 난이도 > `phaseSplitDifficulty`(6). 미루고 나서 6 이하가 되면 제안이 사라진다.
- **미룰 수 있는 칸(defer)** = 아직 미루지 않은, 미룰 수 있는 칸. 칸을 미뤄도 그 칸의 상품이 다른 칸에도 쓰이면 난이도 숫자는 그대로일 수 있다 (예: Supabase가 저장과 로그인을 함께 맡을 때 로그인을 미룸). 그래도 그 기능을 만드는 일은 2차로 넘어간다.
- **더 쉬운 상품(easier)** = 미루지 않은 칸마다, 그 칸만 맡은 상품 하나가 담겨 있을 때 같은 칸 진열 상품 중 추천 기준을 넘고 난이도가 더 낮은 첫 상품. `{ slotId, from, to }`.
- 화면은 needed일 때 defer와 easier를 보여 주고, 둘 다 비면 "이대로 가도 괜찮아요. 시간이 더 걸릴 뿐이에요"라고 알린다.

**칸 밖 상품**: 열린 칸 어디에도 쓰이지 않는 장바구니 상품 (재확인에서 알려 주고, 꾸러미 7번 표에 '기타'로 적는다).

## 5. 계산대 (`checkout.ts`)

여기서 '1차 상품'은 2차로 미룬 칸에만 쓰이는 상품을 뺀 장바구니다. 재확인 뒤 규칙(`conflict`, `research`, `safety`, `stuck`, `notBuildRules`)의 조건에서는 `{ "deferred": "slot.notify" }`처럼 2차로 미룬 칸을 볼 수 있다.

**조사할 것** (id가 같으면 앞의 것만):
1. 조건이 맞는 `research` 규칙의 카드 (규칙 순서)
2. kept인 규칙 충돌의 `researchCard`
3. kept인 빈 칸 충돌 → `templates.emptySlot.research`로 만든 항목, id `research.empty:칸id`
4. 장바구니의 색인 상품 → `templates.indexResearch`로 만든 항목, id `research.index:상품id`

**안전 지시**: `templates.safetyDefaults` 여섯 줄 + 조건이 맞는 `safety` 규칙 줄 (같은 문장은 한 번).

**예상 막힘**: 장바구니 상품의 `stuck` (담은 순서) + 조건이 맞는 `stuck` 규칙.

**준비물**: 1차 상품의 `prep`. 걸리는 시간이 긴 것(며칠 → 몇 시간 → 바로) 먼저, 같으면 담은 순서. 이름이 같으면 하나만.

**공부할 것**:
1. 1차 상품의 `needsConcepts`를 모으고 선수 개념(`prerequisites`)을 끝까지 더한다.
2. 선수 개념이 먼저 오게 줄 세운다 (위상 정렬). 동시에 배울 수 있으면 `order` → id.
3. 시작 전 필수 = 줄에서 `level: must`인 것 앞에서부터 `studyRequiredMax`(3)개.

**진행 순서 (단계)**:
1. 열린 칸 중 2차로 미루지 않았고, 채웠거나 빈 칸을 kept한 칸만 단계가 된다 (칸 순서).
2. **중간 서버 준비 단계**: 1차 상품에 키 노출 위험 상품과 proxy 기능 상품이 함께 있으면, 키 노출 위험 상품이 처음 나오는 단계 바로 앞에 `step.proxy` 단계를 넣는다 (문장은 `templates.proxyStep`, 쓰는 도구는 proxy 상품). 키를 화면에 넣지 않은 채 데이터를 붙이게 하려는 것이다.
3. 상품의 필요 개념은 그 상품이 처음 나오는 단계에 붙인다. 개념의 `stepHint`가 `proxy`이고 중간 서버 단계가 있으면 그 단계에, 다른 기능이고 상품이 그 기능의 칸도 맡으면 그 칸의 단계에 붙인다 (예: 배포 개념은 배포·공유 단계).
4. 선수 개념은 함께 붙이고, 이미 앞 단계에 붙은 개념은 다시 붙이지 않는다.
5. 단계 제목과 완성 확인 기준은 `templates.slotSteps`.

**예상 시간(분)** = `baseMinutes`(30) + 1차 상품의 `setupMinutes` 합 (없으면 `unknownSetupMinutes` 60).

**만들지 않을 것**: `templates.notBuildRules` 중 조건이 맞는 문장.

## 6. 영수증과 꾸러미

- `receiptModel`: 품목(상품마다 맡은 칸 이름, 2차 여부, 가격 '0원'/'유료'), 합계, 예상 시간, 1차 난이도와 쉬움(3 이하)·보통(6 이하)·어려움, 준비물·공부할 것·조사할 것 개수. 글자는 모두 `templates.receipt`.
- 맡은 칸이 여럿이면 '저장, 배포·공유'처럼 잇고, 영수증 칸 폭(11칸)을 넘으면 '저장 외 1칸'.
- 예상 시간: 55분 미만은 10분 단위('약 40분'), 그 위는 30분 단위('약 1시간', '약 2시간 30분').
- `renderReceiptText`: 고정폭 36칸. 한글은 2칸으로 센다. 긴 이름은 '…'로 자른다.
- `renderPack`: 12개 항목의 마크다운. 모든 문장은 `templates.json`과 상품 카드에서 온다. 형식은 `docs/RECEIPT.md`. 2차로 미룬 칸에만 쓰이는 도구는 7번에 '(2차)'를 붙인다.
- 프로젝트 이름(꾸러미 제목, 영수증 목적지): 자유 입력(30자) → 유형 이름 → '내 앱'.

## 7. 그 밖의 함수 (`extras.ts`)

- `badges(cat, product)`: 무료, 초보 추천(난이도 1), 공식, 실시간, 자주 갱신, 주의(추천 제외).
- `matchErrors(cat, text)`: 에러 안내의 정규식(대소문자 무시) 중 하나라도 맞는 항목, 적힌 순서.
- `toShareState(session)` / `fromShareState(raw)`: 공유 링크용. 자유 입력은 넣지 않는다. 받는 쪽은 모양만 검사하고, id 검사는 `normalizeSession`이 한다.
- `checkQuiz(cat, conceptId, index, choice)`: 확인 문제 채점.

## 8. 바꿀 때 절차

1. 무엇을 왜 바꾸는지 `docs/DECISIONS.md`에 한 줄 적는다.
2. 코드나 `data/scoring.json`을 바꾼다.
3. `npm run explain -- 사례id`로 바뀐 점수를 확인한다.
4. `npm run golden`이 실패하면 차이를 읽고, 의도한 변경인 사례만 기대 결과를 손으로 고친다. 고친 사례와 이유를 커밋 메시지에 적는다.
5. `npm run examples`로 예시를 다시 만들고, `npm run check`가 통과해야 커밋한다.

알려진 빈틈: `conflict.paid-on-free`는 진열대에 유료 상품이 없어 골든 사례가 없다. 유료 상품을 처음 넣을 때 사례를 함께 만든다. 그 전까지는 Vitest 단위 시험(T04)에서 가짜 자료로 확인한다.
