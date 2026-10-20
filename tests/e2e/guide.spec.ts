// 처음 방문 가이드와 드래그 풀이 알아차리기 (O1, D138). 휴대폰 390과 PC 1440에서:
// 처음 오면 저절로 열리고 → [건너뛰기]·Esc·끝까지로 닫히고 → 다시 저절로 열리지 않고 → [이용 가이드](머리줄 ?·메뉴·바닥글)로 다시 열린다.
// 키보드만으로 여덟 걸음을 끝까지 가고(Enter·←·→), 걸음마다 axe 심각·치명 0. 드래그 걸음의 문장을 끌어 고르면 풀이가 창 안에 뜬다.
// 상품 상세는 설명 속 용어에 점선 밑줄이 그어지고(누르면 풀이), '어려운 말 풀이' 안내는 처음엔 펼쳐져 있다가 [알겠어요]로 접힌다.
// 다른 시험은 playwright.config.ts의 storageState로 가이드를 본 것으로 둔다. 여기 가이드 시험만 빈 저장소로 시작한다.
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { TOUR_STEPS, TOUR_TERMS } from '../../src/lib/guide.ts';
import { KEYS } from '../../src/lib/saved.ts';
import { fill } from '../../src/lib/text.ts';
import { blockExternal, dragSelect, islandsReady } from './helpers.ts';

/** 용어 자료 (Playwright는 JSON import를 읽지 못해 파일로 읽는다) */
const glossary = JSON.parse(readFileSync(new URL('../../data/glossary.json', import.meta.url), 'utf8')) as { terms: { id: string; term: string; plain: string }[] };

const T = ko.tour;
const TOTAL = TOUR_STEPS.length;
const tour = (page: Page): Locator => page.locator('dialog.tour');
const count = (n: number): string => fill(T.count, { n, total: TOTAL });

