// e2e 도우미: 섬이 붙기를 기다리기, 바깥 요청 막기 (출처 그림·글꼴은 시험에서 부르지 않는다).
import type { Locator, Page } from '@playwright/test';

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
