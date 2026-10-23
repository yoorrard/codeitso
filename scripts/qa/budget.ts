// 성능 예산 검사 (docs/ARCHITECTURE.md 11절, v5 D103): 빌드한 dist/의 페이지마다
//  - 처음 불러오는 자바스크립트 합계(gzip): 모든 페이지 100KB 이하 (brief 5절)
//  - 처음 불러오는 CSS 합계(gzip): 30KB 이하 (CSS는 첫 화면 그리기를 막는다)
//  - 그림 파일 합계: 300KB 이하 (사이트 안 파일만. 상품 미리 보기 그림은 출처에서 지연 로드한다, brief 5절)
// 나중에 받는 것은 따로 본다: 풀이 섬·풀이 자료, 임시 검색 색인, 목록 묶음(8쪽)·상세 조각 중 가장 큰 것 (scripts/catalog/build.ts).
// 배포 한 판의 파일 수(Cloudflare 2만 개 한도, 진열대 자료 5천 개 아래 + 쪽·정적 파일)와 파일 하나 크기(25MiB 한도)도 본다.
//   npm run qa:budget
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT } from '../lib/load-data.ts';

const DIST = join(ROOT, 'dist');
const KB = 1024;
const HOME_JS = 100 * KB;
const PAGE_JS = 100 * KB;
const CSS_LIMIT = 30 * KB;
const MEDIA = 300 * KB;
const LAZY_LIMIT = 200 * KB;
const MEDIA_EXT = new Set(['.png', '.webp', '.avif', '.jpg', '.jpeg', '.gif', '.svg', '.json', '.lottie', '.riv', '.glb', '.mp4', '.webm']);

if (!existsSync(DIST)) {
  console.log('dist가 없다. npm run build를 먼저 돌린다.');
  process.exit(1);
}

const gz = new Map<string, number>();
function gzSize(file: string): number {
  const hit = gz.get(file);
  if (hit !== undefined) return hit;
  const n = existsSync(file) ? gzipSync(readFileSync(file), { level: 9 }).length : 0;
  gz.set(file, n);
  return n;
}
function rawSize(file: string): number {
  return existsSync(file) ? statSync(file).size : 0;
}
function local(url: string): string | null {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return null;
  return join(DIST, url.split('?')[0]?.split('#')[0] ?? '');
}

function pages(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** JS 파일이 정적으로 import하는(또는 export … from으로 다시 내보내는) 다른 JS 조각까지 따라간다 (처음 불러올 때 함께 내려온다).
 *  여러 곳이 쓰는 섬은 빌드가 'export{…}from"./조각.js"' 한 줄짜리 입구로 만들기도 한다 (D70) */
function withStaticImports(file: string, seen: Set<string>): void {
  if (seen.has(file) || !existsSync(file)) return;
  seen.add(file);
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:^|[;\n}])\s*(?:import|export)\s*(?:[^'"()]*?from\s*)?["']([^"']+\.m?js)["']/g)) {
    const spec = m[1];
    if (!spec) continue;
    const next = spec.startsWith('/') ? join(DIST, spec) : join(file, '..', spec);
    withStaticImports(next, seen);
  }
}

const allJs = new Set<string>();
const walkJs = (dir: string): void => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkJs(p);
    else if (/\.m?js$/.test(name)) allJs.add(p);
  }
};
walkJs(DIST);

