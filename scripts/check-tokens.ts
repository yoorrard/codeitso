// 디자인 토큰 검사 (T02):
//  1. tokens.css의 글자색 줄 주석 '대비: --바탕 최소값, …'을 읽어 WCAG 명도 대비를 확인한다.
//  2. '동작 줄이기' 두 곳(기기 설정, html[data-motion=reduce])이 이동 길이를 모두 0으로, 손맛을 없애고,
//     --dur-fade는 남기는지 확인한다 (D30).
//   node scripts/check-tokens.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrast } from './lib/contrast.ts';
import { ROOT } from './lib/load-data.ts';

const css = readFileSync(join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
const errors: string[] = [];

/** 첫 번째 :root { … } 덩어리 (기본 값) */
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
const values = new Map<string, string>();
const notes = new Map<string, string>();
for (const line of rootBlock.split('\n')) {
  const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);\s*(\/\*([\s\S]*?)\*\/)?/);
  if (!m || !m[1] || !m[2]) continue;
  values.set(m[1], m[2].trim());
  if (m[4]) notes.set(m[1], m[4]);
}

function resolve(name: string, depth = 0): string | null {
  const v = values.get(name);
  if (!v || depth > 5) return null;
  const ref = v.match(/^var\((--[a-z0-9-]+)\)$/);
  if (ref?.[1]) return resolve(ref[1], depth + 1);
  return /^#[0-9a-f]{6}$/i.test(v) ? v : null;
}

let pairs = 0;
for (const [name, note] of notes) {
  const spec = note.match(/대비:\s*([^*]+)/)?.[1];
  if (!spec) continue;
  const fg = resolve(name);
  if (!fg) {
    errors.push(`${name}: 색 값을 읽을 수 없다`);
    continue;
  }
  for (const part of spec.split(',')) {
    const m = part.trim().match(/^(--[a-z0-9-]+)\s+([\d.]+)/);
    if (!m || !m[1] || !m[2]) continue;
    const bg = resolve(m[1]);
    if (!bg) {
      errors.push(`${name} / ${m[1]}: 바탕 색 값을 읽을 수 없다`);
      continue;
    }
    const need = Number(m[2]);
    const got = contrast(fg, bg);
    pairs += 1;
    if (got + 1e-9 < need) errors.push(`${name}(${fg}) / ${m[1]}(${bg}): 대비 ${got.toFixed(2)}:1, 필요 ${need}:1`);
  }
}

// 동작 줄이기 두 곳
const durations = [...values.keys()].filter((k) => k.startsWith('--dur-'));
const reduceBlocks: [string, string][] = [
  ['@media (prefers-reduced-motion: reduce)', css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{([\s\S]*?)\}\s*\}/)?.[1] ?? ''],
  [":root[data-motion='reduce']", css.match(/:root\[data-motion='reduce'\]\s*\{([\s\S]*?)\}/)?.[1] ?? ''],
];
for (const [where, block] of reduceBlocks) {
  if (!block) {
    errors.push(`${where} 덩어리가 없다`);
    continue;
  }
  for (const d of durations) {
    const set = block.match(new RegExp(`${d}\\s*:\\s*([^;]+);`))?.[1]?.trim();
    if (d === '--dur-fade') {
      if (set !== undefined) errors.push(`${where}: --dur-fade는 동작 줄이기에서도 남긴다 (D30)`);
    } else if (set !== '0ms') {
      errors.push(`${where}: ${d}를 0ms로 둔다`);
    }
  }
  for (const k of [...values.keys()].filter((x) => x.startsWith('--juice-'))) {
    const set = block.match(new RegExp(`${k}\\s*:\\s*([^;]+);`))?.[1]?.trim();
    // 크기 배율은 1, 각도(기울기)는 0deg, 나머지(흔들림 거리)는 0px
    const want = k.endsWith('-scale') ? '1' : k.endsWith('-tilt') ? '0deg' : '0px';
    if (set !== want) errors.push(`${where}: ${k}를 ${want}로 둔다`);
  }
}

if (errors.length > 0) {
  for (const e of errors) console.log(`오류  ${e}`);
  console.log(`\n토큰 검사 실패: ${errors.length}개`);
  process.exit(1);
}
console.log(`토큰 검사 통과: 대비 ${pairs}쌍, 동작 줄이기 ${reduceBlocks.length}곳`);
