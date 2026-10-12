// 접근성 (T20, docs/UX.md 6절): 모든 화면에서 axe 심각·치명 0. 진행이 있는 상태(레시피로 채움)의 정류장 화면도 본다.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { islandsReady } from './helpers.ts';
import { readFileSync } from 'node:fs';

const ROUTES = ['/', '/lesson', '/interview', '/shop', '/check', '/receipt', '/study', '/concepts/api', '/shelf', '/products/neis-meal', '/recipes', '/dictionary', '/about', '/about/scoring', '/about/credits', '/legal/privacy', '/legal/notice', '/nowhere'];

const recipe = (JSON.parse(readFileSync('data/recipes.json', 'utf8')) as { recipes: { answers: Record<string, string>; cart: string[]; kept?: string[]; freeText?: string }[] }).recipes[0];

async function serious(page: import('@playwright/test').Page): Promise<string[]> {
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

for (const route of ['/', '/interview', '/shop', '/check', '/receipt', '/study']) {
  test(`axe ${route} (레시피로 채운 진행)`, async ({ page }) => {
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
