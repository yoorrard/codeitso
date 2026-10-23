// 겹쳐 뜨는 창 닫기 (2026-10-20 소유자 신고, D127): 끌어 골라 띄운 풀이 상자·'재료 찾기' 상자가 X·바깥 누르기에 닫히지 않고
// 옆으로 밀려 다시 뜨던 버그의 회귀 시험. 풀이 상자(본문·검색 쪽·서랍 안)·장바구니 서랍·담기 창·거르기 시트·프롬프트 창·카테고리 메뉴를
// 휴대폰 390과 PC 1440에서 열고 → X · 바깥 누르기 · Esc로 닫고 → 새로 고르지 않으면 다시 뜨지 않는지, 창 안에서 글을 끌다 바깥에서 놓아도
// 창이 닫히지 않는지 본다. 마우스는 실제 끌기(pointerdown → pointerup → click)로 고른다.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/text.ts';
import { addWithSheet, blockExternal, dragOut, dragSelect, islandsReady } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await blockExternal(page);
});

/** 손가락 고르기 기다림(400ms)·키보드 기다림(500ms)·다음 그림 틀을 넉넉히 넘긴다: 그사이 다시 뜨면 버그다 */
const SETTLE = 900;

const pop = (page: Page): Locator => page.locator('#term-pop');
const closeX = (page: Page): Locator => page.locator('#term-pop').getByRole('button', { name: ko.glossary.close });
const selected = (page: Page): Promise<string> => page.evaluate(() => document.getSelection()?.toString() ?? '');

/** 닫힌 뒤 시간이 지나고 굴리고 화면 크기가 바뀌어도 다시 뜨지 않는다 */
async function staysClosed(page: Page): Promise<void> {
  await expect(pop(page)).toBeHidden();
  await page.waitForTimeout(SETTLE);
  await expect(pop(page)).toBeHidden();
  await page.mouse.wheel(0, 120);
  const vp = page.viewportSize();
  if (vp) {
    await page.setViewportSize({ width: vp.width - 10, height: vp.height });
    await page.setViewportSize(vp);
  }
  await page.waitForTimeout(200);
  await expect(pop(page)).toBeHidden();
}

/** 바깥 누르기: 본문 글이 아닌 머리줄 메뉴 단추 (눌러도 고른 글이 저절로 풀리지 않는 자리) */
async function outsidePress(page: Page): Promise<void> {
  await page.locator('.catmenu > summary').click();
}

const clearSelection = (page: Page): Promise<void> => page.evaluate(() => document.getSelection()?.removeAllRanges());

/** 창(dialog)이 열려 있는지 */
const isOpen = (d: Locator): Promise<boolean> => d.evaluate((el) => (el as HTMLDialogElement).open);

/** 창 바깥(어두운 바탕) 한 점: 화면 왼쪽 위 구석 (서랍·시트·담기 창·프롬프트 창 모두 그 자리를 덮지 않는다) */
const BACKDROP = { x: 8, y: 8 };

