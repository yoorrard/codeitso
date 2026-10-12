---
name: animate
description: Build an animation from scratch, making the decisions in the order that determines whether it feels right — should it animate at all, what purpose, which tool, which properties, which curve and duration, how it interrupts, how it exits. Writes the implementation with CSS, @starting-style, WAAPI and the project's motion tokens. Use when asked to animate something, add motion, make a component feel alive, or build a transition. For the game scenes (road map, car, stamp, receipt) also load the game-motion skill.
paths:
  - "src/components/**"
  - "src/layouts/**"
  - "src/styles/**"
  - "src/lib/motion*"
---

> 출처: emilkowalski/skills `skills/animate` @ 2d228630ba1446365f614a108cb8252f1feda202 (MIT, LICENSE 동봉). `STANDARDS.md`는 같은 저장소 `skills/review-animations/STANDARDS.md`.
> 코드쇼퍼에 맞게 고친 곳: 사용자를 기다리게 하는 'Initial Response' 절을 지웠고, 다른 스킬(improve-animations, review-animations,
> find-animation-opportunities, animate-expo, pick-ui-library) 안내를 이 프로젝트의 것으로 바꿨다. Motion 라이브러리·React 전용 예시는
> 이 프로젝트에서 쓰지 않으므로 CSS·WAAPI로 바꿨다. 맨 아래 '코드쇼퍼에서' 절을 더했다. RECIPES.md와 STANDARDS.md는 원문 그대로이며,
> 그 안의 React·Base UI·Motion 예시는 원리만 참고하고 Preact + CSS/WAAPI로 옮겨 쓴다.

# Building Animations

A construction skill. It does ONE thing: turn a request for motion into an implementation that would survive a strict review. Reviews of existing motion are done by the `game-ux-designer` agent using [STANDARDS.md](STANDARDS.md).

## Operating Posture

You are a senior design engineer building the animation yourself. The bar is Emil Kowalski's animation philosophy — the same bar written down in [STANDARDS.md](STANDARDS.md). Write it so it passes that review the first time.

Two failure modes, and the first is worse:

1. **Animating something that shouldn't animate.** The gate below exists to produce zero lines of code sometimes. That's a success, not a dodge.
2. **Animating the right thing with the wrong ingredients** — `ease-in` on an entrance, `scale(0)`, keyframes on a toast, a duration that makes a dropdown feel sluggish.

Never present motion options as a menu. Make the call, state the reasoning in one line, write the code.

## Hard Rules

1. **Run the sequence in order.** Steps 1 and 2 gate everything. Don't reach for a curve before you know whether it animates at all.
2. **No approximated values.** Every curve, duration, and spring config comes from the tables below. Never invent `cubic-bezier(0.4, 0, 0.2, 1)` because it looks familiar.
3. **Extend the codebase's tokens, don't fork them.** If `--ease-out` or a duration scale already exists, use it. Adding a parallel system is a defect.
4. **Reduced motion and hover gating ship with the animation**, not as a follow-up.
5. **Cheapest tool that works.** Don't install a motion library for a fade.

## The Build Sequence

### 1. Should this animate at all?

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | **No animation. Ever.** Stop here. |
| Tens of times/day (hover effects, list navigation) | Near-imperceptible only — fast and subtle, or nothing |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare / first-time (onboarding, success, celebration) | The delight budget lives here |

**Keyboard-initiated actions are a disqualifier, not a judgment call.** Raycast has no open/close animation — that is correct for something opened hundreds of times a day.

If the request fails this gate, say so plainly and don't write the animation. Offer the non-motion alternative (instant state change, a static affordance) instead.

### 2. What is the purpose?

Name it in one of these words before continuing:

- **Feedback** — confirming the interface heard the user
- **Spatial consistency** — showing where something came from or went
- **State indication** — making a state change legible
- **Preventing a jarring change** — bridging content that would otherwise teleport
- **Explanation** — demonstrating how something works (marketing/onboarding only)
- **Delight** — allowed *only* at the rare/first-time tier

Can't name it? Don't build it. "It looks cool" on a frequently-seen element is a reason to stop.

Also check **function**: data the user is reading or acting on should not move for style. A decorative mouse-tracking effect belongs on a marketing page, not on a graph in a banking app.

