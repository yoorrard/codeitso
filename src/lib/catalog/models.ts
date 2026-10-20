// AI 모델·요금 (D141): 가져오기(scripts/import/api-curated.ts)가 models.dev에서 받아 쓴 모델 자료(data/catalog-models/models-dev.json)의 모양,
// 진열대 빌드가 화면용으로 줄인 줄(ModelRow), 그리고 상세 '모델·요금' 표·담기 창의 모델 고르기·/models 비교·프롬프트가 같이 쓰는 순수 계산.
// 값은 models.dev 그대로다(지어내지 않는다, 없으면 비운다). DOM·Node API·시각·난수를 쓰지 않는다. 정렬은 cmpText.
import { cmpText } from './core.ts';

/** 모델 자료를 낸 진열대 출처 (상품 id 앞머리 `models-dev:<제공자 id>`) */
export const MODEL_ITEM_PREFIX = 'models-dev:';

export type ModelStatus = 'deprecated' | 'beta' | 'alpha';

/** 100만 토큰당 달러 (models.dev cost 칸 이름 그대로) */
export interface ModelCost {
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  input_audio?: number;
  output_audio?: number;
  /** 입력이 20만 토큰을 넘을 때의 값 */
  context_over_200k?: { input?: number; output?: number; cache_read?: number; cache_write?: number };
}

/** 가져온 모델 하나: models.dev api.json의 모델 칸 가운데 쓰는 것만, 칸 이름도 그대로 */
export interface ModelFacts {
  id: string;
  name: string;
  cost?: ModelCost;
  limit: { context?: number; input?: number; output?: number };
  modalities: { input: string[]; output: string[] };
  reasoning: boolean;
  tool_call: boolean;
  attachment: boolean;
  open_weights: boolean;
  /** 지식 기준일 YYYY-MM 또는 YYYY-MM-DD */
  knowledge?: string;
  release_date?: string;
  last_updated?: string;
  status?: ModelStatus;
}

/** data/catalog-models/models-dev.json: 제공자 id → 모델 (models.dev 순서가 아니라 id 순) */
export interface ModelsFile {
  source: { id: string; name: string; url: string; license: string; note: string };
  fetchedAt: string;
  /** 모델이 있는 제공자 수 */
  providers: number;
  /** 모델 수 (모든 제공자) */
  count: number;
  models: Record<string, ModelFacts[]>;
}

/** 화면용 모델 한 줄 (진열대 빌드가 줄인다). 값이 없으면 칸이 없다 */
export interface ModelRow {
  id: string;
  name: string;
  /** 100만 토큰당 달러: 입력·출력·캐시 읽기·캐시 쓰기 */
  in?: number;
  out?: number;
  cr?: number;
  cw?: number;
  /** 입력이 20만 토큰을 넘을 때 */
  big?: { in?: number; out?: number };
  /** 오디오 입력·출력 */
  au?: { in?: number; out?: number };
  /** 컨텍스트 창·최대 출력 (토큰) */
  ctx?: number;
  max?: number;
  /** 입력·출력 종류 (text·image·audio·video·pdf) */
  mi: string[];
  mo: string[];
  reason?: true;
  tools?: true;
  files?: true;
  open?: true;
  knowledge?: string;
  release?: string;
  updated?: string;
  status?: ModelStatus;
}

/** 제공자 하나의 모델 파일 (/catalog/models/p/<제공자 id>.json): 상세 표와 담기 창이 받는다 */
export interface ProviderModels {
  v: 1;
  /** 수집 날짜 YYYY-MM-DD */
  fetched: string;
  provider: string;
  rows: ModelRow[];
}

/** 여러 제공자를 묶은 비교용 줄 (p = 제공자 id) */
export type BundleRow = ModelRow & { p: string };

/** 비교용 묶음 파일 (/catalog/models/direct.json · hosts.json) */
export interface ModelsBundle {
  v: 1;
  fetched: string;
  rows: BundleRow[];
}

/** 비교 쪽의 제공자 이름표 (진열대 요약 site.json에 싣는다) */
export interface ModelProvider {
  /** models.dev 제공자 id */
  id: string;
  /** 진열대 상품 id (models-dev:<id>) */
  item: string;
  name: string;
  /** 상품 소분류 (ai-llm · ai-inference …) */
  sub: string;
  /** 자기 모델을 직접 여는 회사 (소분류 ai-llm). 아니면 호스팅·라우터 */
  direct: boolean;
  /** 모델 수 · 지원이 끝나지 않은 모델 수 */
  n: number;
  live: number;
}

