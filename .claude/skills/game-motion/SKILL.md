---
name: game-motion
description: 코드쇼퍼의 게임 연출(노선도와 차 이동, 정류장 열림, 기사님 반응, 담기 비행, 신호등, 영수증 출력과 도장, 색종이, 주행 거리 계기판, 3D 카드 뒤집기, 페이지 전환, 효과음)을 정해진 기술층과 예산 안에서 구현한다. 모션·장면·효과음·3D 효과를 만들거나 고칠 때 쓴다.
paths:
  - "src/components/**"
  - "src/layouts/**"
  - "src/styles/**"
  - "src/lib/motion*"
  - "src/lib/sfx*"
---

# 게임 연출 구현

무엇을 움직이나(장면 목록·길이·동작 줄이기 대체)는 `docs/UX.md` 4절이 정한다. 이 스킬은 **어떻게** 만드는지 정한다. 낱낱의 모션 판단(움직일지, 곡선, 길이)은 `animate` 스킬을 따른다.

## 원칙

1. 모션은 지금 위치와 바뀐 것을 알려 준다 (R-08). 장식만을 위한 끝없는 반복은 없다 (5초 넘는 자동 반복 금지, WCAG 2.2.2).
2. 모션 하나 1초 안쪽, 공들인 장면 3초 이하. **누르면(또는 Esc·건너뛰기 버튼) 끝 상태로.** 기다려야 다음 행동을 할 수 있게 만들지 않는다.
3. 동작 줄이기(기기 설정 또는 `html[data-motion="reduce"]`): 이동·확대·시차·흔들림·색종이를 없애고, 바뀐 것을 보여 주는 짧은 투명도 전환(`--dur-fade`)만 남긴다. 끝 상태가 바로 보인다.
4. 움직임이 알려 주는 것은 글로도 알린다 (`aria-live`). 색만으로 뜻을 전하지 않는다.
5. 번쩍임 초당 3번 미만. 신호등 불은 하나에 350ms 이상.

## 기술층 (싼 것부터, 위에서 해결되면 아래로 가지 않는다)

| 층 | 무엇 | 비용 |
|---|---|---|
| L0 | CSS 전환·키프레임, `@starting-style`, `linear()` 스프링 토큰, `offset-path`, CSS 3D(`perspective`, `preserve-3d`), SVG `stroke-dashoffset`, 문서 간 View Transitions(`@view-transition { navigation: auto }`) | 0KB |
| L1 | `src/lib/motion.ts`: `reduced()`, `dur()`, `play()`, `skipAll()`, `flip()`, `followPath()` / `src/lib/sfx.ts`: 효과음 켰을 때만 동적 import | 약 2KB |
| L2 | `canvas-confetti` (ISC, 4.3KB) — 계산대에서만 지연 로드, `disableForReducedMotion: true`, `useWorker: false` | 지연 4.3KB |
| L3 | (필요할 때만, 결정 기록 후) `motion/mini` 3.4KB 또는 animejs WAAPI 4.8KB | — |
| 금지 | GSAP, Motion 전체, Lottie, Rive, three.js, react-three-fiber (예산·라이선스·WASM 크기 때문, `docs/DECISIONS.md`) | — |
| 시험 | 진짜 WebGL은 홈 장면 하나만, `ogl`(14KB)로, 선택 과제(T16b)에서만 — 정지 그림이 먼저, 유휴 시간 뒤 지연 로드, 동작 줄이기·Save-Data·WebGL 없음이면 안 띄움 | 지연 ≤ 200KB |

## `src/lib/motion.ts` 약속

```ts
reduced(): boolean                        // 기기 설정 || html[data-motion="reduce"]
dur(token: `--dur-${string}`): number     // CSS 변수에서 ms 읽기 (줄이기면 0, --dur-fade만 유지)
play(el, keyframes, opts): Animation      // element.animate 감싸기: 토큰 길이·곡선, 줄이기면 끝 상태로 바로
skipAll(root = document): void            // root 안 실행 중 애니메이션을 모두 finish()
flip(from: Element, to: Element, opts)    // 담기 비행(M3): 유령 사본을 만들어 호를 그리며 이동 후 제거
followPath(el, path: SVGPathElement, from, to, opts) // 노선도 차 이동(M1): offset-distance 애니메이션
```

- 화면 아무 곳 누르기·Esc·"건너뛰기" 버튼은 장면 안에서 `skipAll(sceneRoot)`.
- 장면이 끝나면 초점·`aria-live` 알림을 정리한다. 모션 중에도 버튼은 눌린다.
- 길이를 숫자로 적지 않는다 (품질 바닥선 검사가 막는다). 늘 `dur('--dur-…')`.

## 장면 만드는 법

