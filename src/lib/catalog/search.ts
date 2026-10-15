// 전체 검색 (S3, D114): 상품 13만 개를 한 번에 받지 않고, 진열대 빌드가 만든 작은 파일만 그때그때 받는다.
//   /catalog/search/meta.json        대분류별 문서 범위·블록 수·소분류 이름·같은 뜻 묶음 (작다)
//   /catalog/search/t-<n>.json       낱말 조각 SEARCH_SHARDS개: 낱말 → [이름에 든 문서, 그 밖(태그·설명·출처·소분류)에 든 문서]
//   /catalog/search/b-<대분류>-<k>.json  결과 카드 블록: 대분류 안 인기순으로 SEARCH_BLOCK장씩
// 문서 번호는 대분류 순서 → 대분류 안 인기순이라, 대분류 묶기는 번호 범위로 하고 인기 많은 결과는 앞 블록에 모인다.
// 낱말 조각은 낱말의 앞 두 글자로 고르므로 앞부분만 쳐도(접두 일치) 한 조각만 받으면 된다.
// 순수 함수 (DOM·Node API 없음). 빌드(scripts/catalog/build.ts)와 검색 섬(SearchPage)이 같이 쓴다. 시험: tests/lib/search.test.ts
import { tokenize } from '../search-tokenize.ts';
import { fnv1a } from './core.ts';

/** 낱말 조각 수 */
export const SEARCH_SHARDS = 512;
/** 결과 카드 블록 하나의 문서 수 */
export const SEARCH_BLOCK = 200;
/** 검색 결과 한 쪽의 카드 수 (2·3·4·5·6열이 모두 꽉 찬다) */
export const SEARCH_PAGE = 60;
/** 색인에 넣는 설명 글자 수 (색인 크기를 묶는다) */
export const INDEX_TEXT_MAX = 240;
/** 이름 밖(태그·설명)에서 이보다 많은 문서에 든 낱말은 흔한 말로 보고 그 목록을 싣지 않는다 (remote·api·정보 같은 말, 조각이 너무 커진다) */
export const COMMON_DF = 8000;

/** 영어 허사: 색인·질의에서 뺀다 */
const STOP = new Set(
  'a an and are as at be by can for from has have in into is it its of on or our that the this to use using via was we will with you your'.split(' '),
);

/** 색인 낱말: 검색 낱말 나누기(search-tokenize)에서 영어 허사와 한 글자 영문·숫자를 뺀다 */
export function indexTokens(text: string): string[] {
  return tokenize(text).filter((t) => !STOP.has(t) && !(t.length === 1 && /^[a-z0-9]$/.test(t)));
}

const ASCII = /^[a-z0-9]+$/;

/** 앞부분으로 찾을 수 있는 꼴: 영문·숫자는 세 글자부터, 한글은 두 글자부터 (더 짧으면 낱말 그대로만 찾는다) */
export function prefixable(token: string): boolean {
  return ASCII.test(token) ? token.length >= 3 : [...token].length >= 2;
}

/**
 * 낱말 조각 번호: 영문·숫자는 앞 세 글자, 한글은 앞 두 글자(더 짧으면 낱말 그대로)의 해시.
 * 앞부분이 같은 낱말은 늘 한 조각에 있어서, 앞부분으로 찾을 때도 조각 하나만 받는다.
 */
export function tokenShard(token: string, shards: number = SEARCH_SHARDS): number {
  const head = [...token].slice(0, ASCII.test(token) ? 3 : 2).join('');
  return fnv1a(head) % shards;
}

/**
 * 오름차순 번호 목록 → 글자: 앞 번호와의 차이를 36진수로 '.' 이음, 차이 1이 3번 넘게 이어지면 '~길이'로 줄인다.
 * 예: [0, 5, 6, 7, 8, 9, 20] → "0.5.~4.b"
 */
