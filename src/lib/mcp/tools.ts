// AI 에이전트용 MCP 도구의 계산 (D154): 진열대 빌드가 만든 정적 JSON만 읽어 답을 만든다. 상품 사실은 출처 자료 그대로.
// 읽기 전용이고 바깥 사이트에 아무것도 묻지 않는다(장바구니 링크도 # 뒤만 읽는다). 파일 읽기는 Loader가 맡는다:
// Worker는 정적 파일 묶음(env.ASSETS), 시험은 디스크. 한 번 부를 때 읽는 파일 수를 묶어 무료 Worker의 CPU 10ms 안에 든다.
// 시험: tests/lib/mcp-tools.test.ts
import type { ModelRow, ProviderModels } from '../catalog/models.ts';
import { modelProviderOf, pickList } from '../catalog/models.ts';
import type { Card, CategoryId, DetailRecord, Fact, ListChunk, Shard, SortKey } from '../catalog/types.ts';
import { CATEGORY_ORDER, CHUNK_PAGES, PAGE_SIZE, isCategoryId } from '../catalog/types.ts';
import { shardOf } from '../catalog/core.ts';
import type { QueryTerm, SearchMeta, SubDocsFile, TokenShard } from '../catalog/search.ts';
import { blockOf, combineTerms, decodeSubDocs, keepOnly, matchSubs, queryTerms, shardsFor, synonymMap, termMatches } from '../catalog/search.ts';
import { FILES, itemDataPath, itemPath, kitPath, listDataPath, modelDataPath, searchBlockPath, searchShardPath, searchSubPath, shareUrl } from '../routes.ts';
import { readShareEntries } from '../share.ts';
import { authOf, installLine } from '../use-lines.ts';
import type { AgentCategory, AgentSummary } from './summary.ts';
import { readAgentSummary } from './summary.ts';
import { MCP_ERRORS } from '../../copy/mcp.ts';
import { block, commas, fillText, line, webUrl } from './text.ts';

/** 정적 JSON 하나를 읽는다. 없거나 깨졌으면 null */
export interface Loader {
  json(path: string): Promise<unknown>;
}

export interface ToolContext {
  load: Loader;
  /** 사이트 주소(origin, 끝 빗금 없이). 결과의 재료 쪽 주소를 만든다 */
  site: string;
}

/** 도구가 모델에게 돌려주는 오류 (isError 결과). code는 시험·집계용, message는 모델이 읽는 글 */
export class ToolError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export const LIMITS = {
  query: 200,
  searchPage: 20,
  searchOffset: 200,
  ids: 5,
  browsePage: 30,
  cartPage: 10,
  /** 질의 낱말 수 (에이전트는 문장을 통째로 넣기도 한다: 읽는 조각과 계산을 묶는다) */
  terms: 6,
  /** 친 꼴만으로 이만큼 넘게 맞은 낱말은 같은 뜻 낱말로 넓히지 않는다 (CPU) */
  altSkip: 300,
  /** 검색 한 번에 읽는 낱말 조각 수 (질의 낱말 × 꼴·같은 뜻·두 글자 조각) */
  shards: 24,
  share: 12_000,
  summary: 240,
  sourceText: 1_200,
  snippet: 1_500,
  install: 600,
  tags: 12,
  models: 12,
  previewFacts: 10,
} as const;

/** 목록 결과 한 줄 */
export interface MaterialLine {
  id: string;
  name: string;
  category: string;
  category_name: string;
  subcategory: string;
  subcategory_name: string;
  /** 한국어 한 줄이 있으면 그것, 없으면 출처 원문 한 줄 */
  summary: string;
  /** summary가 코드잇소의 한국어 한 줄일 때 출처 원문 */
  source_summary?: string;
  source: string;
  license?: string;
  popularity?: string;
  updated?: string;
  facts?: string[];
  page_url: string;
}

export interface Page {
  total: number;
  offset: number;
  count: number;
  has_more: boolean;
  next_offset?: number;
}

export interface SearchResult extends Page {
  query: string;
  category?: string;
  subcategory?: string;
  /** 모든 낱말이 든 재료가 없어 낱말 하나라도 든 재료를 보인다 */
  loose: boolean;
  related_subcategories: { category: string; subcategory: string; name: string; count: number }[];
  items: MaterialLine[];
}

