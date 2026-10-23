// 출처 파일을 '뜻 있게 바뀌었을 때만' 쓴다 (D143). 가져오기 네 갈래(design·api·oss·ai)의 writeCatalog가 부른다.
// 1) 지난 파일과 견줘 상품마다 고른다 (scripts/lib/catalog-stable.ts: 새·빠짐·글 변화는 늘, 지표는 10%·날짜는 7일 넘게 바뀔 때만)
// 2) 상품이 그대로이고 머리(출처 설명)도 받은 날·개수·글 속 숫자만 다르면 지난 파일을 그대로 둔다 (받은 날도 그대로)
// 3) 출처가 갑자기 절반 아래로 줄면(목록 일부만 받은 고장일 때가 많다) 지난 파일을 지키고 알린다. 일부러 줄일 때는 REFRESH_ALLOW_SHRINK=1
// 4) 쓸 글이 지난 파일과 바이트까지 같으면 쓰지 않는다
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { STABLE_RULES, sameHead, stabilizeItems, type StableItem, type StableStats } from '../lib/catalog-stable.ts';

export interface CatalogLike<I extends StableItem> {
  fetchedAt: string;
  items: I[];
}

export interface Stabilized<F> {
  file: F;
  stats: StableStats;
  /** 지난 파일을 그대로 두는가 */
  keep: boolean;
  note: string;
}

/** 지난 출처 파일 (없거나 깨졌으면 undefined) */
export function readPrevious<F>(path: string): F | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const f = JSON.parse(readFileSync(path, 'utf8')) as { items?: unknown };
    return Array.isArray(f.items) ? (f as F) : undefined;
  } catch {
    return undefined;
  }
}

const headOf = (f: object): Record<string, unknown> => Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'items'));

/** 새로 받은 파일(next)을 지난 파일(prev, 주지 않으면 path에서 읽는다)에 견줘 쓸 파일을 고른다. today = 오늘(YYYY-MM-DD) */
export function stabilizeFile<I extends StableItem, F extends CatalogLike<I>>(path: string, next: F, today: string = next.fetchedAt, prev: F | undefined = readPrevious<F>(path)): Stabilized<F> {
  if (!prev) {
    return { file: next, stats: { added: next.items.length, removed: 0, updated: 0, expired: 0, kept: 0, damped: 0 }, keep: false, note: '새 파일' };
  }
  const shrink = prev.items.length >= 20 && next.items.length < prev.items.length * 0.5 && process.env.REFRESH_ALLOW_SHRINK !== '1';
  if (shrink) {
    const note = `상품이 ${prev.items.length} → ${next.items.length}개로 절반 아래로 줄어 지난 파일을 지켰다 (일부러 줄였으면 REFRESH_ALLOW_SHRINK=1)`;
    console.log(`${process.env.GITHUB_ACTIONS === 'true' ? '::warning::' : '  ! '}${relative(process.cwd(), path)}: ${note}`);
    return { file: prev, stats: { added: 0, removed: 0, updated: 0, expired: 0, kept: prev.items.length, damped: 0 }, keep: true, note };
  }
  const r = stabilizeItems(prev.items, next.items, today, STABLE_RULES);
  if (!r.changed && sameHead(headOf(prev), headOf(next))) return { file: prev, stats: r.stats, keep: true, note: '그대로' };
  return { file: { ...next, items: r.items }, stats: r.stats, keep: false, note: '바뀜' };
}

/** 글이 지난 파일과 다를 때만 쓴다. 썼으면 true */
export function writeIfChanged(path: string, text: string): boolean {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  return true;
}

/** 가져오기 기록 한 줄: 무엇이 얼마나 바뀌었는지 */
export function stableLine(s: Stabilized<unknown>, wrote: boolean): string {
  const t = s.stats;
  const parts = [`새 ${t.added}`, `빠짐 ${t.removed}`, `새 값 ${t.updated}`];
  if (t.expired) parts.push(`오래돼 다시 ${t.expired}`);
  parts.push(`그대로 ${t.kept}${t.damped ? ` (문턱 아래 ${t.damped})` : ''}`);
  return `    ${parts.join(' · ')} → ${wrote ? '썼다' : '파일 그대로'}`;
}
