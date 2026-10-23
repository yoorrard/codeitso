// 목록 거르기 (S3, D115): 소분류마다 고를 칸(라이선스·인증·CORS·작업·언어·태그…)을 자료에서 뽑는다.
// 값은 출처 자료 그대로이고(지어내지 않는다), 이름표만 화면(ko.ts)이 붙인다. 순수 함수 (DOM·Node API 없음).
// 진열대 빌드가 소분류마다 칸·값·개수(SiteData.facets)와 거르기 파일(/catalog/facet/…)을 만들고, 목록 섬이 같은 함수로 거른다.
// 시험: tests/lib/facets.test.ts
import { decodePostings, encodePostings } from './search.ts';
import type { CatalogItem } from './types.ts';

/** 거르기 칸 (화면 순서). 같은 칸 안에서는 '또는', 칸끼리는 '그리고' */
export const FACETS = [
  'source',
  'license',
  'auth',
  'https',
  'cors',
  'free',
  'transport',
  'agent',
  'task',
  'modality',
  'lang',
  'library',
  'generic',
  'script',
  'variable',
  'variant',
  'format',
  'platform',
  'sdk',
  'field',
  'org',
  'stack',
  'tag',
] as const;
export type FacetKey = (typeof FACETS)[number];

export function isFacetKey(x: string): x is FacetKey {
  return (FACETS as readonly string[]).includes(x);
}

/** 값이 '있다' 하나뿐인 칸 (켜면 그것만) */
export const TOGGLE_FACETS: readonly FacetKey[] = ['free', 'variable'];
/** 소분류 하나에 보이는 칸 수, 칸 하나의 값 수 */
export const MAX_FACETS = 7;
export const MAX_VALUES = 24;

/** 칸 하나: [값, 소분류 전체에서의 개수] (개수 많은 순) */
export interface FacetMeta {
  k: FacetKey;
  values: [string, number][];
}

/** 거르기 파일 (/catalog/facet/<대분류>/<소분류>.json): 칸 → 값마다 인기순 자리 목록 (encodePostings) */
export interface FacetFile {
  v: 1;
  total: number;
  facets: FacetMeta[];
  post: Partial<Record<FacetKey, string[]>>;
}

/** 정렬 순서 파일 (/catalog/facet/<대분류>/<소분류>-<정렬>.json): 그 정렬 순서대로 인기순 자리 */
export interface OrderFile {
  v: 1;
  order: string;
}

const s = (v: unknown, max = 48): string | undefined => (typeof v === 'string' && v.trim() !== '' && v.trim().length <= max ? v.trim() : undefined);
const list = (v: unknown, max = 48): string[] => (Array.isArray(v) ? v.map((x) => s(x, max)).filter((x): x is string => x !== undefined) : []);

/** 인증 값을 아는 꼴로 모은다 (화면 이름표는 ko.ts) */
export function authValue(v: unknown): string | undefined {
  const a = s(v, 40);
  if (!a) return undefined;
  if (/^(none|no)$/i.test(a)) return 'none';
  if (/oauth/i.test(a)) return 'oauth';
  if (/^(apikey|api key|key|x-mashape-key)$/i.test(a)) return 'apiKey';
  return a;
}

