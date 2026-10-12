// 모션 (T16·T20, docs/UX.md 4절): 장면 중간에 누르면 끝 상태, 동작 줄이기(기기·사이트 설정)로 흐름이 끝까지.
import { expect, test } from '@playwright/test';
import { addToCart, answerInterview, golden, islandsReady, longAnimations, recipes } from './helpers.ts';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { hydrated } from './helpers.ts';

test('노선 띠: 정류장을 옮기면 차가 달리고, 화면을 누르면 바로 도착한다', async ({ page }) => {
  await page.goto('/lesson');
  await islandsReady(page);
  await page.locator('.route a[href="/interview"]').click();
  await page.waitForURL(/\/interview$/);
  await expect(page.locator('html')).toHaveAttribute('data-drive', '');
  await expect.poll(() => longAnimations(page)).toContain('drive');
  await page.mouse.click(10, 700);
  expect(await longAnimations(page)).toEqual([]);
});

test('계산대: 영수증 출력 중에 누르면 다 나온 영수증과 도장이 바로 보인다', async ({ page }) => {
  const first = recipes[0];
  if (!first) throw new Error('레시피가 없다');
  await page.goto('/recipes');
  await (await hydrated(page.getByRole('button', { name: fill(ko.home.recipeGoLabel, { title: first.title }) }))).click();
  await page.waitForURL(/\/check$/);
  await islandsReady(page);
  await page.locator('.action-bar .btn-issue').click();
  await page.waitForURL(/\/receipt$/);
  await islandsReady(page);
  await expect(page.getByRole('button', { name: ko.receipt.skip })).toBeVisible();
  await page.locator('.paper').click({ position: { x: 20, y: 20 }, force: true });
  await expect.poll(() => longAnimations(page, 0)).toEqual([]);
  await expect(page.locator('.paper')).toHaveCSS('transform', /none|matrix\(1, 0, 0, 1, 0, 0\)/);
});

for (const mode of ['기기 설정', '사이트 설정'] as const) {
  test(`동작 줄이기(${mode}): 이동 없이 첫 수업부터 영수증까지 간다`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: mode === '기기 설정' ? 'reduce' : 'no-preference' });
    if (mode === '사이트 설정') await context.addInitScript(() => localStorage.getItem('cc:prefs:v1') ?? localStorage.setItem('cc:prefs:v1', JSON.stringify({ motion: 'reduce', sound: false })));
    const page = await context.newPage();
    const kase = golden('case-01');
    const still = async (): Promise<void> => expect(await longAnimations(page)).toEqual([]);
    await page.goto('/');
    await still();
    await page.goto('/lesson');
    await islandsReady(page);
    const finish = await hydrated(page.locator('main button.btn-primary').last());
    await finish.click();
    await still();
    await page.locator('.route a[href="/interview"]').click();
    await page.waitForURL(/\/interview$/);
    await islandsReady(page);
    await still();
    await answerInterview(page, kase.answers);
    await still();
    await page.locator('.q-done a.btn-primary').click();
    await page.waitForURL(/\/shop$/);
    await islandsReady(page);
    await addToCart(page, kase.cart);
    await still();
    await page.locator('.action-bar a.btn-primary').click();
    await page.waitForURL(/\/check$/);
    await islandsReady(page);
    await still();
    await page.locator('.action-bar .btn-issue').click();
    await page.waitForURL(/\/receipt$/);
    await islandsReady(page);
    await still();
    await expect(page.getByRole('button', { name: ko.receipt.skip })).toBeHidden();
    await expect(page.locator('.paper')).toBeVisible();
    await context.close();
  });
}
