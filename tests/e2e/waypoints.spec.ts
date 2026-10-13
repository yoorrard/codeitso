// 도구 고르기 (brief 6.6·2.1, D70): 꼭 고를 것은 추천 줄이 '고를 예정'으로 미리 눌려 있고(저장 안 함),
// 아래 막대의 [{도구}로 정하기] 한 번으로 정하고 다음 남은 꼭 고를 것으로 간다. 추천대로 가면 꼭 고를 것 n개에 n번.
// 있으면 좋은 것은 미리 누르지 않는다(꺼짐 + [이번엔 건너뛰기]). 잠기면 빈 상태 하나와 주 버튼 하나.
// '자세히'는 줄 안이 아니라 줄 아래 따로 있는 글 버튼이다. 키보드만으로 끝까지 간다.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { josa } from '../../src/lib/josa.ts';
import { shortName } from '../../src/lib/pick-nav.ts';
import { golden, islandsReady, products } from './helpers.ts';

const c03 = golden('case-03');
const name = (id: string): string => products.find((p) => p.id === id)?.name ?? id;
/** 주 버튼이 읽히는 이름: '{도구}로 정하기'. 이름이 14자를 넘으면 글은 '고른 도구로 정하기', 읽는 이름은 그 글로 시작하고 온전한 이름을 붙인다 (WCAG 2.5.3) */
const pickName = (id: string, template: string = ko.shop.pickAs): string => {
  const short = shortName(name(id));
  if (short !== null) return fill(template, { dir: josa(short, 'dir') });
  return fill(template === ko.shop.changeAs ? ko.shop.changeLongLabel : ko.shop.pickLongLabel, { name: name(id) });
};

/** 저장된 진행을 심고 도구 고르기를 연다 (다시 불러와도 처음 심은 것을 덮어쓰지 않는다) */
async function open(page: Page, answers: Record<string, string>, cart: string[] = []): Promise<void> {
  await page.addInitScript(
    ([a, c]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('cc:session:v1', JSON.stringify({ answers: a, cart: c, kept: [], deferred: [] }));
    },
    [answers, cart] as const,
  );
  await page.goto('/waypoints');
  await islandsReady(page);
}

const savedCart = (page: Page): Promise<string[]> =>
  page.evaluate(() => (JSON.parse(localStorage.getItem('cc:session:v1') ?? '{}') as { cart?: string[] }).cart ?? []);
const save = (page: Page) => page.locator('.action-bar button.w-save');
const go = (page: Page) => page.locator('.action-bar a.w-go');
const pressed = (page: Page) => page.locator('#w-slot .w-row[aria-pressed="true"]');
const chip = (page: Page, label: string) => page.locator('.w-chip', { hasText: label });

async function seriousAxe(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
}

test('잠김: 빈 상태 하나(빈 터 그림 + 한 줄)와 주 버튼 하나 [만들 앱 정하러 가기]', async ({ page }) => {
  await page.goto('/waypoints');
  await islandsReady(page);
  await expect(page.locator('h1')).toHaveText(ko.shop.locked);
  await expect(page.locator('.empty-state .empty-state-art')).toBeVisible();
  await expect(page.locator('.btn-primary:visible')).toHaveCount(1);
  await expect(page.locator('.action-bar .btn-primary')).toHaveAttribute('href', '/destination');
  await expect(page.locator('.action-bar .btn-primary')).toHaveText(ko.shop.toInterview);
  await expect(page.locator('.w-chips')).toHaveCount(0);
});

test('추천대로 가면 꼭 고를 것 3개를 [{도구}로 정하기] 정확히 3번으로 끝낸다 (미리 누름은 저장하지 않는다)', async ({ page }) => {
  await open(page, c03.answers);
  // 첫 칸은 첫 꼭 고를 것, 추천 줄이 '고를 예정'으로 눌려 있지만 아직 저장되지 않았다
  await expect(chip(page, '화면')).toHaveAttribute('aria-current', 'true');
  await expect(pressed(page)).toHaveCount(1);
  await expect(pressed(page).locator('.tag-reco')).toHaveText(ko.shop.recommended);
  expect(await savedCart(page)).toEqual([]);
  let presses = 0;
  while ((await save(page).count()) > 0 && presses < 10) {
    const label = (await save(page).textContent()) ?? '';
    expect(label).toMatch(/로 정하기$/);
    await save(page).click();
    presses += 1;
    await expect.poll(async () => (await savedCart(page)).length).toBe(presses);
  }
  expect(presses).toBe(3);
  await expect(go(page)).toHaveText(ko.shop.goCheck);
  await expect(page.locator('.btn-primary:visible')).toHaveCount(1);
  await expect(page.locator('.status-line')).toContainText(ko.progress.status.requiredDone);
  await expect(page.locator('#cc-live')).toContainText(ko.shop.allRequired);
  await go(page).click();
  await page.waitForURL(/\/check$/);
});

