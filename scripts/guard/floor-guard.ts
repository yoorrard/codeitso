// 품질 바닥선 검사: 자율 실행에서 에이전트가 코드와 검사를 함께 쓰므로, 꼭 지킬 선을 기계로 지킨다.
//   node scripts/guard/floor-guard.ts              src/, tests/, scripts/ 전체
//   node scripts/guard/floor-guard.ts 파일 [파일…]  주어진 파일만 (훅이 쓴다)
// 규칙은 floor-rules.ts(순수 함수, 시험: tests/floor-guard.test.ts). 꼭 예외가 필요한 줄에는 같은 줄에 `floor-guard-ignore: 이유`를 적는다.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { ROOT } from '../lib/load-data.ts';
import { checkSource } from './floor-rules.ts';
import type { Finding } from './floor-rules.ts';

const SCAN_DIRS = ['src', 'tests', 'scripts'];
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.astro', '.css']);

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (CODE_EXT.has(extname(p))) out.push(p);
  }
}

function check(file: string): Finding[] {
  return checkSource(relative(ROOT, file).split('\\').join('/'), readFileSync(file, 'utf8'));
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const files: string[] = [];
if (args.length > 0) {
  for (const a of args) {
    const p = a.startsWith('/') ? a : join(ROOT, a);
    if (existsSync(p) && CODE_EXT.has(extname(p))) files.push(p);
  }
} else {
  for (const d of SCAN_DIRS) walk(join(ROOT, d), files);
}

const findings = files.flatMap(check);
if (findings.length > 0) {
  for (const f of findings) console.log(`${f.file}:${f.line} [${f.rule}] ${f.message}`);
  console.log(`\n품질 바닥선 위반 ${findings.length}건. 고치거나, 정말 예외면 그 줄에 'floor-guard-ignore: 이유'를 적는다.`);
  process.exit(1);
}
if (args.length === 0) console.log(`품질 바닥선 통과 (파일 ${files.length}개)`);