### 3. Pick the tool — cheapest that works

Walk down; stop at the first that fits.

| Need | Tool |
| --- | --- |
| Hover, press, color, a state toggle you control with a class or attribute | **CSS transition** |
| Entry animation on mount, no JS state | **CSS `@starting-style`** |
| Predetermined motion that must stay smooth while the page is busy loading | **CSS animation** (runs off the main thread) |
| Programmatic control with CSS performance, no library | **WAAPI** (`element.animate()`) |
| Springs | **CSS `linear()` spring tokens** (`--ease-spring`) — no library |
| Sequenced multi-step scenes, FLIP, path following | **WAAPI via `src/lib/motion.ts`** (our ~2 KB helper) |
| Anything beyond that | Record a ruling in docs/DECISIONS.md first; only `motion/mini` (3.4 KB) or animejs's WAAPI module (4.8 KB) are acceptable. Never GSAP, full Motion, Lottie, Rive or three.js |

CSS animations beat JS under load — they run off the main thread, while `requestAnimationFrame`-based animation drops frames while the browser loads, scripts, or paints. Use CSS for predetermined motion, JS for dynamic and interruptible motion.

If the task needs a *component* rather than an animation — a toast, a drawer, a bottom sheet, a dialog — build it on the native element first (`<dialog>`, `<details>`, `popover`) so focus management comes for free, then animate it. Hand-rolling those on a `<div>` is how you end up with no focus management.

### 4. Pick the properties

