---
version: alpha
name: "나만의 독서 기록장"
description: "코드쇼퍼 설계도 6번에서 만든 디자인 지시. 귀엽게 · 분홍 · 밝게만. 발행 2026-10-12 14:05."
colors:
  primary: "#B8236F"
  on-primary: "#FFFFFF"
  primary-soft: "#FCEAF3"
  link: "#B8236F"
  neutral: "#FFF1F6"
  surface: "#FFFFFF"
  on-surface: "#2B2130"
  on-surface-muted: "#6B5A68"
  outline: "#8E7C8B"
  divider: "#F2DCE5"
  error: "#C42B36"
  success: "#1B7A4A"
typography:
  headline-lg:
    fontFamily: "Jua"
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.35
  headline-md:
    fontFamily: "Jua"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.4
  body-lg:
    fontFamily: "Pretendard"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "Pretendard"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  label-md:
    fontFamily: "Pretendard"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: "Pretendard"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: 9999px
  md: 20px
  lg: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  max-width: 720px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    height: 48px
    padding: 16px
  button-secondary:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.link}"
    rounded: "{rounded.full}"
    height: 48px
  link:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.link}"
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 16px
  helper-text:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.caption}"
  input-outline:
    backgroundColor: "{colors.outline}"
    height: 1px
  divider:
    backgroundColor: "{colors.divider}"
    height: 1px
  error-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
  success-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.success}"
---

## Overview

- 느낌: 귀엽게 (말랑한, 밝은, 둥근 / playful, soft, rounded)
- 눈에 띄게 할 것 하나: 새 기록을 쓰는 버튼. 목록은 차분하게 둔다.
- 아래 값은 출발점이야. 내 말에 더 맞게 바꿔도 되지만, 대비 4.5:1과 6-11의 하지 말 것은 지켜 줘.

## Colors

| 역할 | 밝은 화면 | 대비 |
|---|---|---|
| 바탕 | #FFFFFF | — |
| 면(카드·묶음) | #FFF1F6 | — |
| 글자 | #2B2130 | 15.40 |
| 약한 글자 | #6B5A68 | 면 위 5.82 |
| 입력 테두리 | #8E7C8B | 바탕 위 3.88 |
| 나눔 선 | #F2DCE5 | — |
| 주색(주 버튼) | #B8236F | — |
| 주색 위 글자 | #FFFFFF | 5.98 |
| 링크·강조 글자 | #B8236F | 면 위 5.46 |
| 옅은 주색 | #FCEAF3 | — |
| 성공 | #1B7A4A | — |
| 오류 | #C42B36 | — |

- 주색은 화면마다 주 버튼 하나와 링크에만 쓴다.
- 밝은 화면만 만든다.
- 오류·성공 색은 대표 색과 상관없이 표의 값으로 둔다.
- 대비 기준: 글자 4.5:1 이상, 글자가 아닌 것(입력 테두리·아이콘·초점 고리) 3:1 이상 (WCAG 2.2 AA). 표의 대비는 코드쇼퍼가 잰 값이다.

## Typography

- 글꼴: 제목 주아 (Jua) + 본문 Pretendard. 고른 짝: 동글동글 제목.
- 주아 (Jua): `<head>`에 이 줄을 넣어 줘 → `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&display=swap" />`
- Pretendard: `<head>`에 이 줄을 넣어 줘 → `<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />`
- 글꼴 라이선스: 주아 (Jua) OFL-1.1, Pretendard OFL-1.1
- 크기 (px/줄 높이): 제목 26/1.35/400 · 작은 제목 20/1.4/400 · 본문 크게 17/1.6 · 본문 16/1.6 · 버튼 글 15/1.4/600 · 작은 글 14/1.45
- 한글: `word-break: keep-all`을 쓰고, 기울임 글꼴을 쓰지 않는다. 본문은 16px 아래로 내리지 않고, 굵기는 400·600·700만 쓴다.
- 제목 글꼴은 20px 이상 제목에만 쓰고, 본문은 늘 본문 글꼴로 쓴다.
- 글꼴은 두 가족까지만 쓴다.

## Layout

- 촘촘함: 보통. 화면 양옆 16px, 묶음 사이 32px, 목록 줄 높이 56px, 누르는 곳 48px 이상.
- 휴대폰 세로 화면(폭 360px)을 기준으로 만든다. 누르는 곳은 가로세로 44px 이상, 글자는 16px 이상으로 한다.
- 첫 화면 배치: 최근 기록 목록.
- 아래에 붙박은 버튼은 `env(safe-area-inset-bottom)`만큼 띄운다.

## Elevation & Depth

- 카드에 부드러운 그림자 `0 2px 8px rgb(0 0 0 / 0.08)`를 단다. 테두리는 넣지 않는다.

## Shapes

- 모서리: 버튼·칩은 알약(9999px) · 카드 20px · 큰 판·대화 상자 24px.

## Components

- 화면마다 넣을 부품:
  - 기록 목록: 머리줄, 검색 칸, 목록 줄, 주 버튼
  - 기록 쓰기: 머리줄, 입력 칸, 주 버튼, 저장됨
  - 기록 보기: 머리줄, 카드, 보조 버튼, 확인 대화 상자
