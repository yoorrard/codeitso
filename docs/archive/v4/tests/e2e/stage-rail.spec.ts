// 단계 줄 (D64, docs/review/v2/brief.md 6.2·9 W1): 360px에서는 '1/4 · 만들 앱 정하기' 버튼 하나로 접히고 단계 시트를 연다.
// 768px에서는 네 이름을 펼친다. 글자를 200%로 키우면 어느 폭이든 접힌다. 못 가는 단계는 이유를 알리는 버튼이다.
// 단계 시트 안의 못 가는 줄은 이유를 적어 둔 누를 수 없는 줄이다 (모달 밖 알림 자리는 시트가 열린 동안 읽히지 않는다).
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { islandsReady } from './helpers.ts';

const position = (n: number, stage: string): string => fill(ko.progress.position, { n, stage });
const recipe = (JSON.parse(readFileSync('data/recipes.json', 'utf8')) as { recipes: { answers: Record<string, string>; cart: string[]; kept?: string[] }[] }).recipes[0];

test('360px: 접힌 버튼 하나에 지금 단계를 읽히고, Enter로 단계 시트를 열고 Esc로 닫으면 초점이 버튼으로', async ({ page }) => {
  await page.goto('/destination');
  await islandsReady(page);
  const toggle = page.locator('.rail-toggle');
  await expect(toggle).toBeVisible();
  await expect(page.locator('.rail-full')).toBeHidden();
  // 보이는 글은 '1/4 · 만들 앱 정하기', 낭독은 '4단계 중 1단계: 만들 앱 정하기'
  await expect(toggle).toContainText(`${fill(ko.progress.count, { n: 1 })}·${ko.stages.destination}`, { useInnerText: false });
  const name = position(1, ko.stages.destination);
  await expect(page.getByRole('button', { name: new RegExp(`^${name}`) })).toHaveCount(1);
  await expect(page.locator('.rail-bars .bar.now')).toHaveCount(1);
  await expect(page.locator('.rail-bars .bar.done')).toHaveCount(0);

  await toggle.focus();
  await page.keyboard.press('Enter');
  const sheet = page.getByRole('dialog', { name: ko.progress.sheetTitle });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('a[aria-current="step"]')).toHaveAttribute('href', '/destination');
  // 만들 앱을 정하기 전에는 도구 고르기로 갈 수 없다: 링크도 버튼도 아닌 줄에 이유를 적어 둔다
  const locked = sheet.locator('.sheet-step.locked').first();
  await expect(locked).toContainText(ko.locks.destination);
  await expect(locked.locator('a, button')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(toggle).toBeFocused();

  // 지금 단계 줄을 누르면 같은 화면을 다시 열지 않고 시트만 닫는다
  await toggle.click();
  await expect(sheet).toBeVisible();
  const before = await page.evaluate(() => performance.timeOrigin);
  await sheet.locator('a[aria-current="step"]').click();
  await expect(sheet).toBeHidden();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(before);
  await expect(toggle).toBeFocused();

  // 시트 뒤 어두운 막을 누르면 닫힌다
  await toggle.click();
  await expect(sheet).toBeVisible();
  await page.mouse.click(180, 8);
  await expect(sheet).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('360px: 연습 화면은 번호 밖이라 접힌 글이 "연습 · 내 AI 써 보기", 네 칸이 모두 비어 있다', async ({ page }) => {
  await page.goto('/test-drive');
  await islandsReady(page);
  await expect(page.locator('.rail-toggle')).toContainText(`${ko.progress.practiceCount}·${ko.stages['test-drive']}`, { useInnerText: false });
  await expect(page.getByRole('button', { name: new RegExp(`^${fill(ko.progress.practice, { stage: ko.stages['test-drive'] })}`) })).toHaveCount(1);
  await expect(page.locator('.rail-bars :is(.bar.now, .bar.done)')).toHaveCount(0);
});

test('768px: 네 이름을 펼치고, 지금 단계에 aria-current, 못 가는 단계는 누르면 이유를 알린다', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/destination');
  await islandsReady(page);
  await expect(page.locator('.rail-toggle')).toBeHidden();
  const names = page.locator('.rail-list .step-name');
  await expect(names).toHaveText([ko.stages.destination, ko.stages.waypoints, ko.stages.check, ko.stages.arrival]);
  for (const el of await names.all()) await expect(el).toBeVisible();
  await expect(page.locator('.rail-practice')).toContainText(ko.stages['test-drive']);
  await expect(page.locator('.rail-list a[aria-current="step"]')).toHaveAttribute('href', '/destination');
  const locked = page.locator('.rail-list .step.locked button').first();
  await expect(locked).toHaveAttribute('aria-disabled', 'true');
  // aria-disabled라 Playwright는 '꺼짐'으로 보고 누르지 않는다. 키보드로 누른다 (이유를 알리는 버튼)
  await locked.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#cc-live')).toContainText(ko.locks.destination);
  // 연습 링크로 옮겨 가면 연습이 지금 단계가 된다
  await page.locator('.rail-practice').click();
  await page.waitForURL(/\/test-drive$/);
  await islandsReady(page);
  await expect(page.locator('.rail-practice')).toHaveAttribute('aria-current', 'step');
});

test('글자 200%: 768px에서도 접힌다', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto('/waypoints');
  await islandsReady(page);
  await expect(page.locator('.rail-full')).toBeVisible();
  // 사이트 CSP가 붙인 <style>은 막으므로 요소 style로 키운다 (브라우저 글자 크기 200%와 같다)
  await page.evaluate(() => document.documentElement.style.setProperty('font-size', '200%'));
  await expect(page.locator('.rail-toggle')).toBeVisible();
  await expect(page.locator('.rail-full')).toBeHidden();
});

test('진행이 있으면 마친 단계는 ✓, 시트에서 다른 단계로 옮겨 간다', async ({ page }) => {
  if (!recipe) throw new Error('코스가 없다');
  await page.addInitScript((s) => localStorage.setItem('cc:session:v1', JSON.stringify(s)), { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [], deferred: [] });
  await page.goto('/check');
  await islandsReady(page);
  await expect(page.locator('.rail-toggle')).toContainText(`${fill(ko.progress.count, { n: 3 })}·${ko.stages.check}`, { useInnerText: false });
  // 1·2단계 마침(남색) + 지금 3단계(파랑) = 세 칸
  await expect(page.locator('.rail-bars .bar.done')).toHaveCount(2);
  await expect(page.locator('.rail-bars .bar').nth(2)).toHaveClass(/\bnow\b/);
  await page.locator('.rail-toggle').click();
  const sheet = page.getByRole('dialog', { name: ko.progress.sheetTitle });
  await expect(sheet.locator('.sheet-step.done')).toHaveCount(2);
  await sheet.locator('a[href="/waypoints"]').click();
  await page.waitForURL(/\/waypoints$/);
});
