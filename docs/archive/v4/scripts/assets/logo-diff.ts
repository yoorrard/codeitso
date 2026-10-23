// 다시 그린 벡터 로고가 소유자 원본과 같은지 잰다 (brief 3.5, brand.md 6.3).
//   node scripts/assets/logo-diff.ts              assets-src/logo/logo.svg와 화면용 stack 벌(src/lib/logo-paths.ts)을 원본과 비교, .qa/logo-sheet.png를 만든다
//   node scripts/assets/logo-diff.ts --svg 파일   다른 SVG를 비교한다 (그리는 중 확인용)
//   node scripts/assets/logo-diff.ts --no-sheet   견본 사진 없이 겹침만 잰다
// 두 그림을 1254px에서 칸마다 색 부류(남색·파랑·청록·흰색·투명)로 나누고, 부류마다 겹침(IoU = 교집합 / 합집합)을 낸다.
// 가장자리의 섞인 칸은 두 색을 섞은 선에 가장 가까운 쪽으로 정한다(남색과 흰색이 반씩 섞인 칸이 파랑으로 잡히지 않게).
// 부류 하나라도 0.97 아래면 실패(종료 코드 1).
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import { ROOT } from '../lib/load-data.ts';
import { LOGO, type LogoVariant } from '../../src/lib/logo-paths.ts';

const SIZE = 1254;
const PASS = 0.97;
const MIX_K = 0.5;
const SRC = join(ROOT, 'assets-src', 'brand', 'logo-source.webp');
const args = process.argv.slice(2);
const svgArg = args.indexOf('--svg');
const SVG = svgArg >= 0 && args[svgArg + 1] ? args[svgArg + 1] ?? '' : join(ROOT, 'assets-src', 'logo', 'logo.svg');

const CLASSES = ['투명', '남색', '파랑', '청록', '흰색'] as const;
// 원본에서 잰 색과 토큰 색. 왼쪽 괄호 파랑(#0093FC)과 전조등 안쪽 빛(#EBFBFD)은 각각 파랑·흰색 부류로 본다.
// 왼쪽 괄호 파랑은 다른 색과 맞닿는 곳이 없어 섞는 선에 넣지 않는다(mix: false). 넣으면 청록 가장자리의 밝은 테가 파랑으로 잡힌다.
const PALETTE: { rgb: [number, number, number]; cls: number; mix: boolean }[] = [
  { rgb: [0x00, 0x1e, 0x5a], cls: 1, mix: true },
  { rgb: [0x00, 0x82, 0xfa], cls: 2, mix: true },
  { rgb: [0x00, 0x93, 0xfc], cls: 2, mix: false },
  { rgb: [0x00, 0xb4, 0xfa], cls: 3, mix: true },
  { rgb: [0xf6, 0xf8, 0xfa], cls: 4, mix: true },
  { rgb: [0xeb, 0xfb, 0xfd], cls: 4, mix: true },
];

/** RGBA 칸마다 부류 번호. 알파 128 아래는 투명. 색은 팔레트 한 색 또는 두 색을 섞은 선 중 가장 가까운 것 */
function classify(rgba: Buffer): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let p = 0; p < out.length; p++) {
    const r = rgba[p * 4] ?? 0;
    const g = rgba[p * 4 + 1] ?? 0;
    const b = rgba[p * 4 + 2] ?? 0;
    const a = rgba[p * 4 + 3] ?? 0;
    if (a < 128) continue;
    let best = Infinity;
    let cls = 0;
    for (const c of PALETTE) {
      const d = (r - c.rgb[0]) ** 2 + (g - c.rgb[1]) ** 2 + (b - c.rgb[2]) ** 2;
      if (d < best) {
        best = d;
        cls = c.cls;
      }
    }
    // 두 색을 섞은 선은 한 색보다 두 배 이상 잘 설명할 때만 쓴다(거리 제곱으로는 4배).
    // 원본 청록 띠 아래의 밝은 테(#1EA8EB 근처)가 파랑·흰색을 섞은 선에 걸려 파랑으로 잡히는 것을 막는다.
    const single = best;
    for (let i = 0; i < PALETTE.length; i++) {
      for (let j = i + 1; j < PALETTE.length; j++) {
        const P = PALETTE[i];
        const Q = PALETTE[j];
        if (!P || !Q || P.cls === Q.cls || !P.mix || !Q.mix) continue;
        const vx = P.rgb[0] - Q.rgb[0];
        const vy = P.rgb[1] - Q.rgb[1];
        const vz = P.rgb[2] - Q.rgb[2];
        const t = Math.min(1, Math.max(0, ((r - Q.rgb[0]) * vx + (g - Q.rgb[1]) * vy + (b - Q.rgb[2]) * vz) / (vx * vx + vy * vy + vz * vz)));
        const d = (r - Q.rgb[0] - t * vx) ** 2 + (g - Q.rgb[1] - t * vy) ** 2 + (b - Q.rgb[2] - t * vz) ** 2;
        if (d < best - 0.01 && d < MIX_K * MIX_K * single) {
          best = d;
          cls = t >= 0.5 ? P.cls : Q.cls;
        }
      }
    }
    out[p] = cls;
  }
  return out;
}

