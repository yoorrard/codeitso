# 자료 안내

코드쇼퍼의 판단은 모두 `data/`의 JSON에서 나온다. 화면에 나가는 문장도 대부분 여기 있다. 자료를 고친 뒤에는 반드시 `npm run check`를 돌린다.

이 문서는 파일과 필드의 내부 이름(상품, 장바구니, 칸, 충돌, 레시피, 개념, 조사 카드, 꾸러미)을 쓴다. 화면에서는 각각 도구, 고른 도구, 고를 것, 막힌 곳, 미리 짠 코스, 용어 카드, 알아볼 것, 설계도라고 부른다 (`docs/CONCEPT.md` 3절, 대응표는 `docs/ENGINE.md` 맨 위). 자료의 **문장**에는 화면 이름만 쓴다. 쓰지 않는 말은 `node scripts/guard/check-words.ts`가 막는다.

## 1. 파일 지도

| 파일 | 담는 것 | 스키마 | 지금 개수 |
|---|---|---|---|
| `taxonomy.json` | 태그 분류표 (유형·사용자·AI·필요·분야·주제·예산·민감·기기·느낌) | `taxonomy.schema.json` | 태그 53개, 분야 10개 |
| `questions.json` | 목적지 질문, 보기, 보기별 태그, 노출 조건 | `questions.schema.json` | 17문항 |
| `rules.json` | 칸·충돌(막힌 곳)·알아볼 것·안전·막히기 쉬운 곳 규칙 | `rules.schema.json` | 38개 |
| `scoring.json` | 추천 가중치와 기준값 (사이트에 공개) | `scoring.schema.json` | |
| `products.json` | 상품 카드 = 화면의 도구 (진열·색인) | `products.schema.json` | 49개 (진열 48) |
| `concepts.json` | 개념 카드 = 화면의 용어 카드 (읽어 둘 용어, 사전) | `concepts.schema.json` | 20장 |
| `research-cards.json` | 조사 카드 (알아볼 것) | `research-cards.schema.json` | 13장 |
| `templates.json` | 영수증·설계도·AI에게 할 말 문장 틀 | `templates.schema.json` | |
| `recipes.json` | 레시피 = 화면의 미리 짠 코스 (답 + 고른 도구 완성 세트) | `recipes.schema.json` | 5개 |
| `errors.json` | 사전의 에러 안내 | `errors.schema.json` | 20개 |
| `glossary.json` | 어려운 말 풀이: 용어마다 한 문장 풀이, 다른 이름, 읽는 법, 짧은 예, 묶음(`kind`), 상위 용어, 용어 카드·도구·에러 안내 연결. 화면에서 글을 고르거나 점선 밑줄 말을 누르면 뜬다 (D60, D66). 엔진은 쓰지 않는다. 13절 | `glossary.schema.json` (+ `tests/lib/glossary.test.ts`가 매처로 문장 규칙·이름 겹침·상위 용어를 막는다) | 212개 |
| `sources.json` | 색인 수집 출처 대응표 | `sources.schema.json` | 1곳 |
| `golden/case-*.json` | 추천 회귀 검사 사례 | `golden.schema.json` | 21개 |

공통 정의(id 모양, 조건 문법 등)는 `schemas/defs.schema.json`에 있다.

## 2. id 규칙

- 소문자·숫자·하이픈·점만 쓴다. 예: `neis-meal`, `slot.data`, `domain.education`
- 태그: `종류.이름` (`type.page`, `need.save`). 질문: `q.이름`. 칸: `slot.이름`. 조사 카드: `research.이름`.
- 규칙 id는 종류를 앞에 붙인다: `slot-rule.`, `conflict.`, `research-rule.`, `safety.`, `stuck.`
- 한 번 공개한 id는 바꾸지 않는다. 영수증 링크와 저장된 상태(지난 영수증 포함)가 id를 기억한다. 화면 이름이 바뀌어도 id는 그대로 둔다 (예: 앱 종류 '계산기·도우미'의 보기 id는 `tool`). 꼭 바꿔야 하면 옛 id를 새 id로 옮기는 표를 `src/lib/store.ts`에 둔다.

## 3. 조건 문법

질문의 `showIf`, 규칙의 `when`, `notBuildRules`의 `when`은 아래 모양 중 하나다.

