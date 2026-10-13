// 장면 W5b (brief 7절, D71): S5+S6 출발 → 도착 · S7 단계 이동 · S9 용어 카드 · 조용히 모시기.
// 출발 → 도착은 도구끼리 맞춰 보기의 [설계도 받으러 출발하기]로 처음 왔을 때만 돈다. 화면 누르기·Esc·[건너뛰기]로 바로 끝 상태
// (차는 빈 터 앞, 영수증과 도장 다 나옴, 도착 알림). 동작 줄이기(기기·사이트)와 조용히 모시기는 끝 모습만 보인다.
// 검토 반영(D71): 차는 도구끼리 맞춰 보기에서 선 자리에서 떠나고, 장면 동안 지도 띠 아래 자르기를 풀고 시트는 inert,
// 장면 모듈을 받기 전에 건너뛰면 다시 돌지 않고, 영수증 종이는 화면에 보일 때 뽑는다. 문서 간 전환(S7)은 꺼 두었다.
// 장면이 시험 도중 저절로 끝나지 않게 페이지의 애니메이션 시계를 CDP로 느리게 돌린다(CSS·WAAPI·View Transitions 모두).
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { golden, hydrated, islandsReady, longAnimations } from './helpers.ts';

type Skip = 'tap' | 'esc' | 'button';
const SKIPS: Skip[] = ['tap', 'esc', 'button'];
const c1 = golden('case-01');
const concepts = JSON.parse(readFileSync('data/concepts.json', 'utf8')) as { concepts: { id: string; quiz: { answer: number }[] }[] };

/** 저장 값을 처음 한 번만 심는다 (같은 탭에서 옮겨 다녀도 덮어쓰지 않는다) */
async function seed(page: Page, items: Record<string, unknown>): Promise<void> {
  await page.addInitScript((kv) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, JSON.stringify(v));
  }, items);
}

const SEEN = { 'cc:seen:v1': { scenes: ['home', 'glossary-hint'] } };
const session = (s: { answers: Record<string, string>; cart: string[] }) => ({ 'cc:session:v1': { kept: [], deferred: [], ...s } });

/** 페이지의 애니메이션 시계를 느리게 (이 탭에서 이어지는 페이지에도) */
async function slow(page: Page, rate = 0.05): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: rate });
}

const unfinished = (page: Page): Promise<number> => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'paused').length);
const skipButton = (page: Page) => page.locator('.map-band .map-skip');
const seen = (page: Page): Promise<string> => page.evaluate(() => localStorage.getItem('cc:seen:v1') ?? '');

/** 도구끼리 맞춰 보기에서 [설계도 받으러 출발하기] → 설계도 받기 */
async function depart(page: Page): Promise<void> {
  await page.goto('/check');
  await islandsReady(page);
  await page.keyboard.press('Escape');
  await page.locator('.action-bar .btn-issue').click();
  await page.waitForURL(/\/arrival$/);
  await islandsReady(page);
}

/** 도착한 끝 상태: 도는 애니메이션 없음, [건너뛰기] 거둠, 차는 제자리, 영수증 다 나옴, 시트 제자리, 도착 알림, 본 기록 */
async function arrivedEnd(page: Page, live: string = ko.dispatch.arrival): Promise<void> {
  await expect.poll(() => unfinished(page)).toBe(0);
  await expect(skipButton(page)).toBeHidden();
  await expect(page.locator('.receipt-scene')).toHaveAttribute('data-printed', '');
  await expect(page.locator('.receipt-scene')).not.toHaveAttribute('data-print', /.*/);
  await expect(page.locator('.map-band')).not.toHaveAttribute('data-driving', /.*/);
  expect(await page.evaluate(() => document.querySelector<HTMLElement>('.content-sheet.on-map')?.inert)).toBe(false);
  await expect(page.locator('.map-band .mb-car')).toHaveCSS('offset-path', 'none');
  await expect(page.locator('.map-band .mb-beam')).toHaveCount(0);
  await expect(page.locator('.map-band .mb-lot')).toHaveClass(/is-drawn/);
  await expect(page.locator('.content-sheet.on-map')).toHaveCSS('transform', 'none');
  await expect(page.locator('#cc-live')).toContainText(live);
  await expect.poll(() => seen(page)).toContain('arrival');
}

