---
paths:
  - "src/lib/catalog/**"
  - "scripts/**"
  - "tests/**"
---

# 진열대 계산·스크립트·시험 규칙

## 진열대 계산 (`src/lib/catalog/core.ts`)

- 순수 함수만. DOM·`window`·`localStorage`·`fetch`·Node API를 쓰지 않는다. 시각(`Date.now()`)과 난수도 쓰지 않는다 (품질 바닥선이 막는다).
- 진열대 빌드(`scripts/catalog/build.ts`)와 화면 섬이 같은 함수를 쓴다: 정렬, 인기 점수, 쪽·묶음 나누기, 상세 조각 번호(FNV-1a), 카드 모양, 관련 상품.
- 정렬은 `cmpText`(로캘과 무관). `localeCompare` 금지.
- Node가 빌드 없이 바로 실행하므로 **지울 수 있는 타입 문법만**: `enum`·`namespace`·매개변수 속성 금지, 타입만 쓰는 import는 `import type`, 상대 경로 import에는 `.ts` 확장자.
- 쪽 크기·묶음·조각 수(`types.ts`)를 바꾸면 배포 파일 수(5천 개 아래)와 `npm run qa:budget`을 다시 본다.

## 스크립트 (`scripts/`)

- `node scripts/*.ts`로 바로 돈다 (Node 22.18+ 타입 지우기). 같은 문법 제약을 지킨다.
- `scripts/lib/`는 부작용 없는 도우미만 둔다. Vitest가 그대로 import한다.
- 검사 스크립트는 실패하면 0이 아닌 코드로 끝내고, 무엇을 어떻게 고치면 되는지 쉬운 말로 출력한다.
- 가져오기 스크립트(`scripts/import/`)는 같은 날 다시 돌려도 같은 파일을 쓴다. 요청 캐시는 저장소 밖(`.cache/`, `node_modules/.cache/`)에.

## 시험 (`tests/`)

- Vitest. 순수 함수는 작은 가짜 항목으로 하나씩 본다. 실제 자료 시험(`tests/lib/catalog.test.ts`, `tests/import/`)은 개수·모양·파일 수를 본다.
- 버그를 고칠 때는 먼저 실패하는 시험을 쓰고, 고친 뒤 통과를 확인한다.
- 화면 흐름은 Playwright(`tests/e2e/`), 접근성은 `@axe-core/playwright`. 바깥 요청은 `blockExternal`로 막는다. 스냅숏 이미지는 저장소에 올리지 않고 `.qa/`에 둔다.

## 코드 모양

- TypeScript strict, `any` 금지 (불가피하면 이유 주석). `noUncheckedIndexedAccess`를 지킨다.
- 이름은 하는 일을 말하게. 주석은 '왜'를 한국어로 짧게.