const usedFirst = new Set<string>();
const rows: string[] = [];
let failed = 0;
for (const html of pages(DIST).sort()) {
  const route = '/' + relative(DIST, html).replace(/index\.html$/, '').replace(/\.html$/, '').split('\\').join('/');
  const text = readFileSync(html, 'utf8');
  const js = new Set<string>();
  const urls = [
    ...[...text.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]),
    ...[...text.matchAll(/\b(?:component-url|renderer-url)="([^"]+)"/g)].map((m) => m[1]),
  ];
  for (const u of urls) {
    const f = u ? local(u) : null;
    if (f) withStaticImports(f, js);
  }
  // 페이지 안에 박힌 스크립트도 센다
  let inline = 0;
  for (const m of text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) inline += gzipSync(Buffer.from(m[1] ?? '')).length;
  for (const f of js) usedFirst.add(f);
  const jsTotal = [...js].reduce((a, f) => a + gzSize(f), 0) + inline;

  let cssTotal = 0;
  for (const m of text.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)) {
    const f = m[1] ? local(m[1]) : null;
    if (f) cssTotal += gzSize(f);
  }
  for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) cssTotal += gzipSync(Buffer.from(m[1] ?? '')).length;

  const media = new Set<string>();
  // <picture>는 첫 번째 <source>(가장 앞선 형식)의 가장 큰 후보 하나만 센다. 대체 <img>는 그 형식을 모르는 브라우저용이다.
  const pictures = [...text.matchAll(/<picture\b[\s\S]*?<\/picture>/g)].map((m) => m[0]);
  for (const pic of pictures) {
    const first = pic.match(/<source[^>]*\bsrcset="([^"]+)"/)?.[1] ?? pic.match(/<img[^>]*\bsrcset="([^"]+)"/)?.[1];
    const cands = (first ?? '').split(',').map((c) => c.trim().split(/\s+/)[0] ?? '').filter(Boolean);
    const biggest = cands.map((c) => local(c)).filter((f): f is string => f !== null).sort((a, b) => rawSize(b) - rawSize(a))[0];
    if (biggest) media.add(biggest);
  }
  const rest = pictures.reduce((t, pic) => t.replace(pic, ''), text);
  for (const m of rest.matchAll(/\b(?:src|href|poster|data-src)="([^"]+)"/g)) {
    const f = m[1] ? local(m[1]) : null;
    if (f && MEDIA_EXT.has(extname(f).toLowerCase())) media.add(f);
  }
  for (const m of rest.matchAll(/\bsrcset="([^"]+)"/g)) {
    // srcset은 가장 큰 후보 하나만 센다 (실제로는 하나만 내려온다)
    const cands = (m[1] ?? '').split(',').map((c) => c.trim().split(/\s+/)[0] ?? '').filter(Boolean);
    const biggest = cands.map((c) => local(c)).filter((f): f is string => f !== null).sort((a, b) => rawSize(b) - rawSize(a))[0];
    if (biggest) media.add(biggest);
  }
  const mediaTotal = [...media].reduce((a, f) => a + rawSize(f), 0);
  const jsLimit = route === '/' ? HOME_JS : PAGE_JS;
  const ok = jsTotal <= jsLimit && cssTotal <= CSS_LIMIT && mediaTotal <= MEDIA;
  if (!ok) failed += 1;
  rows.push(
    `${ok ? '✓' : '✗'} ${route.padEnd(28)} JS ${(jsTotal / KB).toFixed(1)}KB/${jsLimit / KB}KB  CSS ${(cssTotal / KB).toFixed(1)}KB/${CSS_LIMIT / KB}KB  그림 ${(mediaTotal / KB).toFixed(1)}KB/${MEDIA / KB}KB`,
  );
}

