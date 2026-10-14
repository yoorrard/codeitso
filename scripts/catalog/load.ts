// 진열대 읽기 (Node 전용, scripts/catalog/build.ts와 시험이 부른다. 화면 묶음에 들지 않는다).
// data/catalog/<대분류>/index.json(소분류 순서·이름)과 출처 파일(<출처>.json, {source, items[]})을 한 번 읽어 둔다.
// 빌드는 네트워크 없이 커밋된 자료만 쓴다 (brief 2절). 계산은 src/lib/catalog/core.ts의 순수 함수로 한다.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cardOf, dateOf, filePopularity, relatedIndex, shardOf, sortRanked } from '../../src/lib/catalog/core.ts';
import type { Ranked } from '../../src/lib/catalog/core.ts';
import type { Card, CatalogItem, CategoryId, CategoryMeta, DetailRecord, NavCategory, Row, Shard, SortKey, SourceFile, SubMeta } from '../../src/lib/catalog/types.ts';
import { CATEGORY_ORDER, SHARDS, isCategoryId } from '../../src/lib/catalog/types.ts';

export const CATALOG_DIR = join(import.meta.dirname, '..', '..', 'data', 'catalog');
const DIR = CATALOG_DIR;

interface IndexFile {
  nameKo: string;
  fetchedAt: string;
  total?: number;
  count?: number;
  subcategories: { id: string; nameKo: string; descKo?: string; sources: { id: string; name: string; count: number }[] }[];
}

interface Loaded {
  categories: CategoryMeta[];
  /** `${대분류}/${소분류}` → 인기순 목록 */
  lists: Map<string, Ranked[]>;
  byId: Map<string, Ranked>;
  sources: SourceFile[];
  /** 같은 id가 두 진열대에 있는 수 (상세는 처음 것) */
  duplicates: number;
}

let cache: Loaded | null = null;
const sortedCache = new Map<string, Ranked[]>();
let shardCache: Shard[] | null = null;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function load(): Loaded {
  const categories: CategoryMeta[] = [];
  const lists = new Map<string, Ranked[]>();
  const byId = new Map<string, Ranked>();
  const sources: SourceFile[] = [];
  let duplicates = 0;
  for (const cat of CATEGORY_ORDER) {
    const dir = join(DIR, cat);
    const index = readJson<IndexFile>(join(dir, 'index.json'));
    const subs = new Map<string, Ranked[]>(index.subcategories.map((s) => [s.id, []]));
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'index.json').sort()) {
      const file = readJson<{ source?: { name?: string; url?: string; license?: string }; items?: CatalogItem[] }>(join(dir, name));
      if (!Array.isArray(file.items)) continue; // 가져오기 보조 파일 (예: github-topics-snapshot.json)
      const pops = filePopularity(file.items);
      sources.push({ category: cat, file: name, name: file.source?.name ?? name, url: file.source?.url ?? '', license: file.source?.license ?? '', count: file.items.length });
      file.items.forEach((item, i) => {
        if (item.category !== cat || !isCategoryId(item.category)) throw new Error(`${cat}/${name}: ${item.id}의 category가 ${item.category}다`);
        const list = subs.get(item.kind);
        if (!list) throw new Error(`${cat}/${name}: ${item.id}의 소분류 ${item.kind}가 index.json에 없다`);
        const r: Ranked = { item, pop: pops[i] ?? 0 };
        list.push(r);
        if (byId.has(item.id)) duplicates += 1;
        else byId.set(item.id, r);
      });
    }
    const subcategories: SubMeta[] = [];
    let total = 0;
    for (const s of index.subcategories) {
      const list = sortRanked(subs.get(s.id) ?? [], 'popular');
      if (list.length === 0) continue;
      lists.set(`${cat}/${s.id}`, list);
      total += list.length;
      const meta: SubMeta = { id: s.id, nameKo: s.nameKo, count: list.length, sources: s.sources };
      if (s.descKo) meta.descKo = s.descKo;
      subcategories.push(meta);
    }
    categories.push({ id: cat, nameKo: index.nameKo, total, fetchedAt: index.fetchedAt, subcategories });
  }
  return { categories, lists, byId, sources, duplicates };
}

export function catalog(): Loaded {
  cache ??= load();
  return cache;
}

export function categories(): CategoryMeta[] {
  return catalog().categories;
}

export function categoryMeta(cat: CategoryId): CategoryMeta {
  const c = categories().find((x) => x.id === cat);
  if (!c) throw new Error(`대분류 ${cat}가 없다`);
  return c;
}

export function subMeta(cat: CategoryId, sub: string): SubMeta {
  const s = categoryMeta(cat).subcategories.find((x) => x.id === sub);
  if (!s) throw new Error(`소분류 ${cat}/${sub}가 없다`);
  return s;
}