export interface ModelLine {
  id: string;
  name: string;
  input_usd_per_mtok?: number;
  output_usd_per_mtok?: number;
  context_tokens?: number;
}

export interface MaterialDetail {
  id: string;
  name: string;
  category: string;
  category_name: string;
  subcategory: string;
  subcategory_name: string;
  summary_ko?: string;
  summary_ko_by?: 'codeitso' | 'codeitso_rule';
  /** 출처가 쓴 설명 (제3자 글) */
  source_text: string;
  official_url?: string;
  source: { name: string; url?: string };
  license?: string;
  requires?: 'api_key' | 'oauth';
  install?: string;
  install_one_line?: string;
  snippet?: string;
  docs_url?: string;
  metrics?: Record<string, number | string>;
  facts?: Record<string, string | number | boolean>;
  tags?: string[];
  related?: { id: string; name: string }[];
  models?: { fetched: string; total: number; items: ModelLine[] };
  fetched_at?: string;
  page_url: string;
}

export interface DetailsResult {
  items: MaterialDetail[];
  not_found: string[];
}

export interface CategoryOverview {
  total: number;
  fetched: string;
  categories: { id: string; name: string; total: number; subcategories: { id: string; name: string; count: number }[] }[];
  kits: number;
}

export interface CategoryResult {
  id: string;
  name: string;
  total: number;
  fetched: string;
  subcategories: { id: string; name: string; count: number; desc?: string; sorts: SortKey[] }[];
}

export interface SubListResult extends Page {
  category: string;
  category_name: string;
  subcategory: string;
  subcategory_name: string;
  sort: SortKey;
  items: MaterialLine[];
}

export interface KitList {
  kits: { id: string; theme: string; name: string; desc: string; item_count: number; page_url: string }[];
}

export interface KitResult {
  id: string;
  theme: string;
  name: string;
  desc: string;
  outline: string[];
  items: { id: string; name: string; category: string; subcategory: string; subcategory_name: string; summary: string; license?: string; page_url: string }[];
  page_url: string;
}

export interface CartLineOut {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  subcategory_name?: string;
  /** 이용자가 담기 창에서 고른 AI 모델 id (AI API만) */
  chosen_model?: string;
  official_url?: string;
  install?: string;
  requires?: 'api_key' | 'oauth';
  license?: string;
  missing?: true;
  page_url: string;
}

export interface CartResult extends Page {
  cart_url: string;
  items: CartLineOut[];
}

// ── 읽기 도우미 ────────────────────────────────────────────────────────

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

async function need<T>(ctx: ToolContext, path: string, ok: (x: unknown) => boolean): Promise<T> {
  const raw = await ctx.load.json(path);
  if (!ok(raw)) throw new ToolError('data', MCP_ERRORS.data);
  return raw as T;
}

export async function summaryOf(ctx: ToolContext): Promise<AgentSummary> {
  const s = readAgentSummary(await ctx.load.json(FILES.agentSummary));
  if (!s) throw new ToolError('data', MCP_ERRORS.data);
  return s;
}

async function searchMeta(ctx: ToolContext): Promise<SearchMeta> {
  return need<SearchMeta>(ctx, FILES.searchMeta, (x) => isObj(x) && Array.isArray(x['cats']) && typeof x['shards'] === 'number');
}

/** 대분류·소분류 이름표 */
interface Names {
  cat: (cat: string) => string;
  sub: (cat: string, sub: string) => string;
  category: (cat: string) => AgentCategory | undefined;
}

function namesOf(s: AgentSummary): Names {
  const cats = new Map(s.categories.map((c) => [c.id as string, c]));
  return {
    cat: (cat) => cats.get(cat)?.name ?? cat,
    sub: (cat, sub) => cats.get(cat)?.subs.find((x) => x.id === sub)?.name ?? sub,
    category: (cat) => cats.get(cat),
  };
}

function pageUrl(ctx: ToolContext, id: string): string {
  return `${ctx.site}${itemPath(id)}`;
}

function popularity(c: Pick<Card, 'metric'>): string | undefined {
  const m = c.metric;
  if (!m) return undefined;
  return `${commas(m.value)} ${m.kind}`;
}

function factText(f: Fact): string {
  return f.v === undefined || f.v === '' ? f.k : `${f.k}: ${line(f.v, 60)}`;
}