export function encodePostings(ids: readonly number[]): string {
  const out: string[] = [];
  let prev = 0;
  let run = 0;
  const flush = (): void => {
    if (run >= 3) out.push(`~${run.toString(36)}`);
    else for (let r = 0; r < run; r += 1) out.push('1');
    run = 0;
  };
  for (let i = 0; i < ids.length; i += 1) {
    const v = ids[i] ?? 0;
    const d = i === 0 ? v : v - prev;
    prev = v;
    if (i > 0 && d === 1) {
      run += 1;
      continue;
    }
    flush();
    out.push(d.toString(36));
  }
  flush();
  return out.join('.');
}

export function decodePostings(s: string): number[] {
  if (s === '') return [];
  const out: number[] = [];
  let prev = 0;
  for (const part of s.split('.')) {
    if (part.startsWith('~')) {
      const n = parseInt(part.slice(1), 36);
      for (let r = 0; r < n; r += 1) out.push((prev += 1));
      continue;
    }
    prev = out.length === 0 ? parseInt(part, 36) : prev + parseInt(part, 36);
    out.push(prev);
  }
  return out;
}

/** 대분류 하나의 문서 범위 */
export interface SearchCat {
  id: string;
  start: number;
  count: number;
}

export interface SearchMeta {
  v: 1;
  docs: number;
  shards: number;
  block: number;
  cats: SearchCat[];
  /** [대분류, 소분류, 이름, 상품 수] */
  subs: [string, string, string, number][];
  /** 같은 뜻 묶음 (data/search-words.json): 한 낱말이 들면 묶음의 다른 낱말도 찾는다 */
  syn: string[][];
  /** 흔한 말 (COMMON_DF): 이름 밖 목록이 없다. 질의에서는 꼭 들어야 하는 낱말로 보지 않는다 */
  common: string[];
}

/** 낱말 조각 파일: 낱말 → [이름 문서, 그 밖 문서] (encodePostings) */
export type TokenShard = Record<string, [string, string]>;

/** 질의 낱말 하나 = 고를 꼴 여럿. 문서는 꼴 하나에만 맞으면 이 낱말에 맞는다 */
export interface QueryTerm {
  text: string;
  /** 친 낱말과 조사 뗀 꼴: 앞부분으로도 찾는다 */
  forms: string[];
  /** 같은 뜻 낱말: 그대로만 찾는다 (weather → weathered, bot → bottle을 찾지 않게) */
  alts: string[];
  /** 흔한 말이라 없어도 되는 낱말 (있으면 점수만 더한다) */
  optional?: boolean;
}

const HANGUL = /^[가-힣]+$/;
const JOSA = ['에서', '으로', '은', '는', '이', '가', '을', '를', '에', '로', '와', '과', '의', '도', '만'];

function josaBase(w: string): string | null {
  for (const j of JOSA) if (w.length > j.length + 1 && w.endsWith(j)) return w.slice(0, -j.length);
  return null;
}

/** 같은 뜻 묶음을 낱말 → 다른 낱말들로 */
export function synonymMap(groups: readonly (readonly string[])[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const g of groups) {
    const words = g.map((w) => w.normalize('NFKC').toLowerCase().trim()).filter((w) => w !== '');
    for (const w of words) map.set(w, [...new Set([...(map.get(w) ?? []), ...words.filter((x) => x !== w)])]);
  }
  return map;
}

/** 검색어 → 질의 낱말 (영문·숫자 덩어리와 한글 덩어리, 허사는 뺀다, 8개까지). common = 흔한 말 (SearchMeta.common) */
export function queryTerms(q: string, syn: Map<string, string[]> = new Map(), common: ReadonlySet<string> = new Set()): QueryTerm[] {
  const words = q.normalize('NFKC').toLowerCase().match(/[a-z0-9]+|[가-힣]+/g) ?? [];
  const out: QueryTerm[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    if (STOP.has(w) || seen.has(w)) continue;
    seen.add(w);
    const forms = new Set<string>([w]);
    const base = HANGUL.test(w) ? josaBase(w) : null;
    if (base) forms.add(base);
    const alts = new Set<string>();
    for (const f of forms) for (const x of syn.get(f) ?? []) for (const t of x.match(/[a-z0-9]+|[가-힣]+/g) ?? []) if (!forms.has(t)) alts.add(t);
    const term: QueryTerm = { text: w, forms: [...forms], alts: [...alts] };
    if (common.has(w)) term.optional = true;
    out.push(term);
    if (out.length === 8) break;
  }
  return out;
}

