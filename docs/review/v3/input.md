# v3 조사·설계: 고르는 곳마다 직접 쓰기 (docs/review/v3/input.md)

> 쓴 날 2026-10-14 · 역할: 조사와 설계. 소유자 요청 (5) "사용자가 선택해야 하는 곳에서 주어진 선택지 외에도 직접 입력할 수 있는 항목이 반드시 있어야 하고, 직접 입력해서 반영시킬 수도 있어야 한다"에 답한다.
> 먼저 읽은 것: `data/questions.json`(질문 17개), `data/rules.json`, `data/templates.json`, `data/taxonomy.json`, `src/lib/engine/`(types·interview·evaluate·shop·recheck·checkout·pack·receipt·extras·conditions·text), `src/components/Interview.tsx`·`Shop.tsx`·`Check.tsx`, `src/lib/saved.ts`·`share.ts`·`josa.ts`·`glossary.ts`·`map/model.ts`, `docs/ENGINE.md`, `docs/review/v2/brief.md`, `docs/CONCEPT.md`, 같은 묶음의 `design.md`·`aitools.md`·`services.md`·`launch.md`.
> 이 문서는 조사와 제안이다. 코드·자료는 바꾸지 않았다. 문서 순위(PRD > CONCEPT > …)는 그대로이고, 채택하는 결정은 작업을 시작할 때 `docs/DECISIONS.md`(D73 다음 빈 번호부터)로 옮긴다.
> 표시: **[확인]** 원본(저장소 파일·패키지)을 직접 읽음 · **[잼]** 이 저장소의 엔진이나 원형 코드를 직접 돌려 잼 · **[검색 요약]** 검색 결과 요약으로만 봄(원문을 열지 못함) · **[못 봄]** 열지 못함.

---

## 0. 한눈에: 결정 열여섯 줄

1. **고르는 곳마다 '직접 쓰기'가 있다.** 만들 앱 정하기 질문 17개 전부, 도구 고르기의 기능마다, 그리고 `design.md`·`aitools.md`·`services.md`가 새로 만드는 고르는 곳. 빼는 곳은 넷뿐이고 이유를 적는다(3절): 설정 켜고 끄기, 확인 문제, 단계·칸 이동, 막힌 곳의 행동 버튼.
2. **모양은 GOV.UK의 '그 밖의 … + 펼친 칸 + 또는 + 답하지 않음'을 따른다**: 보기 → [직접 쓰기] 줄 → '또는' → [모르겠어요]. 누르면 그 자리에 한 줄 칸이 펼쳐진다. 자동 완성 팝업(콤보박스)과 `<datalist>`는 쓰지 않는다(2.3절).
3. **쓰고 [확인]을 누르면 가장 가까운 보기를 1~3개 보인다.** 이용자가 하나를 고르거나 [내 말 그대로 두기]를 누른다. 저절로 고르지 않는다(APG '수동 선택', React Aria `allowsCustomValue`와 같은 뜻).
4. **직접 쓴 말은 버리지 않는다.** 보기를 골라도 '내 말'로 남아 설계도 1번에 "내 말 그대로"로 들어간다. 내 AI가 해석한다(PRD R-01).
5. **그대로 둔 답은 미리 정한 보기 하나와 같게 계산하고, 화면이 그 사실을 말한다.** 예·아니요 질문을 포함해 거의 모두 '모르겠어요'와 같게(R-15의 무난한 기본값). 예외 셋: 앱 종류는 새 종류 `type.custom`, 가져올 정보는 `need.data`만, 쓰는 사람은 '몇 명이 같이'와 같게.
6. **낱말 찾기는 AI가 아니다.** 정규화 → 긴 말 먼저 → 부정어 → 예·아니요 말 → 돈·주기 숫자 읽기 → 영문 자판으로 친 한글 되돌리기. 순수 함수 `src/lib/engine/match.ts`, 낱말표 `data/aliases.json`.
7. **낱말 찾기 결과는 `evaluate()`에 들어가지 않는다.** 엔진은 이용자가 확정한 것(`answers`·`notes`·`customTools`·`gaps`)만 본다. 그래서 골든이 낱말표에 흔들리지 않는다.
8. **낱말표와 찾기 코드는 처음 '직접 쓰기'를 열 때 받는다.** 원형 묶음 6.2KB(gzip) [잼]. 단계 화면 첫 JS(129.5~135.6KB / 140KB, `launch.md` L-08)를 늘리지 않는다.
9. **목록에 없는 도구도 쓸 수 있다.** 맡을 기능은 쓴 칸이 정한다. 엔진은 '모름' 도구(`custom: true`)로 다룬다: 추천·점수 없음, 칸은 채움, 지도와 도구끼리 맞춰 보기에서는 서행("직접 쓴 도구라 확인하지 못했어요"), 알아볼 것 1개, 안전 지시 1줄, 영수증 비용 '모름'.
10. **모르는 사실은 규칙 조건에서 '맞지 않음'이다**(값이 없으면 조건이 거짓). 단 서버 위치는 자료에 원래 '모름'(`unknown`) 값이 있어서 개인정보 막힌 곳이 그대로 켜진다. 조심할 것은 '있다'로 본다(R-15).
11. **영수증 링크에는 직접 쓴 글을 하나도 넣지 않는다. 도구 이름도.** 우리 주소에서 남이 지은 글이 보이는 일(내용 꾸미기)을 막고 R-18과 같은 원칙을 지킨다. 링크에는 'custom' 표시, 직접 쓴 도구가 맡은 기능, 빈틈 id만 들어간다.
12. **이미 목록에 있는 도구 이름을 쓰면 알려 준다**("수파베이스" → Supabase). 갈래를 짐작할 수 있으면 확인된 도구를 옆에 놓는다("OpenWeather" → Open-Meteo, 기상청 단기예보).
13. **코드쇼퍼가 아직 못 하는 바람(AI 기능, 스토어 앱, 실시간 채팅, 파일 올리기)을 쓰면 숨기지 않고 말한다.** 알아볼 것 카드 1장을 더한다(빈틈, 6.8절).
14. **입력 칸은 GOV.UK·KRDS를 따른다**: 라벨 + 보이는 도움말(예시를 placeholder에 두지 않음) + 글자 수 + 넘쳐도 자르지 않고 알림 + 연락처처럼 보이는 글 경고 + 한글 조합 중 Enter 무시. 지금 마지막 한 줄 칸도 같게 고친다.
15. **기존 골든 23개의 기대값은 하나도 바뀌지 않는다**(11.1절 근거). 새 골든 7개(case-24~30)를 더한다.
16. **`launch.md` L-07과 다른 점 여섯은 이 문서를 따른다**(12절): 예·아니요 질문에도 둔다(소유자 요청 "반드시"), 도구 이름은 40자, 링크에 도구 이름 안 넣음, 직접 쓴 가져올 정보는 '그 밖의 공공 정보'로 바꾸지 않음, 낱말표 파일 이름 `aliases.json`, 첫 질문의 내 말은 `notes`에 두고 한 줄 칸을 미리 채움.

---

## 1. 조사 방법과 한계 (2026-10-14)

| 방법 | 된 것 | 표시 |
|---|---|---|
| GitHub 원본(raw·`git clone --depth 1`) | GOV.UK Design System(`alphagov/govuk-design-system`, 마지막 커밋 2026-10-13), W3C APG(`w3c/aria-practices`), React Aria 문서(`adobe/react-spectrum`), MDN(`mdn/content`), WCAG 2.2(`w3c/wcag`), KRDS(`KRDS-uiux/krds-uiux` v1.1.0, 2026-01-12), GOV.UK `accessible-autocomplete` README | [확인] |
| npm 레지스트리 | `es-hangul` 2.4.0(MIT, 토스) 내려받아 함수 목록·크기 잼, `accessible-autocomplete` 3.0.2(2026-09-24 수정), `react-aria-components` 1.22.1, `@headlessui/react` 2.2.10, `downshift` 9.4.0, `fuse.js` 7.5.0 판 확인 | [확인]·[잼] |
| 원형 코드 | 낱말 찾기 원형과 엔진 모의 실행을 스크래치 폴더에서 돌림(6.10절, 11절). 저장소 파일은 고치지 않았다 | [잼] |
| 웹 검색 | Google Forms '기타', 카카오 비즈니스폼, 설문 '기타' 재분류, Baymard 드롭다운, 한글 IME 버그 | [검색 요약] |
| 못 연 것 | WebFetch는 모든 주소에서 `getaddrinfo ENOTFOUND`, curl은 GitHub 밖에서 프록시 `403 CONNECT`. 그래서 `design-system.service.gov.uk`, `krds.go.kr`, 토스 TDS 문서(`tossmini-docs.toss.im`), 네이버 폼 도움말 화면은 직접 보지 못했다. KRDS 저장소에는 예제 코드만 있고 지침 글이 없다 | [못 봄] |

---

## 2. 참고한 사례에서 본 것

### 2.1 정부 디자인 시스템

| 출처 | 본 것 | 코드쇼퍼가 가져갈 것 | 표시 |
|---|---|---|---|
| **GOV.UK 라디오** `src/components/radios/index.md` | "Conditionally revealing a related question": 보기를 고르면 바로 아래에 관련 질문을 펼친다. "Keep it simple. If the related question is complicated or has more than one part, show it on the next page in the process instead." "Do not conditionally reveal questions to inline radios, such as 'yes' and 'no' options placed next to each other." 다른 보기와 성격이 다른 보기는 'or' 글 나눔으로 떼고, 'None of the above'나 'I do not know'를 둔다. 펼친 질문을 알리지 못하는 점은 WCAG 4.1.2에 어긋나지만 "simple"하면 화면 낭독기 이용자가 어려워하지 않았다고 적었다 | 펼치는 것은 **한 줄 칸 하나만**. 2×2 예·아니요 칸 안에서 펼치지 않고, 그 아래 전체 폭 줄에서 펼친다. '모르겠어요' 앞에 '또는' | [확인] |
| **GOV.UK 평등 정보 패턴** `src/patterns/equality-information/white/index.njk` | 보기 "Any other White background"를 고르면 칸 "How would you describe your background? (optional)"가 펼쳐지고, 그 아래 `divider: "or"`, 마지막 "Prefer not to say". 본문: "Always give the user the option to enter their own description of their background." | 순서 그대로: 보기 → 직접 쓰기(펼침) → 또는 → 모르겠어요 | [확인] |
| **GOV.UK 글 칸** `src/components/text-input/index.md` | "Do not use placeholder text in place of a label, or for hints or examples": 쓰기 시작하면 사라지고, 모든 화면 낭독기가 읽지 않고, 기본 색이 대비 기준에 못 미친다. "Using the `maxlength` attribute means there is no feedback to users that their text input is truncated", 붙여 넣은 글이 몰래 잘린다. 이름·번호처럼 맞춤법 검사가 맞지 않는 칸은 `spellcheck="false"` | 예시는 도움말에. `maxlength`로 자르지 않고 넘치면 알린다. 도구 이름 칸은 맞춤법 검사 끔 | [확인] |
| **GOV.UK 글자 수** `src/components/character-count/index.md` | "This component does not restrict the user from entering information … they've entered too many characters. This lets them type or copy and paste their full answer, then edit it down." | 넘쳐도 쓰게 두고 "n자를 줄여 주세요" | [확인] |
| **KRDS(범정부 UI/UX 디자인 시스템)** `html/code/text_input.html`·`textarea.html` | 글 칸 예제: '레이블' 아래 '도움말', 오류·성공·정보 메시지 상태, 여러 줄 칸 아래 "0 /100" 글자 수 | 라벨 + 도움말 + 글자 수 순서는 한국 공공 서비스와 같다. 지침 글(언제 '기타'를 두는지)은 사이트를 못 열어 못 봤다 | [확인] 예제 · [못 봄] 지침 |

### 2.2 설문·신청 도구

| 출처 | 본 것 | 가져갈 것 | 표시 |
|---|---|---|---|
| Google Forms | 객관식 아래 "'기타' 추가" 링크. 응답자는 '기타' 칸에 자기 답을 쓴다. Apps Script `MultipleChoiceItem.showOtherOption(enabled)`로도 켠다 | 질문마다 '직접 쓰기' 하나, 보기 목록 맨 끝 | [검색 요약] developers.google.com/apps-script/reference/forms/multiple-choice-item |
| 카카오 비즈니스폼+ | 복수 선택형에서 '기타' 보기는 보기 개수에 포함된다 | '직접 쓰기'도 보기 하나로 센다(자료에 보기로 둔다, 9.1절) | [검색 요약] kakaobusiness.gitbook.io |
| 설문 응답 정리 관행 | "'기타, 직접 쓰기' 답은 기존 보기로 되돌려 넣을 수 있는 답과 새 보기를 만들 근거가 되는 답을 가려 읽는다." 남는 답을 위한 '기타' 자리는 늘 필요하다 | 이것이 우리 낱말 찾기의 일이다: **되돌려 넣기(가장 가까운 보기)** 또는 **그대로 두기**. 그대로 둔 답이 쌓이면 새 보기 후보 | [검색 요약] Savanta 'open-ended survey coding', Qualtrics 커뮤니티 |
| Baymard 드롭다운 연구 | 보기가 10개를 훨씬 넘고 검증이 필요 없으면 열린 글 칸이 드롭다운보다 단순하다. 선택 칸일 때 55%가 드롭다운을 열어 보기만 하고 닫았다 | 보기는 지금처럼 다 펼쳐 보이고(드롭다운 아님), 직접 쓰기는 글 칸 | [검색 요약] baymard.com/blog/drop-down-usability |

### 2.3 자동 완성·콤보박스

| 출처 | 본 것 | 결정 | 표시 |
|---|---|---|---|
| **W3C APG Combobox** | "An editable combobox may either allow users to input any arbitrary value, or it may restrict its value to a discrete set." 'List autocomplete with manual selection': "The character string the user has typed will become the value of the combobox unless the user selects a value in the popup." 팝업 키보드: ↓·↑·Enter·Esc·Alt+↓, `aria-activedescendant` | **뜻은 가져가고 팝업은 버린다.** 쓴 글이 값이고, 제안은 이용자가 골라야만 바뀐다. 다만 한글 조합 중 팝업이 깜빡이고(2.4절) 360px에서 키보드와 팝업이 화면을 다 덮으므로, 제안은 [확인] 뒤 칸 아래 버튼 목록으로 보인다 | [확인] |
| **React Aria ComboBox** | "By default, the value will be reverted to the selected item on blur. Set the `allowsCustomValue` prop to enable entering values that are not in the list." | 우리는 늘 `allowsCustomValue`인 셈이다. 칸을 떠나도 쓴 글을 되돌리지 않는다 | [확인] |
| **GOV.UK accessible-autocomplete** | "we're only able to put in minimal work to support it." Preact 10.19.6은 "incompletely tested" | 의존성으로 들이지 않는다 | [확인] README, npm 3.0.2 |
| **MDN `<datalist>`** | 글자 확대에 따라 커지지 않고, 고대비 모드에서 꾸밀 수 없고, "Some screen reader/browser combinations, including NVDA and Firefox, do not announce the contents of the autosuggest popup" | 쓰지 않는다(WCAG 1.4.4·4.1.2) | [확인] |

