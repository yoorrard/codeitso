// 기다림 표시 (U, D148): 진열대 JSON이 늦으면 내용 모양의 뼈대가 늦게 나타났다가 내용으로 바뀌고(아래가 밀리지 않는다),
// 동작 줄이기면 뼈대가 숨 쉬지 않으며, 주요 화면의 누적 흔들림(CLS)이 0.05 아래다. 머리줄 배지는 섬이 깨어나기 전에 채워져 있다.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { KEYS } from '../../src/lib/saved.ts';
import { fill } from '../../src/lib/text.ts';
import { blockExternal, islandsReady } from './helpers.ts';

/** 진열대 JSON(목록 묶음·상세 조각·검색 조각·모델)을 ms만큼 늦춘다 */
async function slowCatalog(page: Page, ms: number): Promise<void> {
  await page.route(/\/catalog\/.*\.json$/, async (route) => {
    await new Promise((ok) => setTimeout(ok, ms));
    await route.continue();
  });
}

/** 쪽을 열기 전에 흔들림을 모으기 시작한다 (이용자 입력 직후 것은 빼는 CLS 규칙) */
async function watchShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { hadRecentInput: boolean; value: number }[]) if (!e.hadRecentInput) w.__cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const cls = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __cls: number }).__cls);

test.describe('늦은 자료: 뼈대 → 내용', () => {
  test('상세: 뼈대가 상태 글과 함께 늦게 나타나고, 내용이 오면 사라지며 바닥글이 밀리지 않는다', async ({ page }) => {
    await blockExternal(page);
    await slowCatalog(page, 1500);
    await watchShifts(page);
    await page.goto('/item?id=google-fonts%3Aroboto');
    const set = page.locator('.sk-set').filter({ has: page.getByRole('status') });
    await expect(set.getByRole('status')).toHaveText(ko.item.loading);
    // 기다림(--dur-wait) 뒤에는 보인다
    await expect.poll(() => set.evaluate((el) => Number(getComputedStyle(el).opacity)), { timeout: 3000 }).toBeGreaterThan(0.9);
    await expect(page.locator('.detail-top .sk.thumb')).toBeVisible();
    await expect(page.locator('h1.detail-name')).toHaveText('Roboto', { timeout: 10_000 });
    await expect(page.locator('.sk')).toHaveCount(0);
    expect(await cls(page)).toBeLessThan(0.05);
  });

  test('목록 2쪽 주소: 빌드 때 그린 1쪽 카드는 바로 덮이고, 2쪽 카드로 바뀐다', async ({ page }) => {
    await blockExternal(page);
    await slowCatalog(page, 1500);
    await watchShifts(page);
    await page.goto('/c/ai/mcp?page=2');
    await expect(page.locator('html')).toHaveAttribute('data-list-pending', '');
    const cover = (): Promise<string> => page.locator('.listing-grid .card').first().evaluate((el) => getComputedStyle(el, '::before').content);
    expect(await cover()).not.toBe('none');
    await islandsReady(page);
    await expect(page.locator('.listing-grid')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('.list-range')).toContainText('61–120', { timeout: 10_000 });
    await expect(page.locator('html')).not.toHaveAttribute('data-list-pending', '');
    await expect(page.locator('.listing-grid')).not.toHaveAttribute('aria-busy', 'true');
    expect(await cover()).toBe('none');
    expect(await cls(page)).toBeLessThan(0.05);
  });

  test('목록에서 쪽을 넘기면: 지금 카드 위에 뼈대 덮개, 받으면 걷힌다 (덮개 동안은 낡은 카드를 누를 수 없다)', async ({ page }) => {
    await blockExternal(page);
    await page.goto('/c/ai/mcp');
    await islandsReady(page);
    await slowCatalog(page, 1200);
    await page.locator('.pager').getByRole('link', { name: fill(ko.list.pageLabel, { n: 2 }) }).click();
    await expect(page.locator('.listing-grid.is-wait')).toHaveCount(1);
    await expect(page.locator('.listing-grid')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status').filter({ hasText: ko.list.loading })).toHaveCount(1);
    await expect(page.locator('.list-range')).toContainText('61–120', { timeout: 10_000 });
    await expect(page.locator('.listing-grid.is-wait')).toHaveCount(0);
  });

  test('검색: 첫 결과 전에는 결과 모양 뼈대(예시 칩은 가린다), 결과가 오면 바뀐다', async ({ page }) => {
    await blockExternal(page);
    await slowCatalog(page, 800);
    await watchShifts(page);
    await page.goto('/search?q=font');
    await expect(page.locator('.search-examples')).toBeHidden();
    await islandsReady(page);
    await expect(page.getByRole('status').filter({ hasText: ko.search.loading })).toHaveCount(1);
    await expect(page.locator('.search-results .grid.is-wait .card')).toHaveCount(10);
    await expect(page.locator('.search-sum')).toContainText('font', { timeout: 15_000 });
    await expect(page.locator('.sk-set')).toHaveCount(0);
    expect(await cls(page)).toBeLessThan(0.05);
  });

  test('빨리 오면 뼈대를 보이지 않는다 (기다림 안에 끝남)', async ({ page }) => {
    await blockExternal(page);
    await page.goto('/item?id=google-fonts%3Aroboto');
    await islandsReady(page);
    await expect(page.locator('h1.detail-name')).toHaveText('Roboto');
    await expect(page.locator('.sk')).toHaveCount(0);
  });
});

test.describe('동작 줄이기', () => {
  for (const how of ['기기', '사이트'] as const) {
    test(`${how} 설정: 뼈대는 늦게 나타나도 숨 쉬지 않는다 (멈춘 판)`, async ({ page }) => {
      await blockExternal(page);
      if (how === '기기') await page.emulateMedia({ reducedMotion: 'reduce' });
      else await page.addInitScript((k) => localStorage.setItem(k, JSON.stringify({ motion: 'reduce' })), KEYS.prefs);
      await slowCatalog(page, 2000);
      await page.goto('/item?id=google-fonts%3Aroboto');
      const sk = page.locator('.detail-top .sk.thumb');
      await expect(sk).toBeVisible();
      expect(await sk.evaluate((el) => getComputedStyle(el).animationDuration)).toBe('0s');
      const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length);
      expect(running).toBe(0);
    });
  }

  test('기본 설정: 뼈대 판은 숨 쉰다 (끝없는 반복 하나 이상)', async ({ page }) => {
    await blockExternal(page);
    await slowCatalog(page, 2000);
    await page.goto('/item?id=google-fonts%3Aroboto');
    await expect(page.locator('.detail-top .sk.thumb')).toBeVisible();
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity).length);
    expect(running).toBeGreaterThan(0);
  });
});

