// 글자 로고 '코드잇소' 원본 만들기 (2026-10-20 이름 바꿈, D129): 소유자 로고의 글자('코드' 남색 + 뒤 두 글자 파랑, 아주 굵고 모서리가 둥근 고딕)에
// 가장 가까운 공개 글꼴 Black Han Sans(Zess Type, SIL OFL 1.1)로 그리고, 흐리게 한 뒤 다시 세워 모서리를 원본처럼 둥글린다.
//   node scripts/brand/make-wordmark.ts   (npm run logo:word, 글꼴을 한 번 받으므로 네트워크 필요) → assets-src/brand/wordmark-codeitso.png
// 만든 그림은 저장소에 올리고, npm run logo가 이 그림으로 머리줄 글자·공유 그림을 만든다(네트워크 없이).
// 글꼴 파일은 저장소에 넣지 않는다(.cache/brand/). OFL은 글꼴로 그린 그림(로고)을 자유롭게 쓰게 한다.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { SharpOptions } from 'sharp';
import { ROOT } from '../lib/load-data.ts';

const FONT_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/blackhansans/BlackHanSans-Regular.ttf';
const FONT = join(ROOT, '.cache', 'brand', 'BlackHanSans-Regular.ttf');
const OUT = join(ROOT, 'assets-src', 'brand', 'wordmark-codeitso.png');

/** 앞 두 글자(남색)와 뒤 두 글자(파랑). 색은 소유자 로고 글자에서 뽑은 평균 */
const WORD = ['코드', '잇소'] as const;
const NAVY: [number, number, number] = [0x13, 0x2a, 0x4c];
const BLUE: [number, number, number] = [0x04, 0x62, 0xed];
/** 원본 글자 폭에 맞춘 자간(Pango 단위 1/1024pt)과 모서리 둥글리기(흐림 시그마, px) */
const LETTER_SPACING = -18000;
const ROUND = 7;
const PAD = 40;

async function font(): Promise<void> {
  if (existsSync(FONT)) return;
  mkdirSync(join(ROOT, '.cache', 'brand'), { recursive: true });
  const res = await fetch(FONT_URL).catch(() => undefined);
  if (!res?.ok) {
    console.error(`글꼴을 받지 못했다. ${FONT_URL} 을 받아 ${FONT} 에 두고 다시 돌린다 (프록시 환경이면 NODE_USE_ENV_PROXY=1).`);
    process.exit(1);
  }
  writeFileSync(FONT, Buffer.from(await res.arrayBuffer()));
}

function textInput(text: string): SharpOptions {
  return { text: { text: `<span letter_spacing="${LETTER_SPACING}">${text}</span>`, font: 'Black Han Sans 200', fontfile: FONT, rgba: true, dpi: 144 } };
}

async function main(): Promise<void> {
  await font();
  const { data: alpha, info } = await sharp(textInput(WORD.join('')))
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // 모서리 둥글리기: 흐린 알파를 가운데(128)에서 가파르게 다시 세운다. 가장자리 1~2px만 부드럽게 남는다
  const blurred = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(ROUND).extractChannel(0).raw().toBuffer();
  const leftWidth = (await sharp(textInput(WORD[0])).metadata()).width ?? 0;
  const split = PAD + leftWidth;
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i += 1) {
    const c = i % w < split ? NAVY : BLUE;
    px[i * 4] = c[0];
    px[i * 4 + 1] = c[1];
    px[i * 4 + 2] = c[2];
    px[i * 4 + 3] = Math.max(0, Math.min(255, ((blurred[i] ?? 0) - 128) * 6 + 128));
  }
  const out = await sharp(px, { raw: { width: w, height: h, channels: 4 } }).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  writeFileSync(OUT, out.data);
  console.log(`글자 로고: ${out.info.width}×${out.info.height} → ${OUT}`);
}

await main();