/** 소분류 목록 (정렬별로 한 번만 정렬해 둔다) */
export function listOf(cat: CategoryId, sub: string, sort: SortKey): Ranked[] {
  const key = `${cat}/${sub}`;
  const base = catalog().lists.get(key);
  if (!base) throw new Error(`소분류 ${key}가 없다`);
  if (sort === 'popular') return base;
  const k = `${key}:${sort}`;
  let out = sortedCache.get(k);
  if (!out) {
    out = sortRanked(base, sort);
    sortedCache.set(k, out);
  }
  return out;
}

/** 머리줄 메뉴·상세 섬의 이름표 */
export function navData(): NavCategory[] {
  return categories().map((c) => ({ id: c.id, name: c.nameKo, total: c.total, subs: c.subcategories.map((s) => ({ id: s.id, name: s.nameKo, count: s.count })) }));
}

export function totalItems(): number {
  return categories().reduce((n, c) => n + c.total, 0);
}

export function cards(list: readonly Ranked[]): Card[] {
  return list.map((r) => card(r.item));
}

/** 카드 모양은 항목마다 한 번만 만든다 (정렬 셋과 기획전이 같은 카드를 쓴다) */
const cardCache = new WeakMap<CatalogItem, Card>();
export function card(item: CatalogItem): Card {
  let c = cardCache.get(item);
  if (!c) {
    c = cardOf(item);
    cardCache.set(item, c);
  }
  return c;
}

/** 상세 자료 조각 (D103): id 해시로 SHARDS개에 나눈다. 관련 상품은 같은 소분류 인기순 목록에서 고른다 */
export function shards(): Shard[] {
  if (shardCache) return shardCache;
  const out: Shard[] = Array.from({ length: SHARDS }, () => ({}));
  const { lists, byId } = catalog();
  for (const list of lists.values()) {
    const rel = relatedIndex(list.map((r) => r.item));
    list.forEach((r, i) => {
      if (byId.get(r.item.id) !== r) return; // 두 진열대에 놓인 같은 id는 처음 것만
      const record: DetailRecord = {
        ...r.item,
        rel: (rel[i] ?? []).map((j) => list[j]).filter((x): x is Ranked => x !== undefined).map((x) => [x.item.id, x.item.name]),
      };
      const bucket = out[shardOf(r.item.id)];
      if (bucket) bucket[r.item.id] = record;
    });
  }
  shardCache = out;
  return out;
}

const ROW_SIZE = 10;

function take(list: readonly Ranked[], n = ROW_SIZE): Card[] {
  return cards(list.slice(0, n));
}

/** 홈 기획전 (D106): 인기 폰트, 별 많은 템플릿, MCP 서버, AI API, 인증 없이 쓰는 API, 최근 갱신 */
export function homeRows(): Row[] {
  const { lists } = catalog();
  const get = (key: string): Ranked[] => lists.get(key) ?? [];
  const interleave = (a: readonly Ranked[], b: readonly Ranked[], n: number): Ranked[] => {
    const out: Ranked[] = [];
    for (let i = 0; out.length < n && (i < a.length || i < b.length); i += 1) {
      const x = a[i];
      const y = b[i];
      if (x) out.push(x);
      if (y && out.length < n) out.push(y);
    }
    return out;
  };
  const templates = [...lists.entries()]
    .filter(([k]) => k.startsWith('templates/'))
    .flatMap(([, l]) => l)
    .filter((r) => typeof r.item.metrics?.stars === 'number')
    .sort((a, b) => (b.item.metrics?.stars ?? 0) - (a.item.metrics?.stars ?? 0));
  const openApis = [...lists.entries()]
    .filter(([k]) => k.startsWith('api/') && k !== 'api/kr-public' && k !== 'api/cloud')
    .flatMap(([, l]) => l)
    .filter((r) => r.item.preview['auth'] === 'none' && r.item.preview['https'] === true)
    .sort((a, b) => b.pop - a.pop);
  const all = [...catalog().byId.values()];
  const newest = all
    .filter((r) => dateOf(r.item) !== undefined && (dateOf(r.item) ?? '') <= r.item.fetchedAt.slice(0, 10) && r.pop >= 0.5)
    .sort((a, b) => ((dateOf(b.item) ?? '') < (dateOf(a.item) ?? '') ? -1 : (dateOf(b.item) ?? '') > (dateOf(a.item) ?? '') ? 1 : b.pop - a.pop));
  return [
    { id: 'fonts', cards: cards(interleave(get('design/fonts-ko'), get('design/fonts'), ROW_SIZE)), more: { cat: 'design', sub: 'fonts-ko' } },
    { id: 'templates', cards: take(templates), more: { cat: 'templates', sub: 'web-starter' } },
    { id: 'mcp', cards: take(get('ai/mcp')), more: { cat: 'ai', sub: 'mcp' } },
    { id: 'aiApis', cards: take(get('api/ai-llm')), more: { cat: 'api', sub: 'ai-llm' } },
    { id: 'openApis', cards: take(openApis) },
    { id: 'recent', cards: take(newest) },
  ];
}

/** 대분류 쪽의 소분류별 인기 상품 몇 개 */
export function topOf(cat: CategoryId, sub: string, n: number): Card[] {
  return take(listOf(cat, sub, 'popular'), n);
}
