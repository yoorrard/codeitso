# 코드쇼퍼 (Code Chauffeur)

바이브코딩 초심자가 만들고 싶은 앱(목적지)을 말하고 들르는 곳마다 도구를 고르면, 자기 AI에게 줄 설계도와 요금 0원 영수증을 받아 가는 무료 웹 서비스다. 화면은 **게임처럼** 움직인다: 답할 때마다 내 앱 지도가 자라고, 고른 도구로 길이 이어지고, 코드쇼퍼 차가 그 길을 달려 설계도가 놓인 빈 터에 닿는다. 단계는 **시운전 → 목적지 → 경유지 → 점검 → 도착**이다. 세계관·용어·그림·모션의 정본은 `docs/CONCEPT.md` (D56).
슬로건: "어디로 모실까요? 요금은 0원입니다." · 소개: "코드는 몰라도 됩니다. 목적지만 말하세요."

## 지금 상태

- 끝난 것: 판단 엔진(`src/lib/engine/`), 자료(진열 상품 48·개념 카드 20·에러 안내 20·골든 사례 21), 스키마, 검사 스크립트, 결과물 예시, 디자인 토큰, 자율 작업 하네스(`.claude/`, `scripts/guard`, `scripts/qa`), 모든 화면(T05~T17), 익명 집계 Worker(T18), e2e(T20), 배포 작업 흐름·보안 머리글·관찰 시험 안내서(T21·T22 준비).
- 지금 하는 것: 컨셉 적용(D56, `docs/TASKS.md` T24~T34). 옛 화면은 '첫 수업·인터뷰·장보기·재확인·계산대'와 기사님 그림을 쓰고 있어 이 작업들로 바꾼다.
- 남은 것: 사람 확인이 필요한 일(`docs/HUMAN.md`: 계정·배포 H01·H11, 공공데이터포털 H08·H09, 상품 사실 대조 C01, 법·상표, 그림 요청 A01~A05) 뒤의 실제 배포(T21)·색인 수집기(T19)·정식 출시(T22), 진열 상품 60개 이상(C02 이어서). `docs/TASKS.md` 순서대로 `/next-task`로 하나씩 끝까지 한다.

## 일하는 방식 (사람 개입 최소)

소유자는 개입을 최소로 원한다. **묻고 기다리지 말고, 정하고 기록하고 계속한다.**

1. `/next-task`가 기본 고리다: 고르기 → 계획 3~5줄 → 구현 → 검사 → 전문가 검토 → 기록 → 커밋·푸시. 끝나면 다음 작업으로 바로 넘어간다.
2. **되돌릴 수 있는 결정**(라이브러리, 배치, 문구, 연출, 파일 구조)은 문서와 원칙에 가장 맞는 쪽을 골라 `docs/DECISIONS.md`에 `(자동 결정)`으로 적고 계속한다. 형식: 결정 — 이유 — 틀렸을 때 비용.
3. 문서끼리 어긋나면 PRD > CONCEPT > UX·DESIGN·ARCHITECTURE·ENGINE > TASKS 순으로 따르고, 어긋난 문서를 고친다.
4. **사람만 할 수 있는 일**(계정, 돈, 법·약관, 상표·도메인, 상품 사실의 최종 확인, 이미지 생성·Tripo3D 그림)은 `docs/HUMAN.md`에 적고 **기다리지 않고** 다른 작업을 한다.
5. 완료라고 말하기 전에 증거를 돌린다 (`verification-before-completion` 스킬). 하위 에이전트의 "끝났다"는 `git diff`로 확인한다.
6. 진행 기록은 `docs/TASKS.md` 맨 아래 한 줄씩. `.claude/` 아래에는 진행 파일을 두지 않는다 (클라우드 세션에서 보호 경로라 무인 쓰기가 멈출 수 있다).

## 꼭 지킬 것

