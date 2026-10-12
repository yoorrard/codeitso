// 기사님 그림 정리 (T02b): 그림 자체는 고치지 않고, 알파만 정리하고 테두리에 맞게 자른다.
//   node scripts/assets/mascot.ts
// - 거의 투명한 점(알파 8 미만)은 완전히 투명하게: 가장자리까지 퍼진 흐린 점 때문에 자르기가 안 되는 문제
// - 거의 불투명한 점(알파 250 이상)은 완전히 불투명하게: 몸이 알파 253으로 살짝 비치는 문제
// 원본(chauffeur-wave.webp)은 그대로 두고 정리본(chauffeur-wave.png)을 만든다. 화면은 Astro <Picture>가 크기별로 만든다.
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT } from '../lib/load-data.ts';

const DIR = join(ROOT, 'src', 'assets', 'mascot');
const POSES = ['chauffeur-wave'];
const PAD = 8;

for (const pose of POSES) {
  const src = join(DIR, `${pose}.webp`);
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i] ?? 0;
    if (a < 8) {
      data[i] = 0;
      data[i - 1] = 0;
      data[i - 2] = 0;
      data[i - 3] = 0;
    } else if (a >= 250) data[i] = 255;
  }
  const cleaned = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } });
  const trimmed = await cleaned.png().toBuffer();
  const t = await sharp(trimmed).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 }).toBuffer({ resolveWithObject: true });
  await sharp(t.data)
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(join(DIR, `${pose}.png`));
  console.log(`${pose}: ${info.width}×${info.height} → ${t.info.width + PAD * 2}×${t.info.height + PAD * 2}`);
}
