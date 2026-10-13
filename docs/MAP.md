# 길 지도 명세 (T28)

`docs/CONCEPT.md` 5.3·5.5·5.6·6절·7절·9(a)의 지도를 코드로 옮길 때 지키는 약속이다. 땅 판·표지 묶음·지도 모형·지도 섬이 이 문서 하나를 보고 따로 만들어져도 맞물리게 한다. 어긋나면 CONCEPT가 이긴다.

## 1. 좌표

- **지도 세계**: `viewBox="0 0 432 240"` (24px 격자 18×10칸). 휴대폰 360px에서 배율이 0.83~1.1이 되도록 정한 크기다.
- 지도 띠는 `preserveAspectRatio="xMidYMid slice"`로 그린다. 띠 높이(홈 264, 시운전·목적지 160, 경유지·점검 220, 도착 260, 768px에서 320)에 따라 위아래나 양옆이 잘린다.
- **안전 구역**: 길·마디·이름표·빈 터·집·표지는 모두 **x 60~372, y 32~208** 안에 둔다. 위 띠 높이 어느 것에서도 잘리지 않는 구역이다 (360×264에서 양옆 52씩, 360×160에서 위아래 24씩, 768×320에서 위아래 30씩 잘린다).
- 넓은 화면(나눈 화면의 오른쪽 지도)은 `xMidYMid meet`로 세계 전체를 보이고, 남는 자리는 땅 판이 채운다. 그래서 땅 판은 세계보다 크다 (2절).
- 길은 45°·90°만 쓴다. 굽는 곳은 반지름 12로 둥글게, 선 끝과 이음은 둥글게.
- 빛은 왼쪽 위에서 온다. 그림자는 오른쪽 아래로 (2, 3) 옮긴 같은 모양을 `--map-shadow`로 칠한다 (흐림 없음).

## 2. 땅 판 `src/assets/map/land.svg`

- `scripts/assets/make-map.ts`가 고정 시드로 만든다 (`npm run map`). 손으로 고치지 않는다.
- 겉 요소: `<svg xmlns="http://www.w3.org/2000/svg" x="-432" y="-240" width="1296" height="720" viewBox="0 0 1296 720" aria-hidden="true" focusable="false">`. 지도 세계(0,0)는 땅 판의 (432, 240)이다.
- 색은 파일에 쓰지 않는다. 요소마다 아래 클래스만 붙이고, 칠은 `src/styles/map.css`가 토큰으로 한다.

| 클래스 | 무엇 | 칠 |
|---|---|---|
| `ml-land` | 바탕 사각형 하나 (판 전체) | `--map-land` |
| `ml-block` | 90° 격자 블록 (둥근 모서리 6) | `--map-block` |
| `ml-street` | 꾸밈 길 (선, 등급별 굵기 10·7·5·3) | `--map-road` 선, 그 아래 `ml-street-edge`가 `--map-road-edge`로 2 더 굵게 |
| `ml-water` | 강 하나 (판을 가로지르는 띠, 45°로 한 번 꺾임) | `--map-water` |
| `ml-park` | 공원 둘 | `--map-park` |

- **안전 구역 안은 조용하게**: 지도 세계의 안전 구역(땅 판 좌표 x 492~804, y 272~448)에는 블록을 두지 않거나 아주 작게 둔다. 내 길이 꾸밈 길·블록과 섞여 읽히지 않으면 안 된다. 강과 공원은 안전 구역 밖에 둔다.
- 크기: gzip 24KB 이하. 좌표는 정수로 쓴다.

## 3. 표지 묶음 `src/assets/map/map-sprite.svg`

- 하나의 `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` 안에 `<symbol>`만 둔다. 페이지에 한 번 숨겨 넣고(`MapSprite.astro`), 지도는 `<use href="#id">`로 쓴다.
- 색은 토큰 변수로만: `fill="var(--navy)"`처럼 표현 속성에 쓴다 (개념 그림과 같은 방식. `style=""`은 CSP가 막는다). 상태에 따라 바뀌는 것(마디 모양)은 칠 속성을 **쓰지 않아** `<use>`의 CSS를 물려받게 한다.
- 선은 1.5(그림), 2(모양 테두리). 끝과 이음은 둥글게. 그림 속 글자·숫자·로고 없음.