### 2.4 한글 입력

| 출처 | 본 것 | 결정 | 표시 |
|---|---|---|---|
| MDN `KeyboardEvent.isComposing`, `keydown` | 조합 중 keydown을 무시하려면 `event.isComposing \|\| event.keyCode === 229`. "`compositionend` may fire before `keydown` when typing the last character … `isComposing` is false … `keyCode` is still 229" | Enter로 [확인]을 누를 때 이 두 조건을 함께 본다 | [확인] |
| WebKit 버그 165004 | Safari는 조합을 끝내는 Enter의 keydown을 `isComposing === false`로 보낸다 | 위 두 조건 + 조합 끝(`compositionend`) 직후 같은 틱의 Enter는 한 번 거른다 | [검색 요약] |
| Chromium 코드 리뷰 442433002 | `maxlength`는 IME 입력·붙여 넣기에서 글을 자른다(의도된 동작) | `maxlength`를 쓰지 않는다(GOV.UK와 같은 결론). 지금 마지막 한 줄 칸은 `maxLength={80}`이라 고친다 | [검색 요약] |
| `es-hangul` 2.4.0 (토스, MIT) | `disassemble`, `getChoseong`, `convertQwertyToHangul`(영문 자판으로 친 글을 한글로) 등. 세 함수만 묶어도 2.9KB(gzip) [잼] | 아이디어(영문 자판 되돌리기)만 가져오고 엔진 안에 40줄로 직접 쓴다(의존성 0, 엔진 순수성). 시험의 비교 기준으로도 쓰지 않는다(개발 의존성도 늘리지 않음) | [확인]·[잼] |

### 2.5 WCAG 2.2에서 걸리는 것

- **3.3.7 Redundant Entry (A)**: "Information previously entered by or provided to the user that is required to be entered again in the same process is either auto-populated, or available for the user to select." → 첫 질문에서 앱을 직접 썼으면 마지막 한 줄 칸을 그 글로 미리 채운다(5.7절). [확인]
- **4.1.3 Status Messages (AA)**: 상태 메시지는 초점을 옮기지 않고도 보조 기술이 읽을 수 있어야 한다 → 글자 수 넘침·저장됨은 `aria-live`(`announce`). 다만 고를 일이 생기는 찾은 결과는 초점을 결과 글로 옮긴다(4.4절). [확인]
- 3.3.1 오류 식별, 3.3.2 라벨·지시, 2.5.8 누르는 곳 크기(우리 기준 44×44px)는 지금 규칙(`.claude/rules/ui.md`) 그대로.

### 2.6 큰 서비스 관행에서 고른 것 / 버린 것

- **고른 것**: '기타'는 늘 목록 끝 하나(Google Forms·카카오), 펼침은 한 칸만(GOV.UK), 쓴 글이 값(APG·React Aria), 되돌려 넣기 또는 그대로 두기(설문 정리 관행), 예시는 도움말에(GOV.UK·KRDS).
- **버린 것**: 입력하는 동안 바뀌는 자동 완성 팝업, `<datalist>`, 쓴 글로 보기를 저절로 고르기, 욕설 거르기(요청 범위 밖이고 글은 이용자 기기와 이용자 AI에만 간다), 쓴 글을 우리 서버로 보내 모으기(R-04·R-60).
- 국내 앱의 '배송 요청사항 → 직접 입력' 같은 선택 + 직접 입력 꼴은 널리 쓰이지만 이번에 공식 화면이나 문서로는 확인하지 못했다 [검색 요약]. 토스 TDS 글 칸 문서도 [못 봄].

---

## 3. 지금 고르는 곳과 직접 쓰기 자리

| 자리 | 지금 | 직접 쓰기 | 맡는 곳 |
|---|---|---|---|
| 1 만들 앱 정하기: 질문 17개 | 보기만 [확인] | **넣음**. 질문마다 보기 하나 `custom` | 이 문서 5절. `q.style`의 세부(색·글꼴)는 `design.md` 5.3절, `q.ai`의 도구 이름 둘째 칸은 `aitools.md` 9.2절 |
| 1 마지막 한 줄 (R-18) | 있음, 80자 | 있음. 다듬기만(5.7절) | 이 문서 |
| 2 도구 고르기: 기능마다 | 진열 도구 + 원문만 있는 도구 | **넣음**. "목록에 없는 도구 쓰기" | 이 문서 8절 |
| 내 AI 써 보기: AI 채팅 고르기 (새) | 없음 | 넣음 | `aitools.md` 9.1절, 같은 부품(4절) |
| 디자인 정하기 시트 (새) | 없음 | 넣음(느낌·색·글꼴·바라는 점·닮고 싶은 앱) | `design.md` 5.3·5.6절, 같은 부품·같은 낱말 찾기 |
| 준비 안내 `/guides` (새): OS·서비스 | 없음 | 넣음 | `aitools.md` 9.2절, `services.md` 10.6절, 같은 부품 |
| 도구 모음 `/tools` 거르기 | 검색 칸 있음 [확인] | 있음. 0건일 때 한 줄 더함: "목록에 없으면 도구 고르기에서 직접 쓸 수 있어요." | 이 문서 |
| 사전 `/dictionary` | 검색 칸 있음 [확인] | 있음 | — |
| 3 도구끼리 맞춰 보기: 막힌 곳 버튼 | 바꾸기·그대로 가기·미루기 | **빼는 곳**: 고르는 '값'이 아니라 하는 '행동'이다. 대신 그대로 갈 때 "이미 아는 것" 한 줄(선택, P2, 8.9절) | 이 문서 |
| 설정(움직임·소리·조용히·풀이·밑줄) | 켜고 끄기 | **빼는 곳**: 두 값뿐이라 다른 답이 없다 | — |
| 확인 문제 | 보기 2~4개 | **빼는 곳**: 정답이 있는 문제라 직접 쓰면 채점할 수 없다 | — |
| 단계 줄, 칸 고르개(탭), 기능 칩 | 이동 | **빼는 곳**: 고르는 값이 아니라 갈 곳 | — |
| 미리 짠 코스 | 코스 5개 | 따로 두지 않음: '처음부터 정하기'(만들 앱 정하기)가 곧 직접 쓰는 길 | — |

---

## 4. 하나의 규칙: 직접 쓰기 부품

모든 자리가 같은 부품 `src/components/CustomAnswer.tsx`(섬 안에서 쓰는 Preact 부품)를 쓴다. 다른 문서가 만드는 자리도 이 부품을 쓴다.

### 4.1 모양 (360px)

목록 줄 꼴(가져올 정보 같은 질문):

```text
┌──────────────────────────────────────┐
│ ▢ 없어요                            │ 줄 56 (지금 그대로)
│ ▢ 학교 정보                          │
│ …                                    │
│ ✎ 직접 쓰기                       ⌄ │ 줄 56, 연필 아이콘 20 (Phosphor PencilSimple)
│ ┌──────────────────────────────────┐ │ ← 누르면 이 자리에 펼침
│ │ 가져올 정보를 써 주세요            │ │ 라벨 15/600
│ │ 예: 우리 지역 도서관 휴관일.        │ │ 도움말 14/20 --text-2
│ │ 이름·연락처는 쓰지 마세요.          │ │
│ │ [                              ]  │ │ 글 칸 48, 폭 100%
│ │ 0/40자                 [ 확인 ]  │ │ 글자 수 14 · 중립 버튼 48
│ └──────────────────────────────────┘ │
│             또는                     │ 글 나눔 14 --text-3
│ ▢ 모르겠어요                         │
└──────────────────────────────────────┘
```

- 타일 꼴(`q.type`·`q.style`): 타일 2열 아래에 전체 폭 줄 [✎ 직접 쓰기] → '또는' → [모르겠어요]. 지금의 '모르겠어요' 전체 폭 줄과 같은 꼴.
- 2×2 꼴(예·아니요 질문): 2×2 칸(네·아니요·아마·모르겠어요)은 그대로 두고, **그 아래** 전체 폭 줄 [✎ 직접 쓰기]. GOV.UK가 금하는 "나란한 예·아니요 보기 안에서 펼치기"를 피한다. 이 꼴에는 '또는'을 두지 않는다.
- 보기 꼴을 정하는 `layoutOf()`는 `isCustom` 보기를 세지 않는다(지금 4개 → 2×2 판단이 그대로).
- 펼친 판은 카드가 아니다(카드 안 카드 금지). 옅은 판 `--fill` 면, 모서리 `--radius-md`, 안쪽 16.

### 4.2 흐름

```text
닫힘 ──[직접 쓰기]──▶ 쓰는 중 ──[확인]/Enter──▶ 찾은 결과 ──[보기 고르기]────▶ 정함(보기 + 내 말)
  ▲                    │  Esc                      │  └─[내 말 그대로 두기]─▶ 정함(custom + 내 말)
  └────────────────────┘                           └─[다시 쓰기] → 쓰는 중
```

찾은 결과는 넷 중 하나다(문구는 9.6절, 보이는 모양은 10절).

| 결과 | 보이는 것 | 버튼 |
|---|---|---|
| **하나 찾음** | "찾은 말 ‘가계부’ → 기록장" + "이 보기로 할까요? 내 말은 설계도에 그대로 넣을게요." | [기록장으로 고르기] (보통 버튼 48) · [내 말 그대로 두기] (중립 48) |
| **여럿 찾음** (2~3) | "가까운 보기가 2개 있어요." | 보기마다 [○○로 고르기] · [내 말 그대로 두기] |
| **못 찾음** | "보기와 맞는 말을 찾지 못했어요." + "가장 가까운 걸 고르거나, 내 말 그대로 둘 수 있어요." + 그대로 둘 때의 계산 한 줄(예: "‘모르겠어요’와 같게 계산하고, 내 말은 설계도에 그대로 넣을게요.") | 질문의 보기가 6개 이하면 모든 보기를 작은 줄로 다시 보인다(목록 위로 굴리지 않고 고르게) · [내 말 그대로 두기] |
| **빈틈** (함께 붙음) | 위 셋 중 하나 아래에 알림 한 줄: "AI 기능은 아직 코드쇼퍼가 도구를 골라 드리지 못해요. 설계도의 ‘알아볼 것’에 넣어 둘게요." | 따로 없음 |

- 고르거나 그대로 두면 **바로 다음 질문**으로 간다(보기를 누르면 넘어가는 D19와 같다).
- 정한 뒤 그 질문으로 돌아오면: 고른 보기에 ✓, [직접 쓰기] 줄의 둘째 줄에 "내 말: “가계부 앱”". 줄을 누르면 칸이 쓴 글로 채워진 채 열린다. 그대로 둔 답이면 [직접 쓰기] 줄에 ✓.
- 직접 쓴 뒤 다른 보기를 그냥 누르면 그 질문의 '내 말'은 지운다(쓴 뜻과 다른 답을 골랐을 수 있다). 낭독: "골랐어요: 네."(지금 그대로).
- 쓰다가 다른 보기를 누르면 칸은 접히고 쓰던 글은 그 질문을 떠날 때까지 부품 상태에 남는다(저장 안 함).

### 4.3 검사

| 검사 | 규칙 | 문구 |
|---|---|---|
| 길이 | 앞뒤 공백을 지우고 줄바꿈·탭을 한 칸으로(`oneLine`) 센 코드 포인트 수. 직접 쓰기는 **40자**, 마지막 한 줄은 지금처럼 80자. 칸에 `maxlength`를 두지 않는다 | 글자 수 "12/40자". 넘으면 [확인] 때 오류 "40자까지 쓸 수 있어요. 3자를 줄여 주세요." (`aria-invalid="true"`, 칸 테두리 `--danger`) |
| 빈 글 | 정리 뒤 0자 | "한 글자 이상 써 주세요." |
| 연락처처럼 보이는 글 | 휴대폰·전화 `/(01[016789]\|0\d{1,2})[-.\s]?\d{3,4}[-.\s]?\d{4}/`, 전자 우편 `/[^\s@]+@[^\s@]+\.[^\s@]{2,}/` | 막지 않고 경고: "연락처처럼 보이는 글이 있어요. 설계도에 그대로 들어가니 지워 주세요." |
| 한글 조합 | Enter keydown에서 `e.isComposing \|\| e.keyCode === 229`면 무시. 조합 중에는 오류를 새로 띄우지 않는다(`compositionend` 뒤에 다시 잼) | — |
| 욕설 | 거르지 않는다(요청 범위 밖, 글은 이용자 기기와 이용자 AI에만 간다) | — |

### 4.4 접근성

- [직접 쓰기] 줄은 `<button aria-expanded aria-controls>`. 그대로 둔 답일 때는 숨은 글 ", 고른 답"과 ✓(눌림 상태 `aria-pressed`를 겹쳐 쓰지 않는다. 도구 고르기의 `savedMark`와 같은 방식).
- 펼치면 초점을 글 칸으로 옮긴다(쓰려고 누른 것이므로 휴대폰 키보드가 바로 뜬다). 칸: `<label>`(라벨) + `aria-describedby="도움말 글자수 오류"`. `autocomplete="off"`, `enterkeyhint="done"`, 도구 이름 칸만 `spellcheck="false"`.
- Esc: 칸을 접고 초점을 [직접 쓰기] 줄로.
- 찾은 결과가 나오면 초점을 결과 첫 문장(`<p tabindex="-1">`)으로 옮긴다. 고를 버튼이 생기는 변화라 알림(`aria-live`)만으로는 부족하다. 결과 묶음은 `role="group" aria-labelledby`.
- 글자 수가 넘을 때 한 번만 알린다(지금 `lineFull`과 같다). 정하면 낭독: "골랐어요: 기록장. 내 말도 설계도에 넣었어요." / "내 말 그대로 뒀어요."
- 누르는 곳은 모두 44px 이상, 글자 200%에서 [확인]이 칸 아래 줄로 내려간다(가로 넘침 없음).
- 펼침·접힘은 높이 전환 `--dur-fast`, 동작 줄이기면 바로(움직임 0).

