---
name: accessibility
description: Auditing or building UI for WCAG 2.2 AA in this Astro + Preact Korean app (코드쇼퍼, lang="ko", 360px baseline). Use when creating or changing components, pages, layouts or styles, when a screen needs keyboard, focus, dialog or sheet, aria-live, form, contrast, 44px target, reflow or reduced-motion work, or when asked for an a11y or WCAG audit. Verify with /visual-qa, npm run e2e (@axe-core/playwright) and keyboard-only e2e.
license: MIT (see LICENSE in this folder)
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/layouts/**"
  - "src/styles/**"
---

> Source: [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) `skills/accessibility` (SKILL.md, references/WCAG.md, references/A11Y-PATTERNS.md) at commit `afa8da942115f2961fdbfa80807ea0b232ff6c00`, MIT License (copy in `LICENSE`).
> Changed (by 코드쇼퍼): Korean/`lang="ko"` and Preact/Astro examples; 44px target rule; reduced-motion kill switch replaced by the token policy (`--dur-fade` kept); dialog/sheet focus, focus-not-obscured and live-region guidance tied to our layout; testing via `/visual-qa`, `npm run e2e` + `@axe-core/playwright` and keyboard-only e2e instead of Lighthouse/DevTools MCP/global axe CLI; "코드쇼퍼 특이점" section added; large-text threshold corrected to px; two references merged into one; autonomy rule added ("decide, record in docs/DECISIONS.md, continue").

# Accessibility (a11y): WCAG 2.2 AA for 코드쇼퍼

Every screen must pass WCAG 2.2 Level A and AA at 360px, with the keyboard only, with a screen reader reading Korean, at 200% text size and with reduced motion. Where this project is stricter than WCAG (44px targets, color + icon + text), the project rule wins. AAA items we get almost free are adopted too: 2.5.5 (44px targets), 2.4.13 (3px focus ring), 2.3.3 (reduced-motion setting).

Agents run autonomously here. When a case is not covered below or in `docs/UX.md` §6, choose the more accessible option, record it in `docs/DECISIONS.md` (what and why, one entry), and continue. Never stop to wait for an answer.

Korean strings in the examples are illustrations. Real UI text lives in `src/copy/ko.ts`; colors, sizes and durations come only from `src/styles/tokens.css`.

## Workflow

1. Before building, read the screen's section in `docs/UX.md` (§3 screens, §4 motion, §6 accessibility checklist).
2. Build with native HTML first. Add ARIA only for state HTML cannot express.
3. Run `/visual-qa` for the routes you touched. Read `.qa/report.md` and `.qa/axe.json`, then open the 360px and reduced-motion screenshots with the Read tool.
4. Check names, roles, states, landmarks and heading order in the accessibility tree with Playwright's `locator.ariaSnapshot()` or `expect(locator).toMatchAriaSnapshot()`.
5. Walk the whole flow with the keyboard only (see Testing).
6. Fix the source component, then re-run the same checks.

Automated tools find only part of the barriers. "axe serious/critical = 0" is the floor, not proof of conformance.

## Perceivable

### Text alternatives (1.1.1)

```astro
---
import { Image } from 'astro:assets';
import lot from '../assets/art/P01.png';
---
<!-- Informative: one sentence, "무엇이 무엇을 하는 그림" (.claude/rules/copy.md) -->
<Image src={lot} alt="말뚝과 줄로 자리를 잡은 빈 터에 설계도 두루마리가 놓인 그림" />
<!-- Decorative: the text beside it already says everything -->
<Image src={lot} alt="" />
```

- Astro's `<Image>` will not build without `alt`; `alt=""` is the explicit "decorative" answer. Never start alt with "이미지" or "그림".
- Inline SVG (car, stops, road map): decorative gets `aria-hidden="true"`; informative gets `role="img"` and `aria-label`.
- Icon-only buttons get a Korean name and hide the icon: `<button type="button" aria-label="사전 열기"><BookIcon aria-hidden="true" /></button>`. Screen-reader-only text uses the `.visually-hidden` class (reference file).
- If a control has visible text, its accessible name must contain that text (2.5.3). Don't override "영수증 복사" with `aria-label="복사"`.

### Contrast (1.4.3, 1.4.11)

| What | AA minimum |
|---|---|
| Body text (< 24px, or < 18.66px bold) | 4.5:1 |
| Large text (≥ 24px, or ≥ 18.66px bold) | 3:1 |
| Input borders, icons, focus ring, component edges | 3:1 |

WCAG defines large text as 18pt / 14pt bold, which is 24px / 18.66px. With our tokens only `--text-xl` (28px) and `--text-2xl` (36px) count as large at regular weight; `--text-lg` (20px) counts only when bold. Hangul gets no discount.

Use the token pairs documented in `tokens.css`: text is `--ink` / `--ink-soft` on `--paper` or `--receipt`; input borders use `--ink-soft` (`--line` is decorative only); `--taxi` is a fill with `--ink` text, never a text color; on the `--road` band text is `--paper` and focus is `--focus-on-dark`; warning text is `--caution-ink`. A new color becomes a token with its measured contrast in a comment, then the T02 contrast check runs again. Never a raw hex in a component.

### Use of color (1.4.1)

Meaning never rests on color alone. A conflict is not just a red border:

```tsx
<li class="conflict conflict--open">
  <StopIcon aria-hidden="true" /> <strong>충돌</strong> {conflict.text}
</li>
```

### Reflow, resize, text spacing (1.4.4, 1.4.10, 1.4.12)

- No horizontal page scroll at 320 CSS px wide (1280px at 400% zoom). The 360px baseline is not enough on its own; test 320 too.
- At 200% text size nothing clips or overlaps: sizes are rem tokens, text containers get `min-height`, never a fixed `height`.
- Raised text spacing (line height 1.5, paragraphs 2em, letters 0.12em, words 0.16em) must not cut content off.
- The D2Coding receipt has fixed columns. Let lines wrap at narrow widths; a block that must keep its columns scrolls inside its own `<div role="region" aria-label="영수증" tabindex="0">` so keyboard users can scroll it (axe `scrollable-region-focusable`). The page itself never scrolls sideways.
- Audio and video are not in phase 1. If added: Korean captions (`<track kind="captions" srclang="ko">`), a transcript, no autoplay with sound. Sound effects default to off and never carry meaning alone.

## Operable

### Keyboard (2.1.1, 2.1.2, 2.1.4)

Native `<button>`, `<a href>` and form controls bring focus, Enter/Space activation and semantics. Do not add `onKeyDown` to a `<button>`: Enter and Space already fire `click`, so a key handler double-triggers.

```tsx
{/* Bad: not focusable, no keyboard activation */}
<div class="card" onClick={addToCart}>담기</div>
{/* Good: click covers mouse, touch, Enter and Space. Navigation uses <a href>. */}
<button type="button" onClick={addToCart}>담기</button>
```

- A main button that stays off until it is allowed ("영수증 뽑기" before `canIssue`): use `aria-disabled="true"` (still focusable; the handler returns early) plus the reason as visible text linked with `aria-describedby`. Native `disabled` drops it from Tab order, so the reason is never reached.
- No keyboard traps: Tab and Shift+Tab can always leave a component. The only exception is a modal dialog, which holds focus until Esc or its close button.
- No single-character shortcuts (2.1.4). If one is ever added, it must be possible to turn it off.

### Focus visible (2.4.7)

```css
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; } /* never `outline: none` alone */
.road :focus-visible { outline-color: var(--focus-on-dark); }
```

Use `outline`, not only `box-shadow`: Windows forced-colors mode removes box-shadows but keeps outlines.

### Focus order and focus management (2.4.3)

- DOM order matches visual order. No positive `tabindex`.
- When an island replaces the main content without a page load (interview: next question), move focus to the new heading and update `document.title` (UX.md §6). Leave focus alone on the first render.

```tsx
const heading = useRef<HTMLHeadingElement>(null);
const firstRender = useRef(true);
useEffect(() => {
  if (firstRender.current) { firstRender.current = false; return; }
  heading.current?.focus();
}, [question.id]);
// <h2 ref={heading} tabIndex={-1} id={`q-${question.id}`}>{question.text}</h2>
```

### Dialogs and sheets

The dictionary panel (bottom sheet on phones, right panel on wide screens) and confirmations such as "덮어쓸까요?" use the native `<dialog>`:

- Open with `showModal()`: the page behind becomes inert and focus moves inside (first focusable control, or the one with `autofocus`).
- Esc fires `cancel` and closes it. Keep that; don't `preventDefault` it.
- Name it with `aria-labelledby` pointing at its heading.
- On close, return focus to the trigger explicitly (remember `document.activeElement` before opening).
- A wide-screen side panel that covers nothing may use `show()` (non-modal): no trap, but Esc and focus return still apply, and Esc needs your own `keydown` handler (only modal dialogs get it natively).
- A sheet that can be dragged down also has a visible "닫기" button (2.5.7).

The full Preact component is in [references/criteria-and-patterns.md](references/criteria-and-patterns.md#dialog-and-bottom-sheet).

### Focus not obscured (2.4.11)

The road-map header, the bottom progress bar and the fixed dictionary button sit over the content. A focused element must never be fully hidden behind them. Keep the bar heights as tokens (`--bar-top`, `--bar-bottom` in `tokens.css`, added together with the bars) and reserve that space when the browser scrolls focus into view:

```css
html { scroll-padding-block: var(--bar-top) var(--bar-bottom); }
```

The keyboard e2e asserts that the focused element's center is not covered (helper in the reference file).

### Skip link and landmarks (2.4.1, 1.3.1)

- First focusable element in the layout: `<a class="skip-link" href="#main">본문으로 건너뛰기</a>`, target `<main id="main" tabindex="-1">`.
- Landmarks: `<header>` with the road map as `<nav aria-label="정류장">`, one `<main>`, one `<h1>` per page, headings in order.

### Target size (2.5.8; stricter here)

WCAG AA asks for 24×24 CSS px. **Project rule: every tap target is at least 44×44 (`min-block-size` and `min-inline-size: var(--tap)`)**: buttons, icon buttons, chips, tabs, option cards, copy and close buttons. Only links inside running text are exempt. Grow the hit area with padding, not the icon. `/visual-qa` reports anything smaller.

### Pointer input (2.5.1, 2.5.2, 2.5.7)

- Run the action on `click` (fires on release), never on `pointerdown` or `touchstart`, so a finger can slide off to cancel. Press feedback may start on press; the action waits for click.
- Every drag has a single-pointer alternative: drag-to-close sheet → "닫기" button; any reordering → up/down buttons.
- No multi-finger gestures or device-motion triggers without a button that does the same.

### Timing, motion and flashing (2.2.1, 2.2.2, 2.3.1, 2.3.3): project policy

There are no time limits. Scenes play at most 3s and can be skipped; anything that moves, blinks or auto-updates for more than 5s would need pause/stop/hide, so don't build idle loops.

Under reduced motion we remove movement, scale, parallax and flashing, and keep short opacity cross-fades (≤ 150ms, `--dur-fade`) so state changes stay visible. Reduced motion comes from the OS (`prefers-reduced-motion: reduce`) or the site setting (`<html data-motion="reduce">`); both must work.

Do not use the global `* { animation-duration: 0.01ms !important }` kill switch: it also deletes the fades that show what changed. In `tokens.css` the movement tokens go to 0 and `--dur-fade` stays (add `--dur-fade: 150ms` to `:root` if it is not there yet):

```css
@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; --dur-door: 0ms; --dur-print: 0ms; }
}
:root[data-motion='reduce'] {
  --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; --dur-door: 0ms; --dur-print: 0ms;
}
/* Movement jumps to its end state; the fade still runs */
.slot-check { transition: transform var(--dur-base) var(--ease-out), opacity var(--dur-fade) linear; }
/* Decorative movement (hover lift, press scale, parallax, shake) is opt-in */
@media (prefers-reduced-motion: no-preference) {
  :root:not([data-motion='reduce']) .card:hover { transform: translateY(-2px); }
}
```

Web Animations API scenes (`src/lib/motion.ts`, see the `game-motion` skill) read the same state and the same tokens:

```ts
const css = () => getComputedStyle(document.documentElement);
const ms = (token: string) => parseFloat(css().getPropertyValue(token)) || 0; // tokens are in ms
export const reducedMotion = () =>
  document.documentElement.dataset.motion === 'reduce' ||
  matchMedia('(prefers-reduced-motion: reduce)').matches;

