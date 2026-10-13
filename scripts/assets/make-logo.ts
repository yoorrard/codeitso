// 로고 원본(assets-src/brand/logo-source.webp, 소유자 제공, D60)에서 화면용 그림을 자른다 (npm run logo).
//   emblem: 기사·차·코드 괄호 (글자 상표 빼고)    wordmark: '코드쇼퍼' 글자 상표    full: 둘 다
// 원본은 고치지 않는다. 잘라 낸 PNG는 src/assets/brand/에 두고, 화면은 Astro <Picture>가 AVIF·WebP로 바꿔 싣는다.
// 파비콘·홈 화면 아이콘(불투명)과 머리줄·기사 메시지용 작은 그림(public/brand/*.webp, 1배·2배)은 public/에 바로 둔다.
// 밤 지도에서는 남색('코드' 글자)이 바탕에 묻히므로, 글자 상표의 남색 칸만 밝은 회색으로 바꾼 밤용 한 벌을 따로 만든다.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT } from '../lib/load-data.ts';

const SRC = join(ROOT, 'assets-src', 'brand', 'logo-source.webp');
const OUT = join(ROOT, 'src', 'assets', 'brand');
const PUB = join(ROOT, 'public');

// 원본 좌표에서 잰 상자 (투명이 아닌 줄의 덩어리: 그림 186~863, 글자 895~1117)
const EMBLEM = { left: 226, top: 186, width: 802, height: 678 };
const WORDMARK = { left: 163, top: 895, width: 919, height: 223 };
const FULL = { left: 163, top: 186, width: 919, height: 932 };

async function crop(box: typeof EMBLEM, width: number, name: string): Promise<void> {
  const out = join(OUT, name);
  await sharp(SRC).extract(box).resize({ width, kernel: 'lanczos3' }).png({ compressionLevel: 9, palette: true, quality: 95 }).toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`${name}  ${meta.width}×${meta.height}`);
}

/** 불투명 아이콘: 흰 바탕 둥근 네모 없이 꽉 찬 흰 정사각 위에 그림 (홈 화면 아이콘은 기기가 모서리를 깎는다) */
async function icon(size: number, name: string, pad: number): Promise<void> {
  const inner = Math.round(size * (1 - pad * 2));
  const emblem = await sharp(SRC).extract(EMBLEM).resize({ width: inner, height: inner, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite([{ input: emblem, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(join(PUB, name));
  console.log(`public/${name}  ${size}×${size}`);
}

/** 밤용 한 벌: 남색 칸(로고 남색 가까운 색)만 다른 색으로 바꾼다. 파랑·흰색·투명은 그대로.
 *  글자 상표의 '코드'는 밝은 회색(#EEF0F4), 그림의 차·옷·모자는 한 단 밝은 남색(#3B62B0)으로 실루엣이 밤 바탕에서 보이게 */
async function night(box: typeof EMBLEM, width: number, rgb: [number, number, number]): Promise<Buffer> {
  const { data, info } = await sharp(SRC).extract(box).resize({ width, kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    // 남색 계열: 어둡고 파랑이 빨강보다 큰 칸. 로고 파랑(#0082FA)·하늘(#00B4FA)은 밝아서 남는다
    if (r < 70 && g < 90 && b < 150 && b >= r) {
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** public/brand/<name>-<w>.webp (1배·2배) */
async function webp(input: Buffer | string, box: typeof EMBLEM | null, widths: number[], name: string): Promise<void> {
  mkdirSync(join(PUB, 'brand'), { recursive: true });
  for (const w of widths) {
    const img = box ? sharp(input).extract(box) : sharp(input);
    const out = join(PUB, 'brand', `${name}-${w}.webp`);
    await img.resize({ width: w, kernel: 'lanczos3' }).webp({ quality: 90, alphaQuality: 100 }).toFile(out);
    const meta = await sharp(out).metadata();
    console.log(`public/brand/${name}-${w}.webp  ${meta.width}×${meta.height}`);
  }
}

/** 파비콘: 투명 바탕 정사각 PNG */
async function favicon(size: number, name: string): Promise<void> {
  const emblem = await sharp(SRC).extract(EMBLEM).resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true }).toBuffer();
  await sharp(emblem).toFile(join(PUB, name));
  console.log(`public/${name}  ${size}×${size}`);
}

mkdirSync(OUT, { recursive: true });
await crop(EMBLEM, 512, 'logo-emblem.png');
await crop(WORDMARK, 640, 'logo-wordmark.png');
await crop(FULL, 640, 'logo-full.png');
await icon(180, 'apple-touch-icon.png', 0.08);
await icon(512, 'icon-512.png', 0.1);
await webp(SRC, EMBLEM, [48, 96, 160], 'emblem');
await webp(SRC, WORDMARK, [112, 224], 'wordmark');
await webp(await night(WORDMARK, 448, [0xee, 0xf0, 0xf4]), null, [112, 224], 'wordmark-night');
await webp(await night(EMBLEM, 320, [0x3b, 0x62, 0xb0]), null, [48, 96, 160], 'emblem-night');
await favicon(32, 'favicon-32.png');
await favicon(48, 'favicon-48.png');
