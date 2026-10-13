// 디자인 토큰 검사 (T02, T26):
//  1. tokens.css의 글자색 줄 주석 '대비: --바탕 최소값, …'을 읽어 WCAG 명도 대비를 확인한다.
//     낮 지도(:root)와 밤 지도(@media (prefers-color-scheme: dark)의 :root가 덮어쓴 값) 두 모드 모두에서 본다 (D56).
//  2. 느낌 팔레트([data-palette]) 낮·밤 덩어리가 바꾼 땅색으로 지도 그림의 대비 쌍을 다시 잰다 (D68).
//  3. '동작 줄이기' 두 곳(기기 설정, html[data-motion=reduce])이 이동 길이를 모두 0으로, 손맛을 없애고,
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

/** 밤 지도: 어두운 모드 덩어리가 덮어쓴 값 (나머지는 낮 값 그대로) */
const darkBlock = css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([\s\S]*?)\}\s*\}/)?.[1] ?? '';
if (!darkBlock) errors.push('밤 지도(@media (prefers-color-scheme: dark)) 덩어리가 없다');
const darkValues = new Map(values);
for (const line of darkBlock.split('\n')) {
  const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/);
  if (!m || !m[1] || !m[2]) continue;
  if (!values.has(m[1])) errors.push(`밤 지도: ${m[1]}는 낮 지도에 없는 토큰이다`);
  darkValues.set(m[1], m[2].trim());
}

function resolve(map: Map<string, string>, name: string, depth = 0): string | null {
  const v = map.get(name);
  if (!v || depth > 5) return null;
  const ref = v.match(/^var\((--[a-z0-9-]+)\)$/);
  if (ref?.[1]) return resolve(map, ref[1], depth + 1);
  return /^#[0-9a-f]{6}$/i.test(v) ? v : null;
}

let pairs = 0;
for (const [mode, map] of [['낮', values], ['밤', darkValues]] as const) {
  for (const [name, note] of notes) {
    const spec = note.match(/대비:\s*([^*]+)/)?.[1];
    if (!spec) continue;
    const fg = resolve(map, name);
    if (!fg) {
      errors.push(`${mode} ${name}: 색 값을 읽을 수 없다`);
      continue;
    }
    for (const part of spec.split(',')) {
      const m = part.trim().match(/^(--[a-z0-9-]+)\s+([\d.]+)/);
      if (!m || !m[1] || !m[2]) continue;
      const bg = resolve(map, m[1]);
      if (!bg) {
        errors.push(`${mode} ${name} / ${m[1]}: 바탕 색 값을 읽을 수 없다`);
        continue;
      }
      const need = Number(m[2]);
      const got = contrast(fg, bg);
      pairs += 1;
      if (got + 1e-9 < need) errors.push(`${mode} ${name}(${fg}) / ${m[1]}(${bg}): 대비 ${got.toFixed(2)}:1, 필요 ${need}:1`);
    }
  }
}

// 느낌 팔레트 (CONCEPT 5.3, D68): 지도의 [data-palette='…'] 덩어리는 땅·물·공원 색만 바꾼다. 낮 덩어리(밖)와 밤 덩어리
// (어두운 모드 @media 안)를 읽어, 바뀐 토큰이 걸린 대비 쌍(지도 그림-땅: --map-ghost·--route-*·--node-fill·--you·
// --map-car·--map-flag·--text-3 학생 정보 빗금…)을 팔레트마다 낮·밤으로 다시 잰다.
function darkRanges(src: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of src.matchAll(/@media \(prefers-color-scheme: dark\)\s*\{/g)) {
    let depth = 1;
    let i = (m.index ?? 0) + m[0].length;
    for (; i < src.length && depth > 0; i += 1) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') depth -= 1;
    }
    out.push([m.index ?? 0, i]);
  }
  return out;
}
const dark = darkRanges(css);
const palettes = { day: new Map<string, Map<string, string>>(), night: new Map<string, Map<string, string>>() };
for (const m of css.matchAll(/\[data-palette='([a-z]+)'\]\s*\{([^}]*)\}/g)) {
  const name = m[1] ?? '';
  const at = m.index ?? 0;
  const side = dark.some(([a, b]) => at > a && at < b) ? palettes.night : palettes.day;
  const set = new Map<string, string>();
  for (const line of (m[2] ?? '').split('\n')) {
    const d = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/);
    if (!d || !d[1] || !d[2]) continue;
    if (!values.has(d[1])) errors.push(`팔레트 ${name}: ${d[1]}는 낮 지도에 없는 토큰이다`);
    set.set(d[1], d[2].trim());
  }
  side.set(name, set);
}
for (const name of palettes.day.keys()) if (!palettes.night.has(name)) errors.push(`팔레트 ${name}: 밤 짝(어두운 모드 덩어리 안)이 없다`);
for (const name of palettes.night.keys()) if (!palettes.day.has(name)) errors.push(`팔레트 ${name}: 밤 덩어리만 있고 낮 덩어리가 없다`);
let palettePairs = 0;
for (const [name, day] of palettes.day) {
  const night = palettes.night.get(name) ?? new Map<string, string>();
  for (const [mode, base, over] of [['낮', values, day], ['밤', darkValues, night]] as const) {
    const map = new Map([...base, ...over]);
    for (const [fgName, note] of notes) {
      const spec = note.match(/대비:\s*([^*]+)/)?.[1];
      if (!spec) continue;
      for (const part of spec.split(',')) {
        const m = part.trim().match(/^(--[a-z0-9-]+)\s+([\d.]+)/);
        if (!m || !m[1] || !m[2]) continue;
        if (!over.has(fgName) && !over.has(m[1])) continue;
        const fg = resolve(map, fgName);
        const bg = resolve(map, m[1]);
        if (!fg || !bg) {
          errors.push(`팔레트 ${name} ${mode} ${fgName} / ${m[1]}: 색 값을 읽을 수 없다`);
          continue;
        }
        const need = Number(m[2]);
        const got = contrast(fg, bg);
        palettePairs += 1;
        if (got + 1e-9 < need) errors.push(`팔레트 ${name} ${mode} ${fgName}(${fg}) / ${m[1]}(${bg}): 대비 ${got.toFixed(2)}:1, 필요 ${need}:1`);
      }
    }
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
    // 크기 배율은 1, 나머지(흔들림 거리)는 0px
    const want = k.endsWith('-scale') ? '1' : '0px';
    if (set !== want) errors.push(`${where}: ${k}를 ${want}로 둔다`);
  }
}

if (errors.length > 0) {
  for (const e of errors) console.log(`오류  ${e}`);
  console.log(`\n토큰 검사 실패: ${errors.length}개`);
  process.exit(1);
}
console.log(`토큰 검사 통과: 대비 ${pairs}쌍(낮·밤), 느낌 팔레트 ${palettes.day.size}벌 ${palettePairs}쌍, 동작 줄이기 ${reduceBlocks.length}곳`);
