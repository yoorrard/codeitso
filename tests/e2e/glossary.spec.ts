// 어려운 말 풀이 2판 (brief 8절, glossary.md 5.13, D69): 고르기·점선 밑줄 말로 풀이가 뜨고, 모달 안에서도 맨 위에 뜨며 Esc 한 번은 풀이만 닫는다.
// 손가락 길은 화면을 한 번 눌러(입력 = 손가락) 둔 뒤 고르기를 만들어 흉내 낸다 (Playwright에는 길게 눌러 고르기가 없다).
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { hydrated, islandsReady } from './helpers.ts';

const glossary = JSON.parse(readFileSync(new URL('../../data/glossary.json', import.meta.url), 'utf8')) as { terms: { id: string; term: string; plain: string; see?: string }[] };
const term = (id: string): { id: string; term: string; plain: string; see?: string } => {
  const t = glossary.terms.find((x) => x.id === id);
  if (!t) throw new Error(`${id} 풀이가 없다`);
  return t;
};

/** 처음 한 번 기사 메시지(화면 아래에 뜬다)를 이미 본 것으로 둔다: 누를 자리를 가리지 않게 */
async function hintSeen(page: Page): Promise<void> {
  await page.addInitScript(() => localStorage.setItem('cc:seen:v1', JSON.stringify({ scenes: ['glossary-hint'] })));
}

/** 풀이 섬이 깨어나 밑줄을 정리했을 때까지 */
async function ready(page: Page): Promise<void> {
  await islandsReady(page);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-terms'));
}

const pop = (page: Page) => page.locator('#term-pop');
/** 열고 닫는 움직임(시트 미끄러짐, 풀이 열림 200ms)이 끝날 때까지 */
const settled = (page: Page, selector: string): Promise<unknown> => page.locator(selector).first().evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
const isOpen = (page: Page): Promise<boolean> => pop(page).evaluate((p) => p.matches(':popover-open'));

/** root 안 글에서 word의 n번째 글자 가운데 (마우스로 두 번 누를 자리) */
async function charPoint(page: Page, root: string, word: string, at = 0): Promise<{ x: number; y: number }> {
  const pt = await page.locator(root).first().evaluate(
    (el, [w, i]) => {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
        const k = n.data.indexOf(w as string);
        if (k < 0) continue;
        const r = document.createRange();
        r.setStart(n, k + (i as number));
        r.setEnd(n, k + (i as number) + 1);
        const b = r.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      }
      return null;
    },
    [word, at] as const,
  );
  if (!pt) throw new Error(`${root}에 '${word}'가 없다`);
  return pt;
}

/** root 안 글에서 word를 고른다 (손가락·키보드 길 흉내: 고른 글이 생기고 selectionchange가 난다). 고른 줄 상자를 돌려준다 */
async function selectWord(page: Page, root: string, word: string): Promise<{ top: number; bottom: number }> {
  const box = await page.locator(root).first().evaluate((el, w) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
      const k = n.data.indexOf(w);
      if (k < 0) continue;
      const r = document.createRange();
      r.setStart(n, k);
      r.setEnd(n, k + w.length);
      const s = document.getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
      const b = r.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom };
    }
    return null;
  }, word);
  if (!box) throw new Error(`${root}에 '${word}'가 없다`);
  return box;
}

test("두 번 눌러 고른 '키를'은 문맥을 보고 'API 키'로 푼다 (P2)", async ({ page }) => {
  await hintSeen(page);
  await page.goto('/terms/server');
  await ready(page);
  const q = page.locator('.quiz-q').filter({ hasText: 'API 키를' }).first();
  await hydrated(q);
  const pt = await charPoint(page, '.quiz-q >> text=API 키를', '키를');
  await page.mouse.dblclick(pt.x, pt.y);
  await expect(pop(page)).toBeVisible();
  await expect(page.locator('#term-pop-name')).toContainText(term('api-key').term);
  await expect(pop(page)).toContainText(term('api-key').plain);
  // 고른 줄 아래 8px (마우스는 손을 뗀 줄에 붙인다)
  const box = await pop(page).boundingBox();
  expect(box && box.y >= pt.y).toBe(true);
});

