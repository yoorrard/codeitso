# 코드쇼퍼 (Code Chauffeur)

바이브코딩 초심자가 인터뷰에 답하고 재료를 골라 담으면, 자기 AI에게 넘길 설계 꾸러미를 영수증처럼 받아 가는 무료 웹 서비스다.
슬로건: "어디로 모실까요? 요금은 0원입니다." · 소개: "코드는 몰라도 됩니다. 목적지만 말하세요."

## 지금 상태

- 끝난 것: 판단 엔진(`src/lib/engine/`), 자료(`data/`), 스키마(`schemas/`), 검사 스크립트(`scripts/`), 골든 사례 15개, 결과물 예시(`docs/examples/`), 디자인 토큰(`src/styles/tokens.css`).
- 남은 것: 화면과 배포. `docs/TASKS.md`의 순서대로 `/next-task`로 하나씩 한다.

## 꼭 지킬 것

1. 사이트는 AI를 부르지 않는다. 화면에서 외부 API도 부르지 않는다. 예외는 자기 사이트의 `/api/event`(익명 집계)와 쿠키 없는 Cloudflare Web Analytics(영수증 화면 제외) 둘뿐이다.
2. 쿠키·광고·제휴 링크·추적·회원가입이 없다. 이용자 상태는 브라우저 localStorage에만 두고, 저장 코드는 `src/lib/store.ts` 한 곳에만 둔다.
3. 추천·점수·충돌·조사할 것·공부할 것 계산은 `src/lib/engine/`에서만 한다. 화면은 `evaluate()` 결과를 보여 주기만 한다.
4. 엔진 동작이나 `data/scoring.json`을 바꾸면 `docs/ENGINE.md`와 `data/golden/`을 함께 고친다. 골든 기대값은 차이를 읽고 이유를 따진 뒤 손으로만 고친다. 자동으로 덮어쓰지 않는다. 바꿔야 하는데 근거가 없으면 멈추고 묻는다.
5. 문장을 코드에 박지 않는다. 엔진이 쓰는 문장은 `data/templates.json`, 화면 고정 문구는 `src/copy/ko.ts`.
6. 상품의 사실(무료 한도, 자격, 요금, 갱신 주기)을 지어내지 않는다. 공식 원문으로 확인하지 못했으면 `needsReview: true`로 두고 `sources`에 링크를 남긴다.
7. 쉬운 한국어로 쓴다. 번역투를 쓰지 않는다. 기준은 `.claude/rules/copy.md`.
8. 접근성 WCAG 2.2 AA, 휴대폰 360px 기준. 모션은 하나에 1초 안쪽, 공들인 장면도 3초 이하, 모두 건너뛸 수 있고 '동작 줄이기'를 따른다.
9. 색·글꼴·크기·모션 길이는 `src/styles/tokens.css`의 변수만 쓴다.
10. 새 의존성은 꼭 필요할 때만 더하고, 이유를 `docs/DECISIONS.md`에 적는다.
11. 비밀 값(Cloudflare API 토큰 같은 것)은 저장소에 넣지 않고 GitHub Secrets에만 둔다. D1의 database_id는 비밀이 아니어서 `wrangler.jsonc`에 둔다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run check` | 자료 검사 + 골든 사례 + 타입 검사. 커밋 전에 반드시 |
| `npm run validate` | 스키마와 파일 사이 교차 검사 |
| `npm run validate:release` | 배포용 검사 (사람 확인이 남은 진열 상품이 있으면 실패) |
| `npm run golden` | 추천 회귀 검사. 끝에 한 번도 안 켜진 규칙을 알려 준다 |
| `npm run golden:print` | 엔진 결과를 골든 모양으로 출력 (새 사례 만들 때) |
| `npm run explain -- case-03` | 사례나 레시피 하나의 칸별 점수 풀이 |
| `npm run examples` | `docs/examples/`에 레시피별 영수증·꾸러미 예시 다시 만들기 |
| `npm run typecheck` | 타입 검사 |

T01·T03 뒤에는 `npm run dev`, `npm run build`, `npm test`가 더해진다.
Node는 22.18 이상이어야 한다. `.ts` 스크립트를 빌드 없이 바로 실행한다.

## 폴더

```text
data/            자료 (상품, 질문, 규칙, 개념, 조사 카드, 문장 틀, 레시피, 에러, 출처, golden/)
schemas/         자료 스키마
src/lib/engine/  판단 엔진. 순수 함수, 화면·Node API 없음
src/styles/      디자인 토큰
scripts/         검사·예시·풀이 스크립트
docs/            문서 (아래)
.claude/         규칙(rules)과 스킬(skills)
```

## 문서 (필요할 때 읽는다)

- `docs/PRD.md`: 요구사항 (R-xx 번호). 무엇을 왜 만드는지.
- `docs/TASKS.md`: 작업 순서와 완성 조건. 진행 기록.
- `docs/ARCHITECTURE.md`: 기술 구성, 라우트, 상태 저장 키, 공유 링크, 검색, 집계, 배포.
- `docs/ENGINE.md`: 엔진 명세 (점수 공식, 충돌, 조사할 것, 공부할 것, 진행 순서).
- `docs/DATA.md`: 자료 파일, 조건 문법, 상품 추가하는 법, 골든 사례.
- `docs/UX.md`: 화면별 설계, 모션 M1~M7, 접근성 확인표, 고정 문구.
- `docs/RECEIPT.md`: 영수증·설계 꾸러미·공부할 것·대화 카드 형식.
- `docs/DECISIONS.md`: 정한 것과 이유. 새 결정은 여기에.
- `docs/BACKLOG.md`: 2·3단계 일. 1단계 중에 먼저 하지 않는다.
- `docs/examples/`: 엔진이 만든 실제 영수증·꾸러미. 화면 결과가 이것과 같아야 한다.

## 작업 방식

- 작업은 한 번에 하나. 시작할 때 작업에 적힌 문서를 읽고, 무엇을 할지 3~5줄로 말한 뒤 진행한다.
- 문서끼리 어긋나거나 문서에 없는 결정이 필요하면 추측하지 말고 멈춰서 묻는다. 정한 것은 `docs/DECISIONS.md`에 적는다.
- 작업이 끝나면: `npm run check`와 (있으면) 시험 통과 → `docs/TASKS.md`의 `[ ]`를 `[x]`로 바꾸고 진행 기록 한 줄 → 커밋.
- 커밋 메시지는 한국어로, 작업 번호로 시작한다. 예: `T08 인터뷰: 질문 섬과 좁혀지는 중 미리 보기`
- 사람에게 넘길 일: 계정 만들기, 비용이 드는 일, 법·약관 판단, 상품 사실의 최종 확인, 도메인·상표.
- 화면을 만들면 360px 폭에서 직접 확인하고, 키보드만으로 끝까지 가 본다.

## 코드 규칙 (요약)

- TypeScript strict. `any` 금지(불가피하면 이유 주석). 타입만 쓰는 import는 `import type`.
- 엔진과 스크립트는 지울 수 있는 타입 문법만 쓴다: enum·namespace·매개변수 속성 금지, 상대 경로 import에 `.ts` 확장자.
- 정렬에 `localeCompare`를 쓰지 않는다. 엔진의 `cmp`(`src/lib/engine/index.ts`에서 내보냄)를 쓴다 (늘 같은 순서).
- 섬(Preact)은 상태가 필요한 곳에만. 나머지는 Astro 정적 HTML.
- 자세한 규칙은 파일 종류에 따라 `.claude/rules/`에서 자동으로 불러온다: 자료(`data.md`), 엔진·스크립트(`engine.md`), 화면(`ui.md`), 문장(`copy.md`).

## 스킬

- `/next-task`: `docs/TASKS.md`에서 다음 작업을 골라 끝까지 한다.
- `/add-product 링크`: 공식 문서를 읽고 상품 카드 초안을 만든다.
- `/verify`: 모든 검사를 돌리고 결과를 쉬운 말로 정리한다 (고치지는 않음).
