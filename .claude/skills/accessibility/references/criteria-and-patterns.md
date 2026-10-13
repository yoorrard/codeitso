# WCAG 2.2 criteria and code patterns (코드쇼퍼)

Part of the vendored `accessibility` skill. Source, commit and the list of changes are in the header of [../SKILL.md](../SKILL.md); this file merges and adapts the source's `references/WCAG.md` and `references/A11Y-PATTERNS.md`. Korean strings below are illustrations: real UI text lives in `src/copy/ko.ts`, and every color, size and duration comes from `src/styles/tokens.css`.

## 1. Level A and AA success criteria

Both levels must pass. The last column says where the criterion bites in this app.

| Criterion | Level | Requirement | 코드쇼퍼 |
|---|---|---|---|
| 1.1.1 Non-text Content | A | Images and icons have text alternatives | Route map (role=img summary), picture options, renders and blueprint placeholders |
| 1.2.1 Audio-only and Video-only | A | Transcript or audio description | No media in phase 1 |
| 1.2.2 Captions (Prerecorded) | A | Video with audio has captions | Korean captions if video is added |
| 1.2.3 Audio Description or Media Alternative | A | Video has description or alternative | As above |
| 1.3.1 Info and Relationships | A | Structure is in the markup | Landmarks, headings, labels, groups |
| 1.3.2 Meaningful Sequence | A | Reading order is logical | DOM order = visual order |
| 1.3.3 Sensory Characteristics | A | Instructions don't rely on shape, place or sound only | Name the control, not just "오른쪽 아래" |
| 1.4.1 Use of Color | A | Color is not the only signal | Conflicts: color + icon + text |
| 1.4.2 Audio Control | A | Autoplaying audio can be stopped | Sound effects default off, started only by a user action |
| 2.1.1 Keyboard | A | Everything works by keyboard | Native buttons and links |
| 2.1.2 No Keyboard Trap | A | Focus can always leave | Only modal dialogs hold focus, Esc closes |
| 2.1.4 Character Key Shortcuts | A | Single-key shortcuts can be turned off | Don't add any |
| 2.2.1 Timing Adjustable | A | Time limits can be extended | No time limits |
| 2.2.2 Pause, Stop, Hide | A | Moving content can be paused | Scenes ≤ 3s, skippable, no idle loops |
| 2.3.1 Three Flashes or Below | A | No more than 3 flashes per second | M6 warning light ≤ 2 blinks |
| 2.4.1 Bypass Blocks | A | Skip link or landmarks | "본문으로 건너뛰기" |
| 2.4.2 Page Titled | A | Pages have descriptive titles | Unique `<title>`, updated on step change |
| 2.4.3 Focus Order | A | Focus order preserves meaning | Focus to new heading after a step |
| 2.4.4 Link Purpose (In Context) | A | Link purpose is clear | No bare "여기" links |
| 2.5.1 Pointer Gestures | A | Multi-point gestures have single-pointer alternatives | No pinch or swipe-only actions |
| 2.5.2 Pointer Cancellation | A | Action on up-event, not down-event | Use `click`, not `pointerdown` |
| 2.5.3 Label in Name | A | Accessible name contains the visible label | No `aria-label` that drops visible words |
| 2.5.4 Motion Actuation | A | Device-motion actions have alternatives | No shake-to-act |
| 3.1.1 Language of Page | A | Page language is set | `<html lang="ko">` |
| 3.2.1 On Focus | A | Focus causes no context change | Nothing opens on focus |
| 3.2.2 On Input | A | Input causes no unexpected context change | Interview options are buttons (D19) |
| 3.2.6 Consistent Help | A | Help is in the same relative order | Dictionary button on every page |
| 3.3.1 Error Identification | A | Errors are described in text | `aria-invalid` + message |
| 3.3.2 Labels or Instructions | A | Inputs have labels or instructions | Visible `<label>`, hint via `aria-describedby` |
| 3.3.7 Redundant Entry | A | Earlier input is reused | `src/lib/store.ts`, "이전" keeps answers |
| 4.1.2 Name, Role, Value | A | Components expose name, role and state | `aria-pressed`, `aria-expanded`, tabs |
| 1.2.4 Captions (Live) | AA | Live audio has captions | No live media |
| 1.2.5 Audio Description (Prerecorded) | AA | Prerecorded video has audio description | If video is added |
| 1.3.4 Orientation | AA | No orientation lock | Portrait and landscape both work |
| 1.3.5 Identify Input Purpose | AA | Personal-data inputs expose their purpose | `autocomplete` if such a field appears |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 text, 3:1 large text | Token pairs in `tokens.css` |
| 1.4.4 Resize Text | AA | 200% text without loss | rem tokens, no fixed heights |
| 1.4.5 Images of Text | AA | Real text, not pictures of text | Speech bubbles and receipt are text |
| 1.4.10 Reflow | AA | No 2D scrolling at 320 CSS px | Receipt wraps or scrolls in its own region |
| 1.4.11 Non-text Contrast | AA | UI parts and icons 3:1 | Input borders `--ink-soft`, focus ring |
| 1.4.12 Text Spacing | AA | Survives raised text spacing | No clipped containers |
| 1.4.13 Content on Hover or Focus | AA | Dismissible, hoverable, persistent | Tooltips close with Esc |
| 2.4.5 Multiple Ways | AA | More than one way to find pages | Road map, home links, dictionary search |
| 2.4.6 Headings and Labels | AA | Headings and labels describe the content | One `<h1>` per page |
| 2.4.7 Focus Visible | AA | Focus indicator is visible | `--focus`, `--focus-on-dark` outlines |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Focus is not entirely hidden | Header, bottom bar, dictionary button |
| 2.5.7 Dragging Movements | AA | Drags have single-pointer alternatives | Sheet has a "닫기" button |
| 2.5.8 Target Size (Minimum) | AA | 24×24 CSS px | Project rule: 44×44 (`--tap`) |
| 3.1.2 Language of Parts | AA | Language changes are marked | `lang="en"` on quoted English errors |
| 3.2.3 Consistent Navigation | AA | Navigation is consistent | Same header and bars on every page |
| 3.2.4 Consistent Identification | AA | Same function, same label | Labels from `src/copy/ko.ts` |
| 3.3.3 Error Suggestion | AA | Suggest corrections when known | Message says how to fix |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Reversible, checked or confirmed | Ask before overwriting saved progress |
| 3.3.8 Accessible Authentication (Minimum) | AA | No cognitive test to log in | No login in phase 1 |
| 4.1.3 Status Messages | AA | Status announced without focus | Polite live region |

