# v2 디자인 시스템 조사: 세련돼 보이는 화면의 수치와 코드쇼퍼 토큰 제안

작성 2026-10-13. 소유자 요청("첨부한 로고에 맞게, 대기업 플랫폼·게임 환경을 실제로 조사해 세련되고 전문적으로. 지금은 너무 허접함")에 대한 디자인 시스템 조사 몫이다. 단계 이름 바꾸기, 드래그해서 용어 풀이 보기, 길 지도 연출은 다른 문서에서 다룬다. 이 문서는 **부품과 토큰**만 정한다.

로고 원본: `assets-src/brand/logo-source.webp` (1254×1254, 투명 바탕). 뽑은 색: 남색 `#001E5A`(가장 넓음), 파랑 `#0082FA`, 청록 `#00B4FA`, 옅은 회색 `#DCDCE6`, 짙은 남색 `#00285A`.

## 0. 결론

1. **강조색은 하나, 브랜드 면은 남색.** 행동(주 버튼·링크·고른 것)은 파랑 한 계열만 쓴다. 남색은 머리 띠·영수증 머리·내 길·고른 곳 같은 '브랜드 면'에만 쓴다. 청록은 남색 위에서만 글자로 쓰고, 밝은 바탕에서는 전조등 빛 같은 장식으로만 쓴다. 금색·청록 초록(`--you`)·청사진 파랑을 따로 두던 지금 구조(강조 성격의 색 6가지)를 없앤다.
2. **로고 파랑 `#0082FA`는 흰 글자를 못 얹는다** (3.77:1, 17px 버튼 글에 필요한 4.5:1 미달). 토스 파랑 `#3182F6`도 3.71:1이라 토스를 그대로 따라 하면 AA를 못 지킨다. 그래서 주 버튼은 한 단 짙은 `#0A6FDC`(흰 글자 4.86:1)로 채우고, `#0082FA`는 진행 막대·지금 위치·로고처럼 **그림 전용**(3:1 기준)으로 둔다.
3. **회색은 남색 기운의 12단.** Radix의 '단마다 쓰임이 정해진' 구조(1·2 바탕, 3~5 부품 면, 6~8 선, 9·10 그림, 11·12 글자)를 가져오고, 값은 로고 남색의 색상각(OKLCH 258°)으로 직접 만들었다. 밤 모드는 같은 이름에 값만 바꾼다.
4. **바탕은 회색, 묶음은 흰색, 그림자는 떠 있는 것에만.** 토스 TDS의 `greyBackground #f2f4f6` 위 흰 `Level01` 면, iOS의 grouped 목록과 같은 구조다. 카드마다 그림자와 2px 진한 테두리를 두는 지금 방식이 '허접함'의 가장 큰 원인이다.
5. **글자는 7단, 굵기는 3개(400·600·700).** 줄 높이는 18px 이하 1.5배, 19px 이상 '크기 + 9px'(토스 TDS 표와 같은 규칙). 자간은 본문 0, 19px 이상 제목만 음수(−0.01~−0.025em). Pretendard는 본문 자간 조정이 필요 없게 만들어졌다(README).
6. **버튼 높이 56·48·36, 모서리 16·14·10.** 토스 TDS 버튼(56/16, 48/14, 38/10, 32/8)과 같은 '높이의 약 0.28배' 비율이다. 화면마다 주 버튼은 하나.
7. **모션은 자주 하는 동작일수록 짧게**(누르기 100ms, 고르기 200ms, 시트 320ms, 나갈 때는 들어올 때의 약 70%). 스프링은 TDS `medium`과 같은 물성(강성 270, 감쇠 25: 넘침 2.4%, 460ms)을 `linear()`로 구웠다.
8. 아래 5절의 토큰 블록을 지금 `scripts/check-tokens.ts`(사본)로 돌려 **대비 110쌍(낮·밤 각 55) 모두 통과, 동작 줄이기 2곳 통과**를 확인했다. 옛 이름에서 새 이름으로 가는 대응표는 7절.

## 1. 조사 방법과 믿을 만한 정도

이 컨테이너의 바깥 연결은 몇 곳만 열려 있다. toss.tech, vercel.com, linear.app, stripe.com, m3.material.io는 직접 열리지 않아 검색 요약만 볼 수 있었다. 대신 **원본 파일을 직접 받아 값을 읽을 수 있는 곳**을 찾아 숫자는 그쪽에서 가져왔다.

| 등급 | 출처 | 받은 것 |
|---|---|---|
| 1차 (파일을 받아 값을 직접 읽음) | 토스 TDS: npm `@toss/tds-colors@0.1.0`, `@toss/tds-mobile@2.5.1` | 색 CSS(낮·밤), 글자 단계 표, 버튼 크기, 스프링 값. 묶음 JS는 실행하지 않고 문자열만 읽었다 |
| 1차 | Apple HIG (developer.apple.com의 HIG JSON 원문) | typography, color, dark-mode, materials, motion, sheets, buttons, accessibility, segmented-controls, progress-indicators, lists-and-tables |
| 1차 | Uber Base Web (GitHub `uber/baseweb` main, `src/themes/shared`) | 그림자, 테두리, 모서리, 모션 길이·곡선, 글자, 크기 단계 |
| 1차 | GitHub Primer: npm `@primer/primitives@11.10.0` | 그림자(낮·밤), 모션, 모서리, 초점 |
| 1차 | Material 3: npm `@material/web@2.5.0` | 모션 길이·곡선, 모양, 상태 층, 높이, 글자 |
| 1차 | Radix Colors (GitHub `radix-ui/colors`, `radix-ui/website`) | 12단 쓰임 규칙, slate 값 |
| 1차 | KRDS 범정부 디자인 시스템: npm `krds-uiux@1.1.0` | Pretendard GOV 글자 크기, 줄 높이, 간격, 모서리 |
| 1차 | Pretendard README (GitHub `orioncactus/pretendard`) | 자간 조정에 대한 설명 |
| 2차 (검색 요약만) | Vercel Geist, Linear, Stripe, Airbnb 2025, 토스 Product Sans, 카카오 T, 네이버, Mini Motorways, 게임 HUD 글 | 원리와 몇몇 수치. 아래에서 '(2차)'로 표시 |

토스 TDS는 '앱인토스' 이용 조건 아래 공개된 자료라 권리가 토스에 있다. **값을 그대로 옮기지 않고 비율과 규칙만 참고했다.** 아래 제안의 색 값은 모두 로고 색에서 직접 만든 것이다.

## 2. 시스템별로 확인한 수치와 가져올 것

### 2.1 토스 TDS (1차)

- **회색 10단 + 투명 회색 10단.** 낮: 50 `#f9fafb` · 100 `#f2f4f6` · 200 `#e5e8eb` · 300 `#d1d6db` · 400 `#b0b8c1` · 500 `#8b95a1` · 600 `#6b7684` · 700 `#4e5968` · 800 `#333d4b` · 900 `#191f28`. 투명 회색은 검정이 아니라 **남색 기운 검정**이다(예: `greyOpacity200 = rgba(0,27,55,0.1)`). 회색 전체가 파랑 쪽(OKLCH 색상각 약 255°)으로 살짝 기울어 있다.
- **면 이름이 쓰임으로 나뉜다.** 낮: `background #ffffff`, `greyBackground #f2f4f6`, `hairlineBorder #e5e8eb`, `dimmedBackground rgba(0,0,0,0.2)`. 밤: `background #17171c`, `backgroundLevel01 #202027`, `Level02 #2c2c35`, `greyBackground #101013`, `hairline #3c3c47`, `dimmed rgba(0,0,0,0.56)`. 밤에는 **높을수록 밝은 면**으로 층을 보인다.
- **글자 단계 20개(t1 30 … t7 13), 줄 높이 규칙이 단순하다.** 11~18px은 1.5배(17 → 25.5), 19~29px은 크기 + 9(22 → 31, 26 → 35), 30px 이상은 크기 + 10. 기기 글자 크기를 100%(Large)부터 310%(A11y_xxxLarge)까지 따르고, 단계마다 상한이 있다(예: t1은 최대 42).
- **버튼 4종.** small 32 / 모서리 8 / 13px, medium 38 / 10 / 15px, large 48 / 14 / 17px, xlarge 56 / 16 / 17px. 모서리 ≈ 높이 × 0.28.
- **스프링 6종**(질량 1): slow 70/20, basic 200/30, medium 270/25, small 480/50, quick 800/55, rapid 1000/55. 계산하면 basic은 넘침 없음(감쇠비 1.06), medium은 넘침 2.4%(감쇠비 0.76). 곡선 `out = [.25,.1,.25,1]`.
- **떠 있는 면 그림자** `0 2px 30px greyOpacity200` — 넓게 퍼지고 아주 옅다.
- 그대로 따라 하면 안 되는 점: 파랑 `#3182f6` 위 흰 글자는 **3.71:1**이다. 코드쇼퍼는 AA를 지켜야 하므로 한 단 짙게 간다.

### 2.2 Apple HIG (1차)

- **iOS 기본 글자 표(Large):** Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3 20/25, Headline 17 Semibold/22, Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18, Caption 12/16, 11/13. 기본 17pt, 최소 11pt. 라틴 글자 기준이라 줄 높이가 1.29배로 촘촘하다. 한글은 받침 때문에 더 넓어야 해서 토스·KRDS처럼 1.5배를 따른다.
- **대비 표:** 17pt 이하 4.5:1, 18pt 이상 3:1, 굵은 글자 3:1.
- **누르는 곳 44×44pt**(최소 28×28).
- **밤 모드는 반전이 아니다.** '바탕은 어둡게, 글자는 밝게, 그리고 base(뒤)와 elevated(앞) 두 벌의 바탕으로 깊이를 보인다.'
- **색은 아껴 쓴다.** '주 행동을 강조하려면 글자가 아니라 바탕에 색을 칠하라', '여러 컨트롤의 바탕에 색을 칠하지 마라', '단색 콘텐츠라면 브랜드 색을 앱 강조색으로 쓰는 것이 효과적'.
- **Liquid Glass(2025)는 컨트롤·내비게이션 층에만** 쓰고 콘텐츠 층에는 쓰지 않는다. 코드쇼퍼에서는 '지도 위에 떠 있는 아래 막대' 하나에만 반투명을 허락하는 근거다(성능 때문에 흐림 없이 불투명 면 + 그림자로 대신해도 된다).
- **모션:** '자주 일어나는 UI 동작에는 모션을 넣지 마라', '짧고 정확한 피드백', '사람이 모션을 끊을 수 있게'.
- **시트:** 한 번에 하나만, 손잡이(grabber), medium(약 절반)·large 두 높이, 아래로 밀어 닫기.
- **칸 고르개(segmented):** 아이폰에서 5칸 이하, 칸 너비를 같게.
- **목록:** grouped 스타일은 머리말·꼬리말과 넉넉한 간격으로 묶음을 나눈다.

