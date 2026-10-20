// 진열대 읽기 (Node 전용, scripts/catalog/build.ts와 시험이 부른다. 화면 묶음에 들지 않는다).
// data/catalog/<대분류>/index.json(소분류 순서·이름)과 출처 파일(<출처>.json, {source, items[]})을 한 번 읽어 둔다.
// 빌드는 네트워크 없이 커밋된 자료만 쓴다 (brief 2절). 계산은 src/lib/catalog/core.ts의 순수 함수로 한다.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { cardOf, rankScores, relatedIndex, shardOf, sortRanked, withKo, withMedia } from '../../src/lib/catalog/core.ts';
import type { Ranked } from '../../src/lib/catalog/core.ts';
import type { Card, CatalogItem, CategoryId, CategoryMeta, DetailRecord, KitData, NavCategory, Row, Shard, SortKey, SourceFile, SubMeta } from '../../src/lib/catalog/types.ts';
import { CATEGORY_ORDER, SHARDS, isCategoryId } from '../../src/lib/catalog/types.ts';
import { isKitTheme } from '../../src/lib/kits.ts';

export const CATALOG_DIR = join(import.meta.dirname, '..', '..', 'data', 'catalog');
/** 코드잇소가 쓴 한국어 설명 (v5.1 D122): <이름>.json = { "<상품 id>": "한국어 설명" }. 폴더나 파일이 없어도 된다 */
export const KO_DIR = join(import.meta.dirname, '..', '..', 'data', 'catalog-ko');
/** 저장소 README 첫 그림 (v5.1 D126, scripts/import/media-readme.ts): { images: id → 주소, stills: id → 멈춘 그림 }. 없어도 된다 */
export const MEDIA_DIR = join(import.meta.dirname, '..', '..', 'data', 'catalog-media');
/** 스타터 키트 (손으로 고른 진열대 id 묶음) */
export const KITS_FILE = join(import.meta.dirname, '..', '..', 'data', 'kits.json');
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

/**
 * data/catalog-ko/*.json을 모두 읽어 id → 한국어 설명. 읽지 못한 파일(쓰는 중이거나 깨진 JSON)은 알리고 건너뛴다.
 * 같은 id가 여러 파일에 있으면 이름 순으로 먼저 읽은 것이 이긴다: agent(사람이 살핀 번역) → auto-<n>(매일 번역) → template(자료로 만든 문장) (D128).
 */
export function readKo(dir: string = KO_DIR, skip: readonly string[] = []): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.json') && !skip.includes(n)).sort()) {
    let raw: unknown;
    try {
      raw = readJson<unknown>(join(dir, name));
    } catch {
      console.warn(`한국어 설명 ${name}을 읽지 못해 건너뛴다`);
      continue;
    }
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) continue;
    for (const [id, v] of Object.entries(raw)) if (typeof v === 'string' && v.trim() !== '' && !out.has(id)) out.set(id, v);
  }
  return out;
}

/** data/catalog-media/readme-images.json → id → [그림, 멈춘 그림] */
export function readMedia(dir: string = MEDIA_DIR): Map<string, [string, string | undefined]> {
  const out = new Map<string, [string, string | undefined]>();
  const file = join(dir, 'readme-images.json');
  if (!existsSync(file)) return out;
  const raw = readJson<{ images?: Record<string, unknown>; stills?: Record<string, unknown> }>(file);
  for (const [id, v] of Object.entries(raw.images ?? {})) {
    const still = raw.stills?.[id];
    if (typeof v === 'string') out.set(id, [v, typeof still === 'string' ? still : undefined]);
  }
  return out;
}

/** 소분류마다 인기 점수를 매긴다 (D133): 같은 소분류의 상품을 한꺼번에 rankScores에 넣는다. raw는 한국어·그림을 붙이기 전 상품 */
function scoreBySub(entries: readonly { raw: CatalogItem; r: Ranked }[]): void {
  const groups = new Map<string, { raw: CatalogItem; r: Ranked }[]>();
  for (const e of entries) {
    const key = `${e.raw.category}/${e.raw.kind}`;
    const g = groups.get(key);
    if (g) g.push(e);
    else groups.set(key, [e]);
  }
  for (const g of groups.values()) {
    const scores = rankScores(g.map((e) => e.raw));
    g.forEach((e, i) => {
      e.r.pop = scores[i] ?? 0;
    });
  }
}

/** 가져온 그대로의 상품(한국어·그림을 붙이기 전)과 소분류 안 인기 점수. 한국어 설명 스크립트(scripts/i18n/)가 쓴다 */
export function rawItems(dir: string = DIR): Ranked[] {
  const entries: { raw: CatalogItem; r: Ranked }[] = [];
  for (const cat of CATEGORY_ORDER) {
    const catDir = join(dir, cat);
    if (!existsSync(catDir)) continue;
    for (const name of readdirSync(catDir).filter((n) => n.endsWith('.json') && n !== 'index.json').sort()) {
      const file = readJson<{ items?: CatalogItem[] }>(join(catDir, name));
      if (!Array.isArray(file.items)) continue;
      for (const item of file.items) entries.push({ raw: item, r: { item, pop: 0 } });
    }
  }
  scoreBySub(entries);
  return entries.map((e) => e.r);
}

