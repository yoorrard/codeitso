// v4 레이아웃과 스크롤 예산 (docs/review/v4/brief.md 3절, D98).
// 1440×900: 단계 화면마다 지금 질문(또는 칸 제목)·보기 전부(최대 8개)·주 버튼이 스크롤 없이 보인다. 머리줄의 사전 버튼은 늘 같은 자리.
// 390×844: 질문 + 보기 첫 4개 + 주 버튼(아래 막대에 붙박이)이 보인다. 홈은 1440×900에서 소개·주 버튼·미리 짠 코스 셋.
// '보인다' = 요소 전체가 화면 안에 있고, 본문 요소는 붙박이 아래 막대 위에서 끝난다 (막대가 가리지 않는다).
import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { golden, islandsReady, questions } from './helpers.ts';

const SIZES = [
  { name: '1440×900', width: 1440, height: 900, options: 8 },
  { name: '390×844', width: 390, height: 844, options: 4 },
] as const;

interface Seed {
  answers: Record<string, string>;
  cart: string[];
  kept?: string[];
}

async function open(page: Page, route: string, seed: Seed | null): Promise<void> {
  await page.addInitScript((s) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    if (s) localStorage.setItem('cc:session:v1', JSON.stringify({ kept: [], deferred: [], ...s }));
  }, seed);
  await page.goto(route);
  await islandsReady(page);
}

/** 붙박이 아래 막대의 윗변 (단계 화면). 없으면 화면 높이 */
async function barTop(page: Page): Promise<number> {
  const bar = page.locator('.stage-left > .action-bar');
  if ((await bar.count()) === 0) return page.viewportSize()?.height ?? 0;
  return bar.evaluate((el) => el.getBoundingClientRect().top);
}

/** 요소 전체가 스크롤 없이 화면 안에 있다. 본문 요소(content)는 아래 막대 위에서 끝난다 */
async function expectVisibleNow(page: Page, target: Locator, label: string, content = true): Promise<void> {
  const vh = page.viewportSize()?.height ?? 0;
  const limit = content ? Math.min(vh, await barTop(page)) : vh;
  const box = await target.boundingBox();
  expect(box, `${label}: 그려져 있다`).not.toBeNull();
  if (!box) return;
  expect(box.y, `${label}: 위가 화면 안`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height, `${label}: 아래가 ${content ? '아래 막대 위' : '화면 안'} (${Math.round(box.y + box.height)} ≤ ${Math.round(limit)})`).toBeLessThanOrEqual(limit + 1);
}

