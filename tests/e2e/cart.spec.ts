// 장바구니·프롬프트 (v5 S2 → v5.1): 두 대분류에서 담기 창으로 메모와 함께 담기 → 서랍 → [프롬프트 뽑기] → 단말 화면 창
// → 복사·.md 받기(내용 확인) → 지난 프롬프트 → 다시 보기, 옛 영수증 주소 넘기기, 스타터 키트 한 번에 담기, 공유 링크로 주고받기, 휴대폰 390과 PC 1440.
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/text.ts';
import { addWithSheet, blockExternal, islandsReady } from './helpers.ts';

test.beforeEach(async ({ page, context }) => {
  await blockExternal(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

/** 목록 첫 카드를 담기 창에서 메모와 함께 담는다. 담은 재료 이름을 돌려준다 */
async function addFirstWithMemo(page: Page, path: string, memo: string): Promise<string> {
  await page.goto(path);
  await islandsReady(page);
  const btn = page.locator('.listing-grid button[data-add]').first();
  const name = (await btn.getAttribute('data-name')) ?? '';
  await addWithSheet(page, btn, memo);
  await expect(btn).toBeFocused();
  await expect(btn).toHaveAttribute('data-in', 'true');
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

    test('두 대분류 + 메모 → 서랍 → 프롬프트 뽑기 → 단말 창 복사·.md 받기 → 지난 프롬프트 → 다시 보기', async ({ page }) => {
      const font = await addFirstWithMemo(page, '/c/design/fonts-ko', '제목 글꼴로 쓴다');
      const mcp = await addFirstWithMemo(page, '/c/ai/mcp', '최신 문서 읽기');
      await expect(page.locator('.hd-badge')).toHaveText('2');

      // 머리줄 서랍: 대분류별 두 묶음, 메모, 서랍에서 메모 고치기(Enter), Esc로 닫으면 연 자리로 초점
      const cartLink = page.locator('a.hd-cart');
      await cartLink.click();
      const drawer = page.locator('dialog.drawer');
      await expect(drawer).toBeVisible();
      await expect(drawer.locator('.cart-group')).toHaveCount(2);
      await expect(drawer.locator('.cart-memo')).toHaveText([`${ko.cart.memo}: 제목 글꼴로 쓴다`, `${ko.cart.memo}: 최신 문서 읽기`]);
      await expect(drawer.getByRole('button', { name: ko.cart.checkout })).toBeVisible();
      await axeClean(page);
      await drawer.getByRole('button', { name: fill(ko.line.editMemoLabel, { name: mcp }) }).click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('MCP로 최신 문서 읽기');
      await page.keyboard.press('Enter');
      await expect(drawer.locator('.cart-memo').nth(1)).toContainText('MCP로 최신 문서 읽기');
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(cartLink).toBeFocused();

      // 장바구니 쪽: 만들 앱 한 줄 → [프롬프트 뽑기] → 바로 단말 창
      await page.goto('/cart');
      await islandsReady(page);
      await expect(page.locator('.cart-page .cart-name')).toHaveText([font, mcp]);
      await page.locator('#cart-project').fill('우리 반 급식 앱');
      const pull = page.locator('.cart-summary').getByRole('button', { name: ko.cart.checkout });
      await pull.click();
      const dlg = page.locator('dialog.prompt-dlg');
      await expect(dlg).toBeVisible();
      await expect(dlg.getByRole('heading', { name: ko.prompt.title })).toBeVisible();
      await expect(dlg.getByRole('button', { name: ko.prompt.copyLabel })).toBeFocused();
      await expect(page).toHaveURL(/\/cart$/);
      await expect(page.locator('.hd-badge')).toHaveText('2');
      const text = (await dlg.locator('.term-text code').textContent()) ?? '';
      const rows = text.split('\n');
      expect(rows[0]).toBe(ko.prompt.text.lead);
      expect(rows[1]).toBe('만들 앱: 우리 반 급식 앱');
      expect(rows.filter((r) => r.startsWith('- ['))).toHaveLength(2);
      expect(text).toContain(`] ${font} — 제목 글꼴로 쓴다 · http`);
      expect(text).toContain(`] ${mcp} — MCP로 최신 문서 읽기 · http`);
      expect(text.indexOf(font)).toBeLessThan(text.indexOf(mcp));
      expect(text.trimEnd().endsWith(ko.prompt.text.license)).toBe(true);
      expect(text).not.toContain('영수증');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vp.width);
      await axeClean(page);

      // 복사: 클립보드에 같은 글
      await dlg.getByRole('button', { name: ko.prompt.copyLabel }).click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);
      await expect(dlg.locator('[data-live]')).toContainText(ko.prompt.copied);

      // .md 받기: 파일 이름과 내용 (붙여 넣는 글과 같다)
      const [dl] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: ko.prompt.downloadLabel }).click()]);
      expect(dl.suggestedFilename()).toMatch(/^codeitso-prompt-\d{8}-\d{4}\.md$/);
      expect(readFileSync((await dl.path()) ?? '', 'utf8')).toBe(text);

      // Esc로 닫으면 [프롬프트 뽑기]로 초점, 장바구니는 그대로
      await page.keyboard.press('Escape');
      await expect(dlg).toHaveCount(0);
      await expect(pull).toBeFocused();
      await expect(page.locator('.cart-page .cart-line')).toHaveCount(2);

      // 지난 프롬프트 → 다시 보기 (같은 글)
      await page.goto('/prompts');
      await islandsReady(page);
      await expect(page.locator('.rc-item')).toHaveCount(1);
      await expect(page.locator('.rc-project')).toHaveText('우리 반 급식 앱');
      await page.locator('.rc-item').getByRole('button', { name: new RegExp(`${ko.prompts.open}$`) }).click();
      await expect(page.locator('dialog.prompt-dlg .term-text code')).toHaveText(text);
      await page.keyboard.press('Escape');

      // 옛 영수증 주소는 지난 프롬프트로 넘어간다
      await page.goto('/receipts');
      await expect(page).toHaveURL(/\/prompts$/);
    });
  });
}

test('스타터 키트: 한 번에 담고, 장바구니에 대분류별로 묶인다', async ({ page }) => {
  await page.goto('/');
  await islandsReady(page);
  const kit = page.locator('.kit[data-kit-id="school"]');
  const btn = kit.locator('button[data-kit]');
  const n = await kit.locator('.kit-items a').count();
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
