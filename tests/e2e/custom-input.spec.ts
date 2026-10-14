// 직접 쓰기 (T37, 설계서 7.2절, input.md 4·11.5절). 1단계 만들 앱 정하기: 보기 → [연필 + 직접 쓰기] → '또는' → [모르겠어요].
// 키보드만으로 "가계부 앱"을 써서 기록장 고르기 · 못 찾는 글을 그대로 두기 · 40자를 넘긴 오류(자르지 않음) · 빈 글 ·
// 한글 조합 중 Enter 무시(합성 compositionstart / keydown 229) · Esc로 접기 · 2×2 아래 전체 폭 줄 · 에이전트 무리 · 쓰는 AI 이름 ·
// 빈틈 알림 · 마지막 한 줄(maxlength 없음, 80자 넘으면 알리고 저장은 그대로) · axe · 동작 줄이기에서 펼침 0ms.
// 2단계 '목록에 없는 도구 쓰기'(설계서 7.5절, input.md 8.1·11.5절): 맞는 도구가 없는 칸에 "PokeAPI"를 직접 쓴 도구로 두고 정하기 →
// 3단계 서행 1개·막힌 곳 0 · [도구 바꾸기] → 설계도 1·7·9번 → 영수증 링크에 이름 없음, 링크로 연 영수증은 '직접 쓴 도구'.
// "수파베이스" → 이미 목록에 있는 Supabase · 막힌 곳 '바꾸기' 끝 [목록에 없는 도구 쓰기 ›] → 2단계 그 칸, 글 칸에 초점 ·
// 빌더가 맡은 공개 칸 · 도구 줄 꼬리표 · 지난 영수증의 직접 쓴 앱 이름 · 도구 모음 0건 한 줄.
// 검토 반영: 긴 내 말이 전체 폭 줄을 넘치지 않음(휴대폰 흉내 없이 360px) · 펼치는 동안 판 안이 굴러가지 않음 · 줄 위 Esc ·
// 넘침은 [확인] 전에 오류 · 마지막 한 줄은 넘친 채 Enter면 칸에 머묾 · 찾기 묶음이 늦으면 '찾는 중' · 직접 써도 안 풀리는 막힌 곳엔 링크 없음.
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { evaluate, fill, makeCatalog, toShareState } from '../../src/lib/engine/index.ts';
import type { Session } from '../../src/lib/engine/index.ts';
import { josa } from '../../src/lib/josa.ts';
import { shareHash } from '../../src/lib/share.ts';
import { loadData } from '../../scripts/lib/load-data.ts';
import { animationsSettled, golden, hydrated, islandsReady, questions } from './helpers.ts';

const q = (id: string) => {
  const x = questions.find((y) => y.id === id);
  if (!x) throw new Error(`질문 ${id}가 없다`);
  return x;
};
const label = (qid: string, oid: string): string => q(qid).options?.find((o) => o.id === oid)?.label ?? '';
/** 질문의 '직접 쓰기' 보기 (칸 라벨 field, 그대로 둘 때의 계산 keep) */
const customOf = (qid: string): { field: string; keep: string } => {
  const raw = JSON.parse(readFileSync('data/questions.json', 'utf8')) as { questions: { id: string; options: { isCustom?: boolean; field?: string; keep?: string }[] }[] };
  const c = raw.questions.find((x) => x.id === qid)?.options.find((o) => o.isCustom);
  return { field: c?.field ?? '', keep: c?.keep ?? '' };
};
const g1 = golden('case-01');

/** 저장된 답을 심고 만들 앱 정하기를 연다 */
async function open(page: Page, answers: Record<string, string> = {}, extra: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript(
    ([a, x]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('cc:session:v1', JSON.stringify({ answers: a, cart: [], kept: [], deferred: [], ...x }));
    },
    [answers, extra] as const,
  );
  await page.goto('/destination');
  await islandsReady(page);
}

interface Saved {
  answers: Record<string, string>;
  notes?: Record<string, string>;
  gaps?: string[];
  freeText?: string;
}
const saved = async (page: Page): Promise<Saved> => page.evaluate(() => JSON.parse(localStorage.getItem('cc:session:v1') ?? '{}') as Saved);