/** 차가 지금 선 거리 (offset-distance, 지도 단위). 장면 밖이면 0 */
const carDistance = (page: Page): Promise<number> => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.map-band .mb-car') as Element).offsetDistance) || 0);

test.describe('S5+S6 출발 → 도착', () => {
  for (const how of SKIPS) {
    test(`[설계도 받으러 출발하기]로 오면 장면이 돌고, ${how}로 바로 끝 상태가 된다`, async ({ page }) => {
      await seed(page, { ...SEEN, ...session(c1) });
      await slow(page);
      await depart(page);
      await expect(page.locator('html')).toHaveAttribute('data-depart', 'run');
      await expect(skipButton(page)).toBeVisible();
      expect(await unfinished(page)).toBeGreaterThan(0);
      // 차는 출발로 튀지 않고 도구끼리 맞춰 보기에서 선 자리(빈 터 바로 앞 마디 뒤)에서 떠난다
      expect(await carDistance(page)).toBeGreaterThan(300);
      // 장면 동안 띠 아래 자르기를 풀고(땅이 화면을 채운다), 내려 둔 시트에는 초점이 들어가지 않는다
      await expect(page.locator('.map-band')).toHaveAttribute('data-driving', '');
      expect(await page.evaluate(() => document.querySelector<HTMLElement>('.content-sheet.on-map')?.inert)).toBe(true);
      // 장면 중에도 주 버튼은 눌린다 (막대는 장면 밖)
      await expect(page.locator('.action-bar .ar-go')).toBeEnabled();
      if (how === 'tap') await page.locator('.map-band').click({ position: { x: 12, y: 12 }, force: true });
      else if (how === 'esc') await page.keyboard.press('Escape');
      else await skipButton(page).click();
      await arrivedEnd(page);
    });
  }

  test('장면 동안 Tab을 누르면 장면이 끝나고 시트가 열려, 키보드로 칸 고르개에 닿는다 (WCAG 2.1.1)', async ({ page }) => {
    await seed(page, { ...SEEN, ...session(c1) });
    await slow(page);
    await depart(page);
    expect(await page.evaluate(() => document.querySelector<HTMLElement>('.content-sheet.on-map')?.inert)).toBe(true);
    await page.keyboard.press('Tab');
    await arrivedEnd(page);
    for (let i = 0; i < 40; i++) {
      if (await page.evaluate(() => document.activeElement?.matches('[role="tab"][aria-selected="true"]') ?? false)) break;
      await page.keyboard.press('Tab');
    }
    await expect(page.locator('[role="tab"][aria-selected="true"]')).toBeFocused();
  });

  test('처음 한 번만: 다시 출발해도 장면 없이 끝 모습', async ({ page }) => {
    await seed(page, { ...SEEN, ...session(c1) });
    await slow(page);
    await depart(page);
    await page.keyboard.press('Escape');
    await arrivedEnd(page);
    // 두 번째는 제 빠르기로 (단계 이동 전환·기사 메시지 같은 짧은 모션은 장면이 아니다: 300 이상만 본다)
    await slow(page, 1);
    await depart(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-depart', /.*/);
    await expect.poll(() => longAnimations(page, 300)).toEqual([]);
    await expect(skipButton(page)).toBeHidden();
    await expect(page.locator('.receipt-scene')).toHaveAttribute('data-printed', '');
  });

  test('장면 모듈을 받기 전에 Esc를 누르면 끝 모습 그대로이고, 장면이 처음부터 다시 돌지 않는다', async ({ page }) => {
    await seed(page, { ...SEEN, ...session(c1) });
    // 느린 망: 출발 → 도착 장면 묶음을 늦게 준다
    await page.route('**/_astro/arrive.*.js', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto('/check');
    await islandsReady(page);
    await page.keyboard.press('Escape');
    await page.locator('.action-bar .btn-issue').click();
    await page.waitForURL(/\/arrival$/);
    await expect(page.locator('html')).toHaveAttribute('data-depart', 'play');
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('data-depart', 'skip');
    await islandsReady(page);
    // 묶음이 온 뒤에도 그대로 (run으로 덮어쓰지 않는다)
    await page.waitForTimeout(2000);
    await expect(page.locator('html')).toHaveAttribute('data-depart', 'skip');
    expect(await longAnimations(page)).toEqual([]);
    await arrivedEnd(page);
  });

  test('영수증 종이가 화면에 보이면 장면 시계대로 출력이 이어지고, [건너뛰기]는 출력 끝까지 남는다', async ({ page }) => {
    // 키가 큰 화면: 시트가 올라왔을 때 종이가 보인다
    await page.setViewportSize({ width: 360, height: 1600 });
    await seed(page, { ...SEEN, ...session(c1) });
    await depart(page);
    await expect(page.locator('.receipt-scene')).toHaveAttribute('data-print', 'wait');
    // 2300에 출력이 시작된다 (가림 표시를 뗀다). 그때 [건너뛰기]는 아직 있다 (3000까지). 그림마다 본다 (expect는 1초 간격으로 늦어진다)
    const shown = await page.waitForFunction(
      () => document.querySelector('.receipt-scene')?.hasAttribute('data-print') === false && !(document.querySelector('.map-band .map-skip') as HTMLElement).hidden,
      undefined,
      { polling: 'raf', timeout: 5000 },
    );
    expect(await shown.jsonValue()).toBe(true);
    await arrivedEnd(page);
  });

  test('종이가 화면 밖이면 장면은 시트가 올라온 때 끝나고, 종이를 처음 볼 때 뽑는다', async ({ page }) => {
    await seed(page, { ...SEEN, ...session(c1) });
    await depart(page);
    // 장면이 끝나도(2300) 종이는 가려 둔 채 기다린다. [건너뛰기]는 거둔다
    await expect(skipButton(page)).toBeVisible();
    await expect(skipButton(page)).toBeHidden({ timeout: 5000 });
    await expect(page.locator('.map-band')).not.toHaveAttribute('data-driving', /.*/);
    await page.waitForTimeout(300);
    await expect(page.locator('.receipt-scene')).toHaveAttribute('data-print', 'wait');
    await expect(page.locator('#cc-live')).toContainText(ko.dispatch.arrival);
    // 굴려서 종이가 보이면 출력이 돌고 끝난다 (굴리기는 건너뛰기가 아니다)
    await page.mouse.wheel(0, 500);
    await expect(page.locator('.receipt-scene')).not.toHaveAttribute('data-print', /.*/);
    await expect(page.locator('.receipt-scene')).toHaveAttribute('data-printed', '');
  });

  test('처음 보는 내 영수증을 바로 열면 출력(S6)만: 종이가 보일 때 뽑고(0.7초라 [건너뛰기]는 없다) Esc면 바로 끝난다', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 1600 });
    await seed(page, { ...SEEN, ...session(c1), 'cc:meta:v1': { sent: [], issued: true } });
    await slow(page);
    await page.goto('/arrival');
    await islandsReady(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-depart', /.*/);
    await expect(page.locator('.receipt-scene')).not.toHaveAttribute('data-print', /.*/);
    expect(await unfinished(page)).toBeGreaterThan(0);
    await expect(skipButton(page)).toBeHidden();
    await expect(page.locator('#cc-live')).toContainText(ko.dispatch.arrival);
    await page.keyboard.press('Escape');
    await expect.poll(() => unfinished(page)).toBe(0);
    await expect(page.locator('.receipt-scene')).toHaveAttribute('data-printed', '');
  });

  for (const mode of ['기기 설정', '사이트 설정', '조용히 모시기'] as const) {
    test(`${mode}: 끝 모습을 바로 (움직임·[건너뛰기] 없음, 알림은 그대로)`, async ({ page }) => {
      if (mode === '기기 설정') await page.emulateMedia({ reducedMotion: 'reduce' });
      const prefs = mode === '사이트 설정' ? { 'cc:prefs:v1': { motion: 'reduce' } } : mode === '조용히 모시기' ? { 'cc:prefs:v1': { quiet: true } } : {};
      await seed(page, { ...SEEN, ...session(c1), ...prefs });
      await depart(page);
      await expect(page.locator('html')).toHaveAttribute('data-depart', 'still');
      // 조용히 모시기는 작은 모션(단계 줄 막대 채움 200 같은 것)을 남긴다: 큰 장면이 없는지만 본다
      expect(await longAnimations(page, mode === '조용히 모시기' ? 300 : 150)).toEqual([]);
      await expect(skipButton(page)).toBeHidden();
      // 조용히 모시기는 기사 메시지를 숨기므로 화면 낭독기에는 보이는 상태 한 줄과 같은 말을 알린다
      await arrivedEnd(page, mode === '조용히 모시기' ? ko.progress.status.issued : ko.dispatch.arrival);
      // 조용히 모시기는 사건 기사 메시지를 내지 않는다
      if (mode === '조용히 모시기') await expect(page.locator('.dispatch-note')).toHaveCount(0);
      else await expect(page.locator('.ar-note')).toBeVisible();
    });
  }
});

