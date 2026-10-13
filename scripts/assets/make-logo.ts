// 로고 원본(assets-src/brand/logo-source.webp, 소유자 제공, D60)에서 화면용 그림을 자른다 (npm run logo).
//   emblem: 기사·차·코드 괄호 (글자 상표 빼고)    wordmark: '코드쇼퍼' 글자 상표    full: 둘 다
// 원본은 고치지 않는다. 잘라 낸 PNG는 src/assets/brand/에 두고, 화면은 Astro <Picture>가 AVIF·WebP로 바꿔 싣는다.
// 파비콘·홈 화면 아이콘(불투명)은 public/에 바로 둔다.
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

mkdirSync(OUT, { recursive: true });
await crop(EMBLEM, 512, 'logo-emblem.png');
await crop(WORDMARK, 640, 'logo-wordmark.png');
await crop(FULL, 640, 'logo-full.png');
await icon(180, 'apple-touch-icon.png', 0.08);
await icon(512, 'icon-512.png', 0.1);
