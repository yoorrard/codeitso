// 도구끼리 맞춰 보기 (brief 6.7)와 설계도 받기 (brief 6.8, D70).
// 도구끼리 맞춰 보기: 막힌 곳마다 같은 크기 중립 버튼 둘([도구 바꾸기] [그대로 가기]), 그대로 가면 '그대로 가는 곳' 줄과 [되돌리기],
// 미룰 수 있는 빈 기능은 [나중으로 미루기], 비워 둘 수 없으면 '통행 불가' + [도구 고르기]. 주 버튼은 하나이고, 꺼진 까닭은 상태 한 줄.
// 설계도 받기: 칸 고르개 4칸을 화살표 키로, 영수증 링크로 열면 꼬리표와 중립 버튼 [이 영수증으로 이어서 가기], 주 버튼 [설계도 내려받기 (.md)].
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { evaluate, fill } from '../../src/lib/engine/index.ts';
import { makeCatalog } from '../../src/lib/engine/index.ts';
import { shareHash } from '../../src/lib/share.ts';
import { loadData } from '../../scripts/lib/load-data.ts';
import { golden, islandsReady } from './helpers.ts';

interface Seed {
  answers: Record<string, string>;
  cart: string[];
  kept?: string[];
  deferred?: string[];
}

/** 저장된 진행을 심고 화면을 연다 (다시 불러와도 처음 심은 것을 덮어쓰지 않는다) */
async function open(page: Page, route: string, s: Seed | null, meta: Record<string, unknown> | null = null): Promise<void> {
  await page.addInitScript(
    ([seed, m]) => {
      if (sessionStorage.getItem('e2e-seeded')) return;
      sessionStorage.setItem('e2e-seeded', '1');
      if (seed) localStorage.setItem('cc:session:v1', JSON.stringify({ kept: [], deferred: [], ...seed }));
      if (m) localStorage.setItem('cc:meta:v1', JSON.stringify(m));
    },
    [s, meta] as const,
  );
  await page.goto(route);
  await islandsReady(page);
}

const saved = (page: Page): Promise<Required<Seed>> => page.evaluate(() => JSON.parse(localStorage.getItem('cc:session:v1') ?? '{}') as Required<Seed>);
const primary = (page: Page) => page.locator('.btn-primary:visible');
const issue = (page: Page) => page.locator('.action-bar .btn-issue');
const status = (page: Page) => page.locator('.action-bar .status-line');

