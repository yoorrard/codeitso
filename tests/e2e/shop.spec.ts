// 쇼핑몰 주요 흐름 (v5 S1): 홈 → 카테고리 → 소분류 목록 2페이지 → 상세 → 담기(+메모) → 장바구니, 휴대폰 390과 PC 1440에서.
// PC 첫 화면(1440×900)에 목록 첫 줄 카드가 다 보이는지, 정렬·쪽 주소, 카드 [담기], 카테고리 메뉴, 검색, 용어 풀이.
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/text.ts';
import { blockExternal, cardName, islandsReady, selectText } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await blockExternal(page);
});

for (const vp of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test.describe(`${vp.width}×${vp.height}`, () => {
    test.use({ viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600 });

    test('홈 → 카테고리 → 2페이지 → 상세 → 메모와 함께 담기 → 장바구니', async ({ page }) => {
      await page.goto('/');
      await islandsReady(page);
      await page.locator('.cat-tile[data-cat="ai"] a').click();
      await expect(page).toHaveURL(/\/c\/ai$/);
      await page.locator('a.sub-tile[href$="/c/ai/mcp"]').click();
      await expect(page).toHaveURL(/\/c\/ai\/mcp$/);
      await islandsReady(page);
      const first = (await cardName(page).textContent())?.trim();
      await page.locator('.pager').getByRole('link', { name: fill(ko.list.pageLabel, { n: 2 }) }).click();
      await expect(page).toHaveURL(/\/c\/ai\/mcp\?page=2$/);
      await expect(page.locator('.list-range')).toContainText('61–120');
      await expect(page.locator('.list-total')).toBeFocused();
      const second = (await cardName(page).textContent())?.trim();
      expect(second).toBeTruthy();
      expect(second).not.toBe(first);
      await expect(page.locator('.pager [aria-current="page"]')).toHaveText('2');

      // 주소로 바로 열어도 같은 쪽 (빌드 때 그린 1쪽을 감췄다가 바꿔 그린다)
      await page.reload();
      await islandsReady(page);
      await expect(cardName(page)).toHaveText(second ?? '');
      await expect(page.locator('html')).not.toHaveAttribute('data-list-pending', '');

      await page.locator('.listing-grid .card-link').first().click();
      await expect(page).toHaveURL(/\/item\?id=/);
      await expect(page.locator('h1.detail-name')).toHaveText(second ?? '');
      await expect(page.locator('.info-table')).toBeVisible();
      await page.locator('#item-memo').fill('파일 읽기에 쓴다');
      await page.getByRole('button', { name: ko.item.add }).click();
      await expect(page.locator('.in-cart')).toBeVisible();
      await expect(page.locator('.hd-badge')).toHaveText('1');

      // 머리줄 장바구니 → 서랍 → 장바구니 쪽
      await page.locator('a.hd-cart').click();
      await expect(page.locator('dialog.drawer')).toBeVisible();
      await expect(page.locator('dialog.drawer .cart-memo')).toContainText('파일 읽기에 쓴다');
      await page.locator('dialog.drawer').getByRole('link', { name: ko.drawer.toCart }).click();
      await expect(page).toHaveURL(/\/cart$/);
      await islandsReady(page);
      await expect(page.locator('.cart-name')).toHaveText(second ?? '');
      await expect(page.locator('.cart-memo')).toContainText('파일 읽기에 쓴다');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
    });
  });
}

test.describe('PC 1440×900 첫 화면', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test('목록 첫 줄 카드(거르기 칸 옆 4열)가 첫 화면 안에 다 보인다 (홈 기획전 첫 줄도)', async ({ page }) => {
    await page.goto('/c/design/fonts');
    await islandsReady(page);
    await expect(page.locator('.facet-side')).toBeVisible();
    const cards = page.locator('.listing-grid > li');
    const boxes = await Promise.all([0, 1, 2, 3, 4].map((i) => cards.nth(i).boundingBox()));
    const firstRow = boxes.filter((b) => b?.y === boxes[0]?.y);
    expect(firstRow.length).toBeGreaterThanOrEqual(4);
    for (const b of firstRow) expect((b?.y ?? 0) + (b?.height ?? 0)).toBeLessThanOrEqual(900);
    await page.goto('/');
    const row = await page.locator('.row-track > li').first().boundingBox();
    expect((row?.y ?? 0) + (row?.height ?? 0)).toBeLessThanOrEqual(900);
  });
});

