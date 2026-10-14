// 홈과 내 AI 써 보기 (brief 6.3·6.4, D70): 처음 온 사람과 다시 온 사람의 주 버튼(화면에 하나), '새로 만들 앱 정하기',
// 코스 줄 → 미리 보기 시트 → [이 코스로 출발] → 도구끼리 맞춰 보기, 저장된 진행을 덮을 때 묻기,
// 내 AI 써 보기를 키보드만으로 (건너뛰기 글 버튼에 닿음, [다 했어요] → [만들 앱 정하러 가기]).
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { golden, islandsReady, recipes } from './helpers.ts';

/** 보이는 주 버튼 수 (닫힌 시트 안의 것은 빼고). 모달이 열려 있으면 뒤 화면은 막혀 있으니 맨 위 모달 안만 센다 */
async function visiblePrimaries(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      Array.from((Array.from(document.querySelectorAll('dialog[open]')).pop() ?? document).querySelectorAll<HTMLElement>('.btn-primary')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      }).length,
  );
}

/** 저장된 진행을 처음 한 번만 심는다 (다음 페이지로 넘어가서 지운 것을 다시 심지 않게) */
async function seed(page: Page, session: unknown, meta?: unknown): Promise<void> {
  await page.addInitScript(
    ([s, m]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('cc:session:v1', JSON.stringify(s));
      if (m) localStorage.setItem('cc:meta:v1', JSON.stringify(m));
    },
    [session, meta] as const,
  );
}

const g1 = golden('case-01');
/** 만들 앱은 정했고 도구는 하나만 고름: 꼭 고를 것이 남아 도구 고르기로 이어 간다 */
const partial = { answers: g1.answers, cart: g1.cart.slice(0, 1), kept: [], deferred: [] };
const go = (page: Page) => page.locator('.home-go');

test('홈 처음 온 사람: 주 버튼은 [만들 앱 정하기] 하나, 묶음 목록에 새로 정하기 줄이 없다', async ({ page }) => {
  await page.goto('/');
  await islandsReady(page);
  await expect(go(page)).toHaveText(ko.home.build);
  await expect(go(page)).toHaveAttribute('href', '/destination');
  await expect(page.locator('.home-links > li')).toHaveCount(2);
  await expect(page.getByRole('button', { name: ko.home.fresh })).toHaveCount(0);
  expect(await visiblePrimaries(page)).toBe(1);
  // 지도는 없다 (v4 D96). 미리 짠 코스 카드 셋, 단계 이름 넷을 가르친다
  await expect(page.locator('svg.map-board, .map-band')).toHaveCount(0);
  await expect(page.locator('.course-card')).toHaveCount(3);
  for (const name of [ko.stages.destination, ko.stages.waypoints, ko.stages.check, ko.stages.arrival]) await expect(page.locator('.home-how')).toContainText(name);
});

test('홈 다시 온 사람: 꼭 고를 것이 남았으면 [이어서 가기] + 2/4 · 도구 고르기로 (도구를 하나 골랐어도)', async ({ page }) => {
  await seed(page, partial);
  await page.goto('/');
  await islandsReady(page);
  await expect(go(page)).toHaveAttribute('href', '/waypoints');
  await expect(go(page).locator('.home-go-name')).toHaveText(ko.home.continueGo);
  await expect(go(page).locator('.home-go-sub')).toHaveText(fill(ko.home.continueAt, { n: 2, stage: ko.stages.waypoints }));
  await expect(page.locator('.home-links > li').first()).toContainText(ko.home.fresh);
  expect(await visiblePrimaries(page)).toBe(1);
});

test('홈 다시 온 사람: 만들 앱을 정하는 중이면 몇 번째 질문인지와 함께 만들 앱 정하기로', async ({ page }) => {
  const answers = Object.fromEntries(Object.entries(g1.answers).slice(0, 2));
  await seed(page, { answers, cart: [], kept: [], deferred: [] });
  await page.goto('/');
  await islandsReady(page);
  await expect(go(page)).toHaveAttribute('href', '/destination');
  await expect(go(page).locator('.home-go-sub')).toContainText(`1/4 · ${ko.stages.destination}`);
});

