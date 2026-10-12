---
paths:
  - "src/lib/engine/**"
  - "scripts/**"
  - "tests/**"
---

# 엔진·스크립트·시험 규칙

명세는 `docs/ENGINE.md`. 코드와 명세가 다르면 버그다.

## 엔진 (`src/lib/engine/`)

- 순수 함수만. DOM·`window`·`localStorage`·`fetch`·Node API(`fs`, `path`, `process`)를 쓰지 않는다. 시각(`Date.now()`)과 난수도 쓰지 않는다 (발행 시각은 밖에서 넘긴다).
- 같은 자료와 같은 `Session`이면 늘 같은 결과. 정렬은 `cmp`(로캘과 무관). `localeCompare` 금지.
- Node가 빌드 없이 바로 실행하므로 **지울 수 있는 타입 문법만**: `enum`·`namespace`·매개변수 속성 금지, 타입만 쓰는 import는 `import type`, 상대 경로 import에는 `.ts` 확장자.
- 문장을 코드에 박지 않는다. 엔진이 쓰는 문장은 `data/templates.json`에서 가져오고 `fill()`로 채운다.
- 동작을 바꾸면 같은 커밋에서 `docs/ENGINE.md`, `data/golden/`(이유를 적고 손으로), 필요하면 `/about/scoring` 화면을 함께 고친다. 절차는 `docs/ENGINE.md` 8절.
- 화면에서 필요한 계산이 엔진에 없으면 화면에서 계산하지 말고 엔진에 함수를 더한다 (시험과 함께).

## 스크립트 (`scripts/`)

- `node scripts/*.ts`로 바로 돈다 (Node 22.18+ 타입 지우기). 같은 문법 제약을 지킨다.
- `scripts/lib/`는 부작용 없는 도우미만 둔다. Vitest가 그대로 import한다.
- 검사 스크립트는 실패하면 0이 아닌 코드로 끝내고, 무엇을 어떻게 고치면 되는지 쉬운 말로 출력한다.

## 시험 (`tests/`)

- Vitest. 엔진 시험은 `tests/fixtures/`의 작은 가짜 자료로 규칙 하나하나를 고립해서 본다.
- 버그를 고칠 때는 먼저 실패하는 시험을 쓰고, 고친 뒤 통과를 확인한다.
- `src/lib/engine` 줄 기준 시험 범위 90% 이상을 유지한다.
- 화면 흐름은 Playwright(`tests/e2e/`), 접근성은 `@axe-core/playwright`. 스냅숏 이미지는 저장소에 올리지 않고 `.qa/`에 둔다.

## 코드 모양

- TypeScript strict, `any` 금지 (불가피하면 이유 주석). `noUncheckedIndexedAccess`를 지킨다.
- 이름은 하는 일을 말하게. 주석은 '왜'를 한국어로 짧게.
