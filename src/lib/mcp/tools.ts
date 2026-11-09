// AI 에이전트용 MCP 도구의 계산 (D154): 진열대 빌드가 만든 정적 JSON만 읽어 답을 만든다. 상품 사실은 출처 자료 그대로.
// 읽기 전용이고 바깥 사이트에 아무것도 묻지 않는다(장바구니 링크도 # 뒤만 읽는다). 파일 읽기는 Loader가 맡는다:
// Worker는 정적 파일 묶음(env.ASSETS), 시험은 디스크. 한 번 부를 때 읽는 파일 수와 계산을 묶어 무료 Worker의 CPU 10ms 안을 목표로 한다
// (따뜻한 isolate 기준 측정은 D154, 차가운 isolate는 JSON 읽기가 더해진다).
// 시험: tests/lib/mcp-tools.test.ts
import type { ModelRow, ProviderModels } from '../catalog/models.ts';
import { modelProviderOf, pickList } from '../catalog/models.ts';
import type { Card, CategoryId, DetailRecord, Fact, ListChunk, Shard, SortKey } from '../catalog/types.ts';
import { CATEGORY_ORDER, CHUNK_PAGES, PAGE_SIZE, isCategoryId } from '../catalog/types.ts';
import { shardOf } from '../catalog/core.ts';
import { apiInfo, fontInfo, mcpInfo } from '../catalog/preview.ts';
import type { MatchOptions, QueryTerm, SearchMeta, SubDocsFile, TokenShard } from '../catalog/search.ts';
import { blockOf, combineTerms, decodePostings, decodeSubDocs, matchSubs, queryTerms, shardsFor, synonymMap, termMatches, termWeight } from '../catalog/search.ts';
import { FILES, itemDataPath, itemPath, kitPath, listDataPath, modelDataPath, searchBlockPath, searchShardPath, searchSubPath, shareUrl } from '../routes.ts';
import { readShareEntries } from '../share.ts';
import { MODEL_ID_MAX } from '../saved.ts';
import { authOf, installLine } from '../use-lines.ts';
import type { AgentCategory, AgentKits, AgentSummary } from './summary.ts';
import { readAgentKits, readAgentSummary } from './summary.ts';
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

/** 재료 id·모델 id 꼴: 진열대의 모든 id가 이 글자만 쓴다. 밖에서 온 id(도구 인자·공유 링크)는 이 꼴만 받아 숨은 글자가 결과로 되돌아가지 않게 한다 */
export const SAFE_ID = /^[A-Za-z0-9._:/@+~%-]{1,200}$/;

export const LIMITS = {
  query: 200,
  searchPage: 20,
  searchOffset: 200,
  ids: 5,
  browsePage: 30,
  /** AI 모델 찾기 한 쪽 수와 건너뛸 수 상한 */
  modelPage: 20,
  modelOffset: 200,
  /** 장바구니 링크에 넣을 재료 수 (사이트 장바구니는 300줄까지) */
  cartLink: 30,
  /** 장바구니 한 쪽 재료 수 = 한 번에 읽는 상세 조각 수 (조각 평균 200KB: 첫 요청 CPU를 자세히 도구와 같게 묶는다, D156) */
  cartPage: 5,
  /** 질의 낱말 수 (에이전트는 문장을 통째로 넣기도 한다: 읽는 조각과 계산을 묶는다) */
  terms: 6,
  /** 친 꼴만으로 이만큼 넘게 맞은 낱말은 같은 뜻 낱말로 넓히지 않는다 (CPU, 맞는 묶음이 바뀌지 않을 때만, agentQuery) */
  altSkip: 300,
  /** 검색 한 쪽이 읽는 결과 카드 블록 수 (블록 하나 평균 80KB) */
  blocks: 6,
  /** 검색 한 번에 읽는 낱말 조각 수 (질의 낱말 × 꼴·같은 뜻·두 글자 조각). 넘치면 뒤 낱말을 통째로 뺀다 */
  shards: 20,
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
  /** 질의가 길어 쓰지 않은 뒤쪽 낱말 */
  ignored_words?: string[];
  /** 모든 낱말이 든 재료가 없어 빼고 찾은 흔한 낱말 */
  unmatched_words?: string[];
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
  /** MCP 서버 연결 정보 (원격 주소·패키지·전송 방식, 사이트 상세의 '연결 정보'와 같은 자료) */
  connection?: McpConnection;
  /** API 정보 (기본 주소·환경 변수 이름·OpenAPI 명세·무료 한도 원문 등, 사이트 상세의 API 칸과 같은 자료) */
  api?: ApiFacts;
  /** 폰트 정보 (굵기·가변 축·글자 묶음) */
  font?: FontFacts;
  fetched_at?: string;
  page_url: string;
}

