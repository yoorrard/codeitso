// 지도 장면 (W5a, brief 7절, D71): S1 홈 첫 방문 · S2 지도가 자라요 · S3 정하면 이어져요 · S4 교통 정보 · S8 연습 한 바퀴.
// 장면마다 화면 누르기·Esc로 바로 끝 상태가 되는지, [건너뛰기](지도 띠 오른쪽 위)는 1초 넘는 장면(S1, S4 들어오기)에만 뜨고
// 짧은 장면(S2·S3·S8)에는 뜨지 않는지(D71 검토 반영), 동작 줄이기(기기·사이트)에서 움직임이 없는지,
// 홈 장면은 한 번만(본 기록) 돌고, 조용히 모시기에서는 끝 모습만 보이는지 본다.
// 지도 장면(S2~S4·S8)은 짧아서(0.4~1.3초) 시험이 누르기 전에 끝나 버리지 않게, Web Animations를 20배 느리게 돌린다(slowMotion).
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { golden, islandsReady, longAnimations } from './helpers.ts';

type Skip = 'tap' | 'esc' | 'button';
const SKIPS: Skip[] = ['tap', 'esc', 'button'];
/** 1초 안쪽 장면: [건너뛰기]가 뜨지 않으니 화면 누르기·Esc로만 */
const SHORT: Skip[] = ['tap', 'esc'];
const c1 = golden('case-01');
// 막힌 곳이 하나 남는 사례 (키 노출 충돌, 배포 칸. D101 뒤로 case-04의 개인정보는 주의라 막지 않는다)
const c4 = golden('case-09');

/** 저장 값을 처음 한 번만 심는다 (같은 탭에서 다시 불러와도 덮어쓰지 않는다) */
async function seed(page: Page, items: Record<string, unknown>): Promise<void> {
  await page.addInitScript((kv) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    for (const [k, v] of Object.entries(kv)) localStorage.setItem(k, JSON.stringify(v));
  }, items);
}

/** 홈 장면을 이미 본 손님 (다른 장면만 보려고) */
const SEEN = { 'cc:seen:v1': { scenes: ['home'] } };
const session = (s: { answers: Record<string, string>; cart: string[] }) => ({ 'cc:session:v1': { kept: [], deferred: [], ...s } });

/** element.animate로 만든 애니메이션을 20배 느리게 (CSS 장면 S1은 그대로) */
async function slowMotion(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) {
      const a = animate.apply(this, args);
      a.playbackRate = 0.05;
      return a;
    };
  });
}

/** 아직 끝나지 않은 애니메이션 수 (도는 것 + 멈춘 것) */
const unfinished = (page: Page): Promise<number> => page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'paused').length);

const skipButton = (page: Page) => page.locator('.map-band .map-skip');

/** 장면이 도는 중이다: 끝나지 않은 애니메이션이 있고, 1초 넘는 장면이면 [건너뛰기]가 보인다(짧은 장면이면 뜨지 않는다) */
async function running(page: Page, long = true): Promise<void> {
  expect(await unfinished(page)).toBeGreaterThan(0);
  if (long) await expect(skipButton(page)).toBeVisible();
  else await expect(skipButton(page)).toBeHidden();
}