### 4.5 저장·링크·집계

| | 직접 쓴 글 | 보기 id `custom` | 직접 쓴 도구 |
|---|---|---|---|
| 브라우저 저장(`cc:session:v1`, `store.ts`만) | 넣음(`notes`) | 넣음(`answers`) | 넣음(`customTools`) |
| 영수증 링크 `#r=` | **안 넣음** | 넣음 | 이름은 **안 넣음**, 맡은 기능만(`x`) |
| 지난 영수증(`cc:receipts:v1`) | 링크 조각만 두므로 안 들어감 | 들어감 | 기능만 |
| 설계도 .md | 넣음("내 말 그대로") | — | 이름 넣음 |
| 익명 집계 `/api/event` | **안 보냄** | 안 보냄 | 안 보냄 |
| 기록 내보내기·임시 저장(`launch.md`의 `cc:drafts:v1`) | 세션 통째라 들어감(이용자 기기의 파일) | 들어감 | 들어감 |

- 링크에 이름을 넣지 않는 이유: 링크를 받은 사람의 화면(우리 주소)에 남이 지은 글이 그대로 보인다. "공식: 여기로 입금하세요 010-…" 같은 글을 도구 이름으로 넣은 링크를 퍼뜨릴 수 있다. 그래서 받은 링크로 연 영수증에서는 이름 자리에 "직접 쓴 도구"가 보인다.
- 집계는 늘리지 않는다. PRD R-60은 이벤트를 다섯 개로 못 박았다. '그대로 둔 답이 많은 질문'을 알고 싶으면 관찰 시험(`docs/OBSERVATION.md`)에서 본다(14절 결정 후보).

---

## 5. 질문별 명세

### 5.1 표

`like`는 그대로 둘 때 같게 계산할 보기(그 보기의 `tags`를 그대로 쓴다). 라벨과 도움말은 `questions.json`의 `custom` 보기 칸(`field`·`hint`)에 둔다.

| 질문 | 라벨 (`field`) | 도움말 (`hint`) | 찾는 법 | 그대로 두면 (`like`·`tags`) | 화면이 말하는 계산 |
|---|---|---|---|---|---|
| `q.type` 어떤 앱 | 만들고 싶은 앱을 한 줄로 써 주세요 | 예: 가계부, 반려식물 물 주기 알림. | 보기 낱말 | `tags: { "type.custom": 1 }` (새 종류) | 보기에 없는 앱으로 두고, 필요한 기능은 다음 질문에서 물어볼게요. |
| `q.audience` 누가 | 누가 쓰는지 써 주세요 | 예: 우리 가족 넷, 동아리 회원 30명. | 보기 낱말 | `like: "few"` | ‘몇 명이 같이’와 같게 계산하고, 내 말은 설계도에 그대로 넣을게요. |
| `q.ai` 어떤 AI | 쓰는 AI 이름을 써 주세요 | 예: 뤼튼, Cursor. | AI 이름 + 무료·유료 말(6.7절) | `like: "unknown"` | ‘모르겠어요’와 같게 계산하고, … |
| `q.save` 저장 | 생각을 짧게 써 주세요 | 예: 사진만 남겨 두고 싶어요. | 예·아니요(6.5절) | `like: "unknown"` | ‘모르겠어요’와 같게 … |
| `q.login` 로그인 | 생각을 짧게 써 주세요 | 예: 선생님만 로그인하면 돼요. | 예·아니요 | `like: "unknown"` | 〃 |
| `q.domain` 가져올 정보 | 가져올 정보를 써 주세요 | 예: 우리 지역 도서관 휴관일. | 보기 낱말 | `tags: { "need.data": 1 }` (분야 없음) | 밖에서 가져올 정보가 있다고 보고, 맞는 도구는 도구 고르기에서 같이 찾아요. |
| `q.edu-topic` 등 주제 넷 | 필요한 정보를 써 주세요 | 예: 방과 후 수업 목록. (질문마다 다름) | 보기 낱말 | `like: "unknown"` | ‘모르겠어요’와 같게 … |
| `q.notify` 알림 | 생각을 짧게 써 주세요 | 예: 비 오는 날 아침에만. | 예·아니요 | `like: "unknown"` | 〃 |
| `q.realtime` 얼마나 자주 | 얼마나 자주 새로 받아야 하는지 써 주세요 | 예: 5분마다, 하루 한 번. | 주기 읽기(6.6절) + 낱말 | `like: "unknown"` | 〃 |
| `q.budget` 돈 | 쓸 수 있는 돈을 써 주세요 | 예: 한 달 5천 원. | 돈 읽기(6.6절, 한 달 기준) | `like: "unknown"` (0원만) | 〃 |
| `q.personal` 개인정보 | 받는 정보를 써 주세요 | 예: 이름과 반 번호. | 보기 낱말 | `like: "unknown"` (받는다고 봄) | 〃 |
| `q.payment` 결제 | 생각을 짧게 써 주세요 | 예: 후원 버튼 정도. | 예·아니요 | `like: "unknown"` | 〃 |
| `q.device` 기기 | 어디서 쓰는지 써 주세요 | 예: 아이패드, 교실 전자칠판. | 보기 낱말 | `like: "unknown"` (둘 다) | 〃 |
| `q.style` 느낌 | 원하는 느낌을 한 줄로 써 주세요 (`design.md`와 같은 말) | 예: 바다처럼 시원하게, 우리 학교 초록색으로. | `design.md` 5.6절 낱말표(같은 찾기 함수) | `like: "unknown"` + 찾은 색·느낌은 디자인 값에 반영 | `design.md` 9.4절 문구 |

- 모든 직접 쓰기 칸의 도움말 끝에 같은 한 줄: "이름·연락처는 쓰지 마세요."(R-18과 같은 뜻).
- 세 예외의 이유:
  - `q.type` → `type.custom`: '안내 페이지'(지금 '모르겠어요'의 값)로 계산하면 설계도 3·4번이 "날짜·항목 바꾸기"처럼 엉뚱한 화면을 지시한다. 새 종류는 화면·기능을 출발점만 적고 "1단계에서 내 말에 맞게 나와 함께 정해 줘"라고 지시한다(9.4절).
  - `q.domain` → `need.data`만: 직접 썼다는 것은 가져올 정보가 있다는 뜻이다. '모르겠어요'(`{}`)로 계산하면 외부 데이터 칸이 사라진다. 분야 태그가 없으므로 그 칸에는 추천 도구가 없고(`matchDomain`), 이용자는 도구를 직접 쓰거나 '그대로 가기'로 알아볼 것에 넘긴다. `launch.md`의 '그 밖의 공공 정보'로 바꾸는 안은 쓰지 않는다: 포켓몬 정보 같은 공공이 아닌 정보에도 공공데이터포털을 추천하게 된다(R-22 '근거 있는 추천만').
  - `q.audience` → '몇 명이 같이': 남을 적었으니 '나만'(지금 '모르겠어요'의 값)은 맞지 않는다. '아무나'와 안전 규칙이 거의 같고(배포 필수, 키 노출 막힌 곳, 저작권 알아볼 것) 다른 것은 금융 투자 권유 알아볼 것 하나뿐이다.
- 예·아니요 질문을 '아마 그럴 거예요'(= 네)로 계산하는 안도 엔진으로 돌려 봤다 [잼]: 같은 퀴즈에서 저장·로그인·개인정보 질문이 더 나오고, 고를 것이 2개(화면·배포)에서 4개(화면·저장·로그인·배포)로, 알아볼 것이 1개에서 3개(개인정보·결제·저작권)로 늘었다(11.3절 case-26). 그래서 '모르겠어요'로 둔다. 쓴 글에 '저장'이 있으면 찾기가 대개 '네'를 제안하므로(6.10절), 그대로 두는 경우는 정말 애매한 글뿐이다.

### 5.2 `type.custom`이 바꾸는 것

- `taxonomy.json`: `{ "id": "type.custom", "label": "직접 쓴 앱" }`.
- `q.notify`의 `showIf`: `{ "tag": "type.dashboard", "gte": 1 }` → `{ "any": [{ "tag": "type.dashboard", "gte": 1 }, { "tag": "type.custom", "gte": 1 }] }`. 보기에 없는 앱은 알림이 필요한지 모르니 묻는다. `q.save`는 이미 '신청서·기록장이 아니면' 묻는다.
- `templates.types["type.custom"]`(9.4절). `notBuildRules`·`safety`·`research` 규칙은 바꾸지 않는다(종류 태그를 보는 규칙은 신청서·퀴즈·현황판만).
- 지도(`map/model.ts`): 빈 터 모양은 기본 빈 터(`lot.type: null`), 이름표는 '내 말' 앞 12자. 설계도 목적지 이름(`projectName`)은 한 줄 입력 → `q.type`의 내 말 → 종류 이름 순.
- 지난 영수증 목록(`ReceiptsList.tsx`)의 이름: `!o.isUnknown` 조건에 `!o.isCustom`을 더한다("직접 쓰기"라는 이름이 목록에 뜨지 않게).

### 5.3 예·아니요 질문

- 2×2 아래 전체 폭 [직접 쓰기]. 찾기는 6.5절. 찾은 결과 문장은 같은 틀: "찾은 말 ‘필요 없’ → 아니요".
- '아마 그럴 거예요'를 제안할 때는 지금의 한 줄 "'아마 그럴 거예요'는 '네'로 보고 챙겨 둘게요."를 결과 아래에도 붙인다.

### 5.4 숫자로 읽는 질문

- `q.budget`: 보기 기준이 한 달이므로 기간을 한 달로 바꿔 견준다. 1만 원 미만 → '한 달 몇천 원까지', 1만 원 이상 → '필요하면 더', 0원·무료·공짜 → '0원만'. 예: "1년에 10,000원" → 한 달 약 833원 → '몇천 원까지'. "하루 500원" → 한 달 약 15,000원 → '필요하면 더'.
- `q.realtime`: 초·분·시간 단위나 '실시간·바로·자주' → '몇 초~몇 분마다 (실시간)'(이 보기는 '자주 갱신' 도구도 받는다), 하루·주·달·매일·가끔 → '하루 한 번이면 충분해요'.

### 5.5 `q.ai`와 `q.style`

- `q.ai`: AI 이름(ChatGPT·Gemini·Claude·뤼튼)은 종류만 정하고 무료·유료는 정하지 않는다. 원형에서 "ChatGPT Plus"가 이름 쪽 글자가 길어 '무료'로 잘못 짐작했다 [잼] → 규칙: 에이전트 이름이 있으면 '코딩 에이전트', 유료 말(유료·구독·Plus·Pro·플러스·프로)이 있으면 '유료 AI 구독', 그 밖에 채팅 이름이나 무료 말이 있으면 '무료 AI 채팅'. `aitools.md`의 둘째 칸 `q.aiTool`이 생기면 도구 이름은 그 칸의 직접 쓰기가 받고(`notes["q.aiTool"]`, `renderAiSetup`의 `customToolName`), `q.ai`의 직접 쓰기는 "종류는 모르는데 이름은 안다"를 받는다. 웹 빌더 이름(Lovable·Bolt·v0·Replit)은 `ai.builder`가 생기기 전까지 찾지 않는다(그대로 두면 '모르겠어요' = 무료 AI 채팅).
- `q.style`: `design.md`가 정한 느낌 직접 쓰기와 **같은 칸이다.** `design.md`의 `LookChoice.moodText`를 따로 두지 않고 `Session.notes["q.style"]`을 읽는다(같은 글이 두 곳에 저장되지 않게). 낱말표는 `design.md`의 `looks.json` `keywords`이고, 찾기 함수는 같은 `findAliases`(6.9절)를 쓴다.

### 5.6 주제 질문 넷의 '모르겠어요' 값

날씨·말과 글·금융 주제의 '모르겠어요'는 지금도 기본 주제 태그를 준다(예보·번역·주식 시세). 그대로 둔 직접 쓰기도 같은 값을 받는다. 화면은 "‘모르겠어요’와 같게 계산하고, …"라고 말하고, 설계도의 '내 말 그대로'가 실제 바람(예: "자외선 지수")을 이용자 AI에게 전한다.

### 5.7 마지막 한 줄 칸 다듬기 (지금 있는 것)

- 예시를 placeholder("예: 우리 반 이번 주 급식을 보여 주는 페이지…")에서 도움말로 옮긴다: "예: 우리 반 이번 주 급식을 보여 주는 페이지. 이름, 학교 이름, 연락처는 적지 마세요. 이 글은 영수증 링크에 들어가지 않아요."
- `maxLength={80}`과 `slice(0, 80)`을 지우고, 넘치면 글자 수를 `--danger`로 바꾸고 "80자까지 쓸 수 있어요. n자를 줄여 주세요."라고 알린다. 저장은 80자 안일 때만 바뀐다(넘친 동안은 마지막 맞는 글이 남는다).
- 첫 질문에서 앱을 직접 썼고 한 줄이 비어 있으면 칸을 그 글로 미리 채운다(WCAG 3.3.7). 고치지 않으면 엔진이 같은 글을 쓴다(`projectName`·1번 '한 줄 설명'이 `notes["q.type"]`로 넘어감).
- Enter: 조합 중이면 무시(4.3절), 아니면 지금처럼 아래 막대 주 버튼으로 초점.
- 한 줄에서 빈틈 말을 찾으면(칸을 떠날 때 한 번) 칸 아래 알림 한 줄(6.8절).

---

## 6. 낱말 찾기 (`src/lib/engine/match.ts`, AI 없음)

### 6.1 정규화

1. NFKC(전각 → 반각), 소문자, 폭 없는 글자(U+200B~200D, U+2060, U+FEFF, U+00AD) 지우기.
2. 글자·숫자·`+`·`#` 밖의 것은 공백, 공백 여러 개는 하나. (`src/lib/glossary.ts`의 `normalizeTerm`과 같은 기준.)
3. 찾을 때는 **공백을 뺀 글**(compact)에서 찾는다. 한국어 초심자는 "학교급식앱", "우리반퀴즈"처럼 붙여 쓰기 때문이다. 원래 어절 경계는 표로 따로 들고 있는다(`=` 열쇠에 씀).

### 6.2 찾기

