// 장바구니·영수증·.md (v5 S2): 두 대분류에서 메모와 함께 담기 → 서랍(메모 더하기·다시 담기는 그 줄로) → 계산 → 0원 영수증
// → .md 받기(내용 확인)·복사 → 지난 영수증 → 다시 열기, 스타터 키트 한 번에 담기, 공유 링크로 주고받기, 휴대폰 390과 PC 1440.
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/text.ts';
import { blockExternal, islandsReady } from './helpers.ts';

test.beforeEach(async ({ page, context }) => {
  await blockExternal(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

/** 목록 첫 카드를 담고, 뜬 작은 창에 메모를 적어 저장한다. 담은 재료 이름을 돌려준다 */
async function addFirstWithMemo(page: Page, path: string, memo: string): Promise<string> {
  await page.goto(path);
  await islandsReady(page);
  const btn = page.locator('.listing-grid button[data-add]').first();
  const name = (await btn.getAttribute('data-name')) ?? '';
  await btn.click();
  const pop = page.locator('.add-pop');
  await expect(pop).toBeVisible();
  await pop.getByLabel(ko.pop.memoLabel).fill(memo);
  await pop.getByRole('button', { name: ko.pop.save }).click();
  await expect(pop).toHaveCount(0);
  await expect(btn).toBeFocused();
  return name;
}

async function axeClean(page: Page): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

for (const vp of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test.describe(`${vp.width}×${vp.height}`, () => {
    test.use({ viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600 });

    test('두 대분류 + 메모 → 서랍 → 계산 → 영수증 → .md 받기·복사 → 지난 영수증 → 다시 열기', async ({ page }) => {
      const font = await addFirstWithMemo(page, '/c/design/fonts-ko', '제목 글꼴로 쓴다');
      const mcp = await addFirstWithMemo(page, '/c/ai/mcp', '최신 문서 읽기');
      await expect(page.locator('.hd-badge')).toHaveText('2');

      // 이미 담은 카드를 다시 누르면 서랍이 열리고 그 줄로 초점
      const mcpBtn = page.locator('.listing-grid button[data-add]').first();
      await mcpBtn.click();
      const drawer = page.locator('dialog.drawer');
      await expect(drawer).toBeVisible();
      await expect(drawer.locator(`[data-line]`).filter({ hasText: mcp })).toBeFocused();
      await expect(drawer.locator('.cart-group')).toHaveCount(2);
      await expect(drawer.locator('.cart-memo')).toHaveText([`${ko.cart.memo}: 제목 글꼴로 쓴다`, `${ko.cart.memo}: 최신 문서 읽기`]);
      await axeClean(page);

      // 서랍에서 메모 고치기 (Enter로 저장), Esc로 닫으면 연 자리로 초점
      await drawer.getByRole('button', { name: fill(ko.line.editMemoLabel, { name: mcp }) }).click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('MCP로 최신 문서 읽기');
      await page.keyboard.press('Enter');
      await expect(drawer.locator('.cart-memo').nth(1)).toContainText('MCP로 최신 문서 읽기');
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(mcpBtn).toBeFocused();

      // 장바구니 쪽: 만들 앱 한 줄 → 계산
      await page.goto('/cart');
      await islandsReady(page);
      await expect(page.locator('.cart-page .cart-name')).toHaveText([font, mcp]);
      await page.locator('#cart-project').fill('우리 반 급식 앱');
      await page.locator('.cart-summary').getByRole('button', { name: ko.cart.checkout }).click();
      await expect(page).toHaveURL(/\/receipt\?id=[a-z0-9]+$/);
      await islandsReady(page);
      const no = (await page.locator('.receipt-no').textContent())?.trim() ?? '';
      expect(no).toMatch(/^No\. \d{8}-\d{4}$/);
      await expect(page.locator('.receipt-group')).toHaveCount(2);
      await expect(page.locator('.receipt-total')).toContainText(ko.receipt.free);
      await expect(page.locator('.receipt-project')).toContainText('우리 반 급식 앱');
      await expect(page.locator('.hd-badge')).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
      await axeClean(page);

      // .md 받기: 파일 이름과 내용
      const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: ko.receipt.downloadLabel }).click()]);
      expect(dl.suggestedFilename()).toMatch(/^codeshopper-\d{8}-\d{4}\.md$/);
      const md = readFileSync((await dl.path()) ?? '', 'utf8');
      expect(md.startsWith(ko.md.title)).toBe(true);
      expect(md).toContain(`영수증 ${no}`);
      expect(md).toContain(ko.md.aiLead);
      expect(md).toContain('우리 반 급식 앱');
      expect(md).toContain(`#### ${font}`);
      expect(md).toContain(`#### ${mcp}`);
      expect(md).toContain('- 내 메모: 제목 글꼴로 쓴다');
      expect(md).toContain('- 내 메모: MCP로 최신 문서 읽기');
      expect(md).toMatch(/- 공식 주소: https?:\/\//);
      expect(md.indexOf('### ')).toBeLessThan(md.indexOf(`#### ${font}`));
      expect(md).toContain(ko.md.noteTitle);

      // 복사: 클립보드에 같은 글
      await page.getByRole('button', { name: ko.receipt.copyLabel }).click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(md);

      // 지난 영수증 → 다시 열기
      await page.goto('/receipts');
      await islandsReady(page);
      await expect(page.locator('.rc-item')).toHaveCount(1);
      await expect(page.locator('.rc-no')).toHaveText(no);
      await page.getByRole('link', { name: fill(ko.receipts.openLabel, { no: no.replace('No. ', '') }) }).click();
      await expect(page).toHaveURL(/\/receipt\?id=/);
      await islandsReady(page);
      await expect(page.locator('.receipt-no')).toHaveText(no);
    });
  });
}

