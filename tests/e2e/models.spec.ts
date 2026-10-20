// AI 모델·요금 (D141): 상세 '모델·요금' 표(넓은 화면 표 · 휴대폰 카드, 지원 끝난 모델 켜기, 출처·한도 링크),
// 담기 창의 모델 고르기(찾기 → 고르기 → 담기) → 장바구니 줄의 모델·바꾸기 → 프롬프트에 정확한 모델 id와 가격 기준 날짜,
// 고르지 않은 AI API는 '아직 안 정했어요', 공유 링크로 모델까지 주고받기, /models 비교(회사·정렬·찾기·주소·줄 [담기]), 390·1440, axe.
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

async function axeClean(page: Page): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

async function noSideScroll(page: Page, width: number): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

for (const vp of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test.describe(`${vp.width}×${vp.height}`, () => {
    test.use({ viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600 });
    const wide = vp.width >= 1024;

    test('상세 모델·요금: 표(넓은 화면)·카드(휴대폰), 출처·수집 날짜, 공식 요금·한도 링크, 지원 끝난 모델 켜기', async ({ page }) => {
      await page.goto('/item?id=models-dev:openai');
      await islandsReady(page);
      const sec = page.locator('.models-sec');
      await expect(sec.getByRole('heading', { name: new RegExp(`^${ko.models.title}`) })).toBeVisible();
      const rows = sec.locator('[data-model-row]');
      await expect(rows.first()).toBeVisible();
      if (wide) {
        await expect(sec.locator('table.mt')).toBeVisible();
        await expect(sec.locator('table.mt thead th')).toContainText([ko.models.cols.model, ko.models.cols.input, ko.models.cols.output]);
      } else {
        await expect(sec.locator('ul.mt-cards')).toBeVisible();
        await expect(sec.locator('table.mt')).toHaveCount(0);
      }
      // 처음엔 지원이 끝난 모델이 없다 → 켜면 더 많다
      await expect(sec.locator('[data-model-row][data-deprecated="true"]')).toHaveCount(0);
      const more = sec.getByRole('button', { name: /모델 모두 보기/ });
      if (await more.count()) await more.click();
      const live = await rows.count();
      await sec.getByRole('checkbox', { name: /지원이 끝난 모델도 보기/ }).check();
      await expect.poll(() => rows.count()).toBeGreaterThan(live);
      await expect(sec.locator('[data-model-row][data-deprecated="true"]').first()).toBeVisible();
      await expect(sec.locator('.mt-source')).toContainText(/models\.dev 기준 · 수집 \d{4}-\d{2}-\d{2}/);
      await expect(sec.getByRole('link', { name: new RegExp(ko.models.pricing) })).toHaveAttribute('href', /^https:\/\//);
      await expect(sec.getByRole('link', { name: new RegExp(ko.models.limits) })).toHaveAttribute('href', /^https:\/\//);
      // 요금 읽는 법: 어려운 말은 용어 사전으로
      await sec.locator('.mt-explain summary').click();
      await expect(sec.locator('.mt-explain a.term-link[href*="/terms#io-token"]')).toBeVisible();
      // 모델 id 복사
      const firstId = (await rows.first().locator('.mt-id code').textContent()) ?? '';
      await rows.first().getByRole('button', { name: fill(ko.models.copyIdLabel, { id: firstId }) }).click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(firstId);
      await noSideScroll(page, vp.width);
      await axeClean(page);
    });

    test('담기 창 모델 고르기 → 장바구니 줄 → 프롬프트에 모델 id, 고르지 않은 것은 아직 안 정함 → 바꾸기 → 공유 링크', async ({ page, context }) => {
      await page.goto('/item?id=models-dev:anthropic');
      await islandsReady(page);
      await page.locator('.buy-add').click();
      const sheet = page.locator('dialog.add-sheet');
      await expect(sheet.getByRole('group', { name: ko.models.pick.legend })).toBeVisible();
      await expect(sheet.getByRole('radio', { name: ko.models.pick.none })).toBeChecked();
      const radios = sheet.locator('input.mp-radio');
      await expect.poll(() => radios.count()).toBeGreaterThan(2);
      // 둘째 모델(첫 모델 다음)을 찾기로 좁혀 고른다
      const opt = sheet.locator('.mp-opt').nth(2);
      const model = (await opt.locator('.mp-name').textContent()) ?? '';
      const id = (await opt.locator('input').getAttribute('value')) ?? '';
      const find = sheet.getByRole('searchbox', { name: ko.models.pick.find });
      if (await find.count()) {
        await find.fill(model);
        await expect(sheet.locator('.mp-opt:not([hidden])').filter({ hasText: model }).first()).toBeVisible();
      }
      await sheet.locator(`input.mp-radio[value="${id}"]`).check();
      await sheet.getByLabel(ko.sheet.memoLabel).fill('요약 기능');
      await sheet.getByRole('button', { name: ko.sheet.add, exact: true }).click();
      await expect(sheet).toBeHidden();
      await expect(page.locator('.hd-badge')).toHaveText('1');

      // 고르지 않은 AI API 하나 더
      await page.goto('/item?id=models-dev:openai');
      await islandsReady(page);
      await page.locator('.buy-add').click();
      await expect(sheet.getByRole('radio', { name: ko.models.pick.none })).toBeChecked();
      await sheet.getByRole('button', { name: ko.sheet.add, exact: true }).click();
      await expect(page.locator('.hd-badge')).toHaveText('2');

      // 장바구니 줄: 고른 모델 · 아직 안 정했어요
      await page.goto('/cart');
      await islandsReady(page);
      const lines = page.locator('.cart-page .cart-line');
      await expect(lines.nth(0).locator('.cart-model')).toContainText(fill(ko.models.line.chosen, { name: model }));
      await expect(lines.nth(0).locator('.cart-model-id')).toHaveText(id);
      await expect(lines.nth(1).locator('.cart-model')).toContainText(ko.models.line.open);
      await axeClean(page);

      // 프롬프트: 모델 이름·id·가격 기준 날짜, 고르지 않은 것은 아직 안 정함
      await page.locator('.cart-summary').getByRole('button', { name: ko.cart.checkout }).click();
      const dlg = page.locator('dialog.prompt-dlg');
      await expect(dlg).toBeVisible();
      const text = (await dlg.locator('.term-text code').textContent()) ?? '';
      expect(text).toContain(`— 요약 기능 · 모델: ${model} (모델 id: ${id})`);
      expect(text).toMatch(/· 가격: 입력 \$[\d.]+ · 출력 \$[\d.]+ \/ 100만 토큰 \(models\.dev \d{4}-\d{2}-\d{2} 기준\)/);
      expect(text).toContain(`OpenAI${ko.models.prompt.open}`);
      await page.keyboard.press('Escape');

      // 줄에서 [모델 고르기]: 같은 창이 고치기로 열리고, 고른 모델이 줄에 남는다
      await lines.nth(1).getByRole('button', { name: fill(ko.models.line.pickLabel, { name: 'OpenAI' }) }).click();
      await expect(sheet).toBeVisible();
      await expect(sheet.locator('.add-sheet-kicker')).toHaveText(ko.sheet.kickerIn);
      await expect.poll(() => sheet.locator('input.mp-radio').count()).toBeGreaterThan(2);
      const pick = sheet.locator('.mp-opt').nth(1);
      const openaiModel = (await pick.locator('.mp-name').textContent()) ?? '';
      await pick.click();
      await sheet.getByRole('button', { name: ko.sheet.save, exact: true }).click();
      await expect(sheet).toBeHidden();
      await expect(lines.nth(1).locator('.cart-model')).toContainText(fill(ko.models.line.chosen, { name: openaiModel }));
      await expect(page.locator('#cc-live')).toContainText(fill(ko.models.pick.savedLive, { model: openaiModel }));

      // 공유 링크에는 재료와 모델 id만, 다른 브라우저에서 열면 모델까지 담긴다
      await page.locator('.cart-tools').getByRole('button', { name: ko.cart.share }).click();
      const link = await page.evaluate(() => navigator.clipboard.readText());
      expect(link).toContain(`#s=models-dev%3Aanthropic@${encodeURIComponent(id)}`);
      expect(link).not.toContain('요약');
      const other = await context.browser()?.newContext({ viewport: vp });
      if (!other) throw new Error('새 브라우저 창을 열지 못했다');
      const p2 = await other.newPage();
      await blockExternal(p2);
      await p2.goto(link.replace(/^https?:\/\/[^/]+/, test.info().project.use.baseURL ?? ''));
      await islandsReady(p2);
      await expect(p2.locator('.shared-list')).toContainText(fill(ko.models.shared, { model }));
      await p2.getByRole('button', { name: fill(ko.shared.addAllLabel, { n: 2 }) }).click();
      await expect(p2.locator('.cart-page .cart-line').first().locator('.cart-model-id')).toHaveText(id);
      await other.close();
      await noSideScroll(page, vp.width);
    });

    test('AI 모델 비교 /models: 주요 회사·한 회사·정렬·찾기가 주소에 남고, 줄 [담기]는 그 모델을 고른 채 담는다', async ({ page }) => {
      await page.goto('/c/api/ai-llm');
      await page.locator('a.models-banner').click();
      await expect(page).toHaveURL(/\/models\/?$/);
      await islandsReady(page);
      await expect(page.getByRole('heading', { level: 1, name: ko.models.page.title })).toBeVisible();
      const rows = page.locator('[data-model-row]');
      await expect(rows.first()).toBeVisible();
      await expect(page.locator('.mf-count')).toHaveText(/^모델 [\d,]+개$/);
      if (!wide) await page.locator('details.mf-box > summary').click();

      // 한 회사만: 주소에 남고 모든 줄이 그 회사
      await page.getByLabel(ko.models.page.scope).selectOption('one:anthropic');
      await expect(page).toHaveURL(/[?&]p=anthropic/);
      await expect(rows.first()).toBeVisible();
      if (wide) {
        const names = await page.locator('table.mt tbody td:nth-child(2)').allTextContents();
        expect(new Set(names)).toEqual(new Set(['Anthropic']));
      } else {
        const names = await page.locator('.mt-card .mt-provider').allTextContents();
        expect(new Set(names)).toEqual(new Set(['Anthropic']));
      }

      // 정렬: 입력 가격 낮은순 (넓은 화면은 머리 칸 단추, 좁은 화면은 정렬 고르기)
      if (wide) {
        const head = page.locator('table.mt thead th').filter({ hasText: ko.models.cols.input }).first();
        await head.getByRole('button').click();
        await expect(head).toHaveAttribute('aria-sort', 'ascending');
      } else {
        await page.getByLabel(ko.models.page.sort).selectOption('in-asc');
      }
      await expect(page).toHaveURL(/sort=in/);
      const prices = await page.locator(wide ? 'table.mt tbody tr td:nth-child(3)' : '.mt-card .mt-price').allTextContents();
      const nums = prices.map((t) => Number(/\$([\d.]+)/.exec(t)?.[1] ?? 'NaN')).filter((n) => !Number.isNaN(n));
      expect(nums.length).toBeGreaterThan(1);
      expect(nums).toEqual([...nums].sort((a, b) => a - b));

      // 찾기
      const first = (await rows.first().locator('.mt-name').textContent()) ?? '';
      await page.getByRole('searchbox', { name: ko.models.page.find }).fill(first);
      await expect(page).toHaveURL(/[?&]q=/);
      await expect(rows.first().locator('.mt-name')).toHaveText(first);

      // 줄 [담기]: 담기 창이 그 모델을 고른 채 열린다
      const id = (await rows.first().getAttribute('data-model-row')) ?? '';
      const add = rows.first().locator('button[data-add]');
      await expect(add).toHaveAttribute('aria-label', fill(ko.models.addLabel, { model: first, name: 'Anthropic' }));
      await add.click();
      const sheet = page.locator('dialog.add-sheet');
      await expect(sheet.locator(`input.mp-radio[value="${id}"]`)).toBeChecked();
      await sheet.getByRole('button', { name: ko.sheet.add, exact: true }).click();
      await expect(add).toHaveAttribute('data-in', 'true');
      await expect(page.locator('.hd-badge')).toHaveText('1');

      // 주소로 다시 열면 같은 상태
      await page.reload();
      await islandsReady(page);
      await expect(page.getByRole('searchbox', { name: ko.models.page.find })).toHaveValue(first);
      await expect(rows.first().locator('button[data-add]')).toHaveAttribute('data-in', 'true');
      await noSideScroll(page, vp.width);
      await axeClean(page);
    });
  });
}