- 열쇠(낱말표의 말)도 같은 정규화 + 공백 빼기.
- 열쇠가 `=`로 시작하면 **어절 하나 전체**가 같을 때만 맞는다(`=네`, `=비`, `=폰`, `=ai`). 한 글자 열쇠는 반드시 `=`(검사가 막는다). 그래서 "네이버"의 '네', "비빔밥"의 '비'가 맞지 않는다.
- 모든 자리를 찾은 뒤 **긴 열쇠부터 겹치지 않게** 남긴다(같으면 앞 자리, 그다음 자료 순서). "업비트"가 "비트"를, "로그인"이 "로그"를, "블로그"가 "로그"를 이긴다. 그래서 **한 칸에서 쓰는 모든 낱말표(보기·도구 이름·갈래 짐작·빈틈)를 한 번에** 찾는다. 원형에서 따로 찾았더니 "업비트 API"를 "비트"(Vite의 한글 이름)로 읽었다 [잼].

### 6.3 점수

- 보기마다 **찾은 서로 다른 말의 개수**. 같으면 가장 긴 말 → 자료 순서. 1개 이상인 보기를 최대 3개 보인다.
- 처음엔 '찾은 말 길이의 합'으로 했더니 "Gemini 프로 구독"에서 긴 이름 하나가 '프로'·'구독' 둘을 이겼다 [잼]. 개수(증거 수)가 초심자의 글에 더 맞다.

### 6.4 부정

주제어 바로 뒤 6글자(공백 뺀 글) 안에 부정 말(`없`, `안 `, `안해`, `말고`, `빼고`, `싫`, `아니`, `않`)이 오면 그 주제어는 '아니요' 쪽 증거다. 예: "로그인 없이" · "저장은 필요 없어요" · "알림은 싫어요" · "회원가입은 귀찮아서 빼고".

### 6.5 예·아니요 질문

질문마다 주제어(`aliases.json`의 `yesNo.topics`)와 공통 말 넷을 한 번에 찾고, 이 순서로 정한다:

1. 아니요 말(`=아니`, `아니요`, `아뇨`, `=no`, `필요 없`, `안 해도`, `안 받`, `하지 않`, `없이`, `빼고`, `말고` …)이나 부정된 주제어 → **아니요**
2. 모름 말(`모르`, `모름`, `잘 모`) → **모르겠어요**
3. 아마 말(`아마`, `나중에`, `글쎄`, `혹시`, `일단`, `할 수도`, `것 같` …) → **아마 그럴 거예요**
4. 예 말(`=네`, `=응`, `필요`, `있어`, `해야`, `=꼭`, `하고 싶`, `좋겠` …)이나 주제어 → **네**
5. 없으면 제안 없음

### 6.6 돈과 주기 읽기

- 돈: 돈 단위가 붙은 숫자만 읽는다(`(?<![\d,])(\d[\d,]*)(천|만)?원` 또는 `(\d[\d,]*)(천|만)`). "1년에"의 1은 돈이 아니다. 기간: 년·연 ÷12, 주 ×4, 하루·매일 ×30, 없으면 한 달. 숫자를 먼저 읽어서 "10,000원" 속 "0원"을 무료로 읽지 않는다(원형의 첫 버그 [잼]). 숫자가 없으면 무료 말(무료·공짜·돈 없·무과금) → 0원만, '몇천' → 몇천 원까지, '몇만'·'만원'·'상관없'·'필요하면' → 필요하면 더.
- 주기: 숫자 + 초·분·시간 → 실시간, 숫자 + 일·주·달 → 하루 한 번. 그 밖은 보기 낱말.

### 6.7 영문 자판으로 친 한글 되돌리기

아무것도 못 찾았고 글이 영문 글자와 공백뿐이면, 두벌식 자판 표로 한글로 바꿔(겹모음·겹받침 포함) 완성 글자가 70% 이상일 때 한 번 더 찾는다. 찾으면 결과 위에 "영문 자판으로 친 것 같아 ‘할 일 목록’으로 읽었어요."라고 말한다. 원형에서 "gkf dlf ahrfhr" → "할 일 목록" → 기록장 [잼].

### 6.8 빈틈 (코드쇼퍼가 아직 못 하는 바람)

`aliases.json`의 `gaps`. 찾으면 화면이 숨기지 않고 말하고, 화면이 `session.gaps`에 id를 넣는다. 엔진은 그 id의 알아볼 것 카드를 더한다(7.6절).

| id | 낱말 (일부) | 화면 알림 | 알아볼 것 카드 |
|---|---|---|---|
| `ai-feature` | 챗봇, `=ai`, 인공지능, gpt, chatgpt, openai, `=llm`, 요약해, 자동 답변, 생성형 | AI 기능은 아직 코드쇼퍼가 도구를 골라 드리지 못해요. 설계도의 ‘알아볼 것’에 넣어 둘게요. | `research.gap-ai-feature` |
| `native-app` | 앱스토어, 플레이스토어, 구글 플레이, 아이폰 앱, 안드로이드 앱, 설치형 | 코드쇼퍼 설계도는 브라우저에서 여는 웹앱 기준이에요. 스토어에 올리는 일은 ‘알아볼 것’에 넣어 둘게요. | `research.gap-native-app` |
| `chat` | 채팅, 메신저, 실시간 대화, 단톡 | 여러 사람이 바로바로 대화하는 기능은 아직 도구를 확인하지 않았어요. ‘알아볼 것’에 넣어 둘게요. | `research.gap-chat` |
| `file-upload` | 업로드, 파일 올리, 사진 올리, 첨부 | 사진·파일 올리기는 아직 도구를 확인하지 않았어요. ‘알아볼 것’에 넣어 둘게요. | `research.gap-file-upload` |

- 빈틈은 `q.type`·`q.domain`의 직접 쓰기, 마지막 한 줄, 직접 쓴 도구 이름에서만 찾는다(`gaps[].where`). `q.ai`에서는 찾지 않는다("Claude"는 만드는 AI이지 앱 기능이 아니다).
- 빈틈을 품은 글이 지워지거나 바뀌면 화면이 `gaps`를 다시 계산해 저장한다(모든 내 말과 한 줄·도구 이름의 합).
- 빈틈 목록은 처음 넷으로 시작하고 관찰 시험에서 늘린다. 같은 바람이 자주 나오면 빈틈이 아니라 도구·질문을 더할 후보다(BACKLOG).

### 6.9 함수 모양

```ts
// src/lib/engine/match.ts — 순수 함수. DOM·시각·난수 없음. 정렬은 cmp.
export interface Aliases { /* data/aliases.json 모양 (9.2절) */ }
export interface AliasHit { target: string; word: string; start: number; end: number }
export interface Suggestion { optionId: string; score: number; words: string[] }
export interface AnswerMatch {
  suggestions: Suggestion[];          // 0~3개, 점수 순
  readAs?: string;                    // 영문 자판을 한글로 읽었을 때 그 글
  gaps: string[];                     // 찾은 빈틈 id
}
export interface ToolMatch {
  same: { productId: string; word: string } | null;      // 이미 목록에 있는 도구
  near: { hintId: string; productIds: string[]; inSlot: boolean } | null; // 같은 갈래의 확인된 진열 도구 (최대 2개)
  gaps: string[];
}

export function normalizeForMatch(text: string): { compact: string[]; wordStart: boolean[]; wordEnd: boolean[] };
export function findAliases(text: string, entries: { target: string; aliases: string[] }[]): AliasHit[];   // 6.1~6.2
export function matchAnswer(cat: Catalog, aliases: Aliases, questionId: string, text: string): AnswerMatch;
export function matchTool(cat: Catalog, aliases: Aliases, r: EngineResult, slotId: string, text: string): ToolMatch;
export function gapsIn(aliases: Aliases, texts: { where: GapWhere; text: string }[]): string[];
export function looksLikeContact(text: string): boolean;   // 4.3절 (text.ts에 둬도 됨)
export function qwertyToHangul(text: string): string;      // 6.7절
```

- `matchTool`의 `near.productIds`: 짐작한 갈래(기능 + 분야)의 진열 도구가 **지금 칸의 목록(`r.slots[...].shelf`)에 있으면** 그 순위 순서 그대로 두 개(`inSlot: true`, 화면은 그 줄로 초점을 옮겨 고르게 한다). 지금 칸에 없으면(예: 분야를 '직접 쓰기'로 둬서 외부 데이터 칸이 비어 있음) 카탈로그의 그 갈래 진열 도구를 자료 순서로 두 개(`inSlot: false`, 화면은 도구 상세 링크만 보이고 "가져올 정보 답을 바꾸면 고를 수 있어요." 한 줄을 붙인다). 순위 계산을 새로 하지 않는다.
- `matchAnswer`는 `cat`에서 질문의 보기(`isUnknown`·`isCustom` 제외)와 `like`를 읽는다. 결과는 화면에만 쓰고 **세션에 넣는 것은 이용자가 누른 보기 id와 글뿐**이다.
- `findAliases`는 `design.md`의 느낌·색 낱말표, `services.md`의 서비스 갈래 짐작도 같이 쓴다.

### 6.10 원형 실험 [잼]

스크래치 폴더에 위 규칙을 그대로 옮긴 원형(`match.ts` 약 220줄)과 낱말표 초안(열쇠 약 510개)을 만들어 돌렸다. 저장소에는 넣지 않았다.

| 묶음 | 결과 | 비고 |
|---|---|---|
| 1차 문장 71개 (기대값을 낱말표보다 먼저 적음, '짐작하면 안 되는 글' 10개 포함) | 처음 **69/71**, 도구 이름 12개 중 **11/12** | 틀린 셋이 위 규칙 셋을 낳았다: 돈 읽기 순서(6.6), 점수를 개수로(6.3), 한 번에 찾기(6.2) |
| 같은 묶음, 규칙 고친 뒤 (돈 기간 문장 2개 더해 73개) | **73/73**, 도구 **12/12** | 고친 뒤라 시험 점수가 아니라 회귀 확인이다 |
| 2차 문장 27개 (낱말표를 고치지 않고 한 번만) | **24/27**. 못 찾음 2("수행평가 제출 받는 곳", "공부 시간 재는 스톱워치"), 다르게 짐작 1("ChatGPT Plus" → 무료, 5.5절 규칙으로 고침), 짐작하면 안 되는 글에 짐작 **0** | 못 찾음은 안전한 실패다(이용자가 고르거나 그대로 둔다) |
| 크기 | 찾기 코드 2.4KB + 낱말표 3.8KB = **6.2KB(gzip)** | esbuild 압축 + gzip -9 |

구현 때는 1·2차 문장 100개를 `tests/engine/match.test.ts`의 표로 옮기고, **`reader-tester` 에이전트가 낱말표를 보지 않고 쓴 3차 문장 30개**를 더해 처음 점수를 기록한다(목표: 다르게 짐작 3% 이하, 짐작하면 안 되는 글에 짐작 0).

---

## 7. 엔진 의미: 직접 쓴 답이 계산에 들어가는 길

### 7.1 세션

```ts
// src/lib/engine/types.ts
export interface CustomTool {
  /** 'custom-1' ~ 'custom-5'. 진열·색인 도구 id와 겹치지 않는다 (검사가 막는다) */
  id: string;
  /** 이용자가 쓴 이름 (oneLine, 40자). 링크로 받은 영수증에서는 빈 글 → templates.customTool.hiddenName */
  name: string;
  /** 맡는 기능 = 쓴 칸의 기능 */
  capability: Capability;
}

export interface Session {
  answers: Record<string, string>;   // 직접 쓰기를 그대로 두면 'custom'
  cart: string[];                    // 'custom-1' 같은 id도 들어간다
  kept: string[];
  deferred: string[];
  freeText?: string;
  /** 질문 id → 직접 쓴 글 (oneLine, 40자). 보기를 골랐어도 남는다. 영수증 링크에는 넣지 않는다 */
  notes?: Record<string, string>;
  /** 목록에 없는 도구 (최대 5개). 이름은 영수증 링크에 넣지 않는다 */
  customTools?: CustomTool[];
  /** 직접 쓴 글에서 찾은 빈틈 id (aliases.json gaps). 화면이 계산해 넣는다 */
  gaps?: string[];
}
```

- `normalizeSession`: `notes`는 있는 질문 id만, `customTools`는 모양·기능·id 형식(`/^custom-[1-5]$/`)이 맞는 것만(이름 겹침은 하나만), `cart`의 `custom-n`은 `customTools`에 있을 때만, `gaps`는 `aliases.json`이 아니라 **조사 카드에 `research.gap-<id>`가 있는 id만** 남긴다(엔진이 낱말표를 읽지 않게).
- `readSession`(`saved.ts`): `notes` 20개·40자, 열쇠는 `/^q\.[a-z0-9-]+$/`. `customTools` 5개. `gaps` 10개. 저장 코드는 지금처럼 `store.ts` 한 곳.

### 7.2 만들 앱 정하기 (`interview.ts`)

- `runInterview`: 바꾸지 않는다. `custom`은 자료에 있는 보기라 지금처럼 그 `tags`를 더한다.
- `answerChips`: 보기가 `isCustom`이면 `label`을 '내 말'로 바꾼다: `“{앞 20자}…”`. 내 말이 없으면(링크로 받음) `templates.customAnswer.hidden` = "직접 쓴 답". 보기를 골랐고 내 말이 있으면 칩은 보기 이름 그대로(내 말은 설계도 1번 아래 줄에 따로).
- `matchingRecipes`: `isCustom` 답을 `isUnknown`처럼 센다(어긋남도 같은 답도 아님).

### 7.3 설계도 (`pack.ts`, 1번)

엔진이 실제로 만드는 1번(case-24, 9.4·9.5절 문구로 바꾼 뒤의 모양):

```markdown
## 1. 만들 것 (목적지)

- 한 줄 설명: 반려식물 물 주기 알림
- 종류: 직접 쓴 앱
- 쓰는 사람: 나만 쓴다
- 만드는 AI: 무료 AI 채팅
- 고른 답: 만들 것: “반려식물 물 주기 알림” · 쓰는 사람: 나만 · 만드는 AI: 무료 AI 채팅 · 저장: 네 · 가져올 정보: 없어요 · 알림: 네 · 예산: 0원만 · 개인정보: 아니요 · 기기: 휴대폰 · 느낌: 귀엽게
- 내 말 그대로: 보기에 없어서 내가 직접 쓴 답이야. 위 고른 답과 다르면 이 말을 먼저 따르고, 헷갈리면 만들기 전에 나에게 물어 줘.
  - 만들 것: “반려식물 물 주기 알림” → 보기에 없어 그대로 둠 (계산은 ‘직접 쓴 앱’ 기준)
  - 알림: “비 오는 날 아침에만” → 고른 답 네
- 종류가 보기에 없어서 3·4번은 출발점만 적었다. 1단계에서 내 말에 맞게 화면과 기능을 나와 함께 정해 줘.
```