/** 상품 하나의 거르기 값 (출처 자료에 있는 것만) */
export function facetValues(item: CatalogItem): Partial<Record<FacetKey, string[]>> {
  const p = item.preview;
  const out: Partial<Record<FacetKey, string[]>> = {};
  const put = (k: FacetKey, vals: (string | undefined)[]): void => {
    const v = [...new Set(vals.filter((x): x is string => x !== undefined))];
    if (v.length > 0) out[k] = v;
  };
  put('source', [item.source.name]);
  put('license', [s(item.license, 40)]);
  put('tag', item.tags.map((t) => s(t, 32)).slice(0, 12));
  switch (p.type) {
    case 'api':
      put('auth', [authValue(p['auth'])]);
      if (p['https'] === true) put('https', ['yes']);
      else if (p['https'] === false) put('https', ['no']);
      put('cors', [p['cors'] === 'yes' ? 'yes' : p['cors'] === 'no' ? 'no' : undefined]);
      if (s(p['freeTierQuote'], 2000)) put('free', ['yes']);
      put('format', list(p['formats']));
      put('field', [s(p['portalCategory'])]);
      put('org', [s(p['orgType'])]);
      break;
    case 'mcp': {
      const transports = list(p['transports']);
      const remote = transports.some((t) => t !== 'stdio') || (Array.isArray(p['remotes']) && p['remotes'].length > 0);
      put('transport', [transports.includes('stdio') || (Array.isArray(p['packages']) && p['packages'].length > 0) ? 'stdio' : undefined, remote ? 'remote' : undefined]);
      put('auth', [authValue(p['auth'])]);
      break;
    }
    case 'model':
      put('task', [s(p['taskLabel']) ?? s(p['task'])]);
      put('library', [s(p['library'])]);
      break;
    case 'dataset':
      put('task', list(p['tasks']));
      put('modality', list(p['modalities']));
      put('lang', list(p['languages']));
      put('format', list(p['formats']).map((f) => f.toUpperCase()));
      put('field', [s(p['field']) ?? s(p['portalCategory'])]);
      put('org', [s(p['orgType'])]);
      break;
    case 'skill':
      put('agent', [s(p['agent']), ...list(p['agents'])]);
      break;
    case 'prompt':
      put('agent', [s(p['agent']) ?? s(p['tool'])]);
      put('format', [s(p['format'])]);
      break;
    case 'repo':
      put('lang', [s(p['language'])]);
      put('platform', list(p['platforms']));
      break;
    case 'template':
      put('lang', [s(p['language'])]);
      put('platform', [s(p['platform'])]);
      put('stack', list(p['stack']));
      break;
    case 'site':
      put('sdk', [s(p['sdk'])]);
      break;
    case 'font': {
      put('generic', [s(p['generic'])]);
      put('script', list(p['subsets']).filter((x) => !/-ext$/.test(x)));
      if (Array.isArray(p['axes']) && p['axes'].length > 0) put('variable', ['yes']);
      break;
    }
    case 'palette':
      put('variant', [s(p['variant'])]);
      break;
    case 'asset':
      put('format', [s(p['format'])]);
      break;
    default:
      break;
  }
  return out;
}

/**
 * 소분류 하나의 거르기 칸 고르기 (빌드). items는 인기순. 값이 둘 이상이고(켜기 칸은 일부에만 있고) 상품의 5% 또는 10개 넘게 덮는 칸만,
 * 값은 개수 많은 순 MAX_VALUES개(태그는 3개 넘게 붙은 것만). 출처 칸은 출처가 둘 이상일 때만.
 */
export function buildFacets(items: readonly CatalogItem[]): FacetFile {
  const n = items.length;
  const vals = items.map(facetValues);
  const facets: FacetMeta[] = [];
  const post: Partial<Record<FacetKey, string[]>> = {};
  for (const k of FACETS) {
    if (facets.length >= MAX_FACETS && k !== 'tag') continue;
    const counts = new Map<string, number>();
    let covered = 0;
    for (const v of vals) {
      const xs = v[k];
      if (!xs) continue;
      covered += 1;
      for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
    }
    const min = k === 'tag' ? 3 : 1;
    let values = [...counts].filter(([, c]) => c >= min).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    // 거의 모든 상품에 붙은 태그(90% 넘게)는 거르는 뜻이 없다
    if (k === 'tag') values = values.filter(([, c]) => c < n * 0.9);
    values = values.slice(0, MAX_VALUES);
    const toggle = TOGGLE_FACETS.includes(k);
    const useful = toggle ? covered > 0 && covered < n : values.length >= 2 && covered >= Math.min(10, n) && covered >= n * 0.05;
    if (!useful) continue;
    facets.push({ k, values });
    post[k] = values.map(([value]) => {
      const ids: number[] = [];
      vals.forEach((v, i) => {
        if (v[k]?.includes(value)) ids.push(i);
      });
      return encodePostings(ids);
    });
  }
  return { v: 1, total: n, facets, post };
}

/** 고른 값: 칸 → 값 목록 */
export type Selection = Partial<Record<FacetKey, string[]>>;

export function selectionSize(sel: Selection): number {
  return Object.values(sel).reduce((n, v) => n + (v?.length ?? 0), 0);
}