### 2.3 Uber Base Web (1차)

- **그림자:** `shadow400 0 1px 4px 16%`, `shadow500 0 2px 8px 16%`, `shadow600 0 4px 16px 16%`, `shadow700 0 8px 24px 16%`. 위쪽 그림자(아래 시트용)를 따로 둔다: `shallowAbove 0 -4px 16px rgba(0,0,0,.12)`, `deepAbove 0 -16px 48px .22`.
- **테두리는 검정 투명도로:** `border100~600 = 1px, 검정 4% → 24%`. 테두리를 진한 색 실선으로 그리지 않는다.
- **모서리:** 2·4·8·12·16, 버튼 8, 입력 8, 카드·모달 0(우버 특유의 각진 느낌).
- **모션:** 100~1000ms를 100 단위로, 들어오기 `easeDecelerate cubic-bezier(0.22,1,0.36,1)`, 나가기 `easeAccelerate cubic-bezier(0.64,0,0.78,0)`, 화면 위 이동 `cubic-bezier(0.83,0,0.17,1)`.
- **글자는 쓰임마다 줄 높이가 다르다:** 읽는 글 16/24(1.5), 이름표 16/20(1.25, 굵기 500). 같은 크기라도 '읽는 글'과 '버튼·이름표'의 줄 높이를 나눈다.

### 2.4 GitHub Primer (1차)

- **쉬는 그림자는 거의 안 보인다:** `resting-small = 0 1px 1px #1f23280a, 0 1px 2px #1f232808` (투명도 4%·3%). `resting-medium = 0 1px 1px 10%, 0 3px 6px 12%`.
- **떠 있는 그림자는 가는 고리 + 여러 겹:** `floating-small = 0 0 0 1px #d1d9e040, 0 6px 12px -3px 4%, 0 6px 18px 12%`, `floating-large = 0 40px 80px 24%`.
- **밤 그림자는 고리가 일을 한다:** `0 0 0 1px #3d444d` + 검정 40~80%. 어두운 바탕에서는 그림자가 안 보이므로 1px 밝은 고리로 가장자리를 만든다.
- **모션:** micro 100(마우스 올림·초점·색), short 200(펼치기·토글), medium 300(모달 들어오기), long 500(드물게). 들어오기 = medium + ease-out, **나가기 = short + ease-in** — 나갈 때가 더 짧다.
- **초점:** 2px 실선. 모서리 3·6·12.

### 2.5 Radix Colors (1차)

- 12단, 단마다 쓰임이 정해져 있다: 1·2 앱 바탕, 3 부품 면(보통), 4 마우스 올림, 5 누름·고름, 6 누를 수 없는 것의 옅은 선, 7 누를 수 있는 것의 선, 8 진한 선·초점, 9 가장 순수한 채움, 10 채움 마우스 올림, 11 옅은 글자, 12 진한 글자. 11·12단은 같은 계열 2단 바탕 위에서 APCA Lc 60·90을 보장한다.
- slate 낮 `#fcfcfd … #1c2024`, 밤 `#111113 … #edeef0`. 코드쇼퍼 회색 12단은 이 '단의 밝기 간격'을 참고해 로고 남색 색상각으로 다시 만들었다.

### 2.6 Material 3 (1차, 대조용)

- 모션 길이 short1 50 … extra-long4 1000(50ms 단위 16단), 곡선 standard `(0.2,0,0,1)`, emphasized-decelerate `(0.05,0.7,0.1,1)`.
- 모양 4·8·12·16·28·full, 상태 층 투명도 hover 8%·focus 10%·pressed 10%·dragged 16%, 높이 0·1·3·6·8·12dp.
- 본문 16/24에 **자간 +0.5px**(라틴 글자용). 한글에는 맞지 않는다.
- 가져오는 것은 화면 위 이동 곡선 `(0.2,0,0,1)` 하나. 상태 층(색 위에 반투명 덧칠)은 가져오지 않고 Radix처럼 '누름 면' 단을 따로 둔다. 머티리얼 특유의 '색 입힌 면(tonal surface)'은 코드쇼퍼를 구글 앱처럼 보이게 하므로 쓰지 않는다.

### 2.7 KRDS 범정부 디자인 시스템 (1차)

- 글꼴 Pretendard GOV. 모바일 본문 17·15·13, 제목 28·24·22·19·17·15, 큰 제목 44·32·28. 줄 높이 기본 1.5, **자간 0**. 간격 단계 2·4·6·8·10·12·16·20·24·28·32·36·40·44·48·56·64·72·80·96, 모서리 2~12.
- 한국 정부가 휴대폰 본문을 **17px**로 둔 것은 초심자·중장년이 읽는 코드쇼퍼에도 근거가 된다. 읽는 글은 17px로 둔다.

### 2.8 Pretendard (1차)

- README: '크기·자간·광학 보정을 따로 조정하지 않아도 읽기 좋게 만들었다'(without requiring further adjustments of scaling, letter-spacing, optical adjustments). 본문 자간은 0이 기본이다. 음수 자간은 큰 제목에서만 쓴다.

### 2.9 2차 출처에서 얻은 원리

- **Vercel Geist:** 회색 100~1000 10단 + 바탕 두 개(`background-100 #ffffff`, `background-200 #fafafa`). 가장 많이 쓰는 글자는 'Label 14'. 큰 제목 72/72 굵기 600 자간 −4.32px(−0.06em). 원리: 화면 대부분을 무채색으로 두고 글자 크기·굵기로 위계를 만든다.
- **Linear:** 2024년 개편에서 테마 색을 HSL 대신 LCH로 만들고 기본 테마의 대비를 올렸으며 사이드바·패널의 '시각 잡음'을 줄였다. 2026년 개편에서는 사이드바를 '몇 단 어둡게' 해서 본문이 앞서게 하고, 탭·아이콘을 작게, 아이콘 수를 줄이고, 테두리·나눔선을 부드럽게 했다. 원리: **둘레는 물러나고 본문이 앞선다.**
- **Stripe:** 손으로 고른 색을 대비 검사에 맞춰 보는 방식과 바탕색에서 옅은 색을 뽑는 방식을 버리고, 지각 균일 색 공간(CIELAB)에서 밝기 단을 맞춰 접근성 있는 색 체계를 만들었다. 원리: **같은 단은 어느 색이든 같은 밝기.** 코드쇼퍼의 상태 색(원활·서행·막힘)도 같은 대비 기준으로 맞췄다.
- **Airbnb 2025:** 3D 아이콘('dimensional')과 부드러운 모션을 사내 팀이 만들었다. '흔한 기하 도형'에서 '질감과 형태'로 옮겼다. 원리: 그림은 **한 팀이 한 체계로** 만든다. 섞이면 싸 보인다.
- **토스:** Product Sans를 여러 운영체제에서 같은 높이로 보이게 세로 치수를 맞췄다. 제3자 정리에 따르면 강조색 하나, 한 화면에 주 행동 하나(공식 확인 못 함).
- **카카오 T(2025-09):** 통합검색에서 목적지마다 특화 정보(공항 혼잡도, 주차)를 보여 준다. 원리: '목적지'를 넣은 뒤 화면이 그 목적지에 맞게 바뀐다.
- **네이버(2023):** 아이콘 189개를 468일 동안 바꾸며 '바탕과 상징을 나누고', 흰 바탕에서 비슷한 시각 자극이 되도록 색조를 맞췄다. 원리: 아이콘 하나하나의 **시각 무게를 맞춘다.**
- **게임:** Mini Motorways는 미니멀한 지도에 색약 모드와 밤 모드를 둔다(보도 자료). 'AAA UI 아트 디렉션' 강연 정리글은 한 화면의 독립된 UI 묶음을 7개 이하, 메뉴 깊이를 3단 이하로 둔다. HUD 글들은 '자리를 번 것만 화면에 남긴다'는 절제를, 'juice vs polish' 글은 손맛이 본 경험을 대신하면 안 된다는 점을 말한다. 원리: **게임처럼 움직이되 화면은 절제한다. 손맛은 드문 순간(도착, 도장)에 몰아 준다.**

## 3. 싸 보이는 신호 15개와 고치는 법

지금 화면(`.qa/shots/*-360*.png`, 2026-10-13 빌드)에서 직접 찾은 것과 조사에서 나온 기준을 맞댔다.