export interface McpConnection {
  transports?: string[];
  remote_urls?: string[];
  packages?: string[];
  registry_name?: string;
  requires_key?: true;
}

export interface ApiFacts {
  base_url?: string;
  auth?: string;
  env_vars?: string[];
  key_server_side?: true;
  formats?: string[];
  https?: boolean;
  cors?: 'yes' | 'no' | 'unknown';
  openapi_url?: string;
  sdk?: string;
  /** 출처 가격 쪽의 무료 한도 원문 (제3자 글) */
  free_tier?: { quote: string; checked_at?: string };
  pricing_url?: string;
  provider?: string;
  category?: string;
}

export interface FontFacts {
  weights?: number[];
  variable_axes?: string[];
  italic?: true;
  subsets?: string[];
  korean: boolean;
  designers?: string[];
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
  /** MCP 서버의 첫 원격 주소 */
  mcp_remote_url?: string;
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

async function kitsOf(ctx: ToolContext): Promise<AgentKits> {
  const k = readAgentKits(await ctx.load.json(FILES.agentKits));
  if (!k) throw new ToolError('data', MCP_ERRORS.data);
  return k;
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

/** 쪽 정보. maxOffset이 있으면 그보다 뒤 쪽은 '더 있음'으로 알리지 않는다 (도구 인자가 그 뒤를 받지 않는다) */
export function pageOf(total: number, offset: number, count: number, maxOffset = Number.POSITIVE_INFINITY): Page {
  const next = offset + count;
  const has = next < total && next <= maxOffset;
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
 * 에이전트는 낱말을 끝까지 쳐서 보낸다: 영문 앞부분 맞추기는 꼴보다 3글자 긴 낱말까지만(복수형·-ed·-ing), 한글은 사이트와 같다(합성어).
 * 짧은 영어 낱말(open·app)이 수백 개 낱말로 퍼져 목록 수만 개를 푸는 것(CPU)과 openai 같은 엉뚱한 결과를 막는다.
 */
const AGENT_MATCH: MatchOptions = { slack: 3 };

/** 조각마다 낱말을 글자 순으로 한 번만 늘어놓는다 (조각 객체는 isolate 캐시에 남으므로 다음 요청도 같은 목록을 쓴다) */
const tokenLists = new WeakMap<TokenShard, string[]>();
function sortedTokens(shard: TokenShard): readonly string[] {
  let v = tokenLists.get(shard);
  if (!v) {
    // 기본 정렬 = UTF-16 글자 순 (eachPrefixed의 이분 탐색이 쓰는 `<` 비교와 같은 순서)
    v = Object.keys(shard).sort();
    tokenLists.set(shard, v);
  }
  return v;
}

/**
 * 에이전트용 질의 (사이트 검색은 대분류마다 따로 보이므로 이 순서를 쓰지 않는다). 맞는 재료는 runQuery와 거의 같고(영문 앞부분 맞추기 폭만 좁다) 순서가 다르다:
 * ① 꼭 드는 낱말을 친 꼴 그대로 맞힌 점수를 두 번 더 더한다 → 같은 뜻 낱말(급식 → meal, api → server)로만 맞은 재료가 뒤로 간다.
 * ② 같은 점수면 대분류 안 인기 순위(문서 번호 - 대분류 시작)로 → 대분류가 번갈아 나온다 (번호 그대로면 AI 확장이 늘 먼저다).
 * CPU(무료 Worker 10ms): 낱말마다 '친 꼴'과 '같은 뜻'을 한 번씩만 풀고, 줄 세우기는 점수 통으로 나눠 앞의 need개만 정렬한다.
 * 같은 뜻 낱말은 맞는 묶음이 바뀌지 않을 때만 건너뛴다: 흔한 말(점수만 더한다)이거나, 꼭 드는 낱말이 하나뿐인데 친 꼴로 이미 많이 맞을 때.
 */
export function agentQuery(
  terms: readonly QueryTerm[],
  get: (n: number) => TokenShard | undefined,
  meta: Pick<SearchMeta, 'cats' | 'shards'>,
  keep?: (doc: number) => boolean,
  need = Number.POSITIVE_INFINITY,
): { hits: { doc: number; score: number }[]; loose: boolean; dropped: string[] } {
  const requiredCount = terms.filter((t) => t.optional !== true).length;
  // 이 질의 안에서는 같은 목록을 한 번만 푼다 (login ↔ auth처럼 서로 같은 뜻이면 같은 목록을 두 번 푼다)
  const memo = new Map<string, number[]>();
  const opts: MatchOptions = {
    ...AGENT_MATCH,
    tokens: sortedTokens,
    ...(keep ? { only: keep } : {}),
    decode: (str) => {
      let v = memo.get(str);
      if (!v) {
        v = decodePostings(str);
        memo.set(str, v);
      }
      return v;
    },
  };
  // 소분류 거르기(keep)는 opts.only로 목록을 풀 때 바로 건다
  const match = (t: QueryTerm, o: MatchOptions): { own: Map<number, number>; m: Map<number, number>; optional: boolean } => {
    const own = termMatches({ ...t, alts: [] }, get, meta.shards, o);
    const optional = t.optional === true;
    const skip = t.alts.length === 0 || (own.size >= LIMITS.altSkip && (optional || requiredCount <= 1));
    if (skip) return { own, m: own, optional };
    // 작은 쪽을 큰 쪽에 합친다 (own은 순위 계산에 그대로 남겨 둔다)
    const alt = termMatches({ text: t.text, forms: [], alts: t.alts }, get, meta.shards, o);
    const [m, add] = alt.size >= own.size ? [alt, own] : [new Map(own), alt];
    for (const [d, sc] of add) if ((m.get(d) ?? 0) < sc) m.set(d, sc);
    return { own, m, optional };
  };
  // 꼭 드는 낱말이 둘 이상이면 가장 드물어 보이는 낱말(목록 길이로 어림)을 먼저 찾고, 다른 낱말은 그 재료 안에서만 센다.
  // '그리고' 결과는 좁히지 않을 때와 같다(모든 낱말이 든 재료는 그 낱말의 재료 안에 있다).
  // 아무 재료에도 없는 낱말(오타 같은 것)은 먼저 빼고 알린다: 남은 낱말로 '그리고'를 찾는다
  type Matched = ReturnType<typeof match>;
  const req = terms.flatMap((t, i) => (t.optional === true ? [] : [i]));
  const weight = new Map<number, number>();
  const missing = new Set<number>();
  let rarest = -1;
  let per: Matched[];
  if (req.length >= 2) {
    for (const i of req) weight.set(i, termWeight(terms[i] as QueryTerm, get, meta.shards, opts));
    const byRare = [...req].sort((a, b) => (weight.get(a) ?? 0) - (weight.get(b) ?? 0) || a - b);
    let first: Matched | undefined;
    for (const i of byRare) {
      const r = match(terms[i] as QueryTerm, opts);
      if (r.m.size > 0 || missing.size === req.length - 1) {
        rarest = i;
        first = r;
        break;
      }
      missing.add(i);
    }
    const r = first ?? match(terms[rarest] as QueryTerm, opts);
    const narrow: MatchOptions = { ...opts, only: (d) => r.m.has(d) };
    const none: Matched = { own: new Map(), m: new Map(), optional: false };
    per = terms.map((t, j) => (j === rarest ? r : missing.has(j) ? none : match(t, narrow)));
  } else per = terms.map((t) => match(t, opts));
  // 모든 낱말이 든 재료가 없으면, 꼭 드는 낱말 가운데 가장 흔해 보이는 것부터 하나씩 빼고 다시 '그리고'로 찾는다(넓은 '또는'은 결과 수만 개·CPU).
  // 가장 드문 낱말은 빼지 않으므로 좁힌 목록을 그대로 쓴다. 꼭 드는 낱말이 둘 남을 때까지도 없으면 그때만 사이트처럼 하나라도 든 재료로 넓힌다
  const dropped: string[] = [...missing].sort((a, b) => a - b).map((i) => terms[i]?.text ?? '');
  let active = per.map((p, i) => ({ ...p, i })).filter((p) => !missing.has(p.i));
  let res = combineTerms(active, false, false);
  while (res.hits.length === 0) {
    const left = active.filter((p) => !p.optional);
    if (left.length <= 2) {
      // '또는'은 좁히지 않은 목록이 필요하다
      if (rarest >= 0) {
        active = active.map((p) => (p.i === rarest ? p : { ...match(terms[p.i] as QueryTerm, opts), i: p.i }));
        for (const p of active) per[p.i] = p;
      }
      res = combineTerms(active, false, true);
      break;
    }
    const widest = left.filter((p) => p.i !== rarest).reduce((a, b) => ((weight.get(b.i) ?? 0) > (weight.get(a.i) ?? 0) ? b : a));
    dropped.push(terms[widest.i]?.text ?? '');
    active = active.filter((p) => p !== widest);
    res = combineTerms(active, false, false);
  }
  // 흔한 말(api 같은 optional)은 친 꼴 점수에 넣지 않는다: 'API'가 이름에 있다는 것만으로 앞서지 않게
  const required = per.filter((p) => !p.optional).map((p) => p.own);
  const buckets = new Map<number, number[]>();
  for (const h of res.hits) {
    let k = h.score;
    for (const m of required) k += (m.get(h.doc) ?? 0) * 2;
    const list = buckets.get(k);
    if (list) list.push(h.doc);
    else buckets.set(k, [h.doc]);
  }
  const local = (doc: number): number => {
    const c = meta.cats.find((x) => doc >= x.start && doc < x.start + x.count);
    return c ? doc - c.start : doc;
  };
  const hits: { doc: number; score: number }[] = [];
  for (const k of [...buckets.keys()].sort((x, y) => y - x)) {
    const docs = buckets.get(k) ?? [];
    // 보일 자리(need)에 드는 통만 정렬한다. 뒤쪽 통은 개수만 센다(차례가 화면에 나오지 않는다)
    if (hits.length < need) {
      const keyed = docs.map((d) => ({ d, l: local(d) }));
      keyed.sort((x, y) => x.l - y.l || x.d - y.d);
      for (const x of keyed) hits.push({ doc: x.d, score: k });
    } else for (const d of docs) hits.push({ doc: d, score: k });
  }
  return { hits, loose: res.loose || dropped.length > 0, dropped };
}

/** 같은 뜻 묶음·흔한 말 표는 isolate에서 한 번만 만든다 (meta는 캐시에 남는 같은 객체) */
const wordTables = new WeakMap<object, { syn: Map<string, string[]>; common: Set<string> }>();

/** 질의 낱말: 앞에서부터, 읽을 낱말 조각이 LIMITS.shards를 넘기 전까지만 (넘치는 뒤 낱말은 통째로 빼고 알린다) */
export function agentTerms(query: string, meta: SearchMeta): { terms: QueryTerm[]; ignored: string[] } {
  let t = wordTables.get(meta);
  if (!t) {
    t = { syn: synonymMap(meta.syn), common: new Set(meta.common) };
    wordTables.set(meta, t);
  }
  const all = queryTerms(query, t.syn, t.common);
  const terms: QueryTerm[] = [];
  for (const term of all) {
    if (terms.length >= LIMITS.terms || shardsFor([...terms, term], meta.shards).length > LIMITS.shards) break;
    terms.push(term);
  }
  return { terms, ignored: all.slice(terms.length).map((x) => x.text) };
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
  const { terms, ignored } = agentTerms(query, meta);
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

  const ids = shardsFor(terms, meta.shards);
  const loaded = await Promise.all(ids.map((n) => ctx.load.json(searchShardPath(n))));
  const shards = new Map<number, TokenShard>();
  ids.forEach((n, i) => {
    const s = loaded[i];
    if (isObj(s)) shards.set(n, s as TokenShard);
  });
  const offset = Math.min(args.offset, LIMITS.searchOffset);
  const { hits, loose, dropped } = agentQuery(terms, (n) => shards.get(n), meta, keep, offset + args.limit);

  const total = hits.length;
  if (offset > 0 && offset >= total) throw new ToolError('offset', fillText(MCP_ERRORS.offsetTooLarge, { offset: String(offset), total: String(total) }));

  // 결과 카드 블록: 필요한 블록만 한 번씩, 한 쪽에 LIMITS.blocks개까지 (넘으면 그 앞에서 쪽을 끊고 다음 쪽으로 넘긴다)
  const places: { cat: string; k: number; at: number }[] = [];
  const keys = new Set<string>();
  for (const h of hits.slice(offset, offset + args.limit)) {
    const p = blockOf(h.doc, meta.cats, meta.block);
    if (!p) continue;
    const key = `${p.cat}|${p.k}`;
    if (!keys.has(key) && keys.size >= LIMITS.blocks) break;
    keys.add(key);
    places.push(p);
  }
  const blocks = new Map<string, Card[]>();
  await Promise.all(
    [...keys].map(async (key) => {
      const [c, k] = key.split('|');
      const b = await ctx.load.json(searchBlockPath(c ?? '', Number(k)));
      if (Array.isArray(b)) blocks.set(key, b as Card[]);
    }),
  );
  const items: MaterialLine[] = [];
  for (const p of places) {
    const card = blocks.get(`${p.cat}|${p.k}`)?.[p.at];
    if (card) items.push(cardLine(ctx, card, names));
  }

  const related =
    offset === 0
      ? matchSubs(terms, meta.subs)
          .filter(([c]) => cat === undefined || c === cat)
          .slice(0, 5)
          .map(([c, s, name, count]) => ({ category: c, subcategory: s, name, count }))
      : [];
  const out: SearchResult = { query, loose, related_subcategories: related, items, ...pageOf(total, offset, places.length, LIMITS.searchOffset) };
  if (ignored.length > 0) out.ignored_words = ignored;
  if (dropped.length > 0) out.unmatched_words = dropped;
  if (cat !== undefined || subCat !== undefined) out.category = subCat ?? cat;
  if (args.subcategory !== undefined) out.subcategory = args.subcategory;
  return out;
}

// ── 2. 자세히 ────────────────────────────────────────────────────────

/** 미리 보기 칸 가운데 글·숫자·참거짓인 짧은 사실만 (인증·HTTPS·CORS·전송 방식·형식 같은 것). 그림 주소는 뺀다 */
/** 출처가 준 주소: http·https 꼴이고 숨은 글자가 없을 때만 (있으면 버린다) */
function safeUrl(raw: unknown): string {
  const u = webUrl(raw);
  return u !== '' && line(u, 500) === u ? u : '';
}

const lines = (xs: readonly string[], max: number): string[] => xs.map((x) => line(x, max)).filter((x) => x !== '');

/** 종류별 칸이 따로 옮기는 미리 보기 열쇠 (기타 사실 칸에 두 번 싣지 않는다) */
const TYPED_KEYS: Record<string, ReadonlySet<string>> = {
  mcp: new Set(['transports', 'remotes', 'packages', 'registryName', 'requiresKey']),
  api: new Set(['auth', 'https', 'cors', 'freeTierQuote', 'freeTierCheckedAt', 'pricingUrl', 'keyServerSide', 'apiBase', 'env', 'modelCount', 'models', 'openapi', 'sdk', 'formats', 'provider', 'portalCategory', 'listCategory']),
  font: new Set(['weights', 'axes', 'italic', 'subsets', 'designers']),
};

/** MCP 서버 연결 정보 (사이트 상세와 같은 mcpInfo) */
export function connectionOf(d: DetailRecord): McpConnection | undefined {
  const m = mcpInfo(d);
  if (!m) return undefined;
  const out: McpConnection = {};
  const transports = lines(m.transports, 30);
  if (transports.length > 0) out.transports = transports;
  const remotes = m.remotes.map(safeUrl).filter((u) => u !== '');
  if (remotes.length > 0) out.remote_urls = remotes;
  const packages = lines(m.packages, 140);
  if (packages.length > 0) out.packages = packages;
  if (m.registry) out.registry_name = line(m.registry, 120);
  if (m.requiresKey) out.requires_key = true;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** API 정보 (사이트 상세와 같은 apiInfo) */
export function apiFactsOf(d: DetailRecord): ApiFacts | undefined {
  const a = apiInfo(d);
  if (!a) return undefined;
  const out: ApiFacts = {};
  const base = safeUrl(a.apiBase);
  if (base) out.base_url = base;
  if (a.auth) out.auth = line(a.auth, 60);
  const env = a.env.filter((x) => /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(x));
  if (env.length > 0) out.env_vars = env;
  if (a.keyServerSide) out.key_server_side = true;
  const formats = lines(a.formats, 20);
  if (formats.length > 0) out.formats = formats;
  if (a.https !== undefined) out.https = a.https;
  if (a.cors) out.cors = a.cors;
  const spec = safeUrl(a.openapi);
  if (spec) out.openapi_url = spec;
  if (a.sdk) out.sdk = line(a.sdk, 80);
  if (a.freeQuote) {
    const quote = line(a.freeQuote, 400);
    if (quote) out.free_tier = { quote, ...(a.freeCheckedAt ? { checked_at: line(a.freeCheckedAt, 10) } : {}) };
  }
  const pricing = safeUrl(a.pricingUrl);
  if (pricing) out.pricing_url = pricing;
  if (a.provider) out.provider = line(a.provider, 80);
  if (a.category) out.category = line(a.category, 40);
  return Object.keys(out).length > 0 ? out : undefined;
}

/** 폰트 정보 (사이트 상세와 같은 fontInfo). korean = 한글 글자 묶음이 있는가 */
export function fontFactsOf(d: DetailRecord): FontFacts | undefined {
  const f = fontInfo(d);
  if (!f) return undefined;
  const subsets = lines(f.subsets, 30);
  const out: FontFacts = { korean: subsets.includes('korean') || d.kind === 'fonts-ko' };
  if (f.weights.length > 0) out.weights = [...f.weights].sort((x, y) => x - y);
  const axes = f.axes.map((x) => `${line(x.tag, 8)} ${x.min}–${x.max}`).filter((x) => !x.startsWith(' '));
  if (axes.length > 0) out.variable_axes = axes;
  if (f.italic) out.italic = true;
  if (subsets.length > 0) out.subsets = subsets;
  const designers = lines(f.designers, 60);
  if (designers.length > 0) out.designers = designers;
  return out;
}

function previewFacts(p: DetailRecord['preview']): Record<string, string | number | boolean> | undefined {
  const out: Record<string, string | number | boolean> = {};
  const typed = TYPED_KEYS[p.type];
  let n = 0;
  for (const [k, v] of Object.entries(p)) {
    if (n >= LIMITS.previewFacts || k === 'type' || typed?.has(k)) continue;
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
  const connection = connectionOf(d);
  if (connection) out.connection = connection;
  const api = apiFactsOf(d);
  if (api) out.api = api;
  const font = fontFactsOf(d);
  if (font) out.font = font;
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
  const unique = [...new Set(ids.map((x) => x.trim()).filter((x) => SAFE_ID.test(x)))].slice(0, LIMITS.ids);
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
        kits: summary.kits,
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
  const [summary, file] = await Promise.all([summaryOf(ctx), kitsOf(ctx)]);
  const names = namesOf(summary);
  if (kitId === undefined) {
    return {
      kits: file.kits.map((k) => ({ id: k.id, theme: k.theme, name: line(k.name, 80), desc: line(k.desc, 200), item_count: k.items.length, page_url: `${ctx.site}${kitPath(k.id)}` })),
    };
  }
  const kit = file.kits.find((k) => k.id === kitId);
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
  // 남이 만든 링크일 수 있다: id·모델 id가 진열대 꼴이 아니면 버린다(모델만 틀리면 모델만)
  const entries = readShareEntries(shareFragmentOf(args.share))
    .filter((e) => SAFE_ID.test(e.id))
    .map((e) => (e.model !== undefined && !SAFE_ID.test(e.model) ? { id: e.id } : e));
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
    const remote = connectionOf(d)?.remote_urls?.[0];
    if (remote) out.mcp_remote_url = remote;
    return out;
  });
  return { cart_url: shareUrl(entries, ctx.site), items, ...pageOf(entries.length, args.offset, items.length) };
}

// ── 6. 장바구니 링크 만들기 (D156) ───────────────────────────────────

export interface CartLinkArgs {
  items: { id: string; model?: string }[];
}

export interface CartLinkResult {
  cart_url: string;
  count: number;
  /** 꼴이 맞지 않아 뺀 id */
  skipped: string[];
}

/** 고른 재료(와 AI 모델) → 사이트 장바구니 공유 링크. 파일을 읽지 않는다: 없는 id는 사이트가 '없어진 재료'로 보인다 */
export function makeCartLink(ctx: ToolContext, args: CartLinkArgs): CartLinkResult {
  const seen = new Set<string>();
  const entries: { id: string; model?: string }[] = [];
  const skipped: string[] = [];
  for (const it of args.items) {
    const id = it.id.trim();
    if (!SAFE_ID.test(id)) {
      skipped.push(line(id, 80));
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    const model = it.model?.trim();
    entries.push(model && model.length <= MODEL_ID_MAX && SAFE_ID.test(model) ? { id, model } : { id });
    if (entries.length === LIMITS.cartLink) break;
  }
  if (entries.length === 0) throw new ToolError('bad_ids', MCP_ERRORS.badIds);
  return { cart_url: shareUrl(entries, ctx.site), count: entries.length, skipped };
}