const anim = reducedMotion()
  ? el.animate({ opacity: [0, 1] }, { duration: ms('--dur-fade') })
  : el.animate(carKeyframes, { duration: ms('--dur-slow'), easing: css().getPropertyValue('--ease-out').trim() });
scene.addEventListener('click', () => anim.finish()); // tap skips to the end state
```

- Each motion < 1s; showcase scenes ≤ 3s (M4 print ≤ 2.2s). Input is never blocked while a scene plays.
- What a motion tells (new position, what changed) is also announced in text through the live region.
- Nothing flashes 3 or more times per second.

## Understandable

### Language and predictability (3.1.1, 3.1.2, 3.2.1, 3.2.2)

- `<html lang="ko">` on every page. Mark real foreign-language passages, e.g. an English error quoted in the dictionary: `<code lang="en">TypeError: Failed to fetch</code>`. Product names and established terms (API, JSON) need no `lang`.
- Focus never changes context: nothing navigates or opens on focus.
- Changing a control's value never changes context by itself. That is why interview options are buttons, not radios (D19): arrow keys move through a radio group and would advance the interview. Same for `<select>`: no navigation on `change`; add a button.

### Consistent navigation, identification and help (3.2.3, 3.2.4, 3.2.6)

- The road map, the dictionary button and the bottom progress bar keep the same place and order on every page.
- The dictionary is this site's help mechanism: 3.2.6 requires it in the same relative order on every page that has it.
- The same function keeps the same name everywhere ("복사" is always "복사"); labels come from `src/copy/ko.ts`.

### Forms (1.3.5, 3.3.1, 3.3.2, 3.3.3)

```tsx
<label for="free-text">만들고 싶은 걸 한 줄로 적어 주세요 (선택)</label>
<input id="free-text" type="text" maxLength={80} aria-describedby="free-text-hint" />
<p id="free-text-hint">이름, 학교 이름, 연락처는 적지 마세요. 이 글은 공유 링크에 들어가지 않아요.</p>
```

- Every input has a visible `<label>`. A placeholder is not a label.
- Errors: `aria-invalid="true"`, the message linked with `aria-describedby`, saying what is wrong and how to fix it. On submit, focus the first invalid field (pattern in the reference file).
- Character counters announce politely near the limit, not on every keystroke. The dictionary search is `<input type="search">` with a label; its result count goes to the live region.
- If a personal-data field is ever added, give it the matching `autocomplete` token (1.3.5).

### Redundant entry (3.3.7) and accessible authentication (3.3.8)

- Answers, cart and choices live in localStorage through `src/lib/store.ts`; never ask for them twice. "이전" returns to the question with the earlier answer marked (`aria-pressed="true"`); recipes and share links pre-fill everything.
- Phase 1 has no accounts. If any sign-in is ever added: allow paste and password managers (`autocomplete="current-password"`), no puzzles, offer a passkey or an email link.

## Robust

### Name, role, value (4.1.2)

| Need | Use |
|---|---|
| Chosen option or toggle | `<button aria-pressed>` |
| Show/hide section | `<details><summary>`, or `<button aria-expanded aria-controls>` |
| Current stop | `aria-current="step"` in the road map; `aria-current="page"` on nav links |
| Off but explainable | `aria-disabled="true"` + reason via `aria-describedby` |
| Receipt tabs | `tablist` / `tab` / `tabpanel` with arrow keys (reference file) |

No `role="button"` on a `div`, and no `aria-label` on a plain `div` or `span` (many readers ignore it).

### Status messages (4.1.3)

- One polite live region in the layout, present in the static HTML from first paint. A live region inserted later is often not announced.
- Announce results that happen away from focus: "복사했어요", "담았어요", a resolved conflict, the new stop after M1.
- Clear the region, then set the text in the next frame, so a repeated message is announced again.
- `role="alert"` only for errors that need attention now.

## Testing

Use the project's tools. Do not install global CLIs or run Lighthouse.

1. **`/visual-qa [routes]`**: 360/768/1280 and reduced-motion screenshots, axe per screen in `.qa/axe.json`, and `.qa/report.md` (horizontal scroll, targets < 44px, external requests, console errors). Open the changed screenshots; don't judge from the report alone.
2. **`npm run e2e`** (Playwright 1.56.1 with `@axe-core/playwright`): every route and the main states (dialog open, after an answer, receipt printed), once more with `test.use({ reducedMotion: 'reduce' })` asserting the end state shows at once.

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('인터뷰: axe 심각·치명 0', async ({ page }) => {
  await page.goto('/interview');
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
});
```

