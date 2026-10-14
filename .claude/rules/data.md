---
paths:
  - "data/**"
  - "schemas/**"
  - "scripts/import/**"
---

# 자료 규칙 (data/, schemas/, scripts/import/)

v5 진열대 자료는 `data/catalog/<대분류>/<출처>.json`에 있고, 가져오기 스크립트(`scripts/import/`, `npm run import`)가 공개 목록·API에서 받아 쓴다. 자세한 안내는 `docs/DATA.md`.

## 꼭 지킬 것

1. **설명·사실을 지어내지 않는다.** `summary`는 출처 원문 그대로(잘라도 원문), 라이선스·인증·무료 여부·인기 지표는 출처가 준 값만 둔다. 출처가 없으면 칸을 비운다. 코드쇼퍼가 쓴 한국어 한 줄은 `written: 'codeshopper'`를 붙인다.
2. **진열대 자료를 손으로 고치지 않는다.** 가져오기 스크립트를 고쳐 다시 돌린다. 같은 날 다시 돌리면 같은 파일이 나와야 한다(바이트가 같게).
3. **id는 주소에 그대로 쓴다**: `<출처>:<slug>`, 소문자·숫자·점·하이픈. 한 번 공개한 id는 바꾸지 않는다(장바구니·영수증이 id를 기억한다).
4. 새 출처는 라이선스와 이용 약관을 읽고 넣는다. 수집을 막는 곳, 라이선스가 없는 목록, 로그인이 필요한 곳은 빼고 이유를 그 대분류 `index.json`의 `rejected`에 적는다. 너무 큰 출처의 상위 기준은 파일의 `cut`과 `docs/DECISIONS.md`에.
5. 스키마(`schemas/catalog-*.json`)를 바꾸면 `src/lib/catalog/types.ts`와 `tests/import/`를 같이 고친다.
6. 빌드는 네트워크 없이 커밋된 자료만 쓴다. 진열대 빌드(`scripts/catalog/build.ts`)가 화면용 JSON을 만든다.

## 그 밖의 자료

- `data/glossary.json`: 어려운 말 풀이와 `/terms` 용어 사전. 다체(-다)로 쓴다. 스키마 `schemas/glossary.schema.json`, 시험 `tests/lib/glossary.test.ts`.

## 라이선스

출처마다 `source.license`에 우리가 목록을 실어도 되는 이유를 적는다. 항목 하나하나는 그 항목의 라이선스를 따른다(`license` 칸). 출처 표시가 필요한 곳(CC BY, Poly Haven 등)은 출처 배지를 지운다.