// 처음에 안 불리는 JS 조각(지연 묶음) 중 가장 큰 것
const lazy = [...allJs].filter((f) => !usedFirst.has(f)).map((f) => ({ f, n: gzSize(f) })).sort((a, b) => b.n - a.n);
const biggestLazy = lazy[0];
console.log(rows.join('\n'));
if (biggestLazy) {
  const ok = biggestLazy.n <= LAZY_LIMIT;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} 가장 큰 지연 묶음 ${relative(DIST, biggestLazy.f)} ${(biggestLazy.n / KB).toFixed(1)}KB/${LAZY_LIMIT / KB}KB`);
}
// 나중에 받는 것 (페이지 합계에 들지 않는다)
const chunk = (re: RegExp): number => [...allJs].filter((f) => re.test(f)).reduce((a, f) => a + gzSize(f), 0);
/** 폴더 안 JSON 중 gzip이 가장 큰 것 */
function biggestJson(dir: string): { f: string; n: number } {
  let best = { f: '', n: 0 };
  const walk = (d: string): void => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.json')) {
        const n = gzipSync(readFileSync(p), { level: 6 }).length;
        if (n > best.n) best = { f: p, n };
      }
    }
  };
  walk(dir);
  return best;
}
const bigList = biggestJson(join(DIST, 'catalog', 'list'));
const bigItem = biggestJson(join(DIST, 'catalog', 'item'));
const bigShard = biggestJson(join(DIST, 'catalog', 'search')); // 조각(t-)과 블록(b-) 가운데 큰 것
const bigFacet = biggestJson(join(DIST, 'catalog', 'facet'));
const bigModel = biggestJson(join(DIST, 'catalog', 'models', 'p'));
const lazyRows: [string, number, number][] = [
  ['풀이 섬 TermPopover', chunk(/[\\/]TermPopover\.[^\\/]+\.js$/), 6 * KB],
  ['풀이 자료 + 매처 /glossary.json + term-engine', gzSize(join(DIST, 'glossary.json')) + chunk(/[\\/]term-engine\.[^\\/]+\.js$/), 17 * KB],
  // 전체 검색 (D114): 메타는 검색 쪽마다, 낱말 조각·결과 블록은 질의마다 몇 개씩 받는다
  ['검색 메타 /catalog/search/meta.json', gzSize(join(DIST, 'catalog', 'search', 'meta.json')), 10 * KB],
  [`가장 큰 검색 조각·블록 ${relative(DIST, bigShard.f)}`, bigShard.n, 80 * KB],
  // 거르기 (D115): 거르기를 켤 때만 받는다. MCP 서버(5만 개)가 가장 크다. 정렬 순서 파일은 상품 수만큼의 순열이라
  // (5만 개 117KB, 이론 바닥 약 88KB) MCP가 날마다 늘면 같이 큰다 → 200KB (D143). 약 8만 개(이 크기로 200KB)에 닿기 전에 순서 파일을 다시 짠다
  [`가장 큰 거르기 파일 ${relative(DIST, bigFacet.f)}`, bigFacet.n, 200 * KB],
  // 묶음 하나는 보통 30KB 안팎이다. 배경 패턴처럼 SVG 조각을 싣는 소분류만 크다 (D103)
  [`가장 큰 목록 묶음 ${relative(DIST, bigList.f)}`, bigList.n, 160 * KB],
  [`가장 큰 상세 조각 ${relative(DIST, bigItem.f)}`, bigItem.n, 100 * KB],
  // AI 모델·요금 (D141): 상세 표·담기 창은 제공자 파일 하나, /models는 처음에 direct.json, 호스팅·라우터까지 볼 때만 hosts.json
  [`가장 큰 제공자 모델 파일 ${relative(DIST, bigModel.f)}`, bigModel.n, 40 * KB],
  ['비교 쪽 처음 묶음 /catalog/models/direct.json', gzSize(join(DIST, 'catalog', 'models', 'direct.json')), 30 * KB],
  ['비교 쪽 호스팅 묶음 /catalog/models/hosts.json (고를 때만)', gzSize(join(DIST, 'catalog', 'models', 'hosts.json')), 220 * KB],
];
for (const [name, n, limit] of lazyRows) {
  const ok = n > 0 && n <= limit;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} ${name} ${(n / KB).toFixed(1)}KB/${(limit / KB).toFixed(1)}KB${n === 0 ? ' (빌드에 없다)' : ''}`);
}

// 배포 한 판: 파일 수와 파일 하나 크기 (Cloudflare Workers 정적 파일 한도 2만 개·25MiB, D103)
let files = 0;
let biggest = { f: '', n: 0 };
const countAll = (d: string): void => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    const st = statSync(p);
    if (st.isDirectory()) countAll(p);
    else {
      files += 1;
      if (st.size > biggest.n) biggest = { f: p, n: st.size };
    }
  }
};
countAll(DIST);
const FILE_LIMIT = 6_000;
const SIZE_LIMIT = 25 * KB * KB;
const filesOk = files <= FILE_LIMIT && biggest.n <= SIZE_LIMIT;
if (!filesOk) failed += 1;
console.log(`${filesOk ? '✓' : '✗'} 배포 파일 ${files}개/${FILE_LIMIT}개, 가장 큰 파일 ${relative(DIST, biggest.f)} ${(biggest.n / KB / KB).toFixed(1)}MB/25MB`);

if (failed > 0) {
  console.log(`\n예산 초과 ${failed}건. 섬을 나누거나(client:visible/idle), 그림을 줄이거나, 라이브러리를 바꾼다.`);
  process.exit(1);
}
console.log('\n성능 예산 통과');