- **`transform` and `opacity` only.** They skip layout and paint and run on the GPU. `width`/`height`/`margin`/`padding`/`top`/`left` trigger all three. (`clip-path` is the sanctioned fourth — see RECIPES.md. `height` is tolerated only for accordions, where there's no transform equivalent.)
- **Never `scale(0)`.** Start from `scale(0.9–0.97)` + `opacity: 0`. Nothing in the real world appears from nothing.
- **`transform-origin` at the trigger** for popovers, dropdowns, menus, tooltips. **Modals are exempt**; they're not anchored to a trigger, so they stay centered.
- **Percentages in `translate()`** are relative to the element's own size — `translateY(100%)` moves by its own height whatever the content. Prefer over hardcoded pixels.
- **Never drive a child's transform from a CSS variable on the parent** — it recalculates styles for every child. Set `transform` on the element directly.

### 5. Easing and duration — or a spring

**Easing**, in decision order:

| Situation | Easing |
| --- | --- |
| Entering or exiting | `ease-out` |
| Moving / morphing on screen | `ease-in-out` |
| Hover / color change | `ease` |
| Constant motion (marquee, progress) | `linear` |
| Default | `ease-out` |

**Never `ease-in` on UI.** It starts slow, delaying the exact moment the user is watching. `ease-out` at 200ms *feels* faster than `ease-in` at 200ms.

Built-in CSS easings are too weak. Use the project tokens in `src/styles/tokens.css` (`--ease-out`, `--ease-in-out`, `--ease-drawer`, `--ease-spring`), which hold these strong curves:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* strong ease-in-out for on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like drawer curve (Ionic) */
```

Need a curve that isn't there? Add a token first. Don't hand-roll one inline.

**Duration:**

| Element | Duration |
| --- | --- |
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–500ms |
| Marketing / explanatory | Can be longer |

**UI animations stay under 300ms.** A 180ms dropdown feels more responsive than a 400ms one.

**Reach for a spring instead** when the motion is an element that should feel alive (the mascot hop, a stamp landing, a station pin popping). In this project springs are CSS `linear()` curves stored as tokens (`--ease-spring`, roughly Apple's `duration: 0.5, bounce: 0.2`), so they cost 0 KB.

Keep bounce at 0.1–0.3, and avoid bounce in most UI — reserve it for playful, rare moments (stamps, arrivals, celebrations).

### 6. Interruption and exit

- **Transitions, not keyframes, for anything triggered rapidly** — toasts, toggles, anything a user can fire twice in a second. Transitions retarget from the current value; keyframes restart from zero.
- **Springs for gestures**, because they carry velocity through an interruption.
- **Exit the way it entered.** A toast that slides in from the bottom leaves through the bottom. Symmetric paths are what make swipe-to-dismiss feel obvious.
- **Asymmetric timing where the user is deciding.** Slow on the deliberate phase (a hold-to-confirm press: 2s linear), snappy on the system response (release: 200ms ease-out).

### 7. Reduced motion and pointer gating

Ships with the animation, every time.

```css
@media (prefers-reduced-motion: reduce) {
  .element { animation: fade 0.2s ease; } /* keep opacity/color, drop transform-based motion */
}

@media (hover: hover) and (pointer: fine) {
  .element:hover { transform: scale(1.05); } /* touch fires false hovers on tap */
}
```

```ts
import { reduced } from '../lib/motion.ts'; // true for the OS setting OR html[data-motion="reduce"]
const closedX = reduced() ? 0 : '-100%';
```

Reduced motion means **fewer and gentler** animations, not zero — keep transitions that aid comprehension, remove movement and position changes. In this project: movement/scale/parallax/shake/confetti go away; short opacity fades (`--dur-fade`, ≤150ms) stay.

## Recipes

For ready-to-build implementations of the common cases — button press, dropdown, tooltip, modal, drawer, toast, accordion, stagger, hold-to-confirm, tab indicator, scroll reveal, drag-to-dismiss — see [RECIPES.md](RECIPES.md). Load it whenever the request matches one of those components; start from the recipe rather than from a blank file.

## Never Ship

Self-check before you finish. Each of these is an automatic block in review (see STANDARDS.md):

| Never | Instead |
| --- | --- |
| `transition: all` | Name the exact properties |
| `transform: scale(0)` entrance | `scale(0.95)` + `opacity: 0` |
| `ease-in` on a UI element | `ease-out` or a strong custom curve |
| Built-in `ease-out` on a deliberate animation | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Animation on a keyboard shortcut or 100+/day action | No animation |
| UI duration over 300ms with no reason | 150–250ms |
| `transform-origin: center` on a trigger-anchored popover | `var(--transform-origin)` (modals exempt) |
| Keyframes on toasts, toggles, rapidly-triggered elements | CSS transitions |
| Animating `width`/`height`/`margin`/`padding`/`top`/`left` | `transform` / `opacity` |
| Ungated `:hover` motion | `@media (hover: hover) and (pointer: fine)` |
| Missing `prefers-reduced-motion` | Gentler variant, not zero |
| Everything entering at once | 30–80ms stagger |

## Output

Write the code. Then, in at most a few lines:

- **The gate result** — frequency tier and the named purpose. If something in the request was rejected, say which and why.
- **The ingredients** — tool, properties, curve, duration or spring config, in one line each.
- **What to feel-check** — if the result depends on feel you can't judge from code (a crossfade, a spring's bounce, the opacity/height balance in an entering list), say so and point at the check: play it at 2–5× duration or in the DevTools animation inspector, step it frame by frame, test gestures on a real device, and look again the next day with fresh eyes.

Don't pad this into a report. The code is the deliverable.

## Tone

Opinionated and brief. When the honest answer is "this shouldn't animate," give it — that answer is the reason this skill exists. When feel genuinely can't be settled from code, say so instead of guessing at a value.

## 코드쇼퍼에서

- 이 스킬의 'UI 300ms' 규칙은 버튼·칸·창 같은 **UI 조작**에 적용한다. 정류장 도착, 영수증 출력, 도장, 차 이동 같은 **게임 장면**은 드문 순간(delight tier)이며 `docs/UX.md` 4절의 한도(모션 하나 1초 안쪽, 공들인 장면 3초 이하, 누르면 끝 상태로)를 따른다. 장면 설계는 `game-motion` 스킬.
- 모든 길이·곡선은 `src/styles/tokens.css` 변수. TS에서 길이가 필요하면 `src/lib/motion.ts`의 `dur('--dur-base')`로 읽는다 (동작 줄이기면 0 또는 fade 값).
- 모든 모션은 누르면(또는 Esc·건너뛰기 버튼) 끝 상태로 간다: `skipAll()`.
- 결과는 글로도 알린다 (`aria-live`). 모션이 끝나기를 기다려야 다음 행동을 할 수 있게 만들지 않는다.
- 키보드로 자주 하는 동작(인터뷰 보기 고르기 → 다음 질문)은 300ms 안쪽의 가벼운 전환만.
