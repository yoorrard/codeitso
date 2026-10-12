// 글꼴 만들기 (D29). 외부 글꼴 서버를 부르지 않게, 쓸 글꼴 파일을 public/fonts/에 직접 둔다.
//   node scripts/fonts/build-fonts.ts          Pretendard 조각 복사 + 영수증 글꼴(CC Receipt) 만들기 + src/styles/fonts.css
//   node scripts/fonts/build-fonts.ts --check  영수증 글꼴에 필요한 글자가 다 들어 있는지만 본다 (npm run check)
// 원본은 .cache/fonts/에 내려받는다 (저장소에 올리지 않는다). 만든 파일과 OFL 원문은 저장소에 올린다.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA_DIR, ROOT, readJson } from '../lib/load-data.ts';
import { readName, renameFont } from './sfnt-name.ts';
import type { NameRecords } from './sfnt-name.ts';

const CACHE = join(ROOT, '.cache', 'fonts');
const OUT_PRETENDARD = join(ROOT, 'public', 'fonts', 'pretendard');
const OUT_RECEIPT = join(ROOT, 'public', 'fonts', 'receipt');
const FONTS_CSS = join(ROOT, 'src', 'styles', 'fonts.css');

const PRETENDARD_VERSION = '1.3.9';
// 가변 글꼴 동적 하위 집합 (D38): 굵기 45~920을 한 조각에 담는다. 글꼴 CSS가 정적 3굵기의 1/3이라 첫 화면을 덜 막는다.
const PRETENDARD_FAMILY = 'Pretendard Variable';
const D2_TAG = 'VER1.4.0';
const D2_FILES: { weight: number; style: string; file: string; sha256: string }[] = [
  { weight: 400, style: 'Regular', file: 'D2Coding-Regular.ttf', sha256: 'd5f2b6bf5b1826cfbf3734c70582f0cd42ea2e1d6c2636ae681b612bc9c5682f' },
  { weight: 700, style: 'Bold', file: 'D2Coding-Bold.ttf', sha256: '14a0cfa4d96fbd976bc4b1a6ef81e51df353a1689d5273ebcd908c857a4f2752' },
];
const RECEIPT_FAMILY = 'CC Receipt';

/** 영수증 글꼴에 넣을 글자: 출력 가능한 ASCII + 기호 + 영수증·전광판의 고정 글자 */
export async function receiptChars(): Promise<string> {
  const set = new Set<string>();
  const add = (s: string): void => {
    for (const ch of s) if (ch !== '\n' && ch !== '\t') set.add(ch);
  };
  for (let c = 0x20; c <= 0x7e; c += 1) add(String.fromCharCode(c));
  add('·…─—–₩×•↑↓←→✓★%°');
  const templates = readJson<{ receipt: unknown }>(join(DATA_DIR, 'templates.json'));
  add(JSON.stringify(templates.receipt).replace(/\{\{[a-z]+\}\}/g, ''));
  const rules = readJson<{ rules: { type: string; slot?: { label: string } }[] }>(join(DATA_DIR, 'rules.json'));
  for (const r of rules.rules) if (r.type === 'slot' && r.slot) add(r.slot.label);
  // 화면의 전광판·계기판 고정 문구 (src/copy/ko.ts의 board 묶음이 생기면 함께 넣는다)
  const ko = (await import('../../src/copy/ko.ts')) as { ko: Record<string, unknown> };
  const board = ko.ko['board'];
  if (board) add(JSON.stringify(board).replace(/\{\{[a-z]+\}\}/g, ''));
  return [...set].sort().join('');
}

function sha256(buf: Uint8Array): string {
  return createHash('sha256').update(buf).digest('hex');
}

function download(url: string, dest: string): void {
  if (existsSync(dest)) return;
  mkdirSync(CACHE, { recursive: true });
  execFileSync('curl', ['-fsSL', '--retry', '3', '-o', dest, url], { stdio: 'inherit' });
}

function buildPretendard(): string {
  const tgz = join(CACHE, `pretendard-${PRETENDARD_VERSION}.tgz`);
  if (!existsSync(tgz)) {
    mkdirSync(CACHE, { recursive: true });
    execFileSync('npm', ['pack', `pretendard@${PRETENDARD_VERSION}`, '--pack-destination', CACHE], { stdio: 'inherit' });
  }
  const ex = join(CACHE, `pretendard-${PRETENDARD_VERSION}`);
  const web = join(ex, 'package', 'dist', 'web', 'variable');
  if (!existsSync(join(web, 'pretendardvariable-dynamic-subset.css'))) {
    mkdirSync(ex, { recursive: true });
    execFileSync('tar', ['-xzf', tgz, '-C', ex, 'package/dist/web/variable/woff2-dynamic-subset', 'package/dist/web/variable/pretendardvariable-dynamic-subset.css', 'package/dist/LICENSE.txt']);
  }
  rmSync(OUT_PRETENDARD, { recursive: true, force: true });
  mkdirSync(OUT_PRETENDARD, { recursive: true });
  copyFileSync(join(ex, 'package', 'dist', 'LICENSE.txt'), join(OUT_PRETENDARD, 'OFL.txt'));
  const css = readFileSync(join(web, 'pretendardvariable-dynamic-subset.css'), 'utf8');
  const blocks = css.match(/@font-face\s*\{[^}]*\}/g) ?? [];
  const keep: string[] = [];
  for (const block of blocks) {
    const file = block.match(/woff2-dynamic-subset\/([^)]+\.woff2)/)?.[1];
    const range = block.match(/unicode-range:\s*([^;]+);/)?.[1];
    if (!file || !range) continue;
    copyFileSync(join(web, 'woff2-dynamic-subset', file), join(OUT_PRETENDARD, file));
    keep.push(
      `@font-face {\n  font-family: '${PRETENDARD_FAMILY}';\n  font-style: normal;\n  font-display: swap;\n  font-weight: 45 920;\n  src: url('/fonts/pretendard/${file}') format('woff2-variations');\n  unicode-range: ${range.trim()};\n}`,
    );
  }
  console.log(`${PRETENDARD_FAMILY}: 조각 ${readdirSync(OUT_PRETENDARD).filter((f) => f.endsWith('.woff2')).length}개`);
  return keep.join('\n');
}