- 모든 화면에 상태 셋을 만든다: 불러오는 중 · 비어 있음 · 오류.
- 주 버튼: 높이 48px, 주색 바탕에 주색 위 글자, 모서리 보통. 누르면 조금 진하게, 키보드 초점에는 2px 고리, 꺼지면 옅게 하고 이유를 한 줄로 쓴다.
- 보조 버튼: 옅은 주색 바탕에 링크·강조 글자 색.
- 글 버튼: 바탕 없이 링크·강조 글자 색, 밑줄.
- 부품 규칙:
  - 머리줄: 화면 맨 위 한 줄. 화면 이름과 뒤로 가기만 둔다.
  - 검색 칸: 칸 안에 무엇을 찾는지 보이고, 결과가 없으면 그렇다고 글로 쓴다.
  - 목록 줄: 한 줄에 제목 하나와 보조 글 하나. 줄 전체를 누를 수 있게 한다.
  - 주 버튼: 화면마다 하나. 가장 중요한 일에만 쓴다.
  - 입력 칸: 칸 위에 늘 보이는 이름표. 틀리면 칸 아래에 무엇이 틀렸는지 글로 쓴다.
  - 저장됨: 다 됐다고 짧게 알리고, 다음에 할 일로 이어 준다.
  - 카드: 관련 있는 것을 한 묶음으로. 카드 안에 카드를 넣지 않는다.
  - 보조 버튼: 주 버튼 다음으로 중요한 일. 옅은 주색 바탕에 주색 글자.
  - 확인 대화 상자: 지우기처럼 되돌릴 수 없는 일 앞에서만 연다. 버튼 이름은 하는 일로 쓴다.
  - 불러오는 중: 자리를 미리 잡아 화면이 튀지 않게 하고, 오래 걸리면 글로 알린다.
  - 비어 있음: 왜 비었는지와 처음 할 일 하나를 버튼으로 보인다.
  - 오류: 무엇이 안 됐는지 쉬운 말로, 다시 해 볼 버튼을 함께 둔다.

## Motion

- 생기 있게: 누를 때 100ms 눌림 + 화면이 바뀔 때 200ms 흐려졌다 나타나기 + 목록에 더해질 때 150ms. 정답·완료처럼 일이 있을 때만 한 번 600ms 이하의 짧은 축하를 넣고, 곡선은 `cubic-bezier(0.34, 1.56, 0.64, 1)`을 쓴다.
- 기기의 '동작 줄이기'(`prefers-reduced-motion`)가 켜져 있으면 움직임을 끈다. 끝없이 도는 움직임과 스크롤을 가로채는 움직임은 쓰지 않는다.

## Iconography

- 아이콘: Phosphor (둥근 아이콘, MIT 라이선스) https://phosphoricons.com. React면 @phosphor-icons/react 패키지를 쓴다.
- 아이콘은 한 묶음만, 크기 20·24px로 쓴다. 이모지를 아이콘으로 쓰지 않고, 아이콘만 있는 버튼에는 이름표(aria-label)를 단다.
- 그림: 손그림 느낌으로, SVG 선을 일부러 조금 흔든다.
- 다른 사이트의 그림·사진·로고를 가져오지 않는다. 얼굴이 나온 사진은 허락 없이 넣지 않는다.

## Accessibility

- 글자와 바탕은 4.5:1 이상, 큰 글자(24px 이상, 또는 굵게 18.66px 이상)는 3:1 이상으로 한다 (1.4.3).
- 입력 칸 테두리·아이콘·초점 고리처럼 글자가 아닌 것은 3:1 이상으로 한다 (1.4.11).
- 색만으로 뜻을 전하지 않는다. 오류는 색과 그림과 글로 함께 알린다 (1.4.1).
- 키보드로 모든 기능을 쓸 수 있고, 초점이 늘 보이게 한다. 아래에 붙박은 버튼이 초점을 다 가리지 않게 한다 (2.1.1, 2.4.7, 2.4.11).
- 누르는 곳은 최소 24×24px이고, 이 설계도는 44px 이상을 권한다 (2.5.8).
- 끌어서만 되는 동작에는 누르는 방법도 둔다 (2.5.7).
- 입력 칸마다 보이는 이름표를 달고, 오류는 무엇이 틀렸는지 글로 알린다. 이미 넣은 정보를 다시 묻지 않는다 (3.3.1, 3.3.2, 3.3.7).
- 로그인이 있으면 붙여 넣기와 비밀번호 관리자를 막지 않는다 (3.3.8).
- `<html lang="ko">`를 두고, 그림에 대체 글을 단다. 320px 폭과 글자 200%에서도 가로로 밀리지 않게 한다 (3.1.1, 1.1.1, 1.4.10, 1.4.4).
- 움직임은 기기의 '동작 줄이기' 설정을 따른다 (2.3.3).

## Do's and Don'ts

- 화면마다 주 버튼은 하나만 둔다.
- 참고한 앱의 그림·로고·글을 그대로 가져오지 않는다.
- 모서리를 크게 둥글리고, 단순한 도형 그림을 곁들인다.
- 분홍은 버튼과 강조에만 쓰고, 바탕은 흰색으로 둔다.
- 따뜻한 크림색 바탕에 큰 명조 제목과 테라코타(붉은 흙색) 강조를 얹은 꼴을 쓰지 않는다.
- 먹색 바탕에 형광 초록이나 주홍 강조 하나만 얹은 꼴을 쓰지 않는다.
- 신문처럼 가는 선과 빽빽한 여러 단으로 화면을 채우지 않는다.
- 똑같은 둥근 카드를 줄줄이 늘어놓고 같은 회색 그림자나 그라데이션을 다는 꼴을 쓰지 않는다.
- 모든 제목 위에 영어 대문자 꼬리표를 달거나, 버튼 글 끝에 '→'를 붙이지 않는다.
