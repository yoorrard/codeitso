---
name: add-product
description: 공식 문서 링크를 읽고 data/products.json에 넣을 진열 상품 카드 초안을 만든다. 사실은 원문에서 확인한 것만 쓰고 needsReview는 true로 둔다. "/add-product 링크", "상품 추가", "진열대에 ○○ 넣어 줘" 요청에 쓴다.
argument-hint: "<공식 문서 링크> [분야·칸 힌트]"
---

# /add-product — 상품 카드 초안 만들기

인자: `$ARGUMENTS` (공식 문서 링크, 선택으로 분야·칸 힌트)

## 순서

1. `docs/DATA.md` 4절(상품 카드 필드)과 `.claude/rules/data.md`를 읽는다. `data/products.json`에서 비슷한 상품 하나를 골라 모양을 본뜬다.
2. 링크의 **공식 문서**를 WebFetch로 읽는다. 블로그·요약 글로 사실을 정하지 않는다. 요금·한도·자격 페이지가 따로 있으면 그것도 읽는다.
3. 원문에서 확인한 사실만 채운다:
   - `cost.free`, `freeLimit`, `access`, `realtime`, `serverRegion`, `provider`, `license`: 원문 문장으로 확인한 것만. 모르면 비우거나 보수적으로(`serverRegion: "unknown"`) 쓴다.
   - `sources`에 사실을 확인한 원문 주소를 모두 남긴다.
   - `checkedAt`은 이번 달(YYYY-MM), `needsReview: true` (사람이 C01에서 대조한 뒤 false로 바꾼다).
4. 쉬운 설명을 쓴다 (`summary`, `useWhen`, `stuck`은 "-요"체, `promptFragment`는 이용자가 자기 AI에게 하는 "~해 줘"체. 키를 둘 곳은 쓰지 않는다).
5. 키를 화면에 넣으면 안 되는 상품이면 `keyExposureRisk: true`와 `needsConcepts`에 `env-var`. 화면용 공개 키면 `publicKey: true`.
6. `domains`·`topics`·`goodFor` 태그는 `data/taxonomy.json`에 있는 것만. 새 분야가 꼭 필요하면 태그와 질문 보기, 골든 사례를 함께 더한다.
7. `npm run check`. 골든 결과가 바뀌면 왜 바뀌었는지 읽고 판단한다 (`docs/ENGINE.md` 8절). 새 분야·새 조합이면 골든 사례를 하나 만든다.
8. 끝에 사람이 원문과 대조할 표를 남긴다: `| 필드 | 적은 값 | 원문 문장(요약) | 원문 링크 |`. 이 표는 `docs/HUMAN.md`의 C01 대조 목록에 덧붙인다.

## 하지 않는 것

- 원문을 열지 못했는데 값을 채우기. → 열지 못했다고 적고 그 필드를 비운다.
- MCP 서버·비공식 패키지를 진열 상품(추천 대상)으로 넣기. → `layer: "index"`, `recommendable: false`.
- 외부 설명문을 꾸러미 문장(`promptFragment`)에 그대로 옮기기.