test('정하면 다음 남은 꼭 고를 것이 열리고, 알림이 정한 도구·남은 수·다음 칸과 그 추천을 말한다. 페이지는 굴러가지 않는다', async ({ page }) => {
  await open(page, c03.answers);
  const first = (await pressed(page).getAttribute('data-product')) ?? '';
  // 미리 눌린 줄은 '고를 예정'(숨은 글)이고 ✓가 없다. ✓는 정한 줄에만
  await expect(pressed(page).locator('.visually-hidden', { hasText: ko.shop.pendingMark })).toHaveCount(1);
  await expect(pressed(page).locator('.list-check')).toHaveCount(0);
  // Playwright의 click()은 누르기 전에 버튼 쪽으로 굴리므로, 화면 굴림을 보려고 페이지 안에서 바로 누른다
  await page.evaluate(() => document.querySelector<HTMLElement>('.action-bar button.w-save')?.click());
  await expect(chip(page, '화면')).toHaveClass(/is-chosen/);
  await expect(chip(page, '외부 데이터')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#cc-live')).toContainText(fill(ko.shop.requiredLeft, { n: 2 }));
  await expect(page.locator('#cc-live')).toContainText(fill(ko.shop.nextSlot, { title: '외부 데이터를 맡을 도구' }));
  const next = (await pressed(page).getAttribute('data-product')) ?? '';
  await expect(page.locator('#cc-live')).toContainText(fill(ko.shop.nextPick, { cop: josa(shortName(name(next)) ?? name(next), 'cop') }).replace(/\.$/, ''));
  // 주 버튼으로 돌린 초점이 sticky 아래 막대의 흐름 자리(페이지 끝)로 굴리지 않는다
  await expect(save(page)).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await savedCart(page)).toEqual([first]);
  // 정한 칸으로 돌아가면 그 줄에 ✓와 '정한 도구'
  await chip(page, '화면').click();
  await expect(pressed(page).locator('.list-check')).toHaveCount(1);
  await expect(pressed(page).locator('.visually-hidden', { hasText: ko.shop.savedMark })).toHaveCount(1);
});

