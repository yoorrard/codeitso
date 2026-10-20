// 찾기·거르기·미리 보기 (v5 S3, D114~D116): 전체 검색(대분류 묶음 → 대분류 → 2쪽 → 뒤로), 치는 대로 찾기,
// 목록 거르기(휴대폰 시트·PC 왼쪽 칸, 주소·새로 고침·정렬과 함께·쪽 끝), 폰트 견본 지연 로드, 종류별 상세 미리 보기,
// 장바구니 서랍 여러 번 열고 닫기, 거르기 시트·검색 결과 axe.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/text.ts';
import { addWithSheet, blockExternal, islandsReady } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await blockExternal(page);
});

async function axeClean(page: Page): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

test.describe('PC 1440', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test('검색: 대분류 묶음 → 대분류 고르기 → 2쪽 → 뒤로 가기 두 번, 결과 카드 담기', async ({ page }) => {
    await page.goto('/search?q=weather');
    await islandsReady(page);
    await expect(page.locator('.search-sum')).toContainText('"weather"');
    await expect(page.locator('.search-group').first()).toBeVisible();
    // 한글로 쳐도 같은 뜻 영어 낱말을 찾는다
    await expect(page.locator('.search-subs')).toContainText('날씨');
    const apiChip = page.locator('.search-cats a[data-cat="api"]');
    const n = Number(((await apiChip.locator('.chip-n').textContent()) ?? '0').replace(/,/g, ''));
    expect(n).toBeGreaterThan(60);
    await apiChip.click();
    await expect(page).toHaveURL(/\/search\?q=weather&cat=api$/);
    await expect(page.locator('.search-sum')).toBeFocused();
    await expect(page.locator('.search-grid.is-all > li')).toHaveCount(60);
    const first = await page.locator('.search-grid .card-name').first().textContent();
    await page.locator('.pager').getByRole('link', { name: fill(ko.list.pageLabel, { n: 2 }) }).click();
    await expect(page).toHaveURL(/cat=api&page=2$/);
    await expect(page.locator('.search-grid .card-name').first()).not.toHaveText(first ?? '');
    await page.goBack();
    await expect(page).toHaveURL(/cat=api$/);
    await expect(page.locator('.search-grid .card-name').first()).toHaveText(first ?? '');
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?q=weather$/);
    await expect(page.locator('.search-group').first()).toBeVisible();
    const add = page.locator('.search-grid button[data-add]').first();
    await addWithSheet(page, add);
    await expect(add).toHaveAttribute('data-in', 'true');
    await expect(page.locator('.hd-badge')).toHaveText('1');
    await axeClean(page);
  });

  test('검색: 치는 대로 찾고 주소를 바꾼다, 없는 말은 안내, 지우면 예시', async ({ page }) => {
    await page.goto('/search');
    await islandsReady(page);
    await expect(page.locator('.search-examples')).toBeVisible();
    await page.locator('#page-q').fill('한글 폰트');
    await expect(page).toHaveURL(/q=%ED%95%9C%EA%B8%80%20%ED%8F%B0%ED%8A%B8$/);
    await expect(page.locator('.search-group[data-cat="design"] .card').first()).toBeVisible();
    await page.locator('#page-q').fill('zzqxwvnotaword');
    await expect(page.locator('.search-empty')).toBeVisible();
    await page.locator('#page-q').fill('');
    await expect(page.locator('.search-examples')).toBeVisible();
  });

  test('거르기 (왼쪽 칸): 라이선스 MIT만, 개수·주소·새로 고침, 이름순과 함께, 모두 지우기', async ({ page }) => {
    await page.goto('/c/design/ui-libraries');
    await islandsReady(page);
    const total = Number(((await page.locator('.list-total').textContent()) ?? '').replace(/[^\d]/g, '').slice(0, 3));
    const side = page.locator('.facet-side');
    await side.getByRole('checkbox', { name: /^MIT/ }).check();
    await expect(page).toHaveURL(/\?license=MIT$/);
    await expect(page.locator('.facet-chosen')).toContainText('MIT');
    const lic = page.locator('.listing-grid .card-lic');
    await expect(lic.first()).toHaveText('MIT');
    for (const t of await lic.allTextContents()) expect(t).toBe('MIT');
    const filtered = Number(((await page.locator('.list-total').textContent()) ?? '').replace(/[^\d]/g, '').slice(0, 3));
    expect(filtered).toBeLessThan(total);
    await page.locator('.sort-nav').getByRole('link', { name: ko.list.sorts.name }).click();
    await expect(page).toHaveURL(/\?license=MIT&sort=name$/);
    await page.reload();
    await islandsReady(page);
    await expect(side.getByRole('checkbox', { name: /^MIT/ })).toBeChecked();
    for (const t of await page.locator('.listing-grid .card-lic').allTextContents()) expect(t).toBe('MIT');
    const names = (await page.locator('.listing-grid .card-name').allTextContents()).map((x) => x.trim().toLowerCase());
    expect(names.slice(0, 5)).toEqual([...names.slice(0, 5)].sort());
    await page.locator('.facet-chosen').getByRole('button', { name: ko.facets.clear }).click();
    await expect(page).toHaveURL(/\/c\/design\/ui-libraries\?sort=name$/);
    await expect(side.getByRole('checkbox', { name: /^MIT/ })).not.toBeChecked();
  });

  test('거르기 + 쪽 끝: 원격 MCP 2쪽, 쪽 번호가 넘치면 마지막 쪽, 뒤로 가기', async ({ page }) => {
    await page.goto('/c/ai/mcp?transport=remote&page=2');
    await islandsReady(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-list-pending', '');
    await expect(page.locator('.list-range')).toContainText('61–120');
    await expect(page.locator('.facet-side').getByRole('checkbox', { name: /원격/ })).toBeChecked();
    await page.goto('/c/api/weather?page=999');
    await islandsReady(page);
    await expect(page.locator('.pager [aria-current="page"]')).toHaveText('2');
    await page.goto('/c/api/weather?auth=none&page=999');
    await islandsReady(page);
    await expect(page.locator('.list-range')).toContainText('1–');
    await expect(page.locator('.pager')).toHaveCount(0);
  });

  test('폰트 견본: 보일 때 출처 CSS를 받아 입히고, 못 받으면 기본 모양으로 둔다', async ({ page }) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Roboto';src:local('Arial'),local('DejaVu Sans'),local('Liberation Sans');}" }),
    );
    await page.goto('/c/design/fonts');
    await islandsReady(page);
    const first = page.locator('.listing-grid .font-sample').first();
    await expect(first).toHaveAttribute('data-font-state', 'ok');
    await expect(first).toHaveCSS('font-family', /Roboto/);
    // 아래쪽 카드는 아직 받지 않았다 (지연 로드)
    await expect(page.locator('.listing-grid .font-sample').last()).not.toHaveAttribute('data-font-state', 'ok');
    // 막힌 출처(Fontsource 파일)는 실패로 두고 글자는 그대로
    await page.goto('/item?id=fontsource%3Ageist-sans');
    await islandsReady(page);
    const spec = page.locator('.specimen [data-font-family]').first();
    await expect(spec).toHaveAttribute('data-font-state', 'fail');
    await expect(spec).toHaveText(ko.item.fontSampleEn);
  });

  test('종류별 상세 미리 보기: API 배지·무료 한도, 스타일 견본 화면, 아이콘 견본, 색 대비 등급, MCP 연결 정보', async ({ page }) => {
    await page.goto('/item?id=official%3Aamazon-comprehend');
    await islandsReady(page);
    await expect(page.locator('.api-panel .badge')).toContainText([ko.pv.api.auth]);
    await expect(page.locator('.api-panel')).toContainText(ko.pv.api.freeBadge);
    await expect(page.locator('.free-quote blockquote')).toContainText('free tier');
    await page.goto('/item?id=styles%3Aaurora');
    await islandsReady(page);
    await expect(page.getByRole('img', { name: ko.pv.style.label })).toBeVisible();
    await page.goto('/item?id=iconify%3Atabler');
    await islandsReady(page);
    expect(await page.locator('.icon-sheet li').count()).toBeGreaterThan(3);
    await page.goto('/item?id=themes%3Acatppuccin-frappe');
    await islandsReady(page);
    await expect(page.locator('.swatches .grade').first()).toBeVisible();
    await page.goto('/item?id=mcp-registry%3Aagency-kesey-pretrip');
    await islandsReady(page);
    await expect(page.locator('.api-panel')).toContainText('npm: pretrip-mcp');
    // 그림이 없는 모델은 작업에 맞는 장면을 그리고, 그린 예시라고 알린다 (v5.1 D126)
    await page.goto('/item?id=hf-models%3A01-ai--yi-1.5-34b-chat');
    await islandsReady(page);
    await expect(page.locator('.detail-preview .thumb-scene svg')).toBeVisible();
    await expect(page.locator('.detail-preview')).toContainText(ko.pv.sceneNote);
  });

  test('오픈소스 카드는 주인 아바타·소개 카드 대신 README 그림이나 그린 장면, 그림을 못 받으면 장면이 대신 보인다', async ({ page }) => {
    await page.goto('/c/opensource/cli');
    await islandsReady(page);
    const grid = page.locator('.listing-grid');
    await expect(grid.locator('img[src*="avatars.githubusercontent.com"], img[src*="opengraph.githubassets.com"]')).toHaveCount(0);
    expect(await grid.locator('.thumb-scene, .thumb-fallback.is-scene').count()).toBeGreaterThan(10);
    // e2e는 바깥 그림을 막는다: 깨진 README 그림 자리에 장면이 보인다
    await grid.locator('.thumb-img').first().scrollIntoViewIfNeeded();
    await expect(grid.locator('.thumb-img.is-broken .thumb-fallback.is-scene').first()).toBeVisible();
  });

  test('장바구니 서랍을 여러 번 열고 닫아도 초점이 돌아오고 하나만 열린다', async ({ page }) => {
    await page.goto('/c/design/gradients');
    await islandsReady(page);
    await addWithSheet(page, page.locator('.listing-grid button[data-add]').first());
    const cart = page.locator('a.hd-cart');
    for (let i = 0; i < 8; i += 1) {
      await cart.click();
      await expect(page.locator('dialog.drawer')).toBeVisible();
      if (i % 2 === 0) await page.keyboard.press('Escape');
      else await page.locator('dialog.drawer').getByRole('button', { name: ko.drawer.close }).click();
      await expect(page.locator('dialog.drawer')).toBeHidden();
      await expect(cart).toBeFocused();
    }
    await expect(page.locator('dialog[open]')).toHaveCount(0);
  });
});