```jsonc
{ "always": true }
{ "answer": "q.type", "is": "form" }              // 그 질문에 그 보기를 골랐다
{ "answer": "q.type", "in": ["form", "record"] }
{ "tag": "need.save", "gte": 1 }                    // 태그 합계가 1 이상
{ "cartHas": "cloudflare-workers" }                 // 장바구니에 그 상품이 있다
{ "cartAny": { "capability": "store", "field": "serverRegion", "in": ["overseas"] } }
                                                    // 조건을 모두 만족하는 상품이 하나라도 있다
{ "all": [ ... ] }  { "any": [ ... ] }  { "not": { ... } }
{ "deferred": "slot.notify" }                       // 그 칸을 나중으로 미뤘다 (맞춰 보기 뒤 규칙에서만)
```

- `cartAny`에서 쓸 수 있는 field: `provider.type`, `access`, `realtime`, `serverRegion`, `layer`, `cost.free`, `keyExposureRisk`, `publicKey`, `recommendable`
- 질문 노출 조건과 칸 규칙에는 장바구니 조건과 `deferred`를 쓸 수 없다 (검사가 막는다).
- 질문 노출 조건은 앞선 질문이 만드는 태그와 답만 볼 수 있다.
- '모르겠어요' 보기(`isUnknown: true`)는 태그를 줄 수도 있다: 앱 종류(→ 안내 페이지), 만드는 AI, 예산, 그리고 날씨·말과 글·금융 갈래(→ 가장 흔한 쪽인 예보·번역·주식 시세)는 기본 태그를 주고, 교육 주제의 '모르겠어요'는 태그를 주지 않는다(교육 상품은 주제가 서로 달라 하나로 보낼 수 없다). 미리 짠 코스 미리 보기('혹시 이걸 만드시나요?')는 '모르겠어요'를 어긋남으로 세지 않는다.
- '아마 그럴 거예요'(`maybe`) 보기는 '네'와 같은 태그를 준다. 화면은 보기 묶음 아래에 이 사실을 한 줄로 밝힌다.

## 4. 상품 카드 (화면: 도구)

| 필드 | 뜻 | 필수 |
|---|---|---|
| `id`, `name`, `summary` | 이름과 한 줄 설명 | 모두 |
| `layer` | `shelf` 진열(쉬운 설명 있음, 추천 대상) / `index` 색인(원문 정보만, 추천 안 함, 화면: 원문만 있는 도구) | 모두 |
| `useWhen` | 이럴 때 써요 | 진열 |
| `capabilities` | 맡을 수 있는 칸의 기능: screen, store, auth, data, host, proxy, notify | 모두 |
| `domains`, `topics` | 분야·주제 태그 | 데이터 상품은 domains 필수 |
| `goodFor` | 이 AI로 만들기 쉬움 (ai 태그) | |
| `provider` | `official` 공식 / `community` 오픈소스·개인 / `unofficial` 비공식 래퍼 / `generic` 특정 회사 아님 | 모두 |
| `access` | 필요한 자격: none, signup, key, approval, account-or-business | 모두 |
| `cost` | `free`(0원으로 시작 가능, 화면 꼬리표 '0원으로 시작') + 쉬운 설명 | 모두 |
| `freeLimit` | 무료 한도 설명 | |
| `realtime` | realtime 실시간 / frequent 하루 여러 번 / daily 하루 단위 / static 거의 안 바뀜 | 데이터 상품 |
| `serverRegion` | 이용자가 입력한 데이터가 저장되는 곳: none, local, kr, overseas, selectable, unknown | 모두 |
| `difficulty` | 1 쉬움 ~ 3 어려움 | 모두 |
| `setupMinutes` | 처음 붙이는 데 걸리는 어림 시간(분) | 진열 |
| `keyExposureRisk` | 키를 화면 코드에 넣으면 안 되고 중간 서버에서만 써야 하는 상품 (혼자 쓸 때의 예외는 `safety.local-key`) | 모두 |
| `publicKey` | 화면 코드에 넣도록 만든 공개 키를 쓰는 상품 (예: 지도 JavaScript 키, 사이트 주소로 사용을 제한). `keyExposureRisk`와 함께 켤 수 없다 | |
| `recommendable` | false면 추천 표시를 붙이지 않는다 (MCP 서버, 비공식 패키지, 색인 상품) | 모두 |
| `license` | 이름 + 쉬운 풀이 + 원문 링크 | 오픈소스면 |
| `prep` | 준비물과 걸리는 시간(instant, hours, days) | 진열 |
| `promptFragment` | 설계도에 들어갈 지시 한두 문장 (이용자 AI에게 하는 말) | 진열 |
| `needsConcepts` | 필요 개념 id (화면: 필요한 용어) | 진열 |
| `stuck` | 막히기 쉬운 곳 문장 | |
| `related` | 관련 상품 id | |
| `links` | 공식 링크. 첫 링크가 설계도 7번 표에 들어간다 | 모두 |
| `checkedAt` | 사람이 원문으로 확인한 달 (YYYY-MM) | 모두 |
| `needsReview` | true면 사람 확인 전. 배포용 검사(`npm run validate:release`)에서 진열 상품은 막힌다 | 모두 |
| `sources` | 사실을 확인한 출처 링크 | |