export interface ModelsSummary {
  fetched: string;
  providers: ModelProvider[];
}

/** 비교 쪽 처음 보이는 주요 회사 (자기 모델을 직접 여는 큰 회사, 이 순서로 고르기 목록 맨 위) */
export const MAJOR_PROVIDERS = ['openai', 'anthropic', 'google', 'xai', 'deepseek', 'mistral', 'alibaba', 'moonshotai', 'zai', 'minimax', 'cohere', 'llama', 'perplexity', 'upstage'] as const;

/** 입력 종류 (화면 이름표 순서) */
export const MODALITIES = ['text', 'image', 'audio', 'video', 'pdf'] as const;
export type Modality = (typeof MODALITIES)[number];

/** 비교 정렬 (출시일 · 입력 가격 · 출력 가격 · 컨텍스트) */
export const MODEL_SORTS = ['release', 'in', 'out', 'ctx'] as const;
export type ModelSort = (typeof MODEL_SORTS)[number];
export type SortDir = 'asc' | 'desc';

/** 거르기 고르기 값: 입력 100만 토큰당 최대 가격($), 최소 컨텍스트(토큰) */
export const PRICE_STEPS = [0.5, 1, 3, 10] as const;
export const CONTEXT_STEPS = [32_000, 128_000, 200_000, 1_000_000] as const;

/** 상품 id → models.dev 제공자 id (모델 자료가 있을 수 있는 상품만). 아니면 null */
export function modelProviderOf(itemId: string): string | null {
  if (!itemId.startsWith(MODEL_ITEM_PREFIX)) return null;
  const p = itemId.slice(MODEL_ITEM_PREFIX.length);
  return /^[a-z0-9][a-z0-9.-]{0,79}$/.test(p) ? p : null;
}

const num = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : undefined);

function pair(a: unknown, b: unknown): { in?: number; out?: number } | undefined {
  const i = num(a);
  const o = num(b);
  if (i === undefined && o === undefined) return undefined;
  return { ...(i !== undefined ? { in: i } : {}), ...(o !== undefined ? { out: o } : {}) };
}

/** 가져온 모델 → 화면 줄 (빈 칸은 뺀다) */
export function rowOf(m: ModelFacts): ModelRow {
  const c = m.cost ?? {};
  const r: ModelRow = { id: m.id, name: m.name, mi: [...m.modalities.input], mo: [...m.modalities.output] };
  const set = <K extends keyof ModelRow>(k: K, v: ModelRow[K] | undefined): void => {
    if (v !== undefined) r[k] = v;
  };
  set('in', num(c.input));
  set('out', num(c.output));
  set('cr', num(c.cache_read));
  set('cw', num(c.cache_write));
  set('big', pair(c.context_over_200k?.input, c.context_over_200k?.output));
  set('au', pair(c.input_audio, c.output_audio));
  set('ctx', num(m.limit.context) || undefined);
  set('max', num(m.limit.output) || undefined);
  if (m.reasoning) r.reason = true;
  if (m.tool_call) r.tools = true;
  if (m.attachment) r.files = true;
  if (m.open_weights) r.open = true;
  set('knowledge', m.knowledge);
  set('release', m.release_date);
  set('updated', m.last_updated);
  set('status', m.status);
  return r;
}

/** 새 모델이 앞: 출시일 → 고친 날 → 이름 */
export function cmpNewest(a: ModelRow, b: ModelRow): number {
  return cmpText(b.release ?? '', a.release ?? '') || cmpText(b.updated ?? '', a.updated ?? '') || cmpText(a.name, b.name) || cmpText(a.id, b.id);
}

/** 비교 쪽 묶음에 싣는 줄: 비교 표에 쓰는 칸만 (캐시 쓰기·20만 넘는 값·오디오·지식 기준일·고친 날·첨부는 상세 표에만) */
export function slimRow(r: ModelRow, p: string): BundleRow {
  const { cw: _cw, big: _big, au: _au, knowledge: _k, updated: _u, files: _f, ...keep } = r;
  return { ...keep, p };
}

export function sortNewest<T extends ModelRow>(rows: readonly T[]): T[] {
  return [...rows].sort(cmpNewest);
}

export function isDeprecated(r: Pick<ModelRow, 'status'>): boolean {
  return r.status === 'deprecated';
}

