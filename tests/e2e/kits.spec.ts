// 스타터 키트 쪽과 홈 '모두 보기' (K1 D131): /kits는 주제 다섯 묶음에 모든 키트(재료·구현안·[키트 담기]),
// 홈은 진열 칸마다 '모두 보기'가 있고 각각 /kits · /c · /recent · 목록으로 간다. 휴대폰 390과 PC 1440.
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { KIT_IDS, KIT_THEMES } from '../../src/lib/kits.ts';
import { fill } from '../../src/lib/text.ts';
import { blockExternal, islandsReady } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await blockExternal(page);
});

for (const vp of [
  { width: 390, height: 844, mobile: true },
  { width: 1440, height: 900, mobile: false },
]) {
  test.describe(`${vp.width}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.mobile, hasTouch: vp.mobile });

    test('/kits: 주제 다섯 묶음에 모든 키트, 카드마다 구현안, 주제 칩으로 건너뛰고 한 번에 담는다', async ({ page }) => {
      await page.goto('/kits');
      await islandsReady(page);
      await expect(page.locator('h1')).toHaveText(ko.kits.pageTitle);
      await expect(page.locator('.kit-theme')).toHaveCount(KIT_THEMES.length);
      await expect(page.locator('.kit-theme .kit')).toHaveCount(KIT_IDS.length);
      for (const card of await page.locator('.kit-theme .kit').all()) {
        expect(await card.locator('.kit-outline li').count()).toBeGreaterThanOrEqual(3);
      }
      // 주제 칩 → 같은 쪽의 게임 묶음
      await page.locator('.kit-themes').getByRole('link', { name: new RegExp(ko.kits.themes.game.name) }).click();
      await expect(page).toHaveURL(/\/kits#theme-game$/);
      await expect(page.locator('#theme-game-title')).toBeInViewport();
      // 3D 웹 게임 키트를 담으면 재료 수만큼 담긴다
      const kit = page.locator('.kit[data-kit-id="game-3d"]');
      const n = await kit.locator('.kit-items a').count();
      expect(n).toBeGreaterThanOrEqual(10);
      const btn = kit.locator('button[data-kit]');
      await btn.click();
      await expect(page.locator('.hd-badge')).toHaveText(String(n));
      await expect(btn).toHaveAttribute('data-in', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
    });

    test('홈: 진열 칸마다 모두 보기가 있고, 키트·카테고리·최근 본 재료는 그 쪽으로 간다', async ({ page }) => {
      await page.goto('/item?id=google-fonts%3Aroboto');
      await islandsReady(page);
      await expect(page.locator('h1.detail-name')).toHaveText('Roboto');
      await page.goto('/');
      await islandsReady(page);
      await expect(page.locator('section.recent')).toBeVisible();
      const secs = page.locator('main section.sec');
      const count = await secs.count();
      expect(count).toBeGreaterThanOrEqual(8);
      for (let i = 0; i < count; i += 1) await expect(secs.nth(i).locator('.sec-head a.sec-more'), `칸 ${i}`).toHaveCount(1);

      await page.locator('.kits .sec-more').click();
      await expect(page).toHaveURL(/\/kits$/);
      await page.goBack();
      await page.getByRole('link', { name: fill(ko.home.moreOf, { title: ko.home.categoriesTitle }) }).click();
      await expect(page).toHaveURL(/\/c$/);
      await expect(page.locator('.all-cat')).toHaveCount(6);
      await page.goBack();
      await islandsReady(page);
      await page.locator('section.recent .sec-more').click();
      await expect(page).toHaveURL(/\/recent$/);
      await islandsReady(page);
      await expect(page.locator('.recent-grid .recent-name').first()).toHaveText('Roboto');
      await page.getByRole('button', { name: ko.recent.clearLabel }).click();
      await expect(page.locator('.recent-empty')).toContainText(ko.recent.empty);
      await expect(page.locator('#recent-title')).toBeFocused();
    });
  });
}