AAA criteria we adopt because they are nearly free here: 2.3.3 Animation from Interactions (the reduced-motion setting), 2.4.13 Focus Appearance (3px `--focus` outline), 2.5.5 Target Size (Enhanced) (our 44px rule).

### What changed from 2.1 to 2.2

| Change | Criterion | Level |
|---|---|---|
| Removed | 4.1.1 Parsing | A |
| Added | 2.4.11 Focus Not Obscured (Minimum) | AA |
| Added | 2.4.12 Focus Not Obscured (Enhanced) | AAA |
| Added | 2.4.13 Focus Appearance | AAA |
| Added | 2.5.7 Dragging Movements | AA |
| Added | 2.5.8 Target Size (Minimum) | AA |
| Added | 3.2.6 Consistent Help | A |
| Added | 3.3.7 Redundant Entry | A |
| Added | 3.3.8 Accessible Authentication (Minimum) | AA |
| Added | 3.3.9 Accessible Authentication (Enhanced) | AAA |

## 2. Patterns

### Visually hidden

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

### Dialog and bottom sheet

Native `<dialog>` handles inertness, initial focus and Esc. Style the same element as a bottom sheet on phones and a right panel on wide screens; the semantics don't change.

```tsx
import { useEffect, useId, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface SheetProps {
  open: boolean;
  title: string;
  closeLabel: string; // "닫기", from src/copy/ko.ts
  onClose: () => void;
  children: ComponentChildren;
}

export function Sheet({ open, title, closeLabel, onClose, children }: SheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      el.showModal(); // page behind becomes inert; focus moves to the first control inside
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Runs for Esc, the close button and el.close() alike
  const handleClose = () => {
    returnTo.current?.focus();
    if (open) onClose();
  };

  return (
    <dialog ref={dialog} class="sheet" aria-labelledby={titleId} onClose={handleClose}>
      <h2 id={titleId}>{title}</h2>
      {children}
      <button type="button" class="tap" onClick={() => dialog.current?.close()}>{closeLabel}</button>
    </dialog>
  );
}
```

For the dictionary, the first control inside is the search box, so `showModal()` lands focus there.

### Skip link

```astro
<body>
  <a class="skip-link" href="#main">본문으로 건너뛰기</a>
  <header><!-- 도로 지도 --></header>
  <main id="main" tabindex="-1"><!-- 화면 내용 --></main>
</body>
```

```css
.skip-link {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: var(--gutter);
  z-index: 100;
  display: inline-flex;
  align-items: center;
  min-block-size: var(--tap);
  padding-inline: var(--gutter);
  background: var(--ink);
  color: var(--paper);
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
  transform: translateY(-100%);
}
.skip-link:focus { transform: none; }
```

### Interview options (D19)

```tsx
<h2 id={`q-${q.id}`} ref={heading} tabIndex={-1}>{q.text}</h2>
<div role="group" aria-labelledby={`q-${q.id}`} class="options">
  {q.options.map((o) => (
    <button key={o.id} type="button" class="option" aria-pressed={answer === o.id} onClick={() => choose(o.id)}>
      {o.image && <img src={o.image} alt={o.alt ?? ''} />}
      <span>{o.label}</span>
    </button>
  ))}
</div>
```

