// 법 문서·바닥글·검색 엔진 파일 (L, D136): 바닥글의 법 문서 링크(처리방침 굵게)·운영자와 문의 메일·저작권 표시,
// 법 문서 네 쪽(제목·목차 이동·초안 표시 없음), 게시 중단 요청 메일 단추, robots.txt·sitemap.xml (미리 보기 빌드). 390·1440.
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { SITE_CONFIG } from '../../src/lib/site-config.ts';
import { blockExternal } from './helpers.ts';

const DOCS = [
  { path: '/legal/terms', title: ko.legal.terms.title, first: ko.legal.terms.sections[0].h },
  { path: '/legal/privacy', title: ko.legal.privacy.title, first: ko.legal.privacy.sections[0].h },
  { path: '/legal/notice', title: ko.legal.notice.title, first: ko.legal.notice.sections[0].h },
  { path: '/legal/copyright', title: ko.legal.copyright.title, first: ko.legal.copyright.sections[0].h },
];

for (const width of [390, 1440]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600 });

    test('바닥글: 법 문서 링크, 처리방침 굵게, 운영자·문의 메일, 저작권 표시', async ({ page }) => {
      await blockExternal(page);
      await page.goto('/');
      const ft = page.locator('footer.site-footer');
      for (const [label, href] of [
        [ko.footer.legalTerms, '/legal/terms'],
        [ko.footer.privacy, '/legal/privacy'],
        [ko.footer.notice, '/legal/notice'],
        [ko.footer.copyrightLink, '/legal/copyright'],
        [ko.footer.credits, '/about/credits'],
      ] as const) {
        await expect(ft.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href);
      }
      const privacy = ft.getByRole('link', { name: ko.footer.privacy, exact: true });
      expect(Number(await privacy.evaluate((a) => getComputedStyle(a).fontWeight))).toBeGreaterThanOrEqual(600);
      await expect(ft).toContainText(SITE_CONFIG.operator);
      await expect(ft.getByRole('link', { name: SITE_CONFIG.email })).toHaveAttribute('href', `mailto:${SITE_CONFIG.email}`);
      await expect(ft).toContainText(`© ${SITE_CONFIG.since} 코드잇소(codeitso). All rights reserved.`);
      await expect(ft).toContainText(ko.footer.rights);
    });

    for (const d of DOCS) {
      test(`법 문서 ${d.path}: 제목, 시행일, 목차로 이동, 초안 표시 없음, 가로 넘침 없음`, async ({ page }) => {
        await blockExternal(page);
        await page.goto(d.path);
        await expect(page.getByRole('heading', { level: 1, name: d.title })).toBeVisible();
        await expect(page.locator('main')).toContainText(ko.legal.effectiveDate);
        await expect(page.locator('main')).not.toContainText('초안');
        await expect(page.locator('main')).not.toContainText('{{');
        await page.getByRole('navigation', { name: ko.legal.toc }).getByRole('link', { name: d.first }).click();
        await expect(page.getByRole('heading', { level: 2, name: d.first })).toBeInViewport();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }
  });
}

test('처리방침: 보호책임자·국외 이전(Cloudflare·Google)·구제 기관·브라우저 저장소', async ({ page }) => {
  await blockExternal(page);
  await page.goto('/legal/privacy');
  const main = page.locator('main');
  await expect(main).toContainText(`성명: ${SITE_CONFIG.operator}`);
  await expect(main).toContainText(`이메일: ${SITE_CONFIG.email}`);
  await expect(page.getByRole('heading', { level: 3, name: 'Cloudflare, Inc. (dpo@cloudflare.com)' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Google LLC (policies.google.com/privacy)' })).toBeVisible();
  for (const n of ['118', '1833-6972', '1301', '182']) await expect(main).toContainText(n);
  await expect(main).toContainText('fonts.gstatic.com');
  await expect(main).toContainText('localStorage');
  // 바닥글 방문 수(D134)도 처리방침에 적는다
  await expect(main).toContainText('방문(브라우저마다 한국 날짜로 하루 한 번)');
});

test('저작권 쪽: 게시 중단 요청 메일 단추가 운영자 메일로 제목과 본문 틀을 채운다', async ({ page }) => {
  await blockExternal(page);
  await page.goto('/legal/copyright');
  const href = await page.getByRole('link', { name: ko.legal.copyright.mailButton }).getAttribute('href');
  expect(href).toMatch(new RegExp(`^mailto:${SITE_CONFIG.email.replace(/[.]/g, '\\.')}\\?subject=`));
  expect(decodeURIComponent(href ?? '')).toContain(ko.legal.copyright.mailSubject);
  expect(decodeURIComponent(href ?? '')).toContain(ko.legal.copyright.mailLines[0]);
});

test('미리 보기 빌드: robots.txt는 막고, sitemap.xml은 정적 쪽만 절대 주소로', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /');
  const res = await request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  expect(xml).toMatch(/<loc>https:\/\/[^<]+\/legal\/privacy<\/loc>/);
  expect(xml).toMatch(/<loc>https:\/\/[^<]+\/c\/design<\/loc>/);
  expect(xml).not.toContain('/item');
  expect(xml).not.toContain('/cart');
});