for (const vp of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  const phone = vp.width < 600;
  test.describe(`${vp.width}×${vp.height}`, () => {
    test.use({ viewport: vp, isMobile: phone, hasTouch: phone });

    test('풀이 상자(끌어 고르기): X 한 번에 닫히고, 고른 글이 풀리고, 다시 뜨거나 옆으로 밀리지 않는다', async ({ page }) => {
      await page.goto('/terms');
      await islandsReady(page);
      const para = page.locator('#cors dd p').first();
      let first: number | null = null;
      for (let i = 0; i < 3; i += 1) {
        await dragSelect(page, para, '브라우저');
        await expect(pop(page)).toBeVisible();
        await expect(page.locator('#term-pop-name')).not.toBeEmpty();
        const box = await pop(page).boundingBox();
        expect(box).not.toBeNull();
        // 같은 글을 다시 고르면 같은 자리에 뜬다 (X를 누른 자리로 밀리지 않는다)
        if (first === null) first = box?.x ?? 0;
        else expect(Math.abs((box?.x ?? 0) - first)).toBeLessThanOrEqual(1);
        await closeX(page).click();
        await expect(pop(page)).toBeHidden();
        expect(await selected(page)).toBe('');
        await staysClosed(page);
      }
    });

    test('풀이 상자: 바깥 누르기·Esc로 닫히고, 새로 고르기 전에는 다시 뜨지 않는다', async ({ page }) => {
      await page.goto('/terms');
      await islandsReady(page);
      const para = page.locator('#cors dd p').first();

      // 바깥 누르기 (본문 글이 아닌 단추: 머리줄 메뉴 단추. 메뉴는 Esc로 다시 닫는다)
      await dragSelect(page, para, '브라우저');
      await expect(pop(page)).toBeVisible();
      await outsidePress(page);
      await expect(pop(page)).toBeHidden();
      expect(await selected(page)).toBe('');
      await staysClosed(page);
      await page.keyboard.press('Escape');
      await expect(page.locator('.catmenu-panel')).toBeHidden();
      await expect(pop(page)).toBeHidden();

      // Esc: 상자만 닫고, 고른 글은 남겨도 같은 고르기로는 다시 뜨지 않는다 (아무 데서나 손을 떼도)
      await dragSelect(page, para, '브라우저');
      await expect(pop(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(pop(page)).toBeHidden();
      await page.mouse.move(vp.width / 2, vp.height - 20);
      await page.mouse.down({ button: 'right' });
      await page.mouse.up({ button: 'right' });
      await staysClosed(page);

      // 새로 고르면 다시 뜬다
      await dragSelect(page, para, '브라우저');
      await expect(pop(page)).toBeVisible();
    });

    test('풀이 상자: 키보드로 X를 누르면 닫히고 초점이 몸통으로 빠지지 않고 고른 글이 든 글 덩어리로 간다', async ({ page }) => {
      await page.goto('/terms');
      await islandsReady(page);
      const para = page.locator('#cors dd p').first();
      await dragSelect(page, para, '브라우저');
      await expect(pop(page)).toBeVisible();
      await closeX(page).focus();
      await page.keyboard.press('Enter');
      await expect(pop(page)).toBeHidden();
      expect(await page.evaluate(() => document.activeElement !== document.body && document.activeElement !== null)).toBe(true);
      await expect(para).toBeFocused();
      await staysClosed(page);
      // 초점이 떠나면 잠깐 준 tabindex를 거둔다
      await page.keyboard.press('Tab');
      await expect(para).not.toHaveAttribute('tabindex');
    });

    test("검색 쪽 '재료 찾기' 상자: X·바깥 누르기·Esc로 닫히고 다시 뜨지 않는다", async ({ page }) => {
      await page.goto('/search?q=weather');
      await islandsReady(page);
      const sum = page.locator('.search-sum');
      await expect(sum).toContainText('"weather"');
      const miss = page.locator('#term-pop .term-pop-miss');

      await dragSelect(page, sum, 'weather');
      await expect(miss).toBeVisible();
      await expect(miss).toContainText(fill(ko.glossary.missSearch, { text: 'weather' }));
      await closeX(page).click();
      await staysClosed(page);

      await dragSelect(page, sum, 'weather');
      await expect(miss).toBeVisible();
      await outsidePress(page);
      await staysClosed(page);
      await page.keyboard.press('Escape');
      await expect(page.locator('.catmenu-panel')).toBeHidden();

      await dragSelect(page, sum, 'weather');
      await expect(miss).toBeVisible();
      await page.keyboard.press('Escape');
      await staysClosed(page);
    });

    test('장바구니 서랍: X·바깥·Esc로 닫히고, 안에서 글을 끌다 바깥에서 놓으면 닫히지 않는다. 서랍 안 풀이 상자는 한 겹씩 닫힌다', async ({ page }) => {
      await page.goto('/c/ai/mcp');
      await islandsReady(page);
      await addWithSheet(page, page.locator('.listing-grid button[data-add]').first(), 'API 키를 넣는다');
      const cart = page.locator('a.hd-cart');
      const drawer = page.locator('dialog.drawer');
      const x = drawer.getByRole('button', { name: ko.drawer.close });

      await cart.click();
      await expect(drawer).toBeVisible();
      await x.click();
      await expect(drawer).toBeHidden();
      await expect(cart).toBeFocused();

      await cart.click();
      await expect(drawer).toBeVisible();
      await page.mouse.click(BACKDROP.x, BACKDROP.y);
      await expect(drawer).toBeHidden();

      await cart.click();
      await expect(drawer).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();

      await cart.click();
      await expect(drawer).toBeVisible();
      await dragOut(page, drawer.locator('.drawer-title'), BACKDROP);
      await page.waitForTimeout(300);
      expect(await isOpen(drawer)).toBe(true);
      await clearSelection(page);

      // 서랍 안 메모에서 끌어 고른 풀이 상자: X는 상자만, Esc도 상자만, 바깥 누르기도 한 번에 한 겹
      const memo = drawer.locator('.cart-memo').first();
      await dragSelect(page, memo, 'API');
      await expect(pop(page)).toBeVisible();
      await closeX(page).click();
      await expect(pop(page)).toBeHidden();
      expect(await isOpen(drawer)).toBe(true);
      await page.waitForTimeout(SETTLE);
      await expect(pop(page)).toBeHidden();

      await dragSelect(page, memo, 'API');
      await expect(pop(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(pop(page)).toBeHidden();
      expect(await isOpen(drawer)).toBe(true);

      await clearSelection(page);
      await dragSelect(page, memo, 'API');
      await expect(pop(page)).toBeVisible();
      await page.mouse.click(BACKDROP.x, BACKDROP.y);
      await expect(pop(page)).toBeHidden();
      expect(await isOpen(drawer)).toBe(true);
      await page.mouse.click(BACKDROP.x, BACKDROP.y);
      await expect(drawer).toBeHidden();
      await expect(pop(page)).toBeHidden();
    });

    test('담기 창: X·바깥·Esc로 닫히고, 안에서 글을 끌다 바깥에서 놓으면 닫히지 않는다', async ({ page }) => {
      await page.goto('/c/ai/mcp');
      await islandsReady(page);
      const add = page.locator('.listing-grid button[data-add]').first();
      const sheet = page.locator('dialog.add-sheet');

      await add.click();
      await expect(sheet).toBeVisible();
      await sheet.getByRole('button', { name: ko.sheet.close }).click();
      await expect(sheet).toBeHidden();
      await expect(add).toBeFocused();

      await add.click();
      await expect(sheet).toBeVisible();
      await page.mouse.click(BACKDROP.x, BACKDROP.y);
      await expect(sheet).toBeHidden();

      await add.click();
      await expect(sheet).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();

      await add.click();
      await expect(sheet).toBeVisible();
      await dragOut(page, sheet.locator('.add-sheet-name'), BACKDROP);
      await page.waitForTimeout(300);
      expect(await isOpen(sheet)).toBe(true);
      await expect(add).toHaveAttribute('data-in', 'false');
    });

    test('카테고리 메뉴: Esc로 닫히고 다시 열린다', async ({ page }) => {
      await page.goto('/');
      const summary = page.locator('.catmenu > summary');
      const panel = page.locator('.catmenu-panel');
      for (let i = 0; i < 2; i += 1) {
        await summary.click();
        await expect(panel).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
        await expect(summary).toBeFocused();
      }
    });

    if (phone) {
      test('풀이 상자(손가락): X를 한 번 톡 치면 닫히고 다시 뜨지 않는다, 바깥을 치면 닫힌다', async ({ page }) => {
        await page.goto('/terms');
        await islandsReady(page);
        const para = page.locator('#cors dd p').first();
        /** 길게 눌러 고른 것처럼: 손가락으로 한 번 닿은 뒤 글을 고른다 (selectionchange → 400ms 조용하면 뜬다) */
        const touchSelect = async (): Promise<void> => {
          await para.scrollIntoViewIfNeeded();
          const b = await para.boundingBox();
          await page.touchscreen.tap((b?.x ?? 0) + 4, (b?.y ?? 0) + 4);
          await para.evaluate((el) => {
            const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
              const i = n.textContent?.indexOf('브라우저') ?? -1;
              if (i < 0) continue;
              const r = document.createRange();
              r.setStart(n, i);
              r.setEnd(n, i + 4);
              document.getSelection()?.removeAllRanges();
              document.getSelection()?.addRange(r);
              return;
            }
          });
        };
        await touchSelect();
        await expect(pop(page)).toBeVisible();
        await closeX(page).tap();
        await staysClosed(page);

        await touchSelect();
        await expect(pop(page)).toBeVisible();
        await page.locator('.catmenu > summary').tap();
        await staysClosed(page);
      });

      test('거르기 시트: X·바깥·Esc로 닫히고, 안에서 글을 끌다 바깥에서 놓으면 닫히지 않는다', async ({ page }) => {
        await page.goto('/c/api/weather');
        await islandsReady(page);
        const open = page.getByRole('button', { name: fill(ko.facets.openLabel, { n: 0 }) });
        const sheet = page.locator('dialog.facet-sheet');

        await open.click();
        await expect(sheet).toBeVisible();
        await sheet.getByRole('button', { name: ko.facets.close }).click();
        await expect(sheet).toBeHidden();
        await expect(open).toBeFocused();

        await open.click();
        await expect(sheet).toBeVisible();
        await page.mouse.click(BACKDROP.x, BACKDROP.y);
        await expect(sheet).toBeHidden();

        await open.click();
        await expect(sheet).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(sheet).toBeHidden();

        await open.click();
        await expect(sheet).toBeVisible();
        await dragOut(page, sheet.locator('#fsh-title'), BACKDROP);
        await page.waitForTimeout(300);
        expect(await isOpen(sheet)).toBe(true);
      });
    } else {
      test('프롬프트 창: X·바깥·Esc로 닫히고, 안의 글을 끌어 고르다 바깥에서 놓으면 닫히지 않는다', async ({ page }) => {
        await page.goto('/c/ai/mcp');
        await islandsReady(page);
        await addWithSheet(page, page.locator('.listing-grid button[data-add]').first());
        await page.goto('/cart');
        await islandsReady(page);
        const pull = page.locator('.cart-summary').getByRole('button', { name: ko.cart.checkout });
        const dlg = page.locator('dialog.prompt-dlg');

        await pull.click();
        await expect(dlg).toBeVisible();
        await dlg.getByRole('button', { name: ko.prompt.close }).click();
        await expect(dlg).toHaveCount(0);
        await expect(pull).toBeFocused();

        await pull.click();
        await expect(dlg).toBeVisible();
        await page.mouse.click(BACKDROP.x, BACKDROP.y);
        await expect(dlg).toHaveCount(0);

        await pull.click();
        await expect(dlg).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dlg).toHaveCount(0);

        // 프롬프트 글을 복사하려고 끌어 고르다 창 밖에서 놓아도 창은 그대로
        await pull.click();
        await expect(dlg).toBeVisible();
        await dragOut(page, dlg.locator('.term-text code'), BACKDROP);
        await page.waitForTimeout(300);
        await expect(dlg).toBeVisible();
      });

      test('카테고리 메뉴: 바깥 누르기로 닫히고, 메뉴 안에서 끌다 바깥에서 놓으면 닫히지 않는다', async ({ page }) => {
        await page.goto('/');
        const summary = page.locator('.catmenu > summary');
        const panel = page.locator('.catmenu-panel');
        // 넓은 화면에서 메뉴 판은 머리줄 아래를 다 덮는다: 바깥은 머리줄의 검색창
        const q = page.locator('#hd-q');
        await summary.click();
        await expect(panel).toBeVisible();
        const qb = await q.boundingBox();
        await dragOut(page, panel.locator('nav'), { x: (qb?.x ?? 0) + 40, y: (qb?.y ?? 0) + (qb?.height ?? 0) / 2 }, 4);
        await page.waitForTimeout(200);
        await expect(panel).toBeVisible();
        await q.click();
        await expect(panel).toBeHidden();
        await expect(q).toBeFocused();
      });
    }
  });
}