- 지금 엔진으로 같은 답을 돌리면 '고른 답'에 "만들 것: 직접 쓰기"가 찍힌다 [잼] → `answerChips` 고침이 꼭 필요하다는 증거.
- '내 말 그대로' 줄은 내 말이 하나라도 있을 때만. 순서는 질문 순서.
- 마지막 줄(`customTypeRule`)은 `type.custom`일 때만.
- 쓴 글은 `oneLine` + 40자 + 앞뒤를 “ ”로 감싼다. 줄바꿈이 없으니 새 제목(`#`)을 만들 수 없다. 화면의 설계도 미리 보기는 글자로만 그리므로(`Receipt.tsx`, `innerHTML` 없음 [확인]) HTML이 끼어들 길도 없다.

### 7.4 이름

`projectName` = 한 줄 입력 → `notes["q.type"]`(30자) → 종류 이름(`type.custom`이면 "직접 쓴 앱") → "내 앱". 지도 요약(`mapSummary`)도 같은 순서.

### 7.5 직접 쓴 가져올 정보

빈 외부 데이터 칸을 '그대로 가기'로 넘기면 지금은 `templates.emptySlot.research`의 "외부 데이터 기능을 맡을 API나 오픈소스 …"가 나간다. `notes["q.domain"]`이 있으면 `what`만 `templates.emptySlot.researchWithNote` = "‘{{note}}’ 정보를 줄 API나 공개 데이터 가운데 무료로 시작할 수 있는 것은?"으로 바꾼다. id는 그대로 `research.empty:slot.data`(골든 비교는 id만).

### 7.6 빈틈의 알아볼 것

`collectResearch`의 순서 끝에 더한다: 규칙 카드 → 그대로 둔 규칙 막힌 곳 → 그대로 둔 빈 칸 → 원문만 있는 도구 → **직접 쓴 도구(8.4절)** → **빈틈(`session.gaps` 순서, 카드 `research.gap-<id>`)**. 카드 문장은 9.3절.

---

## 8. 목록에 없는 도구 쓰기

### 8.1 화면 (도구 고르기, 기능마다)

- 칸의 도구 목록 아래(접기 '원문만 있는 도구 n개' 위)에 줄 [✎ 목록에 없는 도구 쓰기]. 진열 도구가 없는 칸(예: 직접 쓴 가져올 정보)에서는 알림 상자 "맞는 도구가 없어요" 바로 아래에 둔다.
- 칸: 라벨 "도구 이름", 도움말 "예: OpenWeather, Notion. 공식 이름 그대로 써 주세요. 이름·연락처는 쓰지 마세요.", 40자, `spellcheck="false"`, [확인].
- 결과:

| 결과 | 보이는 것 | 버튼 |
|---|---|---|
| 이미 목록에 있는 도구, 이 칸 | "이미 목록에 있는 도구예요: Supabase" | [이 도구로 고르기](그 줄을 '고를 예정'으로 누르고 초점을 옮김) · [직접 쓴 도구로 두기] |
| 이미 목록에 있는 도구, 다른 칸 | "이미 목록에 있는 도구예요: GitHub Pages" + "이 도구는 배포·공유 기능에 있어요." | [배포·공유 열기] · [직접 쓴 도구로 두기] |
| 같은 갈래의 확인된 도구 | "같은 일을 하는 확인된 도구: Open-Meteo 날씨 API, 기상청 단기예보" | 이 칸에 있으면 [확인된 도구 보기](첫 줄로 초점), 없으면 도구 이름이 도구 상세 링크 + "가져올 정보 답을 바꾸면 고를 수 있어요." · [직접 쓴 도구로 두기] |
| 못 찾음 | "코드쇼퍼가 아직 확인하지 않은 도구예요." + "그대로 쓰면 확인할 일을 ‘알아볼 것’에 적어 둘게요." | [직접 쓴 도구로 두기] |
| 빈틈 (함께) | 6.8절 알림 | — |

- [직접 쓴 도구로 두기] → `customTools`에 더하고, 그 칸 목록 맨 위에 그 도구 줄이 생겨 '고를 예정'으로 눌린다. 정하는 것은 지금처럼 아래 막대 [OpenWeather로 정하기](이 버튼 이름의 조사는 `josa.ts`, 영문 끝소리 어림 [확인]).
- 직접 쓴 도구 줄: 타일(그 기능 그림) + 이름 + 둘째 줄 "직접 쓴 도구 · 확인 필요" + 오른쪽 비용 "모름". '자세히'를 펼치면 "코드쇼퍼가 확인하지 않은, 내가 직접 쓴 도구예요." + [이 도구 지우기].
- 제한: 모두 5개. 넘으면 "직접 쓴 도구는 5개까지 둘 수 있어요." 같은 이름(정규화 뒤)은 "같은 이름을 이미 썼어요."
- 줄은 엔진 결과의 새 칸 `SlotRanking.custom`(이 칸 기능의 직접 쓴 도구, 쓴 순서)에서 그린다. 점수·추천·비교·꼬리표는 없다.

### 8.2 엔진의 '모름' 도구

`cartProducts(cat, ids, customTools)`가 `custom-n`을 만나면 `customProduct(cat, tool)`로 도구 하나를 만든다(새 파일 `src/lib/engine/custom.ts`). 카탈로그(`cat.data.products`)에는 넣지 않는다. 그래서 다른 칸의 후보·점수·추천에 끼지 않는다.

| 칸 | 값 | 규칙 조건에서 (`productField`) |
|---|---|---|
| `id`, `name` | `custom-n`, 쓴 이름(없으면 "직접 쓴 도구") | — |
| `custom` | `true` (Product에 새 칸) | `custom` → `true` (새 ProductField) |
| `layer` | `'index'` | `'index'` (진열 도구가 아니다) |
| `capabilities` | `[tool.capability]` | 그대로 (`capability` 조건은 맞는다) |
| `serverRegion` | `'unknown'` | `'unknown'` → 개인정보 막힌 곳(`conflict.personal-server`)이 켜진다(R-15) |
| `recommendable` | `false` | `false` |
| `provider` | `{ type: 'generic', name: "직접 쓴 도구" }` | **값 없음** |
| `access`, `cost.free`, `keyExposureRisk`, `publicKey`, `realtime` | 화면에 쓰지 않는 자리값 | **값 없음** → `is`·`in` 조건이 맞지 않는다. 유료 막힌 곳·키 노출 막힌 곳·실시간 막힌 곳이 켜지지 않는다. 대신 8.3·8.5절의 서행·안전 지시가 같은 걱정을 알아볼 것으로 넘긴다 |
| `difficulty` | `scoring.unknownDifficulty` (새 값, **2**) | — |
| `setupMinutes` | 없음 → 지금의 `unknownSetupMinutes`(60분) | — |
| `links`, `prep`, `needsConcepts`, `stuck`, `promptFragment` | 없음 | — |

- 왜 '값 없음'인가: "유료 도구를 골랐어요"(`paid-on-free`)나 "API 키가 화면 코드에 드러나요"는 **사실을 단정하는 문장**이다. 모르는 도구에 그 말을 하면 틀린 정보를 주게 된다(R-01·꼭 지킬 것 6). 서버 위치는 자료 규칙이 처음부터 '모름'을 위험 쪽에 넣어 두었으므로 그대로 따른다. 그 막힌 곳 문장은 '모름'을 품게 조금 고친다(9.3절).

### 8.3 도구끼리 맞춰 보기: 서행

- `findConflicts`의 순서 끝(규칙 → 빈 칸 → **직접 쓴 도구**)에, 열린 칸을 채운 직접 쓴 도구마다 하나:
  `{ id: 'conflict.custom-tool:custom-1', kind: 'custom-tool', message, fixHint, anchorSlot, customTool: 'custom-1', keepable: true, kept: true }`.
- 늘 `kept: true`(처음부터 서행)라 출발(`canIssue`)을 막지 않는다. 이용자가 '그대로 가기'를 누를 필요가 없다. 직접 쓰는 순간 "확인 못 한 길로 가겠다"고 고른 것이기 때문이다.
- 지도: 그 마디는 서행(노랑 + 물음표 표지). 지금의 `traffic` 계산(`anchored.some(!kept) ? jam : slow`)과 `markerKind`(kept → `question`)를 그대로 쓴다. `markerKind`의 `kind` 타입에 `'custom-tool'`만 더한다.
- 화면(`Check.tsx`): '그대로 가는 곳' 묶음에 서행 알약 + 기능 이름 + 둘째 줄 "직접 쓴 도구라 코드쇼퍼가 확인하지 못했어요: OpenWeather". 버튼은 [다시 고르기] 대신 [도구 바꾸기](그 칸을 연 도구 고르기, `waypointPath(slot)`). '원활 n개'에는 넣지 않는다.
- 칸 밖 도구: 칸이 사라진 직접 쓴 도구는 지금처럼 '어디에도 쓰이지 않는 도구'(`orphans`)로 보인다.

### 8.4 알아볼 것

직접 쓴 도구마다 `research.custom:custom-1`(엔진이 `templates.customTool.research`를 채움). 원문만 있는 도구의 `research.index:*`는 직접 쓴 도구에는 만들지 않는다(겹침 방지).

### 8.5 안전 지시

`rules.json`에 새 규칙 하나: `safety.custom-tool` (9.3절). 키를 화면에 넣지 않고 개인정보를 보내지 않는 것을 공식 문서 확인 전까지 막는다.

### 8.6 영수증과 설계도

- 영수증 품목: 비용 칸 4칸에 "모름"(`receipt.unknown`, 표시 폭 4 = '유료'와 같아 줄이 어긋나지 않는다). 합계: 유료 도구가 있으면 지금처럼 "유료 포함", 없고 직접 쓴 도구가 있으면 **"0원 + 확인 필요"**(15칸, 36칸 줄에 들어감), 모두 0원이면 "0원으로 시작". 요금(코드쇼퍼 이용료)은 늘 0원이다.
- 설계도 7번 표: 도구 이름 칸 "OpenWeather (직접 씀)"(링크 없음), 제공·필요한 자격·비용·라이선스·확인한 때 칸은 "확인 필요". 메모: "코드쇼퍼가 확인하지 않은, 내가 직접 쓴 도구다. 9번에서 공식 문서로 먼저 확인한다."
- `pack.ts`·`Check.tsx`의 도구 이름 찾기(`cat.product.get(id)`)는 직접 쓴 도구를 모른다 [확인] → 엔진에 `productOf(r, id)`(결과의 `cart`에서 찾음)를 더해 둘 다 그것을 쓴다.
- 대화 카드(AI에게 할 말)는 바꾸지 않는다.

### 8.7 영수증 링크

```ts
export interface ShareState {
  v: 1;
  a: Record<string, string>;   // 'custom' 그대로
  c: string[];                 // 'custom-1' 그대로
  k: string[];
  d: string[];
  /** 직접 쓴 도구 id → 맡은 기능. 이름은 넣지 않는다 */
  x?: Record<string, Capability>;
  /** 빈틈 id */
  g?: string[];
}
```

- `v`는 1 그대로: 옛 화면은 모르는 칸 `x`·`g`를 버리고, `custom` 답과 `custom-n`은 `normalizeSession`이 버린다(지금 규칙). 새 화면은 옛 링크를 그대로 연다.
- `fromShareState`: `x`의 id 형식·기능 이름을 검사하고 `customTools`를 이름 없이 만든다.

### 8.8 준비 안내와 같은 모양

`services.md` 10.6절의 '다른 서비스(직접 입력)'는 같은 `CustomTool` 모양을 쓴다(준비 안내에는 칸이 없으므로 기능을 이용자가 고른다). 다섯 질문 알아볼 것은 8.4절 카드와 같은 문장을 쓴다.

### 8.9 그대로 갈 때 "이미 아는 것" (P2, 선택)

막힌 곳을 '그대로 가기'로 둘 때 한 줄(40자)을 남길 수 있다(예: "학교에서 허락받았어요"). 그 막힌 곳의 알아볼 것 아래 "- 내가 이미 아는 것: “…”". `session.keptNotes: Record<conflictId, string>`. 행동 버튼에 직접 쓰기를 붙이는 것이 아니라 결과에 메모를 다는 것이라 3절의 '빼는 곳'과 어긋나지 않는다. 우선순위가 낮아 첫 묶음에서 뺀다.

---

## 9. 자료·스키마 변경

### 9.1 `data/questions.json` (17개 질문 모두)

보기 끝(‘모르겠어요’ 바로 앞)에 하나:

```json
{
  "id": "custom",
  "label": "직접 쓰기",
  "isCustom": true,
  "like": "unknown",
  "tags": { "need.save": 1 },
  "field": "생각을 짧게 써 주세요",
  "hint": "예: 사진만 남겨 두고 싶어요."
}
```

(위는 모양 예시다. `q.save`의 '모르겠어요' `tags`는 `{}`이므로 실제 값은 `"tags": {}`.) `q.type`은 `like` 없이 `"tags": { "type.custom": 1 }`과 `"keep": "보기에 없는 앱으로 두고, 필요한 기능은 다음 질문에서 물어볼게요."`, `q.domain`은 `"tags": { "need.data": 1 }`과 `"keep": "밖에서 가져올 정보가 있다고 보고, 맞는 도구는 도구 고르기에서 같이 찾아요."`

`schemas/questions.schema.json` 보기 칸에 더함:

| 칸 | 모양 | 검사 (`scripts/lib/validate.ts`) |
|---|---|---|
| `isCustom` | boolean | 질문마다 정확히 하나, id는 `custom`, '모르겠어요' 바로 앞(없으면 맨 끝) |
| `like` | 보기 id | 같은 질문의 보기이고 `isCustom`이 아님. 있으면 `tags`가 그 보기의 `tags`와 똑같아야 함 |
| `field` | 글 (40자 안) | `isCustom`에만, 필수 |
| `hint` | 글 | `isCustom`에만, 필수 |
| `keep` | 글 | `isCustom`이고 `like`가 없을 때 필수 |

- 그림 질문의 "모든 보기에 `alt`" 규칙에서 `isCustom` 보기는 뺀다(그림 타일이 아니라 연필 아이콘 줄).
- `tags`의 태그는 `taxonomy.json`에 있어야 함(지금 검사 그대로).
- `npm run words`는 `field`·`hint`·`keep`도 검사한다(화면 문구).

### 9.2 새 파일 `data/aliases.json` + `schemas/aliases.schema.json`

질문·상품 파일에 넣지 않고 따로 두는 이유: 이 두 파일은 모든 단계 화면의 첫 JS에 실린다(`catalog`). 낱말표는 직접 쓰기를 열 때만 받는다(0줄 8번).

