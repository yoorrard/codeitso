// 매일 갱신의 변동 문턱 (D143). 매일 모든 출처를 다시 받되, 자료 파일에는 '뜻 있는 변화'만 올린다.
// - 새 상품·빠진 상품, 글·주소·라이선스·꼬리표·쓰는 법·미리 보기 글 같은 사실이 바뀌면 늘 올린다.
// - 잘 흔들리는 지표(스타·내려받기·좋아요·조회…)는 지난 값에서 10% 넘게(작은 수는 바닥값 기준) 바뀔 때만,
//   갱신일은 7일 넘게 바뀔 때만 올린다. 받은 날(fetchedAt)과 확인 날짜 칸은 혼자서는 올리지 않는다.
// - 올리지 않는 상품은 지난 스냅숏을 통째로 둔다(값을 섞지 않는다): 파일 속 모든 값은 그 상품의 fetchedAt에 출처가 준 그대로다.
// - 오래된 스냅숏은 maxAgeDays + (id 해시로 0~spreadDays-1일) 뒤에 문턱과 상관없이 새로 받는다. 같은 날 한꺼번에 바뀌지 않게 엇갈린다.
// 바탕: 웹 크롤러의 '바뀐 것만 다시 쓰기·적응형 재방문', git scraping(바뀔 때만 커밋), shields.io처럼 보이는 자릿수 안의 흔들림은 무시.
// 부작용 없는 순수 함수만 둔다 (파일 읽기·쓰기는 scripts/import/stable-write.ts).
import { fnv1a } from '../../src/lib/catalog/core.ts';

export interface StableRules {
  /** 지표가 이만큼(비율) 넘게 바뀌어야 올린다 */
  rel: number;
  /** 갱신일이 이 날 수 넘게 바뀌어야 올린다 */
  dateDays: number;
  /** 스냅숏을 문턱과 상관없이 새로 받는 나이(일) */
  maxAgeDays: number;
  /** maxAgeDays 뒤로 상품마다 엇갈리는 날 수 */
  spreadDays: number;
}

export const STABLE_RULES: StableRules = { rel: 0.1, dateDays: 7, maxAgeDays: 120, spreadDays: 60 };

/**
 * 잘 흔들리는 수 칸의 문턱.
 * - floor: 값이 바닥값보다 작으면 바닥값을 기준으로 상대 변화를 잰다(작은 수의 1·2 차이를 무시하려고). rel이 없으면 STABLE_RULES.rel
 * - log: log10(1+값)이 이만큼 넘게 바뀔 때만 (0.5 ≈ 세 배). 작은 정수로 오르내리는 '뜨는 정도'(HF trendingScore, 중앙값 2)에 쓴다
 * 여기 없는 수(연도·크기·각도·상태 코드…)는 사실이라 같아야 같다.
 */
export type NumberRule = { floor: number; rel?: number } | { log: number };

export const VOLATILE_NUMBERS: Readonly<Record<string, NumberRule>> = {
  'metrics.stars': { floor: 50 },
  'metrics.downloads': { floor: 50 },
  'metrics.likes': { floor: 50 },
  'metrics.views': { floor: 50 },
  'metrics.trend': { log: 0.5 },
  'preview.stars': { floor: 50 },
  'preview.repoStars': { floor: 50 },
  'preview.views': { floor: 50 },
  'preview.applications': { floor: 50 },
  'preview.dependentRepos': { floor: 50 },
  'preview.useCount': { floor: 50 },
  'preview.itemCount': { floor: 20 },
  'preview.entries': { floor: 20 },
  'preview.popularityRank': { floor: 100 },
  'preview.healthScore': { floor: 0 },
  'preview.rankingScore': { floor: 0 },
  'preview.usability': { floor: 0 },
};

/** 날짜 칸: dateDays 넘게 바뀔 때만 올린다 */
export const VOLATILE_DATES: readonly string[] = ['metrics.updatedAt'];

