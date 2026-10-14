// 접근성 (T20, docs/UX.md 6절): 모든 화면에서 axe 심각·치명 0. 진행이 있는 상태(코스로 채움)의 단계 화면도 본다.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { animationsSettled, islandsReady } from './helpers.ts';
import { readFileSync } from 'node:fs';

const ROUTES = ['/', '/test-drive', '/destination', '/waypoints', '/check', '/arrival', '/terms', '/terms/api', '/tools', '/tools/neis-meal', '/courses', '/dictionary', '/about', '/about/criteria', '/about/credits', '/legal/privacy', '/legal/notice', '/nowhere'];

const recipe = (JSON.parse(readFileSync('data/recipes.json', 'utf8')) as { recipes: { answers: Record<string, string>; cart: string[]; kept?: string[]; freeText?: string }[] }).recipes[0];

async function serious(page: import('@playwright/test').Page): Promise<string[]> {
  await animationsSettled(page);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const route of ROUTES) {
  test(`axe ${route} (처음 온 사람)`, async ({ page }) => {
    await page.goto(route);
    await islandsReady(page);
    expect(await serious(page)).toEqual([]);
  });
}

for (const route of ['/', '/destination', '/waypoints', '/check', '/arrival', '/terms']) {
  test(`axe ${route} (코스로 채운 진행)`, async ({ page }) => {
    await page.addInitScript((s) => {
      localStorage.setItem('cc:session:v1', JSON.stringify(s));
      localStorage.setItem('cc:meta:v1', JSON.stringify({ sent: [], issued: true, lessonDone: true }));
    }, { answers: recipe?.answers ?? {}, cart: recipe?.cart ?? [], kept: recipe?.kept ?? [], deferred: [], freeText: recipe?.freeText });
    await page.goto(route);
    await islandsReady(page);
    await page.mouse.click(5, 790);
    expect(await serious(page)).toEqual([]);
  });
}

// 초점이 아래 막대 뒤에 숨지 않는다 (WCAG 2.4.11). 막대가 큰 /check를 작은 휴대폰(360×640)에서 Tab으로 끝까지 걷는다
test('작은 휴대폰에서 Tab으로 옮긴 초점이 아래 막대에 가리지 않는다 (/check, 360×640)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const c = JSON.parse(readFileSync('data/golden/case-04.json', 'utf8')) as { answers: Record<string, string>; cart: string[] };
  await page.addInitScript((s) => localStorage.setItem('cc:session:v1', JSON.stringify(s)), { answers: c.answers, cart: c.cart, kept: [], deferred: [] });
  await page.goto('/check');
  await islandsReady(page);
  const hidden: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      const bar = document.querySelector('.action-bar');
      if (!el || el === document.body || !bar || bar.contains(el)) return null;
      const box = el.getBoundingClientRect();
      if (box.height === 0) return null;
      // 가운데 점을 덮은 것이 막대인가 (막대는 아래에 붙어 있다가 글 끝에서는 제자리로 돌아온다)
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return { name: (el.textContent ?? '').trim().slice(0, 20) || el.tagName, covered: top !== null && bar.contains(top) };
    });
    if (r?.covered) hidden.push(r.name);
  }
  expect(hidden).toEqual([]);
});