test.describe('도구끼리 맞춰 보기', () => {
  test('잠김: 빈 상태 하나와 주 버튼 하나 [만들 앱 정하러 가기] (상태 한 줄과 같은 까닭)', async ({ page }) => {
    await open(page, '/check', null);
    await expect(page.locator('h1')).toHaveText(ko.check.locked);
    await expect(primary(page)).toHaveCount(1);
    await expect(primary(page)).toHaveText(ko.check.toInterview);
    await expect(primary(page)).toHaveAttribute('href', '/destination');
    await expect(status(page)).toContainText(ko.progress.status.locked);
  });

  test('그대로 가기: 막힌 곳이 그대로 가는 곳(서행)으로 옮겨 가고, 사건 메시지 뒤 주 버튼이 켜진다. [되돌리기]로 되돌린다', async ({ page }) => {
    await open(page, '/check', golden('case-04'));
    const jam = page.locator('.ck-jam');
    await expect(page.locator('#ck-jams')).toHaveText(fill(ko.check.jamTitle, { n: 1 }));
    await expect(jam).toHaveCount(1);
    await expect(jam.locator('.pill-bad')).toHaveText(ko.check.statusOpen);
    // 같은 크기 중립 버튼 둘이 나란히 (한쪽으로 몰지 않는다)
    const [change, keep] = [jam.locator('.ck-pair > *').nth(0), jam.locator('.ck-pair > *').nth(1)];
    await expect(change).toHaveText(ko.check.change);
    await expect(change).toHaveAttribute('href', '/waypoints?slot=slot.store');
    await expect(keep).toHaveText(ko.check.keep);
    const [a, b] = [await change.boundingBox(), await keep.boundingBox()];
    expect(Math.round(a?.width ?? 0)).toBe(Math.round(b?.width ?? 1));
    expect(Math.round(a?.y ?? 0)).toBe(Math.round(b?.y ?? 1));
    await expect(jam.locator('.ck-note')).toHaveText(ko.check.keepNote);
    // 꺼진 주 버튼: 까닭은 상태 한 줄이 맡는다 (따로 붙던 설명 줄은 없다)
    await expect(issue(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(issue(page)).toHaveAttribute('aria-describedby', 'status-line');
    await expect(status(page)).toContainText(fill(ko.progress.status.blocked, { n: 1 }));
    await expect(page.locator('.issue-reason, .issue-note')).toHaveCount(0);

    await keep.click();
    await expect(jam).toHaveCount(0);
    await expect(page.locator('#cc-live')).toContainText(ko.check.keptAnnounce);
    // 다 풀린 알림은 화면의 사건 메시지만: 단계 줄의 '이제 설계도를 받을 수 있어요.'를 겹쳐 읽지 않는다
    await expect(page.locator('#cc-live')).toContainText(ko.dispatch.checkDone);
    await expect(page.locator('#cc-live')).not.toContainText(ko.layout.opened.arrival);
    // 메시지와 다 풀린 지도가 보이게 맨 위로 (주 버튼으로 옮긴 초점이 페이지를 끝으로 굴리지 않는다)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(8);
    await expect(issue(page)).toBeFocused();
    const row = page.locator('.ck-row', { has: page.locator('.pill-warn') });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('저장');
    // 둘째 줄: 무엇을 알고 그대로 가는지 (막힌 곳 설명의 첫 문장)
    await expect(row.locator('.list-sub')).not.toBeEmpty();
    await expect(page.locator('.dispatch-note')).toContainText(ko.dispatch.checkDone);
    await expect(issue(page)).not.toHaveAttribute('aria-disabled', 'true');
    await expect(issue(page)).not.toHaveAttribute('aria-describedby', /./);
    expect((await saved(page)).kept).toContain('conflict.personal-server');

    const undo = row.getByRole('button', { name: fill(ko.check.undoKeepLabel, { where: '저장' }) });
    await expect(undo).toHaveText(ko.check.undoKeep);
    await undo.click();
    await expect(jam).toHaveCount(1);
    // 누른 줄이 사라지면 초점은 되돌아온 막힌 곳의 첫 버튼으로 (WCAG 2.4.3)
    await expect(jam.locator('.ck-pair > *').first()).toBeFocused();
    await expect(issue(page)).toHaveAttribute('aria-disabled', 'true');
    expect((await saved(page)).kept).not.toContain('conflict.personal-server');
  });

  test('미룰 수 있는 빈 기능은 [나중으로 미루기]: 나중에 붙일 것에 적히고 [되돌리기]로 돌아온다', async ({ page }) => {
    await open(page, '/check', { answers: golden('case-19').answers, cart: ['html-single', 'browser-storage', 'data4library', 'cloudflare-workers'] });
    const jam = page.locator('.ck-jam', { hasText: '로그인' });
    await expect(jam.locator('.ck-pair > *').nth(0)).toHaveText(ko.check.pick);
    await jam.getByRole('button', { name: fill(ko.check.actionLabel, { where: '로그인', action: ko.check.deferJam }) }).click();
    await expect(jam).toHaveCount(0);
    expect((await saved(page)).deferred).toContain('slot.auth');
    const later = page.locator('section[aria-labelledby="ck-later"]');
    await expect(later).toContainText('로그인');
    await later.getByRole('button', { name: fill(ko.check.undoDeferLabel, { slot: '로그인' }) }).click();
    await expect(page.locator('.ck-jam', { hasText: '로그인' })).toHaveCount(1);
    expect((await saved(page)).deferred).not.toContain('slot.auth');
  });

  test('비워 둘 수 없는 기능은 통행 불가 + [도구 고르기]. 꺼진 주 버튼을 누르면 가지 않고 막힌 곳 제목으로 초점이 온다', async ({ page }) => {
    await open(page, '/check', { answers: golden('case-01').answers, cart: ['neis-meal', 'google-sheets-apps-script'] });
    const jam = page.locator('.ck-jam', { hasText: '화면' });
    await expect(jam.locator('.ck-closed')).toHaveText(ko.check.cannotKeep);
    await expect(jam.getByRole('button', { name: new RegExp(ko.check.keep) })).toHaveCount(0);
    await expect(jam.getByRole('link', { name: fill(ko.check.actionLabel, { where: '화면', action: ko.check.pick }) })).toHaveAttribute('href', '/waypoints?slot=slot.screen');
    // 꺼진 버튼(aria-disabled)도 키보드로 닿고 눌린다: 가지 않고 까닭을 알린다
    await issue(page).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/check$/);
    await expect(page.locator('#ck-jams')).toBeFocused();
    await expect(page.locator('#cc-live')).toContainText(fill(ko.progress.status.blocked, { n: 1 }));
  });

  test('주 버튼은 하나이고 아래 막대 폭을 채운다 (섬이 display: contents여도 줄어들지 않는다)', async ({ page }) => {
    await open(page, '/check', golden('case-01'));
    await expect(primary(page)).toHaveCount(1);
    const bar = await page.locator('.action-main').boundingBox();
    const btn = await issue(page).boundingBox();
    expect(Math.round(btn?.width ?? 0)).toBe(Math.round(bar?.width ?? 1));
    await expect(page.locator('.dispatch-note')).toContainText(ko.dispatch.checkDone);
    // 할 일보다 아래: 접기 '원활 n개'와 '이렇게 이해했어요'
    await expect(page.locator('.ck-fold > summary').last()).toHaveText(ko.check.understood);
    await issue(page).click();
    await page.waitForURL(/\/arrival$/);
  });
});

test.describe('설계도 받기', () => {
  const issued = { sent: [], issued: true, lessonDone: true };

  test('잠김은 상태 한 줄과 같은 까닭의 빈 상태 하나와 주 버튼 하나', async ({ page }) => {
    await open(page, '/arrival', null);
    await expect(page.locator('h1')).toHaveText(ko.receipt.lockedDestination);
    await expect(primary(page)).toHaveCount(1);
    await expect(primary(page)).toHaveText(ko.receipt.toInterview);
    await expect(status(page)).toContainText(ko.progress.status.locked);
  });

  test('막힌 곳이 남으면 [도구끼리 맞춰 보러 가기] 하나', async ({ page }) => {
    await open(page, '/arrival', golden('case-04'));
    await expect(page.locator('h1')).toHaveText(ko.receipt.blocked);
    await expect(primary(page)).toHaveCount(1);
    await expect(primary(page)).toHaveText(ko.receipt.toCheck);
    await expect(status(page)).toContainText(ko.progress.status.lockedFix);
  });

  test('도착: 사건 메시지, 건네드릴 것 카드, 칸 고르개 4칸을 화살표 키로 옮기고, 주 버튼은 [설계도 내려받기 (.md)] 하나', async ({ page }) => {
    await open(page, '/arrival', golden('case-01'), issued);
    await expect(page.locator('.dispatch-note')).toContainText(ko.dispatch.arrival);
    await expect(page.locator('.ar-handover')).toContainText(ko.receipt.handoverTitle);
    await expect(status(page)).toContainText(ko.progress.status.issued);
    await expect(primary(page)).toHaveCount(1);
    const download = page.locator('.action-bar').getByRole('button', { name: ko.receipt.download });
    await expect(download).toBeVisible();

    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveText([ko.receipt.tabs.receipt, ko.receipt.tabs.pack, ko.receipt.tabs.study, ko.receipt.tabs.cards]);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-receipt .paper')).toBeVisible();
    // 360px에서도 칸이 잘리지 않는다 (한 줄, 칸 안)
    for (const t of await tabs.all()) {
      const box = await t.boundingBox();
      expect(box?.height ?? 99).toBeLessThanOrEqual(44);
    }
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: ko.receipt.tabs.pack })).toBeFocused();
    await expect(page.getByRole('tab', { name: ko.receipt.tabs.pack })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-pack')).toBeVisible();
    await expect(page.locator('#panel-receipt')).toBeHidden();
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: ko.receipt.tabs.cards })).toBeFocused();
    await expect(page.locator('#panel-cards .paste').first()).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: ko.receipt.tabs.receipt })).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('tab', { name: ko.receipt.tabs.cards })).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.getByRole('tab', { name: ko.receipt.tabs.receipt })).toHaveAttribute('aria-selected', 'true');
    // Tab은 칸 고르개를 떠나 열린 칸으로 간다
    await page.keyboard.press('Tab');
    await expect(page.locator('#panel-receipt')).toBeFocused();

    const file = page.waitForEvent('download');
    await download.click();
    expect((await file).suggestedFilename()).toMatch(/\.md$/);
    await expect(page.locator('.ar-end')).toHaveText(ko.receipt.end);
  });

  test('영수증 밖 칸 셋은 첫 묶음 밖이고 영수증을 그린 뒤 한 번 미리 받는다 (D82, 설계서 L-08): 열면 내용이 바로 나오며 초점은 칸 이름에 남는다', async ({ page }) => {
    const asked: string[] = [];
    page.on('request', (req) => {
      if (/ReceiptTabs\.[^/]+\.js$/.test(req.url())) asked.push(req.url());
    });
    await open(page, '/arrival', golden('case-01'), issued);
    await expect(page.locator('#panel-receipt .paper')).toBeVisible();
    // 칸을 누르지 않아도 쉬는 시간에 받는다 (실패할 틈과 '불러오는 중' 번쩍임을 줄인다)
    await expect.poll(() => asked.length).toBe(1);
    await page.getByRole('tab', { name: ko.receipt.tabs.study }).click();
    await expect(page.locator('#panel-study a.list-row').first()).toBeVisible();
    await expect(page.getByRole('tab', { name: ko.receipt.tabs.study })).toBeFocused();
    await expect(page.locator('#panel-study')).not.toHaveAttribute('aria-busy', 'true');
    // 다른 칸도 이미 받은 묶음으로 바로 그린다
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#panel-cards .paste').first()).toBeVisible();
    expect(asked).toHaveLength(1);
  });

  test('칸 안을 못 받으면 열린 칸에 한 줄과 중립 버튼 [새로 고치기] (알림도 같은 말). 새로 고치면 칸 내용이 나오고, 주 버튼 내려받기는 망과 상관없다', async ({ page }) => {
    const blocked = /ReceiptTabs\.[^/]+\.js$/;
    await page.route(blocked, (route) => route.abort());
    await open(page, '/arrival', golden('case-01'), issued);
    await expect(page.locator('#panel-receipt .paper')).toBeVisible();
    await page.getByRole('tab', { name: ko.receipt.tabs.pack }).click();
    const failed = page.locator('#panel-pack .ar-failed');
    await expect(failed).toContainText(ko.receipt.tabFailed);
    await expect(page.locator('#cc-live')).toHaveText(ko.receipt.tabFailed);
    const again = failed.getByRole('button', { name: ko.receipt.tabReload });
    await expect(again).not.toHaveClass(/btn-primary/);
    await expect(primary(page)).toHaveCount(1);
    // 설계도 쪽 묶음은 아래 막대 섬과 함께 왔으므로 칸을 못 받아도 내려받기는 된다
    const file = page.waitForEvent('download');
    await page.locator('.action-bar').getByRole('button', { name: ko.receipt.download }).click();
    expect((await file).suggestedFilename()).toMatch(/\.md$/);

    await page.unroute(blocked);
    await Promise.all([page.waitForEvent('load'), again.click()]);
    await islandsReady(page);
    await page.getByRole('tab', { name: ko.receipt.tabs.pack }).click();
    await expect(page.locator('#panel-pack').getByRole('button', { name: ko.receipt.copyPack })).toBeVisible();
    await expect(page.locator('#panel-pack .ar-failed')).toHaveCount(0);
  });

  test('영수증 링크로 연 것도 칸을 못 받아 [새로 고치기]를 누르면 같은 영수증이 다시 열린다 (읽자마자 지운 링크를 되돌려 놓는다)', async ({ page }) => {
    const cat = makeCatalog(loadData());
    const c = golden('case-03');
    const hash = shareHash(evaluate(cat, { answers: c.answers, cart: c.cart, kept: ['conflict.realtime-mismatch'] }).session);
    const blocked = /ReceiptTabs\.[^/]+\.js$/;
    await page.route(blocked, (route) => route.abort());
    await page.goto(`/arrival${hash}`);
    await islandsReady(page);
    await expect(page.locator('.ar-shared-tag')).toHaveText(ko.receipt.sharedTag);
    const no = (await page.locator('.paper .r-meta').innerText()).match(/\d{4}$/)?.[0];
    expect(no).toMatch(/^\d{4}$/);
    await page.getByRole('tab', { name: ko.receipt.tabs.study }).click();
    await page.unroute(blocked);
    await Promise.all([page.waitForEvent('load'), page.locator('#panel-study').getByRole('button', { name: ko.receipt.tabReload }).click()]);
    await islandsReady(page);
    await expect(page.locator('.ar-shared-tag')).toHaveText(ko.receipt.sharedTag);
    await expect(page.locator('.paper .r-meta')).toContainText(`${no}`);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('영수증 머리의 번호 4자리는 지난 영수증 줄과 같다', async ({ page }) => {
    await open(page, '/arrival', golden('case-01'), issued);
    const no = (await page.locator('.paper .r-meta').innerText()).match(/\d{4}$/)?.[0];
    expect(no).toMatch(/^\d{4}$/);
    await page.goto('/receipts');
    await islandsReady(page);
    await expect(page.locator('.receipts-list .list-sub').first()).toContainText(`${no}`);
  });

  test('영수증 링크로 열면: 꼬리표 받은 영수증 보기, 중립 버튼 [이 영수증으로 이어서 가기], 주 버튼은 내려받기 하나, 방문 통계 없음', async ({ page }) => {
    const cat = makeCatalog(loadData());
    const c = golden('case-03');
    const hash = shareHash(evaluate(cat, { answers: c.answers, cart: c.cart, kept: ['conflict.realtime-mismatch'] }).session);
    await page.goto(`/arrival${hash}`);
    await islandsReady(page);
    await expect(page.locator('.ar-shared-tag')).toHaveText(ko.receipt.sharedTag);
    await expect(page.locator('.dispatch-note')).toHaveCount(0);
    const cont = page.getByRole('button', { name: ko.receipt.continueHere });
    await expect(cont).toBeVisible();
    await expect(cont).not.toHaveClass(/btn-primary/);
    await expect(primary(page)).toHaveCount(1);
    await expect(primary(page)).toContainText(ko.receipt.download);
    await expect(status(page)).toContainText(ko.progress.status.sharedView);
    await expect(page.locator('script[src*="cloudflareinsights"]')).toHaveCount(0);
    await expect(page.locator('.paper')).toBeVisible();
  });

  for (const mode of ['기기 설정', '사이트 설정'] as const) {
    test(`동작 줄이기(${mode})에서도 도착 알림을 읽고, 장면을 본 것으로 적는다`, async ({ page }) => {
      if (mode === '기기 설정') await page.emulateMedia({ reducedMotion: 'reduce' });
      else await page.addInitScript(() => localStorage.setItem('cc:prefs:v1', JSON.stringify({ motion: 'reduce', sound: false })));
      await open(page, '/arrival', golden('case-01'), issued);
      await expect(page.locator('#cc-live')).toContainText(ko.dispatch.arrival);
      await expect.poll(() => page.evaluate(() => localStorage.getItem('cc:seen:v1') ?? '')).toContain('arrival');
    });
  }

  test('영수증은 한 번만 뽑는다: 칸을 옮겼다 돌아와도, 다시 열어도 다시 뽑지 않는다', async ({ page }) => {
    await open(page, '/arrival', golden('case-01'), issued);
    await expect(page.locator('#cc-live')).toContainText(ko.dispatch.arrival);
    // 휴대폰에서는 종이가 아래 막대 밑에 있다: 보일 때 뽑는다 (D71 검토 반영)
    await expect(page.locator('.receipt-scene')).toHaveAttribute('data-print', 'wait');
    await page.locator('.receipt-scene').scrollIntoViewIfNeeded();
    await expect(page.locator('.receipt-scene')).toHaveAttribute('data-printed', '');
    const running = () => page.evaluate(() => document.querySelector('.receipt-scene')?.getAnimations({ subtree: true }).length ?? -1);
    await page.getByRole('tab', { name: ko.receipt.tabs.pack }).click();
    await page.getByRole('tab', { name: ko.receipt.tabs.receipt }).click();
    expect(await running()).toBe(0);
    await page.reload();
    await islandsReady(page);
    await expect(page.locator('.receipt-scene')).toHaveAttribute('data-printed', '');
    expect(await running()).toBe(0);
  });

  test('영수증 링크로 열면 지도도 그 영수증 (도착한 빈 터). [이 영수증으로 이어서 가기] 뒤 초점은 H1', async ({ page }) => {
    const cat = makeCatalog(loadData());
    const c = golden('case-03');
    const hash = shareHash(evaluate(cat, { answers: c.answers, cart: c.cart, kept: ['conflict.realtime-mismatch'] }).session);
    await page.goto(`/arrival${hash}`);
    await islandsReady(page);
    await expect(page.locator('.map-band .mb-lot')).toHaveClass(/is-drawn/);
    await expect(page.locator('.map-band .mb-node.is-picked')).not.toHaveCount(0);
    await page.getByRole('button', { name: ko.receipt.continueHere }).click();
    await expect(page.locator('#receipt-title')).toBeFocused();
    await expect(page.locator('.ar-shared-tag')).toHaveCount(0);
  });

  test('진행이 있는데 영수증 링크로 이어 가면: 확인 대화 상자 [바꾸고 이어서 가기] 뒤 초점은 H1, [그만두기]면 누른 버튼', async ({ page }) => {
    const cat = makeCatalog(loadData());
    const c = golden('case-03');
    const theirs = evaluate(cat, { answers: c.answers, cart: c.cart, kept: ['conflict.realtime-mismatch'] }).session;
    const hash = shareHash(theirs);
    await open(page, `/arrival${hash}`, golden('case-01'));
    const cont = page.getByRole('button', { name: ko.receipt.continueHere });
    await cont.click();
    const dialog = page.getByRole('dialog', { name: ko.receipt.continueTitle });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: ko.receipt.continueNo }).click();
    await expect(cont).toBeFocused();
    await cont.click();
    await dialog.getByRole('button', { name: ko.receipt.continueYes }).click();
    await expect(page.locator('#receipt-title')).toBeFocused();
    expect((await saved(page)).cart).toEqual(theirs.cart);
  });

  test('깨진 영수증 링크: 빈 상태와 [처음 화면으로 가기] 하나', async ({ page }) => {
    await page.goto('/arrival#r=zzzz');
    await islandsReady(page);
    await expect(page.locator('h1')).toHaveText(ko.receipt.broken);
    await expect(primary(page)).toHaveCount(1);
    await expect(primary(page)).toHaveText(ko.receipt.home);
    await expect(status(page)).toContainText(ko.progress.status.brokenLink);
  });
});