/** 카드(목록·검색 블록) → 결과 한 줄 */
export function cardLine(ctx: ToolContext, c: Card, names: Names): MaterialLine {
  const out: MaterialLine = {
    id: c.id,
    name: line(c.name, 120),
    category: c.cat,
    category_name: names.cat(c.cat),
    subcategory: c.sub,
    subcategory_name: names.sub(c.cat, c.sub),
    summary: line(c.summary, LIMITS.summary),
    source: line(c.source, 80),
    page_url: pageUrl(ctx, c.id),
  };
  if (c.orig) out.source_summary = line(c.orig, LIMITS.summary);
  if (c.license) out.license = line(c.license, 60);
  const pop = popularity(c);
  if (pop) out.popularity = pop;
  if (c.updatedAt) out.updated = c.updatedAt;
  const facts = c.facts.map(factText).filter((f) => f !== '');
  if (facts.length > 0) out.facts = facts;
  return out;
}

function pageOf(total: number, offset: number, count: number): Page {
  const next = offset + count;
  const has = next < total;
  return { total, offset, count, has_more: has, ...(has ? { next_offset: next } : {}) };
}

/** 소분류 id → 대분류. 대분류를 주면 그 안에 있는지 본다 */
function resolveSub(s: AgentSummary, sub: string, cat: string | undefined): AgentCategory {
  const owners = s.categories.filter((c) => c.subs.some((x) => x.id === sub));
  if (owners.length === 0) throw new ToolError('unknown_sub', fillText(MCP_ERRORS.unknownSub, { id: sub }));
  if (cat !== undefined) {
    const own = owners.find((c) => c.id === cat);
    if (!own) throw new ToolError('sub_not_in_category', fillText(MCP_ERRORS.subNotInCategory, { sub, cat, cats: owners.map((c) => c.id).join(', ') }));
    return own;
  }
  if (owners.length > 1) throw new ToolError('sub_ambiguous', fillText(MCP_ERRORS.subAmbiguous, { sub, cats: owners.map((c) => c.id).join(', ') }));
  const only = owners[0];
  if (!only) throw new ToolError('unknown_sub', fillText(MCP_ERRORS.unknownSub, { id: sub }));
  return only;
}

function checkCategory(cat: string | undefined): CategoryId | undefined {
  if (cat === undefined) return undefined;
  if (!isCategoryId(cat)) throw new ToolError('unknown_category', fillText(MCP_ERRORS.unknownCategory, { id: cat }));
  return cat;
}


// ── 1. 검색 ──────────────────────────────────────────────────────────

/**
 * 에이전트용 질의 (사이트 검색은 대분류마다 따로 보이므로 이 순서를 쓰지 않는다). 맞는 재료는 runQuery와 같고 순서만 다르다:
 * ① 꼭 드는 낱말을 친 꼴 그대로 맞힌 점수를 두 번 더 더한다 → 같은 뜻 낱말(급식 → meal, api → server)로만 맞은 재료가 뒤로 간다.
 * ② 같은 점수면 대분류 안 인기 순위(문서 번호 - 대분류 시작)로 → 대분류가 번갈아 나온다 (번호 그대로면 AI 확장이 늘 먼저다).
 * 낱말마다 '친 꼴'과 '같은 뜻'을 따로 한 번씩만 풀어(목록 풀기가 가장 비싸다) 두 점수를 함께 얻는다. 무료 Worker의 CPU 10ms 안에 들게.
 */