function load(): Loaded {
  const koMap = readKo();
  const media = readMedia();
  const categories: CategoryMeta[] = [];
  const lists = new Map<string, Ranked[]>();
  const byId = new Map<string, Ranked>();
  const sources: SourceFile[] = [];
  let duplicates = 0;
  const entries: { raw: CatalogItem; r: Ranked }[] = [];
  for (const cat of CATEGORY_ORDER) {
    const dir = join(DIR, cat);
    const index = readJson<IndexFile>(join(dir, 'index.json'));
    const subs = new Map<string, Ranked[]>(index.subcategories.map((s) => [s.id, []]));
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'index.json').sort()) {
      const file = readJson<{ source?: { name?: string; url?: string; license?: string }; items?: CatalogItem[] }>(join(dir, name));
      if (!Array.isArray(file.items)) continue; // 가져오기 보조 파일 (예: github-topics-snapshot.json)
      sources.push({ category: cat, file: name, name: file.source?.name ?? name, url: file.source?.url ?? '', license: file.source?.license ?? '', count: file.items.length });
      file.items.forEach((raw) => {
        const m = media.get(raw.id);
        const item = withMedia(withKo(raw, koMap.get(raw.id)), m?.[0], m?.[1]);
        if (item.category !== cat || !isCategoryId(item.category)) throw new Error(`${cat}/${name}: ${item.id}의 category가 ${item.category}다`);
        const list = subs.get(item.kind);
        if (!list) throw new Error(`${cat}/${name}: ${item.id}의 소분류 ${item.kind}가 index.json에 없다`);
        const r: Ranked = { item, pop: 0 };
        entries.push({ raw, r });
        list.push(r);
        if (byId.has(item.id)) duplicates += 1;
        else byId.set(item.id, r);
      });
    }
    scoreBySub(entries.splice(0));
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

/** 홈 기획전 (D106, v5.1 D124): AI 코딩 툴용 MCP·스킬, 키 없이 쓰는 API, AI API, 별 많은 템플릿, 한글 폰트 */
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
  // 홈 줄 순서 (v5.1 D124 → D135): AI 코딩 툴 재료 → UI 컴포넌트 → AI API → 템플릿 → 한글 폰트. 인기 폰트가 맨 앞에 서지 않게 한다.
  // '키 없이 쓰는 API' 줄은 홈에서 뺐다(소유자 요청: 바이브코딩에서 잘 쓰지 않음). 재료는 API 카테고리에 그대로 있다.
  return [
    { id: 'aiTools', cards: cards(interleave(get('ai/mcp'), get('ai/skill'), ROW_SIZE)), more: { cat: 'ai' } },
    { id: 'uiLibs', cards: take(get('design/ui-libraries')), more: { cat: 'design', sub: 'ui-libraries' } },
    { id: 'aiApis', cards: take(get('api/ai-llm')), more: { cat: 'api', sub: 'ai-llm' } },
    { id: 'templates', cards: take(templates), more: { cat: 'templates', sub: 'web-starter' } },
    { id: 'fontsKo', cards: take(get('design/fonts-ko')), more: { cat: 'design', sub: 'fonts-ko' } },
  ];
}

/** 대분류 쪽의 소분류별 인기 상품 몇 개 */
export function topOf(cat: CategoryId, sub: string, n: number): Card[] {
  return take(listOf(cat, sub, 'popular'), n);
}

export interface KitsFile {
  home: string[];
  kits: { id: string; theme: string; nameKo: string; descKo: string; items: string[]; outlineKo: string[] }[];
}

/** 스타터 키트 파일 (data/kits.json) 그대로 */
export function kitsFile(file: string = KITS_FILE): KitsFile {
  return readJson<KitsFile>(file);
}

/** 스타터 키트 (data/kits.json): id마다 진열대 카드로. 없는 id나 모르는 주제가 있으면 빌드를 멈춘다 (자료를 다시 받아 빠진 재료) */
export function kits(file: string = KITS_FILE): KitData[] {
  const { byId } = catalog();
  return kitsFile(file).kits.map((k) => {
    if (!isKitTheme(k.theme)) throw new Error(`data/kits.json: 키트 ${k.id}의 주제 ${k.theme}를 모른다 (src/lib/kits.ts KIT_THEMES)`);
    return {
      id: k.id,
      theme: k.theme,
      name: k.nameKo,
      desc: k.descKo,
      outline: k.outlineKo,
      cards: k.items.map((id) => {
        const r = byId.get(id);
        if (!r) throw new Error(`data/kits.json: 키트 ${k.id}의 ${id}가 진열대에 없다`);
        return card(r.item);
      }),
    };
  });
}