| # | 싸 보이는 신호 | 지금 화면의 예 | 고치는 법 (수치) |
|---|---|---|---|
| 1 | 강조 성격의 색이 너무 많다 | 남색·금색·청록 초록(`--you`)·청사진 파랑·링크 파랑·초록 6가지가 한 화면에 함께 나온다 | 행동은 파랑 한 계열(`--accent`, `--link`), 브랜드 면은 남색, 청록은 남색 위에서만. 상태 색 3개는 상태에만 |
| 2 | 주 버튼이 여러 개 | 홈의 '이 코스로 출발' 외곽선 버튼 3개, 경유지 화면의 카드 속 '목적지로 가기' + 아래 막대 '점검하러 가기' | 화면마다 채운 주 버튼 1개(아래 막대). 카드는 카드 전체를 누르는 줄로 바꾸고 오른쪽에 `›`(16px, `--gray-8`) |
| 3 | 2px 진한 테두리 | 칩·고르기 타일·외곽선 버튼이 모두 2px 먹색 테두리 | 테두리 없는 면(`--fill`)이 기본. 고른 것만 2px `--accent` 고리를 안쪽 그림자(`inset 0 0 0 2px`)로 그려 크기가 안 흔들리게. 나눔선은 1px `--hairline` |
| 4 | 그림 체계가 섞인다 | '아직 못 정했어요'의 3D 이모지 얼굴, 보라 공책·클립보드 그림, 평면 선 아이콘이 한 격자에 | 이모지 금지. 한 계열의 직접 그린 SVG(4.15·4.16절). 큰 그림은 로고와 같은 평면 남색·파랑·청록 |
| 5 | 그림자·상자를 겹겹이 | 흰 카드 안 회색 말풍선 + 동그란 얼굴 + 닫기 단추, 카드 안 버튼 | 회색 바탕(`--bg`) 위 흰 묶음(`--surface`) 한 층. 그림자는 떠 있는 것(아래 막대·시트·토스트)에만. 카드 안에 카드 금지 |
| 6 | 글꼴이 섞인다 | '요금 0원' 칩에 고정폭 영수증 글꼴 | 영수증 종이 밖에서는 Pretendard만. 숫자는 `font-variant-numeric: tabular-nums` |
| 7 | 위계를 굵기로만 만든다 | 800·700·600이 섞이고 크기 차이는 작다 | 크기 7단(32·26·22·19·17·16·15·14 중 화면당 최대 4개), 굵기 400·600·700만. 800은 쓰지 않는다(글자 상표는 SVG) |
| 8 | 문단 밖에도 밑줄 링크 | 꼬리말 링크 4개, '코스 모두 보기' | 문단 안 링크만 밑줄. 홀로 선 링크는 '모두 보기 ›' 같은 옅은 버튼(`--on-accent-soft`)이나 목록 줄로 |
| 9 | 덜 된 빈 화면 | 도착 화면의 '영수증을 출력하는 중이에요.' 흰 상자 하나와 큰 빈 회색, 떠 있는 '사전' 단추 | 빈 상태 = 그림 1(96px) + 제목(22) + 한 줄(16) + 행동 1. 잠긴 단계는 흐린 미리 보기 + 열리는 조건 한 줄 |
| 10 | 칩 벽 | 도구 모음의 분야 칩 14개 + 기능 칩 9개가 360px에서 7줄 | 분야는 가로로 밀리는 한 줄(양끝 24px 흐림), 기능은 '거르기' 시트로. 고른 수를 배지로 |
| 11 | 시끄러운 단계 표시 | 점선 원, 금색 알약, 대시 줄이 한 줄에 | 5칸 진행 막대(높이 4, 칸 사이 4, `--brand-blue`) + '2/5 · 단계 이름' 한 줄. 전체 목록은 눌러서 시트로 |
| 12 | 화면마다 노란 경고 띠 | '검토 중인 시험판이에요…'가 모든 화면 맨 위 | 처음 방문에 한 번만 알리고, 늘 보이는 자리는 꼬리말 한 줄로. 꼭 보여야 하면 중립 안내 줄(`--fill`, `--text-2`) |
| 13 | 모서리가 제각각 | 8·12·14·16·20·24·알약 7종 + 안팎 모서리 어긋남 | 10·14·16·20 + 알약. 안쪽 모서리 = 바깥 모서리 − 안쪽 여백(예: 시트 20, 안 여백 8 → 안 카드 12) |
| 14 | 한글이 낱말 중간에서 끊긴다 | 좁은 화면 제목의 줄바꿈 | 제목 `word-break: keep-all; text-wrap: balance`, 본문 `text-wrap: pretty; overflow-wrap: anywhere`(긴 영문 주소 대비) |
| 15 | 밤 모드가 단순 반전 | 주 버튼이 흰 채움으로 뒤집히고, 2px 흰 테두리가 남는다 | 면 3단(바탕 `#08101b` → 면 `#0f1724` → 떠 있는 면 `#17202d`), 주 버튼은 낮과 같은 파랑, 그림자 대신 윗변 1px 빛줄(`rgb(255 255 255 / .06)`) |

## 4. 부품 규격

### 4.1 글자 (Pretendard Variable)

| 토큰 | 크기/줄 높이 | 굵기 | 자간 | 쓰는 곳 |
|---|---|---|---|---|
| display | 32/40 (1024px부터 44/54) | 700 | −0.025em | 홈 첫 줄만 |
| title-1 | 26/35 | 700 | −0.02em | 화면 제목 |
| title-2 | 22/31 | 700 | −0.01em | 묶음 제목, 시트 제목, 빈 상태 제목 |
| title-3 | 19/28 | 600 | −0.01em | 카드 제목, 추천 도구 이름 |
| body-lg | 17/27 (1.6) | 400 | 0 | 읽는 글: 설명, 용어 풀이, 설계도 미리 보기 |
| body | 16/24 (1.5) | 400 | 0 | 기본 |
| label | 15/22 | 600 | 0 | 버튼(작은·보통), 칩, 목록 줄 이름 |
| caption | 14/20 | 400·600 | 0 | 꼬리 글, 지도 이름표. **이 아래로 내리지 않는다** |
| number | 40/48 | 700, `tabular-nums` | −0.02em | 영수증 합계 '0원' 같은 큰 숫자 |

- 큰 버튼(56) 글자는 17/600, 보통(48) 16/600, 작은(36) 15/600.
- 한 화면에 크기 4개까지. 제목과 본문 사이 8, 본문과 다음 묶음 사이 32.
- 크기·줄 높이는 rem으로 둬서 기기 글자 크기를 따른다(토스가 310%까지 따르는 것처럼). 200%에서 가로 스크롤이 생기지 않는지 qa로 본다.

### 4.2 간격과 밀도

- 4px 바탕: 4·8·12·16·24·32·48·64(옛 `--space-1~7` 이름과 값은 그대로, 64만 더함). 화면 양옆 여백 **20px**(360px 이상), 359px 이하 16px. 지금 16px보다 넓혀 숨 쉴 틈을 준다(HIG의 기본 여백 16~20pt, 토스 TDS 코드에는 좌우 안 여백 24px이 20px보다 자주 나온다).
- 묶음 안 줄 사이 0(줄 높이로 띄움), 묶음과 묶음 사이 24~32, 묶음 머리말과 묶음 사이 8.
- 아래 막대: 위 12, 버튼 56, 아래 12 + `env(safe-area-inset-bottom)`.
- 한 화면에 독립된 UI 묶음 7개 이하(게임 UI 강연 정리), 주 버튼 1개.

### 4.3 모서리

| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--radius-xs` | 6 | 꼬리표, 뼈대 막대 |
| `--radius-sm` | 10 | 작은 버튼(36), 칸 고르개 손잡이 |
| `--radius-md` | 14 | 보통 버튼(48), 입력 칸, 토스트, 칸 고르개 바탕 |
| `--radius-lg` | 16 | 큰 버튼(56), 묶음 목록, 카드 |
| `--radius-xl` | 20 | 시트 위 모서리(토스 TDS 시트 머리 20과 같다), 큰 그림 카드 |
| `--radius-pill` | 999 | 칩, 진행 막대 |

### 4.4 높이와 선

- 높이 네 층: 바탕(0) → 묶음(0, 그림자 없음) → 떠 있는 것(`--elev-2`: 아래 막대, 토스트, 지도 위 버튼) → 시트·대화 상자(`--elev-sheet`, `--elev-3`).
- 그림자 색은 검정이 아니라 **남색 기운**(`rgb(0 20 60 / α)`, 토스 투명 회색과 같은 생각). 투명도는 쉬는 것 4~6%, 떠 있는 것 8~10%, 대화 상자 22%(Primer·Base 범위 안).
- 밤에는 그림자가 안 보이므로 면 밝기 한 단 + 1px 밝은 고리(`rgb(255 255 255 / .06~.08)`)로 가장자리를 만든다(Primer 밤 그림자와 같은 방식).
- 선: 묶음 안 나눔선 1px `--hairline`(장식, 대비 기준 없음). 입력 칸 테두리는 1px `--border`(3:1 이상, WCAG 1.4.11). 초점 받은 입력 칸은 2px `--accent`.

### 4.5 색 구조

- **원색:** 회색 12단, 파랑 12단(9 = 로고 파랑, 12 = 로고 남색), 브랜드 세 색(`--navy`, `--brand-blue`, `--cyan`).
- **뜻 색:** 면(`--bg`, `--surface`, `--surface-raised`, `--fill`, `--fill-press`, `--selected`, `--chosen`), 선(`--hairline`, `--border`), 글자(`--text`, `--text-2`, `--text-3`, `--link`), 행동(`--accent`, `--accent-soft`), 상태(`--ok`, `--warn`, `--bad`와 각 `-ink`, `-soft`), 초점, 영수증, 지도.
- **화면 코드는 뜻 색만 쓴다.** 원색(`--gray-7` 같은)은 토큰 파일 안에서만.
- 밤 모드는 원색 값을 바꾸고, 쓰임이 달라지는 몇 개(`--surface`가 흰색 → 2단)만 뜻 색을 다시 잇는다.
- 상태는 늘 그림 + 글과 함께(원활 ✓ 원, 서행 ! 세모, 막힘 × 팔각). 색약 모드를 따로 두지 않아도 되게 모양으로 구분한다.

### 4.6 버튼

| 크기 | 높이 | 모서리 | 글자 | 좌우 안 여백 | 쓰는 곳 |
|---|---|---|---|---|---|
| 큰 | 56 | 16 | 17/600 | 24 | 아래 막대의 주 버튼(폭 가득) |
| 보통 | 48 | 14 | 16/600 | 20 | 본문 안 행동, 시트 안 버튼 |
| 작은 | 36 (누르는 곳 44) | 10 | 15/600 | 14 | 줄 끝 행동, '모두 보기' |

| 종류 | 면 | 글자 | 쓰는 곳 |
|---|---|---|---|
| 주 | `--accent` | `--on-accent` | 화면마다 하나 |
| 옅은 | `--accent-soft` | `--on-accent-soft` | 두 번째 행동('도구 먼저 둘러볼게요') |
| 중립 | `--fill` | `--text` | 취소, 닫기, 고르지 않음 |
| 글자만 | 없음 | `--link` | 문단 끝 행동 |
| 위험 | `--bad-soft` | `--bad-ink` | 지우기(확인 대화 상자 안에서만 `--bad` 채움) |

- 누를 때: 면을 `--accent-press`(중립은 `--fill-press`)로, 크기 `--juice-press-scale` 0.98, 100ms.
- 못 누르는 버튼은 회색으로만 두지 않는다. 바로 아래 한 줄로 '목적지를 정하면 열려요'처럼 이유를 쓴다. 가능하면 못 누르는 버튼을 보이지 말고 다음에 할 일을 주 버튼으로 둔다.
- 외곽선 버튼은 쓰지 않는다(2px 테두리가 싸 보임 3번).

### 4.7 목록 줄

- 한 줄 56, 두 줄 72(토스 TDS에도 72가 있다), 세 줄 이상은 내용만큼(최소 88).
- 앞: 40×40 타일(모서리 12, 그림 24) 또는 그림 24만. 타일과 글 사이 12. 뒤: `›` 16(`--gray-8`), 값(`--text-2`), 또는 고름 ✓(`--accent`).
- 이름 15~16/600 `--text`, 설명 14/400 `--text-2`, 두 줄 사이 2.
- 나눔선은 기본으로 두지 않는다. 필요하면 1px `--hairline`을 글 시작점부터(왼쪽 = 여백 16 + 타일 40 + 12 = 68).
- 누름: 줄 면 `--fill`, 100ms. 줄 전체가 누르는 곳(버튼을 줄 안에 따로 두지 않는다).

### 4.8 카드와 묶음 목록

- **기본은 묶음 목록.** 도구 목록, 지난 영수증, 설정, 코스 목록은 회색 바탕 위 흰 묶음(모서리 16, 위아래 안 여백 8) 안의 줄로.
- **카드는 화면에 하나만, 이유가 있을 때만:** 이 경유지의 추천 도구 하나, 큰 그림이 있는 코스. 카드도 그림자 없이 흰 면 + 모서리 16, 카드 전체가 누르는 곳.
- 카드 안 카드, 카드마다 버튼, 카드마다 그림자 금지.

### 4.9 칩

- 보이는 높이 36, 누르는 곳 44(위아래 4 띄움), 모서리 알약, 좌우 안 여백 14, 글자 15/600, 그림 16.
- 기본: 면 `--fill`, 테두리 없음, 글자 `--text`. 고름: 면 `--chosen`(낮 남색, 밤 밝은 회색), 글자 `--on-chosen`, 앞에 ✓ 16. 고른 면은 옆 칩과 13:1 넘게 달라 보이고, 색만이 아니라 ✓로도 고름을 알린다.
- 한 줄로 가로로 밀고, 끝 24px을 흐리게 해서 더 있다는 것을 보인다. 7개가 넘으면 '더 보기' 시트.

### 4.10 칸 고르개 (segmented)

- 바탕 높이 44, 모서리 14, 면 `--fill`, 안 여백 2. 손잡이 높이 40, 모서리 12, 면 `--chosen`, 글자 `--on-chosen` 15/600, 나머지 칸 `--text-2`. iOS처럼 흰 손잡이를 옅은 회색 위에 두면 손잡이와 바탕의 대비가 1.2:1이라 WCAG 1.4.11(그림 대비 3:1)을 못 지킨다. 칩과 같은 '고른 것 = 남색 채움'으로 맞춘다.
- 5칸 이하, 칸 너비 같게(HIG). 손잡이 이동 200ms `--ease-in-out`.

### 4.11 단계 막대와 진행

- 머리 아래 단계 막대: 5칸 진행 막대(칸 높이 4, 칸 사이 4, 모서리 알약). 지난 칸과 지금 칸 `--brand-blue`, 남은 칸 `--fill`(파랑과 3.21:1, 밤 4.00:1). 아래 한 줄 '2/5 · 단계 이름'(14/600 `--text-2`, 단계 이름만 `--text`).
- 시맨틱: `<ol>` + 지금 칸 `aria-current="step"`, 각 칸에 단계 이름(보이지 않는 글).
- 점선 원·알약·대시를 겹치지 않는다(싸 보임 11번).
- 일반 진행 막대: 높이 4, 바탕 `--fill`, 채움 `--brand-blue`, 옆에 숫자(`tabular-nums`).

### 4.12 아래 시트

- 위 모서리 20, 손잡이 36×5(모서리 알약, `--gray-6`, 밤 `--gray-7`)를 위에서 8 띄움. 좌우 안 여백 20, 제목 22/31/700.
- 높이 두 단: 중간(화면의 약 50%)과 크게(HIG의 medium·large). 한 번에 하나만.
- 뒤 어둡게 `--scrim`: 낮 `rgb(8 16 27 / .40)`, 밤 `rgb(0 0 0 / .60)`. 토스(낮 20%, 밤 56%)보다 낮을 진하게 둔 이유는 시트 뒤가 복잡한 지도이기 때문이다.
- 들어오기 320ms `--ease-drawer`, 나가기 200ms `--ease-in`. 아래로 밀기·닫기 버튼·Esc 셋 다 닫힌다. 초점은 시트 안에 가두고 닫히면 연 버튼으로 돌아간다.

### 4.13 토스트

- 아래 막대 위 12, 폭 = 화면 − 여백 2배, 최소 높이 48, 모서리 14, 안 여백 14×16, 글자 15/500, 그림 20.
- 면 `--gray-12`(밤 `--gray-11`), 글자 `--gray-1`(밤 `--gray-1`). 반전 면이라 바탕 위에서 바로 보인다.
- `role="status"`, 한 번에 하나, 최소 4초, 마우스를 올리거나 초점이 있으면 멈춘다(WCAG 2.2.1). 되돌리기 같은 행동이 있으면 사라지지 않게.
- 들어오기 200ms(아래에서 8px + 투명도), 나가기 150ms.

### 4.14 뼈대(skeleton)

- 사이트는 자료를 미리 굽기 때문에 거의 필요 없다. 검색 색인을 늦게 불러올 때만 쓴다.
- 면 `--fill`, 모서리 6, 글 줄 높이 = 줄 높이 × 0.6. 반짝이는 띠는 쓰지 않는다(모션 예산). 300ms 안에 끝나면 아예 보이지 않게 300ms 늦게 띄운다.

### 4.15 아이콘

- 24 격자, 선 굵기 1.75(20px로 줄이면 1.5), 끝과 꺾임 둥글게, 모서리 2. 기본은 선, 고른 상태·지금 탭만 채움.
- 크기 16(줄 끝 `›`, 칩), 20(목록·토스트), 24(머리·빈 상태 아님). 색 `--text-2` 기본, 고름은 `--accent`.
- 한 계열로 직접 그린다(지금 하네스의 svg-illustrator). 이모지·사진 같은 그림을 섞지 않는다.

### 4.16 그림

- **로고에서 문법을 가져온다:** 평면 도형, 선 없음, 남색 `#001E5A` 바탕 덩어리 + 흰 면 + 파랑 `#0082FA` 띠 + 청록 `#00B4FA` 빛. 둥근 모서리(그림 크기의 약 8%). 그러데이션은 전조등 빛 한 곳(청록 두 단)만. 그림 속 그림자 없음, 빛은 한 방향.
- 한 화면에 큰 그림 하나(빈 상태 96, 홈 첫 장면 최대 240 높이). 작은 그림은 목록 타일 안 24.
- 3D 렌더(Airbnb 2025처럼)는 차·설계도·영수증 같은 대표 물건 6개 안쪽만, 미리 구운 AVIF/WebP(장당 40KB 안쪽, 낮·밤 두 벌). 화면에서 WebGL은 쓰지 않는다.
- **밤 모드 로고가 따로 필요하다.** 로고 남색 `#001E5A`는 밤 바탕 `#08101b` 위에서 1.21:1로 사라진다. '코드'를 흰색으로, 차 몸체를 한 단 밝은 남색이나 흰 테두리로 바꾼 벡터 로고가 필요하다(`docs/HUMAN.md`에 요청하거나 SVG로 다시 그린다). 원본이 1254px 비트맵이라 머리줄 32px에서 선명하게 보이려면 어차피 벡터가 필요하다.

### 4.17 모션

| 토큰 | 값 | 쓰는 곳 | 근거 |
|---|---|---|---|
| `--dur-tap` | 100ms | 누르기, 색 바뀜 | Primer micro 100, Base timing100 |
| `--dur-ui` | 200ms | 칩 고르기, 접고 펴기, 토스트 | Primer short 200 |
| `--dur-exit` | 200ms | 시트·대화 상자 나가기 | Primer: 나가기 = short |
| `--dur-sheet` | 320ms | 시트·대화 상자 들어오기 | Primer medium 300, M3 medium2 300 |
| `--dur-pop` ~ `--dur-print` | 300~700ms | 지도·영수증 장면 (그대로) | CONCEPT 7절 |
| `--dur-scene` | 2800ms 상한 | 대표 장면 | 프로젝트 규칙 3초 이하 |

| 곡선 | 값 | 쓰는 곳 |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | 들어오기 (Base easeDecelerate) |
| `--ease-in` | `cubic-bezier(0.64, 0, 0.78, 0)` | 나가기 (Base easeAccelerate) |
| `--ease-in-out` | `cubic-bezier(0.2, 0, 0, 1)` | 화면 위 이동, 지도 따라가기 (M3 standard). 지금 값 `(0.77,0,0.175,1)`은 너무 세서 어지럽다 |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | 시트 |
| `--ease-spring` | `linear(…)` 21점, 460ms | 마디 생기기, 칩 고름 ✓. 강성 270·감쇠 25(질량 1) 스프링을 0.5ms 간격으로 풀어 넘침 2.4%까지 담았다 |

- 자주 하는 동작(칩 고르기, 줄 누르기)은 200ms 이하, 넘침 없이. 드문 순간(경유지 완성, 도착, 도장)에만 스프링·손맛·소리.
- 모든 모션은 누르면 건너뛰고, 동작 줄이기에서는 이동·확대를 없애고 150ms 투명도만 남긴다(지금 규칙 D30 그대로).

