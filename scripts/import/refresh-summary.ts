// 매일 갱신 요약 (D143): 작업 폴더의 data/를 마지막 커밋(HEAD)과 견줘 출처 파일마다 새·빠짐·바뀐 상품 수와 주로 바뀐 칸을 센다.
//   node scripts/import/refresh-summary.ts
// - GitHub Actions에서는 $GITHUB_STEP_SUMMARY에 표를 쓰고, 커밋 메시지 본문을 .cache/refresh/commit-body.txt에 둔다.
// - refresh-all.ts가 남긴 .cache/refresh/results.json(단계마다 성공·시간·오늘 쉬는 단계)도 함께 보인다.
// 네트워크를 쓰지 않는다. 자료가 그대로면 '바뀐 자료 없음'만 쓴다.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { changedKeys, type StableItem } from '../lib/catalog-stable.ts';
import { ROOT } from './oss-lib.ts';

interface StepResult {
  lane: string;
  file: string;
  args?: string[];
  code: number;
  seconds: number;
}
interface Results {
  seconds: number;
  kstDay: number;
  steps: StepResult[];
  /** 오늘 차례가 아니라 쉰 단계 */
  resting: { lane: string; file: string; args?: string[]; days: number[] }[];
}

interface FileRow {
  file: string;
  before: number;
  after: number;
  added: number;
  removed: number;
  changed: number;
  keys: Map<string, number>;
}

const git = (...args: string[]): string => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', maxBuffer: 1 << 30 });

function headText(path: string): string | undefined {
  try {
    return git('show', `HEAD:${path}`);
  } catch {
    return undefined;
  }
}

function itemsOf(text: string | undefined): StableItem[] | undefined {
  if (!text) return undefined;
  try {
    const j = JSON.parse(text) as { items?: unknown };
    return Array.isArray(j.items) ? (j.items as StableItem[]) : undefined;
  } catch {
    return undefined;
  }
}

const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1))) : x));

/** 바뀐 자료 파일 (커밋과 다른 것 + 새 파일) */
export function changedDataFiles(): string[] {
  const tracked = git('diff', '--name-only', 'HEAD', '--', 'data').split('\n');
  const fresh = git('ls-files', '--others', '--exclude-standard', '--', 'data').split('\n');
  return [...new Set([...tracked, ...fresh])].filter(Boolean).sort();
}

export function compareFile(path: string): FileRow | undefined {
  const before = itemsOf(headText(path)) ?? [];
  const nowText = existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), 'utf8') : undefined;
  const after = itemsOf(nowText);
  if (!after) return undefined;
  const old = new Map(before.map((it) => [it.id, it]));
  const ids = new Set(after.map((it) => it.id));
  const row: FileRow = { file: path.replace(/^data\/catalog\//, ''), before: before.length, after: after.length, added: 0, removed: 0, changed: 0, keys: new Map() };
  for (const it of before) if (!ids.has(it.id)) row.removed += 1;
  for (const it of after) {
    const p = old.get(it.id);
    if (!p) {
      row.added += 1;
      continue;
    }
    if (canon(p) === canon(it)) continue;
    row.changed += 1;
    const keys = changedKeys(p, it);
    for (const k of keys.length ? keys : ['fetchedAt']) row.keys.set(k, (row.keys.get(k) ?? 0) + 1);
  }
  return row;
}

const KST_DAY = ['일', '월', '화', '수', '목', '금', '토'];
const fmt = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function topKeys(keys: Map<string, number>, n = 3): string {
  return [...keys].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n).map(([k, c]) => `${k} ${fmt(c)}`).join(', ');
}

function main(): void {
  const resultsPath = join(ROOT, '.cache', 'refresh', 'results.json');
  const results = existsSync(resultsPath) ? (JSON.parse(readFileSync(resultsPath, 'utf8')) as Results) : undefined;
  const files = changedDataFiles();
  const rows = files.filter((f) => f.startsWith('data/catalog/') && !f.endsWith('/index.json')).map(compareFile).filter((r): r is FileRow => !!r);
  const other = files.filter((f) => !f.startsWith('data/catalog/') || f.endsWith('/index.json'));
  const t = rows.reduce((a, r) => ({ added: a.added + r.added, removed: a.removed + r.removed, changed: a.changed + r.changed }), { added: 0, removed: 0, changed: 0 });

  const md: string[] = ['## 매일 자료 새로 받기', ''];
  if (results) {
    const failed = results.steps.filter((s) => s.code !== 0);
    md.push(`- 받은 단계 ${results.steps.length}개, ${Math.round(results.seconds / 60)}분 (한국 시각 ${KST_DAY[results.kstDay] ?? '?'}요일)${failed.length ? ` · **실패 ${failed.length}개** (그 출처는 지난 자료 그대로)` : ''}`);
    for (const s of failed) md.push(`  - ✗ ${s.lane} ${s.file}${s.args?.length ? ` ${s.args.join(' ')}` : ''} (코드 ${s.code})`);
    if (results.resting.length) md.push(`- 오늘 쉰 단계 ${results.resting.length}개: ${results.resting.map((r) => `${r.file}${r.args?.length ? ` ${r.args.join(' ')}` : ''}(${r.days.map((d) => KST_DAY[d]).join('')})`).join(', ')}`);
  }
  if (rows.length === 0 && other.length === 0) {
    md.push('- 바뀐 자료가 없다. 커밋·배포하지 않는다.');
  } else {
    md.push(`- 바뀐 출처 파일 ${rows.length}개: 새 상품 ${fmt(t.added)} · 빠진 상품 ${fmt(t.removed)} · 값이 바뀐 상품 ${fmt(t.changed)}${other.length ? ` · 그 밖의 파일 ${other.length}개` : ''}`);
    md.push('', '| 출처 파일 | 상품 | 새 | 빠짐 | 바뀜 | 주로 바뀐 칸 |', '|---|---:|---:|---:|---:|---|');
    for (const r of rows.sort((a, b) => b.added + b.removed + b.changed - (a.added + a.removed + a.changed) || (a.file < b.file ? -1 : 1))) {
      md.push(`| ${r.file} | ${fmt(r.after)} | ${fmt(r.added)} | ${fmt(r.removed)} | ${fmt(r.changed)} | ${topKeys(r.keys)} |`);
    }
    if (other.length) md.push('', `그 밖의 파일: ${other.join(', ')}`);
  }
  const text = `${md.join('\n')}\n`;
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
  // 다음 단계(시험·빌드·올리기)는 바뀐 자료가 있을 때만 돈다
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${rows.length + other.length > 0}\n`);
  // 커밋 메시지 본문: 대분류마다 한 줄
  const byCat = new Map<string, { added: number; removed: number; changed: number }>();
  for (const r of rows) {
    const c = r.file.split('/')[0] ?? '';
    const v = byCat.get(c) ?? { added: 0, removed: 0, changed: 0 };
    v.added += r.added;
    v.removed += r.removed;
    v.changed += r.changed;
    byCat.set(c, v);
  }
  const body = [...byCat].sort(([a], [b]) => (a < b ? -1 : 1)).map(([c, v]) => `${c}: 새 ${v.added} · 빠짐 ${v.removed} · 바뀜 ${v.changed}`);
  mkdirSync(join(ROOT, '.cache', 'refresh'), { recursive: true });
  writeFileSync(join(ROOT, '.cache', 'refresh', 'commit-body.txt'), `${body.join('\n')}\n`);
}

main();