- No `onKeyDown`, no roving arrow keys: only click, Enter and Space choose, so browsing never changes the question (3.2.2).
- The picture's `alt` (from `questions.json`) and the visible label together form the button's name; the label stays in it (2.5.3).
- `aria-pressed="true"` marks the earlier answer when the user comes back with "이전".
- Ignore a second press on the same question during the transition, so a double tap can't answer the next question by accident.

### Receipt tabs

Four tabs (영수증 / 설계 꾸러미 / 공부할 것 / 대화 카드). Enter and Space on a tab are native clicks; only the arrow, Home and End keys need a handler, and it sits on the tablist.

```tsx
import { useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

interface Tab { id: string; label: string }

export function Tabs({ label, tabs, panels }: { label: string; tabs: Tab[]; panels: Record<string, ComponentChildren> }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    const last = tabs.length - 1;
    const next =
      e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  };

  return (
    <>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown}>
        {tabs.map((t, i) => (
          <button key={t.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab"
            id={`tab-${t.id}`} aria-selected={t.id === active} aria-controls={`panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1} onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`}
          tabIndex={0} hidden={t.id !== active}>
          {panels[t.id]}
        </div>
      ))}
    </>
  );
}
```

### Live region announcer

In the layout, so it exists in the static HTML from the first paint:

```astro
<div id="announcer" class="visually-hidden" aria-live="polite" aria-atomic="true"></div>
```

```ts
export function announce(message: string): void {
  const region = document.getElementById('announcer');
  if (!region) return;
  region.textContent = ''; // clear first so the same message is announced again
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
```

Call it after copy, add-to-cart, conflict resolved and stop changed, with the sentence from `src/copy/ko.ts`.

### Form errors

The env-var practice form (`env-var-form`) when the name field is empty:

```tsx
<label for="env-name">이름</label>
<input id="env-name" value={name} onInput={(e) => setName(e.currentTarget.value)}
  aria-invalid={nameError ? true : undefined}
  aria-describedby={nameError ? 'env-name-error' : undefined} />
{nameError && (
  <p id="env-name-error" class="field-error">
    <StopIcon aria-hidden="true" /> 이름을 적어 주세요. 예: API_KEY
  </p>
)}
```

```ts
function onSubmit(e: SubmitEvent, countMessage: (n: number) => string) {
  const form = e.currentTarget as HTMLFormElement;
  const invalid = form.querySelectorAll<HTMLElement>('[aria-invalid="true"]');
  if (invalid.length === 0) return;
  e.preventDefault();
  invalid[0].focus();
  announce(countMessage(invalid.length)); // "고칠 곳이 2개 있어요."
}
```

### Dragging alternatives (2.5.7)

- A sheet that closes by dragging down always has a "닫기" button (see the dialog pattern).
- Any reorderable list gets buttons per item, named with the item: `aria-label={`${item.name} 위로`}` and `aria-label={`${item.name} 아래로`}`.
- Value pickers use native `<input type="range">`, which works by keyboard and by a single tap.

### Keyboard-only e2e helpers

```ts
import { test, expect, type Page, type Locator } from '@playwright/test';

/** Press Tab until `target` has focus; fail if it is never reached. */
async function tabTo(page: Page, target: Locator, max = 60): Promise<void> {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error('Tab으로 닿지 않는다');
}

/** 2.4.11 (stricter): the focused element's center is on screen and not under a bar. */
async function expectFocusNotObscured(page: Page): Promise<void> {
  const visible = await page.evaluate(() => {
    const el = document.activeElement;
    if (!(el instanceof HTMLElement) || el === document.body) return false;
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit !== null && (hit === el || el.contains(hit));
  });
  expect(visible).toBe(true);
}

test('인터뷰: 키보드만으로 답하고, 화살표로는 넘어가지 않는다', async ({ page }) => {
  await page.goto('/interview');
  const group = page.getByRole('group');
  await tabTo(page, group.getByRole('button').first());
  await expectFocusNotObscured(page);
  const question = (await group.getAttribute('aria-labelledby')) ?? '';
  await page.keyboard.press('ArrowDown');
  await expect(group).toHaveAttribute('aria-labelledby', question); // D19: arrows never advance
  await page.keyboard.press('Enter');
  await expect(group).not.toHaveAttribute('aria-labelledby', question);
  await expect(page.locator(':focus')).toHaveRole('heading'); // focus moved to the new question
});

test('사전: Esc로 닫으면 초점이 사전 버튼으로 돌아온다', async ({ page }) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: '사전 열기' });
  await tabTo(page, opener);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(opener).toBeFocused();
});
```
