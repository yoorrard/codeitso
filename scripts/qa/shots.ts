// 시각 점검: 빌드한 dist/를 헤드리스 Chromium으로 열어 화면을 찍고 기계로 볼 수 있는 문제를 찾는다.
//   npm run qa:shots                 dist의 모든 페이지
//   npm run qa:shots -- / /interview 주어진 라우트만
// 결과: .qa/shots/*.png, .qa/axe.json, .qa/report.md. 심각한 문제가 있으면 종료 코드 1.
// 화면마다 보이는 주 버튼(.btn-primary) 수를 센다. PRIMARY_ONE_ROUTES의 화면은 2개 이상이면 실패 (brief 5.6 '화면마다 주 버튼은 하나', D67).
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ROOT } from '../lib/load-data.ts';
import { startServer } from './serve.ts';

const PORT = 4399;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(ROOT, '.qa');
const SHOTS = join(OUT, 'shots');
/** 주 버튼이 하나뿐이어야 하는 화면. 둘러보는 곳부터 시작하고, 단계 화면은 W4가 화면을 다시 짤 때마다 더한다
 *  (W4a: 홈, 내 AI 써 보기 · W4b: 만들 앱 정하기 · W4c: 도구 고르기 · W4d: 도구끼리 맞춰 보기, 설계도 받기) */
const PRIMARY_ONE_ROUTES: readonly string[] = ['/', '/test-drive', '/destination', '/waypoints', '/check', '/arrival', '/tools', '/tools/supabase', '/terms', '/terms/api', '/receipts', '/dictionary', '/about'];

const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
] as const;

function routesFromDist(): string[] {
  const dist = join(ROOT, 'dist');
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === 'index.html') {
        const r = '/' + relative(dist, dir).split('\\').join('/');
        out.push(r === '/' ? '/' : `${r.replace(/\/$/, '')}`);
      }
    }
  };
  walk(dist);
  // 용어 카드·도구 상세는 수가 많으니 하나씩만 대표로 찍는다
  const seen = new Set<string>();
  return out.sort().filter((r) => {
    const m = r.match(/^\/(terms|tools|concepts|products)\//);
    if (!m) return true;
    if (seen.has(m[1] ?? '')) return false;
    seen.add(m[1] ?? '');
    return true;
  });
}

async function settle(page: Page): Promise<void> {
  // 진행 중인 애니메이션이 끝날 때까지 (최대 4초) 기다린다. 공들인 장면도 3초 이하여야 한다.
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), undefined, {
      timeout: 4000,
    })
    .catch(() => undefined);
}

interface PageReport {
  route: string;
  viewport: string;
  consoleErrors: string[];
  externalRequests: string[];
  failedRequests: string[];
  horizontalOverflow: boolean;
  smallTargets: string[];
  /** 보이는 주 버튼 수 (닫힌 시트·숨은 것 빼고, 화면 밖으로 스크롤된 것은 센다) */
  primaryButtons: number;
  axe: { serious: number; critical: number; ids: string[] };
  tabOrder?: string[];
}

const routes = process.argv.slice(2).filter((a) => a.startsWith('/'));
const list = routes.length > 0 ? routes : routesFromDist();
mkdirSync(SHOTS, { recursive: true });
const server = await startServer(PORT);
const browser = await chromium.launch();
const reports: PageReport[] = [];

