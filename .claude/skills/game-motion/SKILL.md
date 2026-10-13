---
name: game-motion
description: 코드쇼퍼의 게임 연출(자라는 길 지도, 단계 줄, 배차·고르기·교통 정보·출발 → 도착 같은 대표 장면 S1~S9, 영수증 출력, 숫자 굴리기, 페이지 전환, 효과음, 미리 구운 3D 렌더)을 정해진 기술층과 예산 안에서 구현한다. 모션·장면·효과음·3D 효과를 만들거나 고칠 때 쓴다.
paths:
  - "src/components/**"
  - "src/layouts/**"
  - "src/styles/**"
  - "src/lib/motion*"
  - "src/lib/sfx*"
  - "src/lib/map/**"
---

# 게임 연출 구현

무엇을 움직이나(장면 목록·길이·동작 줄이기 대체)는 `docs/CONCEPT.md` 7절(S1~S9)이 정한다. 이 스킬은 **어떻게** 만드는지 정한다. 낱낱의 모션 판단(움직일지, 곡선, 길이)은 `animate` 스킬을 따른다.

## 원칙

1. 모션은 지금 위치와 바뀐 것을 알려 준다 (R-08). 대표 그림은 **자라는 길 지도**이고, 움직임은 엔진 결과(고른 도구, 막힌 곳, 미룬 것)를 그대로 그린다. 장식만을 위한 끝없는 반복은 없다 (5초 넘는 자동 반복 금지, WCAG 2.2.2).
2. 모션 하나 1초 안쪽, 대표 장면(S5) 2.8초 이하. **누르면(또는 Esc·건너뛰기 버튼) 끝 상태로.** 기다려야 다음 행동을 할 수 있게 만들지 않는다.
3. 동작 줄이기(기기 설정 또는 `html[data-motion="reduce"]`): 이동·확대·기울기·흔들림을 없애고, 바뀐 것을 보여 주는 짧은 투명도 전환(`--dur-fade`)만 남긴다. 끝 상태가 바로 보이고, 정지한 지도만으로 모든 정보가 보인다.
4. 움직임이 알려 주는 것은 글로도 알린다 (`aria-live`). 색만으로 뜻을 전하지 않는다 (막힘·서행·원활에는 늘 그림과 글).
5. 번쩍임 초당 3번 미만. 한 번에 움직이는 길은 둘까지. `transform`·`opacity`·`stroke-dashoffset`만 움직이고 `filter: blur`는 쓰지 않는다.
6. 싸 보이는 연출을 하지 않는다 (CONCEPT 5.9): 색종이, 축하 팡파르, 카드마다 hover 확대, 섹션마다 떠오르는 등장, 사람 캐릭터.

## 기술층 (싼 것부터, 위에서 해결되면 아래로 가지 않는다)

| 층 | 무엇 | 비용 |
|---|---|---|
| L0 | CSS 전환·키프레임, `@starting-style`, `linear()` 스프링 토큰, `offset-path`·`offset-rotate`, `@property` 색 넘기기, CSS 3D(지도 층 기울이기 하나), SVG `stroke-dashoffset`, 문서 간 View Transitions(`@view-transition { navigation: auto }`, 240ms 안쪽) | 0KB |
| L1 | `src/lib/motion.ts`: `reduced()`, `dur()`, `play()`, `skipAll()`, `flip()`, `followPath()` / `src/lib/sfx.ts`: 효과음 켰을 때만 동적 import | 약 2KB |
| L2 | 미리 구운 3D 렌더 그림 (`npm run art`, 개발용 three는 devDependency만, src에서 import 금지) | 그림 예산 안 |
| 금지 | GSAP, Motion 전체, Lottie, Rive, 실행 중 three.js·WebGL, canvas-confetti (D26·D54·D56) | — |

## `src/lib/motion.ts` 약속

```ts
reduced(): boolean                        // 기기 설정 || html[data-motion="reduce"]
dur(token: `--dur-${string}`): number     // CSS 변수에서 ms 읽기 (줄이기면 0, --dur-fade만 유지)
play(el, keyframes, opts): Animation      // element.animate 감싸기: 토큰 길이·곡선, 줄이기면 끝 상태로 바로
skipAll(root = document): void            // root 안 실행 중 애니메이션을 모두 finish()
flip(from: Element, to: Element, opts)    // 고르기(S3): 기능 타일 유령 사본이 호를 그리며 지도 마디로 이동 후 제거
followPath(el, path: SVGPathElement, from, to, opts) // 지도 위 차 이동(S1·S5·S8): offset-distance 애니메이션
```

- 화면 아무 곳 누르기·Esc·"건너뛰기" 버튼은 장면 안에서 `skipAll(sceneRoot)`. 기본 틀이 `cc:skip` 신호도 보낸다 (숫자 굴리기처럼 애니메이션 객체가 아닌 것).
- 장면이 끝나면 초점·`aria-live` 알림을 정리한다. 모션 중에도 버튼은 눌린다.
- 길이를 숫자로 적지 않는다 (품질 바닥선 검사가 막는다). 늘 `dur('--dur-…')`.
- 큰 장면(S1, S5)은 처음 한 번만 다 보인다 (`cc:seen:v1`, `markSceneSeen`). 다시 열면 끝 상태가 바로 보인다.

## 지도 위 움직임

- 지도는 위에서 내려다본 평면 SVG(2.5D)다. 지도 좌표(viewBox)와 같은 크기의 고정 층을 `transform: scale()`로 화면에 맞추고, 그 층 안에서 `offset-path: path()`를 쓴다. 그래서 어느 폭에서도 SVG 길과 차가 정확히 겹친다.
- 지도 위에는 **위에서 본 그림만** 올린다 (차 렌더 한 장을 `offset-rotate: auto`로 돌린다). 3/4 시점 렌더는 지도 밖에만.
- 길 그리기는 `pathLength="1"` + `stroke-dasharray: 1` + `stroke-dashoffset` 1 → 0.

