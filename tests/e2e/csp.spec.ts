// 보안 헤더 (T21, D53·D107): CSP를 켠 채로 주요 조작(목록 쪽 바꾸기, 상세 조각 받기, 담기, 검색, 용어 풀이)에서
// 막히는 스크립트·스타일·연결이 없는지 본다. 브라우저의 securitypolicyviolation 이벤트를 모은다.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/text.ts';
import { blockExternal, islandsReady, selectText } from './helpers.ts';

async function watchCsp(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = seen;
    document.addEventListener('securitypolicyviolation', (e) => seen.push(`${e.effectiveDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
  });
  return () => page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
}

test('CSP: 목록 2쪽 → 상세 → 담기 → 검색 → 폰트 견본 → 스타일 견본 → 용어 풀이에서 막힌 것이 없다', async ({ page }) => {
  await blockExternal(page);
  const violations = await watchCsp(page);
  await page.goto('/c/design/palettes');
  await islandsReady(page);
  await page.locator('.pager').getByRole('link', { name: fill(ko.list.pageLabel, { n: 2 }) }).click();
  await expect(page).toHaveURL(/page=2$/);
  await page.locator('.listing-grid .card-link').first().click();
  await islandsReady(page);
  await expect(page.locator('.swatches')).toBeVisible();
  await page.getByRole('button', { name: ko.item.add }).click();
  await expect(page.locator('.hd-badge')).toHaveText('1');
  await page.goto('/search?q=weather');
  await islandsReady(page);
  await expect(page.locator('.search-results')).toBeVisible();
  // 폰트 견본 글꼴(출처 CDN의 CSS·글꼴 파일)은 CSP가 허락한다 (요청은 시험에서 막혀 실패로 남는다)
  await page.goto('/c/design/fonts');
  await islandsReady(page);
  await expect(page.locator('.listing-grid .font-sample').first()).toHaveAttribute('data-font-state', /ok|fail/);
  await page.goto('/item?id=styles%3Aaurora');
  await islandsReady(page);
  await expect(page.locator('.style-screen')).toBeVisible();
  await page.goto('/terms');
  await islandsReady(page);
  await selectText(page.locator('#api-key dd p').first(), 'API');
  await expect(page.locator('#term-pop')).toBeVisible();
  expect(await violations()).toEqual([]);
});