test('단계 시트(모달) 안에서 고르면 풀이가 시트 위에 뜨고, Esc 한 번은 풀이만 닫는다 (P1)', async ({ page }) => {
  await hintSeen(page);
  await page.goto('/waypoints');
  await ready(page);
  await page.locator('.rail-toggle').click();
  const sheet = page.locator('dialog.stage-sheet');
  await expect(sheet).toBeVisible();
  await settled(page, 'dialog.stage-sheet');
  const pt = await charPoint(page, 'dialog.stage-sheet', '설계도');
  await page.mouse.dblclick(pt.x, pt.y);
  await expect(pop(page)).toBeVisible();
  // 풀이 상자가 그 대화 상자 안으로 옮겨 그려져 맨 위에 있고, 안의 버튼에 초점이 간다
  expect(await pop(page).evaluate((p) => p.closest('dialog')?.classList.contains('stage-sheet'))).toBe(true);
  const top = await pop(page).evaluate((p) => {
    const b = p.getBoundingClientRect();
    return !!document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('#term-pop');
  });
  expect(top).toBe(true);
  const more = pop(page).getByRole('button', { name: ko.glossary.more });
  await more.focus();
  await expect(more).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(pop(page)).toBeHidden();
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
});

test('사전 시트 안에서 고른 용어도 시트 위에 뜨고, Esc 한 번은 풀이만 닫는다', async ({ page }) => {
  await hintSeen(page);
  await page.goto('/waypoints');
  await ready(page);
  await page.locator('.topbar .dict-btn').click();
  await page.locator('#dict-q').fill('CORS 에러가 났어요');
  const card = page.locator('.dict-sheet .error-card').first();
  await expect(card).toBeVisible();
  await settled(page, 'dialog.dict-sheet');
  const pt = await charPoint(page, '.dict-sheet .error-card p', '서버');
  await page.mouse.dblclick(pt.x, pt.y);
  await expect(page.locator('#term-pop-name')).toContainText(term('server').term);
  expect(await pop(page).evaluate((p) => !!p.closest('dialog.dict-sheet'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(pop(page)).toBeHidden();
  await expect(page.locator('.dict-sheet')).toBeVisible();
});

test('밑줄 말: Tab으로 닿고 Enter로 열리며(펼침), Tab은 풀이 안으로, Esc는 밑줄 말로 초점을 돌린다', async ({ page, context }) => {
  await hintSeen(page);
  // 그림 설명(figcaption)에는 밑줄을 긋지 않으므로(figure 이름이 쪼개진다) 설명 글에 밑줄 말이 있는 카드로 본다
  await page.goto('/terms/api-key');
  await ready(page);
  const mark = page.locator('main .term-mark').first();
  const id = (await mark.getAttribute('data-term')) ?? '';
  const name = ((await mark.textContent()) ?? '').trim();
  for (let i = 0; i < 60 && !(await mark.evaluate((m) => m === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(mark).toBeFocused();
  // popovertarget이라 접힘·펼침을 화면 낭독기에 알린다 (Chromium 접근성 트리)
  const cdp = await context.newCDPSession(page);
  const expanded = async (): Promise<string | undefined> => {
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: { role?: { value?: string }; name?: { value?: string }; properties?: { name: string; value?: { value?: unknown } }[] }[] };
    const node = nodes.find((n) => n.role?.value === 'button' && n.name?.value === name);
    return String(node?.properties?.find((p) => p.name === 'expanded')?.value?.value);
  };
  expect(await expanded()).toBe('false');
  await page.keyboard.press('Enter');
  await expect(pop(page)).toBeVisible();
  await expect(page.locator('#term-pop-name')).toContainText(term(id).term);
  await expect(mark).toBeFocused();
  expect(await expanded()).toBe('true');
  await expect(page.locator('.term-pop-host [aria-live]')).toHaveText(fill(ko.glossary.announce, { term: term(id).term, plain: term(id).plain }));
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('#term-pop'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(pop(page)).toBeHidden();
  await expect(mark).toBeFocused();
  // 한 번 연 용어는 다음 화면부터 긋지 않는다
  await page.reload();
  await ready(page);
  await expect(page.locator(`main .term-mark[data-term="${id}"]`)).toHaveCount(0);
});

test('겹 풀이: 풀이 속 상위 용어를 누르면 길잡이와 [뒤로]가 생기고 2겹에서 멈춘다', async ({ page }) => {
  await hintSeen(page);
  await page.goto('/tools/firebase-auth');
  await ready(page);
  const mark = page.locator('main .term-mark[data-term="spark-plan"]');
  await mark.click();
  const parent = term('spark-plan');
  const child = term(parent.see ?? '');
  const nested = pop(page).locator('.term-pop-plain .term-mark');
  await nested.click();
  await expect(page.locator('#term-pop-name')).toContainText(child.term);
  await expect(page.locator('#term-pop-name')).toBeFocused();
  await expect(pop(page)).toContainText(fill(ko.glossary.trail, { from: parent.term, to: child.term }));
  // 2겹 풀이 속에는 밑줄이 없다
  await expect(pop(page).locator('.term-pop-plain .term-mark')).toHaveCount(0);
  await pop(page).getByRole('button', { name: ko.glossary.back }).click();
  await expect(page.locator('#term-pop-name')).toContainText(parent.term);
});

test('360px 손가락: 화면 위쪽에서 고르면 풀이 윗변이 고른 줄 바닥 + 40 이상, 아래쪽이면 화면 위에 붙는다', async ({ page }) => {
  await hintSeen(page);
  await page.goto('/terms/server');
  await ready(page);
  const q = page.locator('.quiz-q').filter({ hasText: 'API 키를' }).first();
  await hydrated(q);
  await q.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - 150));
  const tapOn = async (): Promise<void> => {
    const b = await q.boundingBox();
    if (!b) throw new Error('문제 글이 없다');
    await page.touchscreen.tap(b.x + 4, b.y + b.height / 2);
  };
  await tapOn();
  const line = await selectWord(page, '.quiz-q >> text=API 키를', 'API 키');
  await expect(pop(page)).toBeVisible();
  await expect.poll(async () => (await pop(page).boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(line.bottom + 40 - 0.5);
  expect(await pop(page).getAttribute('data-side')).toBe('below');
  // 아래쪽(보이는 높이의 55% 아래)에서 고르면 위에 붙인다 (고른 글 위는 기기 메뉴 자리라 두지 않는다)
  await page.evaluate(() => document.getSelection()?.removeAllRanges());
  await expect(pop(page)).toBeHidden();
  await q.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().top - window.innerHeight * 0.7));
  await tapOn();
  const low = await selectWord(page, '.quiz-q >> text=API 키를', 'API 키');
  await expect(pop(page)).toBeVisible();
  expect(await pop(page).getAttribute('data-side')).toBe('pin');
  expect(((await pop(page).boundingBox())?.y ?? 999) + 1).toBeLessThan(low.top);
});

test('고른 뒤 스크롤해도 풀이는 남고 고른 줄을 따라간다 (P6)', async ({ page }) => {
  await hintSeen(page);
  await page.goto('/tools/supabase');
  await ready(page);
  const pt = await charPoint(page, '.kv', '로그인', 1);
  await page.mouse.dblclick(pt.x, pt.y);
  await expect(pop(page)).toBeVisible();
  await settled(page, '#term-pop');
  const before = (await pop(page).boundingBox())?.y ?? 0;
  await page.mouse.wheel(0, 40);
  await expect.poll(async () => Math.round((await pop(page).boundingBox())?.y ?? 0)).toBe(Math.round(before - 40));
  expect(await isOpen(page)).toBe(true);
});

test('모르는 말: 한글만이면 아무것도, 영문이면 사전에서 찾기, 에러 문장이면 에러 안내 찾기 (P7)', async ({ page }) => {
  await hintSeen(page);
  await page.goto('/');
  await ready(page);
  // 홈 제목(한글만) → 아무것도 뜨지 않는다
  const h1 = await page.locator('h1').boundingBox();
  if (!h1) throw new Error('홈 제목이 없다');
  await page.mouse.move(h1.x + 2, h1.y + h1.height / 2);
  await page.mouse.down();
  await page.mouse.move(h1.x + h1.width - 2, h1.y + h1.height / 2, { steps: 5 });
  await page.mouse.up();
  expect((await page.evaluate(() => document.getSelection()?.toString() ?? '')).length).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  expect(await isOpen(page)).toBe(false);

  await page.goto('/tools/supabase');
  await ready(page);
  await page.locator('main').evaluate((m) => {
    const p = document.createElement('p');
    p.id = 'probe';
    p.textContent = 'TypeError: Failed to fetch 그리고 zqx9 끝';
    m.prepend(p);
    window.scrollTo(0, 0);
  });
  await page.keyboard.press('Shift');
  await selectWord(page, '#probe', 'TypeError: Failed to fetch');
  await expect(pop(page).getByRole('button', { name: ko.glossary.missError })).toBeVisible();
  await selectWord(page, '#probe', 'zqx9');
  const ask = pop(page).getByRole('button', { name: fill(ko.glossary.missSearch, { text: 'zqx9' }) });
  await expect(ask).toBeVisible();
  await ask.click();
  await expect(page.locator('.dict-sheet')).toBeVisible();
  await expect(page.locator('.dict-sheet input')).toHaveValue('zqx9');
});

test("설정: '어려운 말 풀이'를 끄면 고르기로 안 뜨고, '점선 밑줄'을 끄면 밑줄이 없다", async ({ page }) => {
  await hintSeen(page);
  await page.addInitScript(() => localStorage.setItem('cc:prefs:v1', JSON.stringify({ glossary: false, marks: false })));
  await page.goto('/tools/supabase');
  await ready(page);
  await expect(page.locator('.term-mark')).toHaveCount(0);
  const pt = await charPoint(page, '.kv', '로그인');
  await page.mouse.dblclick(pt.x, pt.y);
  await page.waitForTimeout(400);
  expect(await isOpen(page)).toBe(false);
});

test('처음 한 번 기사 메시지, 동작 줄이기에서 움직이지 않음, 풀이를 연 화면의 axe 심각·치명 0', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools/supabase');
  await ready(page);
  await expect(page.locator('.term-hint')).toContainText(ko.glossary.hint.split('. ')[0] ?? '');
  await page.locator('main .term-mark').first().click();
  await expect(pop(page)).toBeVisible();
  expect(await pop(page).evaluate((p) => getComputedStyle(p).translate)).toBe('none');
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id)).toEqual([]);
  await page.reload();
  await ready(page);
  await expect(page.locator('.term-hint')).toHaveCount(0);
});

test('처음 한 번 안내는 본문 흐름 안의 알림 칸에 있고, 접으면 초점이 다음 누를 것으로 간다', async ({ page }) => {
  await page.goto('/tools/supabase');
  await ready(page);
  const hint = page.locator('[data-term-hint] .term-hint');
  await expect(hint).toBeVisible();
  await expect(page.locator('[data-term-hint]')).toHaveAttribute('role', 'status');
  expect(await hint.evaluate((el) => getComputedStyle(el).position)).toBe('static');
  await hint.getByRole('button', { name: ko.dispatch.hide }).focus();
  await page.keyboard.press('Enter');
  await expect(hint).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement !== document.body && document.activeElement?.matches('a, button'))).toBe(true);
});

test('밑줄 말로 연 풀이는 초점이 밑줄 말과 풀이를 벗어나면 닫힌다', async ({ page }) => {
  await hintSeen(page);
  await page.goto('/tools/supabase');
  await ready(page);
  const marks = page.locator('main .term-mark');
  await marks.first().click();
  await expect(pop(page)).toBeVisible();
  await marks.nth(1).focus();
  await expect(pop(page)).toBeHidden();
});

test('자바스크립트가 꺼져 있으면 밑줄 말은 Tab 순서에 남는 버튼이 아니라 글이다', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/tools/supabase');
  await expect(page.locator('main button.term-mark')).toHaveCount(0);
  expect(await page.locator('main span.term-mark').count()).toBeGreaterThan(0);
  await ctx.close();
});
