---
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/layouts/**"
  - "src/styles/**"
  - "src/lib/*.ts"
  - "public/**"
---

# 화면 규칙 (Astro + Preact 섬)

명세: `docs/review/v5/brief.md` 3·4절, `docs/CONCEPT.md`, `docs/ARCHITECTURE.md`(라우트·자료 파일·저장·성능).

## 구조

- 쪽(HTML)은 홈·대분류·소분류 목록·상세 하나(`/item?id=`)·장바구니·검색·용어·정보뿐이다. 13만 개 상품을 쪽마다 만들지 않는다(Cloudflare 2만 개 한도).
- Astro 페이지 머리말은 진열대 요약(`src/lib/catalog/site.ts` → `.cache/catalog/site.json`)만 읽는다. 원본 `data/catalog/`를 읽지 않는다.
- 목록의 다른 쪽·정렬과 상세는 섬이 진열대 빌드가 만든 JSON(`/catalog/list/…`, `/catalog/item/<n>.json`)을 받아 그린다. 계산은 `src/lib/catalog/core.ts`의 순수 함수로 한다(화면에서 따로 계산하지 않는다).
- 상태 저장은 `src/lib/store.ts` 한 곳 (장바구니·설정·연 용어·집계 기록).
- 섬(Preact)은 상태가 필요한 곳에만. 나머지는 정적 Astro. 섬은 `client:visible`/`client:idle`을 먼저 생각하고, 첫 화면에 꼭 필요한 것만 `client:load`.
- 문구는 `src/copy/ko.ts`. 화면 코드에 한국어 문장을 쓰지 않는다 (품질 바닥선 검사가 막는다).
- 주소는 `src/lib/routes.ts`에서 가져다 쓴다 (`ROUTES`, `FILES`, `listPath`, `itemPath`…). 화면 코드에 사이트 안 주소를 글자로 쓰지 않는다.

## 바깥 자원 (brief 5절)

- 스크립트·스타일은 바깥 주소에서 불러오지 않는다. 화면에서 부르는 API는 `/api/event` 하나뿐.
- 예외: 상품 미리 보기를 위해 출처의 공식 CDN에서 그림(과 S3부터 견본 글꼴)을 **지연 로드**한다(`loading="lazy"`, 실패하면 머리글자로). 추적·광고는 없다. 처리방침에 적는다.

## 모양

- 색·글꼴·크기·모서리·그림자·모션 길이는 `src/styles/tokens.css` 변수만. 화면 코드는 뜻 색(`--text`, `--surface`, `--primary`, `--cat-*`)만 쓴다. 새 값이 필요하면 토큰을 먼저 더하고 대비를 검사한다(`npm run tokens`, 낮·밤).
- 브랜드: 로고 파랑 = 주색(`--primary`), 로고 남색 = 글자(`--text`), 보라·노랑·코랄·초록·남색 = 대분류 강조색. 강조색 면 위 글자는 `--cat-*-ink`.
- 반응형 구간: 600 미만 · 600~1023 · 1024~1439 · 1440 이상, 본문 최대 폭 1440px(`--container-max`). 상품 격자는 2열 · 3열 · 4~5열. PC 첫 화면(1440×900)에 검색·카테고리·상품 첫 줄이 보이게.
- 누르는 곳 44×44px 이상. 2px 넘는 진한 테두리를 쓰지 않는다(고름은 안쪽 고리 + `--selected` 면).
- 사람 캐릭터 그림을 쓰지 않는다. 로고는 소유자가 준 장바구니 로고(`assets-src/brand/logo-cart-source.webp`)에서 `npm run logo`가 만든 것만.

## 접근성 (WCAG 2.2 AA)

- 키보드만으로 끝까지. 초점 테두리 늘 보임. 목록 쪽을 바꾸면 목록 제목으로 초점을 옮기고 알린다.
- 결과(담기·빼기·복사)는 `aria-live`로. 메뉴·서랍은 Esc로 닫고 닫으면 원래 자리로 초점.
- 색만으로 뜻을 전하지 않는다. 글자 200%에서 잘리지 않는다.

## 모션

- 하나에 1초 안쪽, 누르면 끝, 동작 줄이기(기기·사이트 설정)에서 이동 없음. 길이는 토큰(`var(--dur-…)`).

## 확인

화면을 바꾸면 390×844·1440×900 스크린샷을 직접 보고(`/visual-qa` 또는 `.qa/`), axe 심각·치명 0, `npm run qa:budget` 통과를 확인한다.