/** 이 질의가 받아야 할 낱말 조각 번호들 */
export function shardsFor(terms: readonly QueryTerm[], shards: number = SEARCH_SHARDS): number[] {
  const set = new Set<number>();
  for (const t of terms) {
    for (const a of t.alts) set.add(tokenShard(a, shards));
    for (const f of t.forms) {
      set.add(tokenShard(f, shards));
      if (HANGUL.test(f) && f.length > 2) for (const b of bigramsOf(f)) set.add(tokenShard(b, shards));
    }
  }
  return [...set].sort((a, b) => a - b);
}

function bigramsOf(w: string): string[] {
  const c = [...w];
  const out: string[] = [];
  for (let i = 0; i + 1 < c.length; i += 1) out.push(`${c[i] ?? ''}${c[i + 1] ?? ''}`);
  return out;
}

/** 이름 그대로 6 · 이름 앞부분 4 · 그 밖 그대로 2 · 그 밖 앞부분 1 */
const W = { nameExact: 6, namePrefix: 4, otherExact: 2, otherPrefix: 1 } as const;

/** 꼴 하나가 어느 문서에 몇 점으로 맞는지. exactOnly면 낱말 그대로만 */
function formScores(form: string, shard: TokenShard | undefined, out: Map<number, number>, exactOnly = false): void {
  if (!shard) return;
  // 영문·숫자 두 글자 이하·한글 한 글자는 그대로만 (ai → air를 찾지 않는다), 그 밖은 앞부분도
  const prefixOk = !exactOnly && prefixable(form);
  const put = (ids: string, score: number): void => {
    for (const d of decodePostings(ids)) if ((out.get(d) ?? 0) < score) out.set(d, score);
  };
  const exact = shard[form];
  if (exact) {
    put(exact[0], W.nameExact);
    put(exact[1], W.otherExact);
  }
  if (!prefixOk) return;
  for (const [tok, lists] of Object.entries(shard)) {
    if (tok === form || !tok.startsWith(form)) continue;
    put(lists[0], W.namePrefix);
    put(lists[1], W.otherPrefix);
  }
}

/** 세 글자 넘는 한글 꼴: 두 글자 조각이 모두 든 문서 (색인에 낱말 그대로는 없어도 '변수설정' → 변수·수설·설정) */
function bigramScores(form: string, get: (shard: number) => TokenShard | undefined, shards: number, out: Map<number, number>): void {
  const grams = bigramsOf(form);
  let acc: Map<number, number> | null = null;
  for (const g of grams) {
    const lists = get(tokenShard(g, shards))?.[g];
    const here = new Map<number, number>();
    if (lists) {
      for (const d of decodePostings(lists[1])) here.set(d, W.otherPrefix);
      for (const d of decodePostings(lists[0])) here.set(d, W.namePrefix);
    }
    if (acc === null) acc = here;
    else {
      const next = new Map<number, number>();
      for (const [d, s] of acc) {
        const t = here.get(d);
        if (t !== undefined) next.set(d, Math.min(s, t));
      }
      acc = next;
    }
    if (acc.size === 0) return;
  }
  for (const [d, s] of acc ?? []) if ((out.get(d) ?? 0) < s) out.set(d, s);
}

/** 질의 낱말 하나에 맞는 문서 → 점수 (꼴 가운데 가장 높은 점수) */
export function termMatches(term: QueryTerm, get: (shard: number) => TokenShard | undefined, shards: number = SEARCH_SHARDS): Map<number, number> {
  const out = new Map<number, number>();
  for (const f of term.forms) {
    formScores(f, get(tokenShard(f, shards)), out);
    if (HANGUL.test(f) && f.length > 2) bigramScores(f, get, shards, out);
  }
  for (const a of term.alts) formScores(a, get(tokenShard(a, shards)), out, true);
  return out;
}

