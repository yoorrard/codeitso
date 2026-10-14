---
paths:
  - "data/**"
  - "schemas/**"
---

# 자료 규칙 (data/, schemas/)

코드쇼퍼의 판단은 모두 이 JSON에서 나온다. 잘못된 자료가 배포되지 않게 막는 것이 품질 관리의 중심이다. 자세한 설명은 `docs/DATA.md`.

## 꼭 지킬 것

1. **사실을 지어내지 않는다.** 무료 한도·자격·요금·갱신 주기·서버 위치는 공식 원문으로 확인한 것만 쓴다. 확인하지 못했으면 비워 두거나 보수적으로 쓰고 `needsReview: true`, 확인한 원문 주소는 `sources`에 남긴다. `needsReview`를 false로 바꾸는 일은 사람만 한다 (C01).
2. **한 번 공개한 id는 바꾸지 않는다.** 공유 링크와 저장된 상태가 id를 기억한다. 꼭 바꿔야 하면 옛 id → 새 id 표를 `src/lib/store.ts`에 둔다.
3. id는 소문자·숫자·하이픈·점만. 태그 `종류.이름`, 질문 `q.이름`, 칸 `slot.이름`, 조사 카드 `research.이름`, 규칙은 종류 접두어(`slot-rule.`, `conflict.`, `research-rule.`, `safety.`, `stuck.`).
4. 스키마(`schemas/*.schema.json`)를 바꾸면 `src/lib/engine/types.ts`도 같이 고친다.
5. 자료를 고친 뒤에는 반드시 `npm run check`. 경고도 읽고 이유를 따진다.

## 엔진 동작이 바뀌는 자료 (scoring.json, rules.json, products.json의 점수 관련 필드)

- 무엇을 왜 바꾸는지 `docs/DECISIONS.md`에 먼저 적는다.
- `npm run explain -- 사례id`로 바뀐 점수를 보고, `npm run golden`이 실패하면 차이를 읽는다.
- 골든 기대값(`data/golden/`)은 **의도한 변경이고 이유를 한 줄로 쓸 수 있을 때만** 손으로 고친다. 엔진 결과를 통째로 복사해 덮어쓰지 않는다. 이유를 쓸 수 없으면 바꾸지 말고 되돌린다.
- 새 규칙을 넣으면 그 규칙이 켜지는 골든 사례를 하나 이상 만든다 (`npm run golden` 끝에 한 번도 안 켜진 규칙이 나온다).
- `npm run examples`로 `docs/examples/`를 다시 만든다. 예시 파일을 손으로 고치지 않는다.

## 문장

- 문장 체와 쉬운 말 기준은 `.claude/rules/copy.md`.
- `{{project}}` 바로 뒤에 조사를 붙이지 않는다. 자리 표시는 정해진 이름만 쓴다 (검사가 막는다).
- 확인 문제는 2~3개, 보기 2~4개, 정답 위치를 섞는다 (한 자리 60% 넘으면 경고). 오답도 그럴듯하게.
- 상품의 `promptFragment`에는 키를 어디에 둘지 적지 않는다. 그 말은 상황에 맞는 안전 규칙이 붙인다.
- 색인 상품의 외부 설명문은 `summary` 한 줄에만 두고 꾸러미에는 넣지 않는다 (프롬프트 주입 방지).

## 라이선스

`data/`는 CC BY 4.0. 외부 자료의 조건은 각 출처를 따른다. 공공데이터는 이용허락범위를 함께 적는다.