## 5. 토큰 제안 (낮·밤 전체)

`src/styles/tokens.css`를 바꿀 때 그대로 쓸 수 있는 블록이다. 지금 파일과 같은 형식(글자색 줄의 `대비:` 주석, 밤 덩어리, 동작 줄이기 두 곳)을 지켜서 `scripts/check-tokens.ts`가 그대로 읽는다. 지도·영수증 장면용 모션 길이(`--dur-pop`~`--dur-scene`)와 손맛 토큰은 지금 값을 그대로 두었다.

```css
/* 코드쇼퍼 v2 토큰 제안 (docs/review/v2/systems.md). 로고의 남색 #001E5A · 파랑 #0082FA · 청록 #00B4FA 기준.
   글자색 줄의 '대비:' 주석은 scripts/check-tokens.ts가 낮·밤 두 값으로 검사한다. */
:root {
  color-scheme: light;

  /* 원색 1: 길 회색. 남색 기운(OKLCH 색상각 258). 1·2 바탕, 3~5 부품 면, 6~8 선, 9·10 그림·꼬리 글, 11·12 글자 */
  --gray-1: #f8fafc;
  --gray-2: #f2f5f8;
  --gray-3: #eaedf2;
  --gray-4: #e2e5eb;
  --gray-5: #d9dde4;
  --gray-6: #d0d5de;
  --gray-7: #c2c8d3;
  --gray-8: #a9b2be;
  --gray-9: #7d8795;
  --gray-10: #656f7f;
  --gray-11: #515c6c;
  --gray-12: #111c2c;

  /* 원색 2: 파랑. 9 = 로고 파랑, 12 = 로고 남색 */
  --blue-1: #f6fbff;
  --blue-2: #eaf5ff;
  --blue-3: #d9eeff;
  --blue-4: #c7e5ff;
  --blue-5: #b3dcff;
  --blue-6: #9dcfff;
  --blue-7: #7fbdff;
  --blue-8: #5aa5ff;
  --blue-9: #0082fa;
  --blue-10: #0a6fdc;
  --blue-11: #0f61c3;
  --blue-12: #001e5a;

  /* 브랜드 세 색 (로고 값 그대로) */
  --navy: #001e5a; /* 브랜드 면: 머리 띠, 영수증 머리, 내 길 바깥선, 고른 곳 */
  --navy-raised: #0b2d74; /* 남색 위 누름·겹친 면 */
  --brand-blue: #0082fa; /* 그림 전용(글자 아님): 진행 막대 채움(바탕은 --fill), 지금 위치, 로고. 대비: --surface 3, --bg 3, --fill 3, --navy 3 */
  --cyan: #00b4fa; /* 남색 위에서만 글자로 쓴다. 밝은 바탕에서는 장식(전조등 빛, 길 심). 대비: --navy 4.5 */

  /* 면 */
  --bg: var(--gray-2); /* 페이지 바탕 (흰 묶음 뒤 회색) */
  --surface: #ffffff; /* 묶음 목록·카드·아래 막대 */
  --surface-raised: #ffffff; /* 시트·대화 상자·떠 있는 것 (밤에는 한 단 밝다) */
  --fill: var(--gray-3); /* 칩·보조 버튼·입력 칸의 면 */
  --fill-press: var(--gray-4); /* 누름 */
  --selected: var(--blue-2); /* 고른 줄·고른 보기의 옅은 면 */
  --chosen: var(--navy); /* 고른 칩·칸 고르개 손잡이의 채움 (밤에는 밝은 회색). 대비: --fill 3, --surface 3, --bg 3 */
  --on-chosen: #ffffff; /* 대비: --chosen 4.5 */
  --hairline: var(--gray-4); /* 장식 선 (묶음 안 나눔 선) */
  --border: var(--gray-9); /* 입력 칸 테두리. 대비: --surface 3, --bg 3 */
  --scrim: rgb(8 16 27 / 0.4); /* 시트 뒤 어둡게 */

  /* 글자 */
  --text: var(--gray-12); /* 대비: --bg 4.5, --surface 4.5, --surface-raised 4.5, --fill 4.5, --selected 4.5 */
  --text-2: var(--gray-11); /* 보조 글. 대비: --bg 4.5, --surface 4.5, --surface-raised 4.5, --fill 4.5 */
  --text-3: var(--gray-10); /* 꼬리 글. --fill 위에는 쓰지 않는다. 대비: --bg 4.5, --surface 4.5 */
  --text-disabled: var(--gray-8);
  --link: var(--blue-11); /* 대비: --bg 4.5, --surface 4.5, --selected 4.5 */
  --on-navy: #ffffff; /* 대비: --navy 4.5 */
  --on-navy-2: #a9c3e6; /* 남색 위 보조 글. 대비: --navy 4.5 */

  /* 행동: 화면마다 주 버튼 하나 */
  --accent: var(--blue-10); /* 주 버튼 채움. 대비: --surface 3, --bg 3 */
  --accent-press: var(--blue-11);
  --on-accent: #ffffff; /* 대비: --accent 4.5, --accent-press 4.5 */
  --accent-soft: var(--blue-2); /* 옅은 버튼 면 */
  --on-accent-soft: var(--blue-11); /* 대비: --accent-soft 4.5 */

  /* 상태: 원활·서행·막힘. 늘 그림 + 글과 함께 (색만으로 뜻을 전하지 않는다) */
  --ok: #0e8f50; /* 그림. 대비: --surface 3 */
  --ok-ink: #0b7a43; /* 대비: --surface 4.5, --ok-soft 4.5 */
  --ok-soft: #e4f6ec;
  --warn: #f5a524; /* 채움 전용. 위 글자는 --on-warn */
  --warn-ink: #8f5a00; /* 대비: --surface 4.5, --warn-soft 4.5 */
  --warn-soft: #fff4dc;
  --on-warn: #111c2c; /* 대비: --warn 4.5 */
  --bad: #d42e3a; /* 대비: --surface 3 */
  --bad-ink: #c0262f; /* 대비: --surface 4.5, --bad-soft 4.5 */
  --bad-soft: #fdecec;
  --on-bad: #ffffff; /* 대비: --bad 4.5 */

  /* 초점: 2px 고리 + 2px 띄움 */
  --focus: var(--blue-10); /* 대비: --surface 3, --bg 3, --surface-raised 3 */
  --focus-on-navy: var(--cyan); /* 대비: --navy 3 */

  /* 영수증 종이 (낮·밤 모두 흰 종이) */
  --receipt: #ffffff;
  --receipt-ink: #111c2c; /* 대비: --receipt 4.5 */
  --receipt-soft: #515c6c; /* 대비: --receipt 4.5 */
  --seal: #d42e3a; /* 도장 그림. 대비: --receipt 3 */

  /* 지도. 땅·블록·길·물·공원은 장식 */
  --map-land: #eef2f6;
  --map-block: #e3e8ef;
  --map-road: #ffffff;
  --map-road-edge: #cdd5df;
  --map-water: #cfe3f6;
  --map-park: #dceee2;
  --map-ghost: #7d8795; /* 아직 안 난 길. 대비: --map-land 3 */
  --route-outer: var(--navy); /* 내 길 바깥선. 대비: --map-land 3 */
  --route-core: var(--cyan); /* 차 앞 청록 띠와 같은 심. 대비: --route-outer 3 */
  --node-fill: var(--navy); /* 고른 곳. 대비: --map-land 3 */
  --on-node: #ffffff; /* 대비: --node-fill 4.5 */
  --you: var(--brand-blue); /* 지금 위치. 대비: --map-land 3 */

  /* 글꼴 */
  --font-body: 'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
  --font-receipt: 'CC Receipt', 'Pretendard Variable', ui-monospace, 'Courier New', monospace; /* 영수증 종이 안에서만 */
  --weight-body: 400;
  --weight-medium: 500;
  --weight-strong: 600; /* 버튼·칩·줄 이름·숫자 */
  --weight-heading: 700; /* 제목 */

  /* 글자 단계 (rem이라 기기 글자 크기를 따른다). 줄 높이는 18px 이하 1.5배, 19px 이상 '크기 + 9px' (토스 TDS 표와 같은 규칙) */
  --size-display: 2rem; /* 32 홈 첫 줄만. 1024px부터 2.75rem */
  --leading-display: 2.5rem; /* 40 (1024px부터 3.375rem) */
  --size-title-1: 1.625rem; /* 26 화면 제목 */
  --leading-title-1: 2.1875rem; /* 35 */
  --size-title-2: 1.375rem; /* 22 묶음 제목, 시트 제목 */
  --leading-title-2: 1.9375rem; /* 31 */
  --size-title-3: 1.1875rem; /* 19 카드 제목 */
  --leading-title-3: 1.75rem; /* 28 */
  --size-body-lg: 1.0625rem; /* 17 읽는 글(설명, 용어 풀이) */
  --leading-body-lg: 1.6; /* 27. 초심자가 읽는 긴 글이라 토스(1.5)보다 한 단 넓게 */
  --size-body: 1rem; /* 16 기본 */
  --leading-body: 1.5;
  --size-label: 0.9375rem; /* 15 버튼·칩·줄 이름 */
  --leading-label: 1.375rem; /* 22 */
  --size-caption: 0.875rem; /* 14 꼬리 글. 이 아래로 내리지 않는다 */
  --leading-caption: 1.25rem; /* 20 */
  --size-number: 2.5rem; /* 40 영수증 합계 같은 큰 숫자 (tabular-nums) */
  --tracking-display: -0.025em;
  --tracking-title: -0.02em; /* 26 이상 */
  --tracking-title-sm: -0.01em; /* 19~22 */
  --tracking-body: 0; /* Pretendard는 본문 자간 조정이 필요 없게 만들어졌다 (README) */

  /* 간격: 4px 바탕. 옛 이름·값(1~7)은 그대로 두고 64만 더한다 (조용히 값이 바뀌는 일을 막으려고) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --gutter: 20px; /* 360px부터. 359px 이하는 16px (320px 다시 흐름) */
  --content-max: 640px; /* 읽는 폭: 양옆 여백을 빼면 17px 한글 한 줄 약 35자 */
  --tap: 44px;
  --bar-top: 16px;
  --bar-bottom: calc(7rem + env(safe-area-inset-bottom));

  /* 모서리: 네 단 + 알약. 안쪽 모서리 = 바깥 모서리 - 안쪽 여백 */
  --radius-xs: 6px; /* 꼬리표, 뼈대 막대 */
  --radius-sm: 10px; /* 작은 버튼(36), 칸 안 작은 면 */
  --radius-md: 14px; /* 보통 버튼(48), 입력 칸, 토스트 */
  --radius-lg: 16px; /* 큰 버튼(56), 묶음 목록, 카드 */
  --radius-xl: 20px; /* 시트 위 모서리, 큰 그림 카드 */
  --radius-pill: 999px; /* 칩, 진행 막대 */

  /* 버튼 높이 */
  --btn-lg: 56px;
  --btn-md: 48px;
  --btn-sm: 36px; /* 누르는 곳은 --tap으로 넓힌다 */
  --row-1: 56px; /* 한 줄 목록 행 */
  --row-2: 72px; /* 두 줄 목록 행 */

  /* 높이(그림자). 남색 기운 그림자, 투명도 4~22%. 밤에는 면 밝기와 윗변 빛줄로 높이를 보인다 */
  --elev-1: 0 1px 2px rgb(0 20 60 / 0.06), 0 1px 1px rgb(0 20 60 / 0.04); /* 쉬는 것: 칸 고르개 손잡이, 지도 핀 */
  --elev-2: 0 0 0 1px rgb(0 20 60 / 0.04), 0 2px 8px -2px rgb(0 20 60 / 0.08), 0 8px 24px -4px rgb(0 20 60 / 0.1); /* 떠 있는 것: 아래 막대, 토스트, 지도 버튼 */
  --elev-3: 0 0 0 1px rgb(0 20 60 / 0.04), 0 24px 48px -12px rgb(0 20 60 / 0.22); /* 대화 상자 */
  --elev-sheet: 0 -1px 0 rgb(0 20 60 / 0.04), 0 -12px 32px -8px rgb(0 20 60 / 0.14); /* 아래에서 올라온 시트 */
  --edge-light: inset 0 0 0 0 transparent; /* 밤에만: 윗변 빛줄 */

  /* 모션 길이: 자주 하는 동작일수록 짧게. 나갈 때는 들어올 때의 약 70% */
  --dur-tap: 100ms; /* 누르기, 색 바뀜 */
  --dur-ui: 200ms; /* 칩 고르기, 접고 펴기, 토스트 */
  --dur-exit: 200ms; /* 시트·대화 상자 나가기 */
  --dur-sheet: 320ms; /* 시트·대화 상자 들어오기 */
  --dur-pop: 300ms; /* 마디 생기기 */
  --dur-settle: 400ms;
  --dur-draw: 400ms; /* 길 한 토막 */
  --dur-fly: 500ms;
  --dur-hop: 400ms;
  --dur-roll: 600ms; /* 숫자 굴리기 */
  --dur-sweep: 700ms;
  --dur-signal: 350ms;
  --dur-print: 700ms; /* 영수증 출력 */
  --dur-stamp: 250ms;
  --dur-scene: 2800ms; /* 대표 장면 상한 */
  --dur-fade: 150ms; /* 동작 줄이기에서도 남긴다 (D30) */

  /* 곡선 */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1); /* 들어오기 (Base easeDecelerate) */
  --ease-in: cubic-bezier(0.64, 0, 0.78, 0); /* 나가기 (Base easeAccelerate) */
  --ease-in-out: cubic-bezier(0.2, 0, 0, 1); /* 화면 위 이동 (Material 3 standard) */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* 시트 */
  --ease-spring: linear(0, 0.06, 0.195, 0.358, 0.518, 0.66, 0.776, 0.866, 0.93, 0.974, 1.001, 1.016, 1.023, 1.024, 1.023, 1.019, 1.015, 1.011, 1.008, 1.005, 1); /* 강성 270·감쇠 25 (TDS 'medium'과 같은 값), 넘침 2.4%, 460ms */

  /* 손맛: 드문 순간일수록 크게 */
  --juice-s-scale: 1.03;
  --juice-m-scale: 1.06;
  --juice-l-scale: 1.12;
  --juice-s-shake: 2px;
  --juice-m-shake: 3px;
  --juice-l-shake: 4px;
  --juice-press-scale: 0.98;
  --juice-stamp-scale: 1.3;
}

/* 밤: 기기가 어두운 모드일 때. 같은 '대비:' 쌍을 이 값으로도 검사한다 */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --gray-1: #08101b;
    --gray-2: #0f1724;
    --gray-3: #17202d;
    --gray-4: #1d2735;
    --gray-5: #242e3d;
    --gray-6: #2d3746;
    --gray-7: #3b4655;
    --gray-8: #515c6b;
    --gray-9: #6b7584;
    --gray-10: #848d9a;
    --gray-11: #b2bac4;
    --gray-12: #eef0f4;
    --blue-1: #0a1628;
    --blue-2: #0c1e38;
    --blue-3: #0c284f;
    --blue-4: #093164;
    --blue-5: #0b3b78;
    --blue-6: #0a478d;
    --blue-7: #0d57ab;
    --blue-8: #0d6bcc;
    --blue-10: #3496f8;
    --blue-11: #73b6fa;
    --blue-12: #cbe5fe;
    --bg: var(--gray-1);
    --surface: var(--gray-2);
    --surface-raised: var(--gray-3);
    --fill: var(--gray-4);
    --fill-press: var(--gray-5);
    --selected: var(--blue-3);
    --chosen: var(--gray-12);
    --on-chosen: var(--gray-1);
    --hairline: var(--gray-6);
    --scrim: rgb(0 0 0 / 0.6);
    --accent: #0a6fdc;
    --accent-press: #0f61c3;
    --accent-soft: var(--blue-3);
    --ok: #2bc37a;
    --ok-ink: #2bc37a;
    --ok-soft: #0e2a1f;
    --warn: #f5b43c;
    --warn-ink: #f5b43c;
    --warn-soft: #2b2311;
    --on-warn: #08101b;
    --bad: #ff6b6b;
    --bad-ink: #ff6b6b;
    --bad-soft: #3a1518;
    --on-bad: #08101b;
    --focus: var(--blue-11);
    --map-land: #0b1422;
    --map-block: #111c2e;
    --map-road: #1e2a3e;
    --map-road-edge: #2a3850;
    --map-water: #0c2038;
    --map-park: #0e2620;
    --map-ghost: #6b7584;
    --route-outer: var(--brand-blue);
    --route-core: #ffffff;
    --node-fill: #e6eef8;
    --on-node: #08101b;
    --you: var(--cyan);
    --elev-1: 0 1px 2px rgb(0 0 0 / 0.4);
    --elev-2: 0 0 0 1px rgb(255 255 255 / 0.06), 0 8px 24px -4px rgb(0 0 0 / 0.5);
    --elev-3: 0 0 0 1px rgb(255 255 255 / 0.08), 0 24px 48px -12px rgb(0 0 0 / 0.7);
    --elev-sheet: 0 0 0 1px rgb(255 255 255 / 0.06), 0 -12px 32px -8px rgb(0 0 0 / 0.6);
    --edge-light: inset 0 1px 0 rgb(255 255 255 / 0.06);
  }
}

@supports not (transition-timing-function: linear(0, 1)) {
  :root {
    --ease-spring: var(--ease-out);
  }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-tap: 0ms;
    --dur-ui: 0ms;
    --dur-exit: 0ms;
    --dur-sheet: 0ms;
    --dur-pop: 0ms;
    --dur-settle: 0ms;
    --dur-draw: 0ms;
    --dur-fly: 0ms;
    --dur-hop: 0ms;
    --dur-roll: 0ms;
    --dur-sweep: 0ms;
    --dur-signal: 0ms;
    --dur-print: 0ms;
    --dur-stamp: 0ms;
    --dur-scene: 0ms;
    --juice-s-scale: 1;
    --juice-m-scale: 1;
    --juice-l-scale: 1;
    --juice-s-shake: 0px;
    --juice-m-shake: 0px;
    --juice-l-shake: 0px;
    --juice-press-scale: 1;
    --juice-stamp-scale: 1;
  }
}

:root[data-motion='reduce'] {
  --dur-tap: 0ms;
  --dur-ui: 0ms;
  --dur-exit: 0ms;
  --dur-sheet: 0ms;
  --dur-pop: 0ms;
  --dur-settle: 0ms;
  --dur-draw: 0ms;
  --dur-fly: 0ms;
  --dur-hop: 0ms;
  --dur-roll: 0ms;
  --dur-sweep: 0ms;
  --dur-signal: 0ms;
  --dur-print: 0ms;
  --dur-stamp: 0ms;
  --dur-scene: 0ms;
  --juice-s-scale: 1;
  --juice-m-scale: 1;
  --juice-l-scale: 1;
  --juice-s-shake: 0px;
  --juice-m-shake: 0px;
  --juice-l-shake: 0px;
  --juice-press-scale: 1;
  --juice-stamp-scale: 1;
}
```