검사가 확인하는 것: 태그·개념·관련 상품이 실제로 있는지, 키 노출 위험 상품에 `env-var` 개념이 있는지, 공개 키와 키 노출 위험을 함께 켜지 않았는지, 색인 상품이 추천 대상이 아닌지, 확인한 달이 미래가 아닌지.

`promptFragment`에는 키를 어디에 둘지(환경 변수, 중간 서버의 비밀 값, 스크립트 속성) 적지 않는다. 그 말은 상황(중간 서버가 있는지, 혼자 쓰는지)에 따라 안전 규칙과 막히기 쉬운 곳 규칙이 붙인다. 상품 고유의 키 구분(예: Supabase의 공개용 키와 비밀 키)은 적어도 된다. 저장처럼 상황에 따라 필요 없는 기능은 "저장할 데이터가 있으면"처럼 조건을 붙여 쓴다 (D34).

### 상품을 추가하는 법

1. 공식 문서를 연다. 블로그나 요약 글로 사실을 정하지 않는다.
2. `/add-product` 스킬을 쓰거나 위 표를 보고 카드를 쓴다. 모르는 값은 지어내지 말고 비워 두거나 보수적으로 적은 뒤 `needsReview: true`로 둔다.
3. 무료 한도·자격 같은 숫자는 원문을 확인한 경우에만 적고, `sources`에 링크를 남긴다.
4. `npm run check`. 골든 사례가 바뀌면 왜 바뀌었는지 읽고 판단한다 (`docs/ENGINE.md` 8절).
5. 사람이 원문과 대조한 뒤 `needsReview: false`, `checkedAt`을 그달로 바꾼다.

## 5. 규칙

- `slot`: 칸을 연다. 같은 칸을 여러 규칙이 열 수 있고(예: 배포·공유는 '여럿이 씀'이면 필수, '나만 씀'이면 선택), `required` 말고는 같아야 한다. `mustFill`(비워 둔 채 출발 불가 = 화면의 통행 불가, 필수 칸에만), `help`(칸 설명 한 줄), `deferrable`(나중으로 미룰 수 있음), `emptyMessage`·`emptyFix`(비었을 때 점검 문장).
- `conflict`: 도구끼리 맞춰 보기에서 '막힌 곳'으로 보일 충돌. `message`(무엇이 문제인지), `fixHint`(고치는 법), `researchCard`('그대로 가기'를 고르면 '알아볼 것'에 붙는 조사 카드)가 모두 있어야 한다. `anchorSlot`(선택)은 지도에서 막힌 곳을 붙일 칸 id다. 없으면 길 전체에 붙는다 (예: 유료 도구). 있으면 어떤 칸 규칙이 만드는 칸이어야 한다 (검사가 확인).
- `research`: 조건이 맞으면 조사 카드(알아볼 것)를 붙인다.
- `safety`: 조건이 맞으면 설계도 11번에 안전 지시를 더한다. "-ㄴ다"체로 쓴다.
- `stuck`: 조건이 맞으면 막히기 쉬운 곳을 더한다. "-요"체로 쓴다. `concepts`는 사전 링크용.

### 문장 체 (자리마다)

