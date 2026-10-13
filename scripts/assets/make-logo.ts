// 로고 벡터 원본(assets-src/logo/*.svg, D65)에서 화면용 경로 모음과 HTML 밖에서 쓰는 아이콘 파일을 만든다 (npm run logo).
//   1. src/lib/logo-paths.ts  다섯 벌(lockup·stack·wordmark·badge·mono)과 emblem·monoMark의 viewBox와 안쪽 SVG.
//      경로는 색 부류마다 하나로 묶고(칠하는 차례: 몸 → 빛 → 흰색 → 파랑), 정수 좌표·상대 명령으로 줄인다(svgo floatPrecision 0과 같은 셈).
//      색 값은 넣지 않는다. 화면이 .logo-body { fill: var(--logo-body) }처럼 칠한다(brief 3.4·3.5).
//   2. public/  favicon.ico(32px PNG를 담은 ICO), icon.svg, apple-touch-icon.png(180, 남색으로 꽉 채움), icon-192.png, icon-512.png,
//      icon-maskable-512.png(모자와 괄호를 가운데 80% 원 안에), manifest.webmanifest (brief 3.3, brand.md 8절)
//   3. 끝에 scripts/assets/logo-diff.ts로 원본과의 겹침을 잰다(색 부류마다 0.97 이상).
// 벡터 원본은 손으로 다시 그린 것이고, 소유자 원본(assets-src/brand/logo-source.webp)은 비교 기준으로만 둔다.
// 원본 WebP를 다시 잘라 새 크기를 만들지 않는다(brief 3.7). 옛 연결(D62)이 잘라 낸 그림(public/brand/*.webp, favicon-32·48)은 지웠다.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ko } from '../../src/copy/ko.ts';
import { ROOT } from '../lib/load-data.ts';

const SRC_DIR = join(ROOT, 'assets-src', 'logo');
const PUB = join(ROOT, 'public');
const OUT_TS = join(ROOT, 'src', 'lib', 'logo-paths.ts');

// 아이콘 파일(HTML 밖)에만 쓰는 낮 색. 토큰과 같은 값: navy, brand-blue, cyan, brand-white (tokens.css)
const HEX: Record<string, string> = {
  'logo-body': '#001E5A',
  'logo-letter': '#001E5A',
  'logo-accent': '#0082FA',
  'logo-light': '#00B4FA',
  'logo-white': '#F6F8FA',
};
const MANIFEST_BG = '#F2F5F8';

// ---------- 경로 읽기와 줄이기 ----------

interface Cmd {
  c: string; // 절대 명령 M L H V C A Z
  v: number[];
}