/** 담기 창의 고르기 목록: 지원이 끝나지 않은 모델을 새것부터. 지금 고른 모델이 끝난 모델이면 그것도 넣는다 */
export function pickList(rows: readonly ModelRow[], chosen?: string): ModelRow[] {
  return sortNewest(rows.filter((r) => !isDeprecated(r) || r.id === chosen));
}

/** 달러 값: $3 · $12.5 · $0.075 · $0 (1 이상은 소수 둘째 자리까지, 1 아래는 넷째 자리까지, 끝 0은 뗀다) */
export function usd(n: number): string {
  const digits = n >= 1 ? 2 : 4;
  const s = n.toFixed(digits).replace(/\.?0+$/, '');
  return `$${s === '' ? '0' : s}`;
}

/** 토큰 수: 950 · 33K · 200K · 1M · 1.05M (10진 K·M, 반올림) */
export function tokens(n: number): string {
  if (n >= 1_000_000) return `${(Math.round(n / 10_000) / 100).toString()}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toString()}K`;
  return String(Math.round(n));
}

/** 비교 거르기 (모두 '그리고'). 빈 값은 거르지 않는다 */
export interface ModelFilter {
  /** 보일 제공자 id (비우면 모두) */
  providers?: ReadonlySet<string>;
  /** 이 입력 종류를 모두 받는 모델만 */
  inputs?: readonly string[];
  reason?: boolean;
  tools?: boolean;
  open?: boolean;
  /** 입력 100만 토큰당 이 값 이하 (값이 없는 모델은 뺀다) */
  maxIn?: number;
  /** 컨텍스트 이 값 이상 */
  minCtx?: number;
  /** 지원이 끝난 모델도 */
  deprecated?: boolean;
  /** 이름·id 찾기 */
  q?: string;
}