export interface Hit {
  doc: number;
  score: number;
}

export interface SearchResult {
  /** 점수 높은 순 → 문서 번호(인기) 순 */
  hits: Hit[];
  /** 모든 낱말이 든 문서가 없어 하나라도 든 문서를 보인다 */
  loose: boolean;
}

/**
 * 질의 실행: 꼭 들어야 하는 낱말(흔한 말이 아닌 것)이 모두 든 문서(그리고)만, 점수 = 낱말마다 가장 높은 점수의 합(흔한 말은 들었을 때만 더한다).
 * 낱말이 모두 흔한 말이면 하나라도 든 문서. 그리고로 찾은 문서가 없고 꼭 들어야 하는 낱말이 둘 이상이면 하나라도 든 문서로 넓힌다 (loose).
 * 같은 점수는 문서 번호 순 = 대분류 안 인기순.
 */
export function runQuery(terms: readonly QueryTerm[], get: (shard: number) => TokenShard | undefined, shards: number = SEARCH_SHARDS): SearchResult {
  if (terms.length === 0) return { hits: [], loose: false };
  const per = terms.map((t) => ({ m: termMatches(t, get, shards), optional: t.optional === true }));
  const required = per.filter((p) => !p.optional).map((p) => p.m);
  const optional = per.filter((p) => p.optional).map((p) => p.m);
  const orAll = (lists: Map<number, number>[]): Hit[] => {
    const sum = new Map<number, number>();
    for (const m of lists) for (const [d, sc] of m) sum.set(d, (sum.get(d) ?? 0) + sc);
    return [...sum].map(([doc, score]) => ({ doc, score }));
  };
  let loose = false;
  let hits: Hit[] = [];
  if (required.length === 0) hits = orAll(optional);
  else {
    const smallest = required.reduce((a, b) => (b.size < a.size ? b : a));
    for (const [doc] of smallest) {
      let score = 0;
      let ok = true;
      for (const m of required) {
        const sc = m.get(doc);
        if (sc === undefined) {
          ok = false;
          break;
        }
        score += sc;
      }
      if (!ok) continue;
      for (const m of optional) score += m.get(doc) ?? 0;
      hits.push({ doc, score });
    }
    if (hits.length === 0 && required.length > 1) {
      loose = true;
      hits = orAll(per.map((p) => p.m));
    }
  }
  hits.sort((a, b) => b.score - a.score || a.doc - b.doc);
  return { hits, loose };
}

/** 결과를 대분류별로 나눈다 (문서 번호 범위). 대분류 순서는 진열대 순서 그대로 */
export function groupByCategory(hits: readonly Hit[], cats: readonly SearchCat[]): Map<string, Hit[]> {
  const out = new Map<string, Hit[]>(cats.map((c) => [c.id, []]));
  for (const h of hits) {
    const c = cats.find((x) => h.doc >= x.start && h.doc < x.start + x.count);
    if (c) out.get(c.id)?.push(h);
  }
  return out;
}

/** 문서 → 결과 카드 블록 (대분류, 블록 번호, 블록 안 자리) */
export function blockOf(doc: number, cats: readonly SearchCat[], block: number = SEARCH_BLOCK): { cat: string; k: number; at: number } | null {
  const c = cats.find((x) => doc >= x.start && doc < x.start + x.count);
  if (!c) return null;
  const local = doc - c.start;
  return { cat: c.id, k: Math.floor(local / block), at: local % block };
}

/** 소분류 이름·id로 맞는 소분류 (질의 낱말 하나라도) */
export function matchSubs(terms: readonly QueryTerm[], subs: SearchMeta['subs']): SearchMeta['subs'] {
  if (terms.length === 0) return [];
  const norm = (s: string): string => s.normalize('NFKC').toLowerCase();
  return subs.filter(([, sub, name]) => {
    const hay = `${norm(name)} ${norm(sub)}`;
    return terms.every((t) => t.forms.some((f) => hay.includes(f)) || t.alts.some((f) => f.length > 2 && hay.includes(f)));
  });
}