1. 사이트는 AI를 부르지 않는다. 화면에서 외부 API도 부르지 않는다. 예외는 자기 사이트의 `/api/event`(익명 집계)와 쿠키 없는 Cloudflare Web Analytics(영수증 화면 제외) 둘뿐이다. 글꼴·그림·스크립트도 외부 주소에서 불러오지 않는다.
2. 쿠키·광고·제휴 링크·추적·회원가입이 없다. 이용자 상태는 브라우저 localStorage에만 두고, 저장 코드는 `src/lib/store.ts` 한 곳에만 둔다.
3. 추천·점수·충돌·조사할 것·공부할 것 계산은 `src/lib/engine/`에서만 한다. 화면은 `evaluate()` 결과를 보여 주기만 한다.
4. 엔진 동작이나 `data/scoring.json`을 바꾸면 `docs/ENGINE.md`와 `data/golden/`을 함께 고친다. 골든 기대값은 이유를 한 줄로 쓸 수 있을 때만 손으로 고치고, 커밋 메시지에 `골든: case-NN 이유`를 적는다 (훅이 확인한다). 이유를 쓸 수 없으면 바꾸지 않는다.
5. 문장을 코드에 박지 않는다. 엔진이 쓰는 문장은 `data/templates.json`, 화면 고정 문구는 `src/copy/ko.ts`.
6. 상품의 사실(무료 한도, 자격, 요금, 갱신 주기)을 지어내지 않는다. 공식 원문으로 확인하지 못했으면 `needsReview: true`로 두고 `sources`에 링크를 남긴다.
7. 쉬운 한국어로 쓴다. 번역투를 쓰지 않는다. 기준은 `.claude/rules/copy.md`.
8. 접근성 WCAG 2.2 AA, 휴대폰 360px 기준. 모션은 하나에 1초 안쪽, 공들인 장면도 3초 이하, 모두 누르면 건너뛰고 '동작 줄이기'(기기·사이트 설정)를 따른다.
9. 색·글꼴·크기·모션 길이는 `src/styles/tokens.css`의 변수만 쓴다 (품질 바닥선 검사가 막는다).
10. 새 의존성은 꼭 필요할 때만 더하고, 이유와 크기(gzip)를 `docs/DECISIONS.md`에 적는다. 첫 화면 JS 100KB(gzip), 페이지 그림 300KB.
11. 비밀 값(Cloudflare API 토큰 같은 것)은 저장소에 넣지 않고 GitHub Secrets에만 둔다. 실제 배포·원격 D1·비밀 값 명령은 쓰지 않는다 (훅이 막는다). D1의 database_id는 비밀이 아니어서 `wrangler.jsonc`에 둔다.
12. 사람 캐릭터 그림은 쓰지 않는다 (D56). 그림은 CONCEPT 5·9절 체계만: 직접 그린 SVG 지도·청사진 그림, 그리고 소유자가 준 렌더 원본(`assets-src/art/`)을 같은 조명으로 구운 것. 새 렌더가 필요하면 `docs/HUMAN.md`에 요청하고, 그동안은 청사진 자리 표시로 낸다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run check` | 자료 검사 + 골든 + 토큰 + 글꼴 글자 + 품질 바닥선 + 쓰지 않는 말 + 하네스 검사 + 타입 검사 + 단위 시험. 커밋 전에 반드시 |
| `npm test` / `test:coverage` | Vitest 단위 시험(골든·자료 검사·엔진) / 엔진 시험 범위 보고 (`coverage/`) |
| `npm run validate` / `validate:release` | 자료 교차 검사 / 배포용 (사람 확인이 남은 진열 상품이 있으면 실패) |
| `npm run golden` / `golden:print` | 추천 회귀 검사 / 엔진 결과를 골든 모양으로 출력 |
| `npm run explain -- case-03` | 사례나 레시피 하나의 칸별 점수 풀이 |
| `npm run examples` | `docs/examples/` 다시 만들기 (손으로 고치지 않는다) |
| `npm run guard` | 품질 바닥선 (토큰 밖 값, 외부 자원, 코드 속 문장, any, 시험 건너뛰기, 엔진 순수성) |
| `npm run words` | 쓰지 않는 말 (옛 비유·바꾼 말·영어 섞어 쓰기, CONCEPT 3.9절). 화면 문구와 자료 문장 |
| `npm run qa:shots -- [라우트]` | 빌드 결과를 360·768·1280px와 동작 줄이기로 찍고 axe·가로 스크롤·작은 버튼·외부 요청 검사 → `.qa/` |
| `npm run qa:budget` | 성능 예산 (첫 화면 JS, 페이지 그림, 지연 묶음) |
| `npm run art` / `art:sheet` | 소유자 GLB·PNG(`assets-src/art/`)를 같은 조명으로 구워 `src/assets/art/`에 / 구운 그림 견본 `.qa/art-sheet.png`. `-- --self-test`로 장치 확인 |
| `npm run e2e` | Playwright 주요 흐름(레시피 5개, 키보드만으로 인터뷰, 공유 링크), 검색, 모션 건너뛰기·동작 줄이기, axe. 먼저 `npm run build` |

`npm run dev`, `npm run build`도 쓴다. Node 22.18 이상. `.ts` 스크립트를 빌드 없이 바로 실행한다. Playwright는 컨테이너의 Chromium과 맞춘 1.56.1로 고정한다.

## 폴더

```text
data/            자료 (상품, 질문, 규칙, 개념, 조사 카드, 문장 틀, 레시피, 에러, 출처, golden/)
schemas/         자료 스키마
src/lib/engine/  판단 엔진. 순수 함수, 화면·Node API 없음
src/assets/      기사님 그림 원본 (Astro가 크기별로 만든다)
src/styles/      디자인 토큰
scripts/         검사·예시·풀이 / guard(품질 바닥선, 하네스) / qa(시각 점검, 예산, 정적 서버)
docs/            문서 (아래)
.claude/         규칙(rules), 스킬(skills), 전문가 에이전트(agents), 훅(hooks), 설정(settings.json)
```

## 문서 (필요할 때 읽는다)

- `docs/PRD.md` 요구사항(R-xx) · `docs/CONCEPT.md` 세계관·용어·아트 디렉션·장면 S1~S9·그림 요청서 (정본) · `docs/TASKS.md` 작업 순서와 진행 기록 · `docs/HUMAN.md` 사람 확인 대기열
- `docs/DESIGN.md` 디자인 의뢰서(T34에서 CONCEPT을 가리키게 줄인다) · `docs/UX.md` 화면별 설계, 접근성 확인표, 고정 문구 (T24·T34에서 CONCEPT에 맞춘다)
- `docs/ARCHITECTURE.md` 기술 구성, 라우트, 저장 키, 공유 링크, 검색, 집계, 배포, 성능 기준
- `docs/ENGINE.md` 엔진 명세 · `docs/DATA.md` 자료 안내 · `docs/RECEIPT.md` 영수증·꾸러미 형식
- `docs/DECISIONS.md` 정한 것과 이유 · `docs/BACKLOG.md` 다음 단계 일 · `docs/examples/` 엔진이 만든 실제 결과물

## 하네스 지도

- **스킬** (`.claude/skills/`): `/next-task`(작업 하나를 끝까지), `/verify`(모든 검사 보고), `/visual-qa`(화면을 찍어 직접 보기), `/add-product`(상품 카드 초안), `game-motion`(게임 연출 구현), 그리고 가져와 고친 것: `frontend-design`, `animate`, `web-interface-guidelines`, `accessibility`, `polish`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`. 출처·라이선스는 각 폴더와 `THIRD_PARTY_NOTICES.md`.
- **전문가 에이전트** (`.claude/agents/`, 검토는 고치지 않고 보고만): `engine-guardian`(엔진·자료·골든), `a11y-perf-auditor`(접근성·예산, 실제로 돌려 봄), `ko-copy-editor`(문장), `game-ux-designer`(연출 설계·검토), `reader-tester`(초심자 눈으로 꾸러미 읽기), `svg-illustrator`(SVG 그림 제작). 바뀐 것에 맞는 검토자만, 한 번에 나란히 부른다.
- **훅** (`.claude/hooks/`): 세션 시작 때 의존성 설치와 진행 상황 알림, 위험한 git·배포 명령 차단, 만들어지는 파일 직접 수정 차단, 고친 파일 종류에 맞는 즉시 검사, 검사가 실패한 채 멈추지 못하게 한 번 붙잡기.