async function buildReceipt(chars: string): Promise<string> {
  const subsetFont = (await import('subset-font')).default;
  const fontverter = await import('fontverter');
  rmSync(OUT_RECEIPT, { recursive: true, force: true });
  mkdirSync(OUT_RECEIPT, { recursive: true });
  download(`https://raw.githubusercontent.com/naver/d2-coding-font/${D2_TAG}/OFL.txt`, join(CACHE, 'D2Coding-OFL.txt'));
  const faces: string[] = [];
  const hashes: Record<string, string> = {};
  for (const f of D2_FILES) {
    const src = join(CACHE, f.file);
    download(`https://raw.githubusercontent.com/naver/d2-coding-font/${D2_TAG}/fonts/ttf/${f.file}`, src);
    const raw = new Uint8Array(readFileSync(src));
    hashes[f.file] = sha256(raw);
    if (f.sha256 && hashes[f.file] !== f.sha256) throw new Error(`${f.file} 원본이 고정해 둔 것과 다릅니다`);
    const sfnt = new Uint8Array(await subsetFont(Buffer.from(raw), chars, { targetFormat: 'sfnt' }));
    const names: NameRecords = {
      copyright: 'Copyright (c) 2015, NAVER Corporation. Subset and renamed from D2Coding by Code Chauffeur contributors, 2026.',
      family: RECEIPT_FAMILY,
      subfamily: f.style,
      uniqueId: `${RECEIPT_FAMILY} ${f.style}; 1.4.0-cc1`,
      fullName: `${RECEIPT_FAMILY} ${f.style}`,
      version: 'Version 1.400; subset cc1',
      postScriptName: `CCReceipt-${f.style}`,
      license: 'This Font Software is licensed under the SIL Open Font License, Version 1.1.',
      licenseUrl: 'https://openfontlicense.org',
    };
    const renamed = renameFont(sfnt, names);
    if (readName(renamed, 1) !== RECEIPT_FAMILY) throw new Error('글꼴 이름 바꾸기에 실패했습니다');
    const woff2 = await fontverter.convert(Buffer.from(renamed), 'woff2');
    const name = `cc-receipt-${f.style.toLowerCase()}.woff2`;
    writeFileSync(join(OUT_RECEIPT, name), woff2);
    console.log(`${RECEIPT_FAMILY} ${f.style}: 글자 ${[...chars].length}개, ${(woff2.length / 1024).toFixed(1)}KB`);
    faces.push(
      `@font-face {\n  font-family: '${RECEIPT_FAMILY}';\n  font-style: normal;\n  font-display: swap;\n  font-weight: ${f.weight};\n  src: url('/fonts/receipt/${name}') format('woff2');\n}`,
    );
  }
  const ofl = readFileSync(join(CACHE, 'D2Coding-OFL.txt'), 'utf8');
  writeFileSync(
    join(OUT_RECEIPT, 'OFL.txt'),
    `CC Receipt는 D2Coding(NAVER Corporation, SIL OFL 1.1)에서 코드쇼퍼 화면에 필요한 글자만 골라 이름을 바꾼 수정본입니다.\nD2Coding은 예약 글꼴 이름이라 수정본에 쓰지 않았습니다. 원본: https://github.com/naver/d2-coding-font (${D2_TAG})\n\n${ofl}`,
  );
  writeFileSync(join(OUT_RECEIPT, 'manifest.json'), JSON.stringify({ family: RECEIPT_FAMILY, source: `naver/d2-coding-font ${D2_TAG}`, sha256: hashes, chars }, null, 2) + '\n');
  return faces.join('\n');
}

const check = process.argv.includes('--check');
const chars = await receiptChars();
if (check) {
  const manifestPath = join(OUT_RECEIPT, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.log('영수증 글꼴이 아직 없다. node scripts/fonts/build-fonts.ts로 만든다.');
    process.exit(1);
  }
  const have = new Set([...readJson<{ chars: string }>(manifestPath).chars]);
  const missing = [...chars].filter((c) => !have.has(c));
  if (missing.length > 0) {
    console.log(`영수증 글꼴에 없는 글자 ${missing.length}개: ${missing.join('')}\nnode scripts/fonts/build-fonts.ts로 다시 만든다.`);
    process.exit(1);
  }
  console.log(`영수증 글꼴 글자 검사 통과 (${[...chars].length}자)`);
} else {
  const pretendard = buildPretendard();
  const receipt = await buildReceipt(chars);
  writeFileSync(
    FONTS_CSS,
    `/* 자동 생성: node scripts/fonts/build-fonts.ts. 손으로 고치지 않는다.\n   Pretendard (c) Kil Hyung-jin, SIL OFL 1.1 — public/fonts/pretendard/OFL.txt\n   CC Receipt는 D2Coding (c) NAVER Corporation, SIL OFL 1.1의 수정본 — public/fonts/receipt/OFL.txt */\n${pretendard}\n${receipt}\n`,
  );
  console.log('src/styles/fonts.css 를 만들었다');
}