## 6. 대비 검사 결과

5절 블록의 `대비:` 주석 55쌍을 낮·밤 두 값으로 계산했다. 모두 기준 이상이다(글자 4.5:1, 그림·테두리·초점 3:1).

| 글자·그림 토큰 | 바탕 토큰 | 기준 | 낮 값 → 대비 | 밤 값 → 대비 |
|---|---|---|---|---|
| `--brand-blue` | `--surface` | 3 | #0082fa / #ffffff → **3.77** | #0082fa / #0f1724 → **4.77** |
| `--brand-blue` | `--bg` | 3 | #0082fa / #f2f5f8 → **3.44** | #0082fa / #08101b → **5.07** |
| `--brand-blue` | `--fill` | 3 | #0082fa / #eaedf2 → **3.21** | #0082fa / #1d2735 → **4.00** |
| `--brand-blue` | `--navy` | 3 | #0082fa / #001e5a → **4.18** | #0082fa / #001e5a → **4.18** |
| `--cyan` | `--navy` | 4.5 | #00b4fa / #001e5a → **6.68** | #00b4fa / #001e5a → **6.68** |
| `--chosen` | `--fill` | 3 | #001e5a / #eaedf2 → **13.42** | #eef0f4 / #1d2735 → **13.20** |
| `--chosen` | `--surface` | 3 | #001e5a / #ffffff → **15.75** | #eef0f4 / #0f1724 → **15.75** |
| `--chosen` | `--bg` | 3 | #001e5a / #f2f5f8 → **14.39** | #eef0f4 / #08101b → **16.73** |
| `--on-chosen` | `--chosen` | 4.5 | #ffffff / #001e5a → **15.75** | #08101b / #eef0f4 → **16.73** |
| `--border` | `--surface` | 3 | #7d8795 / #ffffff → **3.64** | #6b7584 / #0f1724 → **3.85** |
| `--border` | `--bg` | 3 | #7d8795 / #f2f5f8 → **3.33** | #6b7584 / #08101b → **4.09** |
| `--text` | `--bg` | 4.5 | #111c2c / #f2f5f8 → **15.65** | #eef0f4 / #08101b → **16.73** |
| `--text` | `--surface` | 4.5 | #111c2c / #ffffff → **17.12** | #eef0f4 / #0f1724 → **15.75** |
| `--text` | `--surface-raised` | 4.5 | #111c2c / #ffffff → **17.12** | #eef0f4 / #17202d → **14.37** |
| `--text` | `--fill` | 4.5 | #111c2c / #eaedf2 → **14.59** | #eef0f4 / #1d2735 → **13.20** |
| `--text` | `--selected` | 4.5 | #111c2c / #eaf5ff → **15.50** | #eef0f4 / #0c284f → **12.85** |
| `--text-2` | `--bg` | 4.5 | #515c6c / #f2f5f8 → **6.20** | #b2bac4 / #08101b → **9.74** |
| `--text-2` | `--surface` | 4.5 | #515c6c / #ffffff → **6.78** | #b2bac4 / #0f1724 → **9.17** |
| `--text-2` | `--surface-raised` | 4.5 | #515c6c / #ffffff → **6.78** | #b2bac4 / #17202d → **8.36** |
| `--text-2` | `--fill` | 4.5 | #515c6c / #eaedf2 → **5.78** | #b2bac4 / #1d2735 → **7.69** |
| `--text-3` | `--bg` | 4.5 | #656f7f / #f2f5f8 → **4.64** | #848d9a / #08101b → **5.69** |
| `--text-3` | `--surface` | 4.5 | #656f7f / #ffffff → **5.08** | #848d9a / #0f1724 → **5.36** |
| `--link` | `--bg` | 4.5 | #0f61c3 / #f2f5f8 → **5.46** | #73b6fa / #08101b → **8.91** |
| `--link` | `--surface` | 4.5 | #0f61c3 / #ffffff → **5.97** | #73b6fa / #0f1724 → **8.39** |
| `--link` | `--selected` | 4.5 | #0f61c3 / #eaf5ff → **5.40** | #73b6fa / #0c284f → **6.84** |
| `--on-navy` | `--navy` | 4.5 | #ffffff / #001e5a → **15.75** | #ffffff / #001e5a → **15.75** |
| `--on-navy-2` | `--navy` | 4.5 | #a9c3e6 / #001e5a → **8.73** | #a9c3e6 / #001e5a → **8.73** |
| `--accent` | `--surface` | 3 | #0a6fdc / #ffffff → **4.86** | #0a6fdc / #0f1724 → **3.70** |
| `--accent` | `--bg` | 3 | #0a6fdc / #f2f5f8 → **4.44** | #0a6fdc / #08101b → **3.93** |
| `--on-accent` | `--accent` | 4.5 | #ffffff / #0a6fdc → **4.86** | #ffffff / #0a6fdc → **4.86** |
| `--on-accent` | `--accent-press` | 4.5 | #ffffff / #0f61c3 → **5.97** | #ffffff / #0f61c3 → **5.97** |
| `--on-accent-soft` | `--accent-soft` | 4.5 | #0f61c3 / #eaf5ff → **5.40** | #73b6fa / #0c284f → **6.84** |
| `--ok` | `--surface` | 3 | #0e8f50 / #ffffff → **4.15** | #2bc37a / #0f1724 → **7.87** |
| `--ok-ink` | `--surface` | 4.5 | #0b7a43 / #ffffff → **5.41** | #2bc37a / #0f1724 → **7.87** |
| `--ok-ink` | `--ok-soft` | 4.5 | #0b7a43 / #e4f6ec → **4.82** | #2bc37a / #0e2a1f → **6.71** |
| `--warn-ink` | `--surface` | 4.5 | #8f5a00 / #ffffff → **5.78** | #f5b43c / #0f1724 → **9.82** |
| `--warn-ink` | `--warn-soft` | 4.5 | #8f5a00 / #fff4dc → **5.30** | #f5b43c / #2b2311 → **8.49** |
| `--on-warn` | `--warn` | 4.5 | #111c2c / #f5a524 → **8.39** | #08101b / #f5b43c → **10.43** |
| `--bad` | `--surface` | 3 | #d42e3a / #ffffff → **4.94** | #ff6b6b / #0f1724 → **6.48** |
| `--bad-ink` | `--surface` | 4.5 | #c0262f / #ffffff → **5.90** | #ff6b6b / #0f1724 → **6.48** |
| `--bad-ink` | `--bad-soft` | 4.5 | #c0262f / #fdecec → **5.17** | #ff6b6b / #3a1518 → **5.82** |
| `--on-bad` | `--bad` | 4.5 | #ffffff / #d42e3a → **4.94** | #08101b / #ff6b6b → **6.88** |
| `--focus` | `--surface` | 3 | #0a6fdc / #ffffff → **4.86** | #73b6fa / #0f1724 → **8.39** |
| `--focus` | `--bg` | 3 | #0a6fdc / #f2f5f8 → **4.44** | #73b6fa / #08101b → **8.91** |
| `--focus` | `--surface-raised` | 3 | #0a6fdc / #ffffff → **4.86** | #73b6fa / #17202d → **7.65** |
| `--focus-on-navy` | `--navy` | 3 | #00b4fa / #001e5a → **6.68** | #00b4fa / #001e5a → **6.68** |
| `--receipt-ink` | `--receipt` | 4.5 | #111c2c / #ffffff → **17.12** | #111c2c / #ffffff → **17.12** |
| `--receipt-soft` | `--receipt` | 4.5 | #515c6c / #ffffff → **6.78** | #515c6c / #ffffff → **6.78** |
| `--seal` | `--receipt` | 3 | #d42e3a / #ffffff → **4.94** | #d42e3a / #ffffff → **4.94** |
| `--map-ghost` | `--map-land` | 3 | #7d8795 / #eef2f6 → **3.23** | #6b7584 / #0b1422 → **3.96** |
| `--route-outer` | `--map-land` | 3 | #001e5a / #eef2f6 → **14.00** | #0082fa / #0b1422 → **4.90** |
| `--route-core` | `--route-outer` | 3 | #00b4fa / #001e5a → **6.68** | #ffffff / #0082fa → **3.77** |
| `--node-fill` | `--map-land` | 3 | #001e5a / #eef2f6 → **14.00** | #e6eef8 / #0b1422 → **15.78** |
| `--on-node` | `--node-fill` | 4.5 | #ffffff / #001e5a → **15.75** | #08101b / #e6eef8 → **16.31** |
| `--you` | `--map-land` | 3 | #0082fa / #eef2f6 → **3.35** | #00b4fa / #0b1422 → **7.83** |