async function rgbaOf(input: Buffer | string, size: number): Promise<Buffer> {
  return sharp(input, { density: 72 }).resize(size, size, { fit: 'fill' }).ensureAlpha().raw().toBuffer();
}

/** 낮 색(속에 넣은 <style>)을 가진 SVG를 그대로 1254px로 그린다 */
export async function iou(svgText: string): Promise<number[]> {
  const sized = svgText.replace('<svg ', `<svg width="${SIZE}" height="${SIZE}" `);
  const [a, b] = await Promise.all([rgbaOf(SRC, SIZE), rgbaOf(Buffer.from(sized), SIZE)]);
  const ca = classify(a);
  const cb = classify(b);
  const inter = new Array<number>(CLASSES.length).fill(0);
  const union = new Array<number>(CLASSES.length).fill(0);
  for (let p = 0; p < ca.length; p++) {
    const x = ca[p] ?? 0;
    const y = cb[p] ?? 0;
    if (x === y) {
      inter[x] = (inter[x] ?? 0) + 1;
      union[x] = (union[x] ?? 0) + 1;
    } else {
      union[x] = (union[x] ?? 0) + 1;
      union[y] = (union[y] ?? 0) + 1;
    }
  }
  return CLASSES.map((_, k) => (inter[k] ?? 0) / Math.max(1, union[k] ?? 0));
}

// ---------- 견본 사진 ----------

const DAY = { body: '#001E5A', letter: '#001E5A', accent: '#0082FA', light: '#00B4FA', white: '#F6F8FA' };
const NIGHT = { body: '#4A6699', letter: '#EEF0F4', accent: '#3496F8', light: '#8FE3FF', white: '#F6F8FA' };
// 배지(파비콘·기사 메시지)는 낮·밤이 같다 (brief 3.4)
const BADGE_FIXED = new Set<LogoVariant>(['badge']);

function standalone(variant: LogoVariant, colors: typeof DAY, height: number): string {
  const v = LOGO[variant];
  const [, , w, h] = v.viewBox.split(' ').map(Number);
  const width = Math.round(((w ?? 1) / (h ?? 1)) * height);
  const c = BADGE_FIXED.has(variant) ? DAY : colors;
  const style = `.logo-body{fill:${c.body}}.logo-letter{fill:${c.letter}}.logo-accent{fill:${c.accent}}.logo-light{fill:${c.light}}.logo-white{fill:${c.white}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${v.viewBox}" color="${colors === DAY ? '#111C2C' : '#EEF0F4'}"><style>${style}</style>${v.markup}</svg>`;
}

// 원본 래스터에서 같은 부위를 잘라 같은 높이로 줄인 것 (비교용. 화면에는 쓰지 않는다)
const RASTER_BOX: Partial<Record<LogoVariant, { left: number; top: number; width: number; height: number }>> = {
  emblem: { left: 226, top: 186, width: 802, height: 678 },
  wordmark: { left: 163, top: 895, width: 919, height: 223 },
  stack: { left: 163, top: 186, width: 919, height: 932 },
};

const SIZES = [16, 24, 32, 48, 96, 240];
const BGS = [
  { hex: '#FFFFFF', night: false },
  { hex: '#F2F5F8', night: false },
  { hex: '#0F1724', night: true },
  { hex: '#08101B', night: true },
];

/** 원본 래스터로 만든 같은 벌 (비교용. 화면에는 쓰지 않는다). 가로 묶음은 원본 그림과 글자를 같은 자리에 붙여 만든다 */
async function raster(variant: LogoVariant, height: number): Promise<Buffer | null> {
  const box = RASTER_BOX[variant];
  if (box) return sharp(SRC).extract(box).resize({ height, kernel: 'lanczos3' }).png().toBuffer();
  if (variant !== 'lockup') return null;
  const k = height / 44;
  const em = await sharp(SRC).extract(RASTER_BOX.emblem ?? { left: 0, top: 0, width: 1, height: 1 }).resize({ width: Math.round(52 * k) }).png().toBuffer();
  const wm = await sharp(SRC).extract(RASTER_BOX.wordmark ?? { left: 0, top: 0, width: 1, height: 1 }).resize({ width: Math.round(82 * k) }).png().toBuffer();
  const wmH = (await sharp(wm).metadata()).height ?? 0;
  return sharp({ create: { width: Math.round(142 * k), height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: em, left: 0, top: 0 },
      { input: wm, left: Math.round(60 * k), top: Math.round((height - wmH) / 2) },
    ])
    .png()
    .toBuffer();
}

