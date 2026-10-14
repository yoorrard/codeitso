// 만들 앱 정하기 (brief 6.5, D70): H1이 질문, 바깥 카드·'n번째 질문' 글·주 버튼 자리의 [도구 먼저 둘러볼게요] 없음,
// 앱 종류 타일 2열 + '아직 안 정했어요' 전체 폭 줄, 네·아니요 2×2 버튼, 느낌 견본 넷(지도 팔레트), 보기를 누르면 바로 다음 질문,
// 아래 막대 [이전] 56 + 상태 한 줄, 주 버튼 [도구 고르러 가기]는 마지막 질문에 답한 뒤에만(화면에 하나),
// 답이 쌓이면 '고를 것 n개' 칩과 지도 변화 낭독, '지금까지 정한 것' 답 줄로 그 질문에 돌아가기.
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { golden, islandsReady, questions } from './helpers.ts';

const q = (id: string) => {
  const x = questions.find((y) => y.id === id);
  if (!x) throw new Error(`질문 ${id}가 없다`);
  return x;
};
const label = (qid: string, oid: string): string => q(qid).options?.find((o) => o.id === oid)?.label ?? '';
const g1 = golden('case-01');
/**
 * 사례 01의 답을 화면에서 묻는 순서대로. '쓰는 AI'(q.aitool-chat)는 고르지 않아도 되는 질문이라 골든에는 없고(D87),
 * 다른 질문이 남아 있으면 q.ai 다음에 묻는다. 그래서 심을 때는 '아직 안 정했어요'로 넣는다
 */
const g1Answers: Record<string, string> = Object.fromEntries(
  Object.entries(g1.answers).flatMap(([k, v]) => (k === 'q.ai' ? [[k, v], ['q.aitool-chat', 'unknown']] : [[k, v]])),
);

/** 저장된 답을 심고 만들 앱 정하기를 연다 */
async function open(page: Page, answers: Record<string, string> = {}): Promise<void> {
  await page.addInitScript((a) => {
    if (sessionStorage.getItem('e2e-seeded')) return;
    sessionStorage.setItem('e2e-seeded', '1');
    localStorage.setItem('cc:session:v1', JSON.stringify({ answers: a, cart: [], kept: [], deferred: [] }));
  }, answers);
  await page.goto('/destination');
  await islandsReady(page);
}

/** 보이는 주 버튼 수 */
async function visiblePrimaries(page: Page): Promise<number> {
  return page.locator('.btn-primary:visible').count();
}

/** 사례 01의 답을 앞에서부터 n개 */
const firstAnswers = (n: number): Record<string, string> => Object.fromEntries(Object.entries(g1Answers).slice(0, n));

test('첫 질문: H1이 질문이고 단계 한 줄은 그 위에만, 앱 종류 타일 2열과 전체 폭 줄, 주 버튼 없음', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await open(page);
  const sheet = page.locator('.q-sheet');
  await expect(page.locator('h1#q-title')).toHaveText(`${fill(ko.interview.questionNo, { n: 1 })}. ${q('q.type').text}`);
  await expect(sheet.locator('.q-lead')).toBeVisible();
  await expect(sheet.locator('.q-help')).toHaveText(q('q.type').help ?? '');
  // 바깥 카드·오른쪽 끝 'n번째 질문' 글이 없다 (번호는 상태 한 줄과 숨은 글)
  await expect(page.locator('.q-card')).toHaveCount(0);
  await expect(sheet.getByText(fill(ko.interview.questionNo, { n: 1 }), { exact: true })).toHaveCount(0);
  await expect(page.locator('.action-bar .status-line')).toContainText(fill(ko.progress.status.question, { n: 1 }));
  // 타일 여섯은 두 칸으로 나란히, 모르겠어요는 아래 전체 폭 줄
  const tiles = sheet.locator('.pick-tile');
  await expect(tiles).toHaveCount(6);
  const [a, b] = [await tiles.nth(0).boundingBox(), await tiles.nth(1).boundingBox()];
  expect(a && b && Math.abs(a.y - b.y) < 1 && b.x > a.x).toBe(true);
  expect(Math.round(a?.height ?? 0)).toBeGreaterThanOrEqual(132);
  const wide = sheet.locator('.pick-wide .pick-btn');
  await expect(wide).toHaveText(label('q.type', 'unknown'));
  expect(Math.round((await wide.boundingBox())?.height ?? 0)).toBe(56);
  // 보기는 aria-pressed 버튼 (라디오 없음, D19)
  await expect(sheet.locator('input[type="radio"]')).toHaveCount(0);
  await expect(tiles.first()).toHaveAttribute('aria-pressed', 'false');
  // 주 버튼은 아직 없고, [도구 먼저 둘러볼게요]는 시트 맨 아래 글 버튼
  expect(await visiblePrimaries(page)).toBe(0);
  await expect(page.locator('.action-bar').getByText(ko.interview.browseOnly)).toHaveCount(0);
  await expect(sheet.locator('a.btn-text', { hasText: ko.interview.browseOnly })).toHaveAttribute('href', '/tools');
  await expect(page.locator('.q-back')).toHaveCount(0);
});