```json
{
  "version": 1,
  "options": {
    "q.type": {
      "record": ["기록", "일기", "다이어리", "가계부", "메모", "습관", "체크리스트", "할일", "할 일", "투두", "todo", "독서", "일지", "노트", "출석부"],
      "form": ["신청", "설문", "투표", "접수", "예약", "응답", "지원서", "참가", "모집", "의견", "피드백", "문의", "동의서", "제출"],
      "page": ["안내", "소개", "홈페이지", "블로그", "포트폴리오", "공지", "랜딩", "홍보", "메뉴판", "웹사이트", "사이트"],
      "quiz": ["퀴즈", "문제", "시험", "테스트", "맞히기", "맞추기", "문답", "복습", "ox", "오엑스", "플래시카드", "암기", "단어 외우"],
      "tool": ["계산", "변환", "환산", "생성기", "타이머", "스톱워치", "뽑기", "랜덤", "추첨", "자리 바꾸", "자리배치", "정산", "더치페이", "n빵", "도우미"],
      "board": ["현황", "대시보드", "알림", "알리미", "모니터링", "그래프", "차트", "통계", "시세", "순위", "집계", "상황판"]
    },
    "q.domain": { "weather": ["날씨", "기온", "미세먼지", "황사", "대기", "기상", "=비", "=눈", "강수"] }
  },
  "yesNo": {
    "topics": { "q.save": ["저장", "남겨", "남기", "기록", "보관", "쌓아", "불러오"], "q.login": ["로그인", "회원", "계정", "가입", "비밀번호", "아이디"] },
    "no": ["=아니", "아니요", "아뇨", "=no", "필요 없", "필요없", "안 해도", "안 받", "안 써", "하지 않", "없어도", "없이", "빼고", "말고"],
    "unknown": ["모르", "모름", "잘 모"],
    "maybe": ["아마", "나중에", "글쎄", "혹시", "언젠가", "일단", "될 수도", "할 수도", "것 같"],
    "yes": ["=네", "=예", "=응", "=yes", "필요", "있어", "해야", "=꼭", "원해", "하고 싶", "좋겠"],
    "negAfter": ["없", "안 ", "안해", "말고", "빼고", "싫", "아니", "않"],
    "negWindow": 6
  },
  "aiNames": { "agent": ["claude code", "클로드 코드", "codex", "코덱스", "cursor", "커서", "copilot", "코파일럿", "gemini cli", "에이전트", "터미널"], "chat": ["chatgpt", "챗gpt", "챗지피티", "gpt", "gemini", "제미나이", "claude", "클로드", "뤼튼", "wrtn"], "paid": ["유료", "구독", "plus", "플러스", "=pro", "프로"], "free": ["무료", "공짜"] },
  "products": {
    "supabase": ["수파베이스", "슈파베이스"],
    "github-pages": ["깃허브 페이지", "깃헙 페이지", "github io"],
    "google-sheets-apps-script": ["구글 시트", "google sheets", "스프레드시트", "앱스 스크립트", "apps script"]
  },
  "toolHints": [
    { "id": "weather", "aliases": ["openweather", "오픈웨더", "weatherapi", "accuweather", "아큐웨더"], "capability": "data", "domain": "domain.weather" },
    { "id": "store", "aliases": ["mongodb", "몽고db", "mysql", "postgres", "notion", "노션", "엑셀"], "capability": "store" },
    { "id": "notify", "aliases": ["알림톡", "카카오톡", "카톡", "=sms", "문자", "이메일", "푸시"], "capability": "notify" }
  ],
  "gaps": [
    { "id": "ai-feature", "aliases": ["챗봇", "=ai", "인공지능", "gpt", "openai", "=llm", "요약해", "자동 답변", "생성형"], "where": ["q.type", "q.domain", "line", "tool"], "message": "AI 기능은 아직 코드쇼퍼가 도구를 골라 드리지 못해요. 설계도의 ‘알아볼 것’에 넣어 둘게요." }
  ]
}
```

(위는 일부다. 원형의 전체 초안은 열쇠 약 510개, 6.10절.)

검사(`npm run validate`에 더함):

1. `options`의 질문·보기 id가 있고, `isUnknown`·`isCustom` 보기가 아니다. 예·아니요 질문(`yesNo.topics`의 질문)은 `options`에 두지 않는다.
2. 열쇠는 정규화 뒤 2자 이상. 1자는 `=`가 붙어야 한다.
3. **한 칸에서 함께 찾는 열쇠끼리 겹치면 오류**: 한 질문의 보기들끼리, 그리고 도구 칸의 `products` + `toolHints` + `gaps`끼리. (다른 질문 사이는 겹쳐도 된다: '알림'은 `q.type` 현황판과 `q.notify` 주제어에 다 있다.)
4. `products`의 id가 `products.json`에 있다. `toolHints`의 기능은 `Capability`, `domain`은 `taxonomy.json`의 태그. `gaps[].id`마다 `research-cards.json`에 `research.gap-<id>`가 있다.
5. `products.json`의 어떤 id도 `custom-`으로 시작하지 않는다.
6. `npm run words`: `aliases.json`은 `message`만 검사한다. 열쇠는 이용자의 말이라 '체크리스트'·'뽑기'처럼 우리 글에서는 쓰지 않는 말도 들어간다. `scripts/guard/check-words.ts`의 건너뛸 칸에 `options`·`yesNo`·`aiNames`·`products`·`aliases`를 더한다.

### 9.3 `data/rules.json`, `data/research-cards.json`

```json
{
  "id": "safety.custom-tool",
  "type": "safety",
  "when": { "cartAny": { "field": "custom", "is": true } },
  "line": "직접 쓴 도구는 9번에서 공식 문서로 확인하기 전까지 API 키를 화면 코드에 넣지 않고, 개인정보를 보내지 않는다."
}
```

- 자리: 안전 규칙 끝(`safety.location-minimum` 다음).
- `conflict.personal-server`의 `message`: "개인정보를 받는데, 저장에 쓸 도구의 서버가 해외에 있거나, 위치를 모르거나, 지역을 직접 골라야 해요." (뜻을 넓힐 뿐, 조건·id는 그대로라 골든 영향 없음.)

조사 카드 넷(빈틈). 사실을 단정하지 않고 묻는 말만 쓴다:

| id | area | what | why | where | doneWhen |
|---|---|---|---|---|---|
| `research.gap-ai-feature` | AI 기능 붙이기 | 앱 안에서 부를 AI API는 무엇이고, 요금이 붙는지, 키를 어디에 숨기는지? | 코드쇼퍼 도구 모음에 아직 AI 기능 도구가 없다. AI API 키가 드러나면 남이 내 계정으로 쓸 수 있다. | 쓰려는 AI 회사의 공식 API 문서 / 그 회사의 공식 요금 페이지 | API 이름, 무료로 쓸 수 있는 범위나 요금, 키를 둘 중간 서버를 정했다 |
| `research.gap-native-app` | 스토어에 올리는 앱 | 앱스토어·플레이스토어에 올리려면 무엇이 더 필요한가(개발자 등록, 심사, 비용)? | 코드쇼퍼 설계도는 브라우저에서 여는 웹앱 기준이다. | Apple Developer 공식 문서 / Google Play Console 공식 도움말 | 웹앱으로 먼저 만들지, 스토어 앱으로 갈지 정했다 |
| `research.gap-chat` | 여러 사람이 바로바로 대화하기 | 메시지를 바로 주고받으려면 고른 저장 도구에 어떤 기능이 필요하고, 무료 범위는 어디까지인가? | 코드쇼퍼는 대화 기능을 맡는 도구를 따로 확인하지 않았다. | 고른 저장 도구의 공식 문서에서 '실시간(Realtime)' 항목 | 대화에 쓸 기능과 무료 범위를 확인했다 |
| `research.gap-file-upload` | 사진·파일 올리기 | 올린 파일을 어디에 두고, 무료 용량과 누가 볼 수 있는지는? | 코드쇼퍼는 파일 저장을 맡는 도구를 따로 확인하지 않았다. | 고른 저장 도구의 공식 문서에서 '파일 저장(Storage)' 항목 | 파일 둘 곳, 무료 용량, 볼 수 있는 사람을 정했다 |

### 9.4 `data/templates.json`

```json
"types": {
  "type.custom": {
    "label": "직접 쓴 앱",
    "goal": "내가 1번에 적은 일을 하는 앱",
    "screens": [
      { "name": "첫 화면", "parts": ["제목과 한 줄 소개", "이 앱에서 가장 중요한 기능 하나", "처음 쓰는 사람을 위한 한 줄 안내"] },
      { "name": "결과 보기", "parts": ["가장 중요한 기능을 쓴 결과", "처음으로 돌아가는 버튼"] }
    ],
    "features": [
      { "name": "가장 중요한 기능 하나", "doneWhen": "1번 ‘내 말 그대로’에 적은 일을 첫 화면에서 한 번 해 볼 수 있다" },
      { "name": "오류 안내", "doneWhen": "잘못 쓰거나 실패하면 빈 화면 대신 안내 문구가 보인다" }
    ]
  }
},
"customAnswer": { "hidden": "직접 쓴 답" },
"customTool": {
  "provider": "직접 쓴 도구",
  "hiddenName": "직접 쓴 도구",
  "summary": "코드쇼퍼가 확인하지 않은, 내가 직접 쓴 도구",
  "cost": "확인 필요",
  "memo": "코드쇼퍼가 확인하지 않은, 내가 직접 쓴 도구다. 9번에서 공식 문서로 먼저 확인한다.",
  "message": "직접 쓴 도구라 코드쇼퍼가 확인하지 못했어요: {{name}}",
  "fixHint": "‘알아볼 것’에 확인할 일을 적어 둘게요. 목록의 도구로 바꿔도 돼요.",
  "research": {
    "area": "직접 쓴 도구 확인하기: {{name}}",
    "what": "공식 문서 주소, 가입하고 키 받는 곳, 무료로 쓸 수 있는 범위와 넘으면 생기는 일, 카드 등록이 필요한지, 키를 화면 코드에 넣어도 되는지, 데이터를 어느 나라에 저장하는지",
    "why": "코드쇼퍼 도구 모음에 없어서 아무것도 확인하지 않았다.",
    "where": ["만든 곳의 공식 개발자 문서 (주소는 내 AI에게 찾게 하고, 공식 주소인지 내가 확인한다): {{name}}"],
    "doneWhen": "공식 문서 주소와 위 여섯 가지를 한 줄씩 적었다. 모르는 것은 쓰기 전에 나에게 묻는다"
  }
},
"emptySlot": { "researchWithNote": { "what": "‘{{note}}’ 정보를 줄 API나 공개 데이터 가운데 무료로 시작할 수 있는 것은?" } },
"receipt": { "unknown": "모름", "totalUnchecked": "0원 + 확인 필요" },
"pack": {
  "myWordsRule": "보기에 없어서 내가 직접 쓴 답이야. 위 고른 답과 다르면 이 말을 먼저 따르고, 헷갈리면 만들기 전에 나에게 물어 줘.",
  "myWordPicked": "{{chip}}: “{{text}}” → 고른 답 {{label}}",
  "myWordKept": "{{chip}}: “{{text}}” → 보기에 없어 그대로 둠 (계산은 ‘{{as}}’ 기준)",
  "customTypeRule": "종류가 보기에 없어서 3·4번은 출발점만 적었다. 1단계에서 내 말에 맞게 화면과 기능을 나와 함께 정해 줘.",
  "labels": { "myWords": "내 말 그대로", "customMark": "(직접 씀)", "unchecked": "확인 필요" }
}
```

- `{{as}}`: `like`가 있으면 그 보기 이름('모르겠어요'), 없으면 `custom` 보기 `tags`의 태그 이름(`type.custom` → "직접 쓴 앱", `need.data` → "외부 데이터").
- 자리 표시 뒤에 조사를 바로 붙이지 않았다(`{{name}}`은 문장 끝, `{{note}}`·`{{text}}`는 따옴표 안).
- `schemas/templates.schema.json`과 `types.ts`의 `Templates`를 같이 고친다. 자리 표시 검사(`checkPlaceholders`)에 `name`·`note`·`chip`·`text`·`label`·`as`를 이 칸들에만 허용.

### 9.5 `data/scoring.json`

`"unknownDifficulty": 2` (직접 쓴 도구의 난이도. '보통'). `unknownSetupMinutes`(60)와 짝. 진열 도구 점수에는 쓰이지 않으므로 골든 영향 없음.

### 9.6 `src/copy/ko.ts` (화면 고정 문구)

```ts
custom: {
  row: '직접 쓰기',
  rowNote: '내 말: “{{text}}”',
  chosen: '고른 답',              // 숨은 글
  or: '또는',
  privacy: '이름·연락처는 쓰지 마세요.',
  count: '{{n}}/{{max}}자',
  submit: '확인',
  empty: '한 글자 이상 써 주세요.',
  tooLong: '{{max}}자까지 쓸 수 있어요. {{over}}자를 줄여 주세요.',
  contact: '연락처처럼 보이는 글이 있어요. 설계도에 그대로 들어가니 지워 주세요.',
  found: '찾은 말 ‘{{word}}’ → {{label}}',
  foundMany: '가까운 보기가 {{n}}개 있어요.',
  ask: '이 보기로 할까요? 내 말은 설계도에 그대로 넣을게요.',
  pick: '{{labelDir}} 고르기',          // josa(label, 'dir'): 기록장으로 · 퀴즈로
  notFound: '보기와 맞는 말을 찾지 못했어요.',
  closest: '가장 가까운 걸 고르거나, 내 말 그대로 둘 수 있어요.',
  keepLike: '{{likeAnd}} 같게 계산하고, 내 말은 설계도에 그대로 넣을게요.',  // josa('‘모르겠어요’', 'and')
  keep: '내 말 그대로 두기',
  retry: '다시 쓰기',
  readAs: '영문 자판으로 친 것 같아 ‘{{hangul}}’로 읽었어요.',
  picked: '골랐어요: {{label}}. 내 말도 설계도에 넣었어요.',
  kept: '내 말 그대로 뒀어요.',
},
shop: {
  // …지금 것에 더함
  customRow: '목록에 없는 도구 쓰기',
  customField: '도구 이름',
  customHint: '예: OpenWeather, Notion. 공식 이름 그대로 써 주세요.',
  customSame: '이미 목록에 있는 도구예요: {{name}}',
  customSamePick: '이 도구로 고르기',
  customSameElsewhere: '이 도구는 {{slot}} 기능에 있어요.',
  customOpenSlot: '{{slot}} 열기',
  customNear: '같은 일을 하는 확인된 도구: {{names}}',
  customNearShow: '확인된 도구 보기',
  customNearElsewhere: '가져올 정보 답을 바꾸면 고를 수 있어요.',
  customNone: '코드쇼퍼가 아직 확인하지 않은 도구예요.',
  customKeepNote: '그대로 쓰면 확인할 일을 ‘알아볼 것’에 적어 둘게요.',
  customKeep: '직접 쓴 도구로 두기',
  customLine: '직접 쓴 도구 · 확인 필요',
  customCost: '모름',
  customDetail: '코드쇼퍼가 확인하지 않은, 내가 직접 쓴 도구예요.',
  customRemove: '이 도구 지우기',
  customLimit: '직접 쓴 도구는 5개까지 둘 수 있어요.',
  customDuplicate: '같은 이름을 이미 썼어요.',
},
shelf: {
  // 도구 모음 검색 0건
  noneCustom: '목록에 없으면 도구 고르기에서 직접 쓸 수 있어요.',
},
interview: {
  // 고침
  lineHint: '예: 우리 반 이번 주 급식을 보여 주는 페이지. 이름, 학교 이름, 연락처는 적지 마세요. 이 글은 영수증 링크에 들어가지 않아요.',
  lineTooLong: '{{max}}자까지 쓸 수 있어요. {{over}}자를 줄여 주세요.',
  // linePlaceholder는 지운다
},
```