/** 붙박이 아래 막대의 버튼을 그 자리에서 누른다 (locator.click은 막대를 문서 흐름 끝으로 보고 페이지를 굴린다) */
async function press(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${selector} 없음`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function skip(page: Page, how: Skip): Promise<void> {
  if (how === 'tap') await page.locator('.map-band').click({ position: { x: 12, y: 12 }, force: true });
  else if (how === 'esc') await page.keyboard.press('Escape');
  else await skipButton(page).click();
  // 끝 상태: 도는 애니메이션이 없고 [건너뛰기]도 거둔다
  await expect.poll(() => unfinished(page)).toBe(0);
  await expect(skipButton(page)).toBeHidden();
}

test.describe('S1 홈 첫 방문', () => {
  for (const how of SKIPS) {
    test(`처음 온 사람에게 장면이 돌고, ${how}로 바로 끝난다`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('html')).toHaveAttribute('data-intro', 'play');
      // CSS 장면(1.5초)이 시험 도중 저절로 끝나지 않게 느리게
      await page.evaluate(() => document.getAnimations().forEach((a) => (a.playbackRate = 0.05)));
      await islandsReady(page);
      await running(page);
      await skip(page, how);
      // 차는 출발 위 자기 자리 (이동 경로는 장면 안에만)
      await expect(page.locator('.is-home .mb-car')).toHaveCSS('offset-path', 'none');
    });
  }

  test('본 기록이 있으면 다시 돌지 않는다', async ({ page }) => {
    await page.goto('/');
    await islandsReady(page);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('cc:seen:v1'))).toContain('home');
    await page.reload();
    await islandsReady(page);
    await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
    expect(await longAnimations(page)).toEqual([]);
    await expect(skipButton(page)).toBeHidden();
  });

  test('조용히 모시기: 끝 모습을 짧게 비치기만 한다 (움직임·건너뛰기 없음)', async ({ page }) => {
    await seed(page, { 'cc:prefs:v1': { quiet: true } });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-intro', 'still');
    await islandsReady(page);
    expect(await longAnimations(page)).toEqual([]);
    await expect(skipButton(page)).toBeHidden();
    await expect(page.locator('.is-home .mb-car')).toBeVisible();
  });
});

test.describe('S2 지도가 자라요 (만들 앱 정하기)', () => {
  for (const how of SHORT) {
    test(`답하면 지도가 자라고, ${how}로 바로 끝난다`, async ({ page }) => {
      await seed(page, SEEN);
      await slowMotion(page);
      await page.goto('/destination');
      await islandsReady(page);
      // 첫 질문(앱 종류)에 답하면 빈 터에 청사진 윤곽이 비친다
      await page.locator('.q .pick-tiles button').first().click();
      await running(page, false);
      await skip(page, how);
      await expect(page.locator('.map-band .mb-bp')).toHaveCSS('opacity', '1');
    });
  }
});

test.describe('S3 정하면 이어져요 (도구 고르기)', () => {
  for (const how of SHORT) {
    test(`[정하기]를 누르면 마디가 채워지고 길이 이어지며, ${how}로 바로 끝난다`, async ({ page }) => {
      await seed(page, { ...SEEN, ...session({ answers: c1.answers, cart: [] }) });
      await slowMotion(page);
      await page.goto('/waypoints');
      await islandsReady(page);
      await page.locator('.action-bar button.w-save').click();
      await running(page, false);
      await skip(page, how);
      await expect(page.locator('.map-band .mb-node.is-picked')).toHaveCount(1);
      // 날던 그림과 밑에 깐 '전' 마디는 남지 않는다
      await expect(page.locator('body > .list-tile')).toHaveCount(0);
      await expect(page.locator('.map-band .mb-fx-n > *')).toHaveCount(0);
    });
  }
});

test.describe('S4 교통 정보 (도구끼리 맞춰 보기)', () => {
  for (const how of SKIPS) {
    test(`들어오면 교통 색이 덮이고 막힌 길이 진해지며, ${how}로 바로 끝난다`, async ({ page }) => {
      await seed(page, { ...SEEN, ...session(c4) });
      await slowMotion(page);
      await page.goto('/check');
      await islandsReady(page);
      await running(page);
      await skip(page, how);
      await expect(page.locator('.map-band .mb-road.is-jam')).toHaveCSS('opacity', '1');
    });
  }

  test('그대로 가면 노랑 + 물음표, 다 풀리면 청록 대시가 훑고 주 버튼이 켜진다 (건너뛰면 바로)', async ({ page }) => {
    await seed(page, { ...SEEN, ...session(c4) });
    await slowMotion(page);
    await page.goto('/check');
    await islandsReady(page);
    await skip(page, 'esc');
    await page.locator('.ck-jam .ck-pair > button').click();
    await running(page);
    await expect(page.locator('.map-band .mb-sweep')).toHaveCount(1);
    await skip(page, 'button');
    await expect(page.locator('.map-band .mb-sweep')).toHaveCount(0);
    await expect(page.locator('.map-band .mb-road.is-slow')).toHaveCount(1);
    await expect(page.locator('.action-bar .btn-issue')).toHaveCSS('opacity', '1');
  });

  test('도구 고르기에서 고치고 돌아오면 빨강이 걷히고 초록이 그려진다 (지난번 막힌 마디를 적어 둔다)', async ({ page }) => {
    await seed(page, { ...SEEN, ...session(c1), 'cc:meta:v1': { sent: [], checkJams: ['slot.host'] } });
    await slowMotion(page);
    await page.goto('/check');
    await islandsReady(page);
    await running(page);
    // 밑에 깐 빨간 길(걷히는 중)과 초록 길을 그리는 가림막
    await expect(page.locator('.map-band .mb-fx-r .mb-road.is-jam')).toHaveCount(1);
    await expect(page.locator('.map-band .mb-fx-r mask')).toHaveCount(1);
    await skip(page, 'tap');
    await expect(page.locator('.map-band .mb-fx-r > *')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cc:meta:v1') ?? '{}').checkJams ?? [])).toEqual([]);
  });
});

test.describe('S8 연습 한 바퀴 (내 AI 써 보기)', () => {
  for (const how of SHORT) {
    test(`[다 했어요]를 누르면 차가 고리를 돌고 고리가 채워지며, ${how}로 바로 끝난다`, async ({ page }) => {
      await seed(page, SEEN);
      await slowMotion(page);
      await page.goto('/test-drive');
      await islandsReady(page);
      // 지도 띠가 보이는 채로 누른다 (화면 밖이면 움직이지 않는다: 아래 시험)
      await press(page, '.action-bar button.lesson-go');
      await running(page, false);
      await skip(page, how);
      await expect(page.locator('.map-band .mb-ring')).toBeVisible();
      await expect(page.locator('.action-bar a.lesson-go')).toBeVisible();
    });
  }

  test('지도 띠가 화면 밖이면 맨 위로 굴리지 않고 바로 마친 모습 (S3·S9와 같은 규칙)', async ({ page }) => {
    await seed(page, SEEN);
    await slowMotion(page);
    await page.goto('/test-drive');
    await islandsReady(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const y = await page.evaluate(() => window.scrollY);
    expect(y).toBeGreaterThan(300);
    await press(page, '.action-bar button.lesson-go');
    await expect(page.locator('.action-bar a.lesson-go')).toBeVisible();
    // 맨 위로 굴리지 않는다 (H1 아래 '건너뛰기' 글 버튼을 거두면서 생기는 스크롤 고정 보정 정도만)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y - 100);
    // 지도 띠 안에서 도는 것이 없다 (차·고리·점 모두 그대로 마친 모습)
    expect(await page.evaluate(() => document.querySelector('.map-band')?.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)).toBe(0);
    await expect(skipButton(page)).toBeHidden();
  });
});

for (const mode of ['기기 설정', '사이트 설정'] as const) {
  test.describe(`동작 줄이기(${mode}): 장면이 움직이지 않고 끝 모습만`, () => {
    test.beforeEach(async ({ page }) => {
      if (mode === '기기 설정') await page.emulateMedia({ reducedMotion: 'reduce' });
    });
    const prefs = mode === '사이트 설정' ? { 'cc:prefs:v1': { motion: 'reduce' } } : {};
    const still = async (page: Page): Promise<void> => {
      expect(await longAnimations(page)).toEqual([]);
      await expect(skipButton(page)).toBeHidden();
    };

    test('S1 홈', async ({ page }) => {
      await seed(page, prefs);
      await page.goto('/');
      await islandsReady(page);
      await still(page);
      await expect(page.locator('.is-home .mb-car')).toBeVisible();
    });

    test('S2 만들 앱 정하기', async ({ page }) => {
      await seed(page, { ...prefs, ...SEEN });
      await page.goto('/destination');
      await islandsReady(page);
      await page.locator('.q .pick-tiles button').first().click();
      await expect(page.locator('.map-band .mb-bp')).toHaveCount(1);
      await still(page);
    });

    test('S3 도구 고르기', async ({ page }) => {
      await seed(page, { ...prefs, ...SEEN, ...session({ answers: c1.answers, cart: [] }) });
      await page.goto('/waypoints');
      await islandsReady(page);
      await page.locator('.action-bar button.w-save').click();
      await expect(page.locator('.map-band .mb-node.is-picked')).toHaveCount(1);
      await still(page);
    });

    test('S4 도구끼리 맞춰 보기', async ({ page }) => {
      await seed(page, { ...prefs, ...SEEN, ...session(c4) });
      await page.goto('/check');
      await islandsReady(page);
      await still(page);
      await page.locator('.ck-jam .ck-pair > button').click();
      await expect(page.locator('.map-band .mb-road.is-slow')).toHaveCount(1);
      await still(page);
      await expect(page.locator('.map-band .mb-sweep')).toHaveCount(0);
    });

    test('S8 내 AI 써 보기: 고리가 바로 채워진다', async ({ page }) => {
      await seed(page, { ...prefs, ...SEEN });
      await page.goto('/test-drive');
      await islandsReady(page);
      await page.locator('.action-bar button.lesson-go').click();
      await expect(page.locator('.map-band .mb-ring')).toBeVisible();
      await still(page);
    });
  });
}