async function expectTop(page: Page): Promise<void> {
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

/** 앞에서부터 n개 보기 */
async function firstOptions(list: Locator, n: number): Promise<Locator[]> {
  const count = Math.min(n, await list.count());
  return Array.from({ length: count }, (_, i) => list.nth(i));
}

for (const size of SIZES) {
  test.describe(`스크롤 예산 ${size.name}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    test('홈: 소개·주 버튼이 보이고, 1440에서는 미리 짠 코스 셋까지', async ({ page }) => {
      await open(page, '/', null);
      await expectTop(page);
      await expectVisibleNow(page, page.locator('#home-title'), 'H1', false);
      await expectVisibleNow(page, page.locator('.home-intro'), '소개 한 줄', false);
      await expectVisibleNow(page, page.locator('.home-go'), '주 버튼', false);
      if (size.width >= 1024) {
        const cards = page.locator('.course-card');
        await expect(cards).toHaveCount(3);
        for (let i = 0; i < 3; i++) await expectVisibleNow(page, cards.nth(i), `코스 ${i + 1}`, false);
      }
    });

    test('내 AI 써 보기: 제목·건너뛰기·주 버튼', async ({ page }) => {
      await open(page, '/test-drive', null);
      await expectTop(page);
      await expectVisibleNow(page, page.locator('#practice-title'), 'H1');
      await expectVisibleNow(page, page.locator('.practice-skip'), '건너뛰기');
      await expectVisibleNow(page, page.locator('.action-bar .lesson-go'), '주 버튼', false);
    });

    test('만들 앱 정하기: 질문마다 제목·보기·주 버튼(이전 포함)', async ({ page }) => {
      const answers = golden('case-01').answers;
      await open(page, '/destination', null);
      for (let step = 0; step < 30; step++) {
        const title = ((await page.locator('#q-title').textContent()) ?? '').trim();
        const q = questions.find((x) => title.endsWith(x.text));
        if (!q) break;
        await expectTop(page);
        await expectVisibleNow(page, page.locator('#q-title'), `${q.id} 제목`);
        const opts = page.locator('.q :is(.pick-tile, .pick-btn, .list-row)');
        for (const [i, o] of (await firstOptions(opts, size.options)).entries()) await expectVisibleNow(page, o, `${q.id} 보기 ${i + 1}`);
        // 주 버튼 자리: 첫 질문은 [이전]이 없고 막대에는 상태 한 줄과 (다 정했을 때만) 주 버튼이 있다. 막대 전체가 화면 안
        await expectVisibleNow(page, page.locator('.stage-left > .action-bar'), `${q.id} 아래 막대`, false);
        const answer = answers[q.id] ?? q.options?.find((o) => o.isUnknown === true)?.id;
        const label = q.options?.find((o) => o.id === answer)?.label ?? '';
        await page.locator('.q').getByRole('button', { name: label, exact: true }).click();
        await expect(page.locator('#q-title')).not.toHaveText(title);
      }
      await expectVisibleNow(page, page.locator('#free-line'), '한 줄 칸');
      await expectVisibleNow(page, page.locator('.action-bar .q-go'), '주 버튼 [도구 고르러 가기]', false);
    });

    test('도구 고르기: 칸 제목·도구 줄·주 버튼', async ({ page }) => {
      const g = golden('case-01');
      await open(page, '/waypoints', { answers: g.answers, cart: [] });
      await expectTop(page);
      await expectVisibleNow(page, page.locator('#w-slot h2').first(), '칸 제목');
      const rows = page.locator('#w-slot > .w-list > li > :is(.list-row, .custom-answer > .list-row)');
      for (const [i, o] of (await firstOptions(rows, size.options)).entries()) await expectVisibleNow(page, o, `도구 ${i + 1}`);
      await expectVisibleNow(page, page.locator('.action-bar .btn-primary').first(), '주 버튼', false);
    });

    test('도구끼리 맞춰 보기: 제목·막힌 곳의 버튼·주 버튼', async ({ page }) => {
      await open(page, '/check', golden('case-04'));
      await expectTop(page);
      await expectVisibleNow(page, page.locator('.check h1'), 'H1');
      await expectVisibleNow(page, page.locator('#ck-jams'), '막힌 곳 제목');
      const buttons = page.locator('.ck-jam').first().locator('.ck-pair > *');
      for (const [i, o] of (await firstOptions(buttons, size.options)).entries()) await expectVisibleNow(page, o, `막힌 곳 버튼 ${i + 1}`);
      await expectVisibleNow(page, page.locator('.action-bar .btn-issue'), '주 버튼', false);
    });

    test('설계도 받기: 제목·칸 고르개 넷·주 버튼', async ({ page }) => {
      const g = golden('case-01');
      await open(page, '/arrival', { answers: g.answers, cart: g.cart });
      await expectTop(page);
      await expectVisibleNow(page, page.locator('#receipt-title'), 'H1');
      const tabs = page.locator('.ar-seg [role="tab"]');
      await expect(tabs).toHaveCount(4);
      if (size.width >= 1024) for (let i = 0; i < 4; i++) await expectVisibleNow(page, tabs.nth(i), `칸 ${i + 1}`);
      await expectVisibleNow(page, page.locator('.action-bar .ar-go'), '주 버튼', false);
    });
  });
}

test.describe('머리줄과 두 칸 격자 1440×900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('사전 버튼은 단계 화면·홈·둘러보는 곳에서 같은 자리이고, 단계 줄은 머리줄 가운데에 있다', async ({ page }) => {
    const spots: { route: string; x: number; y: number }[] = [];
    for (const route of ['/', '/destination', '/waypoints', '/tools', '/terms']) {
      await page.goto(route);
      await islandsReady(page);
      const box = await page.locator('.topbar .dict-btn').boundingBox();
      expect(box).not.toBeNull();
      if (box) spots.push({ route, x: Math.round(box.x), y: Math.round(box.y) });
    }
    for (const s of spots) expect(s, s.route).toMatchObject({ x: spots[0]?.x, y: spots[0]?.y });
    await page.goto('/destination');
    const rail = await page.locator('.topbar .rail-wrap').boundingBox();
    const dict = await page.locator('.topbar .dict-btn').boundingBox();
    expect(rail && dict && rail.y < dict.y + dict.height && rail.x + rail.width <= dict.x).toBe(true);
  });

  test('단계 화면은 두 칸: 왼쪽 420~560, 오른쪽 설계도 창(#blueprint-pane)은 sticky이고 비어 있지 않다', async ({ page }) => {
    const g = golden('case-01');
    await open(page, '/waypoints', { answers: g.answers, cart: g.cart.slice(0, 1) });
    const left = await page.locator('.stage-left').boundingBox();
    const pane = page.locator('#blueprint-pane');
    const right = await pane.boundingBox();
    expect(left && left.width >= 420 && left.width <= 561).toBe(true);
    expect(left && right && right.x > left.x + left.width).toBe(true);
    expect(await pane.evaluate((el) => getComputedStyle(el).position)).toBe('sticky');
    await expect(pane.locator('.bp-row')).not.toHaveCount(0);
    await expect(pane.locator('.bp-row.is-picked')).toHaveCount(1);
    // 아래 막대는 화면 전체 폭이 아니라 왼쪽 칸 안
    const bar = await page.locator('.action-bar').boundingBox();
    expect(bar && left && bar.width <= left.width + 1).toBe(true);
  });

  test('둘러보는 곳은 카드 격자(한 줄에 여럿)이고 가로로 넘치지 않는다', async ({ page }) => {
    await page.goto('/tools');
    await islandsReady(page);
    const cards = page.locator('.tool-list > li');
    const a = await cards.nth(0).boundingBox();
    const b = await cards.nth(1).boundingBox();
    expect(a && b && Math.abs(a.y - b.y) < 2 && b.x > a.x).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