## 7. 옛 토큰 → 새 토큰

한 번에 바꾸면 화면 수십 곳이 조용히 깨진다. **1단계**: 새 토큰을 넣고 옛 이름을 새 토큰을 가리키는 별명(`--paper: var(--bg);`)으로 남긴다. **2단계**: 화면을 하나씩 새 이름으로 옮긴다. **3단계**: 별명을 지우고 `npm run guard`가 옛 이름을 막게 한다.

| 옛 토큰 (값) | 새 토큰 | 메모 |
|---|---|---|
| `--paper` `#f4f6f9` | `--bg` | |
| `--card` `#ffffff` | `--surface` / `--surface-raised` | 시트·대화 상자는 raised (밤에 한 단 밝다) |
| `--surface-2` | `--fill` | |
| `--hairline` | `--hairline` | 값 `#e2e7ee` → `#e2e5eb` |
| `--sky` | `--selected` | |
| `--gold-soft` | `--accent-soft` (추천), `--warn-soft` (주의) | 금색 계열 없앰 |
| `--ink` | `--text` | |
| `--on-ink` | `--on-accent` | 주 버튼이 먹색 채움 → 파랑 채움 |
| `--ink-soft` | `--text-2` | 입력 칸 테두리로 쓰던 곳은 `--border` |
| `--ink-faint` | `--text-3` | `--fill` 위에는 쓰지 않는다 |
| `--link` | `--link` | `#1a56db` → `#0f61c3` |
| `--gold`, `--gold-ink`, `--on-gold` | 없앰 | '요금 0원' 꼬리표 = `--navy` 면 + `--cyan` 글자(6.68:1). 추천 꼬리표 = `--accent-soft`. 내 길 심 = `--cyan`. 주의 채움 위 글자 = `--on-warn` |
| `--navy` `#1e2c58` | `--navy` `#001e5a` | 로고 값 |
| `--navy-deep` | `--navy-raised` | 더 어둡게가 아니라 한 단 밝게(누름·겹침) |
| `--on-navy` | `--on-navy`, `--on-navy-2` | |
| `--you` `#0a7568` | `--you` (`--brand-blue`, 밤 `--cyan`) | 초록빛 청록 없앰 |
| `--blueprint` | `--brand-blue` | 청사진 선 |
| `--flow`, `--on-flow` | `--ok`, `--ok-ink`, `--ok-soft` | 채움 위 흰 글자 대신 옅은 면 + 짙은 글자 |
| `--slow`, `--on-slow`, `--caution`, `--caution-ink` | `--warn`, `--on-warn`, `--warn-ink`, `--warn-soft` | |
| `--jam`, `--on-jam` | `--bad`, `--on-bad`, `--bad-ink`, `--bad-soft` | |
| `--seal`, `--receipt*` | 그대로 | 값만 조금 |
| `--focus`, `--focus-on-dark` | `--focus`, `--focus-on-navy` | |
| `--map-*`, `--node-fill`, `--on-node`, `--route-*` | 그대로 | 값 바뀜. `--map-shadow` → `--elev-1` |
| `--weight-display` 800 | 없앰 | 글자 상표는 SVG |
| `--text-sm` 14 / `--text-base` 16 / `--text-md` 17 / `--text-lg` 20 / `--text-xl` 24 / `--text-2xl` 30 / `--text-3xl` 40 | `--size-caption` 14 / `--size-body` 16 / `--size-body-lg` 17 (버튼 글은 `--size-label` 15) / `--size-title-3` 19 / `--size-title-1` 26 / `--size-display` 32 / 1024px부터 44 | 글자 색 `--text`, `--text-2`와 헷갈리지 않게 크기는 `--size-*`로 옮겼다 |
| `--leading` 1.6 / `--leading-tight` 1.25 / `--tracking-heading` | `--leading-body-lg` 1.6, `--leading-body` 1.5, 제목은 단계별 px / `--tracking-title*` | |
| `--radius-sm` 8 / `--radius-tile` 12 / `--radius-btn` 14 / `--radius` 16 / `--radius-lg` 20 / `--radius-sheet` 24 | `--radius-sm` 10 / (목록 타일 12는 `calc`) / `--radius-md` 14 / `--radius-lg` 16 / `--radius-xl` 20 / `--radius-xl` 20 | 시트 24 → 20 |
| `--btn-home` 56 / `--btn-bar` 52 / `--btn` 48 / `--chip` 32 | `--btn-lg` 56 / `--btn-lg` 56 / `--btn-md` 48 / `--btn-sm` 36 | 칩·작은 버튼 36 |
| `--gutter` 16 | `--gutter` 20 | 359px 이하 16 |
| `--content-max` 720 | 640 | 읽는 폭 |
| `--elev-1~3`, `--shadow`, `--shadow-lift` | `--elev-1~3`, `--elev-sheet`, `--edge-light` | 남색 기운, 더 옅게 |
| `--dur-tap` 120 / `--dur-ui` 240 | 100 / 200 | `--dur-exit` 200 새로 |
| `--ease-in-out` `(0.77,0,0.175,1)` | `(0.2,0,0,1)` | `--ease-in` 새로 |
| `--juice-press-scale` 0.97 | 0.98 | 자주 누르는 것이라 덜 |

