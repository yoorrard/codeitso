// 접근성 (WCAG 2.2 AA): 주요 화면을 axe로 재서 심각·치명 위반 0개 (휴대폰 360 기본 설정과 PC 1440).
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { blockExternal, islandsReady } from './helpers.ts';

const PAGES = ['/', '/c/design', '/c/ai/mcp', '/c/api/weather?page=2', '/item?id=google-fonts%3Aroboto', '/item?id=tinted%3Abase16-3024', '/cart', '/search?q=font', '/terms', '/about', '/about/credits', '/legal/privacy'];

for (const width of [360, 1440]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600 });
    for (const path of PAGES) {
      test(`axe 심각·치명 0: ${path}`, async ({ page }) => {
        await blockExternal(page);
        await page.goto(path);
        await islandsReady(page);
        await page.waitForFunction(() => !document.documentElement.hasAttribute('data-list-pending'));
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }
  });
}
