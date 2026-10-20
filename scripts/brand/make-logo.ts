// 로고 자산 만들기 (v5, D104 · 이름 바꿈 D129): 소유자가 준 장바구니 로고(assets-src/brand/logo-cart-source.webp, 1254px 흰 바탕)의
// 장바구니와 새 글자 로고(assets-src/brand/wordmark-codeitso.png, npm run logo:word)로 머리줄·바닥글·공유 그림·앱 아이콘·파비콘을 만든다.
// 원본은 고치지 않는다.
//   node scripts/brand/make-logo.ts   (npm run logo)
// 1. 흰 바탕 빼기: 네 모서리에서 이어진 거의 흰 칸만 바탕으로 보고(MD 카드의 옅은 흰색은 테두리에 막혀 남는다),
//    바탕과 그 둘레 2px는 흰색을 걷어 내는 식(color to alpha)으로 반투명하게 만든다. 그래서 어두운 바탕에도 흰 테두리가 남지 않는다.
// 2. 자르기: 행 프로필로 장바구니(위)와 옛 글자(아래)를 나눈다. 옛 글자는 쓰지 않고 크기·간격만 본다(세로 묶음을 같은 비율로).
// 3. 밤 짝: 남색 글자 '코드'와 바퀴는 어두운 바탕에서 묻히므로 밝은 색으로 바꾼 짝을 따로 만든다.
// 4. 파비콘·앱 아이콘은 장바구니만, 바탕 없이(투명) 둔다(소유자 요청 2026-10-20). 바탕이 꼭 필요한 iOS 홈 화면 아이콘과
//    가림(maskable) 아이콘만 흰 판 위에 둔다.
// sharp는 Astro가 함께 설치하는 그림 도구다(새 의존성 아님). 만든 파일은 저장소에 올린다.
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { Sharp } from 'sharp';
import { ROOT } from '../lib/load-data.ts';

const SRC = join(ROOT, 'assets-src', 'brand', 'logo-cart-source.webp');
const WORD_SRC = join(ROOT, 'assets-src', 'brand', 'wordmark-codeitso.png');
const PUBLIC = join(ROOT, 'public');
const BRAND = join(PUBLIC, 'brand');

/** 바탕으로 보는 흰 정도 (세 채널 모두 이 값 이상) */
const BG_MIN = 246;
/** 바탕 둘레에서 흰색을 걷어 내는 폭(px) */
const EDGE = 2;
/** 밤 짝 색: 남색 → 밝은 회색, 파랑 → 밝은 파랑 */
const NIGHT_NAVY: [number, number, number] = [238, 242, 249];
const NIGHT_BLUE: [number, number, number] = [110, 160, 255];

interface Raster {
  w: number;
  h: number;
  /** RGBA */
  px: Uint8ClampedArray;
}

async function load(file: string): Promise<Raster> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: new Uint8ClampedArray(data) };
}

/** 네 모서리에서 이어진 바탕 칸을 찾고 둘레를 넓힌 뒤 흰색을 걷어 낸다 */
function removeBackground(r: Raster): void {
  const { w, h, px } = r;
  const bg = new Uint8Array(w * h);
  const white = (i: number): boolean => (px[i * 4] ?? 0) >= BG_MIN && (px[i * 4 + 1] ?? 0) >= BG_MIN && (px[i * 4 + 2] ?? 0) >= BG_MIN;
  const queue: number[] = [];
  const push = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (bg[i] || !white(i)) return;
    bg[i] = 1;
    queue.push(i);
  };
  for (let x = 0; x < w; x += 1) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y += 1) {
    push(0, y);
    push(w - 1, y);
  }
  while (queue.length > 0) {
    const i = queue.pop() ?? 0;
    const x = i % w;
    const y = (i - x) / w;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  // 둘레 넓히기: 바탕과 맞닿은 테두리 칸(흰색과 섞인 칸)도 걷어 낸다
  let band = bg;
  for (let k = 0; k < EDGE; k += 1) {
    const next = new Uint8Array(band);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        if (band[i]) continue;
        if ((x > 0 && band[i - 1]) || (x < w - 1 && band[i + 1]) || (y > 0 && band[i - w]) || (y < h - 1 && band[i + w])) next[i] = 1;
      }
    }
    band = next;
  }
  for (let i = 0; i < w * h; i += 1) {
    if (!band[i]) continue;
    const o = i * 4;
    const c = [px[o] ?? 0, px[o + 1] ?? 0, px[o + 2] ?? 0];
    // 흰색에서 가장 먼 채널만큼 불투명하다고 보고, 흰색을 빼고 남은 색을 되살린다
    const a = Math.max(...c.map((v) => (255 - v) / 255));
    if (a <= 0.004) {
      px[o + 3] = 0;
      continue;
    }
    for (let ch = 0; ch < 3; ch += 1) px[o + ch] = Math.round(((c[ch] ?? 0) - 255 * (1 - a)) / a);
    px[o + 3] = Math.round(a * 255);
  }
}

