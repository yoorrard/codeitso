// MCP 도구 codeitso_find_models (D156): 사이트 /models(D141)와 같은 자료(models.dev, 매일 갱신)와 같은 거르기·정렬 함수로
// AI 모델을 가격·컨텍스트·입력 종류·기능으로 찾는다. 회사 하나를 주면 그 회사 파일(/catalog/models/p/<id>.json)만,
// 아니면 모델을 직접 만든 회사 묶음(direct.json, 약 150KB)만 읽는다. 호스팅·라우터 묶음(hosts.json, 1.7MB)은 읽지 않는다(첫 요청 CPU).
// 순수 계산 (파일은 Loader로 읽는다). 시험: tests/lib/mcp-models.test.ts
import type { BundleRow, Modality, ModelQuery, ModelRow, ModelSort, ModelsBundle, ProviderModels } from '../catalog/models.ts';
import { CONTEXT_STEPS, DEFAULT_QUERY, MAJOR_PROVIDERS, MODEL_ITEM_PREFIX, PRICE_STEPS, defaultDir, filterRows, sortRows, writeModelQuery } from '../catalog/models.ts';
import { modelDataPath, modelsBundlePath, modelsPath } from '../routes.ts';
import { MCP_ERRORS } from '../../copy/mcp.ts';
import { fillText, line } from './text.ts';
import type { Page, ToolContext } from './tools.ts';
import { LIMITS, ToolError, pageOf, summaryOf } from './tools.ts';

/** 도구 인자의 정렬 이름 → 사이트 정렬 열쇠 */
export const MODEL_SORT_ARGS = { newest: 'release', input_price: 'in', output_price: 'out', context: 'ctx' } as const satisfies Record<string, ModelSort>;
export type ModelSortArg = keyof typeof MODEL_SORT_ARGS;
export const MODEL_SORT_NAMES = ['newest', 'input_price', 'output_price', 'context'] as const satisfies readonly ModelSortArg[];

export interface FindModelsArgs {
  query?: string;
  provider?: string;
  /** 회사 하나를 주지 않았을 때: 주요 회사(major) 또는 모델을 직접 만든 회사 모두(direct) */
  scope: 'major' | 'direct';
  inputs: Modality[];
  outputs: Modality[];
  reasoning: boolean;
  toolCalling: boolean;
  openWeights: boolean;
  maxInputPrice?: number;
  maxOutputPrice?: number;
  minContext?: number;
  includeDeprecated: boolean;
  sort: ModelSortArg;
  limit: number;
  offset: number;
}

export interface ModelOut {
  id: string;
  name: string;
  provider: string;
  provider_name: string;
  /** 진열대 재료 id (codeitso_get_materials로 공식 주소·설치를 본다) */
  material_id: string;
  /** 100만 토큰당 달러 (models.dev 값 그대로) */
  input_price?: number;
  output_price?: number;
  cache_read_price?: number;
  cache_write_price?: number;
  context?: number;
  max_output?: number;
  inputs: string[];
  outputs: string[];
  reasoning?: true;
  tool_calling?: true;
  open_weights?: true;
  release?: string;
  knowledge?: string;
  status?: string;
}