/** 초점이 selector에 닿을 때까지 Tab (닿지 못하면 실패) */
async function tabTo(page: Page, selector: string, max = 80): Promise<void> {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector)) return;
  }
  throw new Error(`Tab으로 ${selector}에 닿지 못했다`);
}

test('키보드만으로: 막힌 곳 [그대로 가기] → [설계도 받으러 출발하기] → 칸 고르개 → [설계도 내려받기 (.md)]', async ({ page }) => {
  await open(page, '/check', golden('case-04'));
  await tabTo(page, '.ck-jam .ck-pair button');
  await expect(page.locator(':focus')).toHaveText(ko.check.keep);
  await page.keyboard.press('Enter');
  // 누른 버튼이 사라지면 초점은 다음 막힌 곳, 없으면 켜진 주 버튼으로 (WCAG 2.4.3)
  await expect(issue(page)).not.toHaveAttribute('aria-disabled', 'true');
  await expect(issue(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/arrival$/);
  await islandsReady(page);
  await tabTo(page, '[role="tab"][aria-selected="true"]');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#panel-pack')).toBeVisible();
  const file = page.waitForEvent('download');
  await tabTo(page, '.action-bar .ar-go');
  await page.keyboard.press('Enter');
  expect((await file).suggestedFilename()).toMatch(/\.md$/);
});