| 장면 | 기법 | 동작 줄이기 |
|---|---|---|
| M1 노선도 차 이동 | (D49로 구현됨) 첫 그림 전 스크립트가 앞 정류장을 `--from`·`html[data-drive]`로 붙이고, `frame.css`가 차를 `(--here - --from) × 20cqi` 뒤에서 출발시켜 `--dur-move` `--ease-in-out`으로 달리게 한다. 지나온 길은 막대 하나를 `clip-path`로 같이 칠한다. 전환 중에는 화면을 누를 수 없으므로 차 이동을 View Transitions에 싣지 않는다. 곧은 길이 아니게 되면 `offset-path` + `followPath()`로 바꾼다 | 차가 정류장에 바로, 구간 바로 칠함, fade |
| M2 차 문 열기 | CSS 3D 문 `rotateY(-75deg)` `perspective: 600px` 350ms, 기사님 `@starting-style`(0.95→1) 등장 + 손 흔들기(팔 조각 ±12°, 조각 그림이 있을 때) | 문 열린 정지, fade |
| M3 담기 | `flip()` 유령 상자가 호를 그리며 장바구니 칸으로 550ms, 칸 200ms 통통, 주행 거리 증가, 효과음 '톡' | 비행 없음, 확인 표시와 알림만 |
| M4 영수증 출력·도장 | 종이가 프린터 틈에서 `steps()`로 나옴(1.2~2초), 줄이 40ms 간격으로 나타남. 도장은 1.3→1 확대·−8° 회전 `--ease-spring` 250ms + 3px 흔들림 150ms + '쿵'. 색종이 1.2초 | 완성 영수증·도장 바로, 색종이·흔들림 없음 |
| M5 카드 뒤집기 | `preserve-3d` + `rotateY(180deg)` 400ms, 뒷면 `backface-visibility: hidden`, 보이지 않는 면은 `inert`, 버튼은 `aria-pressed` | 150ms 크로스페이드 |
| M6 신호등 | 불이 차례로 켜짐(각 ≥350ms), 결과는 아이콘+글로 남음. 충돌 항목 한 번 흔들림(4px, 250ms, 줄어듦) | 결과만 |
| M7 도장판·정류장 열림·주행 거리 | 자물쇠 고리가 돌며 열림, 정류장 핀 0.9→1.05→1(300ms). 주행 거리는 숫자 기둥이 `translateY`로 굴러감(600ms, `tabular-nums`), `role="progressbar"`와 글("정류장 5곳 중 2곳, 12km") | 값만 바뀜 |
| M8 홈 '출발' 장면 (2~3초) | `perspective` 컨테이너에 도로 `rotateX(60deg)`, 차선은 반복 그라데이션을 transform으로 흘림, 길가 소품은 속도 다르게(시차). 누르면 끝 | 정지 그림 |
| 기사님 | 등장 때 한 번 통통(끝없는 반복 금지), 누르면 120ms 찌그러짐, 정류장마다 말풍선(타자 효과 ≤ 1초, 누르면 전체 표시) | 정지, 말풍선 바로 |
| 페이지 전환 | `@view-transition { navigation: auto }` + 머리말에 `view-transition-name` (차 이동은 새 페이지에서, D49). Firefox 등 미지원 브라우저는 그냥 이동 | `::view-transition-*` 애니메이션 없음 (기기 설정과 `data-motion` 둘 다) |

'손맛(juice)' 크기는 토큰으로 맞춘다: `--juice-s|m|l` (확대 비율, 흔들림 px, 길이). 드문 순간일수록 크게, 자주 하는 조작일수록 작게.

## 효과음 (`src/lib/sfx.ts`)

- 기본 **꺼짐**. 설정에서 켜면 그때 `import('./sfx-engine.ts')`로 불러온다 (ZzFX MIT 1.2KB 또는 직접 쓴 WebAudio 합성). 소리 파일을 싣지 않는다 (0KB).
- `AudioContext`는 하나만, 사용자가 누른 뒤에 만든다. 기본 음량 0.3. 소리가 뜻을 전하는 유일한 수단이 되지 않는다.
- 소리 목록: 탭(톡), 담기(뿅), 정류장 도착(딩동), 신호 초록(삐빅), 도장(쿵), 영수증 출력(드르륵, 짧게), 축하(빰빠밤, 1초 안쪽).

## 3D 느낌 자산

- 정류장·상품·보상 아이콘: Fluent Emoji 3D (MIT) 128px webp (약 3~4KB). `public/emoji/`에 직접 두고 크레딧 페이지에 고지.
- UI 아이콘: Phosphor(MIT) duotone/fill SVG를 빌드 때 인라인.
- 기사님: `src/assets/mascot/` (Astro `<Picture>`로 360w·720w webp/avif).

## 끝내기 전에

- `/visual-qa`의 `360-reduce` 스크린샷에서 끝 상태가 바로 보이는지 본다.
- e2e에서 장면 중간에 누르면 끝 상태가 되는지, 동작 줄이기에서 흐름이 끝까지 되는지 확인한다.
- `npm run qa:budget`: 첫 화면 JS 100KB, 페이지 그림 300KB, 지연 묶음 200KB 안.
- 큰 장면은 `game-ux-designer` 에이전트에게 검토를 맡긴다.
