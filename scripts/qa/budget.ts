// 성능 예산 검사 (docs/ARCHITECTURE.md 11절): 빌드한 dist/의 페이지마다
//  - 처음 불러오는 자바스크립트 합계(gzip): 홈 100KB 이하, 다른 페이지 140KB 이하
//  - 그림·애니메이션 파일 합계: 300KB 이하
// 나중에 동적으로 불러오는 묶음(예: 지연 3D 장면)은 HTML에 드러나지 않으므로 따로 LAZY_LIMIT으로 본다.
//   npm run qa:budget
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT } from '../lib/load-data.ts';

const DIST = join(ROOT, 'dist');
const KB = 1024;
const HOME_JS = 100 * KB;
const PAGE_JS = 140 * KB;
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

/** JS 파일이 정적으로 import하는 다른 JS 조각까지 따라간다 (처음 불러올 때 함께 내려온다). */
function withStaticImports(file: string, seen: Set<string>): void {
  if (seen.has(file) || !existsSync(file)) return;
  seen.add(file);
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/(?:^|[;\n}])\s*import\s*(?:[^'"()]*?from\s*)?["']([^"']+\.m?js)["']/g)) {
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

  const media = new Set<string>();
  for (const m of text.matchAll(/\b(?:src|href|poster|data-src)="([^"]+)"/g)) {
    const f = m[1] ? local(m[1]) : null;
    if (f && MEDIA_EXT.has(extname(f).toLowerCase())) media.add(f);
  }
  for (const m of text.matchAll(/\bsrcset="([^"]+)"/g)) {
    // srcset은 가장 큰 후보 하나만 센다 (실제로는 하나만 내려온다)
    const cands = (m[1] ?? '').split(',').map((c) => c.trim().split(/\s+/)[0] ?? '').filter(Boolean);
    const biggest = cands.map((c) => local(c)).filter((f): f is string => f !== null).sort((a, b) => rawSize(b) - rawSize(a))[0];
    if (biggest) media.add(biggest);
  }
  const mediaTotal = [...media].reduce((a, f) => a + rawSize(f), 0);
  const jsLimit = route === '/' ? HOME_JS : PAGE_JS;
  const ok = jsTotal <= jsLimit && mediaTotal <= MEDIA;
  if (!ok) failed += 1;
  rows.push(`${ok ? '✓' : '✗'} ${route.padEnd(28)} JS ${(jsTotal / KB).toFixed(1)}KB/${jsLimit / KB}KB  그림 ${(mediaTotal / KB).toFixed(1)}KB/${MEDIA / KB}KB`);
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
if (failed > 0) {
  console.log(`\n예산 초과 ${failed}건. 섬을 나누거나(client:visible/idle), 그림을 줄이거나, 라이브러리를 바꾼다.`);
  process.exit(1);
}
console.log('\n성능 예산 통과');
