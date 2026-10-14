// 성능 예산 검사 (docs/ARCHITECTURE.md 11절): 빌드한 dist/의 페이지마다
//  - 처음 불러오는 자바스크립트 합계(gzip): 홈 100KB 이하, 다른 페이지 140KB 이하
//  - 처음 불러오는 CSS 합계(gzip): 30KB 이하 (CSS는 첫 화면 그리기를 막는다)
//  - 그림·애니메이션 파일 합계: 300KB 이하 (<picture>와 srcset은 실제로 내려오는 하나만 센다)
// 나중에 동적으로 불러오는 묶음(예: 지연 3D 장면)은 HTML에 드러나지 않으므로 따로 LAZY_LIMIT으로 본다.
// 길 지도(docs/MAP.md, D68)는 따로 본다: 땅 판 24KB · 표지 묶음 10KB · 지도 섬 8KB · 지도 모형 6.5KB(gzip).
// 섬과 모형은 각 파일만 줄여(esbuild minify, import는 밖에 둔 채) 재고, 빌드에서 둘이 함께 실린 MapBoard 묶음은 합계 안인지 본다.
// 섬에는 지도 장면(D71)의 움직임 모듈(map/scene.ts 바뀐 것 견주기, map/rest.ts 서는 자리, scene.ts 건너뛰기)도 넣어 잰다: 모형은 키우지 않는다.
// 어려운 말 풀이(brief 8절, D69)도 따로 본다: 풀이 섬 5KB · 자료(/glossary.json) + 매처 묶음 17KB · 도구 이름(/glossary-tools.json) 4KB.
// 사전 검색 색인(/search-index.json)은 처음 찾을 때 받는다: 100KB (gzip).
//   npm run qa:budget
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT } from '../lib/load-data.ts';

const DIST = join(ROOT, 'dist');
const KB = 1024;
const HOME_JS = 100 * KB;
const PAGE_JS = 140 * KB;
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
 *  여러 곳이 쓰는 섬(MapBoard: 지도 띠·지난 영수증·느낌 견본)은 빌드가 'export{…}from"./조각.js"' 한 줄짜리 입구로 만든다 (D70) */
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
// 길 지도
const MAP_LIMITS = { land: 24 * KB, sprite: 10 * KB, island: 8 * KB, model: 6.5 * KB } as const;
async function minifiedGz(files: string[]): Promise<number> {
  // esbuild는 vite·wrangler와 함께 깔린다. 파일 하나씩 줄이므로 import한 다른 모듈(엔진·문구·preact)은 세지 않는다
  const { transform } = await import('esbuild');
  let code = '';
  for (const f of files) {
    const src = readFileSync(join(ROOT, f), 'utf8');
    const out = await transform(src, { loader: f.endsWith('.tsx') ? 'tsx' : 'ts', minify: true, format: 'esm', jsx: 'automatic', jsxImportSource: 'preact', target: 'es2022' });
    code += out.code;
  }
  return gzipSync(Buffer.from(code), { level: 9 }).length;
}
const mapRows: [string, number, number][] = [
  ['땅 판 src/assets/map/land.svg', gzSize(join(ROOT, 'src/assets/map/land.svg')), MAP_LIMITS.land],
  ['표지 묶음 src/assets/map/map-sprite.svg', gzSize(join(ROOT, 'src/assets/map/map-sprite.svg')), MAP_LIMITS.sprite],
  [
    '지도 섬 MapBoard.tsx + map/focus.ts + 장면(map/scene.ts, map/rest.ts, scene.ts)',
    await minifiedGz(['src/components/MapBoard.tsx', 'src/lib/map/focus.ts', 'src/lib/map/scene.ts', 'src/lib/map/rest.ts', 'src/lib/scene.ts']),
    MAP_LIMITS.island,
  ],
  ['지도 모형 src/lib/map/model.ts', await minifiedGz(['src/lib/map/model.ts']), MAP_LIMITS.model],
];
const shipped = [...allJs].filter((f) => /[\\/]MapBoard\.[^\\/]+\.js$/.test(f)).reduce((a, f) => a + gzSize(f), 0);
if (shipped > 0) mapRows.push(['빌드한 MapBoard 묶음 (섬 + 모형)', shipped, MAP_LIMITS.island + MAP_LIMITS.model]);
for (const [name, n, limit] of mapRows) {
  const ok = n <= limit;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} ${name} ${(n / KB).toFixed(1)}KB/${(limit / KB).toFixed(1)}KB`);
}

// 어려운 말 풀이와 검색 색인 (나중에 받는 자료라 페이지 합계에 들지 않는다)
const GLOSSARY_LIMITS = { island: 5 * KB, data: 17 * KB, tools: 4 * KB, search: 100 * KB } as const;
const chunk = (re: RegExp): number => [...allJs].filter((f) => re.test(f)).reduce((a, f) => a + gzSize(f), 0);
const lazyRows: [string, number, number][] = [
  ['풀이 섬 TermPopover', chunk(/[\\/]TermPopover\.[^\\/]+\.js$/), GLOSSARY_LIMITS.island],
  ['풀이 자료 + 매처 /glossary.json + term-engine', gzSize(join(DIST, 'glossary.json')) + chunk(/[\\/]term-engine\.[^\\/]+\.js$/), GLOSSARY_LIMITS.data],
  ['도구 이름 풀이 /glossary-tools.json', gzSize(join(DIST, 'glossary-tools.json')), GLOSSARY_LIMITS.tools],
  ['사전 검색 색인 /search-index.json', gzSize(join(DIST, 'search-index.json')), GLOSSARY_LIMITS.search],
];
for (const [name, n, limit] of lazyRows) {
  const ok = n > 0 && n <= limit;
  if (!ok) failed += 1;
  console.log(`${ok ? '✓' : '✗'} ${name} ${(n / KB).toFixed(1)}KB/${(limit / KB).toFixed(1)}KB${n === 0 ? ' (빌드에 없다)' : ''}`);
}

if (failed > 0) {
  console.log(`\n예산 초과 ${failed}건. 섬을 나누거나(client:visible/idle), 그림을 줄이거나, 라이브러리를 바꾼다.`);
  process.exit(1);
}
console.log('\n성능 예산 통과');
