---
name: web-interface-guidelines
description: Review Astro/Preact UI code (components, pages, layouts, styles) against web interface rules for accessibility, focus, forms, animation, typography, content handling, images, performance, navigation, touch and layout. Use after building or changing a screen and before marking a UI task done, or when asked to review UI code.
argument-hint: "<파일 또는 패턴, 예: src/components/shop/**>"
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/layouts/**"
  - "src/styles/**"
---

> 출처: vercel-labs/web-interface-guidelines `command.md` @ 434b7f91364665f2f733b310ec54809bf8f37937 (MIT, LICENSE 동봉).
> 고친 곳: 원본 스킬은 실행할 때마다 원격 규칙을 내려받는데, 내용이 바뀌거나 원격 글이 지시문이 되는 일을 막으려고 규칙을 이 파일에 고정했다.
> Tailwind·Next.js 전용 표현(`focus-visible:ring-*`, `<Link>`, nuqs, React hydration)을 Astro·Preact에 맞게 바꿨고,
> CDN preconnect 규칙을 뺐다 (모든 자산을 직접 싣는다). 영어 문장 규칙(Title Case, 굽은 따옴표, `&`)은 `.claude/rules/copy.md`로 바꿨다.
> 코드쇼퍼 전용 항목(토큰, 44px, 360px, 동작 줄이기 정책)을 더했다.

# 웹 인터페이스 지침 검토

검토할 파일: $ARGUMENTS

파일을 읽고 아래 규칙과 대조한다. 짧고 빠짐없이 쓴다. 문장보다 위치와 고칠 점이 중요하다.

## 규칙

### 접근성

- 아이콘만 있는 버튼에는 `aria-label` (한국어).
- 입력 칸에는 `<label>` 또는 `aria-label`.
- 동작은 `<button>`, 이동은 `<a href>`. `<div onClick>` 금지. 네이티브 `<button>`이면 키보드 처리를 따로 달지 않아도 된다.
- 그림에는 `alt` (장식이면 `alt=""`). 장식 아이콘은 `aria-hidden="true"`.
- 결과가 바뀌는 곳(복사, 담기, 충돌 해결, 검증 오류)은 `aria-live="polite"`로 알린다.
- ARIA보다 의미 있는 HTML이 먼저 (`<button>`, `<a>`, `<label>`, `<table>`, `<nav>`, `<main>`).
- 제목은 `<h1>`~`<h6>` 차례대로. 본문 바로 가기 링크를 둔다. 제목 앵커에는 `scroll-margin-top`.
- 화면이 바뀌면 새 제목으로 초점을 옮기고 `<title>`을 바꾼다.

### 초점

- 누를 수 있는 모든 것에 보이는 초점: `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }`, 어두운 바탕은 `var(--focus-on-dark)`.
- 대체 없이 `outline: none` 금지. `:focus`보다 `:focus-visible`.
- 묶음 컨트롤은 `:focus-within`.
- 붙박이 머리말·아래 진행 막대·사전 버튼이 초점 받은 요소를 가리면 안 된다 (WCAG 2.4.11). `scroll-padding`으로 보정.

### 입력 양식

- `autocomplete`와 뜻 있는 `name`. 맞는 `type`과 `inputmode`.
- 붙여 넣기를 막지 않는다 (사전의 에러 붙여 넣기가 핵심 기능이다).
- 라벨을 누르면 입력 칸에 초점 (`for` 또는 감싸기). 체크박스·라디오는 라벨과 컨트롤이 한 영역.
- 오류는 칸 바로 옆에 글로, 제출하면 첫 오류로 초점. 탓하지 않고 고치는 법을 말한다.
- 자리 표시 글(placeholder)은 예시이고 `…`로 끝낸다. 라벨을 대신하지 않는다.
- 저장하지 않은 입력이 있으면 떠나기 전에 알린다 (한 줄 입력 정도는 `localStorage`에 바로 저장해 이 문제를 없앤다).

### 모션

- 동작 줄이기(`prefers-reduced-motion`와 `html[data-motion="reduce"]`)를 따른다: 이동·확대·시차·깜빡임은 없애고, 바뀐 것을 보여 주는 짧은 투명도 전환(`--dur-fade`)만 남긴다.
- `transform`과 `opacity`만 움직인다. `transition: all` 금지 — 속성을 적는다.
- 길이와 곡선은 토큰만 (`--dur-*`, `--ease-*`). 모션 하나 1초 안쪽, 공들인 장면 3초 이하.
- 맞는 `transform-origin`. SVG는 `<g>`에 `transform-box: fill-box; transform-origin: center`.
- 모션 중에도 누르면 끝 상태로 건너뛴다. 모션이 끝나기를 기다려야 다음 행동을 할 수 있게 만들지 않는다.
- 5초 넘게 스스로 움직이는 것에는 멈춤 수단. 반복 장식은 동작 줄이기에서 멈춘다. 번쩍임은 초당 3번 미만.

### 글자

- 말줄임은 `…` (점 세 개 아님). 불러오는 중 문구는 `…`로 끝낸다: "불러오는 중…".
- 숫자 비교 칸에는 `font-variant-numeric: tabular-nums`.
- 한국어 본문은 `word-break: keep-all`, 긴 영문·주소는 `overflow-wrap: anywhere`. 제목은 `text-wrap: balance`.
- 단위와 숫자 사이 줄바꿈을 막는다: `10&nbsp;MB`, `약&nbsp;2시간`.
- 문장 규칙은 `.claude/rules/copy.md` (해요체, 번역투 금지, 짧은 동사 버튼).

### 내용 다루기

- 긴 글을 견딘다: 한 줄 입력(80자), 긴 상품 이름, 긴 에러 문장. 플렉스 자식은 `min-width: 0`.
- 빈 상태를 그린다: 빈 장바구니, 검색 결과 없음, 맞는 상품이 없는 칸 — 무엇을 하면 되는지 말한다.

### 그림

- `<img>`에 `width`·`height` (밀림 방지). Astro `<Image>`/`<Picture>`로 webp·avif와 크기별 파일을 만든다.
- 첫 화면 밖 그림은 `loading="lazy"`, 첫 화면 핵심 그림(기사님)은 `fetchpriority="high"`.
- SVG 그림은 토큰 색(`currentColor` 또는 `var(--…)`)을 쓴다.

### 성능

- 렌더 중에 레이아웃 읽기 금지 (`getBoundingClientRect`, `offsetHeight`). 읽기와 쓰기를 묶는다.
- 50개 넘는 목록(진열대·색인)은 `content-visibility: auto` 또는 나눠 그리기.
- 글꼴은 직접 싣고 `font-display: swap`, 첫 화면 글꼴만 `<link rel="preload" as="font" crossorigin>`.
- 섬(island)은 꼭 필요한 곳에만. `client:visible`/`client:idle`을 먼저 생각한다.
- 외부 주소로 자원을 불러오지 않는다 (스크립트·스타일·글꼴·그림 모두).

### 이동과 상태

- 정류장 이동은 `<a href>` (새 탭·가운데 클릭이 된다).
- 되돌릴 수 없는 동작(기록 지우기, 덮어쓰기)은 확인을 받거나 되돌리기를 준다.
- 공유 상태는 `#r=`로만, 읽자마자 주소에서 지운다 (`docs/ARCHITECTURE.md` 5절).

### 터치

- `touch-action: manipulation`. 탭 강조색은 일부러 정한다.
- 아래 창·옆 창에는 `overscroll-behavior: contain`.
- 끌기·밀기 동작에는 누르기·키보드 대안이 꼭 있다 (WCAG 2.5.7).
- 누르는 곳은 44×44px 이상 (`var(--tap)`), 서로 붙지 않게.
- 휴대폰에서 `autofocus`를 쓰지 않는다.

### 안전 영역과 배치

- 화면 끝까지 닿는 막대는 `env(safe-area-inset-*)`.
- 가로 스크롤이 생기지 않는다 (360px). 배치는 플렉스·그리드로, 자바스크립트 측정으로 하지 않는다.
- `<meta name="theme-color">`는 바탕색과 맞춘다.

### 지역화

- 날짜·시간은 `Intl.DateTimeFormat('ko-KR')` 또는 엔진이 준 문자열.
- 상품 이름·코드 조각·명령어는 `translate="no"`로 자동 번역에 망가지지 않게.

### 상태 표시

- 누를 수 있는 것은 누를 때·올렸을 때 모양이 바뀐다. 상태가 강할수록 대비도 강하게.

### 안티 패턴 (찾으면 적는다)

- 확대를 막는 `user-scalable=no`, `maximum-scale=1`
- `onPaste` + `preventDefault`
- `transition: all`, 토큰이 아닌 색·길이 값
- 대체 없는 `outline: none`
- `<div>`·`<span>`에 클릭 처리
- 크기 없는 그림, 라벨 없는 입력 칸, 이름 없는 아이콘 버튼
- 하드코딩한 날짜·숫자 모양
- 끌기만 되는 동작
- 화면 코드 속 문장 (문구는 `src/copy/ko.ts`)

## 출력 형식

파일별로 묶고 `파일:줄 - 문제 → 고칠 점`. 통과한 파일은 `✓ 통과`. 머리말 없이.

```text
## src/components/shop/ProductCard.tsx

src/components/shop/ProductCard.tsx:42 - 아이콘 버튼에 aria-label 없음
src/components/shop/ProductCard.tsx:55 - transition: all → transform, opacity만

## src/components/Receipt.astro

✓ 통과
```