3. **Keyboard-only e2e** (`tests/e2e/keyboard.spec.ts`), with no mouse calls: Tab to every control, activate with Enter/Space, assert `toBeFocused()`, assert arrow keys never advance the interview, Esc closes the dictionary and focus returns to its button, and the focused element is never covered by the bars. Helpers are in the reference file.
4. **Reflow and zoom**: at a 320px-wide viewport assert `document.documentElement.scrollWidth <= innerWidth`; inject `html { font-size: 200% }` (all sizes are rem) and look for clipping in a screenshot.
5. Until T20 adds `npm run e2e`, read the tab-order list that `npm run qa:shots` writes.

A real screen-reader pass (VoiceOver, TalkBack, NVDA with a Korean voice) can't run headless. The aria snapshot is the proxy; don't block on it.

## Common issues by impact

- **Critical (fix now):** missing labels or accessible names, missing alt, contrast below AA, keyboard traps or mouse-only controls, no visible focus, motion that ignores reduced motion or can't be skipped.
- **Serious (fix before the task is done):** missing `lang="ko"` or page title, broken heading order, focus lost after a step change or dialog close, focus hidden behind a bar, targets under 44px, color-only status, a control that advances on arrow keys.
- **Moderate (fix in the same task if cheap):** decorative images announced, inconsistent dictionary placement, no live announcement for copy/add results, missing landmarks.

