// 주소 바탕 (설계서 9.4절, D81): GitHub Pages 프로젝트 사이트처럼 /code-chauffeur 아래에서 띄운 하위 주소 빌드(PUBLIC_HOST=static)를 걷는다.
// 홈 → 대분류 → 소분류 2쪽(목록 JSON) → 상세(상세 조각) → 담기 → 장바구니. 같은 사이트 요청 중 404·바탕 밖·/api/event가 0이어야 한다.
// npm run e2e:base로만 돈다 (.qa/dist-base를 만들고 정적 서버를 --base로 띄움, playwright.config.ts의 base-path 프로젝트).
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/text.ts';
import { addWithSheet, blockExternal, islandsReady } from './helpers.ts';

const BASE = '/code-chauffeur';

interface NetLog {
  notFound: string[];
  outside: string[];
  events: string[];
}

/** 같은 사이트 요청을 모두 지켜본다: 404, 바탕 밖, 익명 집계 */
function watch(page: Page): NetLog {
  const log: NetLog = { notFound: [], outside: [], events: [] };
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (!u.protocol.startsWith('http') || !/^(127\.0\.0\.1|localhost)$/.test(u.hostname)) return;
    if (u.pathname.endsWith('/api/event')) log.events.push(u.pathname);
    if (u.pathname !== BASE && !u.pathname.startsWith(`${BASE}/`)) log.outside.push(u.pathname);
  });
  page.on('response', (res) => {
    const u = new URL(res.url());
    if (res.status() === 404 && /^(127\.0\.0\.1|localhost)$/.test(u.hostname)) log.notFound.push(u.pathname);
  });
  return log;
}

test('하위 주소: 홈 → 대분류 → 2쪽 → 상세 → 담기 → 장바구니에서 404·바탕 밖 요청·집계 요청이 없다', async ({ page }) => {
  await blockExternal(page);
  const net = watch(page);
  await page.goto(`${BASE}/`);
  await islandsReady(page);
  await expect(page.locator('.site-header .brand')).toHaveAttribute('href', `${BASE}/`);
  await page.locator('.cat-tile[data-cat="api"] a').click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/c/api$`));
  await page.locator(`a.sub-tile[href="${BASE}/c/api/weather"]`).click();
  await islandsReady(page);
  await page.locator('.pager').getByRole('link', { name: fill(ko.list.pageLabel, { n: 2 }) }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/c/api/weather\\?page=2$`));
  await expect(page.locator('.list-range')).toContainText('61');
  await page.locator('.listing-grid .card-link').first().click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/item\\?id=`));
  await islandsReady(page);
  await expect(page.locator('h1.detail-name')).toBeVisible();
  await addWithSheet(page, page.getByRole('button', { name: ko.item.add }));
  await page.locator('a.hd-cart').click();
  await expect(page.locator('dialog.drawer')).toBeVisible();
  await page.locator('dialog.drawer').getByRole('link', { name: ko.drawer.toCart }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/cart$`));
  await islandsReady(page);
  await expect(page.locator('.cart-name')).toHaveCount(1);

  expect(net.notFound, '404가 난 요청').toEqual([]);
  expect(net.outside, '주소 바탕 밖으로 나간 요청').toEqual([]);
  expect(net.events, '정적 호스트는 익명 집계를 보내지 않는다').toEqual([]);
});

test('하위 주소: 머리줄·바닥글·설명서 링크가 바탕을 품고, 바탕 밖 주소는 404다', async ({ page, request }) => {
  await page.goto(`${BASE}/about`);
  await expect(page.locator('main')).toContainText(ko.about.storedStatic);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', `${BASE}/manifest.webmanifest`);
  for (const href of await page.locator('.site-footer a, .site-header a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))) expect(href.startsWith(`${BASE}/`), href).toBe(true);
  const manifest = (await (await request.get(`${BASE}/manifest.webmanifest`)).json()) as { start_url: string; scope: string };
  expect(manifest.start_url).toBe(`${BASE}/`);
  expect(manifest.scope).toBe(`${BASE}/`);
  await page.goto(`${BASE}/legal/privacy`);
  await expect(page.locator('main')).toContainText(ko.legal.privacyStatic.count);
  expect((await request.get('/cart')).status()).toBe(404);
});
