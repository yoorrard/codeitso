// 사전과 도구 모음 검색 (T15·T20, brief 6.9·6.12): 완성 확인 질문 네 개가 맞는 항목을 맨 위에 보여 주고, 도구 모음 검색이 거르기와 함께 걸린다.
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
    const first = c.kind === 'error' ? page.locator('.dict .error-card-title').first() : page.locator('.dict .dict-group .list-name').first();
    await expect(first).toHaveText(c.top);
  });
}

test('사전 시트: 키보드만으로 열고, 찾고, 결과로 가고, Esc로 닫으면 초점이 돌아온다', async ({ page }) => {
  await page.goto('/waypoints');
  await islandsReady(page);
  const button = page.locator('.topbar .dict-btn');
  await button.focus();
  await page.keyboard.press('Enter');
  const sheet = page.locator('dialog[open]');
  await expect(sheet).toBeVisible();
  await expect(page.locator('#dict-q')).toBeFocused();
  await page.keyboard.type('API 키');
  const first = sheet.locator('.dict-group .list-row').first();
  await expect(first).toContainText('API 키');
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('도구 모음: 검색어와 분야 거르기가 함께 걸리고, 0개면 모두 보기로 돌아간다', async ({ page }) => {
  await page.goto('/tools');
  await islandsReady(page);
  const visible = page.locator('[data-shelf-item]:not([hidden])');
  const total = await visible.count();
  await page.locator('#shelf-q').fill('급식');
  await expect(visible).toHaveCount(1);
  await expect(page.locator('.shelf-count')).toHaveText(fill(ko.shelf.count, { n: 1 }));
  // 분야는 칩 하나('분야 ⌄')가 여는 모달 시트에서 고른다 (brief 6.9). 고르면 시트가 닫히고 초점은 칩으로
  const chip = page.locator('.shelf-domain-chip');
  await chip.click();
  const sheet = page.getByRole('dialog', { name: ko.shelf.domain });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: /날씨/ }).click();
  await expect(sheet).toBeHidden();
  await expect(chip).toBeFocused();
  await expect(chip).toHaveAccessibleName(/날씨/);
  await expect(visible).toHaveCount(0);
  await page.getByRole('button', { name: ko.shelf.reset }).click();
  await expect(visible).toHaveCount(total);
  await expect(page.locator('#shelf-q')).toHaveValue('');
});

test('사전 시트: 결과 수는 시트 안의 알림 자리로 읽히고, 다시 열어도 초점은 검색 칸으로 간다', async ({ page }) => {
  await page.goto('/tools');
  await islandsReady(page);
  const button = page.locator('.topbar .dict-btn');
  await button.click();
  const sheet = page.locator('dialog.dict-sheet');
  await expect(page.locator('#dict-q')).toBeFocused();
  await page.keyboard.type('API 키');
  // 모달 밖의 #cc-live는 시트가 열린 동안 접근성 트리에서 빠진다 (activeModalDialog)
  await expect(sheet.locator('[data-live]')).toHaveText(/개를 찾았어요/);
  await expect(page.locator('#cc-live')).toHaveText('');
  // 크롬 기본 × 대신 직접 둔 지우기 단추
  await sheet.getByRole('button', { name: ko.common.clearSearch }).click();
  await expect(page.locator('#dict-q')).toHaveValue('');
  await expect(page.locator('#dict-q')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await button.click();
  await expect(page.locator('#dict-q')).toBeFocused();
});