- 화면에 나오는 안내: 해요체 "-요". 규칙의 `message`·`fixHint`·`emptyMessage`·`emptyFix`, 질문 `help`, 상품 `stuck`, `stuck` 규칙, `templates.emptySlot.message`·`fixHint`. 칸 `help`와 상품 `useWhen`은 짧은 명사구("~하는 곳", "~할 때")로 써도 된다. 버튼 이름을 가리킬 때는 화면 이름 그대로 따옴표로 쓴다 (예: '그대로 가기'를 누르세요).
- 설계도 머리말과 면책: "-습니다"체 (`pack.intro`, `disclaimer`).
- 설계도 목록: "-ㄴ다"체. 안전 지시(`safety.line`, `safetyDefaults`, 11번), 작업 방식(`workStyle`, 12번), `indexMemo`, 조사 카드의 `why`·`doneWhen`. 만들지 않을 것(`notBuildRules`)과 화면·기능 이름은 명사로 끝낸다.
- 설계도 지시문과 AI에게 하는 말: 반말 "~해 줘"체. 9·10번 머리(`researchIntro`, `noResearch`, `stepRule`), `promptFragment`, 대화 카드(AI에게 할 말), 개념·에러의 `askAI`.
- 도구에 드는 돈은 '비용'으로 쓰고 '요금'은 코드쇼퍼 이용료(늘 0원)에만 쓴다. 다만 도구 회사가 쓰는 요금제 이름이나 요금 안내 페이지처럼 원문의 사실을 옮길 때는 그대로 둔다.

## 6. 개념 카드 (화면: 용어 카드)

- 화면 주소는 `/terms/아이디`이고, 설계도 10번의 '먼저 볼 용어' 링크도 이 주소다.
- `level`: `must`면 '먼저 읽어 둘 용어' 후보, `good`이면 알아 두면 좋은 것.
- `order`: 선후 관계가 없을 때 먼저 배울 순서 (작을수록 먼저).
- `prerequisites`: 선수 개념. 순환하면 검사가 막는다.
- `stepHint`: 진행 순서에서 붙일 칸의 기능 (예: 배포 개념은 host). `proxy`면 중간 서버 준비 단계에 붙는다 (환경 변수).
- `summary`는 3분 안에 읽을 분량. 그림 설명(`figure`)은 그림을 만들 때 대체 텍스트로도 쓴다.
- `quiz`는 2~3문제, 보기 2~4개, `answer`는 0부터 센 번호. 정답 위치를 섞는다 (한 자리에 60% 넘게 몰리면 검사가 경고). 오답도 그럴듯하게 쓴다.
- `askAI`에는 `{{project}}` 자리를 둔다. 이용자가 만들 것이 들어간다. 자리 바로 뒤에 조사를 붙이지 않는다 ('기록장를'처럼 틀린다). `내가 만들려는 것: {{project}}.`로 시작한다.
- `tryIt.kind`는 해 보기 모형 다섯 가지 중 하나: env-var-form, api-key-form, json-reader, terminal-sim, deploy-sim.

## 7. 문장 틀 (`templates.json`)

- 유형별 화면·기능·데이터 구조, 칸별 단계 문장(칸이 더하는 화면 포함), 중간 서버 준비 단계, 느낌별 색·글꼴, 기기·사용자·AI별 문장, 추천 이유 말, 배지, 만들지 않을 것, 영수증 글자(도구 비용 합계 포함), 설계도 머리말·제목·안내, 안전 기본 지시, 대화 카드(AI에게 할 말), 빈 칸·색인 상품용 알아볼 것 항목.
- 유형 이름(`types.*.label`)은 질문 `q.type`의 보기 이름과 같게 둔다 (예: `type.tool` = '계산기·도우미'). 설계도 1번 '종류'와 영수증 목적지에 나온다.
- 자리 표시는 정해진 것만 쓴다: 설계도 제목 `{{project}}`, 머리말 `{{saveAs}}`, 용어 카드 링크 `{{site}}`·`{{id}}` (`{{site}}/terms/{{id}}`), 외부 데이터 줄 `{{names}}`, 빈 칸 `{{label}}`, 색인 상품 `{{name}}`·`{{link}}`, 대화 카드 `{{packRef}}`, 영수증 `{{n}}`. 검사가 확인한다.
- 느낌별 색은 글자/배경, 글자/면, 강조 글자/강조 대비가 4.5:1 이상이어야 한다. 검사가 확인한다.

## 8. 레시피 (화면: 미리 짠 코스)

