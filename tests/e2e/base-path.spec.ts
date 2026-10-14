// 주소 바탕 (설계서 9.4절, D81): GitHub Pages 프로젝트 사이트처럼 /code-chauffeur 아래에서 띄운 하위 주소 빌드(PUBLIC_HOST=static)를 걷는다.
// 홈 → 만들 앱 정하기 한 문항 → 사전 검색 → 용어 풀이 → 도구 상세. 네트워크 404가 0이고, 바탕 밖 요청과 /api/event 요청도 0이어야 한다.
// npm run e2e:base로만 돈다 (.qa/dist-base를 만들고 정적 서버를 --base로 띄움, playwright.config.ts의 base-path 프로젝트).
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { ko } from '../../src/copy/ko.ts';
import { fill } from '../../src/lib/engine/index.ts';
import { islandsReady, questions } from './helpers.ts';

const BASE = '/code-chauffeur';

interface NetLog {
  notFound: string[];
  outside: string[];
  events: string[];
}

/** 같은 사이트 요청을 모두 지켜본다: 404, 바탕 밖, 익명 집계 */
function watch(page: Page): NetLog {
  const log: NetLog = { notFound: [], outside: [], events: [] };
  page.on('request', (req) => {
    const u = new URL(req.url());
    if (!u.protocol.startsWith('http')) return;
    if (u.pathname.endsWith('/api/event')) log.events.push(u.pathname);
    if (u.pathname !== BASE && !u.pathname.startsWith(`${BASE}/`)) log.outside.push(u.pathname);
  });
  page.on('response', (res) => {
    if (res.status() === 404) log.notFound.push(new URL(res.url()).pathname);
  });
  return log;
}

test('하위 주소: 홈 → 만들 앱 정하기 → 사전 검색 → 용어 풀이 → 도구 상세에서 404·바탕 밖 요청·집계 요청이 없다', async ({ page }) => {
  // 어려운 말 풀이의 처음 안내(아래에 뜨는 기사 메시지)는 이미 본 것으로: 누를 자리를 가리지 않게
  await page.addInitScript(() => localStorage.setItem('cc:seen:v1', JSON.stringify({ scenes: ['glossary-hint'] })));
  const net = watch(page);

  // 1. 홈: 주 버튼이 바탕을 품은 주소로 간다
  await page.goto(`${BASE}/`);
  await islandsReady(page);
  const go = page.locator('.home-go');
  await expect(go).toHaveAttribute('href', `${BASE}/destination`);
  await go.click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/destination$`));

  // 2. 만들 앱 정하기: 첫 문항에 답하면 둘째 문항으로
  await islandsReady(page);
  const title = page.locator('h1#q-title');
  await expect(title).toContainText(fill(ko.interview.questionNo, { n: 1 }));
  const firstText = (await title.textContent()) ?? '';
  expect(questions.some((q) => firstText.endsWith(q.text))).toBe(true);
  await page.locator('.q-sheet .pick-tile').first().click();
  await expect(title).toContainText(fill(ko.interview.questionNo, { n: 2 }));

  // 3. 사전 검색: 시트를 열고(늦게 불러오는 묶음) 검색 색인을 바탕 아래에서 받아 찾는다
  await page.locator('.topbar .dict-btn').click();
  await page.locator('#dict-q').fill('API 키');
  const hit = page.locator('dialog[open] .dict-group .list-row').first();
  await expect(hit).toContainText('API 키');
  await expect(hit).toHaveAttribute('href', new RegExp(`^${BASE}/terms/`));
  await hit.click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/terms/[a-z-]+$`));

  // 4. 용어 풀이: 밑줄 말을 누르면 풀이 자료(glossary.json)를 바탕 아래에서 받아 띄운다
  await islandsReady(page);
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-terms'));
  await page.locator('main .term-mark').first().click();
  await expect(page.locator('#term-pop')).toBeVisible();
  await expect(page.locator('#term-pop-name')).not.toBeEmpty();
  await page.keyboard.press('Escape');
  await expect(page.locator('#term-pop')).toBeHidden();

  // 5. 도구 상세
  const tool = page.locator(`main a[href^="${BASE}/tools/"]`).first();
  await tool.click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/tools/[a-z0-9-]+$`));
  await expect(page.locator('main h1')).toBeVisible();
  await islandsReady(page);

  expect(net.notFound, '404가 난 요청').toEqual([]);
  expect(net.outside, '주소 바탕 밖으로 나간 요청').toEqual([]);
  expect(net.events, '정적 호스트는 익명 집계를 보내지 않는다').toEqual([]);
});

test('하위 주소: 머리줄·바닥글·설명서 링크가 바탕을 품고, 바탕 밖 주소는 404다', async ({ page, request }) => {
  await page.goto(`${BASE}/about`);
  await expect(page.locator('.topbar .brand')).toHaveAttribute('href', `${BASE}/`);
  // 소개도 처리방침과 같은 사실: 정적 호스트는 횟수를 보내지 않는다
  await expect(page.locator('main')).toContainText(ko.about.storedStatic);
  await expect(page.locator('main')).not.toContainText(ko.about.stored);
  await expect(page.locator('.topbar .dict-btn')).toHaveAttribute('href', `${BASE}/dictionary`);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', `${BASE}/manifest.webmanifest`);
  for (const href of await page.locator('.site-footer a').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''))) expect(href.startsWith(`${BASE}/`)).toBe(true);
  const manifest = (await (await request.get(`${BASE}/manifest.webmanifest`)).json()) as { start_url: string; scope: string };
  expect(manifest.start_url).toBe(`${BASE}/`);
  expect(manifest.scope).toBe(`${BASE}/`);
  // 정적 호스트의 처리방침: 익명 집계 묶음이 '이 주소에서는 세지 않아요'
  await page.goto(`${BASE}/legal/privacy`);
  await expect(page.locator('main')).toContainText(ko.legal.privacyStatic.count);
  // 바탕을 빠뜨린 주소는 열리지 않는다 (서버가 바탕 안만 내어 준다)
  expect((await request.get('/tools')).status()).toBe(404);
});
