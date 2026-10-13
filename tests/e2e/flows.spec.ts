// 주요 흐름 (T20): 코스 5개로 영수증까지, 만들 앱 정하기 처음부터 끝까지(키보드만), 영수증 링크 다시 열기.
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { addToCart, answerInterview, golden, hydrated, islandsReady, receiptWords, recipes } from './helpers.ts';

for (const recipe of recipes) {
  test(`코스 '${recipe.title}'로 출발해 영수증과 설계도를 받는다`, async ({ page }) => {
    await page.goto('/courses');
    const go = await hydrated(page.getByRole('button', { name: fill(ko.home.recipeGoLabel, { title: recipe.title }) }));
    await go.click();
    await page.waitForURL(/\/check$/);
    await islandsReady(page);
    const issue = page.locator('.action-bar .btn-issue');
    await expect(issue).not.toHaveAttribute('aria-disabled', 'true');
    await issue.click();
    await page.waitForURL(/\/arrival$/);
    await islandsReady(page);
    await expect(page.locator('.paper')).toBeVisible();
    await page.getByRole('tab', { name: ko.receipt.tabs.pack }).click();
    const pre = page.locator('.pack-pre');
    await page.locator('.pack-preview summary').click();
    await expect(pre).toContainText(`# ${recipe.freeText ?? ''}`);
  });
}

test('받은 영수증은 지난 영수증에 쌓이고, 줄을 누르면 다시 열리며, 지울 수 있다', async ({ page }) => {
  const recipe = recipes[0];
  if (!recipe) throw new Error('코스가 없다');
  await page.goto('/courses');
  await (await hydrated(page.getByRole('button', { name: fill(ko.home.recipeGoLabel, { title: recipe.title }) }))).click();
  await page.waitForURL(/\/check$/);
  await islandsReady(page);
  await page.locator('.action-bar .btn-issue').click();
  await page.waitForURL(/\/arrival$/);
  await islandsReady(page);
  await expect(page.locator('.paper')).toBeVisible();
  await page.goto('/receipts');
  await islandsReady(page);
  // 줄 72: 미니 지도 + 이름 + '받은 날 · 영수증 0000' (brief 6.11)
  const rows = page.locator('.receipts-list > li');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().locator('.list-map svg')).toHaveCount(1);
  await expect(rows.first().locator('.list-sub')).toContainText(/영수증 \d{4}$/);
  await rows.first().locator('a.list-row').click();
  await page.waitForURL(/\/arrival/);
  await islandsReady(page);
  await expect(page.locator('.paper')).toBeVisible();
  await page.goto('/receipts');
  await islandsReady(page);
  // 지우기는 확인 대화 상자를 거친다: 그만두면 그대로, 지우면 빈 상태
  const del = page.locator('.receipt-del').first();
  await del.click();
  const confirm = page.getByRole('dialog', { name: ko.receipts.confirmTitle });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: ko.receipts.confirmNo }).click();
  await expect(rows).toHaveCount(1);
  await expect(del).toBeFocused();
  await del.click();
  await confirm.getByRole('button', { name: ko.receipts.confirmYes }).click();
  await expect(page.locator('.empty-state')).toContainText(ko.receipts.empty);
  await expect(page.locator('.empty-state a.btn-primary')).toHaveText(ko.receipts.goBuild);
});

test('만들 앱을 처음부터 끝까지 키보드만으로 정하고 도구 고르기·도구끼리 맞춰 보기·설계도 받기까지 간다 (case-01)', async ({ page }) => {
  const kase = golden('case-01');
  await page.goto('/destination');
  await islandsReady(page);
  await answerInterview(page, kase.answers, { keyboard: true, freeText: '우리 반 급식 안내' });
  await expect(page.locator('.q-done h1')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.q-done a.btn-primary')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/waypoints$/);
  await islandsReady(page);
  await addToCart(page, kase.cart);
  await page.locator('.action-bar a.btn-primary').click();
  await page.waitForURL(/\/check$/);
  await islandsReady(page);
  await page.locator('.action-bar .btn-issue').click();
  await page.waitForURL(/\/arrival$/);
  await islandsReady(page);
  await expect(page.locator('.paper')).toContainText('우리 반 급식 안내');
});

test('영수증 링크를 다른 기기에서 열면 같은 영수증을 읽기 전용으로 보고, 이어서 가기로 가져온다', async ({ page, browser, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/courses');
  const first = recipes[0];
  if (!first) throw new Error('코스가 없다');
  await (await hydrated(page.getByRole('button', { name: fill(ko.home.recipeGoLabel, { title: first.title }) }))).click();
  await page.waitForURL(/\/check$/);
  await islandsReady(page);
  await page.locator('.action-bar .btn-issue').click();
  await page.waitForURL(/\/arrival$/);
  await islandsReady(page);
  const paper = (await page.locator('.paper').innerText()).split('\n').filter((l) => !/\d{4}-\d{2}-\d{2}/.test(l));
  await page.getByRole('button', { name: ko.receipt.copyLink }).click();
  // 누르기가 출력 장면도 끝내서 축하 알림과 같이 이어 읽힌다
  await expect(page.locator('#cc-live')).toContainText(ko.receipt.linkCopied);
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('/arrival#');

  const other = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const pc = await other.newPage();
  await pc.goto(url);
  await islandsReady(pc);
  // 읽자마자 주소의 조각을 지운다
  await expect.poll(() => new URL(pc.url()).hash).toBe('');
  const sharedPaper = (await pc.locator('.paper').innerText()).split('\n').filter((l) => !/\d{4}-\d{2}-\d{2}/.test(l));
  // 한 줄 입력(freeText)은 공유 링크에 넣지 않으므로 영수증의 목적지 줄만 다르다 (RECEIPT.md 5절)
  const withoutDestination = (lines: string[]): string[] => lines.filter((_, i) => lines[i - 1] !== receiptWords.destination);
  expect(withoutDestination(sharedPaper)).toEqual(withoutDestination(paper));
  expect(sharedPaper).not.toContain(first.freeText);
  await expect(pc.getByText(ko.receipt.sharedNote)).toBeVisible();
  await pc.getByRole('button', { name: ko.receipt.continueHere }).click();
  await expect(pc.locator('#cc-live')).toContainText(ko.receipt.continued);
  const saved = await pc.evaluate(() => JSON.parse(localStorage.getItem('cc:session:v1') ?? '{}') as { cart?: string[] });
  expect(saved.cart?.length).toBeGreaterThan(0);
  await other.close();
});