## 8. 열린 질문과 위험

1. **주 버튼을 파랑으로 할지 남색으로 할지.** 파랑(`#0A6FDC`, 흰 글자 4.86:1)을 골랐다. 로고에서 '움직이는 색'이 파랑이고, 토스·카카오처럼 한국 이용자가 '누르는 색'으로 익힌 쪽이기 때문이다. 남색 채움(15.75:1)은 우버의 검정 버튼처럼 더 묵직하고 고급스럽지만, 밤 모드에서 바탕과 섞여(1.21:1) 따로 값이 필요하다. 되돌리기 쉬운 결정이라 `(자동 결정)`으로 적고, 관찰 시험에서 '어디를 누를지 바로 아는가'를 본다.
2. **로고 파랑과 주 버튼 파랑이 두 개다.** `#0082FA`(그림)와 `#0A6FDC`(채움)는 OKLCH 밝기 0.62와 0.56으로 한 단 차이라 같은 색으로 읽힌다. 화면 코드에서 섞어 쓰지 않도록 `--brand-blue`에는 '그림 전용'을 주석으로 박았고, 품질 바닥선 검사에 '`--brand-blue`를 `color`에 쓰면 실패'를 더하자.
3. **청록은 밝은 바탕에서 글자로 못 쓴다**(흰 바탕 2.36:1). 남색 위에서만 글자(6.68:1).
4. **밤 모드 로고가 필요하다**(4.16절). 지금 원본만으로는 밤 머리줄에서 '코드'와 차 몸체가 사라진다(1.21:1).
5. **금색을 없애면 '요금 0원'의 따뜻함이 줄어든다.** 대신 남색 면 + 청록 '0원'은 로고의 전조등·그릴 색과 같아 브랜드가 한 몸으로 읽힌다. 영수증 도장의 빨강(`--seal`)이 유일한 따뜻한 색으로 남아 도착 순간을 더 돋보이게 한다.
6. **값은 sRGB 경계에서 잘렸다.** 파랑 1~8단은 계산한 OKLCH 값이 sRGB 밖이라 가장 가까운 sRGB로 잘랐다. 표에 적힌 hex가 최종 값이다.
7. 토스 TDS는 권리가 토스에 있는 자료다. 이 문서는 비율·규칙만 참고했고 색 값은 옮기지 않았다. 스프링 물성 값(270·25)은 물리 상수라 같은 값을 써도 되지만, 걱정되면 280·26 같은 이웃 값으로 바꿔도 느낌은 같다.

## 출처

1차 (파일을 직접 받아 읽음):

- 토스 TDS 색: [npm @toss/tds-colors 0.1.0](https://www.npmjs.com/package/@toss/tds-colors) (`colors.light.css`, `colors.dark.css`)
- 토스 TDS 부품: [npm @toss/tds-mobile 2.5.1](https://www.npmjs.com/package/@toss/tds-mobile) (`dist/esm/index.js`의 글자 표·버튼 크기·스프링 값, `index.d.ts`)
- Apple HIG: [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode), [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets), [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Segmented controls](https://developer.apple.com/design/human-interface-guidelines/segmented-controls), [Progress indicators](https://developer.apple.com/design/human-interface-guidelines/progress-indicators), [Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables)
- Uber Base Web: [src/themes/shared](https://github.com/uber/baseweb/tree/main/src/themes/shared) (`lighting.ts`, `borders.ts`, `animation.ts`, `typography.ts`, `sizing.ts`, `breakpoints.ts`)
- GitHub Primer: [npm @primer/primitives 11.10.0](https://www.npmjs.com/package/@primer/primitives), [github.com/primer/primitives](https://github.com/primer/primitives)
- Material 3: [npm @material/web 2.5.0](https://www.npmjs.com/package/@material/web) (`tokens/versions/latest/sass/_md-sys-*.scss`, `labs/gb/styles/motion`)
- Radix Colors: [radix-ui/colors src](https://github.com/radix-ui/colors/tree/main/src), [Understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- KRDS: [npm krds-uiux 1.1.0](https://www.npmjs.com/package/krds-uiux) (`resources/css/token/krds_tokens.css`), [krds.go.kr](https://www.krds.go.kr)
- Pretendard: [README (en)](https://github.com/orioncactus/pretendard/blob/main/packages/pretendard/docs/en/README.md)

2차 (검색 요약, 직접 접속은 막힘):

- Vercel Geist: [vercel.com/design.md](https://vercel.com/design.md), [Geist Typography](https://vercel.com/geist/typography)
- Linear: [How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui), [Changelog 2024-03-20](https://linear.app/changelog/2024-03-20-new-linear-ui), [Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh)
- Stripe: [Designing accessible color systems](https://stripe.com/blog/accessible-color-systems)
- Airbnb 2025: [It's Nice That](https://www.itsnicethat.com/articles/airbnb-app-redesign-140525)
- 토스: [Toss Product Sans 이야기](https://toss.im/tossfeed/article/beginning-of-tps), [디자인 시스템 갤러리: Toss (제3자, 비공식)](https://www.oppadu.com/tools/design-systems-site/brand/toss.html)
- 카카오 T: [통합검색 개편 (2025-09-17)](https://byline.network/2025/09/17-485/)
- 네이버: [네이버 앱 아이콘 리뉴얼](https://designcompass.org/2023/07/27/naver-app-renewal/)
- 게임: [Mini Motorways 리뷰·분석 (SUPERJUMP)](https://www.superjumpmagazine.com/from-game-jam-idea-to-mobile-classic/), [Dinosaur Polo Club 보도 자료](https://dinopoloclub.com/press/index.php), [GDC: Expanding the Miniverse](https://gdcvault.com/play/1029197/Independent-Games-Summit-Expanding-the), [How to design a readable HUD](https://bugnet.io/blog/how-to-design-a-readable-hud), [Juice vs. Polish](https://www.wayline.io/blog/juice-vs-polish-key-differences)
- 싸 보이는 신호(실무 글): [Why your UI looks off](https://dev.to/pritish_academy/why-your-ui-looks-off-and-how-to-fix-it-1o6l), [UI design tips for developers](https://superdesign.dev/blog/ui-design-tips-for-developers)

## 부록: 대비 계산

WCAG 2.x 상대 휘도 `L = 0.2126R + 0.7152G + 0.0722B`(감마 풀기: `c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`), 대비 `(L1 + 0.05)/(L2 + 0.05)`. 6절 표는 5절 블록의 '대비:' 주석을 그대로 읽어 낮·밤 값으로 계산한 결과이고, 같은 블록을 `scripts/check-tokens.ts`(읽는 파일만 바꾼 사본)로 돌려 '토큰 검사 통과: 대비 110쌍(낮·밤), 동작 줄이기 2곳'을 확인했다. 블록을 `src/styles/tokens.css`에 넣으면 `npm run check`의 토큰 검사가 같은 결과를 내야 한다.

회색·파랑 단은 OKLCH(색상각 258°, 파랑은 250~257°)에서 밝기 단을 정하고 sRGB로 바꿨다. 스프링은 `x'' = −k(x−1) − c·x'`(질량 1)를 0.5ms 간격으로 풀고, 1과의 차이가 0.3% 안으로 들어오는 460ms를 21점으로 나눠 `linear()`에 담았다.