/** 투명하지 않은 칸의 상자 (y0~y1 행 안에서) */
function bbox(r: Raster, y0: number, y1: number): { left: number; top: number; width: number; height: number } {
  let minX = r.w;
  let minY = r.h;
  let maxX = -1;
  let maxY = -1;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = 0; x < r.w; x += 1) {
      if ((r.px[(y * r.w + x) * 4 + 3] ?? 0) > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** 빈 행(불투명 칸 없음)으로 장바구니와 글자를 나눈다: 가장 아래의 긴 빈 띠 위 = 장바구니, 아래 = 글자 */
function split(r: Raster): { cart: [number, number]; word: [number, number] } {
  const filled: boolean[] = [];
  for (let y = 0; y < r.h; y += 1) {
    let any = false;
    for (let x = 0; x < r.w && !any; x += 1) any = (r.px[(y * r.w + x) * 4 + 3] ?? 0) > 8;
    filled.push(any);
  }
  const first = filled.indexOf(true);
  const last = filled.lastIndexOf(true);
  // 아래에서 위로 가며 첫 글자 덩어리 위의 빈 띠(8행 이상)를 찾는다
  let y = last;
  while (y > first && filled[y]) y -= 1;
  const gapEnd = y;
  while (y > first && !filled[y]) y -= 1;
  if (gapEnd - y < 8) throw new Error('장바구니와 글자 사이 빈 띠를 찾지 못했다');
  return { cart: [first, y], word: [gapEnd + 1, last] };
}

/** 남색 칸(어두운 칸)과 파랑 칸을 밤 색으로 바꾼다. rows가 있으면 그 행 범위만 */
function nightCopy(r: Raster, rows?: [number, number]): Raster {
  const px = new Uint8ClampedArray(r.px);
  for (let y = rows?.[0] ?? 0; y <= (rows?.[1] ?? r.h - 1); y += 1) {
    for (let x = 0; x < r.w; x += 1) {
      const o = (y * r.w + x) * 4;
      if ((px[o + 3] ?? 0) === 0) continue;
      const [cr, cg, cb] = [px[o] ?? 0, px[o + 1] ?? 0, px[o + 2] ?? 0];
      const navy = cr < 90 && cg < 110 && cb < 150;
      const blue = !rows && cb > 150 && cr < 90;
      const to = navy ? NIGHT_NAVY : blue ? NIGHT_BLUE : null;
      if (!to) continue;
      [px[o], px[o + 1], px[o + 2]] = to;
    }
  }
  return { w: r.w, h: r.h, px };
}

function image(r: Raster): Sharp {
  return sharp(Buffer.from(r.px.buffer), { raw: { width: r.w, height: r.h, channels: 4 } });
}

async function crop(r: Raster, box: { left: number; top: number; width: number; height: number }): Promise<Raster> {
  const { data, info } = await image(r).extract(box).raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, px: new Uint8ClampedArray(data) };
}

/** 화면이 쓰는 그림 주소 (public/ 기준). 파일 이름에 내용 해시를 넣는다: Cloudflare 가장자리 캐시는 이름이 같은 그림을
 *  배포 뒤에도 한동안 옛것으로 준다(이름 바꿈 뒤 옛 로고가 보임, D131). 그래서 바뀌면 이름도 바뀌게 한다 */
const files: Record<string, string> = {};

/** public/brand/<이름>.<해시 8자>.<확장자>로 쓰고 주소를 files에 적는다 */
function emit(key: string, name: string, ext: string, data: Buffer): void {
  const file = `${name}.${createHash('sha256').update(data).digest('hex').slice(0, 8)}.${ext}`;
  writeFileSync(join(BRAND, file), data);
  files[key] = `/brand/${file}`;
}

/** 높이 h로 줄인 WebP */
async function webp(r: Raster, h: number, key: string): Promise<{ w: number; h: number }> {
  const out = await image(r).resize({ height: h }).webp({ quality: 92, alphaQuality: 100, effort: 6 }).toBuffer({ resolveWithObject: true });
  emit(key, key, 'webp', out.data);
  return { w: out.info.width, h: out.info.height };
}

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** 장바구니 아이콘 (size 정사각, pad = 안쪽 여백 비율). plate가 있으면 그 모서리 비율로 흰 둥근 판 위에, 없으면 투명 바탕 */
async function tile(cart: Raster, size: number, pad: number, plate?: { round: number }): Promise<Buffer> {
  const inner = Math.round(size * (1 - pad * 2));
  const icon = await image(cart).resize({ width: inner, height: inner, fit: 'contain', background: CLEAR }).png().toBuffer();
  const off = Math.round((size - inner) / 2);
  const base = plate
    ? sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * plate.round)}" fill="#ffffff"/></svg>`))
    : sharp({ create: { width: size, height: size, channels: 4, background: CLEAR } });
  return base.composite([{ input: icon, left: off, top: off }]).png({ compressionLevel: 9 }).toBuffer();
}