/** 절대 명령만 쓴 경로(원본 SVG의 모양)를 읽는다 */
function parsePath(d: string): Cmd[] {
  const toks = d.match(/[MLHVCAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, A: 7, Z: 0 };
  const out: Cmd[] = [];
  let i = 0;
  let cmd = '';
  while (i < toks.length) {
    const t = toks[i] ?? '';
    if (/^[a-z]$/i.test(t)) {
      if (t !== t.toUpperCase()) throw new Error(`상대 명령 ${t}은 원본 SVG에 쓰지 않는다 (절대 명령만)`);
      cmd = t;
      i++;
      if (cmd === 'Z') out.push({ c: 'Z', v: [] });
      continue;
    }
    const n = arity[cmd];
    if (n === undefined || n === 0) throw new Error(`경로를 읽지 못했다: ${d.slice(0, 40)}…`);
    out.push({ c: cmd, v: toks.slice(i, i + n).map(Number) });
    i += n;
    if (cmd === 'M') cmd = 'L';
  }
  return out;
}

function num(x: number, digits: number): string {
  const r = Number(x.toFixed(digits));
  if (Object.is(r, -0) || r === 0) return '0';
  let s = String(r);
  if (s.startsWith('0.')) s = s.slice(1);
  else if (s.startsWith('-0.')) s = `-${s.slice(2)}`;
  return s;
}

function joinNums(parts: string[]): string {
  let s = '';
  for (const p of parts) {
    if (s === '' || p.startsWith('-') || (p.startsWith('.') && /\.\d*$/.test(s))) s += p;
    else s += ` ${p}`;
  }
  return s;
}

/** 절대 경로를 짧게 쓴다: 명령마다 절대·상대 중 짧은 쪽, 같은 명령이 이어지면 글자를 뺀다. 좌표는 digits 자리, 호의 반지름은 1자리 */
function compact(cmds: Cmd[], digits: number): string {
  let out = '';
  let prev = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const R = (x: number): number => Number(x.toFixed(digits));
  for (const { c, v } of cmds) {
    let abs: string[] = [];
    let rel: string[] = [];
    let A = c;
    let a = c.toLowerCase();
    let nx = cx;
    let ny = cy;
    if (c === 'Z') {
      out += 'z';
      prev = 'z';
      cx = sx;
      cy = sy;
      continue;
    }
    if (c === 'M' || c === 'L') {
      const [x = 0, y = 0] = v.map(R);
      nx = x;
      ny = y;
      if (c === 'L' && x === cx && y === cy) continue; // 길이 0인 선은 뺀다
      if (c === 'L' && y === cy) {
        A = 'H';
        a = 'h';
        abs = [num(x, digits)];
        rel = [num(x - cx, digits)];
      } else if (c === 'L' && x === cx) {
        A = 'V';
        a = 'v';
        abs = [num(y, digits)];
        rel = [num(y - cy, digits)];
      } else {
        abs = [num(x, digits), num(y, digits)];
        rel = [num(x - cx, digits), num(y - cy, digits)];
      }
    } else if (c === 'H') {
      nx = R(v[0] ?? 0);
      if (nx === cx) continue;
      abs = [num(nx, digits)];
      rel = [num(nx - cx, digits)];
    } else if (c === 'V') {
      ny = R(v[0] ?? 0);
      if (ny === cy) continue;
      abs = [num(ny, digits)];
      rel = [num(ny - cy, digits)];
    } else if (c === 'C') {
      const p = v.map(R);
      nx = p[4] ?? 0;
      ny = p[5] ?? 0;
      abs = p.map((x) => num(x, digits));
      rel = p.map((x, k) => num(x - (k % 2 === 0 ? cx : cy), digits));
    } else if (c === 'A') {
      const [rx = 0, ry = 0, rot = 0, large = 0, sweep = 0, x = 0, y = 0] = v;
      nx = R(x);
      ny = R(y);
      const head = [num(rx, 1), num(ry, 1), num(rot, 0), String(large), String(sweep)];
      abs = [...head, num(nx, digits), num(ny, digits)];
      rel = [...head, num(nx - cx, digits), num(ny - cy, digits)];
    }
    const absS = joinNums(abs);
    const relS = joinNums(rel);
    const useRel = relS.length < absS.length || (relS.length === absS.length && prev === a);
    const letter = useRel ? a : A;
    const body = useRel ? relS : absS;
    // M 뒤에 이어진 좌표는 L로 읽히므로, M은 늘 글자를 쓴다
    const skip = letter === prev && letter.toLowerCase() !== 'm';
    out += (skip ? (body.startsWith('-') ? '' : ' ') : letter) + body;
    prev = letter;
    if (c === 'M') {
      sx = nx;
      sy = ny;
    }
    cx = nx;
    cy = ny;
  }
  return out;
}

// ---------- 원본 SVG 읽기 ----------

interface Part {
  id: string;
  cls: string;
  d: string;
  group: string;
}

function readParts(file: string): { parts: Part[]; text: string } {
  const text = readFileSync(join(SRC_DIR, file), 'utf8');
  const parts: Part[] = [];
  let group = '';
  for (const m of text.matchAll(/<g id="([^"]+)"|(<\/g>)|<path id="([^"]+)"(?: class="([^"]+)")? d="([^"]+)"\/>/g)) {
    if (m[1]) group = m[1];
    else if (m[2]) group = '';
    else parts.push({ id: m[3] ?? '', cls: m[4] ?? '', d: m[5] ?? '', group });
  }
  return { parts, text };
}

function attr(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m?.[1]) throw new Error(`원본 SVG에서 ${re}를 찾지 못했다`);
  return m[1];
}

/** 같은 클래스가 이어지는 경로를 하나로 묶는다 (칠하는 차례는 그대로) */
function byClass(parts: Part[], digits: number): string {
  const runs: { cls: string; cmds: Cmd[] }[] = [];
  for (const p of parts) {
    const last = runs[runs.length - 1];
    if (last && last.cls === p.cls) last.cmds.push(...parsePath(p.d));
    else runs.push({ cls: p.cls, cmds: parsePath(p.d) });
  }
  return runs.map((r) => `<path${r.cls ? ` class="${r.cls}"` : ''} d="${compact(r.cmds, digits)}"/>`).join('');
}

// ---------- 잉크 상자 (viewBox) ----------

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 1254 좌표의 그림을 1:1로 그려 잉크가 있는 상자를 정수로 잰다 */
async function inkBox(inner: string): Promise<Box> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1254" height="1254" viewBox="0 0 1254 1254"><g fill="#000">${inner.replace(/ class="[^"]+"/g, '')}</g></svg>`;
  const { data, info } = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width;
  let y0 = info.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if ((data[(y * info.width + x) * 4 + 3] ?? 0) >= 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x: x0, y: y0, w: x1 + 1 - x0, h: y1 + 1 - y0 };
}