test.describe('흔들림(CLS) 0.05 아래', () => {
  for (const width of [360, 1440]) {
    test.describe(`${width}px`, () => {
      test.use({ viewport: { width, height: width < 600 ? 800 : 900 }, isMobile: width < 600, hasTouch: width < 600 });
      for (const path of ['/', '/c/design/fonts?page=2', '/item?id=google-fonts%3Aroboto', '/search?q=icon', '/models', '/cart']) {
        test(path, async ({ page }) => {
          await blockExternal(page);
          // 담은 것·찜한 것이 있는 사람 (배지와 장바구니 쪽이 저장된 값으로 그려진다)
          await page.addInitScript(
            ([cart, wish]) => {
              localStorage.setItem(cart, JSON.stringify([{ id: 'google-fonts:roboto', name: 'Roboto', cat: 'design', sub: 'fonts', at: 1 }]));
              localStorage.setItem(wish, JSON.stringify([{ id: 'styles:aurora', name: 'Aurora', cat: 'design', sub: 'styles', at: 1 }]));
            },
            [KEYS.cart, KEYS.wish] as const,
          );
          await watchShifts(page);
          await page.goto(path);
          await islandsReady(page);
          await page.waitForFunction(() => !document.documentElement.hasAttribute('data-list-pending') && !document.querySelector('.sk-set'));
          await page.waitForTimeout(500);
          expect(await cls(page)).toBeLessThan(0.05);
        });
      }
    });
  }
});

test('머리줄 배지: 섬이 깨어나기 전(첫 그림)부터 저장된 개수', async ({ page }) => {
  await blockExternal(page);
  await page.addInitScript(
    ([cart]) => {
      localStorage.setItem(cart, JSON.stringify([
          { id: 'google-fonts:roboto', name: 'Roboto', cat: 'design', sub: 'fonts', at: 1 },
          { id: 'styles:aurora', name: 'Aurora', cat: 'design', sub: 'styles', at: 2 },
        ]));
      // 첫 그림 직전(문서를 다 읽은 뒤의 첫 requestAnimationFrame)의 배지
      document.addEventListener('DOMContentLoaded', () =>
        requestAnimationFrame(() => {
          (window as unknown as { __badge: string | null }).__badge = document.querySelector('.hd-badge')?.textContent ?? null;
        }),
      );
    },
    [KEYS.cart] as const,
  );
  // 서랍 섬(client:load)을 늦춰 깨어나기 전 값을 본다
  await page.route(/CartDrawer\.[^/]*\.js$/, async (route) => {
    await new Promise((ok) => setTimeout(ok, 800));
    await route.continue();
  });
  await page.goto('/kits');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __badge: string | null }).__badge ?? null)).toBe('2');
  await islandsReady(page);
  await expect(page.locator('.hd-badge')).toHaveText('2');
  await expect(page.locator('a.hd-cart')).toHaveAttribute('aria-label', ko.layout.cartCount.replace('{{n}}', '2'));
});

test('담긴 카드는 섬이 깨어난 뒤에도 [담겼어요] 글이다', async ({ page }) => {
  await blockExternal(page);
  await page.addInitScript((k) => localStorage.setItem(k, JSON.stringify([{ id: 'google-fonts:roboto', name: 'Roboto', cat: 'design', sub: 'fonts', at: 1 }])), KEYS.cart);
  await page.goto('/c/design/fonts');
  await islandsReady(page);
  const btn = page.locator('.listing-grid button[data-add="google-fonts:roboto"]');
  await expect(btn).toHaveAttribute('data-in', 'true');
  await expect(btn.locator('.add-label')).toHaveText(ko.card.added);
});

test.describe('상세의 모델·요금 (늦게 받는 묶음)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('표 스타일을 늦게 붙여 받은 뒤 그리고, 첫 화면 CSS에는 없다', async ({ page }) => {
    await blockExternal(page);
    const css: string[] = [];
    page.on('response', (r) => {
      if (r.url().endsWith('.css')) css.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });
    await page.goto('/item?id=models-dev:openai');
    expect(await page.locator('link[rel="stylesheet"][href*="models"]').count()).toBe(0);
    await islandsReady(page);
    const box = page.locator('.models-sec .mt-scroll');
    await expect(box).toBeVisible({ timeout: 10_000 });
    expect(await box.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
    expect(css.filter((x) => !x.startsWith('200'))).toEqual([]);
  });
});

test('없는 쪽(404): 다시 찾을 검색창과 처음 화면·카테고리 링크', async ({ page }) => {
  await blockExternal(page);
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(ko.notFound.title);
  await expect(page.locator('.lost').getByRole('searchbox')).toBeVisible();
  await expect(page.locator('.lost').getByRole('link', { name: ko.notFound.categories })).toBeVisible();
});