| id | viewBox | 무엇 | 칠 |
|---|---|---|---|
| `mk-node-screen` | 0 0 28 28 | 화면 = 둥근 네모 | 물려받음 |
| `mk-node-store` | 0 0 28 28 | 저장 = 동그라미 | 물려받음 |
| `mk-node-auth` | 0 0 28 28 | 로그인 = 마름모 | 물려받음 |
| `mk-node-data` | 0 0 28 28 | 외부 데이터 = 세모 (꼭짓점 위) | 물려받음 |
| `mk-node-notify` | 0 0 28 28 | 알림 = 오각형 | 물려받음 |
| `mk-node-host` | 0 0 28 28 | 배포·공유 = 육각형 | 물려받음 |
| `mk-fn-screen` … `mk-fn-proxy` | 0 0 24 24 | 기능 그림 7 (`src/assets/icons/fn-*.svg`를 그대로 옮김, `stroke="currentColor"`) | currentColor |
| `mk-start` | 0 0 28 28 | 출발: 남색 둥근 네모 안의 흰 고리 | 고정 |
| `mk-lot` | 0 0 72 56 | 빈 터: 둥근 네모 터, 네 귀퉁이 말뚝과 흰 줄 | 고정 |
| `mk-flag` | 0 0 16 24 | 금색 작은 깃발 | 고정 |
| `mk-bp-record` `mk-bp-form` `mk-bp-page` `mk-bp-quiz` `mk-bp-tool` `mk-bp-board` `mk-bp-unknown` | 0 0 56 40 | 위에서 본 건물 윤곽 (앱 종류 여섯 + 모름). 선만, `stroke="currentColor"` (점선/실선은 CSS가 정한다) | currentColor |
| `mk-scroll` | 0 0 20 14 | 설계도 두루마리 (도착) | 고정 |
| `mk-tunnel` | 0 0 32 20 | 굴: 길이 지나는 아치 (중간 서버) | 고정 |
| `mk-toll` `mk-gap` `mk-lock` `mk-globe` `mk-alert` | 0 0 20 20 | 사고 표시: 요금소(유료), 끊긴 길(빈 칸), 자물쇠(키 노출), 지구본(나라 밖 저장), 경고(그 밖). 흰 테두리 원 안 그림, `fill="var(--jam)"` 바탕 + `var(--on-jam)` 그림 | 고정 |
| `mk-question` | 0 0 20 20 | 물음표 (서행: 알고 그대로 감). `--slow` 바탕 | 고정 |
| `mk-cone` | 0 0 16 16 | 공사 고깔 (나중에 붙일 것) | 고정 |
| `mk-house-1` `mk-house-3` `mk-house-many` | 0 0 24 24 / 0 0 40 32 / 0 0 56 40 | 쓰는 사람: 집 한 채 / 세 채 / 골목 | 고정 |
| `mk-hatch` | `<pattern>` 8×8 (symbol 밖, 같은 svg의 `<defs>`) | 학생 정보 빗금 | `--caution` |
| `mk-car-top` | 0 0 32 18 | 위에서 본 차 (앞이 +x 쪽). 남색 몸체, 금색 줄 하나 | 고정 |
| `mk-done` | 0 0 12 12 | 지나온 마디의 ✓ 표시 | `--flow` 바탕 |

- 크기: gzip 10KB 이하.

## 4. 지도 모형 `src/lib/map/model.ts`

순수 함수다 (DOM·저장소 없음, 같은 입력이면 같은 출력, 시험 있음). 계산은 `evaluate()` 결과를 읽기만 한다.

```ts
mapModel(r: EngineResult, opts?: { focus?: string /* 지금 여는 칸 id */; traffic?: boolean /* 점검: 교통 색 */; arrived?: boolean }): MapModel
layoutMap(input: MapInput): MapModel   // 시험이 32가지 기능 조합을 바로 넣어 볼 수 있게 나눈 안쪽 함수
```