test.describe('조용히 모시기: 사건 기사 메시지를 숨긴다', () => {
  test('도구끼리 맞춰 보기의 다 풀림 메시지가 없다 (작은 모션 S4는 그대로)', async ({ page }) => {
    await seed(page, { ...SEEN, ...session(c1), 'cc:prefs:v1': { quiet: true } });
    await page.goto('/check');
    await islandsReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-quiet', '');
    await expect(page.locator('.action-bar .btn-issue')).toBeVisible();
    await expect(page.locator('.dispatch-note')).toHaveCount(0);
  });

  test('어려운 말 풀이의 처음 안내가 없다', async ({ page }) => {
    await seed(page, { 'cc:seen:v1': { scenes: ['home'] }, 'cc:prefs:v1': { quiet: true } });
    await page.goto('/tools/supabase');
    await islandsReady(page);
    await expect(page.locator('html')).toHaveAttribute('data-terms', '');
    await expect(page.locator('.term-hint')).toHaveCount(0);
  });
});

test.describe('S7 단계 이동', () => {
  /** 새 화면에서 문서 간 전환이 있었는지와 오류를 적는다 */
  async function watch(page: Page): Promise<string[]> {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.addInitScript(() => {
      addEventListener('pagereveal', (e) => {
        const vt = (e as Event & { viewTransition?: ViewTransition | null }).viewTransition;
        sessionStorage.setItem(`vt:${location.pathname}`, vt ? 'yes' : 'no');
        if (vt) void vt.finished.then(() => sessionStorage.setItem(`vt-done:${location.pathname}`, 'yes')).catch(() => undefined);
      });
    });
    return errors;
  }

  test('문서 간 전환은 꺼 두었다(붙기 전 지도와 섞이지 않게). 오류가 없고, 새 화면에서 마친 단계가 ✓, 막대 칸이 한 번 채워진다', async ({ page }) => {
    const errors = await watch(page);
    await seed(page, { ...SEEN, ...session({ answers: c1.answers, cart: [] }) });
    await page.goto('/destination');
    await islandsReady(page);
    await page.locator('.action-bar a.q-go').click();
    await page.waitForURL(/\/waypoints$/);
    await islandsReady(page);
    // 전환 객체가 없다 (D71 검토 반영: 다시 켜는 조건은 frame.css)
    expect(await page.evaluate(() => sessionStorage.getItem('vt:/waypoints'))).toBe('no');
    await expect(page.locator('.rail-bars .bar.done.just-done')).toHaveCount(1);
    await expect(page.locator('.rail-list .step-dot.just-done')).toHaveCount(1);
    await expect.poll(() => seen(page)).toContain('done:destination');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // 다시 열면 이미 본 ✓라 채우지 않는다
    await page.reload();
    await islandsReady(page);
    await expect(page.locator('.rail .just-done')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('동작 줄이기(사이트 설정)에서도 전환이 없다', async ({ page }) => {
    await watch(page);
    await seed(page, { ...SEEN, ...session({ answers: c1.answers, cart: [] }), 'cc:prefs:v1': { motion: 'reduce' } });
    await page.goto('/destination');
    await islandsReady(page);
    await page.locator('.action-bar a.q-go').click();
    await page.waitForURL(/\/waypoints$/);
    await islandsReady(page);
    // 건너뛴 전환은 바로 끝난다: 전환 그림 애니메이션이 남아 있지 않다
    const pseudo = await page.evaluate(() => document.getAnimations().filter((a) => String((a.effect as KeyframeEffect).pseudoElement ?? '').startsWith('::view-transition')).length);
    expect(pseudo).toBe(0);
    expect(await longAnimations(page)).toEqual([]);
  });
});

test.describe('S9 용어 카드 읽음·정답', () => {
  const api = concepts.concepts.find((c) => c.id === 'api');
  if (!api) throw new Error('api 용어 카드가 없다');

  test('[다 읽었어요]: 판이 읽음으로 칠해지고 막대에 \'20장 중 n장 읽음\'이 굴러간다. Esc면 바로 끝', async ({ page }) => {
    // 판과 아래 막대가 한 화면에 보이게 (판이 화면 밖이면 채움 없이 바로 칠한다)
    await page.setViewportSize({ width: 360, height: 2400 });
    await seed(page, SEEN);
    await slow(page);
    await page.goto('/terms/api');
    await islandsReady(page);
    await (await hydrated(page.locator('.action-bar .btn-primary'))).click();
    await expect(page.locator('.concept-art')).toHaveAttribute('data-state', 'read');
    await expect(page.locator('.concept-art')).toHaveAttribute('data-fill', '');
    // 옛 숫자가 위로 빠지는 중
    await expect(page.locator('.action-bar .term-count .sl-old')).toHaveCount(1);
    expect(await unfinished(page)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect.poll(() => unfinished(page)).toBe(0);
    await expect(page.locator('.action-bar .term-count .sl-old')).toHaveCount(0);
    await expect(page.locator('.action-bar .term-count')).toHaveText(fill(ko.study.readCount, { total: concepts.concepts.length, n: 1 }));
  });

  test('확인 문제를 다 맞히면 \'다 맞혔어요\' 고리 위로 청록 빛이 한 바퀴 돌고, 판에 고리가 선다', async ({ page }) => {
    await seed(page, SEEN);
    await slow(page);
    await page.goto('/terms/api');
    await islandsReady(page);
    const items = page.locator('.quiz-item');
    for (const [i, q] of api.quiz.entries()) await (await hydrated(items.nth(i).locator('.quiz-opt').nth(q.answer))).click();
    await expect(page.locator('.quiz-done')).toContainText(ko.study.solved);
    await expect(page.locator('.quiz-done .plate-run')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('.quiz-done .plate-run')).toHaveCount(0);
    await expect(page.locator('.concept-art')).toHaveAttribute('data-state', 'solved');
  });

  for (const mode of ['기기 설정', '사이트 설정'] as const) {
    test(`동작 줄이기(${mode}): 바로 바뀐다 (채움·빛 없음)`, async ({ page }) => {
      if (mode === '기기 설정') await page.emulateMedia({ reducedMotion: 'reduce' });
      await seed(page, { ...SEEN, ...(mode === '사이트 설정' ? { 'cc:prefs:v1': { motion: 'reduce' } } : {}) });
      await page.goto('/terms/api');
      await islandsReady(page);
      const items = page.locator('.quiz-item');
      for (const [i, q] of api.quiz.entries()) await (await hydrated(items.nth(i).locator('.quiz-opt').nth(q.answer))).click();
      await expect(page.locator('.quiz-done')).toBeVisible();
      await expect(page.locator('.plate-run')).toHaveCount(0);
      await (await hydrated(page.locator('.action-bar .btn-primary'))).click();
      await expect(page.locator('.action-bar .term-count')).toBeVisible();
      expect(await longAnimations(page)).toEqual([]);
      await expect(page.locator('.concept-art')).toHaveAttribute('data-state', 'solved');
    });
  }

  test('용어 카드 목록: 읽은 카드는 짙은 판, 다 맞힌 카드는 고리', async ({ page }) => {
    await seed(page, { ...SEEN, 'cc:study:v1': { api: { read: true, quiz: api.quiz.map((_, i) => i) }, json: { read: true, quiz: [] } } });
    await page.goto('/terms');
    await islandsReady(page);
    await expect(page.locator('.term-grid')).toHaveAttribute('data-ready', '');
    const plateOf = (id: string) => page.locator(`.term-tile:has([data-term-state="${id}"]) .term-plate`);
    await expect(plateOf('api')).toHaveAttribute('data-state', 'solved');
    await expect(plateOf('api')).toHaveCSS('outline-style', 'solid');
    await expect(plateOf('json')).toHaveAttribute('data-state', 'read');
    await expect(plateOf('cors')).not.toHaveAttribute('data-state', /.*/);
  });
});
