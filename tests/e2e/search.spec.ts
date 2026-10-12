// 사전과 진열대 검색 (T15·T20): 완성 확인 질문 네 개가 맞는 항목을 맨 위에 보여 주고, 진열대 검색이 거르기와 함께 걸린다.
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { islandsReady } from './helpers.ts';

const CASES: { q: string; top: string; kind: 'error' | 'item' }[] = [
  { q: '환경변수', top: '환경 변수', kind: 'item' },
  { q: 'API키는', top: 'API 키', kind: 'item' },
  { q: 'CORS 에러가 났어요', top: '브라우저가 요청을 막았어요 (CORS)', kind: 'error' },
  { q: 'zsh: command not found: npm', top: '명령을 찾을 수 없어요', kind: 'error' },
];

for (const c of CASES) {
  test(`사전: "${c.q}"는 "${c.top}"이 맨 위`, async ({ page }) => {
    await page.goto('/dictionary');
    await islandsReady(page);
    await page.locator('#dict-q').fill(c.q);
    const first = c.kind === 'error' ? page.locator('.dict .error-card h3').first() : page.locator('.dict-list .dict-item').first().locator('a, summary').first();
    await expect(first).toHaveText(c.top);
  });
}

test('사전 옆 창: 아래 막대의 사전을 누르면 열리고 Esc로 닫히며 초점이 돌아온다', async ({ page }) => {
  await page.goto('/shop');
  await islandsReady(page);
  const button = page.locator('.action-bar .dict-btn');
  await button.click();
  const sheet = page.locator('dialog[open]');
  await expect(sheet).toBeVisible();
  await expect(page.locator('#dict-q')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('진열대: 검색어와 분야 거르기가 함께 걸리고, 0개면 모두 보기로 돌아간다', async ({ page }) => {
  await page.goto('/shelf');
  await islandsReady(page);
  const visible = page.locator('[data-shelf-item]:not([hidden])');
  const total = await visible.count();
  await page.locator('#shelf-q').fill('급식');
  await expect(visible).toHaveCount(1);
  await expect(page.locator('.shelf-count')).toHaveText(fill(ko.shelf.count, { n: 1 }));
  await page.getByRole('group', { name: ko.shelf.domain }).getByRole('button', { name: /날씨/ }).click();
  await expect(visible).toHaveCount(0);
  await page.getByRole('button', { name: ko.shelf.reset }).click();
  await expect(visible).toHaveCount(total);
  await expect(page.locator('#shelf-q')).toHaveValue('');
});