test('있으면 좋은 것은 미리 누르지 않는다: 주 버튼은 꺼짐 + [이번엔 건너뛰기], 줄을 누르면 이름이 박힌다', async ({ page }) => {
  await open(page, c03.answers);
  await chip(page, '배포·공유').click();
  await expect(page.locator('#w-slot .w-slot-head .tag')).toHaveText(ko.shop.optional);
  await expect(pressed(page)).toHaveCount(0);
  await expect(save(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(save(page)).toHaveText(ko.shop.pickGeneric);
  await expect(page.locator('.btn-primary:visible')).toHaveCount(1);
  const skip = page.locator('.action-bar .w-extra');
  await expect(skip).toHaveText(ko.shop.skip);
  // 꺼진 버튼은 눌러도 아무것도 저장하지 않는다 (aria-disabled라 초점은 닿는다). Enter면 까닭을 읽고 첫 도구 줄로 초점을 옮긴다
  await save(page).focus();
  await page.keyboard.press('Enter');
  expect(await savedCart(page)).toEqual([]);
  await expect(page.locator('#cc-live')).toContainText(ko.shop.pickFirst);
  await expect(page.locator('#w-slot .w-row').first()).toBeFocused();
  // 줄을 누르면 그 도구로 정하는 버튼이 된다. 다시 누르면 '고를 예정'을 거둔다
  const row = page.locator('#w-slot .w-row').nth(1);
  const id = (await row.getAttribute('data-product')) ?? '';
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await expect(save(page)).not.toHaveAttribute('aria-disabled', 'true');
  await expect(save(page)).toHaveAccessibleName(pickName(id));
  await row.click();
  await expect(pressed(page)).toHaveCount(0);
  // 건너뛰면 다음 남은 꼭 고를 것(처음으로 돌아 화면)이 열린다
  await skip.click();
  await expect(chip(page, '화면')).toHaveAttribute('aria-current', 'true');
  await expect(pressed(page)).toHaveCount(1);
});

test('정한 도구와 다른 줄을 누르면 [{도구}로 바꾸기]이고, 누르면 이 칸의 도구를 바꾼다', async ({ page }) => {
  await open(page, c03.answers, ['react-vite']);
  await chip(page, '화면').click();
  await expect(pressed(page)).toHaveAttribute('data-product', 'react-vite');
  await page.locator('#w-slot .w-row[data-product="html-single"]').click();
  // 바꾸는 중: 새로 누른 줄은 고름 면, 정한 줄(react-vite)은 고름 면 없이 ✓만
  await expect(page.locator('#w-slot .w-row[data-product="react-vite"] .list-check')).toHaveCount(1);
  await expect(save(page)).toHaveText(pickName('html-single', ko.shop.changeAs));
  await save(page).click();
  await expect.poll(() => savedCart(page)).toEqual(['html-single']);
  // [바꾸기]를 눌렀으면 '바꿨어요'
  await expect(page.locator('#cc-live')).toContainText(fill(ko.shop.changedAs, { dir: josa(shortName(name('html-single')) ?? name('html-single'), 'dir') }));
});

test("'자세히'는 줄 안이 아니라 눌린 줄 아래의 따로 있는 글 버튼이고, 펼치면 한눈에 보기 목록이 나온다", async ({ page }) => {
  await open(page, c03.answers);
  await expect(page.locator('#w-slot .w-row button, #w-slot .w-row a')).toHaveCount(0);
  const more = page.locator('#w-slot .w-more');
  await expect(more).toHaveCount(1);
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(more).toHaveAttribute('aria-expanded', 'true');
  const facts = page.locator('#w-slot .w-facts:visible');
  for (const k of [ko.shop.provider, ko.shop.access, ko.shop.keyRisk, ko.shop.checked, ko.shop.links]) await expect(facts).toContainText(k);
  // 펼친 채 다른 줄을 누르면 그 줄의 목록이 펼쳐진다 (견주기)
  await page.locator('#w-slot .w-row[aria-pressed="false"]').first().click();
  await expect(page.locator('#w-slot .w-facts:visible')).toHaveCount(1);
  // 2px 진한 테두리·줄마다 [고르기]·난이도 막대가 없다
  await expect(page.locator('.btn-pick, .level-bar, .product-top')).toHaveCount(0);
  expect(await seriousAxe(page)).toEqual([]);
});

test('키보드만으로: 줄 → 자세히 → 아래 막대, Enter 세 번으로 꼭 고를 것을 다 정하고 Enter로 도구끼리 맞춰 보러 간다', async ({ page }) => {
  await open(page, c03.answers);
  // Tab으로 눌린 줄까지
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.matches('#w-slot .w-row[aria-pressed="true"]'))) break;
  }
  await expect(pressed(page)).toBeFocused();
  // 눌린 줄 바로 다음이 그 줄의 '자세히' (Enter로 펼친다)
  await page.keyboard.press('Tab');
  await expect(page.locator('#w-slot .w-more')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#w-slot .w-more')).toHaveAttribute('aria-expanded', 'true');
  // 아래 막대의 주 버튼까지
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.activeElement?.matches('.action-bar .w-save'))) break;
  }
  await expect(save(page)).toBeFocused();
  for (let n = 1; n <= 3; n++) {
    await page.keyboard.press('Enter');
    // 실패하면 초점·버튼 글·여는 칸을 함께 보인다 (CI에서만 한 번 난 실패를 다시 보면 원인을 읽을 수 있게)
    const state = (): Promise<string> =>
      page.evaluate(() => {
        const a = document.activeElement;
        return `초점=${a?.tagName}.${a?.className} "${(a?.textContent ?? '').trim().slice(0, 30)}" 칩=${document.querySelector('.w-chip[aria-current="true"]')?.textContent?.trim() ?? '-'}`;
      });
    await expect.poll(async () => (await savedCart(page)).length, { message: `Enter ${n}번째 뒤 장바구니 (${await state()})` }).toBe(n);
  }
  // 정하기 → 맞춰 보러 가기로 바뀌어도 초점은 주 버튼에 남는다
  await expect(go(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/check$/);
});

test('도구끼리 맞춰 보기의 ?slot=으로 오면 그 칸이 열린다', async ({ page }) => {
  await page.addInitScript((s) => localStorage.setItem('cc:session:v1', JSON.stringify(s)), { answers: c03.answers, cart: [], kept: [], deferred: [] });
  await page.goto('/waypoints?slot=slot.notify');
  await islandsReady(page);
  await expect(chip(page, '알림')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#w-slot-title')).toHaveText('알림을 맡을 도구');
});