try {
  for (const route of list) {
    // 360-reduce: 기기 설정의 동작 줄이기, 360-site-reduce: 사이트 설정(html[data-motion=reduce])의 동작 줄이기 (D30)
    // 360-dark: 기기가 어두운 모드일 때의 밤 지도 (D56)
    for (const vp of [
      ...VIEWPORTS,
      { name: '360-reduce', width: 360, height: 800 },
      { name: '360-site-reduce', width: 360, height: 800 },
      { name: '360-dark', width: 360, height: 800 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: vp.name === '360-reduce' ? 'reduce' : 'no-preference',
        colorScheme: vp.name === '360-dark' ? 'dark' : 'light',
        locale: 'ko-KR',
      });
      if (vp.name === '360-site-reduce') {
        await context.addInitScript(() => window.localStorage.setItem('cc:prefs:v1', JSON.stringify({ motion: 'reduce', sound: false })));
      }
      const page = await context.newPage();
      const rep: PageReport = {
        route,
        viewport: vp.name,
        consoleErrors: [],
        externalRequests: [],
        failedRequests: [],
        horizontalOverflow: false,
        smallTargets: [],
        primaryButtons: 0,
        axe: { serious: 0, critical: 0, ids: [] },
      };
      page.on('console', (m) => {
        if (m.type() === 'error') rep.consoleErrors.push(m.text().slice(0, 200));
      });
      page.on('request', (r) => {
        const u = new URL(r.url());
        if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob')) rep.externalRequests.push(r.url());
      });
      page.on('requestfailed', (r) => rep.failedRequests.push(r.url()));
      await page.goto(BASE + route, { waitUntil: 'load' });
      await settle(page);
      const file = `${route === '/' ? 'home' : route.slice(1).replace(/\//g, '_')}-${vp.name}.png`;
      await page.screenshot({ path: join(SHOTS, file), fullPage: true });

      rep.horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      rep.smallTargets = await page.evaluate(() => {
        const out: string[] = [];
        for (const el of Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"], input:not([type="hidden"]), select, summary, a'))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden') continue;
          // 문장 속 링크와 점선 밑줄 말(.term-mark, D69)은 WCAG 2.5.8 예외(Inline). 블록처럼 놓인 링크와 버튼만 본다.
          if ((el.tagName === 'A' && style.display === 'inline') || el.classList.contains('term-mark')) continue;
          if (r.width < 44 || r.height < 44) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
        return out;
      });
      rep.primaryButtons = await page.evaluate(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('.btn-primary')).filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            return typeof el.checkVisibility !== 'function' || el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
          }).length,
      );
      // axe는 낮(360)과 밤(360-dark) 두 모드에서 본다 (밤 지도의 대비)
      if (vp.name === '360' || vp.name === '360-dark') {
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        for (const v of axe.violations) {
          if (v.impact === 'serious') rep.axe.serious += 1;
          if (v.impact === 'critical') rep.axe.critical += 1;
          if (v.impact === 'serious' || v.impact === 'critical') rep.axe.ids.push(`${v.id}(${v.nodes.length})`);
        }
      }
      if (vp.name === '360') {
        rep.tabOrder = [];
        await page.locator('body').click({ position: { x: 1, y: 1 } }).catch(() => undefined);
        for (let i = 0; i < 25; i += 1) {
          await page.keyboard.press('Tab');
          const d = await page.evaluate(() => {
            const a = document.activeElement as HTMLElement | null;
            if (!a || a === document.body) return '';
            return `${a.tagName.toLowerCase()} "${(a.getAttribute('aria-label') ?? a.textContent ?? '').trim().slice(0, 24)}"`;
          });
          if (!d) break;
          rep.tabOrder.push(d);
        }
      }
      reports.push(rep);
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

const tooManyPrimary = (r: PageReport): boolean => PRIMARY_ONE_ROUTES.includes(r.route) && r.primaryButtons > 1;
const bad = reports.filter(
  (r) =>
    r.axe.serious + r.axe.critical > 0 ||
    r.horizontalOverflow ||
    r.consoleErrors.length > 0 ||
    r.externalRequests.length > 0 ||
    r.smallTargets.length > 0 ||
    tooManyPrimary(r),
);
const md: string[] = ['# 시각 점검 보고', '', `라우트 ${list.length}개 × 화면 4종. 스크린샷: .qa/shots/`, ''];
md.push('| 라우트 | 화면 | axe 심각/치명 | 가로 스크롤 | 작은 누르는 곳 | 주 버튼 | 콘솔 에러 | 외부 요청 |', '|---|---|---|---|---|---|---|---|');
for (const r of reports) {
  md.push(`| ${r.route} | ${r.viewport} | ${r.viewport === '360' || r.viewport === '360-dark' ? `${r.axe.serious}/${r.axe.critical} ${r.axe.ids.join(' ')}` : '-'} | ${r.horizontalOverflow ? '있음' : '-'} | ${r.smallTargets.length} | ${r.primaryButtons}${tooManyPrimary(r) ? ' (2개 이상)' : ''} | ${r.consoleErrors.length} | ${r.externalRequests.length} |`);
}
for (const r of reports) {
  const notes = [
    ...r.smallTargets.map((s) => `작은 누르는 곳: ${s}`),
    ...(tooManyPrimary(r) ? [`주 버튼이 ${r.primaryButtons}개: 화면마다 하나만 .btn-primary로 두고 나머지는 .btn-soft·.btn(중립)·.btn-text로`] : []),
    ...r.consoleErrors.map((s) => `콘솔 에러: ${s}`),
    ...r.externalRequests.map((s) => `외부 요청: ${s}`),
    ...r.failedRequests.map((s) => `실패한 요청: ${s}`),
  ];
  if (notes.length > 0 || r.tabOrder) {
    md.push('', `## ${r.route} (${r.viewport})`, '');
    for (const n of notes) md.push(`- ${n}`);
    if (r.tabOrder) md.push(`- 탭 순서: ${r.tabOrder.join(' → ') || '(초점 받는 것 없음)'}`);
  }
}
writeFileSync(join(OUT, 'axe.json'), JSON.stringify(reports, null, 2));
writeFileSync(join(OUT, 'report.md'), md.join('\n') + '\n');
console.log(md.slice(0, 6 + reports.length).join('\n'));
if (bad.length > 0) {
  console.log(`\n문제 있는 화면 ${bad.length}개. .qa/report.md를 읽고 고친다.`);
  process.exit(1);
}
console.log('\n시각 점검 통과 (스크린샷은 직접 열어 본다)');