/** PNG 여러 장을 담은 .ico (ICONDIR + ICONDIRENTRY + PNG 본문) */
function ico(pngs: { size: number; data: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach((p, i) => {
    const e = 6 + i * 16;
    head.writeUInt8(p.size >= 256 ? 0 : p.size, e);
    head.writeUInt8(p.size >= 256 ? 0 : p.size, e + 1);
    head.writeUInt8(0, e + 2);
    head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(p.data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += p.data.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.data)]);
}

async function main(): Promise<void> {
  // 지난번에 만든 그림을 지우고 새로 쓴다 (이름이 해시라 남기면 쌓인다)
  rmSync(BRAND, { recursive: true, force: true });
  mkdirSync(BRAND, { recursive: true });
  for (const old of ['og.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) rmSync(join(PUBLIC, old), { force: true });
  const src = await load(SRC);
  removeBackground(src);
  const parts = split(src);
  const cartBox = bbox(src, parts.cart[0], parts.cart[1]);
  const oldWordBox = bbox(src, parts.word[0], parts.word[1]);
  const cart = await crop(src, cartBox);
  const word = await load(WORD_SRC);
  // 밤 짝: 장바구니는 바퀴(바구니 아래 행)만, 글자는 남색·파랑 모두
  const wheelsFrom = Math.round(cart.h * 0.86);
  const cartNight = nightCopy(cart, [wheelsFrom, cart.h - 1]);
  const wordNight = nightCopy(word);

  // 머리줄: 장바구니 40px·글자 22px (2배 그림). 바닥글은 같은 파일을 작게 쓴다
  const sizes: Record<string, { w: number; h: number }> = {};
  sizes['cart'] = await webp(cart, 96, 'cart');
  sizes['cart-night'] = await webp(cartNight, 96, 'cart-night');
  sizes['wordmark'] = await webp(word, 56, 'wordmark');
  sizes['wordmark-night'] = await webp(wordNight, 56, 'wordmark-night');
  // 세로 묶음(장바구니 + 글자): 원본의 글자 높이·간격 그대로, 가운데 맞춤. 공유 그림과 소유자용 로고 그림
  const gap = oldWordBox.top - (cartBox.top + cartBox.height);
  const wordH = oldWordBox.height;
  const wordW = Math.round((word.w / word.h) * wordH);
  const lockW = Math.max(cart.w, wordW);
  const lockH = cart.h + gap + wordH;
  const lockup = await sharp({ create: { width: lockW, height: lockH, channels: 4, background: CLEAR } })
    .composite([
      { input: await image(cart).png().toBuffer(), left: Math.round((lockW - cart.w) / 2), top: 0 },
      { input: await image(word).resize({ height: wordH }).png().toBuffer(), left: Math.round((lockW - wordW) / 2), top: cart.h + gap },
    ])
    .png()
    .toBuffer();
  // 소유자가 다른 곳(프로필 사진 등)에 쓸 정사각 로고: 원본과 같은 1254px, 투명 바탕
  const square = 1254;
  const fit = await sharp(lockup).resize({ width: Math.round(square * 0.82), height: Math.round(square * 0.82), fit: 'inside' }).png().toBuffer();
  const fitMeta = await sharp(fit).metadata();
  await sharp({ create: { width: square, height: square, channels: 4, background: CLEAR } })
    .composite([{ input: fit, left: Math.round((square - (fitMeta.width ?? 0)) / 2), top: Math.round((square - (fitMeta.height ?? 0)) / 2) }])
    .png({ compressionLevel: 9 })
    .toFile(join(ROOT, 'assets-src', 'brand', 'logo-codeitso.png'));

  // 공유 그림 1200×630: 흰 바탕 가운데 세로 묶음
  const og = await sharp(lockup).resize({ height: 500 }).png().toBuffer();
  const ogMeta = await sharp(og).metadata();
  const ogPng = await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#ffffff' } })
    .composite([{ input: og, left: Math.round((1200 - (ogMeta.width ?? 0)) / 2), top: 65 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  emit('og', 'og', 'png', ogPng);

  // 앱 아이콘·파비콘: 장바구니만. 탭·설명서 아이콘은 투명, iOS 홈 화면(투명이면 검게 칠함)과 가림 아이콘만 흰 판
  const touch = await tile(cart, 180, 0.1, { round: 0 });
  emit('appleTouchIcon', 'apple-touch-icon', 'png', touch);
  emit('icon192', 'icon-192', 'png', await tile(cart, 192, 0.04));
  emit('icon512', 'icon-512', 'png', await tile(cart, 512, 0.04));
  // 가림 아이콘: 가운데 원(지름 80%) 안에 들게
  emit('iconMaskable', 'icon-maskable-512', 'png', await tile(cart, 512, 0.2, { round: 0 }));
  const fav = ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await tile(cart, size, 0) }))));
  emit('favicon', 'favicon', 'ico', fav);
  // 이름을 정해 두고 브라우저가 스스로 찾는 두 파일(링크를 읽지 않는 곳)도 같은 내용으로 둔다
  writeFileSync(join(PUBLIC, 'favicon.ico'), fav);
  writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), touch);
  writeFileSync(join(ROOT, 'src', 'lib', 'brand-sizes.json'), `${JSON.stringify(sizes, null, 2)}\n`);
  const lines = Object.entries(files)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v.slice(1))},`);
  writeFileSync(
    join(ROOT, 'src', 'lib', 'brand-files.ts'),
    `// npm run logo가 만든다. 손으로 고치지 않는다. 그림 이름에 내용 해시가 들어 있다 (D131). 주소 바탕은 routes.ts가 붙인다\nexport const BRAND_FILES = {\n${lines.join('\n')}\n} as const;\n`,
  );
  console.log(`로고 자산: 장바구니 ${cart.w}×${cart.h}, 글자 ${word.w}×${word.h} → public/brand/ (이름에 해시, src/lib/brand-files.ts), favicon.ico·apple-touch-icon.png, assets-src/brand/logo-codeitso.png`);
  console.log(readdirSync(BRAND).join(' '));
  console.log(sizes);
}

await main();