test('홈 새로 만들 앱 정하기: 그만두면 그대로(초점 복귀), 비우면 빈 상태로 만들 앱 정하기', async ({ page }) => {
  await seed(page, partial);
  await page.goto('/');
  await islandsReady(page);
  const row = page.getByRole('button', { name: new RegExp(ko.home.fresh) });
  await row.click();
  const dialog = page.getByRole('dialog', { name: ko.home.freshTitle });
  await expect(dialog).toBeVisible();
  // 확인 대화 상자는 중립 + 위험 둘 (주 버튼 없음)
  expect(await visiblePrimaries(page)).toBe(0);
  await dialog.getByRole('button', { name: ko.home.freshNo }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeFocused();
  await row.click();
  await dialog.getByRole('button', { name: ko.home.freshYes }).click();
  await page.waitForURL(/\/destination$/);
  expect(await page.evaluate(() => localStorage.getItem('cc:session:v1'))).toBeNull();
});

test('홈 코스 줄 → 미리 보기 시트 → [이 코스로 출발] → 도구끼리 맞춰 보기', async ({ page }) => {
  const recipe = recipes[0];
  if (!recipe) throw new Error('코스가 없다');
  await page.goto('/');
  await islandsReady(page);
  await page.locator(`a[data-course="${recipe.id}"]`).click();
  const sheet = page.getByRole('dialog', { name: recipe.title });
  await expect(sheet).toBeVisible();
  expect(await visiblePrimaries(page)).toBe(1);
  await sheet.getByRole('button', { name: fill(ko.home.recipeGoLabel, { title: recipe.title }) }).click();
  await page.waitForURL(/\/check$/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('cc:session:v1') ?? '{}') as { freeText?: string });
  expect(saved.freeText).toBe(recipe.freeText);
});

test('홈 코스 시트: 키보드로 열고 Esc로 닫으면 줄로 초점이 돌아온다. 저장된 진행을 덮으면 먼저 묻는다', async ({ page }) => {
  const recipe = recipes[1];
  if (!recipe) throw new Error('코스가 없다');
  await seed(page, partial);
  await page.goto('/');
  await islandsReady(page);
  const row = page.locator(`a[data-course="${recipe.id}"]`);
  await row.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: recipe.title });
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(row).toBeFocused();
  await page.keyboard.press('Enter');
  await sheet.getByRole('button', { name: fill(ko.home.recipeGoLabel, { title: recipe.title }) }).click();
  const ask = page.getByRole('dialog', { name: ko.home.overwriteTitle });
  await expect(ask).toBeVisible();
  await ask.getByRole('button', { name: ko.home.overwriteYes }).click();
  await page.waitForURL(/\/check$/);
});

test('내 AI 써 보기 키보드만: 건너뛰기 글 버튼에 닿고, [다 했어요] → [만들 앱 정하러 가기]로 초점이 옮겨 간다', async ({ page }) => {
  await page.goto('/test-drive');
  await islandsReady(page);
  await expect(page.locator('h1')).toHaveText(ko.lesson.title);
  const skip = page.getByRole('link', { name: ko.lesson.skip });
  await expect(skip).not.toHaveClass(/btn-primary/);
  // 위에서부터 Tab으로 건너뛰기 글 버튼에 닿는다
  let reached = false;
  for (let i = 0; i < 20 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await skip.evaluate((el) => el === document.activeElement);
  }
  expect(reached).toBe(true);
  // 연습 셋은 세로 번호 단계, 단계마다 붙여 넣을 말 상자와 접기
  await expect(page.locator('.practice-step')).toHaveCount(3);
  await expect(page.locator('.practice-step .paste-body')).toHaveCount(3);
  await expect(page.locator('details.fold')).toHaveCount(3);
  expect(await visiblePrimaries(page)).toBe(1);
  const finish = page.locator('.action-bar').getByRole('button', { name: ko.lesson.finish });
  await finish.focus();
  await page.keyboard.press('Enter');
  const next = page.locator('.action-bar').getByRole('link', { name: ko.lesson.next });
  await expect(next).toBeFocused();
  await expect(page.locator('#cc-live')).toContainText(ko.lesson.finished);
  await expect(skip).toBeHidden();
  expect(await visiblePrimaries(page)).toBe(1);
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/destination$/);
});