/** 줄마다 (벌, 바탕) 하나, 칸마다 크기 하나(16·24·32·48·96·240px 높이). 원본 래스터 줄은 흰 바탕 벡터 줄 바로 아래 */
async function sheet(): Promise<string> {
  type Row = { bg: string; make: (size: number) => Promise<Buffer | null> };
  const rows: Row[] = [];
  const vec = (variant: LogoVariant, night: boolean) => async (size: number) =>
    sharp(Buffer.from(standalone(variant, night ? NIGHT : DAY, size))).png().toBuffer();
  const variants: LogoVariant[] = ['emblem', 'wordmark', 'lockup', 'stack', 'badge', 'mono'];
  for (const v of variants) {
    for (const [i, bg] of BGS.entries()) {
      rows.push({ bg: bg.hex, make: vec(v, bg.night) });
      if (i === 0 && v !== 'badge' && v !== 'mono') rows.push({ bg: bg.hex, make: (size) => raster(v, size) });
    }
  }
  const PAD = 12;
  const tiles: OverlayOptions[] = [];
  let y = PAD;
  let maxW = 0;
  for (const row of rows) {
    const parts: { buf: Buffer; w: number; h: number }[] = [];
    for (const size of SIZES) {
      const buf = await row.make(size);
      const m = buf ? await sharp(buf).metadata() : null;
      parts.push({ buf: buf ?? Buffer.alloc(0), w: m?.width ?? 0, h: m?.height ?? 0 });
    }
    const cw = parts.reduce((sum, p) => sum + Math.max(p.w, 16) + PAD, PAD);
    const ch = Math.max(...parts.map((p) => p.h), 16) + PAD * 2;
    tiles.push({ input: { create: { width: cw, height: ch, channels: 4, background: row.bg } }, left: PAD, top: y });
    let cx = PAD * 2;
    for (const p of parts) {
      if (p.buf.length > 0) tiles.push({ input: p.buf, left: cx, top: y + ch - PAD - p.h });
      cx += Math.max(p.w, 16) + PAD;
    }
    maxW = Math.max(maxW, cw + PAD * 2);
    y += ch + 4;
  }
  const out = join(ROOT, '.qa', 'logo-sheet.png');
  mkdirSync(join(ROOT, '.qa'), { recursive: true });
  await sharp({ create: { width: maxW, height: y + PAD, channels: 4, background: '#C9CED6' } })
    .composite(tiles)
    .png()
    .toFile(out);
  return out;
}

/** 화면에 싣는 stack 벌(줄인 경로)을 원본 좌표 틀에 다시 놓은 SVG: 줄이면서 모양이 바뀌지 않았는지도 잰다 */
function inlineStack(): string {
  const style = `.logo-body{fill:${DAY.body}}.logo-letter{fill:${DAY.letter}}.logo-accent{fill:${DAY.accent}}.logo-light{fill:${DAY.light}}.logo-white{fill:${DAY.white}}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}"><style>${style}</style>${LOGO.stack.markup}</svg>`;
}

let ok = true;
const checks: [string, string][] = [['원본 SVG', readFileSync(SVG, 'utf8')]];
if (svgArg < 0) checks.push(['화면용 stack', inlineStack()]);
for (const [label, text] of checks) {
  const scores = await iou(text);
  console.log(label);
  for (const [k, name] of CLASSES.entries()) {
    const sc = scores[k] ?? 0;
    if (sc < PASS) ok = false;
    console.log(`  ${name.padEnd(3, ' ')}  IoU ${sc.toFixed(4)}${sc < PASS ? `  ← ${PASS} 아래` : ''}`);
  }
}
if (!args.includes('--no-sheet')) console.log(`견본: ${await sheet()}`);
if (!ok) {
  console.log(`\n색 부류 겹침이 ${PASS} 아래인 것이 있다. ${SVG}의 그 색 경로를 원본(assets-src/brand/logo-source.webp)과 겹쳐 보고 고친다.`);
  process.exit(1);
}
console.log('벡터 로고가 원본과 겹친다 (모든 부류 0.97 이상).');