/** 찾기 열쇠: 소문자, 글자·숫자만 ('GPT-5.1 mini' = 'gpt51mini') */
export function modelKey(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function matchesModel(r: ModelRow, q: string): boolean {
  const words = q.trim().split(/\s+/).map(modelKey).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${modelKey(r.name)} ${modelKey(r.id)}`;
  return words.every((w) => hay.includes(w));
}

export function filterRows<T extends ModelRow & { p?: string }>(rows: readonly T[], f: ModelFilter): T[] {
  return rows.filter((r) => {
    if (f.providers && f.providers.size > 0 && !(r.p !== undefined && f.providers.has(r.p))) return false;
    if (!f.deprecated && isDeprecated(r)) return false;
    if (f.inputs && !f.inputs.every((m) => r.mi.includes(m))) return false;
    if (f.reason && !r.reason) return false;
    if (f.tools && !r.tools) return false;
    if (f.open && !r.open) return false;
    if (f.maxIn !== undefined && (r.in === undefined || r.in > f.maxIn)) return false;
    if (f.minCtx !== undefined && (r.ctx === undefined || r.ctx < f.minCtx)) return false;
    if (f.q && !matchesModel(r, f.q)) return false;
    return true;
  });
}

/** 정렬: 출시일은 새것이 앞(desc)이 기본, 가격·컨텍스트는 고른 방향. 값이 없는 모델은 방향과 상관없이 끝에 */
export function sortRows<T extends ModelRow>(rows: readonly T[], key: ModelSort, dir: SortDir): T[] {
  const val = (r: T): number | string | undefined => (key === 'release' ? r.release : key === 'in' ? r.in : key === 'out' ? r.out : r.ctx);
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    if (x === undefined || y === undefined) {
      if (x === undefined && y === undefined) return cmpNewest(a, b);
      return x === undefined ? 1 : -1;
    }
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : cmpText(String(x), String(y));
    return c !== 0 ? c * sign : cmpNewest(a, b);
  });
}

/** 정렬 기본 방향: 출시일·컨텍스트는 큰 것부터, 가격은 싼 것부터 */
export function defaultDir(key: ModelSort): SortDir {
  return key === 'in' || key === 'out' ? 'asc' : 'desc';
}

// ---------- /models 주소 (?p=&in=&f=&max=&ctx=&old=1&q=&sort=&dir=) ----------

/** 회사 고르기: 주요 회사(기본) · 직접 만든 회사 모두 · 모든 곳 · 한 곳 (제공자 id) */
export type ProviderScope = 'major' | 'direct' | 'all' | { one: string };

export interface ModelQuery {
  scope: ProviderScope;
  inputs: Modality[];
  reason: boolean;
  tools: boolean;
  open: boolean;
  maxIn?: number;
  minCtx?: number;
  deprecated: boolean;
  q: string;
  sort: ModelSort;
  dir: SortDir;
}

export const DEFAULT_QUERY: ModelQuery = { scope: 'major', inputs: [], reason: false, tools: false, open: false, deprecated: false, q: '', sort: 'release', dir: 'desc' };

const FEATURES = ['reason', 'tools', 'open'] as const;

function isModality(x: string): x is Modality {
  return (MODALITIES as readonly string[]).includes(x);
}

/** 주소 검색 글 → 비교 상태. 모르는 값은 기본으로 */
export function readModelQuery(search: string): ModelQuery {
  const p = new URLSearchParams(search);
  const q: ModelQuery = { ...DEFAULT_QUERY, inputs: [] };
  const scope = p.get('p') ?? '';
  if (scope === 'direct' || scope === 'all') q.scope = scope;
  else if (/^[a-z0-9][a-z0-9.-]{0,79}$/.test(scope) && scope !== 'major') q.scope = { one: scope };
  q.inputs = [...new Set((p.get('in') ?? '').split(',').filter(isModality))].filter((m) => m !== 'text');
  const feats = new Set((p.get('f') ?? '').split(','));
  for (const k of FEATURES) q[k] = feats.has(k);
  const max = Number(p.get('max'));
  if ((PRICE_STEPS as readonly number[]).includes(max)) q.maxIn = max;
  const ctx = Number(p.get('ctx'));
  if ((CONTEXT_STEPS as readonly number[]).includes(ctx)) q.minCtx = ctx;
  q.deprecated = p.get('old') === '1';
  q.q = (p.get('q') ?? '').trim().slice(0, 80);
  const sort = p.get('sort') ?? '';
  if ((MODEL_SORTS as readonly string[]).includes(sort)) q.sort = sort as ModelSort;
  const dir = p.get('dir');
  q.dir = dir === 'asc' || dir === 'desc' ? dir : defaultDir(q.sort);
  return q;
}

/** 비교 상태 → 주소 검색 글 (기본값은 싣지 않는다, '?' 없이) */
export function writeModelQuery(q: ModelQuery): string {
  const p = new URLSearchParams();
  if (q.scope !== 'major') p.set('p', typeof q.scope === 'string' ? q.scope : q.scope.one);
  if (q.inputs.length > 0) p.set('in', MODALITIES.filter((m) => q.inputs.includes(m)).join(','));
  const feats = FEATURES.filter((k) => q[k]);
  if (feats.length > 0) p.set('f', feats.join(','));
  if (q.maxIn !== undefined) p.set('max', String(q.maxIn));
  if (q.minCtx !== undefined) p.set('ctx', String(q.minCtx));
  if (q.deprecated) p.set('old', '1');
  if (q.q.trim()) p.set('q', q.q.trim());
  if (q.sort !== 'release') p.set('sort', q.sort);
  if (q.dir !== defaultDir(q.sort)) p.set('dir', q.dir);
  return p.toString().replace(/\+/g, '%20');
}

/** 회사 고르기 → 보일 제공자 id */
export function scopeProviders(scope: ProviderScope, all: readonly ModelProvider[]): Set<string> {
  if (scope === 'all') return new Set(all.map((p) => p.id));
  if (scope === 'direct') return new Set(all.filter((p) => p.direct).map((p) => p.id));
  if (scope === 'major') return new Set(MAJOR_PROVIDERS.filter((id) => all.some((p) => p.id === id)));
  return new Set(all.some((p) => p.id === scope.one) ? [scope.one] : []);
}

/** 그 회사들을 그리려면 호스팅 묶음(hosts.json)도 받아야 하는가 */
export function needsHosts(ids: ReadonlySet<string>, all: readonly ModelProvider[]): boolean {
  return all.some((p) => !p.direct && ids.has(p.id));
}

/** 비교 상태 → 거르기 */
export function filterOf(q: ModelQuery, all: readonly ModelProvider[]): ModelFilter {
  return {
    providers: scopeProviders(q.scope, all),
    inputs: q.inputs,
    reason: q.reason,
    tools: q.tools,
    open: q.open,
    ...(q.maxIn !== undefined ? { maxIn: q.maxIn } : {}),
    ...(q.minCtx !== undefined ? { minCtx: q.minCtx } : {}),
    deprecated: q.deprecated,
    q: q.q,
  };
}
