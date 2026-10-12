// 보안 헤더 (T21, D53): CSP를 켠 채로 주요 조작(영수증 출력·색종이, 꾸러미 내려받기, 사전 옆 창, 진열대 검색, 확인 문제)에서
// 막히는 스크립트·스타일·연결이 없는지 본다. 브라우저의 securitypolicyviolation 이벤트를 모은다.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { hydrated, islandsReady, recipes } from './helpers.ts';

async function watchCsp(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = seen;
    document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.effectiveDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
  });
  return () => page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
}

test('CSP: 레시피 → 영수증 출력·색종이 → 꾸러미 내려받기', async ({ page }) => {
  const violations = await watchCsp(page);
  const first = recipes[0];
  if (!first) throw new Error('레시피가 없다');
  await page.goto('/recipes');
  await (await hydrated(page.getByRole('button', { name: fill(ko.home.recipeGoLabel, { title: first.title }) }))).click();
  await page.waitForURL(/\/check$/);
  await islandsReady(page);
  await page.locator('.action-bar .btn-issue').click();
  await page.waitForURL(/\/receipt$/);
  await islandsReady(page);
  // 출력이 끝나고 색종이가 뜰 때까지
  await expect(page.locator('.stamp-banner')).toBeVisible({ timeout: 8000 });
  // 색종이 캔버스가 실제로 뜬다 (작업자 없이)
  await expect(page.locator('body > canvas')).toHaveCount(1);
  await page.getByRole('tab', { name: ko.receipt.tabs.pack }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: ko.receipt.download }).click();
  expect((await download).suggestedFilename()).toMatch(/\.md$/);
  expect(await violations()).toEqual([]);
});

test('CSP: 사전 옆 창 검색, 진열대 검색, 확인 문제', async ({ page }) => {
  const violations = await watchCsp(page);
  await page.goto('/shop');
  await islandsReady(page);
  await page.locator('.action-bar .dict-btn').click();
  await page.locator('#dict-q').fill('CORS');
  await expect(page.locator('.dict .error-card').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/shelf');
  await islandsReady(page);
  await page.locator('#shelf-q').fill('지도');
  await expect(page.locator('[data-shelf-item]:not([hidden])')).toHaveCount(1);
  await page.goto('/concepts/api');
  const option = await hydrated(page.locator('.quiz-item .option').first());
  await option.click();
  await expect(page.locator('.quiz-result').first()).toBeVisible();
  expect(await violations()).toEqual([]);
});