## 작업 규칙

- 작업은 한 번에 하나. 시작할 때 작업에 적힌 문서를 읽고, 무엇을 할지 3~5줄로 적은 뒤 진행한다.
- 커밋 메시지는 한국어로, 작업 번호로 시작한다. 예: `T08 인터뷰: 질문 섬과 좁혀지는 중 미리 보기`
- 작업 범위를 지킨다: 요청받지 않은 리팩터링·기능을 더하지 않는다. 고치는 김에 다른 곳을 건드리지 않는다. 가장 단순한 방법부터.
- 화면을 만들면 `/visual-qa`로 360px·동작 줄이기 스크린샷을 직접 보고, 키보드만으로 끝까지 가 본다.

## 코드 규칙 (요약)

- TypeScript strict. `any` 금지(불가피하면 `// any: 이유`). 타입만 쓰는 import는 `import type`.
- 엔진과 스크립트는 지울 수 있는 타입 문법만 쓴다: enum·namespace·매개변수 속성 금지, 상대 경로 import에 `.ts` 확장자.
- 정렬에 `localeCompare`를 쓰지 않는다. 엔진의 `cmp`를 쓴다.
- 섬(Preact)은 상태가 필요한 곳에만. 나머지는 Astro 정적 HTML.
- 자세한 규칙은 파일 종류에 따라 `.claude/rules/`에서 자동으로 붙는다: 자료(`data.md`), 엔진·스크립트·시험(`engine.md`), 화면(`ui.md`), 문장(`copy.md`).