- 모든 문장은 해요체, 한 문장 40자 안, 느낌표 없음, 쓰지 않는 말(커스텀·입력값·클릭·체크) 없음. '직접 쓰기'는 버튼·줄 이름이라 짧은 동사형.
- 이 문서와 `design.md`·`aitools.md`·`services.md`의 같은 자리 이름을 맞춘다: '직접 입력'·'직접 쓸게요' → **'직접 쓰기'**, '다른 AI(직접 입력)' → '직접 쓰기'(AI 고르기 칩의 마지막), '다른 서비스(직접 입력)' → '목록에 없는 서비스 쓰기'.
- 아이콘: `src/lib/icons.ts`에 Phosphor `PencilSimple`(Regular, MIT)을 `pencil`로 더한다(빌드 때 인라인 SVG, 지금 방식).

---

## 10. 화면 문구가 실제로 보이는 모양 (예)

`q.type`에서 "가계부 앱" → [확인]:

```text
찾은 말 ‘가계부’ → 기록장
이 보기로 할까요? 내 말은 설계도에 그대로 넣을게요.
[ 기록장으로 고르기 ]   [ 내 말 그대로 두기 ]
```

`q.domain`에서 "포켓몬 도감 정보" → [확인]:

```text
보기와 맞는 말을 찾지 못했어요.
가장 가까운 걸 고르거나, 내 말 그대로 둘 수 있어요.
밖에서 가져올 정보가 있다고 보고, 맞는 도구는 도구 고르기에서 같이 찾아요.
  ▢ 없어요  ▢ 학교 정보  … (보기 12개라 다시 보이지 않음: 6개 넘음)
[ 내 말 그대로 두기 ]   [ 다시 쓰기 ]
```

`q.login`에서 "로그인 없이 쓰고 싶어요" → [확인]:

```text
찾은 말 ‘로그인’·‘없이’ → 아니요
이 보기로 할까요? 내 말은 설계도에 그대로 넣을게요.
[ 아니요로 고르기 ]   [ 내 말 그대로 두기 ]
```

도구 고르기 외부 데이터 칸에서 "업비트 API" → [확인]:

```text
같은 일을 하는 확인된 도구: 금융위원회 주식시세정보, 한국투자증권 Open API
[ 확인된 도구 보기 ]   [ 직접 쓴 도구로 두기 ]
```

(이 예는 이용자가 금융을 골랐을 때다. 금융이 아니면 그 칸의 진열 도구 중 같은 분야가 없어 '못 찾음'이 된다.)

---

## 11. 골든과 시험

### 11.1 기존 골든 23개: 기대값 변화 없음

| 바뀌는 것 | 기존 사례에 닿는가 |
|---|---|
| 질문마다 `custom` 보기를 더함 | 아니요: 기존 답은 다른 보기를 가리키고, `runInterview`는 고른 보기의 `tags`만 더한다 |
| `q.notify`의 `showIf`에 `type.custom` | 아니요: 기존 사례에 `type.custom`이 없다. 현황판 사례는 지금처럼 묻는다 |
| `productField`가 `custom` 도구에 값을 주지 않음, 새 ProductField `custom` | 아니요: 기존 장바구니에 직접 쓴 도구가 없다 |
| 새 막힌 곳 종류 `custom-tool`, 새 알아볼 것 `research.custom:*`·`research.gap-*` | 아니요: 직접 쓴 도구·빈틈이 없다 |
| 새 안전 규칙 `safety.custom-tool` | 아니요: 조건이 직접 쓴 도구일 때만 |
| `conflict.personal-server`의 문장 | 아니요: 골든은 id만 비교한다 |
| `scoring.unknownDifficulty` | 아니요: 직접 쓴 도구에만 |
| `answerChips`의 이름 바꾸기, `matchingRecipes`의 `isCustom` | 골든 비교 칸이 아니다(`output.test.ts`가 본다) |

그래서 **골든 커밋 규칙(`골든: case-NN 이유`)이 걸리는 고침은 없다.** `npm run examples`는 미리 짠 코스 5개로 만들므로 결과가 같아야 한다(다르면 버그).

### 11.2 골든 모양 넓히기

`schemas/golden.schema.json`·`scripts/lib/golden.ts`의 `Golden`에 선택 칸 셋: `notes`(질문 id → 글), `customTools`(7.1절 모양), `gaps`(id 목록). `goldenSession()`이 넘긴다. `expect`는 그대로(막힌 곳·알아볼 것·안전 지시 id로 충분하다).

### 11.3 새 골든 7개

값 중 표에 [잼]으로 적은 것은 이 문서를 쓰며 **제안한 자료를 메모리에만 얹어 지금 엔진으로 돌린 값**이다(직접 쓴 도구는 '값 없음'과 같은 효과가 나는 가짜 도구로 흉내 냄). 구현한 뒤 `npm run golden:print`로 다시 보고, 다르면 이유를 한 줄로 쓸 수 있을 때만 기대값을 정한다(`.claude/rules/data.md`).

| 사례 | 답 (줄임) | 장바구니 | 기대 (핵심) | 근거 |
|---|---|---|---|---|
| **case-24** 직접 쓴 앱 종류 | type `custom`(내 말 "반려식물 물 주기 알림"), 나만, 무료 채팅, 저장 네, 가져올 정보 없음, 알림 네(내 말 "비 오는 날 아침에만"), 0원만, 개인정보 아니요, 휴대폰, 귀엽게 | HTML 한 장, 브라우저 저장, 텔레그램 봇 | asked에 `q.notify`가 있다(10개: type·audience·ai·save·domain·notify·budget·personal·device·style). tags `type.custom: 1`. 칸 화면·저장·알림·배포(선택). 막힌 곳 0, `canIssue` true, 알아볼 것 `research.schedule-run`, 안전 `safety.local-key`, 단계 screen·store·notify, 난이도 4, 85분 | [잼] |
| **case-25** 직접 쓴 가져올 정보, 빈 칸 그대로 | type page, 아무나, domain `custom`(내 말 "포켓몬 도감 정보"), 하루 한 번, 0원만 … | HTML 한 장, GitHub Pages; kept `conflict.empty-slot:slot.data` | tags에 `need.data`만(분야 없음). `slot.data` 추천 없음·진열 0. 막힌 곳 `conflict.empty-slot:slot.data`(kept), `canIssue` true, 알아볼 것 `research.empty:slot.data`(문장은 7.5절), 단계 screen·data·host, 난이도 3, 80분 | [잼] |
| **case-26** 예·아니요를 직접 쓰고 그대로 둠 | type quiz, 몇 명이 같이, save `custom`, payment `custom` … | HTML 한 장, GitHub Pages | save가 '모르겠어요'로 계산돼 `need.save` 없음 → `q.login`·`q.personal`을 묻지 않음(asked 9개). 막힌 곳 0, 알아볼 것 `research.copyright`, 단계 screen·host, 난이도 3, 80분. (같은 답을 '아마 그럴 거예요'로 계산하면 고를 것 4개·알아볼 것 3개로 커짐 [잼] → 5.1절 결정 근거) | [잼] |
| **case-27** 쓰는 사람 직접 쓰기 | type record, audience `custom`(내 말 "우리 가족 넷"), 에이전트, 로그인 아니요 … | React + Vite, 브라우저 저장, Cloudflare Workers | tags `audience.few`. `slot.host` 필수(나만이면 선택이었음). 막힌 곳 0, 단계 screen·store·host, 난이도 5, 125분 | [잼] |
| **case-28** 직접 쓴 데이터 도구 | case-25와 같은 답 | HTML 한 장, `custom-1`(PokeAPI, data), GitHub Pages | `slot.data` filledBy `custom-1`. 막힌 곳 `conflict.custom-tool:custom-1`(처음부터 kept), `canIssue` true, 알아볼 것 `research.custom:custom-1`, 안전 `safety.custom-tool`, 난이도 5(1 + 2 + 2), 140분(기본 30 + 모름 60 + …) | 칸·난이도·시간 [잼], 막힌 곳·알아볼 것·안전 id는 8절 규칙으로 손 계산 |
| **case-29** 직접 쓴 저장 도구 + 개인정보 | type form, 몇 명이 같이, 개인정보 '학생이 아닌 사람' … | HTML 한 장, `custom-2`(Notion, store), GitHub Pages; kept `conflict.personal-server` | 막힌 곳 순서: `conflict.personal-server`(kept, 서버 '모름'이라 켜짐) → `conflict.custom-tool:custom-2`(kept). 알아볼 것: `research.privacy-personal` → `research.privacy-overseas` → `research.custom:custom-2`. 안전: `safety.form-responses`, `safety.personal-minimum`, `safety.custom-tool` | 개인정보 막힌 곳·알아볼 것 앞 둘 [잼], 나머지 손 계산 |
| **case-30** 빈틈 | type `custom`(내 말 "AI 챗봇 상담"), 나만 …; `gaps: ["ai-feature"]` | HTML 한 장 | 알아볼 것 끝에 `research.gap-ai-feature`. 다른 기대값은 같은 답에 빈틈이 없을 때와 같다 | 7.6절 규칙으로 손 계산 |

- 새 규칙 `safety.custom-tool`은 case-28·29가 켠다(`npm run golden` 끝의 "한 번도 안 켜진 규칙"에 남지 않는다).
- 첫 커밋 메시지 예: `I2 엔진: 직접 쓴 답과 도구 (골든 case-24~30 추가)`.

### 11.4 단위 시험 (`tests/`)

| 파일 | 본다 |
|---|---|
| `tests/engine/match.test.ts` (새) | 6절 규칙 하나하나: 정규화(전각·폭 없는 글자), `=` 열쇠("네이버"에 '네' 없음), 긴 말 먼저("업비트" > "비트", "블로그"·"로그인" > "로그"), 개수 점수("Gemini 프로 구독" → 유료), 부정("로그인 없이"), 예·아니요 순서, 돈("1년에 10,000원" → 몇천 원, "하루 500원" → 필요하면 더, "0원" → 0원만), 주기, 영문 자판("gkf dlf ahrfhr" → 할 일 목록), 빈틈 `where`, 연락처 경고. 6.10절 문장 100개 + 3차 30개 표 |
| `tests/engine/custom.test.ts` (새) | `customProduct` 칸 값, `productField`가 값 없음을 돌려주는 칸, `findConflicts`의 `custom-tool`(kept, 순서, anchorSlot), 칸이 사라진 직접 쓴 도구 → `orphans`, `collectResearch` 순서, 영수증 '모름'·합계 셋, 설계도 7번 줄, `normalizeSession`(모르는 id·6번째 도구·형식 틀린 id 버림) |
| `tests/engine/interview.test.ts` | `answerChips`의 내 말 이름(20자 …, 링크로 받으면 "직접 쓴 답"), `matchingRecipes`가 `custom`을 세지 않음, `q.notify`가 `type.custom`에서 보임 |
| `tests/engine/output.test.ts` | 설계도 1번의 '내 말 그대로' 줄(보기 고름·그대로 둠), `customTypeRule`, 한 줄이 비면 `notes["q.type"]`이 한 줄 설명·제목 |
| `tests/lib/saved.test.ts`, `share.test.ts` | `readSession`의 새 칸 한도, 링크에 `notes`·도구 이름이 **없음**, `x`·`g` 왕복, 옛 링크(`x` 없음) 그대로 열림 |
| `tests/data.test.ts` | 9.1·9.2절 검사(질문마다 `custom` 하나, `like`의 tags 같음, 열쇠 겹침, `custom-` 접두어 금지) |

엔진 시험 범위 90% 이상 유지(`npm run test:coverage`).

### 11.5 e2e (`tests/e2e/custom-input.spec.ts`, 새)

1. 키보드만: 첫 질문 → Tab으로 [직접 쓰기] → Enter → 칸에 초점 → "가계부 앱" → Enter → 초점이 "찾은 말 ‘가계부’ → 기록장"으로 → Tab → [기록장으로 고르기] → 둘째 질문 제목에 초점.
2. 그대로 두기: `q.domain`에 "포켓몬 도감 정보" → [내 말 그대로 두기] → 도구 고르기 외부 데이터 칸에 "맞는 도구가 없어요" + [목록에 없는 도구 쓰기] → "PokeAPI" → [직접 쓴 도구로 두기] → [PokeAPI로 정하기] → 도구끼리 맞춰 보기에 서행 1개, 막힌 곳 0 → 설계도에 "PokeAPI (직접 씀)"·"내 말 그대로".
3. 영수증 링크: `#r=`를 풀어 "가계부"·"포켓몬"·"PokeAPI"가 없는지, 새 탭에서 링크를 열면 "직접 쓴 도구"가 보이는지.
4. "수파베이스" → "이미 목록에 있는 도구예요: Supabase" → [이 도구로 고르기].
5. 41자 붙여 넣기 → 잘리지 않음, [확인] 때 "1자를 줄여 주세요".
6. axe(심각·치명 0): 칸 펼침·찾은 결과·오류 상태 각각. 360px 가로 넘침 0, 글자 200%.
7. 동작 줄이기: 펼침 전환 0ms.

한글 조합(Enter 두 번 들어감)은 Playwright가 IME 조합을 그대로 흉내 내지 못한다. `compositionstart`·`keydown(keyCode 229)`를 직접 보내는 시험으로 거르는 코드만 보고, 실제 확인은 사람 확인표(15절)에 둔다.