test('정렬: 이름순·최근 갱신순 주소, 뒤로 가기', async ({ page }) => {
  await page.goto('/c/design/fonts');
  await islandsReady(page);
  const popular = (await cardName(page).textContent())?.trim();
  await page.locator('.sort-nav').getByRole('link', { name: ko.list.sorts.name }).click();
  await expect(page).toHaveURL(/\/c\/design\/fonts\?sort=name$/);
  await expect(page.locator('.sort-nav [aria-current="true"]')).toHaveText(ko.list.sorts.name);
  const byName = (await cardName(page).textContent())?.trim();
  expect(byName).not.toBe(popular);
  await page.goBack();
  await expect(page).toHaveURL(/\/c\/design\/fonts$/);
  await expect(cardName(page)).toHaveText(popular ?? '');
});

test('카드 [담기]: 누르면 담음·배지 1·작은 창, 다시 누르면 서랍이 그 줄로 초점 (상태는 쪽을 옮겨도 남는다)', async ({ page }) => {
  await page.goto('/c/design/gradients');
  await islandsReady(page);
  const btn = page.locator('.listing-grid button[data-add]').first();
  const name = (await btn.getAttribute('data-name')) ?? '';
  await expect(btn).toHaveAttribute('data-in', 'false');
  await btn.click();
  await expect(btn).toHaveAttribute('data-in', 'true');
  await expect(btn).toContainText(ko.card.added);
  await expect(btn).toHaveAccessibleName(fill(ko.card.inCartLabel, { name }));
  await expect(page.locator('.hd-badge')).toHaveText('1');
  await expect(page.locator('#cc-live')).toContainText(ko.card.addedLive.split(':')[0] ?? '');
  await expect(page.locator('.add-pop')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.add-pop')).toHaveCount(0);
  await expect(btn).toBeFocused();
  await page.reload();
  await islandsReady(page);
  const again = page.locator('.listing-grid button[data-add]').first();
  await expect(again).toHaveAttribute('data-in', 'true');
  await again.click();
  await expect(page.locator('dialog.drawer')).toBeVisible();
  await expect(page.locator('dialog.drawer [data-line]').first()).toBeFocused();
  await expect(page.locator('.hd-badge')).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.drawer')).toBeHidden();
  await expect(again).toBeFocused();
});

test('카테고리 메뉴: 모든 대분류·소분류, Esc로 닫으면 단추로 초점', async ({ page }) => {
  await page.goto('/');
  const summary = page.locator('.catmenu > summary');
  await summary.click();
  const panel = page.locator('.catmenu-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.catmenu-col')).toHaveCount(6);
  expect(await panel.locator('.catmenu-subs a').count()).toBeGreaterThan(90);
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(summary).toBeFocused();
});

test('검색: 머리줄 검색창 → 결과에 소분류와 대분류별 상품', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/');
  await page.locator('#hd-q').fill('MCP');
  await page.locator('#hd-q').press('Enter');
  await expect(page).toHaveURL(/\/search\?q=MCP$/);
  await islandsReady(page);
  await expect(page.locator('.search-sum')).toContainText('"MCP"');
  await expect(page.locator('.search-subs .chip').first()).toBeVisible();
  await expect(page.locator('.search-group .card').first()).toBeVisible();
  await expect(page.locator('#hd-q')).toHaveValue('MCP');
  await expect(page.locator('#page-q')).toHaveValue('MCP');
});

test('용어 사전: 풀이 속 용어를 고르면 풀이 상자가 뜨고 Esc로 닫힌다', async ({ page }) => {
  await page.goto('/terms');
  await islandsReady(page);
  await selectText(page.locator('#cors dd p').first(), '브라우저');
  await expect(page.locator('#term-pop')).toBeVisible();
  await expect(page.locator('#term-pop-name')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(page.locator('#term-pop')).toBeHidden();
});

test('상세: 없는 id·빈 id는 안내와 처음 화면 링크', async ({ page }) => {
  await page.goto('/item?id=no-such%3Aitem');
  await islandsReady(page);
  await expect(page.locator('.detail-empty')).toContainText(ko.item.notFound);
  await page.goto('/item');
  await islandsReady(page);
  await expect(page.locator('.detail-empty')).toContainText(ko.item.noId);
});