export interface ModelsResult extends Page {
  source: 'models.dev';
  fetched: string;
  scope: string;
  sort: ModelSortArg;
  /** 같은 조건의 코드잇소 비교 쪽 (사이트가 받는 거르기만 싣는다) */
  compare_url: string;
  items: ModelOut[];
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function modelOut(r: BundleRow, providerName: string): ModelOut {
  const out: ModelOut = {
    id: line(r.id, 120),
    name: line(r.name, 120),
    provider: r.p,
    provider_name: line(providerName, 80),
    material_id: `${MODEL_ITEM_PREFIX}${r.p}`,
    inputs: r.mi.map((m) => line(m, 20)),
    outputs: r.mo.map((m) => line(m, 20)),
  };
  if (r.in !== undefined) out.input_price = r.in;
  if (r.out !== undefined) out.output_price = r.out;
  if (r.cr !== undefined) out.cache_read_price = r.cr;
  if (r.cw !== undefined) out.cache_write_price = r.cw;
  if (r.ctx !== undefined) out.context = r.ctx;
  if (r.max !== undefined) out.max_output = r.max;
  if (r.reason) out.reasoning = true;
  if (r.tools) out.tool_calling = true;
  if (r.open) out.open_weights = true;
  if (r.release) out.release = line(r.release, 20);
  if (r.knowledge) out.knowledge = line(r.knowledge, 20);
  if (r.status) out.status = r.status;
  return out;
}

/** 같은 조건의 /models 주소. 사이트 주소가 받는 값(가격·컨텍스트 단계, 입력 종류, 기능)만 싣는다 */
export function compareQuery(args: FindModelsArgs): ModelQuery {
  const sort = MODEL_SORT_ARGS[args.sort];
  const q: ModelQuery = {
    ...DEFAULT_QUERY,
    scope: args.provider ? { one: args.provider } : args.scope,
    inputs: args.inputs.filter((m) => m !== 'text'),
    reason: args.reasoning,
    tools: args.toolCalling,
    open: args.openWeights,
    deprecated: args.includeDeprecated,
    q: (args.query ?? '').trim().slice(0, 80),
    sort,
    dir: defaultDir(sort),
  };
  if (args.maxInputPrice !== undefined && (PRICE_STEPS as readonly number[]).includes(args.maxInputPrice)) q.maxIn = args.maxInputPrice;
  if (args.minContext !== undefined && (CONTEXT_STEPS as readonly number[]).includes(args.minContext)) q.minCtx = args.minContext;
  return q;
}

export async function findModels(ctx: ToolContext, args: FindModelsArgs): Promise<ModelsResult> {
  const summary = await summaryOf(ctx);
  const names = new Map(summary.models.providers.map((p) => [p.id, p.name]));
  let rows: BundleRow[];
  let fetched = summary.models.fetched;
  if (args.provider !== undefined) {
    if (!names.has(args.provider)) throw new ToolError('unknown_provider', fillText(MCP_ERRORS.unknownProvider, { id: args.provider, major: MAJOR_PROVIDERS.join(', ') }));
    const file = await ctx.load.json(modelDataPath(args.provider));
    if (!isObj(file) || !Array.isArray(file['rows'])) throw new ToolError('data', MCP_ERRORS.data);
    const pm = file as unknown as ProviderModels;
    fetched = pm.fetched;
    const p = args.provider;
    rows = pm.rows.map((r: ModelRow) => ({ ...r, p }));
  } else {
    const file = await ctx.load.json(modelsBundlePath('direct'));
    if (!isObj(file) || !Array.isArray(file['rows'])) throw new ToolError('data', MCP_ERRORS.data);
    const bundle = file as unknown as ModelsBundle;
    fetched = bundle.fetched;
    const major = new Set<string>(MAJOR_PROVIDERS);
    rows = args.scope === 'major' ? bundle.rows.filter((r) => major.has(r.p)) : bundle.rows;
  }
  const filtered = filterRows(rows, {
    inputs: args.inputs,
    reason: args.reasoning,
    tools: args.toolCalling,
    open: args.openWeights,
    deprecated: args.includeDeprecated,
    q: args.query ?? '',
    ...(args.maxInputPrice !== undefined ? { maxIn: args.maxInputPrice } : {}),
    ...(args.minContext !== undefined ? { minCtx: args.minContext } : {}),
  }).filter((r) => (args.maxOutputPrice === undefined || (r.out !== undefined && r.out <= args.maxOutputPrice)) && args.outputs.every((m) => r.mo.includes(m)));
  const sort = MODEL_SORT_ARGS[args.sort];
  const sorted = sortRows(filtered, sort, defaultDir(sort));
  if (args.offset > 0 && args.offset >= sorted.length) throw new ToolError('offset', fillText(MCP_ERRORS.offsetTooLarge, { offset: String(args.offset), total: String(sorted.length) }));
  const page = sorted.slice(args.offset, args.offset + args.limit);
  return {
    source: 'models.dev',
    fetched,
    scope: args.provider ?? args.scope,
    sort: args.sort,
    compare_url: `${ctx.site}${modelsPath(writeModelQuery(compareQuery(args)))}`,
    items: page.map((r) => modelOut(r, names.get(r.p) ?? r.p)),
    ...pageOf(sorted.length, args.offset, page.length, LIMITS.modelOffset),
  };
}