---

## 12. 다른 v3 문서와 맞추기

| 문서 | 그 문서의 안 | 이 문서와 맞춘 것 |
|---|---|---|
| `design.md` 5.3·5.6·9.2절 | 느낌·색·글꼴 직접 쓰기, `looks.json` `keywords`, `LookChoice.moodText` | 느낌 직접 쓰기 = `q.style`의 `custom` 보기. 글은 `notes["q.style"]` 한 곳(`moodText` 칸을 따로 두지 않음). 색 이름·글꼴 이름 같은 시트 안 칸은 `look`에 그대로. 찾기 함수는 `findAliases` 하나. 부품은 `CustomAnswer` |
| `aitools.md` 9.1·9.2절 | AI 고르기 두 칸 + '직접 입력' 40자, OS 직접 입력 | 도구 이름 직접 쓰기 = `q.aiTool`의 `custom` 보기, `notes["q.aiTool"]` = `customToolName`. 이름 '직접 쓰기'. OS가 질문이면 같은 규칙, 설정 값(`cc:prefs:v1.os`)이면 `prefs.osText`(그 문서가 정함) |
| `services.md` 10.6절 | '다른 서비스(직접 입력)', `guides.json` `aliases` | 모양은 `CustomTool`. 갈래 짐작 낱말은 `aliases.json`의 `toolHints` 한 곳(`guides.json`에 두 벌 두지 않음). 다섯 질문은 `templates.customTool.research`와 같은 문장 |
| `launch.md` 3.13절 L-07 | 질문별 직접 쓰기 표, `data/free-words.json` | 다른 점과 이유: ① 예·아니요 질문에도 둔다(소유자 요청 "반드시". 2×2 밖 전체 폭 줄로 GOV.UK 금지 사항을 피함) ② 도구 이름 40자(30자 아님, 다른 직접 쓰기와 같게) ③ **링크에 도구 이름을 넣지 않는다**(4.5절 내용 꾸미기) ④ 직접 쓴 가져올 정보를 '그 밖의 공공 정보'로 바꾸지 않는다(5.1절) ⑤ 파일 이름 `aliases.json`(`words`는 `scripts/lib/words.ts` 쓰지 않는 말과 헷갈림) ⑥ `q.type` 글은 `freeText`가 아니라 `notes`에 두고 한 줄 칸을 미리 채운다(이용자가 한 줄을 고쳐도 첫 답이 남음). 같은 점: 예산(L-08) 때문에 늦게 불러오기, `<label>`·도움말·글자 수, 원문은 링크에 넣지 않음 |

---

## 13. 할 일 묶음

| 묶음 | 하는 일 | 파일 | 검토 |
|---|---|---|---|
| **I1 자료** | `custom` 보기 17개, `type.custom` 태그·종류 틀, `q.notify` `showIf`, `aliases.json` + 스키마 + 검사, 조사 카드 넷, `safety.custom-tool`, 막힌 곳 문장, `scoring.unknownDifficulty`, `templates.json` 묶음 | `data/*.json`, `schemas/*.json`, `scripts/lib/validate.ts`, `scripts/guard/check-words.ts`, `docs/DATA.md` | engine-guardian, ko-copy-editor |
| **I2 엔진** | `match.ts`, `custom.ts`, 타입(`Session`·`CustomTool`·`Product.custom`·`ProductField`·`Conflict.kind`·`ResearchItem.source`·`SlotRanking.custom`·`ShareState`), `normalizeSession`, `answerChips`, `matchingRecipes`, `findConflicts`, `collectResearch`, `rankSlot`, `receiptModel`, `renderPack`, `projectName`, `productOf`, `fromShareState`·`toShareState`, 골든 7개, 단위 시험 | `src/lib/engine/*`, `scripts/lib/golden.ts`, `data/golden/case-24~30.json`, `tests/engine/*`, `docs/ENGINE.md`(새 절 "직접 쓴 답과 도구"), `/about/criteria`(직접 쓴 도구는 점수 없음 한 줄) | engine-guardian |
| **I3 화면** | `CustomAnswer.tsx`(지연 불러오기: 부품은 섬에, 찾기 + 낱말표는 `import()`), `Interview.tsx`(`layoutOf`, 줄·또는·펼침, 내 말 줄, 한 줄 칸 다듬기), `Shop.tsx`·`pick-nav.ts`·`WaypointsAction.tsx`(직접 쓴 도구 줄·고를 예정·정하기), `Check.tsx`(서행 줄·[도구 바꾸기]·`productOf`), `ReceiptsList.tsx`, `map/model.ts`(이름표·`markerKind` 타입), `ShelfFilter.tsx`(0건 한 줄), `saved.ts`·`share.ts`(store.ts는 그대로 세션 통째 저장), `icons.ts`(pencil), `ko.ts`, CSS(`parts.css`의 펼친 판·또는 줄, 토큰만) | 위 파일 | game-ux-designer(펼침·서행 연출), a11y-perf-auditor, ko-copy-editor |
| **I4 문서** | PRD R-18 옆에 R-18a(아래), CONCEPT 3절 낱말('직접 쓰기', '직접 쓴 도구', 비용 '모름'), UX.md 6.5·6.6·6.7과 고정 문구 표, RECEIPT.md(1번 '내 말 그대로', 7번 '(직접 씀)', 영수증 '모름'·'0원 + 확인 필요'), ARCHITECTURE 4절(세션 새 칸)·5절(링크 `x`·`g`)·성능(지연 묶음), DECISIONS, TASKS | `docs/*` | reader-tester(설계도 1번·7번·9번을 초심자 눈으로) |
| **I5 다음 (P2)** | 앞에서 쓴 말로 뒤 질문 보기에 "쓴 말과 맞아요" 꼬리표(`hintsFromText`, 저절로 고르지 않음), 막힌 곳 '이미 아는 것' 메모(8.9절) | — | — |

- **PRD R-18a 제안 문장**: "고르는 곳(만들 앱 정하기의 모든 질문, 도구 고르기의 기능마다)에는 '직접 쓰기'가 있다. 직접 쓴 말은 AI 없이 낱말표로 가장 가까운 보기를 찾아 보여 주고, 이용자가 고르거나 내 말 그대로 둔다. 그대로 둔 답을 어떻게 계산하는지 화면에 밝힌다. 원문은 설계도에 '내 말 그대로'로 넣고 영수증 링크와 집계에는 넣지 않는다."
- **예산**: `scripts/qa/budget.ts`에 줄 하나 "직접 쓰기 찾기 묶음(낱말표 포함) 8KB(gzip)". 부품 자체는 섬에 들어가 단계 화면 첫 JS가 약 2KB 는다(만들 앱 정하기 129.5 → 약 131.5 / 140KB, 도구 고르기 130.5 → 약 132.5). `launch.md` L-08의 예산 정리와 함께 본다.
- **순서**: I1 → I2(골든 통과) → I3(`/visual-qa` 360·768·1280·동작 줄이기, 키보드 끝까지) → I4. I1·I2는 화면이 없어도 끝낼 수 있다.

---

## 14. 결정 후보 (`docs/DECISIONS.md`, 모두 자동 결정)

| 결정 | 이유 | 틀렸을 때 비용 |
|---|---|---|
| 직접 쓰기는 질문 17개 전부 + 도구 칸마다. 빼는 곳 넷(설정·확인 문제·이동·막힌 곳 행동) | 소유자 요청 "반드시". 빼는 곳은 다른 답이 없거나 정답이 있거나 값이 아니다 | 낮음. 자료의 `custom` 보기를 빼면 된다 |
| 팝업 자동 완성 대신 [확인] 뒤 버튼 목록 | 한글 조합 깜빡임, 360px 키보드 + 팝업, datalist 접근성 문제, accessible-autocomplete 지원 축소 | 중간. 부품 하나 바꾸기 |
| 저절로 고르지 않고 이용자가 고름. 쓴 글은 늘 남김 | R-01(해석은 이용자 AI), APG '수동 선택' | 낮음 |
| 그대로 둔 답 = '모르겠어요'와 같게(예외 셋) | R-15의 무난한 기본값. '아마'로 하면 퀴즈의 고를 것이 2개 → 4개, 알아볼 것이 1개 → 3개로 커짐 [잼] | 낮음. 자료의 `like`만 고침 |
| `type.custom` 새 종류 + `q.notify`를 물음 | '안내 페이지' 틀은 엉뚱한 화면을 지시한다 | 낮음 |
| 직접 쓴 도구는 '모름' 도구: 사실 조건은 값 없음, 서버 위치만 '모름' | 모르는 사실로 단정하는 막힌 곳을 띄우지 않는다. 개인정보는 조심 쪽 | 중간. `productField` 한 곳 |
| 직접 쓴 도구는 처음부터 서행(kept) | 쓰는 순간 확인 못 한 길을 고른 것. 출발을 막지 않고 알아볼 것으로 넘김 | 낮음 |
| 링크에 직접 쓴 글·도구 이름을 넣지 않음 | 내용 꾸미기 방지, R-18 | 낮음. 링크로 받은 영수증에 이름이 안 보임 |
| 낱말표는 `data/aliases.json` 한 파일, 늦게 불러옴 | 단계 화면 예산(L-08), 엔진 계산과 분리(골든 안정) | 낮음 |
| 찾기 규칙: 공백 뺀 글, 긴 말 먼저, `=` 한 어절, 개수 점수, 부정 6글자, 돈은 한 달 기준, 영문 자판 되돌리기 | 원형 실험 [잼] | 낮음. 시험 표로 지킴 |
| 새 의존성 없음(`es-hangul` 안 들임) | 필요한 것은 40줄, 엔진 순수성 | 없음 |
| 집계 이벤트 늘리지 않음 | R-60 다섯 개 약속. 관찰 시험으로 대신 | 낮음. 필요하면 PRD 고치고 `custom_kept` 하나 |
| 마지막 한 줄 칸: 예시는 도움말로, `maxlength` 없앰 | GOV.UK 글 칸·글자 수 지침, Chromium의 IME 자르기 | 낮음 |

---

## 15. 사람에게 넘길 것 (`docs/HUMAN.md` 후보)

| 번호(빈 번호) | 할 일 | 왜 사람이 | 통과 기준 |
|---|---|---|---|
| H-입력1 | 아이폰 Safari와 갤럭시 Chrome의 한글 키보드로 직접 쓰기 칸에 "가계부 앱" 쓰고 키보드의 완료(Enter) | 이 세션에는 실제 기기·Safari가 없다. WebKit 버그 165004가 걸리는 곳 | 마지막 글자가 두 번 들어가지 않고 [확인]이 한 번만 눌린다 |
| H-입력2 | 관찰 시험(`docs/OBSERVATION.md`)에서 참가자에게 "보기에 없는 걸 직접 써 보세요"를 한 번씩 | 실제 초심자의 말로 낱말표를 넓힌다 | 그대로 둔 글을 모아 낱말표·빈틈 후보로 정리(글은 참가자 동의 아래 기록) |

---

## 16. 출처 (2026-10-14 확인)

- [확인] GOV.UK Design System 원본: `src/components/radios/index.md`, `src/components/text-input/index.md`, `src/components/character-count/index.md`, `src/patterns/equality-information/index.md`·`white/index.njk` — https://github.com/alphagov/govuk-design-system (마지막 커밋 2026-10-13). 게시 주소: https://design-system.service.gov.uk/components/radios/ (열지 못함, 같은 원본)
- [확인] GOV.UK accessible-autocomplete README — https://github.com/alphagov/accessible-autocomplete (npm 3.0.2)
- [확인] W3C ARIA APG Combobox Pattern — https://github.com/w3c/aria-practices/blob/main/content/patterns/combobox/combobox-pattern.html · https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- [확인] React Aria ComboBox 문서 원본 — https://github.com/adobe/react-spectrum/blob/main/packages/dev/s2-docs/pages/react-aria/ComboBox.mdx (`react-aria-components` 1.22.1)
- [확인] MDN `KeyboardEvent.isComposing`, `keydown` 이벤트, `<datalist>` — https://github.com/mdn/content (`files/en-us/web/api/keyboardevent/iscomposing`, `web/api/element/keydown_event`, `web/html/reference/elements/datalist`) · https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/isComposing
- [확인] WCAG 2.2 원본 `guidelines/sc/22/redundant-entry.html`, `guidelines/sc/21/status-messages.html` — https://github.com/w3c/wcag · https://www.w3.org/TR/WCAG22/#redundant-entry
- [확인] KRDS v1.1.0 예제 `html/code/text_input.html`, `textarea.html`, `radio_button.html` — https://github.com/KRDS-uiux/krds-uiux (2026-01-12). 지침 사이트 https://www.krds.go.kr 는 [못 봄]
- [확인]·[잼] `es-hangul` 2.4.0 README·함수 목록·크기 — https://github.com/toss/es-hangul · https://www.npmjs.com/package/es-hangul
- [검색 요약] Google Apps Script `MultipleChoiceItem.showOtherOption` — https://developers.google.com/apps-script/reference/forms/multiple-choice-item
- [검색 요약] 카카오 비즈니스폼+ — https://kakaobusiness.gitbook.io/main/ad/moment/engagement/bizformplus/new
- [검색 요약] 설문 '기타' 재분류 — https://savanta.com/knowledge-centre/view/open-ended-survey-coding-10-steps-for-coding-the-responses/ · https://community.qualtrics.com/survey-platform-54/recoding-other-text-into-existing-values-17861
- [검색 요약] Baymard 드롭다운 — https://baymard.com/blog/drop-down-usability
- [검색 요약] WebKit 버그 165004 — https://bugs.webkit.org/show_bug.cgi?id=165004 · IME와 Enter — https://azukiazusa.dev/en/blog/ime-enter-submit · https://velog.io/@alirz-pixel/html-Composition-Event-IME-문제
- [검색 요약] Chromium `maxlength`와 IME — https://codereview.chromium.org/442433002
- [검색 요약] GOV.UK 접근성 블로그(조건부 펼침) — https://accessibility.blog.gov.uk/author/calvin-lau-content-designer · https://www.tempertemper.net/blog/if-html-and-aria-dont-allow-it-its-probably-a-bad-idea
- [못 봄] 토스 TDS Mobile 문서 — https://tossmini-docs.toss.im/tds-mobile/components/ (검색 결과에 컴포넌트 목록 안내만)
- [잼] 이 저장소: 지금 엔진에 제안 자료를 메모리로 얹은 모의 실행(case-24~29), 낱말 찾기 원형(문장 71 + 27, 도구 이름 12), esbuild + gzip 크기.
