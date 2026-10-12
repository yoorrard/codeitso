// 3D 그림 문자 받기 (D27): microsoft/fluentui-emoji(MIT)의 고정 커밋에서 쓸 그림만 받아 128px webp로 줄인다.
//   node scripts/assets/fetch-emoji.ts
// 원본은 .cache/emoji/에 둔다 (저장소에 올리지 않는다). 결과와 LICENSE는 public/emoji/에 올린다.
// 새 그림이 필요하면 아래 표에 더하고 다시 돌린다. 이름은 저장소 폴더 이름(영어) 그대로.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { ROOT } from '../lib/load-data.ts';

const COMMIT = '1ffb34c752ecf5d402f04cfb4b392c77f57c54bc';
const RAW = `https://raw.githubusercontent.com/microsoft/fluentui-emoji/${COMMIT}`;
const CACHE = join(ROOT, '.cache', 'emoji');
const OUT = join(ROOT, 'public', 'emoji');
const SIZE = 128;

/** 우리 id → 저장소 폴더 이름. 쓰는 곳은 docs/DESIGN.md 8절 */
export const EMOJI: Record<string, string> = {
  // 정류장
  'station-lesson': 'Graduation cap',
  'station-interview': 'World map',
  'station-shop': 'Shopping cart',
  'station-check': 'Vertical traffic light',
  'station-receipt': 'Receipt',
  // 칸
  'slot-screen': 'Laptop',
  'slot-store': 'Card file box',
  'slot-auth': 'Key',
  'slot-data': 'Satellite antenna',
  'slot-notify': 'Bell',
  'slot-host': 'Rocket',
  // 보상·상태
  'party-popper': 'Party popper',
  sparkles: 'Sparkles',
  trophy: 'Trophy',
  'check-mark': 'Check mark button',
  warning: 'Warning',
  locked: 'Locked',
  unlocked: 'Unlocked',
  ticket: 'Ticket',
  'chequered-flag': 'Chequered flag',
  // 길과 차
  automobile: 'Automobile',
  taxi: 'Oncoming taxi',
  'bus-stop': 'Bus stop',
  pin: 'Round pushpin',
  // 공부·사전
  books: 'Books',
  'light-bulb': 'Light bulb',
  'thinking-face': 'Thinking face',
  'speech-balloon': 'Speech balloon',
  tools: 'Hammer and wrench',
  'magnifying-glass': 'Magnifying glass tilted left',
  // 인터뷰 그림 보기 (D43, 보기와 그림 짝은 src/lib/option-art.ts)
  notebook: 'Notebook',
  clipboard: 'Clipboard',
  newspaper: 'Newspaper',
  'ballot-check': 'Check box with check',
  abacus: 'Abacus',
  'bar-chart': 'Bar chart',
  'mobile-phone': 'Mobile phone',
  busts: 'Busts in silhouette',
  globe: 'Globe with meridians',
  'glowing-star': 'Glowing star',
  desktop: 'Desktop computer',
  package: 'Package',
  school: 'School',
  'chart-up': 'Chart increasing',
  'sun-cloud': 'Sun behind cloud',
  bus: 'Bus',
  'latin-letters': 'Input latin letters',
  'framed-picture': 'Framed picture',
  'performing-arts': 'Performing arts',
  'classical-building': 'Classical building',
  'artist-palette': 'Artist palette',
};

function fetchTo(url: string, dest: string): void {
  if (existsSync(dest)) return;
  execFileSync('curl', ['-fsSL', '--retry', '3', '-o', dest, url]);
}

mkdirSync(CACHE, { recursive: true });
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
fetchTo(`${RAW}/LICENSE`, join(CACHE, 'LICENSE'));
execFileSync('cp', [join(CACHE, 'LICENSE'), join(OUT, 'LICENSE')]);

let total = 0;
for (const [id, folder] of Object.entries(EMOJI)) {
  const file = `${folder.toLowerCase().replace(/ /g, '_')}_3d.png`;
  const src = join(CACHE, file);
  fetchTo(`${RAW}/assets/${encodeURIComponent(folder)}/3D/${file}`, src);
  const out = join(OUT, `${id}.webp`);
  const info = await sharp(src).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(out);
  total += info.size;
}
writeFileSync(
  join(OUT, 'SOURCE.md'),
  `# 3D 그림 문자\n\nmicrosoft/fluentui-emoji @ ${COMMIT} 의 3D PNG를 ${SIZE}px webp로 줄였다 (MIT, LICENSE 동봉).\n다시 만들기: \`node scripts/assets/fetch-emoji.ts\`\n\n| id | 원본 |\n|---|---|\n${Object.entries(EMOJI)
    .map(([id, f]) => `| ${id} | ${f} |`)
    .join('\n')}\n`,
);
console.log(`그림 문자 ${readdirSync(OUT).filter((f) => f.endsWith('.webp')).length}개, 합계 ${(total / 1024).toFixed(1)}KB (한 장 평균 ${(total / 1024 / Object.keys(EMOJI).length).toFixed(1)}KB)`);