## 코드쇼퍼 특이점

- **Interview options are buttons, not radios** (D19 in `docs/DECISIONS.md`, WCAG 3.2.2). Choosing an option advances to the next question, so each option is a `<button type="button">`: click, Enter and Space advance; arrow keys never do. The earlier choice shows `aria-pressed="true"`. Options sit in a `role="group"` named by the question heading (`aria-labelledby`).
- **Traffic status is color + icon + text** (docs/CONCEPT.md 5.3): 막힘 = red + accident mark + "막힘", 서행 (kept on purpose) = amber + question mark + "서행", 원활 = green + check + "원활". Lamps change at most once per 350ms (never 3+ flashes per second); under reduced motion only the final state is shown.
- **Every motion is skippable and never blocks.** A tap on a scene calls `finish()`; controls stay usable while it plays; the outcome is announced in text.
- **Map, renders and illustrations** (route-map SVG, `src/assets/art/` renders, blueprint placeholders): the map is `role="img"` with a one-sentence Korean summary and every fact it shows also exists in the sheet's HTML; decorative images next to text that says the same get `alt=""` (SVG: `aria-hidden="true"`). Dispatch-note text is real text, never baked into an image (1.4.5).
- **The D2Coding receipt is deliberate.** It still reflows at 320px (wraps, or scrolls in a focusable region) and its buttons have visible labels ("영수증 복사").

## References

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Deque axe rules](https://dequeuniversity.com/rules/axe/)
- [references/criteria-and-patterns.md](references/criteria-and-patterns.md): A/AA criteria table and Preact/Astro patterns (visually-hidden, dialog, skip link, interview options, tabs, live region, form errors, dragging, keyboard e2e)
- `docs/UX.md` §4 (motion M1–M8) and §6 (accessibility checklist), `game-motion` skill
