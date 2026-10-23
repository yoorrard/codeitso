// e2e 도우미: 섬이 붙기를 기다리기, 바깥 요청 막기 (출처 그림·글꼴은 시험에서 부르지 않는다).
import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';

/** 바로 붙는 섬(client:load·idle)이 다 붙을 때까지 */
export async function islandsReady(page: Page): Promise<void> {
  await page.waitForFunction(() => [...document.querySelectorAll('astro-island[client="load"], astro-island[client="idle"]')].every((i) => !i.hasAttribute('ssr')));
}

/** 보일 때 붙는 섬(client:visible) 안의 요소: 보이게 굴리고 그 섬이 붙을 때까지 */
export async function hydrated(target: Locator): Promise<Locator> {
  await target.scrollIntoViewIfNeeded();
  await target.evaluate(
    (el) =>
      new Promise<void>((ok) => {
        const check = (): void => {
          if (!el.closest('astro-island')?.hasAttribute('ssr')) ok();
          else setTimeout(check, 30);
        };
        check();
      }),
  );
  return target;
}

/** 시험 서버 밖으로 나가는 요청(출처 미리 보기 그림 따위)을 막는다: 망 상태와 상관없이 같은 결과가 나오게 */
export async function blockExternal(page: Page): Promise<void> {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1[:/]|localhost[:/])/, (route) => route.abort());
}

/** 상품 카드 이름 (목록 격자 안 n번째) */
export function cardName(page: Page, n = 0): Locator {
  return page.locator('.listing-grid .card-name').nth(n);
}

/** 글 일부를 마우스로 고른 것처럼: 범위를 고르고 손 떼기(pointerup)를 보낸다. 두 번 누르기는 누른 자리의 낱말이 화면 폭마다 달라 쓰지 않는다 */
export async function selectText(target: Locator, text: string): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await target.evaluate((el, t) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = n.textContent?.indexOf(t) ?? -1;
      if (i < 0) continue;
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + t.length);
      const sel = document.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
      const b = r.getBoundingClientRect();
      document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', clientX: b.right, clientY: b.bottom }));
      return;
    }
    throw new Error(`글이 없다: ${t}`);
  }, text);
}

/** 글 일부가 화면에 그려진 자리: 첫 줄 왼쪽 가운데(x0, y0)와 끝 줄 오른쪽 가운데(x1, y1). 보이게 굴린 뒤 잰다 */
export async function textBox(target: Locator, text: string): Promise<{ x0: number; y0: number; x1: number; y1: number }> {
  await target.scrollIntoViewIfNeeded();
  return target.evaluate((el, t) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = n.textContent?.indexOf(t) ?? -1;
      if (i < 0) continue;
      const r = document.createRange();
      r.setStart(n, i);
      r.setEnd(n, i + t.length);
      const rs = [...r.getClientRects()].filter((b) => b.width > 0);
      const a = rs[0];
      const b = rs[rs.length - 1];
      if (!a || !b) break;
      return { x0: a.left + 1, y0: (a.top + a.bottom) / 2, x1: b.right - 1, y1: (b.top + b.bottom) / 2 };
    }
    throw new Error(`글이 없다: ${t}`);
  }, text);
}

/** 사람처럼 마우스로 끌어 고르기: 글 앞에서 누르고 끝까지 끌고 뗀다 (실제 pointerdown·mousedown·pointerup·click이 다 일어난다) */
export async function dragSelect(page: Page, target: Locator, text: string): Promise<void> {
  const b = await textBox(target, text);
  await page.mouse.move(b.x0, b.y0);
  await page.mouse.down();
  await page.mouse.move((b.x0 + b.x1) / 2, b.y1, { steps: 3 });
  await page.mouse.move(b.x1, b.y1, { steps: 3 });
  await page.mouse.up();
}

/** 창 안(from 왼쪽 끝, 높이는 dy 또는 가운데)에서 누르기 시작해 창 밖(to)에서 손을 뗀다: 글을 고르다 바깥에서 놓은 것 */
export async function dragOut(page: Page, from: Locator, to: { x: number; y: number }, dy?: number): Promise<void> {
  const box = await from.boundingBox();
  if (!box) throw new Error('끌기 시작할 자리가 보이지 않는다');
  const y = box.y + (dy ?? box.height / 2);
  await page.mouse.move(box.x + 3, y);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(30, box.width / 2), y, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

/** [담기]를 누르면 뜨는 담기 창 (v5.1 D120): 메모를 적고(있으면) 창의 [담기]를 눌러야 담긴다. 닫히면 누른 버튼으로 초점이 돌아온다 */
export async function addWithSheet(page: Page, btn: Locator, memo = ''): Promise<void> {
  await btn.click();
  const sheet = page.locator('dialog.add-sheet');
  await expect(sheet).toBeVisible();
  if (memo) await sheet.getByLabel(ko.sheet.memoLabel).fill(memo);
  await sheet.getByRole('button', { name: ko.sheet.add, exact: true }).click();
  await expect(sheet).toBeHidden();
}