- `answers`는 보이는 질문에 모두 답해야 하고, `cart`의 충돌은 모두 해결되었거나 `kept`에 있어야 한다. 검사가 엔진으로 끝까지 돌려 확인한다.
- `freeText`는 레시피의 '만들고 싶은 것 한 줄'이다. 설계도 제목과 영수증 목적지가 된다.
- 미리 짠 코스는 홈(앞의 3개)과 `/courses`에 나오고, '이 코스로 출발'을 누르면 답·고른 도구·그대로 둔 충돌·한 줄 입력을 채운 채 도구끼리 맞춰 보기(`/check`)로 간다. 레시피 `title`·`summary`·`forWho`는 화면 문장이라 화면 이름만 쓴다.

## 9. 에러 안내

- `patterns`: 대소문자 무시 정규식. `examples`: 실제 에러 문장. 예시가 자기 패턴에 맞는지, 다른 항목에도 걸리는지 검사가 확인한다.
- 키가 찍힐 수 있는 에러(401, 403, 404, 429, 500, CORS, 키 만료, 공공데이터포털 오류 코드, JSON이 아님, 네트워크 실패)의 `askAI`에는 키를 지우고 붙여 넣는다는 말을 둔다.
- 좁은 항목을 앞에 둔다: `matchErrors`는 파일 순서대로 맞는 것을 모두 돌려준다 (예: SSH 키 거절은 `git-auth-failed`, 파일 권한은 `permission-denied`). 모든 예시가 자기 항목에만 걸리는지 `tests/engine/errors-data.test.ts`가 본다.
- 위험한 해결(sudo, `chmod 777`, `--force`, `--legacy-peer-deps`)을 권하지 않는다. 필요하면 'AI에게 이유를 먼저 묻기'로 쓴다.

## 10. 골든 사례

- 대표 목적지 답 + 최종 장바구니(+ 그대로 둔 충돌, 나중으로 미룬 칸)를 넣으면 엔진이 내야 하는 결과: 물어본 질문, 칸별 추천·점수·다른 후보(`runnerUp`)·이유·채운 상품, 충돌, 출발 가능 여부(`canIssue`), 알아볼 것, 안전 규칙, 읽어 둘 용어, 진행 순서, 준비물, 켜진 막히기 쉬운 곳 규칙(`stuckRules`, 적은 사례만), 난이도, 먼저 만들 것의 난이도(`difficultyFirst`), 예상 시간, 나누기(미룰 칸, 더 쉬운 길).
- 기대값은 id와 숫자만 비교한다. 문장을 바꿔도 골든 사례는 그대로다. 사례의 `title`·`note`는 사람용 설명이다.
- 비교 코드는 `scripts/lib/golden.ts`에 있어서 Vitest에서도 그대로 쓴다.
- 새 사례는 `npm run golden:print`로 엔진 결과를 뽑은 뒤, **손으로 맞는지 따져 보고** 파일로 만든다. 엔진 결과를 그대로 복사해 넣기만 하면 회귀 검사가 아니다.
- 1단계 목표 20개. 새 규칙을 넣으면 그 규칙이 켜지는 사례를 하나 이상 만든다 (`npm run golden` 끝에 한 번도 안 켜진 규칙이 나온다).

## 11. 출처 대응표와 색인 (T19)

- 출처마다 약관 주소와 재배포 조건(`redistribution`)을 적는다. `unknown`이나 `link-only`면 이름과 링크만 싣는다.
- 출처의 원래 분류를 우리 분야 태그로 옮기는 표(`categoryMap`)와, 맞는 분류가 없을 때 쓸 `fallbackDomain`을 둔다.
- 수집은 공식 목록 API·RSS만 쓴다. robots.txt와 약관을 먼저 확인한다.
- 수집 결과는 `data/index/`에 만들고 저장소 기록에는 올리지 않는다 (`.gitignore`). 마지막 정상 색인은 GitHub Release의 첨부 파일(`index-latest.tar.gz`)로 덮어써 두고, 수집이 실패하면 빌드가 그것을 내려받아 쓴다 (T19).
- 색인 상품은 수집기가 정해진 값으로 채운다: `layer: index`, `recommendable: false`, `needsReview: true`, `provider.name`은 제공 기관 이름, `cost.note`는 "원문 확인", `links`는 원문 주소 하나. 외부 설명문은 `summary` 한 줄에만 두고 설계도에는 넣지 않는다. 화면에서는 '원문만 있는 도구'로 보인다.