async function serious(page: Page): Promise<string[]> {
  await animationsSettled(page);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const row = (page: Page) => page.locator('.q .custom-row');
const field = (page: Page) => page.locator('.q .custom-field');
const found = (page: Page) => page.locator('.q .custom-found');

/** 사례 01의 답에서 한 질문만 빼고 심는다: 그 질문이 처음 안 답한 질문이 된다 ('쓰는 AI'는 아직 안 정했어요) */
const allBut = (qid: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries(g1.answers)
      .flatMap(([k, v]): [string, string][] => (k === 'q.ai' ? [[k, v], ['q.aitool-chat', 'unknown']] : [[k, v]]))
      .filter(([k]) => k !== qid),
  );

test('키보드만: [직접 쓰기] → "가계부 앱" → Enter → 찾은 말에 초점 → [기록장으로 고르기] → 다음 질문 제목, 내 말이 남는다', async ({ page }) => {
  await open(page);
  const tiles = page.locator('.q .pick-tile');
  await tiles.last().focus();
  await page.keyboard.press('Tab');
  await expect(row(page)).toBeFocused();
  await expect(row(page)).toHaveAttribute('aria-expanded', 'false');
  // 연필은 글자(✎)가 아니라 SVG 아이콘(aria-hidden)
  await expect(row(page).locator('svg[aria-hidden="true"]')).toHaveCount(1);
  expect(await row(page).textContent()).not.toContain('✎');
  await page.keyboard.press('Enter');
  await expect(row(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(field(page)).toBeFocused();
  // 칸: 라벨 + 도움말(끝에 '사람 이름·연락처는 쓰지 마세요.') + 글자 수, maxlength 없음
  await expect(page.getByLabel(customOf('q.type').field)).toBeFocused();
  await expect(field(page)).not.toHaveAttribute('maxlength', /.*/);
  const help = page.locator('.q .custom-help');
  await expect(help).toHaveText(new RegExp(`${ko.custom.privacy.replace('.', '\\.')}$`));
  await page.keyboard.type('가계부 앱');
  await expect(page.locator('.q .custom-count')).toHaveText(fill(ko.custom.count, { n: 5, max: 40 }));
  await page.keyboard.press('Enter');
  const record = label('q.type', 'record');
  await expect(found(page)).toHaveText(fill(ko.custom.found, { word: '가계부', label: record }));
  await expect(found(page)).toBeFocused();
  await expect(page.locator('.q .custom-result')).toHaveAttribute('role', 'group');
  // 저절로 고르지 않는다
  expect((await saved(page)).answers['q.type']).toBeUndefined();
  await page.keyboard.press('Tab');
  // 보기 이름은 따옴표로 감싸 조사를 붙인다 ('기록장'으로 · '모르겠어요'로)
  const pick = page.getByRole('button', { name: fill(ko.custom.pick, { labelDir: josa(`'${record}'`, 'dir') }) });
  await expect(pick).toHaveText(`'${record}'으로 고르기`);
  await expect(pick).toBeFocused();
  await page.keyboard.press('Enter');
  const title = page.locator('h1#q-title');
  await expect(title).toContainText(q('q.audience').text);
  await expect(title).toBeFocused();
  await expect(page.locator('#cc-live')).toContainText(fill(ko.custom.picked, { label: record }));
  const s = await saved(page);
  expect(s.answers['q.type']).toBe('record');
  expect(s.notes?.['q.type']).toBe('가계부 앱');
  // 지금까지 정한 것: 고른 보기 이름 + '내 말' 줄
  await page.locator('.q-sofar summary').click();
  await expect(page.locator('.q-sofar .list-row').first()).toContainText(fill(ko.custom.rowNote, { text: '가계부 앱' }));
  // 돌아가면 고른 타일에 ✓, [직접 쓰기] 줄 둘째 줄에 내 말. 펼치면 쓴 글로 채워져 있다
  await page.locator('.q-back').click();
  await expect(page.locator('.pick-tile', { hasText: record })).toHaveAttribute('aria-pressed', 'true');
  await expect(row(page)).toContainText(fill(ko.custom.rowNote, { text: '가계부 앱' }));
  await row(page).click();
  await expect(field(page)).toHaveValue('가계부 앱');
  // 다른 보기를 그냥 누르면 그 질문의 내 말은 지운다
  await page.locator('.pick-tile', { hasText: label('q.type', 'quiz') }).click();
  await expect(title).toContainText(q('q.audience').text);
  expect((await saved(page)).notes?.['q.type']).toBeUndefined();
});

test('못 찾는 글을 그대로 두기: 가져올 정보 "포켓몬 도감 정보" → 계산 한 줄 → [내 말 그대로 두기] → 다음 질문, 돌아오면 줄에 ✓', async ({ page }) => {
  await open(page, allBut('q.domain'));
  await expect(page.locator('h1#q-title')).toContainText(q('q.domain').text);
  // 목록 줄 꼴: 보기 줄 끝에 [직접 쓰기] → '또는' → [모르겠어요]
  await expect(page.locator('.q .pick-or')).toHaveText(ko.custom.or);
  const [rowBox, orBox, unknownBox] = await Promise.all([
    row(page).boundingBox(),
    page.locator('.q .pick-or').boundingBox(),
    page.locator('.q .pick-rows.is-after-or .list-row').boundingBox(),
  ]);
  expect((rowBox?.y ?? 0) < (orBox?.y ?? 0) && (orBox?.y ?? 0) < (unknownBox?.y ?? 0)).toBe(true);
  await row(page).click();
  await field(page).fill('포켓몬 도감 정보');
  await page.getByRole('button', { name: ko.custom.submit, exact: true }).click();
  await expect(found(page)).toHaveText(ko.custom.notFound);
  await expect(found(page)).toBeFocused();
  await expect(page.locator('.q .custom-result')).toContainText(ko.custom.closest);
  await expect(page.locator('.q .custom-result')).toContainText(customOf('q.domain').keep);
  // 보기가 6개를 넘어 다시 보이지 않는다
  await expect(page.locator('.q .custom-actions.is-options')).toHaveCount(0);
  expect(await serious(page)).toEqual([]);
  await page.getByRole('button', { name: ko.custom.keep }).click();
  await expect(page.locator('h1#q-title')).not.toContainText(q('q.domain').text);
  await expect(page.locator('#cc-live')).toContainText(ko.custom.kept);
  const s = await saved(page);
  expect(s.answers['q.domain']).toBe('custom');
  expect(s.notes?.['q.domain']).toBe('포켓몬 도감 정보');
  await page.locator('.q-back').click();
  await expect(row(page)).toHaveClass(/is-chosen/);
  await expect(row(page)).toContainText(ko.custom.chosen);
  await expect(row(page)).toContainText(fill(ko.custom.rowNote, { text: '포켓몬 도감 정보' }));
});

test('검사: 빈 글, 41자는 자르지 않고 넘는 순간 "1자를 줄여 주세요"(aria-invalid, [확인] 전에도), 연락처는 막지 않고 경고', async ({ page }) => {
  await open(page);
  await row(page).click();
  await page.getByRole('button', { name: ko.custom.submit, exact: true }).click();
  await expect(page.locator('.q .custom-error')).toHaveText(ko.custom.empty);
  await expect(field(page)).toHaveAttribute('aria-invalid', 'true');
  const text = '가'.repeat(41);
  await field(page).fill(text);
  await expect(field(page)).toHaveValue(text);
  await expect(page.locator('.q .custom-count')).toHaveClass(/is-over/);
  // 넘는 순간 화면 글과 aria-invalid가 함께 (낭독 '40자까지 쓸 수 있어요.'와 같은 말로 시작)
  await expect(page.locator('.q .custom-error')).toHaveText(fill(ko.custom.tooLong, { max: 40, over: 1 }));
  await expect(page.locator('.q .custom-error')).toContainText(fill(ko.interview.lineFull, { max: 40 }));
  await expect(field(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(field(page)).toHaveAttribute('aria-describedby', /-error/);
  await page.getByRole('button', { name: ko.custom.submit, exact: true }).click();
  await expect(page.locator('.q .custom-error')).toHaveText(fill(ko.custom.tooLong, { max: 40, over: 1 }));
  await expect(found(page)).toHaveCount(0);
  expect(await serious(page)).toEqual([]);
  // 고치면 오류가 걷힌다
  await field(page).fill('가계부 앱 010-1234-5678');
  await expect(page.locator('.q .custom-error')).toHaveCount(0);
  await field(page).press('Enter');
  await expect(page.locator('.q .custom-warn')).toHaveText(ko.custom.contact);
  await expect(found(page)).toBeVisible();
});

test('한글 조합 중 Enter는 무시한다 (isComposing, keyCode 229), 조합이 끝난 뒤 Enter는 확인', async ({ page }) => {
  await open(page);
  await row(page).click();
  await field(page).fill('가계부');
  await field(page).dispatchEvent('compositionstart');
  await field(page).dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await field(page).dispatchEvent('keydown', { key: 'Enter', keyCode: 229 });
  await field(page).dispatchEvent('compositionend');
  await expect(found(page)).toHaveCount(0);
  await field(page).press('Enter');
  await expect(found(page)).toBeVisible();
});

test('Esc는 판을 접고 초점을 [직접 쓰기] 줄로 (판이 열린 채 줄로 돌아와서도), 동작 줄이기면 펼침이 0ms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await row(page).click();
  await expect(field(page)).toBeFocused();
  const panel = page.locator('.q .custom-panel');
  expect(await panel.evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0s(, 0s)*$/);
  await page.keyboard.press('Escape');
  await expect(row(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(row(page)).toBeFocused();
  await expect(field(page)).toBeHidden();
  // 다시 펼치고 Shift+Tab으로 줄에 돌아와 Esc
  await page.keyboard.press('Enter');
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(row(page)).toBeFocused();
  await expect(row(page)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(row(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(row(page)).toBeFocused();
});

test('펼치는 동안 판 안의 글이 반대로 움직이지 않는다 (초점을 받아도 판 안이 굴러가지 않음, overflow: clip)', async ({ page }) => {
  await open(page);
  await row(page).click();
  // 펼침 전환(--dur-ui) 동안 여러 번 잰다
  const tops = await page.evaluate(async () => {
    const inner = document.querySelector<HTMLElement>('.q .custom-inner');
    const out: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      out.push(inner?.scrollTop ?? -1);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return out;
  });
  expect(tops.every((t) => t === 0)).toBe(true);
  expect(await page.locator('.q .custom-inner').evaluate((el) => getComputedStyle(el).overflowY)).toBe('clip');
  await expect(field(page)).toBeFocused();
});

test("찾기 묶음이 늦게 오면 [확인] 뒤 '찾는 중이에요.'를 보이고, 그동안 누른 Enter는 한 번만 처리한다", async ({ page }) => {
  // 찾기 묶음(custom-match)을 1초 늦춘다. 처음 펼칠 때 미리 받기 시작하므로 받기 전에 [확인]한다
  let release: () => void = () => undefined;
  const gate = new Promise<void>((r) => (release = r));
  await page.route(/custom-match[^/]*\.js/, async (route) => {
    await gate;
    await route.continue();
  });
  await open(page);
  await row(page).click();
  await field(page).fill('가계부 앱');
  await field(page).press('Enter');
  await field(page).press('Enter');
  await expect(page.locator('.q .custom-busy')).toHaveText(ko.custom.busy);
  await expect(page.locator('.q .custom-submit')).toHaveAttribute('aria-busy', 'true');
  release();
  await expect(found(page)).toBeFocused();
  await expect(page.locator('.q .custom-busy')).toHaveCount(0);
  await expect(page.locator('.q .custom-result')).toHaveCount(1);
});

test('앱 종류는 타일 → [직접 쓰기] 전체 폭 줄 → 또는 → [아직 안 정했어요]', async ({ page }) => {
  await open(page);
  const sheet = page.locator('.q');
  const order = await Promise.all([
    sheet.locator('.pick-tile').last().boundingBox(),
    sheet.locator('.pick-custom .custom-row').boundingBox(),
    sheet.locator('.pick-or').boundingBox(),
    sheet.locator('.pick-wide .pick-btn').boundingBox(),
  ]);
  const ys = order.map((b) => b?.y ?? 0);
  expect(ys).toEqual([...ys].sort((a, b) => a - b));
  await expect(sheet.locator('.pick-wide .pick-btn')).toHaveText(label('q.type', 'unknown'));
  expect(Math.round(order[1]?.height ?? 0)).toBeGreaterThanOrEqual(56);
});

test('예·아니요 2×2 질문은 그 아래 전체 폭 줄 하나(또는 없음), 찾기는 "필요 없" → 아니요', async ({ page }) => {
  await open(page, allBut('q.save'));
  await expect(page.locator('h1#q-title')).toContainText(q('q.save').text);
  await expect(page.locator('.pick-pairs .pick-btn')).toHaveCount(4);
  await expect(page.locator('.q .pick-or')).toHaveCount(0);
  const pairs = await page.locator('.pick-pairs').boundingBox();
  const wide = await page.locator('.pick-custom .custom-row').boundingBox();
  expect((wide?.y ?? 0) > (pairs?.y ?? 0) + (pairs?.height ?? 0) - 1).toBe(true);
  expect(Math.abs((wide?.width ?? 0) - (pairs?.width ?? 0))).toBeLessThan(2);
  await page.locator('.pick-custom .custom-row').click();
  await field(page).fill('저장은 필요 없어요');
  await field(page).press('Enter');
  await expect(found(page)).toHaveText(new RegExp(`: ${label('q.save', 'no')}$`));
  // 초점을 받는 첫 문장에 화살표 기호가 없다 (낭독기가 '오른쪽 화살표'로 읽지 않게)
  await expect(found(page)).not.toContainText('→');
});

test("'쓰는 AI': 에이전트는 세 무리 제목과 유료 꼬리표, 직접 쓴 AI 이름은 내 말로 남는다 (맞춤법 검사 끔)", async ({ page }) => {
  await open(page, { 'q.type': 'page', 'q.audience': 'me', 'q.ai': 'agent' });
  await expect(page.locator('h1#q-title')).toContainText(q('q.aitool-agent').text);
  await expect(page.locator('.q .pick-group-title')).toHaveText(['앱 안에서 (터미널 없이)', '편집기 안', '터미널']);
  await expect(page.locator('.q .list-row', { hasText: label('q.aitool-agent', 'claude-app') }).locator('.tag')).toHaveText(ko.interview.paidOnly);
  await expect(page.locator('.q .list-row', { hasText: label('q.aitool-agent', 'codex-app') }).locator('.tag')).toHaveCount(0);
  expect(await serious(page)).toEqual([]);
  await row(page).click();
  await expect(field(page)).toHaveAttribute('spellcheck', 'false');
  await field(page).fill('Cline');
  await field(page).press('Enter');
  await expect(found(page)).toBeVisible();
  await expect(page.locator('.q .custom-calc, .q .custom-line').filter({ hasText: "'아직 안 정했어요'와 같게" })).toHaveCount(1);
  await page.getByRole('button', { name: ko.custom.keep }).click();
  const s = await saved(page);
  expect(s.answers['q.aitool-agent']).toBe('custom');
  expect(s.notes?.['q.aitool-agent']).toBe('Cline');
});

test('빈틈 알림: 앱 종류 "단톡방 같은 채팅 앱" → 알림 한 줄, 그대로 두면 세션 빈틈에 들어간다', async ({ page }) => {
  await open(page);
  await row(page).click();
  await field(page).fill('단톡방 같은 채팅 앱');
  await field(page).press('Enter');
  await expect(page.locator('.q .custom-gap')).toHaveCount(1);
  await expect(page.locator('.q .custom-gap')).toContainText("'알아볼 것'에 넣어 둘게요.");
  await expect(page.locator('.q .custom-result')).toContainText(customOf('q.type').keep);
  await page.getByRole('button', { name: ko.custom.keep }).click();
  const s = await saved(page);
  expect(s.answers['q.type']).toBe('custom');
  expect(s.gaps).toEqual(['chat']);
});

test('마지막 한 줄: 예시는 도움말, maxlength 없음, 80자를 넘으면 자르지 않고 알리며 저장은 마지막 맞는 글, 넘친 채 Enter면 칸에 머문다. 앱을 직접 썼으면 그 글로 채워 보인다', async ({ page }) => {
  const answers = { ...allBut('q.type'), 'q.type': 'custom' };
  await open(page, answers, { notes: { 'q.type': '반려식물 물 주기 알림' } });
  // 직접 쓴 앱이면 더 묻는 질문(알림 등)이 생긴다: 남은 질문은 '모르겠어요'로
  const line = page.locator('#free-line');
  for (let i = 0; i < 10 && !(await line.isVisible()); i += 1) {
    const title = ((await page.locator('#q-title').textContent()) ?? '').trim();
    const now = questions.find((x) => title.endsWith(x.text));
    const unknown = now?.options?.find((o) => o.isUnknown)?.label ?? '';
    await page.locator('.q').getByRole('button', { name: unknown, exact: true }).click();
    await expect(page.locator('#q-title')).not.toHaveText(title);
  }
  await expect(line).toBeVisible();
  await expect(line).not.toHaveAttribute('maxlength', /.*/);
  await expect(line).not.toHaveAttribute('placeholder', /.*/);
  await expect(page.locator('#free-line-hint')).toHaveText(ko.interview.lineHint);
  await expect(line).toHaveValue('반려식물 물 주기 알림');
  const ok = '가'.repeat(80);
  await line.fill(ok);
  await expect(page.locator('#free-line-count')).not.toHaveClass(/is-over/);
  await line.fill(`${ok}나`);
  await expect(line).toHaveValue(`${ok}나`);
  await expect(page.locator('#free-line-count')).toHaveClass(/is-over/);
  await expect(page.locator('#free-line-error')).toHaveText(fill(ko.interview.lineTooLong, { max: 80, over: 1 }));
  await expect(line).toHaveAttribute('aria-invalid', 'true');
  expect((await saved(page)).freeText).toBe(ok);
  // 넘친 채 Enter: 저장되지 않은 글이 남으므로 아래 막대로 가지 않고 칸에 머물며 다시 알린다
  await line.press('Enter');
  await expect(line).toBeFocused();
  await expect(page.locator('#cc-live')).toContainText(fill(ko.interview.lineTooLong, { max: 80, over: 1 }));
  expect(await serious(page)).toEqual([]);
  // 고치면 Enter는 아래 막대의 [도구 고르러 가기]로
  await line.fill(ok);
  await line.press('Enter');
  await expect(page.locator('.q-go')).toBeFocused();
});

// ── 2단계 목록에 없는 도구 쓰기 · 3단계 · 영수증 ─────────────────────────────

const cat = makeCatalog(loadData());
const T = loadData().templates;

/** 저장된 진행(과 그 밖의 키)을 심고 화면을 연다 */
async function openAt(page: Page, route: string, session: Partial<Session>, more: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript(
    ([s, m]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      localStorage.setItem('cc:session:v1', JSON.stringify({ answers: {}, cart: [], kept: [], deferred: [], ...s }));
      for (const [k, v] of Object.entries(m)) localStorage.setItem(k, JSON.stringify(v));
    },
    [session, more] as const,
  );
  await page.goto(route);
  await islandsReady(page);
}

interface SavedTools {
  cart: string[];
  customTools?: { id: string; name: string; capability: string }[];
}
const savedTools = (page: Page): Promise<SavedTools> => page.evaluate(() => JSON.parse(localStorage.getItem('cc:session:v1') ?? '{}') as SavedTools);
const slotRow = (page: Page) => page.locator('#w-slot .custom-row');
const slotField = (page: Page) => page.locator('#w-slot .custom-field');
const slotFound = (page: Page) => page.locator('#w-slot .custom-found');
const chipOf = (page: Page, label: string) => page.locator('.w-chip', { hasText: label });

/** 사례 01(급식 안내)에서 가져올 정보를 직접 써서 그대로 둠: 외부 데이터 칸에 맞는 도구가 없다. 화면·배포는 정해 둔다 */
const pokemon: Partial<Session> = {
  answers: { ...g1.answers, 'q.domain': 'custom', 'q.aitool-chat': 'unknown' },
  notes: { 'q.domain': '포켓몬 도감 정보' },
  cart: ['html-single', 'github-pages'],
};

test('2단계: 맞는 도구가 없는 칸 → [목록에 없는 도구 쓰기] → PokeAPI → [직접 쓴 도구로 두기] → 맨 위 줄 → [PokeAPI로 정하기] → 3단계 서행 → 설계도 → 링크에 이름 없음', async ({ page, browser }) => {
  await openAt(page, '/waypoints', pokemon);
  await chipOf(page, '외부 데이터').click();
  await expect(page.locator('#w-slot .w-alert')).toContainText(ko.shop.noProduct);
  // 줄: 연필 SVG + '목록에 없는 도구 쓰기', 펼치면 초점이 글 칸
  await expect(slotRow(page)).toContainText(ko.shop.customRow);
  await expect(slotRow(page).locator('svg[aria-hidden="true"]')).toHaveCount(1);
  await slotRow(page).focus();
  await page.keyboard.press('Enter');
  await expect(slotField(page)).toBeFocused();
  await expect(slotField(page)).toHaveAttribute('spellcheck', 'false');
  await expect(page.locator('#w-slot .custom-help')).toHaveText(`${ko.shop.customHint} ${ko.custom.privacy}`);
  await page.keyboard.type('PokeAPI');
  await page.keyboard.press('Enter');
  await expect(slotFound(page)).toHaveText(ko.shop.customNone);
  await expect(slotFound(page)).toBeFocused();
  await expect(page.locator('#w-slot .custom-result')).toContainText(ko.shop.customKeepNote);
  expect(await serious(page)).toEqual([]);
  await page.getByRole('button', { name: ko.shop.customKeep }).click();
  // 칸 목록 맨 위에 직접 쓴 도구 줄이 '고를 예정'으로 눌리고 초점을 받는다. 장바구니에는 아직 없다
  const mine = page.locator('#w-slot .w-row[data-product="custom-1"]');
  await expect(mine).toBeFocused();
  await expect(mine).toHaveAttribute('aria-pressed', 'true');
  await expect(mine).toContainText(ko.shop.customLine);
  await expect(mine.locator('.list-value')).toHaveText(ko.shop.customCost);
  await expect(page.locator('#w-slot .w-row').first()).toHaveAttribute('data-product', 'custom-1');
  await expect(page.locator('#cc-live')).toContainText(fill(ko.shop.customKept, { name: 'PokeAPI' }));
  let s = await savedTools(page);
  expect(s.customTools).toEqual([{ id: 'custom-1', name: 'PokeAPI', capability: 'data' }]);
  expect(s.cart).not.toContain('custom-1');
  // 같은 이름은 다시 둘 수 없다
  await slotRow(page).click();
  await slotField(page).fill('poke api');
  await slotField(page).press('Enter');
  await expect(page.locator('#w-slot .custom-error')).toHaveText(ko.shop.customDuplicate);
  await page.keyboard.press('Escape');
  // 정하기: 아래 막대 주 버튼 이름에 도구 이름 (조사는 받침에 맞게)
  const save = page.locator('.action-bar button.w-save');
  await expect(save).toHaveText(fill(ko.shop.pickAs, { dir: josa('PokeAPI', 'dir') }));
  await save.click();
  await expect.poll(async () => (await savedTools(page)).cart).toContain('custom-1');
  await expect(chipOf(page, '외부 데이터')).toHaveClass(/is-chosen/);

  // 3단계: 막힌 곳 0, 그대로 가는 곳(서행)에 직접 쓴 도구 줄 + [도구 바꾸기](그 칸을 연 도구 고르기)
  await page.goto('/check');
  await islandsReady(page);
  await expect(page.locator('.ck-jam')).toHaveCount(0);
  const slow = page.locator('[data-kept="conflict.custom-tool:custom-1"]');
  await expect(slow.locator('.pill-warn')).toHaveText(ko.check.statusKept);
  await expect(slow).toContainText(fill(T.customTool.message, { name: 'PokeAPI' }));
  await expect(slow.getByRole('link', { name: fill(ko.check.actionLabel, { where: '외부 데이터', action: ko.check.change }) })).toHaveAttribute('href', '/waypoints?slot=slot.data');
  await expect(page.locator('.action-bar .btn-issue')).not.toHaveAttribute('aria-disabled', 'true');

  // 4단계 설계도: 1번 '내 말 그대로' 줄과 내 말, 7번 '이름 (직접 씀)' + 나머지 칸 '확인 필요', 9번 '직접 쓴 도구 확인하기: 이름'
  await page.goto('/arrival');
  await islandsReady(page);
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: ko.receipt.tabs.pack }).click();
  const pack = page.locator('#panel-pack .pack-pre');
  await expect(pack).toContainText(`PokeAPI ${T.customTool.mark}`);
  const md = (await pack.textContent()) ?? '';
  const sec = (heading: string): string => md.split(/^## /m).find((x) => x.startsWith(heading)) ?? '';
  const one = sec(T.pack.headings.what);
  expect(one).toContain(`${T.pack.mine.label}:`);
  expect(one).toContain('“포켓몬 도감 정보”');
  const seven = sec(T.pack.headings.tools);
  const cells = (seven.split('\n').find((l) => l.startsWith('|') && l.includes('PokeAPI')) ?? '').split('|').map((c) => c.trim()).filter(Boolean);
  // 맡는 일 | 이름 (직접 씀), 링크 없음 | 나머지 칸은 모두 '확인 필요'
  expect(cells[1]).toBe(`PokeAPI ${T.customTool.mark}`);
  expect(cells.length).toBeGreaterThan(2);
  expect(cells.slice(2).every((c) => c === T.customTool.unchecked)).toBe(true);
  expect(sec(T.pack.headings.research)).toContain(fill(T.customTool.researchArea, { name: 'PokeAPI' }));

  // 영수증 링크: 직접 쓴 글·도구 이름이 없고, 맡은 기능만(x). 링크로 열면 이름 자리에 '직접 쓴 도구'
  const own = evaluate(cat, (await page.evaluate(() => JSON.parse(localStorage.getItem('cc:session:v1') ?? '{}'))) as Partial<Session>).session;
  const state = JSON.stringify(toShareState(own));
  for (const word of ['PokeAPI', '포켓몬']) expect(state).not.toContain(word);
  expect(toShareState(own).x).toEqual({ 'custom-1': 'data' });
  const other = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const pc = await other.newPage();
  await pc.goto(`/arrival${shareHash(own)}`);
  await islandsReady(pc);
  await expect(pc.locator('.paper')).toContainText(T.customTool.hiddenName);
  await expect(pc.locator('.paper')).not.toContainText('PokeAPI');
  // 그 영수증으로 이어서 가면 이름 없이 맡은 기능만 남는다: 3단계 서행 줄도 이름 없는 문장
  await pc.getByRole('button', { name: ko.receipt.continueHere }).click();
  await expect(pc.locator('#cc-live')).toContainText(ko.receipt.continued);
  await pc.goto('/check');
  await islandsReady(pc);
  const hidden = pc.locator('[data-kept="conflict.custom-tool:custom-1"]');
  await expect(hidden).toContainText(T.customTool.messageHidden);
  await expect(hidden).not.toContainText('PokeAPI');
  await other.close();
});

test('"수파베이스" → 이미 목록에 있는 도구예요: Supabase → [이 도구로 고르기] → Supabase 줄이 고를 예정, 초점', async ({ page }) => {
  await openAt(page, '/waypoints', { answers: golden('case-04').answers });
  await chipOf(page, '저장').click();
  await slotRow(page).click();
  await slotField(page).fill('수파베이스');
  await page.getByRole('button', { name: ko.custom.submit, exact: true }).click();
  await expect(slotFound(page)).toHaveText(fill(ko.shop.customSame, { name: 'Supabase' }));
  await page.getByRole('button', { name: ko.shop.customSamePick }).click();
  const row = page.locator('#w-slot .w-row[data-product="supabase"]');
  await expect(row).toBeFocused();
  await expect(row).toHaveAttribute('aria-pressed', 'true');
  await expect(slotRow(page)).toHaveAttribute('aria-expanded', 'false');
  expect((await savedTools(page)).customTools ?? []).toEqual([]);
});

test("막힌 곳 '바꾸기' 끝 [목록에 없는 도구 쓰기 ›] → 2단계 그 칸, 도구 이름 칸이 펼쳐지고 초점이 글 칸 (주소의 write는 뗀다)", async ({ page }) => {
  // 사례 03: 실시간이 필요한데 고른 데이터 도구가 하루 단위 → 외부 데이터를 직접 쓴 도구로 바꾸면 풀린다
  const c = golden('case-03');
  await openAt(page, '/check', { answers: c.answers, cart: c.cart });
  const jam = page.locator('.ck-jam[data-conflict="conflict.realtime-mismatch"]');
  const write = jam.locator('.ck-write');
  await expect(write).toContainText(ko.check.writeTool);
  await expect(write).toHaveAttribute('href', '/waypoints?slot=slot.data&write=1');
  expect(await serious(page)).toEqual([]);
  await write.click();
  await page.waitForURL(/\/waypoints/);
  await islandsReady(page);
  await expect(page.locator('#w-slot-title')).toHaveText(fill(ko.shop.slotTitle, { obj: josa('외부 데이터', 'obj') }));
  await expect(slotRow(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(slotField(page)).toBeFocused();
  await expect.poll(() => new URL(page.url()).search).toBe('?slot=slot.data');
});

test("직접 써도 풀리지 않는 막힌 곳(서버 위치를 몰라 남는 개인정보 막힌 곳)에는 [목록에 없는 도구 쓰기 ›]를 달지 않는다", async ({ page }) => {
  const c = golden('case-04');
  await openAt(page, '/check', { answers: c.answers, cart: c.cart });
  const jam = page.locator('.ck-jam[data-conflict="conflict.personal-server"]');
  await expect(jam).toBeVisible();
  await expect(jam.locator('.ck-write')).toHaveCount(0);
  // 바꾸기·그대로 가기는 그대로 있다
  await expect(jam.locator('.ck-pair > *')).toHaveCount(2);
});

test("빌더가 맡은 공개 칸: 칩은 '쓰는 웹 빌더가 맡아요', 칸은 한 줄 + [다른 곳에 공개하기] → 목록과 도구 이름 칸(초점)", async ({ page }) => {
  const c = golden('case-31');
  await openAt(page, '/waypoints', { answers: c.answers, cart: c.cart });
  const host = chipOf(page, '배포·공유');
  await expect(host).toContainText(ko.shop.builderChip);
  await expect(host).not.toContainText(ko.shop.filled);
  await host.click();
  await expect(page.locator('#w-slot .w-builder')).toContainText(ko.shop.builderLine);
  await expect(page.locator('#w-slot .w-row')).toHaveCount(0);
  await page.getByRole('button', { name: ko.shop.builderOther }).click();
  await expect(page.locator('#w-slot .w-row').first()).toBeVisible();
  await expect(page.locator('#w-slot .tag-reco')).toHaveCount(0);
  await expect(slotField(page)).toBeFocused();
  expect(await serious(page)).toEqual([]);
});

test("도구 줄 꼬리표(표시만): 카드를 등록해야 하는 도구에 '결제 카드 필요', 승인을 기다리는 도구에 '승인 기다림'", async ({ page }) => {
  await openAt(page, '/waypoints', { answers: g1.answers });
  await chipOf(page, '배포·공유').click();
  await expect(page.locator('#w-slot .w-row[data-product="heroku"] .w-tags')).toContainText(ko.shop.paymentCard);
  await expect(page.locator('#w-slot .w-row[data-product="github-pages"] .w-tags')).toHaveCount(0);
});

test("도구 줄 꼬리표: 관리자 승인이 필요한 도서관 정보나루는 '승인 기다림 · 며칠'", async ({ page }) => {
  await openAt(page, '/waypoints', { answers: golden('case-19').answers });
  await chipOf(page, '외부 데이터').click();
  await expect(page.locator('#w-slot .w-row[data-product="data4library"] .w-tags')).toHaveText(ko.shop.waitDays);
  expect(await serious(page)).toEqual([]);
});

test('지난 영수증: 직접 쓴 앱은 이 브라우저의 진행과 같은 영수증일 때만 내 말이 이름, 다른 영수증은 내 앱', async ({ page }) => {
  const mineSession: Partial<Session> = { answers: { ...g1.answers, 'q.type': 'custom' }, notes: { 'q.type': '반려식물 물 주기 알림' }, cart: g1.cart };
  const mineHash = shareHash(evaluate(cat, mineSession).session).slice('#r='.length);
  const otherHash = shareHash(evaluate(cat, { answers: { ...g1.answers, 'q.type': 'custom' }, cart: ['html-single'] }).session).slice('#r='.length);
  expect(mineHash).not.toContain('반려');
  await openAt(page, '/receipts', mineSession, {
    'cc:receipts:v1': [
      { r: mineHash, type: 'custom', at: '2026-10-14 09:00' },
      { r: otherHash, type: 'custom', at: '2026-10-13 09:00' },
    ],
  });
  const names = page.locator('.receipts-list .list-name');
  await expect(names).toHaveText(['반려식물 물 주기 알림', ko.receipts.unnamed]);
  await expect(page.locator('.receipts-list')).not.toContainText(ko.custom.row);
});

test('도구 모음: 검색 0건이면 "찾는 도구가 없으면 도구를 고를 때 직접 쓸 수 있어요."', async ({ page }) => {
  await page.goto('/tools');
  await islandsReady(page);
  const q = await hydrated(page.locator('#shelf-q'));
  await q.fill('qxzqvjk');
  await expect(page.locator('.shelf-none')).toContainText(ko.shelf.none);
  await expect(page.locator('.shelf-none')).toContainText(ko.shelf.noneCustom);
});

// ── 360px 펼친 상태: 가로 스크롤 0 · 44px 미만 버튼 0 · axe 심각·치명 0 (밝게·어둡게) ─────────────
// qa:shots는 처음 상태만 찍으므로, 펼친 칸과 찾은 결과는 여기서 본다 (scripts/qa/shots.ts와 같은 기준).

async function layoutIssues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`가로 스크롤 ${document.documentElement.scrollWidth}px`);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], input:not([type="hidden"]), select, summary, a'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden') continue;
      // 문장 속 링크와 점선 밑줄 말은 WCAG 2.5.8 예외(Inline)
      if ((el.tagName === 'A' && style.display === 'inline') || el.classList.contains('term-mark')) continue;
      if (r.width < 44 || r.height < 44) out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test(`360px ${scheme}: 1단계 펼친 칸·찾은 결과·2×2 아래 줄·다시 보인 보기에 가로 스크롤·작은 버튼·axe 문제가 없다`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await open(page, allBut('q.save'));
    await expect(page.locator('h1#q-title')).toContainText(q('q.save').text);
    await row(page).click();
    await expect(field(page)).toBeFocused();
    expect(await layoutIssues(page)).toEqual([]);
    expect(await serious(page)).toEqual([]);
    // 찾은 결과 하나
    await field(page).fill('저장은 필요 없어요');
    await field(page).press('Enter');
    await expect(found(page)).toBeFocused();
    expect(await layoutIssues(page)).toEqual([]);
    expect(await serious(page)).toEqual([]);
    // 못 찾음: 보기가 6개 이하라 모든 보기를 [○○로 고르기]로 다시 보인다
    await page.getByRole('button', { name: ko.custom.retry }).click();
    await field(page).fill('포켓몬');
    await field(page).press('Enter');
    await expect(found(page)).toHaveText(ko.custom.notFound);
    await expect(page.locator('.q .custom-actions.is-options button')).not.toHaveCount(0);
    expect(await layoutIssues(page)).toEqual([]);
    expect(await serious(page)).toEqual([]);
  });

  test(`360px ${scheme}: 2단계 도구 이름 칸·결과·직접 쓴 도구 줄, 3단계 '바꾸기' 끝 줄에 가로 스크롤·작은 버튼·axe 문제가 없다`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openAt(page, '/waypoints?slot=slot.data&write=1', pokemon);
    await expect(slotField(page)).toBeFocused();
    await slotField(page).fill('PokeAPI');
    await slotField(page).press('Enter');
    await expect(slotFound(page)).toBeFocused();
    expect(await layoutIssues(page)).toEqual([]);
    expect(await serious(page)).toEqual([]);
    await page.getByRole('button', { name: ko.shop.customKeep }).click();
    await expect(page.locator('#w-slot .w-row[data-product="custom-1"]')).toBeFocused();
    // 눌린 줄 아래 '자세히'를 펼치면 설명 + [이 도구 지우기]
    await page.locator('#w-slot .w-more[aria-expanded="false"]').first().click();
    await expect(page.getByRole('button', { name: fill(ko.shop.customRemoveLabel, { name: 'PokeAPI' }) })).toBeVisible();
    expect(await layoutIssues(page)).toEqual([]);
    expect(await serious(page)).toEqual([]);
    const c = golden('case-03');
    await page.evaluate((s) => localStorage.setItem('cc:session:v1', JSON.stringify({ kept: [], deferred: [], ...s })), { answers: c.answers, cart: c.cart });
    await page.goto('/check');
    await islandsReady(page);
    await expect(page.locator('.ck-jam .ck-write').first()).toBeVisible();
    expect(await layoutIssues(page)).toEqual([]);
    expect(await serious(page)).toEqual([]);
  });
}

// ── 긴 내 말이 전체 폭 줄을 넘치지 않는다 (WCAG 1.4.10 리플로, CLAUDE.md 8조) ─────────────
// 휴대폰 흉내(isMobile)에서는 넘친 만큼 화면 폭이 넓어져 넘침이 0으로 보이므로, 흉내 없이 360px로 잰다.
test.describe('360px (휴대폰 흉내 없이)', () => {
  test.use({ isMobile: false, hasTouch: false, viewport: { width: 360, height: 800 } });

  const LONG = [
    ['띄어쓰기 있는 34자', '우리 동네 강아지 산책 모임 일정을 한눈에 보는 작은 페이지'],
    ['띄어쓰기 없는 40자', '가'.repeat(40)],
    ['주소 같은 글', 'https://example.com/aaaaaaaaaaaaaaaaaa'],
  ] as const;

  for (const [name, note] of LONG) {
    test(`${name}: 앱 종류 타일 아래·2×2 아래 전체 폭 줄의 '내 말' 둘째 줄이 줄을 바꿔 가로로 넘치지 않는다`, async ({ page }) => {
      await open(page, {}, { notes: { 'q.type': note, 'q.save': note } });
      await expect(row(page)).toContainText(fill(ko.custom.rowNote, { text: note }));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const box = await row(page).boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
      // 2×2 질문으로 (새 탭: 저장을 다시 심는다)
      const page2 = await page.context().newPage();
      await open(page2, allBut('q.save'), { notes: { 'q.save': note } });
      await expect(page2.locator('h1#q-title')).toContainText(q('q.save').text);
      await expect(page2.locator('.pick-custom .custom-row')).toContainText(fill(ko.custom.rowNote, { text: note }));
      expect(await page2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page2.close();
    });
  }
});