/** 받은 날·확인한 날: 혼자서는 올리지 않는다 (상품이 다른 까닭으로 바뀔 때 함께 새로 된다) */
export const STAMPS: readonly string[] = ['fetchedAt', 'preview.freeTierCheckedAt'];

/** 견줄 수 있는 상품: id와 받은 날만 알면 된다 (나머지 칸은 펼쳐서 본다) */
export interface StableItem {
  id: string;
  fetchedAt?: string;
}

/** 두 수가 문턱을 넘게 다른가. 한쪽만 있으면 다르다 */
export function numberChanged(a: number | undefined, b: number | undefined, floor: number, rel: number = STABLE_RULES.rel): boolean {
  if (a === undefined || b === undefined) return a !== b;
  return Math.abs(b - a) >= rel * Math.max(Math.abs(a), floor);
}

/** 두 수가 로그 눈금으로 step 넘게 다른가. 없는 값·음수는 0으로 본다 (뜨는 정도가 0이면 출처가 칸을 빼고 준다) */
export function logChanged(a: number | undefined, b: number | undefined, step: number): boolean {
  const x = Math.max(0, a ?? 0);
  const y = Math.max(0, b ?? 0);
  return Math.abs(Math.log10(1 + y) - Math.log10(1 + x)) >= step - 1e-9;
}

function ruleChanged(rule: NumberRule, a: number | undefined, b: number | undefined, rules: StableRules): boolean {
  return 'log' in rule ? logChanged(a, b, rule.log) : numberChanged(a, b, rule.floor, rule.rel ?? rules.rel);
}

const dayNumber = (s: string): number | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000 : undefined;
};

/** 두 날짜가 days일 넘게 다른가. 날짜가 아니면 글자가 다를 때 다르다 */
export function dateChanged(a: string | undefined, b: string | undefined, days: number = STABLE_RULES.dateDays): boolean {
  if (a === undefined || b === undefined) return a !== b;
  const x = dayNumber(a);
  const y = dayNumber(b);
  if (x === undefined || y === undefined) return a !== b;
  return Math.abs(y - x) >= days;
}

type Flat = Map<string, unknown>;

/** 객체를 '칸 경로 → 값'으로 편다. 배열은 통째로 한 값 (차례도 사실이다) */
function flatten(v: unknown, path: string, out: Flat): Flat {
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x !== undefined) flatten(x, path ? `${path}.${k}` : k, out);
    }
  } else out.set(path, v);
  return out;
}

/** 칸 차례와 상관없는 JSON (배열 속 객체의 칸 차례가 실행마다 달라도 같은 값으로 본다) */
const canon = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canon);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v as Record<string, unknown>).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])]));
  }
  return v;
};
const json = (v: unknown): string => JSON.stringify(canon(v)) ?? 'undefined';
const asNum = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const asStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** 문턱을 넘게 바뀐 칸 경로들 (limit개까지). 갱신 요약에서 무엇이 바뀌었는지 보이는 데도 쓴다 */
export function changedKeys(prev: StableItem, next: StableItem, rules: StableRules = STABLE_RULES, limit = Number.POSITIVE_INFINITY): string[] {
  const a = flatten(prev, '', new Map());
  const b = flatten(next, '', new Map());
  const out: string[] = [];
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    if (out.length >= limit) break;
    const x = a.get(key);
    const y = b.get(key);
    if (STAMPS.includes(key)) continue;
    const rule = VOLATILE_NUMBERS[key];
    if (rule !== undefined && (x === undefined || asNum(x) !== undefined) && (y === undefined || asNum(y) !== undefined)) {
      if (ruleChanged(rule, asNum(x), asNum(y), rules)) out.push(key);
      continue;
    }
    if (VOLATILE_DATES.includes(key) && (x === undefined || asStr(x) !== undefined) && (y === undefined || asStr(y) !== undefined)) {
      if (dateChanged(asStr(x), asStr(y), rules.dateDays)) out.push(key);
      continue;
    }
    if (json(x) !== json(y)) out.push(key);
  }
  return out;
}