const f = (x: number, d = 4): string => num(x, d);
const box = (b: Box): string => `${b.x} ${b.y} ${b.w} ${b.h}`;

// ---------- 벌 만들기 ----------

interface LogoArt {
  viewBox: string;
  markup: string;
}

// 벌마다 같은 경로를 되풀이하지 않게, 경로 묶음(그림·글자 상표·단색 모자 마크)을 한 번만 쓰고 벌은 그것을 가리킨다
type Block = 'EMBLEM' | 'WORDMARK' | 'WORDMARK_INK' | 'CAP_MARK';
type Piece = string | { block: Block };
interface Variant {
  viewBox: string;
  pieces: Piece[];
}

const ink = (markup: string): string => markup.replace(/ class="[^"]+"/g, '');

async function buildVariants(): Promise<{ blocks: Record<Exclude<Block, 'WORDMARK_INK'>, string>; variants: Record<string, Variant> }> {
  const logo = readParts('logo.svg');
  const emblem = byClass(logo.parts.filter((p) => p.group === 'emblem'), 0);
  const word = byClass(logo.parts.filter((p) => p.group === 'wordmark'), 0);
  const eb = await inkBox(emblem);
  const wb = await inkBox(word);

  // 가로 묶음 (B): 그림 52×44 + 사이 8 + 글자 상표 82×20, 세로 가운데 (brief 3.1·3.2)
  const s1 = 52 / eb.w;
  const s2 = 82 / wb.w;
  const H = 44;
  if (eb.h * s1 > H + 0.5 || wb.h * s2 > H) throw new Error('가로 묶음 높이가 44를 넘는다. 그림이나 글자 상표의 상자를 확인한다');
  const m1 = `matrix(${f(s1, 5)} 0 0 ${f(s1, 5)} ${f(-eb.x * s1)} ${f((H - eb.h * s1) / 2 - eb.y * s1)})`;
  const m2 = `matrix(${f(s2, 5)} 0 0 ${f(s2, 5)} ${f(60 - wb.x * s2)} ${f((H - wb.h * s2) / 2 - wb.y * s2)})`;

  // 세로 묶음 (A): 원본 배치 그대로
  const sx0 = Math.min(eb.x, wb.x);
  const sy0 = Math.min(eb.y, wb.y);
  const stackBox: Box = { x: sx0, y: sy0, w: Math.max(eb.x + eb.w, wb.x + wb.w) - sx0, h: Math.max(eb.y + eb.h, wb.y + wb.h) - sy0 };

  // 모자 배지 (D): 48 격자. 모자 묶음은 로고 좌표 그대로 두고 transform으로 줄인다
  const badge = readParts('badge.svg');
  const capTransform = attr(badge.text, /<g id="cap" transform="([^"]+)"/);
  const tile = attr(badge.text, /(<rect id="tile"[^>]*\/>)/).replace(' id="tile"', '');
  const capParts = badge.parts.filter((p) => p.group === 'cap');
  const restParts = badge.parts.filter((p) => p.group !== 'cap');
  const badgeMarkup = `${tile}<g transform="${capTransform}">${byClass(capParts, 0)}</g>${byClass(restParts, 1)}`;

  // 단색판 (E): currentColor 한 색, 띠와 배지는 틈. 글자 상표는 로고의 것을 클래스 없이 다시 쓴다
  const mono = readParts('mono.svg');
  const monoViewBox = attr(mono.text, /viewBox="([^"]+)"/);
  const markT = attr(mono.text, /<g id="cap-mark" transform="([^"]+)"/);
  const wordT = attr(mono.text, /<g id="wordmark" transform="([^"]+)"/);
  const mark = byClass(mono.parts.filter((p) => p.group === 'cap-mark'), 0);
  const monoWord = mono.parts.filter((p) => p.group === 'wordmark').map((p) => p.d).join('');
  const logoWord = logo.parts.filter((p) => p.group === 'wordmark').map((p) => p.d).join('');
  if (monoWord !== logoWord) throw new Error('mono.svg의 글자 상표가 logo.svg와 다르다. assets-src/logo/mono.svg를 logo.svg의 글자 경로로 맞춘다');
  const markBox = await inkBox(`<g transform="${markT}">${mark}</g>`);

  const E = { block: 'EMBLEM' } as const;
  const W = { block: 'WORDMARK' } as const;
  const WI = { block: 'WORDMARK_INK' } as const;
  const C = { block: 'CAP_MARK' } as const;
  return {
    blocks: { EMBLEM: emblem, WORDMARK: word, CAP_MARK: mark },
    variants: {
      lockup: { viewBox: `0 0 142 ${H}`, pieces: [`<g transform="${m1}">`, E, `</g><g transform="${m2}">`, W, '</g>'] },
      stack: { viewBox: box(stackBox), pieces: [E, W] },
      wordmark: { viewBox: box(wb), pieces: [W] },
      emblem: { viewBox: box(eb), pieces: [E] },
      badge: { viewBox: '0 0 48 48', pieces: [badgeMarkup] },
      mono: { viewBox: monoViewBox, pieces: [`<g fill="currentColor"><g transform="${markT}">`, C, `</g><g transform="${wordT}">`, WI, '</g></g>'] },
      monoMark: { viewBox: box(markBox), pieces: [`<g fill="currentColor"><g transform="${markT}">`, C, '</g></g>'] },
    },
  };
}