- **점**: 출발 → 마디(칸 순서, `r.slots`의 순서 그대로) → 빈 터. 마디는 1~6개. 마디 수마다 손으로 짠 배치 한 벌(6벌)을 안전 구역 안에 둔다. 두 줄(위 줄 y≈72, 아래 줄 y≈160)로 꺾어 가는 길이 기본이다.
- **마디 상태**: `ghost`(아직) / `open`(지금 여는 곳, `focus`) / `picked`(고름) / `later`(나중으로 미룸: 본선 자리에서 아래나 위로 비켜난 가지 끝, 점선 회색 가지 + 고깔) / `jam`(풀지 않은 막힌 곳이 붙음) / `slow`(그대로 가기로 둔 막힌 곳이 붙음). `traffic`이 아니면 `jam`·`slow`는 쓰지 않는다.
- **길**: 이웃한 두 점 사이 토막마다 `d`(45°·90°, 굽는 곳 반지름 12)와 상태 `ghost`/`built`/`jam`/`slow`/`later`. 앞 점까지 다 됐고 뒤 점이 고름이면 `built`. 본선 전체를 잇는 `routeD`도 낸다 (차가 따라가는 `offset-path`).
- **이름표**: 마디마다 기능 이름(칸의 `label`), 출발('출발'), 빈 터(앱 종류 이름, 없으면 '목적지'). 글자 크기 17(세계 단위), 굵기 700. 위 줄은 마디 위에, 아래 줄은 마디 아래에. 이름표 상자는 서로, 그리고 마디·빈 터·집·표지와 겹치지 않는다.
- **표지**: 막힌 곳의 `anchorSlot` 마디 옆에 하나. 종류는 충돌 id로 고른다: `paid-on-free` → `toll`, 빈 칸 → `gap`, `key-in-static-page`·`key-on-public-host` → `lock`, `personal-server` → `globe`, 그 밖 → `alert`. 그대로 가기로 둔 것은 `question`. `anchorSlot`이 없으면 출발 옆 '길 전체' 자리에 하나만 두고 개수를 함께 낸다.
- **그 밖**: 중간 서버를 고르면 외부 데이터 다음 토막에 굴(`tunnel`), 학생 정보(`sensitive.students`)면 저장 마디 둘레 빗금, 쓰는 사람(`audience.me` 1채 / `audience.few` 3채 / `audience.public` 골목)은 빈 터 옆, 느낌 답(`q.style`)은 `palette`(clean·cute·calm·bold)로.
- **차**: 출발부터 이어서 끝난 마지막 점(도착이면 빈 터 앞)에 선다.
- **한 지도의 기호는 12개 이하**: 마디 + 출발 + 빈 터 + 집 + 굴 + 표지. 넘으면 표지를 '길 전체' 하나로 모은다.
- **요약 글**: `role="img"`에 붙일 한 문장. "목적지 체험학습 신청서. 꼭 고를 것 4개 중 3개 골랐어요. 막힌 곳 1개." 문장 틀은 `src/copy/ko.ts`의 `map` 묶음.

## 5. 지도 섬 `src/components/MapBoard.tsx`

- 같은 컴포넌트를 섬(`client:*`)으로도, 정적 HTML(지시어 없이)로도 쓴다. 홈은 정적.
- 층: 땅 판 → 그림자 → 길(바깥 6 `--route-outer` + 가운데 2 `--route-core`, 아직 난 길은 `--map-ghost` 점선 3) → 굴 → 마디(모양 `<use>` + 16px 기능 그림) → 빈 터·건물 윤곽·깃발 → 집 → 표지 → 이름표(땅색 3px 테두리, `paint-order: stroke`) → 차.
- `variant="mini"`(코스 썸네일 64px)는 이름표·표지·집을 빼고 길과 마디만.
- 길이·색은 토큰만. 움직임(S2·S3·S4·S5·S7)은 T30·T31에서 붙인다. T28은 정지 그림과 상태 바뀜(동작 줄이기에서도 같은 정보)까지.
- 크기: 섬 gzip 8KB 이하.
