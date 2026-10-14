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

test('바닥글은 링크 아래 "© 2026 코드쇼퍼" 한 줄이고, 홈도 시험판 안내는 바닥글에만 있다 (v3 설계서 3.5·9.1절, L-40)', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer.site-footer');
  await expect(footer.locator('.footer-line').first()).toHaveText(ko.footer.license);
  await expect(footer.getByText(ko.footer.trial)).toBeVisible();
  await expect(page.locator('main').getByText(ko.footer.trial)).toHaveCount(0);
});

test('소개에 옛 공개 저장소 문단이 없고, 연락 주소가 없는 빌드는 의견 묶음을 그리지 않는다 (v3 L-01)', async ({ page }) => {
  await page.goto('/about');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText(ko.about.title);
  await expect(main).not.toContainText('공개 저장소');
  await expect(main).not.toContainText('누구나 고칠');
  // 기본 호스트(Cloudflare)는 이름 없는 횟수를 보낸다고 말한다 (정적 호스트 문장은 base-path.spec.ts)
  await expect(main).toContainText(ko.about.stored);
  await expect(main.getByRole('heading', { name: ko.about.report })).toHaveCount(0);
  await expect(main.locator('a[href^="mailto:"]')).toHaveCount(0);
});

test('설정 시트: 스위치를 켜면 저장되고, 확인 대화 상자는 겹쳐 뜨며, Esc로 닫으면 초점이 설정 버튼으로', async ({ page }) => {
  await page.goto('/tools');
  await islandsReady(page);
  const gear = page.getByRole('button', { name: ko.settings.open, exact: true });
  await gear.click();
  const sheet = page.getByRole('dialog', { name: ko.settings.title });
  await expect(sheet).toBeVisible();
  // 스위치 셋 (효과음·조용히 모시기는 v4 D96에서 걷었다)
  await expect(sheet.getByRole('switch')).toHaveCount(3);
  for (const label of [ko.settings.motion, ko.settings.glossary, ko.settings.marks]) {
    await expect(sheet.getByRole('switch', { name: label })).toBeVisible();
  }
  // 풀이·점선 밑줄은 처음부터 켜짐. 끄면 저장된다
  await expect(sheet.getByRole('switch', { name: ko.settings.glossary })).toHaveAttribute('aria-checked', 'true');
  const marks = sheet.getByRole('switch', { name: ko.settings.marks });
  await expect(marks).toHaveAttribute('aria-checked', 'true');
  await marks.click();
  await expect(marks).toHaveAttribute('aria-checked', 'false');
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('cc:prefs:v1'))) ?? '{}')).toMatchObject({ marks: false });

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

test('기기에서 동작 줄이기가 켜져 있으면 스위치는 켜진 채 잠기고 까닭이 둘째 줄에 있다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/tools');
  await islandsReady(page);
  await page.getByRole('button', { name: ko.settings.open, exact: true }).click();
  const motion = page.getByRole('dialog', { name: ko.settings.title }).getByRole('switch', { name: ko.settings.motion });
  await expect(motion).toHaveAttribute('aria-checked', 'true');
  await expect(motion).toHaveAttribute('aria-disabled', 'true');
  await expect(motion).toHaveAccessibleDescription(ko.settings.motionOs);
  // 잠긴 스위치(aria-disabled)는 눌러도 바뀌지 않는다
  await motion.dispatchEvent('click');
  await expect(motion).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => localStorage.getItem('cc:prefs:v1'))).toBeNull();
});