/** 지난 스냅숏을 버리고 새 값을 올릴 만큼 바뀌었는가 */
export function meaningfulChange(prev: StableItem, next: StableItem, rules: StableRules = STABLE_RULES): boolean {
  return changedKeys(prev, next, rules, 1).length > 0;
}

/** 스냅숏이 오래돼 새로 받을 때인가. 상품마다 id 해시로 0~spreadDays-1일 엇갈린다 */
export function snapshotExpired(item: StableItem, today: string, rules: StableRules = STABLE_RULES): boolean {
  const from = item.fetchedAt ? dayNumber(item.fetchedAt) : undefined;
  const to = dayNumber(today);
  if (from === undefined || to === undefined) return false;
  return to - from >= rules.maxAgeDays + (fnv1a(item.id) % Math.max(1, rules.spreadDays));
}

export interface StableStats {
  /** 새로 생긴 상품 */
  added: number;
  /** 출처에서 빠진 상품 */
  removed: number;
  /** 뜻 있는 변화로 새 스냅숏을 쓴 상품 */
  updated: number;
  /** 오래돼 새 스냅숏을 쓴 상품 */
  expired: number;
  /** 지난 스냅숏을 그대로 둔 상품 */
  kept: number;
  /** 바뀌었지만 문턱 아래라 지난 스냅숏을 둔 상품 (kept에 든다) */
  damped: number;
}

export interface StableResult<T> {
  items: T[];
  stats: StableStats;
  /** 상품 목록이 지난 자료와 다른가 (더함·뺌·새 스냅숏·차례) */
  changed: boolean;
}

/**
 * 새로 받은 목록(next)을 지난 목록(prev)에 견줘 고른다. 상품 차례와 구성은 늘 next를 따르고,
 * 같은 id는 뜻 있는 변화가 있거나 스냅숏이 오래됐을 때만 next의 것을, 아니면 prev의 것을 그대로 쓴다.
 */
export function stabilizeItems<T extends StableItem>(prev: readonly T[] | undefined, next: readonly T[], today: string, rules: StableRules = STABLE_RULES): StableResult<T> {
  const stats: StableStats = { added: 0, removed: 0, updated: 0, expired: 0, kept: 0, damped: 0 };
  if (!prev) return { items: [...next], stats: { ...stats, added: next.length }, changed: true };
  const old = new Map(prev.map((it) => [it.id, it]));
  const ids = new Set(next.map((it) => it.id));
  for (const it of prev) if (!ids.has(it.id)) stats.removed += 1;
  const items = next.map((it) => {
    const p = old.get(it.id);
    if (!p) {
      stats.added += 1;
      return it;
    }
    if (meaningfulChange(p, it, rules)) {
      stats.updated += 1;
      return it;
    }
    if (snapshotExpired(p, today, rules)) {
      stats.expired += 1;
      return it;
    }
    stats.kept += 1;
    if (json(p) !== json(it)) stats.damped += 1;
    return p;
  });
  const sameOrder = prev.length === items.length && prev.every((it, i) => it.id === items[i]?.id);
  const changed = stats.added + stats.removed + stats.updated + stats.expired > 0 || !sameOrder;
  return { items, stats, changed };
}

const HEAD_STAMPS = new Set(['fetchedAt', 'count']);

/** 글 속 숫자를 지운 모양 (출처 note의 '479 registries' 같은 개수는 매일 흔들린다) */
const digitless = (v: unknown): unknown => {
  if (typeof v === 'number') return '#';
  if (typeof v === 'string') return v.replace(/\d[\d,._]*/g, '#');
  if (Array.isArray(v)) return v.map(digitless);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([k, x]) => !HEAD_STAMPS.has(k) && x !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, x]) => [k, digitless(x)]));
  }
  return v;
};

/** 출처 파일 머리(상품 목록 밖)가 받은 날·개수·글 속 숫자만 다른가. 그렇다면 상품이 그대로일 때 파일을 다시 쓰지 않는다 */
export function sameHead(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  return json(digitless(prev)) === json(digitless(next));
}
