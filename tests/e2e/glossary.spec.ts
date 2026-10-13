// 어려운 말 풀이 (D60): 화면 글에서 어려운 말을 끌어 고르면 쉬운 한 문장 풀이가 뜨고, 모르는 말은 사전으로 이어진다.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { readFileSync } from 'node:fs';
import { islandsReady } from './helpers.ts';

const glossary = JSON.parse(readFileSync(new URL('../../data/glossary.json', import.meta.url), 'utf8')) as { terms: { id: string; term: string; plain: string }[] };
const apiKey = glossary.terms.find((t) => t.id === 'api-key');

/** 요소 글 전체를 고른다 (마우스로 끌어 고른 것과 같은 Selection) */
async function selectText(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().evaluate((el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = document.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  });
}

test('어려운 말을 고르면 풀이가 고른 글 아래에 뜨고, 용어 카드로 이어지며, Esc로 닫힌다', async ({ page }) => {
  if (!apiKey) throw new Error('api-key 풀이가 없다');
  await page.goto('/terms/api-key');
  await islandsReady(page);
  await selectText(page, 'main h1');
  const pop = page.getByRole('dialog', { name: fill(ko.glossary.label, { term: apiKey.term }) });
  await expect(pop).toBeVisible();
  await expect(pop).toContainText(apiKey.plain);
  await expect(pop.getByRole('link', { name: ko.glossary.more })).toHaveAttribute('href', '/terms/api-key');
  const h1 = await page.locator('main h1').boundingBox();
  const box = await pop.boundingBox();
  expect(box && h1 && box.y >= h1.y + h1.height - 1).toBe(true);
  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);
});

test("모르는 짧은 말은 '사전에서 찾기'로 사전 창이 그 말로 열린다", async ({ page }) => {
  await page.goto('/about');
  await islandsReady(page);
  await selectText(page, 'main h1');
  const title = (await page.locator('main h1').first().innerText()).trim();
  const ask = page.getByRole('button', { name: fill(ko.glossary.missSearch, { text: title }) });
  await expect(ask).toBeVisible();
  await ask.click();
  await expect(page.locator('.dict-sheet')).toBeVisible();
  await expect(page.locator('.dict-sheet input')).toHaveValue(title);
});
