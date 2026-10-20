// 화면 사이 오가기·찜·비교 (N1, D137): 소분류 안 검색(치는 대로·관련도순·거르기·정렬·지우기·없을 때), 대분류 안 검색(→ /search?cat=),
// 모든 화면의 [뒤로](사이트 안이면 이전 화면, 바로 열면 위 단계), 찜(카드·상세·머리줄·/wishlist·되돌리기), 비교(/compare), 공유(주소 복사),
// '/' 키, 맨 위로, 좁은 화면의 붙어 따라오는 거르기·정렬 줄. PC 1440과 휴대폰 390.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/text.ts';
import { addWithSheet, blockExternal, cardName, islandsReady } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await blockExternal(page);
});

async function axeClean(page: Page): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

/** 목록 제목의 개수 ('상품 2,124개' · '"notion" 검색 결과 42개') */
async function listCount(page: Page): Promise<number> {
  const t = (await page.locator('.list-total').textContent()) ?? '';
  return Number(t.match(/([\d,]+)개/)?.[1]?.replace(/,/g, '') ?? 'NaN');
}

test.describe('PC 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test('소분류 안 검색: 치면 관련도순으로 찾고, 뒤로 가기·거르기·정렬·새로 고침과 함께, 지우면 원래 목록, 없으면 넓혀 찾기', async ({ page }) => {
    await page.goto('/c/ai/mcp');
    await islandsReady(page);
    const all = await listCount(page);
    const box = page.locator('#list-q');
    await box.fill('notion');
    await expect(page).toHaveURL(/\/c\/ai\/mcp\?q=notion$/);
    await expect(page.locator('.list-total')).toContainText('"notion"');
    await expect(page.locator('.sort-nav [aria-current="true"]')).toHaveText(ko.list.sorts.match);
    await expect(cardName(page, 0)).toContainText(/notion/i);
    const n = await listCount(page);
    expect(n).toBeGreaterThan(5);
    expect(n).toBeLessThan(all);
    // 검색을 시작한 것은 기록에 남아 뒤로 가기로 검색 전 목록
    await page.goBack();
    await expect(page).toHaveURL(/\/c\/ai\/mcp$/);
    await expect(box).toHaveValue('');
    await expect.poll(() => listCount(page)).toBe(all);
    await page.goForward();
    await expect(box).toHaveValue('notion');
    await expect.poll(() => listCount(page)).toBe(n);
    // 거르기 칸의 개수도 검색 결과 안에서 센다
    const remote = page.locator('.facet-side .facet-opt', { hasText: ko.facets.values['transport']?.['remote'] ?? '' });
    const inResults = Number((await remote.locator('.facet-n').textContent())?.replace(/,/g, ''));
    expect(inResults).toBeLessThanOrEqual(n);
    await remote.locator('input').check();
    await expect(page).toHaveURL(/\?q=notion&transport=remote$/);
    await expect.poll(() => listCount(page)).toBe(inResults);
    await page.locator('.sort-nav').getByRole('link', { name: ko.list.sorts.popular }).click();
    await expect(page).toHaveURL(/\?q=notion&transport=remote&sort=popular$/);
    await page.reload();
    await islandsReady(page);
    await expect(box).toHaveValue('notion');
    await expect(page.locator('.sort-nav [aria-current="true"]')).toHaveText(ko.list.sorts.popular);
    await expect.poll(() => listCount(page)).toBe(inResults);
    await axeClean(page);
    // 지우기: 검색어만 빠지고 거르기는 남는다, 초점은 검색창
    await page.getByRole('button', { name: ko.list.findClear }).click();
    // 검색어가 없으면 인기순이 기본이라 주소에서 빠진다
    await expect(page).toHaveURL(/\/c\/ai\/mcp\?transport=remote$/);
    await expect(box).toBeFocused();
    await expect(page.locator('.sort-nav').getByRole('link', { name: ko.list.sorts.match })).toHaveCount(0);
    // 맞는 것이 없으면 대분류·전체에서 찾는 길
    await box.fill('zzqqxxvv');
    const empty = page.locator('.find-empty');
    await expect(empty).toBeVisible();
    await expect(empty.locator('a').nth(0)).toHaveAttribute('href', '/search?q=zzqqxxvv&cat=ai');
    await expect(empty.locator('a').nth(1)).toHaveAttribute('href', '/search?q=zzqqxxvv');
  });

  test('대분류 안 검색: 대분류 쪽 검색창 → 그 대분류 결과, 고쳐 쳐도 대분류를 지키고, 그 대분류에 없으면 전체로 가는 길', async ({ page }) => {
    await page.goto('/c/design');
    await page.locator('#cat-q').fill('icon');
    await page.locator('#cat-q').press('Enter');
    await expect(page).toHaveURL(/\/search\?q=icon&cat=design$/);
    await islandsReady(page);
    await expect(page.locator('.search-cats a[aria-current="page"]')).toHaveAttribute('data-cat', 'design');
    await page.locator('#page-q').fill('arrow');
    await expect(page).toHaveURL(/\/search\?q=arrow&cat=design$/);
    await expect(page.locator('.search-cats a[aria-current="page"]')).toHaveAttribute('data-cat', 'design');
    // 디자인에는 없고 다른 곳에는 있는 말
    await page.goto('/search?q=kaggle&cat=design');
    await islandsReady(page);
    const empty = page.locator('.search-empty');
    await expect(empty).toContainText('"kaggle"');
    await empty.getByRole('link').click();
    await expect(page).toHaveURL(/\/search\?q=kaggle$/);
    await expect(page.locator('.search-group').first()).toBeVisible();
  });

  test('뒤로: 바로 열면 위 단계(상세 → 소분류), 사이트 안에서 왔으면 이전 화면(목록 2쪽)', async ({ page }) => {
    await page.goto('/item?id=google-fonts%3Aroboto');
    await islandsReady(page);
    const back = page.locator('a[data-back]');
    await expect(back).toHaveAttribute('href', '/c/design/fonts');
    await back.click();
    await expect(page).toHaveURL(/\/c\/design\/fonts$/);
    await page.goto('/c/design/fonts?page=2');
    await islandsReady(page);
    const name = (await cardName(page, 0).textContent()) ?? '';
    await cardName(page, 0).click();
    await expect(page).toHaveURL(/\/item\?id=/);
    await islandsReady(page);
    await page.locator('a[data-back]').click();
    await expect(page).toHaveURL(/\/c\/design\/fonts\?page=2$/);
    await expect(cardName(page, 0)).toHaveText(name);
  });

  test('모든 화면에 [뒤로]가 하나 있고 처음 화면에는 없다', async ({ page }) => {
    const paths = ['/c', '/c/design', '/c/design/fonts', '/item?id=google-fonts%3Aroboto', '/search', '/cart', '/prompts', '/kits', '/recent'];
    paths.push('/wishlist', '/compare', '/terms', '/about', '/about/credits', '/legal/terms', '/legal/privacy', '/legal/notice', '/legal/copyright', '/no-such-page');
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator('a[data-back]'), path).toHaveCount(1);
    }
    await page.goto('/about/credits');
    await expect(page.locator('a[data-back]')).toHaveAttribute('href', '/about');
    await page.goto('/');
    await expect(page.locator('a[data-back]')).toHaveCount(0);
  });

  test('찜: 카드 하트 → 머리줄 개수 → /wishlist(담기·빼기·되돌리기) → 같은 소분류 둘 비교', async ({ page }) => {
    await page.goto('/c/design/fonts');
    await islandsReady(page);
    const hearts = page.locator('.listing-grid button[data-wish]');
    const names = await Promise.all([0, 1, 2].map(async (i) => (await cardName(page, i).textContent()) ?? ''));
    for (const i of [0, 1, 2]) await hearts.nth(i).click();
    await expect(hearts.nth(0)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.hd-wish-n')).toHaveText('3');
    await hearts.nth(2).click();
    await expect(hearts.nth(2)).toHaveAttribute('aria-pressed', 'false');
    const link = page.locator('a[data-wish-link]');
    await expect(link).toHaveAttribute('aria-label', fill(ko.layout.wishCount, { n: 2 }));
    await link.click();
    await expect(page).toHaveURL(/\/wishlist$/);
    await islandsReady(page);
    await expect(page.locator('.wish-line')).toHaveCount(2);
    // 가장 최근에 찜한 것이 앞
    await expect(page.locator('.wish-name').first()).toHaveText(names[1] ?? '');
    await addWithSheet(page, page.locator('.wish-line').first().locator('button[data-add]'));
    await expect(page.locator('.hd-badge')).toHaveText('1');
    await page.getByRole('button', { name: fill(ko.wish.removeLabel, { name: names[1] ?? '' }) }).click();
    await expect(page.locator('.wish-line')).toHaveCount(1);
    await page.getByRole('button', { name: ko.wish.undoLabel }).click();
    await expect(page.locator('.wish-line')).toHaveCount(2);
    await axeClean(page);
    const compare = page.locator('.wish-compare a');
    await expect(compare).toContainText(fill(ko.wish.compare, { n: 2 }));
    await compare.click();
    await expect(page).toHaveURL(/\/compare\?ids=/);
    await islandsReady(page);
    await expect(page.locator('table.cmp thead th')).toHaveCount(2);
    await expect(page.locator('table.cmp tbody tr')).toHaveCount(Object.keys(ko.compare.rows).length);
    await axeClean(page);
    await page.getByRole('button', { name: fill(ko.compare.removeLabel, { name: names[0] ?? '' }) }).click();
    await expect(page.locator('table.cmp thead th')).toHaveCount(1);
    await expect(page.locator('.cmp-page .notice')).toHaveText(ko.compare.few);
    expect(new URL(page.url()).searchParams.get('ids')?.split(',')).toHaveLength(1);
  });

  test('상세: 찜, 공유(기기 공유 창이 없으면 주소 복사), 비슷한 재료와 비교 → 뒤로는 상세', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true }));
    await page.goto('/item?id=google-fonts%3Aroboto');
    await islandsReady(page);
    const heart = page.locator('.buy-box button[data-wish]');
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.hd-wish-n')).toHaveText('1');
    const share = page.getByRole('button', { name: ko.item.shareLabel });
    await share.click();
    await expect(share).toContainText(ko.common.copied);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());
    await page.getByRole('link', { name: ko.item.compare }).click();
    await expect(page).toHaveURL(/\/compare\?ids=google-fonts%3Aroboto,/);
    await islandsReady(page);
    await expect(page.locator('table.cmp thead th')).toHaveCount(4);
    await page.locator('a[data-back]').click();
    await expect(page).toHaveURL(/\/item\?id=google-fonts%3Aroboto$/);
  });

  test("'/' 키는 이 쪽의 검색창으로 (소분류 안 검색이 먼저), 맨 위로 단추는 내려가면 뜨고 누르면 맨 위", async ({ page }) => {
    await page.goto('/c/design/fonts');
    await islandsReady(page);
    await page.keyboard.press('/');
    await expect(page.locator('#list-q')).toBeFocused();
    await expect(page.locator('#list-q')).toHaveValue('');
    await page.goto('/kits');
    await page.keyboard.press('/');
    await expect(page.locator('#hd-q')).toBeFocused();
    await page.goto('/c/design/fonts');
    await islandsReady(page);
    const top = page.locator('.to-top');
    await expect(top).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(top).toBeVisible();
    await top.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator('#main')).toBeFocused();
  });
});

test.describe('휴대폰 390', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('거르기·정렬 줄이 머리줄 아래에 붙어 따라오고, 소분류 안 검색, 가로로 넘치지 않는다', async ({ page }) => {
    await page.goto('/c/design/fonts');
    await islandsReady(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 2500));
    await expect.poll(async () => Math.round((await page.locator('.list-tools').boundingBox())?.y ?? -1)).toBe(64);
    await expect(page.locator('.to-top')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('#list-q').fill('mono');
    await expect(page).toHaveURL(/\/c\/design\/fonts\?q=mono$/);
    await expect(page.locator('.list-total')).toContainText('"mono"');
    await expect(page.locator('.sort-nav [aria-current="true"]')).toHaveText(ko.list.sorts.match);
    await axeClean(page);
  });

  test('상세: 아래 [담기] 줄의 하트로 찜하고, [뒤로]는 그 소분류', async ({ page }) => {
    await page.goto('/item?id=google-fonts%3Aroboto');
    await islandsReady(page);
    const heart = page.locator('.buy-box button[data-wish]');
    await expect(heart).toBeInViewport();
    await heart.click();
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('a[data-back]')).toHaveAttribute('href', '/c/design/fonts');
  });
});