/** 주소의 검색 부분 → 고른 값 (아는 칸·값만) */
export function readSelection(params: URLSearchParams, facets: readonly FacetMeta[]): Selection {
  const sel: Selection = {};
  for (const f of facets) {
    const known = new Set(f.values.map((v) => v[0]));
    const picked = [...new Set(params.getAll(f.k))].filter((v) => known.has(v));
    if (picked.length > 0) sel[f.k] = picked;
  }
  return sel;
}

/** 고른 값 → 주소 검색 부분 (칸 순서대로, 값은 고른 순서) */
export function writeSelection(params: URLSearchParams, sel: Selection): void {
  for (const k of FACETS) {
    params.delete(k);
    for (const v of sel[k] ?? []) params.append(k, v);
  }
}

/** 풀어 둔 거르기 파일: 칸 → 값 → 그 값을 가진 인기순 자리 표시 (길이 total) */
export interface FacetIndex {
  total: number;
  facets: FacetMeta[];
  masks: Partial<Record<FacetKey, Uint8Array[]>>;
}

export function openFacets(file: FacetFile): FacetIndex {
  const masks: Partial<Record<FacetKey, Uint8Array[]>> = {};
  for (const f of file.facets) {
    masks[f.k] = (file.post[f.k] ?? []).map((enc) => {
      const m = new Uint8Array(file.total);
      for (const i of decodePostings(enc)) if (i < file.total) m[i] = 1;
      return m;
    });
  }
  return { total: file.total, facets: file.facets, masks };
}

/** 칸 하나의 고른 값을 '또는'으로 합친 표시. 고른 값이 없으면 null(모두 통과) */
function facetMask(index: FacetIndex, k: FacetKey, picked: readonly string[]): Uint8Array | null {
  if (picked.length === 0) return null;
  const f = index.facets.find((x) => x.k === k);
  const masks = index.masks[k];
  if (!f || !masks) return null;
  const out = new Uint8Array(index.total);
  picked.forEach((v) => {
    const at = f.values.findIndex((x) => x[0] === v);
    const m = at >= 0 ? masks[at] : undefined;
    if (m) for (let i = 0; i < out.length; i += 1) if (m[i]) out[i] = 1;
  });
  return out;
}

/**
 * 걸러진 인기순 자리 (오름차순). skip 칸은 빼고 거른다 (그 칸의 값 개수를 셀 때).
 * within: 소분류 안 검색 결과처럼 먼저 좁힌 자리 표시 (N1). 있으면 그 안에서만 거른다
 */
export function applySelection(index: FacetIndex, sel: Selection, skip?: FacetKey, within?: Uint8Array): number[] {
  const masks = index.facets.filter((f) => f.k !== skip).map((f) => facetMask(index, f.k, sel[f.k] ?? [])).filter((m): m is Uint8Array => m !== null);
  if (within) masks.push(within);
  const out: number[] = [];
  for (let i = 0; i < index.total; i += 1) if (masks.every((m) => m[i])) out.push(i);
  return out;
}

/** 지금 고른 것에서 값마다 몇 개가 남는지 (그 칸 자신의 고름은 빼고 센다: 같은 칸은 '또는'이라). within은 applySelection과 같다 */
export function liveCounts(index: FacetIndex, sel: Selection, within?: Uint8Array): Partial<Record<FacetKey, number[]>> {
  const out: Partial<Record<FacetKey, number[]>> = {};
  for (const f of index.facets) {
    const base = applySelection(index, sel, f.k, within);
    const masks = index.masks[f.k] ?? [];
    out[f.k] = f.values.map((_, j) => {
      const m = masks[j];
      if (!m) return 0;
      let c = 0;
      for (const i of base) if (m[i]) c += 1;
      return c;
    });
  }
  return out;
}

/** 정렬 순서(인기순 자리의 나열) ↔ 36진수 '.' 이음 */
export function encodeOrder(order: readonly number[]): string {
  return order.map((n) => n.toString(36)).join('.');
}

export function decodeOrder(s: string): number[] {
  return s === '' ? [] : s.split('.').map((x) => parseInt(x, 36));
}

/** 정렬 순서 파일 → 자리별 그 정렬의 순위 */
export function rankOf(order: readonly number[], total: number): Int32Array {
  const r = new Int32Array(total).fill(-1);
  order.forEach((p, i) => {
    if (p >= 0 && p < total) r[p] = i;
  });
  return r;
}