export function agentQuery(
  terms: readonly QueryTerm[],
  get: (n: number) => TokenShard | undefined,
  meta: Pick<SearchMeta, 'cats' | 'shards'>,
  keep?: (doc: number) => boolean,
): { hits: { doc: number; score: number }[]; loose: boolean } {
  const strict = terms.map((t) => ({ m: keepOnly(termMatches({ ...t, alts: [] }, get, meta.shards), keep), optional: t.optional === true }));
  const full = terms.map((t, i) => {
    const own = strict[i]?.m ?? new Map<number, number>();
    // 친 꼴만으로 이미 많이 맞으면 같은 뜻 낱말은 풀지 않는다: 앞쪽 결과는 거의 같고 목록 풀기가 가장 비싸다
    if (t.alts.length === 0 || own.size >= LIMITS.altSkip) return { m: own, optional: t.optional === true };
    const m = new Map(own);
    for (const [d, sc] of keepOnly(termMatches({ text: t.text, forms: [], alts: t.alts }, get, meta.shards), keep)) if ((m.get(d) ?? 0) < sc) m.set(d, sc);
    return { m, optional: t.optional === true };
  });
  const res = combineTerms(full, false);
  // 정렬 열쇠를 한 번씩만 만든다: 점수 + 꼭 드는 낱말을 친 꼴 그대로 맞힌 점수 × 2, 대분류 안 순위 (비교마다 찾으면 결과 수천 개에서 느리다).
  // 흔한 말(api 같은 optional)은 친 꼴 점수에 넣지 않는다: 'API'가 이름에 있다는 것만으로 앞서지 않게
  const required = strict.filter((p) => !p.optional);
  const keyed = res.hits.map((h) => {
    let own = 0;
    for (const p of required) own += (p.m.get(h.doc) ?? 0) * 2;
    const c = meta.cats.find((x) => h.doc >= x.start && h.doc < x.start + x.count);
    return { h, k: h.score + own, l: c ? h.doc - c.start : h.doc };
  });
  keyed.sort((a, b) => b.k - a.k || a.l - b.l || a.h.doc - b.h.doc);
  res.hits = keyed.map((x) => x.h);
  return res;
}

export interface SearchArgs {
  query: string;
  category?: string;
  subcategory?: string;
  limit: number;
  offset: number;
}

export async function searchMaterials(ctx: ToolContext, args: SearchArgs): Promise<SearchResult> {
  const query = line(args.query, LIMITS.query);
  const cat = checkCategory(args.category);
  const [meta, summary] = await Promise.all([searchMeta(ctx), summaryOf(ctx)]);
  const names = namesOf(summary);
  const terms = queryTerms(query, synonymMap(meta.syn), new Set(meta.common)).slice(0, LIMITS.terms);
  if (terms.length === 0) throw new ToolError('empty_query', MCP_ERRORS.emptyQuery);

  // 소분류 안에서만: 그 소분류의 문서 번호 목록으로 거른다
  let keep: ((doc: number) => boolean) | undefined;
  let subCat: string | undefined;
  if (args.subcategory !== undefined) {
    const owner = resolveSub(summary, args.subcategory, cat);
    subCat = owner.id;
    const file = await need<SubDocsFile>(ctx, searchSubPath(owner.id, args.subcategory), (x) => isObj(x) && typeof x['asc'] === 'string');
    const docs = decodeSubDocs(file);
    keep = (d) => docs.has(d);
  } else if (cat !== undefined) {
    const range = meta.cats.find((c) => c.id === cat);
    keep = range ? (d) => d >= range.start && d < range.start + range.count : () => false;
  }

  const ids = shardsFor(terms, meta.shards).slice(0, LIMITS.shards);
  const loaded = await Promise.all(ids.map((n) => ctx.load.json(searchShardPath(n))));
  const shards = new Map<number, TokenShard>();
  ids.forEach((n, i) => {
    const s = loaded[i];
    if (isObj(s)) shards.set(n, s as TokenShard);
  });
  const { hits, loose } = agentQuery(terms, (n) => shards.get(n), meta, keep);

  const total = hits.length;
  const offset = Math.min(args.offset, LIMITS.searchOffset);
  if (offset > 0 && offset >= total) throw new ToolError('offset', fillText(MCP_ERRORS.offsetTooLarge, { offset: String(offset), total: String(total) }));
  const pageHits = hits.slice(offset, offset + args.limit);

  // 결과 카드 블록: 필요한 블록만 한 번씩
  const places = pageHits.map((h) => blockOf(h.doc, meta.cats, meta.block));
  const keys = [...new Set(places.filter((p) => p !== null).map((p) => `${p.cat}|${p.k}`))];
  const blocks = new Map<string, Card[]>();
  await Promise.all(
    keys.map(async (key) => {
      const [c, k] = key.split('|');
      const b = await ctx.load.json(searchBlockPath(c ?? '', Number(k)));
      if (Array.isArray(b)) blocks.set(key, b as Card[]);
    }),
  );
  const items: MaterialLine[] = [];
  for (const p of places) {
    const card = p ? blocks.get(`${p.cat}|${p.k}`)?.[p.at] : undefined;
    if (card) items.push(cardLine(ctx, card, names));
  }

  const related =
    offset === 0
      ? matchSubs(terms, meta.subs)
          .filter(([c]) => cat === undefined || c === cat)
          .slice(0, 5)
          .map(([c, s, name, count]) => ({ category: c, subcategory: s, name, count }))
      : [];
  const out: SearchResult = { query, loose, related_subcategories: related, items, ...pageOf(total, offset, items.length) };
  if (cat !== undefined || subCat !== undefined) out.category = subCat ?? cat;
  if (args.subcategory !== undefined) out.subcategory = args.subcategory;
  return out;
}

