// 모션 (T16·T20, docs/CONCEPT.md 7절): 장면 중간에 누르면 끝 상태, 동작 줄이기(기기·사이트 설정)로 흐름이 끝까지.
import { expect, test } from '@playwright/test';
import { addToCart, answerInterview, golden, islandsReady, longAnimations, recipes } from './helpers.ts';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { hydrated } from './helpers.ts';

test('단계 줄: 지금 단계가 표시되고, 다른 단계 링크로 옮겨 간다', async ({ page }) => {
  await page.goto('/test-drive');
  await islandsReady(page);
  await expect(page.locator('.rail a[aria-current="step"]')).toHaveAttribute('href', '/test-drive');
  await page.locator('.rail a[href="/destination"]').click();
  await page.waitForURL(/\/destination$/);
  await islandsReady(page);
  await expect(page.locator('.rail a[aria-current="step"]')).toHaveAttribute('href', '/destination');
  // 목적지를 정하기 전에는 경유지로 갈 수 없다: 링크가 아니라 이유를 알려 주는 버튼
  await expect(page.locator('.rail .step.locked button').first()).toHaveAttribute('aria-disabled', 'true');
});

test('도착: 영수증 출력 중에 누르면 다 나온 영수증이 바로 보인다', async ({ page }) => {
  const first = recipes[0];
  if (!first) throw new Error('코스가 없다');
  await page.goto('/courses');
  await (await hydrated(page.getByRole('button', { name: fill(ko.home.recipeGoLabel, { title: first.title }) }))).click();
  await page.waitForURL(/\/check$/);
  await islandsReady(page);
  await page.locator('.action-bar .btn-issue').click();
  await page.waitForURL(/\/arrival$/);
  await islandsReady(page);
  await expect(page.getByRole('button', { name: ko.receipt.skip })).toBeVisible();
  // 화면 어디든 누르면 끝난다: 링크가 없는 제목을 누른다 (종이 모서리는 출력 중 머리줄 링크와 겹칠 수 있다)
  await page.locator('#receipt-title').click({ force: true });
  await expect.poll(() => longAnimations(page, 0)).toEqual([]);
  await expect(page.locator('.paper')).toHaveCSS('transform', /none|matrix\(1, 0, 0, 1, 0, 0\)/);
});

for (const mode of ['기기 설정', '사이트 설정'] as const) {
  test(`동작 줄이기(${mode}): 이동 없이 시운전부터 영수증까지 간다`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: mode === '기기 설정' ? 'reduce' : 'no-preference' });
    if (mode === '사이트 설정') await context.addInitScript(() => localStorage.getItem('cc:prefs:v1') ?? localStorage.setItem('cc:prefs:v1', JSON.stringify({ motion: 'reduce', sound: false })));
    const page = await context.newPage();
    const kase = golden('case-01');
    const still = async (): Promise<void> => expect(await longAnimations(page)).toEqual([]);
    await page.goto('/');
    await still();
    await page.goto('/test-drive');
    await islandsReady(page);
    const finish = await hydrated(page.locator('main button.btn-primary').last());
    await finish.click();
    await still();
    await page.locator('.rail a[href="/destination"]').click();
    await page.waitForURL(/\/destination$/);
    await islandsReady(page);
    await still();
    await answerInterview(page, kase.answers);
    await still();
    await page.locator('.q-done a.btn-primary').click();
    await page.waitForURL(/\/waypoints$/);
    await islandsReady(page);
    await addToCart(page, kase.cart);
    await still();
    await page.locator('.action-bar a.btn-primary').click();
    await page.waitForURL(/\/check$/);
    await islandsReady(page);
    await still();
    await page.locator('.action-bar .btn-issue').click();
    await page.waitForURL(/\/arrival$/);
    await islandsReady(page);
    await still();
    await expect(page.getByRole('button', { name: ko.receipt.skip })).toBeHidden();
    await expect(page.locator('.paper')).toBeVisible();
    await context.close();
  });
}