test('보기를 누르면 바로 다음 질문(제목에 초점), 칩·낭독, [이전]으로 돌아가면 고른 타일에 ✓', async ({ page }) => {
  await open(page);
  const form = label('q.type', 'form');
  await page.locator('.pick-tile', { hasText: form }).click();
  const title = page.locator('h1#q-title');
  await expect(title).toContainText(q('q.audience').text);
  await expect(title).toBeFocused();
  // 답 하나에 지도 변화 하나: 고른 것과 생긴 마디를 한 번에 읽는다
  const live = page.locator('#cc-live');
  await expect(live).toContainText(fill(ko.interview.answered, { label: form }));
  await expect(live).toContainText(/지도에 .+ 생겼어요\./);
  await expect(page.locator('.q-chip')).toHaveText(/고를 것 \d+개/);
  await expect(page.locator('.action-bar .status-line')).toContainText(fill(ko.progress.status.question, { n: 2 }));
  // 아래 막대 [이전] 56×56 → 첫 질문, 고른 타일은 눌린 채
  const back = page.locator('.action-bar .q-back');
  await expect(back).toHaveAccessibleName(ko.interview.back);
  const box = await back.boundingBox();
  expect([Math.round(box?.width ?? 0), Math.round(box?.height ?? 0)]).toEqual([56, 56]);
  await back.click();
  await expect(title).toContainText(q('q.type').text);
  await expect(title).toBeFocused();
  await expect(page.locator('.pick-tile', { hasText: form })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.action-bar .status-line')).toContainText(fill(ko.progress.status.question, { n: 1 }));
  await expect(page.locator('.q-back')).toHaveCount(0);
});

test('네·아니요 질문은 2×2 중립 버튼, 고르면 --chosen 면이 된다', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  // case-01은 안내 페이지라 '쓰는 AI' 다음 다섯째 질문이 저장(네·아니요)이다
  await open(page, firstAnswers(5));
  await page.locator('.q-back').click();
  await expect(page.locator('h1#q-title')).toContainText(q('q.save').text);
  const btns = page.locator('.pick-pairs .pick-btn');
  await expect(btns).toHaveCount(4);
  const boxes = await Promise.all([0, 1, 2, 3].map(async (i) => btns.nth(i).boundingBox()));
  expect(boxes.every((b) => Math.round(b?.height ?? 0) === 56)).toBe(true);
  expect(Math.abs((boxes[0]?.y ?? 0) - (boxes[1]?.y ?? 1))).toBeLessThan(1);
  const chosen = btns.filter({ hasText: label('q.save', g1.answers['q.save'] ?? '') });
  await expect(chosen).toHaveAttribute('aria-pressed', 'true');
  const [bg, chosenBg] = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    const probe = document.createElement('i');
    probe.style.color = s.getPropertyValue('--chosen');
    document.body.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return [getComputedStyle(document.querySelector('.pick-btn[aria-pressed="true"]') as Element).backgroundColor, c];
  });
  expect(bg).toBe(chosenBg);
  await expect(page.locator('.q-note')).toHaveText(ko.interview.maybeNote);
});

test('느낌 질문은 내 지도를 네 팔레트로 칠한 견본 여섯 + 모르겠어요 줄 (새 느낌 둘은 있는 팔레트에 잇는다, T38)', async ({ page }) => {
  const answers = Object.fromEntries(Object.entries(g1Answers).filter(([k]) => k !== 'q.style'));
  await open(page, answers);
  await expect(page.locator('h1#q-title')).toContainText(q('q.style').text);
  const swatches = page.locator('.pick-plate.is-feel');
  await expect(swatches).toHaveCount(6);
  expect(await swatches.evaluateAll((els) => els.map((e) => e.getAttribute('data-palette')))).toEqual(['clean', 'cute', 'calm', 'bold', 'cute', 'bold']);
  // 견본마다 내 길(미니 지도)이 그려져 있다
  await expect(swatches.first().locator('svg.map-board.is-mini .mb-road').first()).toBeAttached();
  await expect(page.locator('.pick-wide .pick-btn')).toHaveText(label('q.style', 'unknown'));
  expect(await page.locator('.btn-primary:visible').count()).toBe(0);
});

test('마지막 질문에 답하면 한 줄 쓰기와 주 버튼 [도구 고르러 가기] 하나, 정한 것 접기에서 질문으로 돌아간다', async ({ page }) => {
  const answers = Object.fromEntries(Object.entries(g1Answers).filter(([k]) => k !== 'q.style'));
  await open(page, answers);
  await page.locator('.pick-tile', { hasText: label('q.style', 'cute') }).click();
  await expect(page.locator('#free-line')).toBeVisible();
  await expect(page.locator('#cc-live')).toContainText(ko.interview.done.split('{{n}}')[0] ?? '');
  const go = page.locator('.action-bar a.q-go');
  await expect(go).toHaveText(ko.interview.goShop);
  await expect(go).toHaveAttribute('href', '/waypoints');
  expect(await visiblePrimaries(page)).toBe(1);
  await expect(page.locator('.action-bar .status-line')).toContainText(ko.progress.status.destinationDone);
  // 정한 것 접기: 답 줄을 누르면 그 질문으로 (제목에 초점)
  await page.locator('.q-sofar summary').click();
  const row = page.locator('.q-sofar .list-row', { hasText: label('q.audience', g1.answers['q.audience'] ?? '') });
  await expect(row).toContainText(q('q.audience').chip ?? '');
  await row.click();
  await expect(page.locator('h1#q-title')).toContainText(q('q.audience').text);
  await expect(page.locator('h1#q-title')).toBeFocused();
  // 다 정한 채로 돌아가 봐도 주 버튼은 그대로 하나
  expect(await visiblePrimaries(page)).toBe(1);
});