// ── 2. 자세히 ────────────────────────────────────────────────────────

/** 미리 보기 칸 가운데 글·숫자·참거짓인 짧은 사실만 (인증·HTTPS·CORS·전송 방식·형식 같은 것). 그림 주소는 뺀다 */
function previewFacts(p: DetailRecord['preview']): Record<string, string | number | boolean> | undefined {
  const out: Record<string, string | number | boolean> = {};
  let n = 0;
  for (const [k, v] of Object.entries(p)) {
    if (n >= LIMITS.previewFacts || k === 'type') continue;
    // 그림·글꼴 파일 주소와 진열대가 쓰는 장부 칸(…Of·…Source·…CheckedAt·견본)은 뺀다
    if (/(^|_)(src|img|image|images|dark|css|file|thumb|logo|icon|url|svg|body|bodies|sample)$/i.test(k) || /(Of|Source|CheckedAt)$/.test(k)) continue;
    if (typeof v === 'string') {
      const t = line(v, 120);
      if (t === '' || /^https?:\/\//.test(t)) continue;
      out[k] = t;
    } else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else continue;
    n += 1;
  }
  return n > 0 ? out : undefined;
}

function modelLines(file: ProviderModels): { fetched: string; total: number; items: ModelLine[] } {
  const live = pickList(file.rows);
  const items = live.slice(0, LIMITS.models).map((r: ModelRow) => {
    const m: ModelLine = { id: r.id, name: line(r.name, 80) };
    if (r.in !== undefined) m.input_usd_per_mtok = r.in;
    if (r.out !== undefined) m.output_usd_per_mtok = r.out;
    if (r.ctx !== undefined) m.context_tokens = r.ctx;
    return m;
  });
  return { fetched: file.fetched, total: live.length, items };
}

export function detailOf(ctx: ToolContext, d: DetailRecord, names: Names): MaterialDetail {
  const out: MaterialDetail = {
    id: d.id,
    name: line(d.name, 120),
    category: d.category,
    category_name: names.cat(d.category),
    subcategory: d.kind,
    subcategory_name: names.sub(d.category, d.kind),
    source_text: line(d.summary, LIMITS.sourceText),
    source: { name: line(d.source.name, 80) },
    page_url: pageUrl(ctx, d.id),
  };
  if (d.summaryKo) {
    out.summary_ko = line(d.summaryKo, LIMITS.summary);
    out.summary_ko_by = d.koBy === 'rule' ? 'codeitso_rule' : 'codeitso';
  }
  const official = webUrl(d.url);
  if (official) out.official_url = official;
  const srcUrl = webUrl(d.source.url);
  if (srcUrl) out.source.url = srcUrl;
  if (d.license) out.license = line(d.license, 60);
  const auth = authOf(d);
  if (auth) out.requires = auth === 'oauth' ? 'oauth' : 'api_key';
  const install = block(d.use?.install, LIMITS.install, 12);
  if (install) out.install = install;
  const one = installLine(d.use?.install);
  if (one && one !== install) out.install_one_line = line(one, 300);
  const snippet = block(d.use?.snippet, LIMITS.snippet, 40);
  if (snippet) out.snippet = snippet;
  const docs = webUrl(d.use?.docs);
  if (docs) out.docs_url = docs;
  const m = d.metrics;
  if (m) {
    const metrics: Record<string, number | string> = {};
    for (const k of ['stars', 'downloads', 'likes', 'views'] as const) if (typeof m[k] === 'number') metrics[k] = m[k];
    if (m.updatedAt) metrics['updated_at'] = m.updatedAt;
    if (Object.keys(metrics).length > 0) out.metrics = metrics;
  }
  const facts = previewFacts(d.preview);
  if (facts) out.facts = facts;
  const tags = d.tags.map((t) => line(t, 40)).filter((t) => t !== '').slice(0, LIMITS.tags);
  if (tags.length > 0) out.tags = tags;
  if (d.rel.length > 0) out.related = d.rel.slice(0, 6).map(([id, name]) => ({ id, name: line(name, 80) }));
  if (d.fetchedAt) out.fetched_at = d.fetchedAt;
  return out;
}

/** 재료 id 목록 → 상세 조각을 한 번씩 읽어 상세를 찾는다 */
async function recordsOf(ctx: ToolContext, ids: readonly string[]): Promise<Map<string, DetailRecord>> {
  const byShard = new Map<number, string[]>();
  for (const id of ids) {
    const n = shardOf(id);
    byShard.set(n, [...(byShard.get(n) ?? []), id]);
  }
  const out = new Map<string, DetailRecord>();
  await Promise.all(
    [...byShard].map(async ([n, list]) => {
      const shard = await ctx.load.json(itemDataPath(n));
      if (!isObj(shard)) return;
      for (const id of list) {
        const rec = (shard as Shard)[id];
        if (isObj(rec)) out.set(id, rec);
      }
    }),
  );
  return out;
}

export async function getMaterials(ctx: ToolContext, ids: readonly string[]): Promise<DetailsResult> {
  const unique = [...new Set(ids.map((x) => x.trim()).filter((x) => x !== ''))].slice(0, LIMITS.ids);
  const [summary, recs] = await Promise.all([summaryOf(ctx), recordsOf(ctx, unique)]);
  const names = namesOf(summary);
  const items: MaterialDetail[] = [];
  const notFound: string[] = [];
  for (const id of unique) {
    const rec = recs.get(id);
    if (!rec) {
      notFound.push(id);
      continue;
    }
    const detail = detailOf(ctx, rec, names);
    const provider = modelProviderOf(id);
    if (provider) {
      const file = await ctx.load.json(modelDataPath(provider));
      if (isObj(file) && Array.isArray(file['rows'])) detail.models = modelLines(file as unknown as ProviderModels);
    }
    items.push(detail);
  }
  return { items, not_found: notFound };
}

// ── 3. 둘러보기 ──────────────────────────────────────────────────────

export interface BrowseArgs {
  category?: string;
  subcategory?: string;
  sort: SortKey;
  limit: number;
  offset: number;
}

const sortsOf = (s: { measured: boolean; dated: boolean }): SortKey[] => (s.dated ? ['popular', 'name', 'recent'] : ['popular', 'name']);

export async function browse(ctx: ToolContext, args: BrowseArgs): Promise<CategoryOverview | CategoryResult | SubListResult> {
  const cat = checkCategory(args.category);
  const summary = await summaryOf(ctx);
  const names = namesOf(summary);

  if (args.subcategory === undefined) {
    if (cat === undefined) {
      const ordered = CATEGORY_ORDER.map((id) => names.category(id)).filter((c): c is AgentCategory => c !== undefined);
      return {
        total: summary.total,
        fetched: summary.fetched,
        categories: ordered.map((c) => ({ id: c.id, name: c.name, total: c.total, subcategories: c.subs.map((s) => ({ id: s.id, name: s.name, count: s.count })) })),
        kits: summary.kits.length,
      };
    }
    const c = names.category(cat);
    if (!c) throw new ToolError('unknown_category', fillText(MCP_ERRORS.unknownCategory, { id: cat }));
    return {
      id: c.id,
      name: c.name,
      total: c.total,
      fetched: c.fetched,
      subcategories: c.subs.map((s) => ({ id: s.id, name: s.name, count: s.count, ...(s.desc ? { desc: line(s.desc, 200) } : {}), sorts: sortsOf(s) })),
    };
  }

  const owner = resolveSub(summary, args.subcategory, cat);
  const sub = owner.subs.find((s) => s.id === args.subcategory);
  if (!sub) throw new ToolError('unknown_sub', fillText(MCP_ERRORS.unknownSub, { id: args.subcategory }));
  if (args.sort === 'recent' && !sub.dated) throw new ToolError('no_recent', fillText(MCP_ERRORS.noRecent, { id: sub.id }));
  if (args.offset > 0 && args.offset >= sub.count) throw new ToolError('offset', fillText(MCP_ERRORS.offsetTooLarge, { offset: String(args.offset), total: String(sub.count) }));
  const perChunk = CHUNK_PAGES * PAGE_SIZE;
  const chunk = Math.floor(args.offset / perChunk);
  const file = await need<ListChunk>(ctx, listDataPath(owner.id, sub.id, args.sort, chunk), (x) => isObj(x) && Array.isArray(x['cards']));
  const from = args.offset - chunk * perChunk;
  const cards = file.cards.slice(from, from + args.limit);
  return {
    category: owner.id,
    category_name: owner.name,
    subcategory: sub.id,
    subcategory_name: sub.name,
    sort: args.sort,
    items: cards.map((c) => cardLine(ctx, c, names)),
    ...pageOf(file.total, args.offset, cards.length),
  };
}

// ── 4. 스타터 키트 ───────────────────────────────────────────────────

export async function getKits(ctx: ToolContext, kitId: string | undefined): Promise<KitList | KitResult> {
  const summary = await summaryOf(ctx);
  const names = namesOf(summary);
  if (kitId === undefined) {
    return {
      kits: summary.kits.map((k) => ({ id: k.id, theme: k.theme, name: line(k.name, 80), desc: line(k.desc, 200), item_count: k.items.length, page_url: `${ctx.site}${kitPath(k.id)}` })),
    };
  }
  const kit = summary.kits.find((k) => k.id === kitId);
  if (!kit) throw new ToolError('unknown_kit', fillText(MCP_ERRORS.unknownKit, { id: kitId }));
  return {
    id: kit.id,
    theme: kit.theme,
    name: line(kit.name, 80),
    desc: line(kit.desc, 300),
    outline: kit.outline.map((o) => line(o, 300)),
    items: kit.items.map((c) => ({
      id: c.id,
      name: line(c.name, 120),
      category: c.cat,
      subcategory: c.sub,
      subcategory_name: names.sub(c.cat, c.sub),
      summary: line(c.summary, LIMITS.summary),
      ...(c.license ? { license: line(c.license, 60) } : {}),
      page_url: pageUrl(ctx, c.id),
    })),
    page_url: `${ctx.site}${kitPath(kit.id)}`,
  };
}

// ── 5. 장바구니 공유 링크 ────────────────────────────────────────────

/** 공유 링크(또는 # 뒤 조각) → s=… 조각. 주소의 호스트는 보지 않는다(어느 코드잇소 주소든 같은 조각) */
export function shareFragmentOf(raw: string): string {
  const t = raw.trim().slice(0, LIMITS.share);
  const at = t.indexOf('#');
  const frag = at >= 0 ? t.slice(at + 1) : t;
  return frag.startsWith('s=') ? frag : '';
}

export interface CartArgs {
  share: string;
  offset: number;
  limit: number;
}

export async function openCart(ctx: ToolContext, args: CartArgs): Promise<CartResult> {
  const entries = readShareEntries(shareFragmentOf(args.share));
  if (entries.length === 0) throw new ToolError('bad_share', fillText(MCP_ERRORS.badShare, { site: ctx.site }));
  if (args.offset > 0 && args.offset >= entries.length) throw new ToolError('offset', fillText(MCP_ERRORS.offsetTooLarge, { offset: String(args.offset), total: String(entries.length) }));
  const page = entries.slice(args.offset, args.offset + args.limit);
  const [summary, recs] = await Promise.all([summaryOf(ctx), recordsOf(ctx, page.map((e) => e.id))]);
  const names = namesOf(summary);
  const items: CartLineOut[] = page.map((e) => {
    const d = recs.get(e.id);
    if (!d) return { id: e.id, name: e.id, missing: true, page_url: pageUrl(ctx, e.id) };
    const out: CartLineOut = {
      id: d.id,
      name: line(d.name, 120),
      category: d.category,
      subcategory: d.kind,
      subcategory_name: names.sub(d.category, d.kind),
      page_url: pageUrl(ctx, d.id),
    };
    if (e.model) out.chosen_model = e.model;
    const official = webUrl(d.url);
    if (official) out.official_url = official;
    const install = installLine(d.use?.install);
    if (install) out.install = line(install, 300);
    const auth = authOf(d);
    if (auth) out.requires = auth === 'oauth' ? 'oauth' : 'api_key';
    if (d.license) out.license = line(d.license, 60);
    return out;
  });
  return { cart_url: shareUrl(entries, ctx.site), items, ...pageOf(entries.length, args.offset, items.length) };
}