## 12. 라이선스

`data/`의 자료는 CC BY 4.0으로 공개한다. 상품 카드가 가리키는 외부 자료의 조건은 각 출처를 따른다. 공공데이터는 이용허락범위를 함께 적는다.

## 13. 어려운 말 풀이 (`glossary.json`)

손으로 쓴 용어만 둔다. 도구 이름(`products.json`의 `name`)은 빌드 때 `kind: 'tool'` 항목으로 더하고, 열쇠가 겹치면 손으로 쓴 쪽이 이긴다. 찾는 법(매처)은 `src/lib/glossary.ts`, 설계는 `docs/review/v2/glossary.md` 5절.

| 필드 | 뜻 | 규칙 |
|---|---|---|
| `id` | 용어 id | 한 번 공개하면 바꾸지 않는다 (밑줄을 거두는 `termsSeen`이 기억한다) |
| `term` | 보이는 이름 | 한 글자도 된다('봇'). 한 글자 이름은 고른 글 전체가 그 말일 때만 맞는다 |
| `aliases` | 다른 이름 (영어 이름, 줄임말, 자료에 쓰인 표기) | 정규화(NFKC·소문자·공백과 문장 부호 빼기) 뒤 2자 이상. 다른 용어의 이름·다른 이름과 겹치지 않는다. 띄어쓰기만 다른 이름은 넣지 않는다 (매처가 같은 열쇠로 본다). 엉뚱하게 풀리는 이름은 빼고 새 항목으로 옮긴다 (예: '시크릿'은 '시크릿 창' 때문에 어디에도 두지 않는다) |
| `say` | 읽는 법 (영문 용어) | 한글만. 열쇠로 쓰지 않는다 ('코스'는 CORS로 풀리지 않는다) |
| `plain` | 쉬운 풀이 | 한 문장, 해요체, '요.'로 끝, 70자 이하(목표 45자, 지금 평균 33자). 기본 낱말(앱·화면·코드·파일·주소·브라우저·키·API·서버·데이터·요청·명령·저장소 따위)과 서비스 이름 밖의 용어는 하나까지만 쓰고 `see`로 잇는다 |
| `example` | 짧은 예 | 한 문장, 60자 이하. 풀이를 두 문장으로 쓰고 싶으면 둘째 문장을 여기로 옮긴다 |
| `kind` | 묶음 | `key` 키·로그인·안전, `money` 돈·요금제·한도, `data` 공공 API·자료·지도, `code` 도구·코드·Git·브라우저, `ai` AI, `law` 권리·약관, `site` 코드쇼퍼 말 |
| `see` | 풀이 속 상위 용어 id | 풀이 문장에서 매처로 실제로 찾혀야 한다. 풀이 창이 그 말에 밑줄을 긋고 같은 상자에서 2겹까지 연다 |
| `concept` · `tool` · `error` | 용어 카드 · 도구 카드 · 에러 안내 id | 있는 id만 (`npm run validate`). 풀이 창의 첫 이어 가기 버튼은 이 순서로 하나 |
| `noMark` | 점선 밑줄을 긋지 않음 | 흔한 말(요청·응답·명령어·변수)과 코드쇼퍼 말(`site`). 고르기로는 풀린다 |
| `risk` | 위험을 품은 용어 | 풀이 안에 위험을 숨기지 않는 말을 둔다: '넣으면 안 돼요', '올리면 안 돼요', '지워질 수 있어요', '꺼야 해요', '숨겨야 해요', '돈이 나가요' 따위 |

- 상품의 사실(무료 한도·요금·자격)을 풀이에 넣지 않는다. 요금제 이름(Hobby·Spark·Blaze·Eco)과 일반 사실(부가세 10%, UTC+9, 종목 코드 6자리)만 쓰고, `products.json`이 바뀌면 같이 본다. 금액은 도구 카드로 잇는다.
- 코드쇼퍼 말(`site`)은 단계 이름에 맞춰 쓴다. 단계 이름 자체(내 AI 써 보기, 만들 앱 정하기, 도구 고르기, 도구끼리 맞춰 보기, 설계도 받기)는 할 일을 말하므로 용어로 넣지 않는다.
- 크기: 212개가 gzip 약 14.6KB(줄인 JSON). 250개를 넘어 20KB에 닿으면 `kind`별로 나눠 불러오는 것을 다시 본다.