## 장면 만드는 법 (CONCEPT 7절)

| 장면 | 기법 | 동작 줄이기 |
|---|---|---|
| S1 홈 첫 방문 | 지도 1.04 → 1 가라앉기(`--dur-settle`) + 본보기 길 `stroke-dashoffset`(`--dur-draw`) + 차가 가장자리에서 출발 표지로 `offset-path`(강한 감속) + 출발 고리 한 번 | 다 그려진 지도와 서 있는 차 |
| S2 지도가 자라요 (만들 앱 정하기, 답마다) | 답 하나에 변화 하나: 마디 점선이 톡 생김(`--dur-pop` 스프링), 길 이어 그리기, 청사진 윤곽 비침, 느낌 답이면 `@property` 색 넘기기 | 150ms 페이드로 바뀐 것만 |
| S3 정하면 이어져요 (도구 고르기, [{도구}로 정하기]) | `flip()` 기능 타일이 호를 그리며 지도 마디로(`--dur-fly`), 마디 채움(스프링), 점선 → 실선(`--dur-draw`), 상태 숫자 굴리기(`--dur-roll`) | 마디와 길이 바로 바뀜, 낭독만 |
| S4 맞춰 보기 (도구끼리 맞춰 보기) | 길 위 교통 색 덮기, 막힌 구간 두 번 숨쉬기(1초에 3번 미만), 풀면 빨강이 걷히고 초록, 그대로 가면 노랑 + 물음표, 다 풀리면 청록 짧은 대시 하나가 출발에서 빈 터까지 훑음(`--dur-sweep`) | 색·그림·글만 바뀜 |
| S5 출발 → 도착 (대표 장면) | 밤 주행 모드 → 지도 층이 1.2배로 기울며 차를 따라가고(`--ease-drive`), 마디마다 ✓ → 전조등 두 번 깜빡임(`--dur-blink`, 브랜드 서명 모션) → 빈 터에 청사진 실선과 설계도 두루마리 → 낮으로 돌아오며 시트와 영수증 출력(S6). S5+S6 합계 `--dur-scene`(3.0초) 이하 (설계서 7절) | 150ms 페이드로 끝 상태 |
| S6 영수증 출력과 도장 | 종이가 `steps()` 프린터 박자로 `clip-path`(`--dur-print`), '코드쇼퍼 · 요금 0원' 도장 1.3 → 1(`--dur-stamp`). 색종이 없음 | 다 나온 영수증과 도장 |
| S7 단계 이동 | 문서 간 View Transitions: 지도(`view-transition-name: map`)와 단계 줄(`rail`)은 제자리, 시트 내용만 바뀜. 새 페이지에서 마친 단계에 ✓ | 전환 없음 |
| S8 연습 마침 (내 AI 써 보기) | 차가 연습 고리를 한 바퀴(S1과 같은 이동 함수), 고리가 청록 심으로 채워짐 | 고리가 바로 채워짐 |
| S9 용어 카드 읽음·정답 | 청사진 판이 왼쪽부터 색으로 채워짐(마스크), 다 맞히면 남색 고리 위로 청록 빛이 한 바퀴(`stroke-dashoffset`) | 바로 바뀜 |
| 누르기·기사 메시지 | 누르기 0.97(`--dur-tap`), 기사 메시지 `@starting-style` 등장(`--dur-ui`), 다음 행동이면 한 줄로 접힘 | 없음 / 바로 보임 |

'손맛' 크기는 토큰으로 맞춘다. 드문 순간(홈 첫 방문, 정하기, 다 풀림, 도착, 연습 마침)일수록 크게, 자주 하는 조작(보기 고르기, 기능 펼치기)일수록 300ms 안쪽의 조용한 전환으로.

## 효과음 (`src/lib/sfx.ts`)

- 기본 **꺼짐**. 설정에서 켜면 그때 `import('./sfx-engine.ts')`로 불러온다 (ZzFX MIT 또는 직접 쓴 WebAudio 합성). 소리 파일을 싣지 않는다 (0KB).
- `AudioContext`는 하나만, 사용자가 누른 뒤에 만든다. 기본 음량 0.3. 소리가 뜻을 전하는 유일한 수단이 되지 않는다.
- 소리 목록: 누르기(톡), 길 찾음(두 음), 고르기(뿅), 다 풀림(올라가는 두 음), 출발(낮은 바람 0.6초), 도착(세 음 차임), 도장(쿵). 축하 팡파르는 없다.

## 그림 자산

- 지도 땅 판·마디·표지·기능 그림·청사진 자리 표시는 직접 그린 SVG (`svg-illustrator`, CONCEPT 9절 (a)).
- 미니어처 렌더(차, 앱 종류 건물 여섯, 빈 터)는 소유자 원본(`assets-src/art/`)을 `npm run art`가 조명 한 벌로 굽는다. 오기 전에는 청사진 자리 표시가 정식 자산이다.
- UI 아이콘: Phosphor Regular 한 가지 모양을 빌드 때 인라인 (`src/lib/icons.ts`).

## 끝내기 전에

- `/visual-qa`의 `360-reduce` 스크린샷에서 끝 상태가 바로 보이는지 본다. 밤 모드 360도 본다.
- e2e에서 장면 중간에 누르면 끝 상태가 되는지, 동작 줄이기에서 흐름이 끝까지 되는지 확인한다.
- `npm run qa:budget`: 첫 화면 JS 100KB, 페이지 그림 300KB, 지연 묶음 200KB 안.
- 큰 장면은 `game-ux-designer` 에이전트에게 검토를 맡긴다.