test('스타터 키트: 한 번에 담고, 장바구니에 대분류별로 묶인다', async ({ page }) => {
  await page.goto('/');
  await islandsReady(page);
  const kit = page.locator('.kit[data-kit-id="school"]');
  const btn = kit.locator('button[data-kit]');
  const n = await kit.locator('.kit-items li').count();
  const name = (await btn.getAttribute('data-name')) ?? '';
  expect(n).toBeGreaterThanOrEqual(3);
  await btn.click();
  await expect(page.locator('.hd-badge')).toHaveText(String(n));
  await expect(btn).toHaveAttribute('data-in', 'true');
  await expect(page.locator('#cc-live')).toContainText(fill(ko.kits.addedLive, { name, added: n }));
  await page.goto('/cart');
  await islandsReady(page);
  await expect(page.locator('.cart-page .cart-line')).toHaveCount(n);
  expect(await page.locator('.cart-page .cart-group').count()).toBeGreaterThanOrEqual(2);
});

test('공유 링크: 복사한 링크를 비운 장바구니에서 열면 같은 재료를 모두 담는다 (메모는 없다)', async ({ page }) => {
  await page.goto('/');
  await islandsReady(page);
  await page.locator('.kit[data-kit-id="landing"] button[data-kit]').click();
  await page.goto('/cart');
  await islandsReady(page);
  const names = await page.locator('.cart-page .cart-name').allTextContents();
  await page.locator('.cart-page .cart-line').first().getByRole('button', { name: ko.line.addMemo }).click();
  await page.keyboard.type('비밀 메모');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: ko.cart.share }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/cart#s=/);
  expect(url).not.toContain(encodeURIComponent('비밀'));
  await page.getByRole('button', { name: ko.cart.clear }).click();
  await page.getByRole('button', { name: ko.cart.clearConfirm }).click();
  await expect(page.locator('.hd-badge')).toBeHidden();

  await page.goto(url);
  await islandsReady(page);
  const shared = page.locator('[data-shared]');
  await expect(shared).toContainText(fill(ko.shared.title, { n: names.length }));
  await expect(shared.locator('.shared-list li')).toHaveCount(names.length);
  await shared.getByRole('button', { name: fill(ko.shared.addAllLabel, { n: names.length }) }).click();
  await expect(page.locator('.hd-badge')).toHaveText(String(names.length));
  await expect(shared).toHaveCount(0);
  await expect(page).toHaveURL(/\/cart$/);
  expect(await page.locator('.cart-page .cart-name').allTextContents()).toEqual(names);
  await expect(page.locator('.cart-page .cart-memo')).toHaveCount(0);
});

test('최근 본 재료: 상세를 열면 홈 맨 위 줄에 보인다', async ({ page }) => {
  await page.goto('/item?id=google-fonts%3Aroboto');
  await islandsReady(page);
  await expect(page.locator('h1.detail-name')).toHaveText('Roboto');
  await page.goto('/');
  await islandsReady(page);
  const row = page.locator('section.recent');
  await expect(row).toBeVisible();
  await expect(row.locator('.recent-name').first()).toHaveText('Roboto');
});