test.describe('휴대폰 390', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('거르기 시트: 열기 → 인증 없음 → 개수 단추로 닫기 → 고른 칩 빼기, Esc로 닫으면 단추로 초점, axe', async ({ page }) => {
    await page.goto('/c/api/weather');
    await islandsReady(page);
    await expect(page.locator('.facet-side')).toBeHidden();
    const open = page.getByRole('button', { name: fill(ko.facets.openLabel, { n: 0 }) });
    await open.click();
    const sheet = page.locator('dialog.facet-sheet');
    await expect(sheet).toBeVisible();
    await axeClean(page);
    await sheet.getByRole('checkbox', { name: /인증 없음/ }).check();
    await expect(page).toHaveURL(/\?auth=none$/);
    const show = sheet.locator('.sheet-foot .btn-primary');
    await expect(show).toHaveText(/^\d+개 보기$/);
    const n = (await show.textContent())?.replace(/[^\d]/g, '') ?? '';
    await show.click();
    await expect(sheet).toBeHidden();
    await expect(page.locator('.list-total')).toContainText(`${n}개`);
    for (const t of await page.locator('.listing-grid .card-facts').allTextContents()) expect(t).toContain(ko.facts.authNone);
    await page.locator('.facet-chosen').getByRole('button', { name: fill(ko.facets.removeLabel, { name: `${ko.facets.keys.auth} ${ko.facts.authNone}` }) }).click();
    await expect(page).toHaveURL(/\/c\/api\/weather$/);
    await page.getByRole('button', { name: fill(ko.facets.openLabel, { n: 0 }) }).click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: fill(ko.facets.openLabel, { n: 0 }) })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  test('검색 결과: 가로로 넘치지 않고 대분류 칩이 한 줄로 넘어간다', async ({ page }) => {
    await page.goto('/search?q=%EC%B1%97%EB%B4%87');
    await islandsReady(page);
    await expect(page.locator('.search-group').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await axeClean(page);
  });

  test('모든 소분류 목록 쪽이 휴대폰에서 가로로 넘치지 않는다 (긴 출처 이름도 줄을 바꾼다)', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/');
    const subs = await page.locator('.catmenu-subs a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
    expect(subs.length).toBeGreaterThan(90);
    const wide: string[] = [];
    for (const href of subs) {
      await page.goto(href, { waitUntil: 'domcontentloaded' });
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      if (w > 390) wide.push(`${href} ${w}`);
    }
    expect(wide).toEqual([]);
  });
});
