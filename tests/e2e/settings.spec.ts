// 틀과 설정 (docs/review/v2/brief.md 3.2·6.13, D67): 맨 위 시험판 띠는 없고 안내 한 줄은 바닥글에 있다.
// 설정은 모달 시트: 스위치 줄(role="switch")을 누르면 저장되고, 지우기 확인은 시트 위에 겹쳐 뜨며, Esc로 닫으면 초점이 설정 버튼으로.
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { islandsReady } from './helpers.ts';

test('맨 위 시험판 띠가 없고, 미리 보기 안내는 바닥글 한 줄이다', async ({ page }) => {
  await page.goto('/tools');
  await expect(page.locator('body > p').filter({ hasText: ko.footer.trial })).toHaveCount(0);
  await expect(page.locator('footer.site-footer')).toContainText(ko.footer.trial);
});

test('설정 시트: 스위치를 켜면 저장되고, 확인 대화 상자는 겹쳐 뜨며, Esc로 닫으면 초점이 설정 버튼으로', async ({ page }) => {
  await page.goto('/tools');
  await islandsReady(page);
  const gear = page.getByRole('button', { name: ko.settings.open, exact: true });
  await gear.click();
  const sheet = page.getByRole('dialog', { name: ko.settings.title });
  await expect(sheet).toBeVisible();
  for (const label of [ko.settings.motion, ko.settings.sound, ko.settings.quiet, ko.settings.glossary, ko.settings.marks]) {
    await expect(sheet.getByRole('switch', { name: label })).toBeVisible();
  }
  // 풀이·점선 밑줄은 처음부터 켜짐, 조용히 모시기는 꺼짐
  await expect(sheet.getByRole('switch', { name: ko.settings.glossary })).toHaveAttribute('aria-checked', 'true');
  const quiet = sheet.getByRole('switch', { name: ko.settings.quiet });
  await expect(quiet).toHaveAttribute('aria-checked', 'false');
  await quiet.click();
  await expect(quiet).toHaveAttribute('aria-checked', 'true');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('cc:prefs:v1'))) ?? '{}')).toMatchObject({ quiet: true });

  await sheet.getByRole('button', { name: ko.settings.clear }).click();
  const confirm = page.getByRole('dialog', { name: ko.settings.clearTitle });
  await expect(confirm).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirm).toBeHidden();
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(gear).toBeFocused();
});