function resolve(pieces: Piece[], blocks: Record<string, string>): string {
  return pieces.map((p) => (typeof p === 'string' ? p : p.block === 'WORDMARK_INK' ? ink(blocks.WORDMARK ?? '') : (blocks[p.block] ?? ''))).join('');
}

function writeModule(blocks: Record<string, string>, variants: Record<string, Variant>): void {
  // 벌마다 다 풀어 쓴 문자열 하나로 적는다. 공용 조각을 \${…}로 이으면 묶개(Vite)가 템플릿 문자열을 부작용으로 보고
  // 섬 묶음에 쓰지 않는 벌의 조각까지 남긴다(배지만 쓰는 섬이 그림 조각 5KB를 함께 실었다). 이 파일은 크지만 서버에서만 다 읽힌다.
  const lit = (pieces: Piece[]): string => {
    const text = resolve(pieces, blocks);
    if (/[`\\]|\$\{/.test(text)) throw new Error('경로 문자열에 ` \\ ${ 가 있으면 안 된다');
    return '`' + text + '`';
  };
  const names: Record<string, string> = { lockup: 'LOGO_LOCKUP', stack: 'LOGO_STACK', wordmark: 'LOGO_WORDMARK', emblem: 'LOGO_EMBLEM', badge: 'LOGO_BADGE', mono: 'LOGO_MONO', monoMark: 'LOGO_MONO_MARK' };
  const lines = [
    '// 만들어지는 파일: npm run logo(scripts/assets/make-logo.ts)가 assets-src/logo/*.svg에서 만든다. 손으로 고치지 않는다.',
    '// 로고 다섯 벌(brief 3.1)의 viewBox와 <svg> 안쪽. 경로에는 클래스만 있고 색은 화면 CSS가 칠한다:',
    '//   .logo-body { fill: var(--logo-body) } … logo-letter·logo-accent·logo-light·logo-white 다섯 (brief 3.4)',
    '// 섬(Logo.tsx)은 필요한 벌만 이름으로 가져온다(LOGO_LOCKUP 등). LOGO 묶음을 가져오면 모든 벌이 묶음에 들어간다.',
    '',
    "export type LogoVariant = 'lockup' | 'stack' | 'wordmark' | 'emblem' | 'badge' | 'mono' | 'monoMark';",
    '',
    'export interface LogoArt {',
    '  /** SVG viewBox */',
    '  readonly viewBox: string;',
    '  /** <svg> 안에 그대로 넣는 경로들 */',
    '  readonly markup: string;',
    '}',
    '',
    '/** B 가로 묶음: 머리줄. 그림 52×44 + 사이 8 + 글자 상표 82×20 */',
    `export const LOGO_LOCKUP: LogoArt = { viewBox: '${variants.lockup?.viewBox}', markup: ${lit(variants.lockup?.pieces ?? [])} };`,
    '/** A 세로 묶음: 소개 머리, OG, 넓은 홈 패널 머리 (최소 폭 120) */',
    `export const LOGO_STACK: LogoArt = { viewBox: '${variants.stack?.viewBox}', markup: ${lit(variants.stack?.pieces ?? [])} };`,
    '/** C 글자 상표만: 바닥글, 영수증 공유 그림 (최소 높이 16) */',
    `export const LOGO_WORDMARK: LogoArt = { viewBox: '${variants.wordmark?.viewBox}', markup: ${lit(variants.wordmark?.pieces ?? [])} };`,
    '/** 그림만 (견본·비교용. 화면에서는 A·B 묶음으로 쓴다) */',
    `export const LOGO_EMBLEM: LogoArt = { viewBox: '${variants.emblem?.viewBox}', markup: ${lit(variants.emblem?.pieces ?? [])} };`,
    '/** D 모자 배지: 48 격자. 낮·밤이 같다: 이 벌은 --logo-* 변수를 낮 값으로 되돌려 칠한다 (brief 3.4) */',
    `export const LOGO_BADGE: LogoArt = { viewBox: '${variants.badge?.viewBox}', markup: ${lit(variants.badge?.pieces ?? [])} };`,
    '/** E 단색판: 모자 마크 + 글자 상표, currentColor */',
    `export const LOGO_MONO: LogoArt = { viewBox: '${variants.mono?.viewBox}', markup: ${lit(variants.mono?.pieces ?? [])} };`,
    '/** E 단색 모자 마크만: 영수증 머리 24, 도장 20 */',
    `export const LOGO_MONO_MARK: LogoArt = { viewBox: '${variants.monoMark?.viewBox}', markup: ${lit(variants.monoMark?.pieces ?? [])} };`,
    '',
    '/** 밤에도 낮 색으로 칠하는 벌 */',
    "export const LOGO_FIXED_COLORS: readonly LogoVariant[] = ['badge'];",
    '',
    'export const LOGO: Readonly<Record<LogoVariant, LogoArt>> = {',
    ...Object.entries(names).map(([k, n]) => `  ${k}: ${n},`),
    '};',
    '',
  ];
  const text = lines.join('\n');
  writeFileSync(OUT_TS, text);
  console.log(`src/lib/logo-paths.ts  ${Buffer.byteLength(text)}바이트`);
}

// ---------- 아이콘 파일 ----------

/** badge.svg를 클래스 대신 색 값을 쓴 독립 SVG로. rx는 모서리(0이면 꽉 찬 네모), scale은 모자·괄호를 가운데서 줄이는 비율 */
function badgeFile(art: LogoArt, opts: { rx?: number; scale?: number } = {}): string {
  let inner = art.markup;
  for (const [cls, hex] of Object.entries(HEX)) inner = inner.replaceAll(`class="${cls}"`, `fill="${hex}"`);
  const rectMatch = inner.match(/^<rect[^>]*\/>/);
  const rect = rectMatch?.[0] ?? '';
  let rest = inner.slice(rect.length);
  const tileRect = opts.rx === undefined ? rect : rect.replace(/ rx="[^"]+"/, opts.rx ? ` rx="${opts.rx}"` : '');
  if (opts.scale && opts.scale !== 1) rest = `<g transform="matrix(${opts.scale} 0 0 ${opts.scale} ${f(24 * (1 - opts.scale))} ${f(24 * (1 - opts.scale))})">${rest}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${tileRect}${rest}</svg>`;
}

async function png(svg: string, size: number, name: string): Promise<Buffer> {
  const buf = await sharp(Buffer.from(svg), { density: (72 * size) / 48 })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true, quality: 100 })
    .toBuffer();
  if (name) {
    writeFileSync(join(PUB, name), buf);
    console.log(`public/${name}  ${size}×${size}  ${buf.length}바이트`);
  }
  return buf;
}

/** PNG 하나를 담은 ICO: 머리 6바이트 + 목록 16바이트 + PNG (의존성 없이 직접 쓴다) */
function ico(pngBuf: Buffer, size: number): Buffer {
  const head = Buffer.alloc(22);
  head.writeUInt16LE(0, 0); // 예약
  head.writeUInt16LE(1, 2); // 종류: 아이콘
  head.writeUInt16LE(1, 4); // 그림 수
  head.writeUInt8(size >= 256 ? 0 : size, 6);
  head.writeUInt8(size >= 256 ? 0 : size, 7);
  head.writeUInt8(0, 8); // 팔레트 색 수
  head.writeUInt8(0, 9); // 예약
  head.writeUInt16LE(1, 10); // 면
  head.writeUInt16LE(32, 12); // 색 깊이
  head.writeUInt32LE(pngBuf.length, 14);
  head.writeUInt32LE(22, 18); // PNG가 시작하는 곳
  return Buffer.concat([head, pngBuf]);
}

async function icons(badge: LogoArt): Promise<void> {
  mkdirSync(PUB, { recursive: true });
  const tile = badgeFile(badge);
  writeFileSync(join(PUB, 'icon.svg'), tile);
  console.log(`public/icon.svg  ${Buffer.byteLength(tile)}바이트`);
  const fav = await png(tile, 32, '');
  writeFileSync(join(PUB, 'favicon.ico'), ico(fav, 32));
  console.log(`public/favicon.ico  32×32  ${fav.length + 22}바이트`);
  // iOS는 투명을 검게 채우고 모서리를 스스로 깎는다: 남색으로 꽉 채운 네모
  await png(badgeFile(badge, { rx: 0 }), 180, 'apple-touch-icon.png');
  await png(tile, 192, 'icon-192.png');
  await png(tile, 512, 'icon-512.png');
  // 안드로이드 둥근 마스크: 괄호 꼭짓점까지(가운데서 22.4)가 가운데 80% 원(반지름 19.2) 안에 들게 0.82로 줄인다
  await png(badgeFile(badge, { rx: 0, scale: 0.82 }), 512, 'icon-maskable-512.png');
  const manifest = {
    name: ko.site.name,
    short_name: ko.site.name,
    description: ko.site.description,
    lang: 'ko',
    start_url: '/',
    display: 'browser',
    theme_color: HEX['logo-body'],
    background_color: MANIFEST_BG,
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { src: '/icon-512.png', type: 'image/png', sizes: '512x512' },
      { src: '/icon-maskable-512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    ],
  };
  writeFileSync(join(PUB, 'manifest.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log('public/manifest.webmanifest');
}

const { blocks, variants } = await buildVariants();
writeModule(blocks, variants);
const badgeVariant = variants.badge;
if (!badgeVariant) throw new Error('badge 벌이 없다');
await icons({ viewBox: badgeVariant.viewBox, markup: resolve(badgeVariant.pieces, blocks) });
execFileSync(process.execPath, [join(ROOT, 'scripts', 'assets', 'logo-diff.ts'), ...(process.argv.includes('--sheet') ? [] : ['--no-sheet'])], { stdio: 'inherit' });
