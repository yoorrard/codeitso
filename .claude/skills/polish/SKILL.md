---
name: polish
description: Final polish pass for 코드쇼퍼 UI. Use before marking any UI task done, or when asked to polish, refine or tidy a screen. Verifies the craft floor, polishes the whole path without redesigning it, and scores a five-part audit (accessibility, performance, tokens, responsive, integrity) with P0–P3 findings, using /visual-qa evidence and values from src/styles/tokens.css.
license: Apache-2.0 (see LICENSE and NOTICE.md in this folder)
paths:
  - "src/components/**"
  - "src/pages/**"
  - "src/layouts/**"
  - "src/styles/**"
---

> Source: [pbakaus/impeccable](https://github.com/pbakaus/impeccable) at commit `919dbeba520df760a157fe635be62faae88d58da`, version 4.5.2 (from `package.json` and `plugin/.claude-plugin/plugin.json`; the commit itself carries no tag, the latest upstream release tag is `skill-v4.5.2`). Derived from `plugin/skills/impeccable/reference/craft-floor.md`, `polish.md` and `audit.md`. Copyright 2025 Paul Bakaus. Licensed under the Apache License 2.0; `LICENSE` and `NOTICE.md` are copied unchanged into this folder.
>
> Changes (Apache-2.0 §4(b): this file was modified from the originals):
> - Merged the three files into one skill with frontmatter, reordered as system → evidence → triage → craft floor → whole path → audit → finish, and rewrote the wording for this project.
> - Removed every mention of the impeccable launcher, CLI, detector, binary, scripts, hooks, critique snapshots and live mode, and every sibling reference (`/impeccable …` commands, `bolder`, `audit.native.md`, native platforms, `DESIGN.md`). Nothing here downloads or runs anything except this project's npm scripts and `/visual-qa`.
> - Replaced "ask" steps and the closing message to the user with "decide, record in `docs/DECISIONS.md`, continue".
> - Evidence comes from `/visual-qa`, values from `src/styles/tokens.css`, budgets and copy rules from the project docs.
> - Resolved conflicts: the D2Coding monospace receipt is intentional and never flagged; "no new font families (Pretendard + D2Coding, self-hosted)" replaces "source and self-host a display face"; the project's motion rules (game-like scenes within limits) replace "one authored moment"; dark-mode criteria dropped (one token theme); 44px targets.
> - Aligned with the project's icon decision (Fluent 3D emoji images + Phosphor SVG) and scene list (M1–M8).
> - Added: Korean line breaking and measure, the reduced-motion policy check, a fix policy (P0/P1 fixed before done; the original audit only reported), and out-of-scope findings going to `docs/BACKLOG.md`.

# Polish: the last pass before a UI task is done

Polish is refinement, never concealed redesign. Keep the incumbent world (the taxi, the road map, the stops, the receipt), the tokens, the copy, the behavior, and everything outside the task's scope. If the concept itself is wrong, don't smuggle in a replacement: finish the in-scope polish, record the problem and the redesign you would propose in `docs/DECISIONS.md`, and continue.

An axe result or a `.qa/report.md` line is defect evidence, not proof of quality. Inspect the rendered screen and the real interaction path.

Work in bounded rounds: inspect once with `/visual-qa` (all viewports together), fix everything it shows in one batch, confirm with one more run. Go round again only while P0 or P1 findings remain.

## Fixed points

Project rules win over generic craft advice.

| Topic | Rule |
|---|---|
| Values | Colors, fonts, sizes, radii, shadows, durations and easing only as `var(--…)` from `src/styles/tokens.css`. A missing value becomes a token (a color with its measured contrast in a comment), never a literal in a component. |
| Fonts | Pretendard (UI) and D2Coding (receipt, code) only, self-hosted (D11). No new families, no font CDN, no system display face. |
| Receipt | The D2Coding monospace receipt on `--receipt` paper is a deliberate brand choice. Never flag it. |
| Motion | Game-like scenes (M1–M8, `docs/UX.md` §4, `game-motion` skill) are welcome: each motion < 1s, scenes ≤ 3s, always skippable, never blocking input. Reduced motion (OS or `data-motion="reduce"`) removes movement, scale, parallax and flashing and keeps opacity cross-fades ≤ 150ms (`--dur-fade`). |
| Accessibility | WCAG 2.2 AA, tap targets ≥ 44px (`--tap`), focus ring `--focus` / `--focus-on-dark`. Details in the project's `accessibility` skill. |
| Copy | Fixed UI text in `src/copy/ko.ts`, engine sentences in `data/templates.json`, style per `.claude/rules/copy.md` (해요체, short verb buttons). |
| Budget | First-screen JS ≤ 100KB gzip, images and animation ≤ 300KB per page (`npm run qa:budget`). No external requests. |
| Theme | One light "paper" theme with the dark `--road` band. A polish pass adds no dark mode. |

If `scripts/guard/floor-guard.ts` exists, the project's after-edit hook already runs it on every edit under `src/`. Fix what it reports instead of re-checking those rules by hand.

## 1. Establish the system

Read the screen's section in `docs/UX.md`, `src/styles/tokens.css`, the shared components in `src/components/`, and the neighboring stops (the screen before and after). Classify each drift before fixing it:

- **missing token:** the system needs a reusable value, so add it to `tokens.css`;
- **one-off implementation:** an existing shared component or pattern should replace it;
- **conceptual mismatch:** the flow, information architecture or hierarchy differs from comparable screens;
- **local defect:** the implementation is simply incomplete or inconsistent.

Fix the cause at the narrowest correct level. When a binding principle can't be inferred from the docs, decide, record it in `docs/DECISIONS.md`, and continue.

## 2. Gather the evidence

1. `npm run build`, then `/visual-qa` for the routes you touched: 360×800, 768×1024, 1280×800, reduced motion and axe, all written to `.qa/`.
2. Open the changed screenshots with the Read tool, 360px first.
3. Use the feature yourself in a Playwright browser with keyboard, pointer and touch (`hasTouch: true`). Determine:
   - whether the path is functionally complete;
   - the quality bar: the task's 완성 확인 in `docs/TASKS.md` plus this skill;
   - known constraints and deliberately unfinished work (phase-2 items in `docs/UX.md` and `docs/BACKLOG.md` are not defects);
   - the states, content lengths (longest product name, longest Korean question, empty cart, 80-character free text) and input methods users will actually meet.

## 3. Triage

Separate functional defects from cosmetic ones and fix in this order:

1. broken or blocked tasks, data loss, misleading state, inaccessible paths;
2. missing loading, empty, error, success, disabled and "can't save" states;
3. flow, hierarchy, responsive and design-system drift;
4. visual and motion inconsistencies;
5. code and asset cleanup.

Don't perfect one corner while the rest of the path stays below the same bar.

## 4. Craft floor

Each item is a check on the built result, not an intention. Run them on the same `/visual-qa` round instead of separate screenshot trips.

- **Contrast:** body and placeholder text ≥ 4.5:1, large text ≥ 3:1, borders, icons and focus ≥ 3:1. On a colored surface use the pair documented in `tokens.css` (`--ink` on `--taxi`, `--paper` on `--road`), never an ad-hoc gray.
- **Depth:** shadows come from `--shadow` (offset plus soft blur). A zero-offset colored halo is decoration.
- **Spacing:** tight groups, generous separation, more space above a heading than below it. Read the computed values. Side gutter `--gutter`, content ≤ `--content-max`.
- **Type:** sizes only from the token scale (`--text-sm` to `--text-2xl`), line height `--leading`. Body lines ≤ `--content-max` (about 45 Hangul syllables at 16px; 65–75ch for Latin text). Korean text uses `word-break: keep-all` with `overflow-wrap: break-word`, so words break at spaces and long URLs or keys still wrap. Headings `text-wrap: balance`; tracking never tighter than -0.04em, Hangul body text near 0. Obvious steps in size and weight. Run the real copy at every width and fix what overflows.
- **Motion:** the project's rules above. Authored scenes, not one identical fade-up entrance on every section or a transition on every card. Content is visible by default in the static HTML: never park it at `opacity: 0` waiting for a script, so a slow island or reduced motion still shows the end state. Ease with `--ease-out` / `--ease-in-out`. Transform and opacity first; blur, clip-path, mask and shadow are fine when they stay smooth on a mid-range phone.
- **States:** default, hover, focus-visible, active, disabled (with the reason as text), loading, error, empty ("이 칸에 맞는 상품이 아직 진열대에 없어요"), success, and "can't save" when localStorage is unavailable. Plus real content, working controls, responsive composition and keyboard focus.
- **Browser surfaces:** the parts you didn't draw still carry the design. Theme `::selection`, `caret-color`, focus rings, `text-underline-offset` and `scrollbar-color` from tokens; use `font-variant-numeric: tabular-nums` for counts and step numbers outside the receipt. This is the cheapest signal that a page was built rather than assembled, and the one most often skipped.
- **Copy:** the product's own language from `src/copy/ko.ts`. Controls name their action ("담기", "영수증 뽑기"); errors name the problem and the recovery. No strings hard-coded in components.
- **Coverage:** every requirement for this screen in `docs/UX.md` is present and findable within seconds at 360px.

### Refuse

These are the category's defaults, not bans: the screen's own spec in `docs/UX.md` can earn any of them, except where marked. Reaching for one when nothing asked for it means you weren't deciding; rewrite the element rather than softening it.

Page scaffolds:

- Same-size cards of icon + heading + text as the page structure. Product and recipe cards are real items and are fine; nested cards are always wrong.
- The hero-metric template: big number, small label, supporting stats, accent.
- A kicker or eyebrow above a heading. This one is a ban, not a default: the heading carries its own weight.
- Section numbers (01 / 02 / 03) unless the sequence itself matters. The five stops are a real sequence.
- A modal for a task that needs neither interruption nor protected focus. Confirming an overwrite of saved progress needs one; most things don't.

Surface habits:

- Gradient text. Emphasis comes from weight or size.
- Glass and blur as decoration rather than as a specific effect.
- A colored `border-left` or `border-right` over 1px on cards, list items, callouts or alerts.
- Hard offset shadows (`box-shadow: 4px 4px 0`) as a costume. Depth comes from `--shadow`.
- Sparklines, progress rings or soft rounded rectangles standing in for content (the interview shows "n번째 질문", not a percent bar).
- Monospace as a costume for "technical". D2Coding belongs to the receipt and to real code, commands and keys (terminal-sim, prompt fragments); don't spread it as decoration. The receipt itself is never a finding.
- Any new font family. The display voice comes from Pretendard's weights and the token scale.
- Unicode glyphs or emoji *text characters* standing in for icons. UI controls use Phosphor SVG in one style and weight; stations, slots and rewards use the project's Fluent 3D emoji images (`public/emoji/`, see `docs/DESIGN.md` §8). The ✓ and ★ in `docs/UX.md` describe meaning, not the glyph to ship.
- Geometric masks approximating an organic outline (a circle cropped around the mascot). Use an asset with a real alpha edge, or no cut-out.

The floor holds the mechanics; it never picks the direction. With every check green, spend the remaining effort on the committed world (road, taxi, receipt), and when torn between refined and committed, commit.

## 5. Polish the whole path

### Flow and hierarchy

- Match the neighboring stops: terminology, disclosure (one open slot at a time on `/shop`), routing rules (`docs/UX.md` §2.1), save behavior.
- Make the primary task and the current state obvious (one main button in the bottom bar, the current stop on the road map) without flattening everything to equal weight.
- Arrival, transition, empty and recovery paths connect: a blocked stop redirects with its one-line reason; "이어서 하기" lands in the right place.

### Layout and type

- Align to the spacing scale; fix optical as well as mathematical alignment (an icon beside Hangul text sits visually centered, not just box-centered).
- Keep same-role typography consistent; test measure, wrapping, long Korean strings, 200% text and font loading (no jump that moves a tap target).
- Verify 360, 768 and 1280 rather than correcting only the current screenshot.

### Color, imagery and icons

- Semantic tokens with stable meanings: `--go` done/resolved, `--stop` conflict/error, `--caution` warning, `--taxi` emphasis fill.
- Verify text, control and focus contrast in every state, hover and disabled included.
- Icons stay coherent: Phosphor SVG for UI controls in one style and weight, Fluent 3D emoji images only for stations, slots and rewards; sizes and optical alignment consistent within each set.
- No image layout shift: dimensions or `aspect-ratio` on every image, Astro's `<Image>` for raster assets, useful alt (or `alt=""` when decorative).

### Interaction and state

- Every control has default, hover, focus, active, disabled, loading, error and success behavior where those can occur.
- Visible keyboard focus, logical tab order, labels, 44px targets.
- Motion is coherent, skippable and smooth. Don't add animation just to make polish visible.
- Validate long, missing, slow and failing content where the product can meet it (localStorage unavailable, `/api/event` failing silently).

### Content and code

- Terminology and punctuation follow `.claude/rules/copy.md`. Don't change factual product claims: they come from `data/products.json` with sources.
- Remove debug output, dead code, unused imports, obsolete styles and duplication the pass created.
- Replace custom implementations with the shared component where one owns the pattern.
- Promote genuinely reusable values to tokens; don't build a system abstraction for one local exception.

## 6. Audit rubric

Score each dimension 0–4. Keep deterministic findings (axe, `.qa/report.md`, `qa:budget`) separate from visual judgment, and verify each finding in context before reporting it.

### 1. Accessibility

- Contrast below 4.5:1 for text, or 3:1 for large text and UI parts.
- Reduced motion (OS and `data-motion="reduce"`) without an intentional alternative: movement, scale or parallax that survives; a global `0.01ms` kill that also removes the `--dur-fade` feedback; flashing at 3 or more per second; motion that blocks focus, reading or the next action.
- Interactive elements without names, roles or states.
- Keyboard: missing focus indicator, illogical order, traps, focus lost after a step or dialog, focus hidden behind the bars.
- Semantics: broken heading order, missing landmarks, `div`s as buttons, interview options built as radios (D19).
- Missing or poor alt, color-only status, inputs without labels, vague errors.

Score: 0 = fails WCAG A; 1 = major gaps (few names, no keyboard path); 2 = partial, significant gaps; 3 = AA mostly met, minor gaps; 4 = AA fully met plus the project's stricter rules.

### 2. Performance

- Layout reads and writes in loops (layout thrashing).
- Layout properties animated casually, unbounded blur/filter/shadow, visibly dropped frames.
- Images without lazy loading or with oversized sources.
- `will-change` applied broadly or left on at rest (it is a targeted hint, not a baseline).
- First-screen JS over 100KB gzip, islands where no state is needed, unused dependencies.
- Needless Preact re-renders.

Score: 0 = severe (layout thrash, nothing optimized); 1 = major problems; 2 = partial; 3 = mostly optimized, within budget; 4 = fast, lean, comfortably within budget.

### 3. Tokens

- Hard-coded colors, sizes, radii, shadows or durations.
- A token used against its documented role (`--taxi` as text color, `--line` as input border, `--caution` as text).
- A movement duration not zeroed in both the reduced-motion media query and `[data-motion='reduce']`, or `--dur-fade` zeroed.
- The wrong focus color on the `--road` band.

Score: 0 = hard-coded everywhere; 1 = mostly hard-coded; 2 = tokens used inconsistently; 3 = tokens used, a few literals; 4 = only tokens, both reduced-motion paths correct.

### 4. Responsive

- Fixed widths that break at 360px (and 320px for reflow); horizontal scroll.
- Touch targets under 44×44px.
- Broken touch interaction: a sheet's drag handle that fails under touch, swallows page scroll or stays stuck after an interrupted gesture. Code tells: mouse-only handlers, no `touch-action` on a pointer-event drag surface, drag state not cleared on `pointercancel`, lost capture or blur. Exercise the gesture with Playwright touch emulation, then say what produced the evidence (emulated viewport, synthesized touch, Chromium) and what stayed untested.
- Layouts that break at 200% text.
- 768 and 1280 layouts that only stretch the phone layout.

Score: 0 = desktop-only; 1 = major issues; 2 = works on phones with rough edges; 3 = responsive, minor target or overflow issues; 4 = fluid at every width, 44px targets, gestures work under touch.

### 5. Implementation integrity

Verify in context by reading the code and the screenshots:

- repeated implementation shortcuts and design-system drift;
- misleading or decorative content (placeholder text, invented product facts, fake numbers);
- structure interchangeable with an unrelated product: would this screen look the same in any SaaS app, or does it read as the taxi-and-receipt journey?

Call out false positives explicitly.

Score: 0 = systemic drift; 1 = major repeated failures; 2 = several verified issues; 3 = minor isolated issues; 4 = coherent and intentional.

### Report and fix policy

**Rating bands** (total of 20): 18–20 excellent (minor polish), 14–17 good (address the weak dimensions), 10–13 acceptable (significant work), 6–9 poor (major overhaul), 0–5 critical.

**Severity** for every finding:
- **P0 Blocking:** prevents task completion.
- **P1 Major:** significant difficulty, or a WCAG AA violation (the project's 44px and color + icon + text rules count here).
- **P2 Minor:** annoyance; a workaround exists.
- **P3 Polish:** no real user impact.

For each finding record: **[P?] name**, location (component, file, line), category, impact on users, standard violated (if any), and the fix (the concrete change: file, token, component). Then list recurring patterns that show a systemic gap ("hard-coded colors in six components") and positive findings worth keeping. Be thorough but actionable: a pile of P3s is noise. Never report a finding without its impact, give generic advice, report an unverified false positive, or mark everything P0.

**Fix policy**
- P0 and P1: fix in this pass. The task is not done while any remain.
- P2: fix when it lies within the task's scope.
- P3: fix only when cheap and in scope.
- Out of scope: one line in `docs/BACKLOG.md`. Decisions made while fixing go in `docs/DECISIONS.md`.

## 7. Verify and finish

Walk the complete path again with keyboard, pointer and touch emulation. Check:

- 360, 768 and 1280 layouts;
- loading, empty, error, success, disabled, long-content and missing-content states;
- 200% text, contrast, focus, semantics and accessible names;
- reduced motion (OS and site setting): end states visible at once, fades only;
- console errors, layout shift, interaction latency, image loading, no external requests;
- agreement with `docs/UX.md`, the neighboring stops and the task's scope.

Re-run `/visual-qa` and `npm run qa:budget`, then the project's completion checks (`npm run check`, plus `npm test` and `npm run e2e` once they exist). Fix real defects and document only narrow, intentional exceptions in `docs/DECISIONS.md`. A clean scan does not replace looking at the screenshots.

Finish with a source diff: remove accidental churn, orphaned code, redundant values and temporary artifacts (`.qa/` stays out of git). Mark the task done only when the feature is functionally complete and consistently finished across the path.

Report in this shape:

```text
Polish (routes: /interview /shop)
- Audit: 17/20 good. A11y 4 · Perf 3 · Tokens 4 · Responsive 3 · Integrity 3
- Integrity verdict: pass (reads as the stop-by-stop taxi journey; no drift found)
- Fixed: P0 0 · P1 2 · P2 3 (one line each: file, what changed)
- Left: P2 1 → docs/BACKLOG.md · P3 2 (not worth the churn)
- Evidence: /visual-qa axe 0 / 0, no horizontal scroll, no target under 44px; budget 63KB / 100KB
```