async function axeClean(page: Page): Promise<void> {
  const r = await new AxeBuilder({ page }).include('dialog.tour').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(
    bad.map(
      (v) =>
        `${v.id}: ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
    ),
  ).toEqual([]);
}

async function guideSaved(page: Page): Promise<unknown> {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), KEYS.guide);
}

/** 저절로 열릴 틈(쉬는 시간 + 묶음 받기)을 넉넉히 넘긴 뒤에도 닫혀 있다 */
async function staysClosed(page: Page): Promise<void> {
  await islandsReady(page);
  await page.waitForTimeout(1600);
  await expect(tour(page)).toHaveCount(0);
}

for (const vp of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  const phone = vp.width < 600;
  test.describe(`${vp.width}×${vp.height}`, () => {
    test.use({ viewport: vp, isMobile: phone, hasTouch: phone });

    test.describe('처음 방문 (빈 저장소)', () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      test('처음 화면에서 저절로 열리고, [건너뛰기]로 닫히면 다시 저절로 열리지 않는다', async ({ page }) => {
        await blockExternal(page);
        await page.goto('/');
        await expect(tour(page)).toBeVisible();
        await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(T.steps.welcome.title);
        await expect(tour(page)).toHaveAccessibleName(T.steps.welcome.title);
        await expect(tour(page).locator('.tour-count')).toHaveText(count(1));
        // 열자마자 '연 적 있음'을 적는다 (끝까지 보지 않고 떠나도 다시 저절로 열지 않는다)
        expect(await guideSaved(page)).toEqual({ tour: true, hint: false });
        await axeClean(page);
        await tour(page).getByRole('button', { name: T.skip }).click();
        await expect(tour(page)).toHaveCount(0);
        await page.reload();
        await staysClosed(page);
        await page.goto('/c/ai/mcp');
        await staysClosed(page);
      });

      test('Esc와 닫기(X)로도 끝나고, 할 일을 들고 온 쪽(장바구니)에서는 저절로 열지 않는다', async ({ page }) => {
        await blockExternal(page);
        await page.goto('/cart');
        await staysClosed(page);
        await page.goto('/item?id=official%3Aneis');
        await expect(tour(page)).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(tour(page)).toHaveCount(0);
        // 다시 열어 X로 닫는다
        await page.locator('footer.site-footer').getByRole('button', { name: ko.footer.guide }).click();
        await expect(tour(page)).toBeVisible();
        await tour(page).getByRole('button', { name: T.close }).click();
        await expect(tour(page)).toHaveCount(0);
      });

      test('키보드만으로 여덟 걸음을 끝까지 (Enter·←·→), 걸음마다 axe 0, 용어는 용어 자료 그대로', async ({ page }) => {
        await blockExternal(page);
        await page.goto('/');
        await expect(tour(page)).toBeVisible();
        const next = tour(page).locator('.tour-next');
        await expect(next).toBeFocused();
        await expect(next).toHaveText(T.begin);
        for (let i = 1; i < TOTAL; i += 1) {
          await page.keyboard.press('Enter');
          const step = TOUR_STEPS[i] ?? 'welcome';
          await expect(tour(page).locator('.tour-count')).toHaveText(count(i + 1));
          await expect(tour(page).getByRole('heading', { level: 2 })).toHaveText(T.steps[step].title);
          await expect(next).toBeFocused();
          if (step === 'categories') await expect(tour(page).locator('.tour-cats li')).toHaveCount(6);
          if (step === 'words') {
            const terms = TOUR_TERMS.map((id) => glossary.terms.find((t) => t.id === id));
            await expect(tour(page).locator('.tour-word dt')).toHaveText(terms.map((t) => t?.term ?? ''));
            await expect(tour(page).locator('.tour-word dd')).toHaveText(terms.map((t) => t?.plain ?? ''));
          }
          await axeClean(page);
        }
        await expect(next).toHaveText(T.finish);
        await expect(tour(page).getByRole('button', { name: T.skip })).toHaveCount(0);
        // ←·→로 오간다
        await page.keyboard.press('ArrowLeft');
        await expect(tour(page).locator('.tour-count')).toHaveText(count(TOTAL - 1));
        await page.keyboard.press('ArrowRight');
        await expect(tour(page).locator('.tour-count')).toHaveText(count(TOTAL));
        // 첫 걸음으로 돌아가면 [이전]이 사라져도 초점은 [다음]에 남는다
        for (let i = 0; i < TOTAL; i += 1) await page.keyboard.press('ArrowLeft');
        await expect(tour(page).locator('.tour-count')).toHaveText(count(1));
        await tour(page).locator('.tour-next').press('Enter');
        await tour(page).getByRole('button', { name: T.prev }).press('Enter');
        await expect(tour(page).getByRole('button', { name: T.prev })).toHaveCount(0);
        await expect(next).toBeFocused();
        for (let i = 1; i < TOTAL; i += 1) await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        await expect(tour(page)).toHaveCount(0);
      });

      // 마우스로 끌어 고르기는 PC에서 본다 (손가락 고르기의 풀이 상자는 overlays.spec이 본다)
      if (!phone)
        test('드래그 걸음: 문장을 끌어 고르면 풀이가 창 안에 뜨고, Esc는 풀이만 닫고 한 번 더 누르면 가이드를 닫는다', async ({ page }) => {
          await blockExternal(page);
          await page.goto('/');
          await expect(tour(page)).toBeVisible();
          for (let i = 1; i < TOTAL; i += 1) await tour(page).locator('.tour-next').click();
          await islandsReady(page);
          await dragSelect(page, tour(page).locator('.tour-try-text'), 'React');
          const pop = tour(page).locator('#term-pop');
          await expect(pop).toBeVisible();
          await expect(page.locator('#term-pop-name')).toContainText('React');
          await page.keyboard.press('Escape');
          await expect(pop).toBeHidden();
          await expect(tour(page)).toBeVisible();
          // 점선 밑줄 말은 누르기만 해도 풀이가 뜬다
          await tour(page).locator('.tour-try .term-mark').click();
          await expect(page.locator('#term-pop-name')).toContainText('JSON');
          await page.keyboard.press('Escape');
          await expect(page.locator('#term-pop')).toBeHidden();
          await page.keyboard.press('Escape');
          await expect(tour(page)).toHaveCount(0);
        });
    });

    test('다시 보기: [이용 가이드]로 첫 걸음부터 열고, 닫으면 누른 자리로 초점이 돌아온다', async ({ page }) => {
      await blockExternal(page);
      await page.goto('/');
      await staysClosed(page);
      if (phone) {
        // 휴대폰 머리줄에는 [?]가 없고 카테고리 메뉴 아래에 있다
        await expect(page.locator('.hd-help')).toBeHidden();
        const summary = page.locator('.catmenu > summary');
        await summary.click();
        await page.locator('.catmenu-help').getByRole('button', { name: ko.layout.guide }).click();
        await expect(page.locator('details[data-menu]')).not.toHaveAttribute('open', '');
        await expect(tour(page)).toBeVisible();
        await expect(tour(page).locator('.tour-count')).toHaveText(count(1));
        await page.keyboard.press('Escape');
        await expect(tour(page)).toHaveCount(0);
        await expect(summary).toBeFocused();
      } else {
        await expect(page.locator('.hd-help')).toHaveAccessibleName(ko.layout.guide);
        await page.locator('.hd-help').focus();
        await page.keyboard.press('Enter');
        await expect(tour(page)).toBeVisible();
        await tour(page).locator('.tour-next').click();
        await tour(page).getByRole('button', { name: T.skip }).click();
        await expect(tour(page)).toHaveCount(0);
        await expect(page.locator('.hd-help')).toBeFocused();
      }
      // 바닥글에서도 다시 연다 (걸음은 처음부터)
      await page.locator('footer.site-footer').getByRole('button', { name: ko.footer.guide }).click();
      await expect(tour(page)).toBeVisible();
      await expect(tour(page).locator('.tour-count')).toHaveText(count(1));
    });

    test('상품 상세: 설명 속 용어에 점선 밑줄, 누르면 풀이. 안내는 처음엔 펼쳐 있고 [알겠어요]로 접혀 다시 열 수 있다', async ({ page }) => {
      await blockExternal(page);
      await page.goto('/item?id=official%3Aneis');
      await islandsReady(page);
      const mark = page.locator('.detail-sum .term-mark').first();
      await expect(mark).toBeVisible();
      const toggle = page.getByRole('button', {
        name: ko.item.termHint.toggle,
      });
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const box = page.locator('#drag-hint-box');
      await expect(box).toContainText(ko.item.termHint.drag);
      await expect(box).toContainText(ko.item.termHint.mark);
      await expect(box.getByRole('link', { name: ko.item.termHint.terms })).toHaveAttribute('href', '/terms');
      await mark.click();
      await expect(page.locator('#term-pop')).toBeVisible();
      await expect(page.locator('#term-pop-name')).not.toBeEmpty();
      await page.keyboard.press('Escape');
      await expect(page.locator('#term-pop')).toBeHidden();
      await box.getByRole('button', { name: ko.item.termHint.ok }).click();
      await expect(box).toBeHidden();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(toggle).toBeFocused();
      await page.reload();
      await islandsReady(page);
      await expect(page.getByRole('button', { name: ko.item.termHint.toggle })).toHaveAttribute('aria-expanded', 'false');
      await page.getByRole('button', { name: ko.item.termHint.toggle }).click();
      await expect(page.locator('#drag-hint-box')).toBeVisible();
      await expect(page.locator('#drag-hint-box').getByRole('button', { name: ko.item.termHint.ok })).toHaveCount(0);
    });
  });
}
