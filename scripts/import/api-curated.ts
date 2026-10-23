// AI API(모델 회사·호스팅·이미지·음성·검색·비전)와 손으로 고른 국내·세계 개발자 API를 받아 쓴다.
//   node scripts/import/api-curated.ts
// 1) models.dev (MIT, https://models.dev/api.json)의 AI 제공자 전체 → data/catalog/api/models-dev.json
// 2) 손 목록(api-curated-data.ts)                                → official.json
// 공식 쪽마다: 주소가 살아 있는지 보고, 쪽이 스스로 쓴 한 줄(meta description)을 summary에 그대로 쓴다.
// 요금 쪽이 있으면 그 쪽에서 '무료'를 말하는 문장 하나를 그대로 따 온다(preview.freeTierQuote). 지어내지 않는다.
// 공식 SDK 꾸러미는 npm에 있고 저장소가 그 회사 것일 때만 설치 명령으로 싣는다(주간 내려받기 = metrics.downloads).
// 3) models.dev 모델마다의 사실(100만 토큰당 가격·컨텍스트·최대 출력·입력 종류·추론·도구 호출·날짜·지원 끝남) → data/catalog-models/models-dev.json (D141)
//    가격은 자주 바뀌므로 수집 날짜와 함께 싣고, 매일 자료 새로 받기(refresh-all.ts 'api' 줄)가 다시 받는다. 값은 그대로 옮긴다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ModelCost, ModelFacts, ModelStatus, ModelsFile } from '../../src/lib/catalog/models.ts';
import { type CuratedApi, type ProviderOverlay, ALL_CURATED, FIRST_PARTY_PREFIXES, PROVIDER_OVERLAY, QUOTE_REJECT, RATE_LIMIT_DOCS } from './api-curated-data.ts';
import {
  type Item, type Kind, type NpmInfo, type SiteMeta, CURATED_AT, FETCHED_AT, ROOT, cmp, fetchJson, freeSentence, hostOf, main, makeItem, mapLimit,
  npmInfo, readCache, siteMeta, usableDescription, writeCache, writeCatalog,
} from './api-lib.ts';
import { cruxList, npmDownloads, siteRankNote, withSiteRank } from './signals.ts';

const MODELS_DEV = 'https://models.dev/api.json';
const OPENROUTER_PROVIDERS = 'https://openrouter.ai/api/v1/providers';

interface OrProvider {
  name: string;
  slug: string;
  privacy_policy_url?: string | null;
  terms_of_service_url?: string | null;
  status_page_url?: string | null;
  headquarters?: string | null;
  datacenters?: string[] | null;
}

// OpenRouter 제공자 가운데 싣지 않는 것: 시험용·이름 없는 것, 큰 클라우드·회사(다른 파일에 있음).
const OR_SKIP = new Set(['stealth', 'fake-provider', 'google-ai-studio', 'google-vertex', 'amazon-bedrock', 'azure', 'cloudflare', 'amazon-nova', 'claude-on-aws', 'openai', 'anthropic', 'tencent', 'baidu']);
// 자기 모델을 직접 내는 회사·이미지 회사 (나머지는 모델 호스팅).
const OR_KIND: Record<string, Kind> = {
  inflection: 'ai-llm', liquid: 'ai-llm', perceptron: 'ai-llm', relace: 'ai-llm', cosine: 'ai-llm', seed: 'ai-llm', 'nex-agi': 'ai-llm',
  'aion-labs': 'ai-llm', baidu: 'ai-llm', tencent: 'ai-llm', reka: 'ai-llm', sourceful: 'ai-image', quiver: 'ai-image',
};
const domainOf = (u: string) => hostOf(u).split('.').slice(-2).join('.');
const today = new Date().toISOString().slice(0, 10);

interface MdModel {
  id: string;
  name: string;
  release_date?: string;
  last_updated?: string;
  knowledge?: string;
  open_weights?: boolean;
  reasoning?: boolean;
  tool_call?: boolean;
  attachment?: boolean;
  status?: string;
  modalities?: { input?: string[]; output?: string[] };
  limit?: { context?: number; input?: number; output?: number };
  cost?: Record<string, unknown>;
}
interface MdProvider { id: string; name: string; doc?: string; api?: string; npm?: string; env?: string[]; models: Record<string, MdModel> }

// ---------- 공식 쪽 읽기 (같은 날은 캐시) ----------

interface PageInfo { meta: SiteMeta; text?: string }
type PageCache = Record<string, PageInfo>;

async function readPages(urls: string[], withFree: Set<string>): Promise<PageCache> {
  const cacheName = `pages-${today}`;
  const cache = readCache<PageCache>(cacheName) ?? {};
  const todo = [...new Set(urls)].filter((u) => !cache[u]).sort(cmp);
  let done = 0;
  await mapLimit(todo, 8, async (u) => {
    const meta = await siteMeta(u, { withText: withFree.has(u) });
    const text = meta.text;
    delete meta.text;
    cache[u] = { meta, ...(text ? { text: text.slice(0, 200_000) } : {}) };
    done++;
    if (done % 25 === 0 || done === todo.length) console.log(`  공식 쪽 ${done}/${todo.length}`);
  });
  writeCache(cacheName, cache);
  return cache;
}

async function readNpm(names: string[]): Promise<Record<string, NpmInfo>> {
  const cacheName = `npm-${today}`;
  const cache = readCache<Record<string, NpmInfo>>(cacheName) ?? {};
  const todo = [...new Set(names)].filter((n) => !cache[n]).sort(cmp);
  await mapLimit(todo, 6, async (n) => {
    cache[n] = await npmInfo(n);
  });
  writeCache(cacheName, cache);
  return cache;
}

// 살아 있는 쪽인가: 봇을 막는 401·403·429·503도 '있다'로 본다. 404·410·연결 실패만 죽은 쪽.
const alive = (p: PageInfo | undefined) => Boolean(p && p.meta.status !== 0 && p.meta.status !== 404 && p.meta.status !== 410);

function verifiedNpm(npm: string | undefined, repo: string | undefined, infos: Record<string, NpmInfo>, problems: string[], who: string): NpmInfo | undefined {
  if (!npm) return undefined;
  const info = infos[npm];
  if (!info?.exists) {
    problems.push(`${who}: npm ${npm} 없음`);
    return undefined;
  }
  if (info.deprecated) {
    problems.push(`${who}: npm ${npm} 지원 끝남(deprecated)`);
    return undefined;
  }
  const where = `${info.repo ?? ''} ${info.homepage ?? ''}`.toLowerCase();
  if (repo && !where.includes(repo.toLowerCase())) {
    problems.push(`${who}: npm ${npm} 저장소(${info.repo ?? '-'})가 ${repo}가 아님`);
    return undefined;
  }
  return info;
}

function authTag(auth: string): string {
  const a = auth.toLowerCase();
  if (a.includes('oauth') || a.includes('oidc')) return 'auth-oauth';
  if (a.includes('iam') || a.includes('service account')) return 'auth-cloud-iam';
  if (a === 'none') return 'auth-none';
  return 'auth-apikey';
}

// ---------- 손 목록 → 상품 ----------

// 요금 쪽 문장: 오해를 부르는 것으로 손 검토에서 걸러 낸 것은 뺀다.
function freeQuote(key: string, page: PageInfo | undefined): string | undefined {
  if (!page || !alive(page) || QUOTE_REJECT[key]) return undefined;
  return freeSentence(page.text);
}

function curatedItem(c: CuratedApi, pages: PageCache, infos: Record<string, NpmInfo>, problems: string[], generic: Set<string>): Item {
  const main = pages[c.url];
  const docs = pages[c.docs];
  if (!alive(main)) problems.push(`${c.slug}: 소개 쪽 ${c.url} → ${main?.meta.status ?? '?'}`);
  if (!alive(docs)) problems.push(`${c.slug}: 문서 ${c.docs} → ${docs?.meta.status ?? '?'}`);
  const url = alive(main) ? c.url : c.docs;
  const own = (d: string | undefined) => (d && !generic.has(d) ? usableDescription(d) : undefined);
  const sourceText = own(main?.meta.description) ?? own(docs?.meta.description);
  const pricing = c.pricing ? pages[c.pricing] : undefined;
  const quote = freeQuote(c.slug, pricing);
  if (c.pricing && !alive(pricing)) problems.push(`${c.slug}: 요금 쪽 ${c.pricing} → ${pricing?.meta.status ?? '?'}`);
  const npm = verifiedNpm(c.npm, c.npmRepo, infos, problems, c.slug);
  return makeItem({
    id: `official:${c.slug}`,
    name: c.name,
    kind: c.kind,
    summary: sourceText ?? c.ko,
    ...(sourceText ? { summaryKo: c.ko } : {}),
    written: 'codeshopper',
    url,
    source: { name: hostOf(c.docs) || hostOf(c.url), url: c.docs },
    ...(npm?.weeklyDownloads !== undefined ? { metrics: { downloads: npm.weeklyDownloads } } : {}),
    tags: [...(c.tags ?? []), authTag(c.auth), c.serverKey ? 'server-key' : undefined, c.kind.startsWith('ai-') ? 'ai' : undefined].filter(
      (t): t is string => Boolean(t),
    ),
    preview: {
      type: 'api',
      auth: c.auth,
      keyServerSide: c.serverKey ? true : undefined,
      sdk: npm ? npm.name : undefined,
      downloadsOf: npm?.weeklyDownloads !== undefined ? `npm:${npm.name}` : undefined,
      pricingUrl: c.pricing && alive(pricing) ? c.pricing : undefined,
      freeTierQuote: quote,
      freeTierCheckedAt: quote ? today : undefined,
      summarySource: sourceText ? (own(main?.meta.description) ? url : c.docs) : undefined,
    },
    use: { install: npm ? `npm install ${npm.name}` : undefined, docs: c.docs },
    fetchedAt: CURATED_AT,
  });
}

// ---------- models.dev → 상품 ----------

export function isFirstParty(id: string): boolean {
  return FIRST_PARTY_PREFIXES.some((p) => id === p.replace(/-$/, '') || id.startsWith(p.endsWith('-') ? p : `${p}-`));
}

export function providerKind(id: string, overlay: ProviderOverlay | undefined): Kind {
  return overlay?.kind ?? (isFirstParty(id) ? 'ai-llm' : 'ai-inference');
}

function newestModels(p: MdProvider, n: number): string[] {
  return Object.values(p.models)
    .sort((a, b) => cmp(b.last_updated ?? b.release_date ?? '', a.last_updated ?? a.release_date ?? '') || cmp(a.name, b.name))
    .slice(0, n)
    .map((m) => m.name);
}

/**
 * 인기 신호 (D133): 그 회사 전용 AI SDK 꾸러미의 주간 내려받기. 후보는 models.dev가 적어 둔 꾸러미(이름에 제공자 id가 들어 있을 때만,
 * @ai-sdk/openai-compatible처럼 여러 회사가 함께 쓰는 꾸러미는 뺀다)와 Vercel AI SDK의 제공자 꾸러미 이름 꼴 @ai-sdk/<id>.
 * npm에 없는 이름(404)은 값이 없어 저절로 빠진다.
 */
export function aiSdkCandidates(p: Pick<MdProvider, 'id' | 'npm'>): string[] {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (norm(p.id).length < 3) return [];
  const own = p.npm && p.npm !== '@ai-sdk/openai-compatible' && norm(p.npm).includes(norm(p.id)) ? [p.npm] : [];
  return [...new Set([...own, `@ai-sdk/${p.id}`])];
}

function providerItem(p: MdProvider, pages: PageCache, infos: Record<string, NpmInfo>, problems: string[], aiSdk: ReadonlyMap<string, number>): Item {
  const o = PROVIDER_OVERLAY[p.id];
  const docsUrl = o?.docs ?? p.doc;
  const mainUrl = o?.url ?? docsUrl ?? `https://models.dev/?search=${encodeURIComponent(p.id)}`;
  const mainPage = pages[mainUrl];
  const docsPage = docsUrl ? pages[docsUrl] : undefined;
  const sourceText = usableDescription(mainPage?.meta.description) ?? usableDescription(docsPage?.meta.description);
  const models = Object.values(p.models);
  const sample = newestModels(p, 3);
  const derived = `${p.name}: ${models.length} model${models.length === 1 ? '' : 's'} listed on models.dev${sample.length ? ` (newest: ${sample.join(', ')})` : ''}.`;
  const pricing = o?.pricing ? pages[o.pricing] : undefined;
  const quote = freeQuote(p.id, pricing);
  const npm = verifiedNpm(o?.npm, o?.npmRepo, infos, problems, p.id);
  // 공식 SDK와 AI SDK 꾸러미 가운데 주간 내려받기가 많은 쪽을 인기 신호로 쓴다 (어느 꾸러미인지 downloadsOf에 적는다)
  const sdkPkg = aiSdkCandidates(p).find((n) => aiSdk.has(n));
  const sdkWeekly = sdkPkg ? aiSdk.get(sdkPkg) : undefined;
  const officialWeekly = npm?.weeklyDownloads;
  const useSdk = sdkWeekly !== undefined && (officialWeekly === undefined || sdkWeekly > officialWeekly);
  const weekly = useSdk ? sdkWeekly : officialWeekly;
  const downloadsOf = useSdk ? `npm:${sdkPkg}` : officialWeekly !== undefined && npm ? `npm:${npm.name}` : undefined;
  const outputs = [...new Set(models.flatMap((m) => m.modalities?.output ?? []))].sort(cmp);
  const kind = providerKind(p.id, o);
  const plan = /(coding|token|step)-plan/.test(p.id);
  const limitsDoc = RATE_LIMIT_DOCS[p.id];
  const limits = limitsDoc && alive(pages[limitsDoc.url]) ? limitsDoc : undefined;
  if (limitsDoc && !limits) problems.push(`${p.id}: 사용 한도 쪽 ${limitsDoc.url} → ${pages[limitsDoc.url]?.meta.status ?? '?'}`);
  return makeItem({
    id: `models-dev:${p.id}`,
    name: p.name,
    kind,
    summary: sourceText ?? derived,
    ...(o?.ko ? { summaryKo: o.ko, written: 'codeshopper' as const } : {}),
    url: alive(mainPage) || !docsUrl ? mainUrl : docsUrl,
    source: { name: 'models.dev', url: 'https://models.dev' },
    ...(weekly !== undefined ? { metrics: { downloads: weekly } } : {}),
    tags: [
      'ai',
      kind === 'ai-llm' ? 'llm' : 'inference',
      'server-key',
      p.npm === '@ai-sdk/openai-compatible' ? 'openai-compatible' : undefined,
      plan ? 'subscription-plan' : undefined,
      /-cn$|\(china\)/i.test(`${p.id} ${p.name}`) ? 'china' : undefined,
      ...outputs.filter((x) => x !== 'text').map((x) => `output-${x}`),
      ...(o?.tags ?? []),
    ].filter((t): t is string => Boolean(t)),
    preview: {
      type: 'api',
      auth: o?.auth ?? 'apiKey',
      keyServerSide: true,
      apiBase: p.api,
      env: p.env,
      aiSdk: p.npm,
      sdk: npm ? npm.name : undefined,
      downloadsOf,
      modelCount: models.length,
      openWeightModels: models.filter((m) => m.open_weights).length || undefined,
      models: newestModels(p, 8),
      outputs,
      pricingUrl: o?.pricing && alive(pricing) ? o.pricing : undefined,
      freeTierQuote: quote,
      freeTierCheckedAt: quote ? today : undefined,
      limitsUrl: limits?.url,
      limitsCheckedAt: limits?.checked,
      summarySource: sourceText ? 'official page meta description' : 'models.dev data',
    },
    use: {
      install: npm ? `npm install ${npm.name}` : p.npm ? `npm install ${p.npm}` : undefined,
      snippet: p.env?.length ? p.env.map((e) => `${e}=`).join('\n') : undefined,
      docs: docsUrl,
    },
  });
}

// ---------- models.dev 모델마다의 사실 (D141) ----------

export const MODELS_DIR = join(ROOT, 'data', 'catalog-models');

const STATUSES: readonly ModelStatus[] = ['deprecated', 'beta', 'alpha'];
const price = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : undefined);
const count = (x: unknown): number | undefined => (typeof x === 'number' && Number.isInteger(x) && x > 0 ? x : undefined);
const day = (x: unknown): string | undefined => (typeof x === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(x) ? x : undefined);
const words = (x: unknown): string[] => (Array.isArray(x) ? [...new Set(x.filter((v): v is string => typeof v === 'string' && /^[a-z]{2,12}$/.test(v)))] : []);

/** 값이 있는 칸만 남긴다 (JSON에 빈 칸을 쓰지 않으려고) */
function compact<T extends object>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

/** models.dev 모델 하나 → 싣는 사실. 모양이 틀린 값은 버린다 (지어내거나 고치지 않는다) */
export function modelFacts(m: MdModel): ModelFacts | null {
  if (typeof m.id !== 'string' || m.id.trim() === '' || m.id.length > 160 || typeof m.name !== 'string' || m.name.trim() === '') return null;
  const c = m.cost ?? {};
  const over = typeof c['context_over_200k'] === 'object' && c['context_over_200k'] !== null ? (c['context_over_200k'] as Record<string, unknown>) : {};
  const big = compact({ input: price(over['input']), output: price(over['output']), cache_read: price(over['cache_read']), cache_write: price(over['cache_write']) });
  const cost: ModelCost = compact({
    input: price(c['input']),
    output: price(c['output']),
    cache_read: price(c['cache_read']),
    cache_write: price(c['cache_write']),
    input_audio: price(c['input_audio']),
    output_audio: price(c['output_audio']),
    context_over_200k: Object.keys(big).length > 0 ? big : undefined,
  });
  const status = STATUSES.find((s) => s === m.status);
  return compact({
    id: m.id,
    name: m.name.trim(),
    cost: Object.keys(cost).length > 0 ? cost : undefined,
    limit: compact({ context: count(m.limit?.context), input: count(m.limit?.input), output: count(m.limit?.output) }),
    modalities: { input: words(m.modalities?.input), output: words(m.modalities?.output) },
    reasoning: m.reasoning === true,
    tool_call: m.tool_call === true,
    attachment: m.attachment === true,
    open_weights: m.open_weights === true,
    knowledge: day(m.knowledge),
    release_date: day(m.release_date),
    last_updated: day(m.last_updated),
    status,
  });
}

/** 제공자마다 모델을 id 순으로. 모델이 없는 제공자는 뺀다 */
export function modelsByProvider(providers: readonly MdProvider[]): Record<string, ModelFacts[]> {
  const out: Record<string, ModelFacts[]> = {};
  for (const p of [...providers].sort((a, b) => cmp(a.id, b.id))) {
    const list = Object.values(p.models)
      .map(modelFacts)
      .filter((m): m is ModelFacts => m !== null)
      .sort((a, b) => cmp(a.id, b.id));
    if (list.length > 0) out[p.id] = list;
  }
  return out;
}

/** 모델 하나를 한 줄로 쓴다: 날마다 값이 바뀌어도 바뀐 모델 줄만 diff에 보인다 */
export function modelsFileText(file: ModelsFile): string {
  const head = JSON.stringify({ source: file.source, fetchedAt: file.fetchedAt, providers: file.providers, count: file.count }, null, 2).replace(/\n}$/, '');
  const body = Object.entries(file.models)
    .map(([id, list]) => `    ${JSON.stringify(id)}: [\n${list.map((m) => `      ${JSON.stringify(m)}`).join(',\n')}\n    ]`)
    .join(',\n');
  return `${head},\n  "models": {\n${body}\n  }\n}\n`;
}

function writeModels(providers: readonly MdProvider[]): void {
  const models = modelsByProvider(providers);
  const file: ModelsFile = {
    source: {
      id: 'models-dev',
      name: 'models.dev (AI model facts)',
      url: 'https://models.dev',
      license: 'MIT (models.dev data)',
      note: 'Per-model facts copied as-is from https://models.dev/api.json on fetchedAt: cost in USD per 1M tokens (input, output, cache read/write, audio, over-200K-context), context and output limits, input/output modalities, reasoning, tool calling, attachments, open weights, knowledge cutoff, release and update dates, status. Prices change often; the daily refresh collects them again. Actual billing and rate limits follow each provider\'s official pages.',
    },
    fetchedAt: FETCHED_AT,
    providers: Object.keys(models).length,
    count: Object.values(models).reduce((n, l) => n + l.length, 0),
    models,
  };
  mkdirSync(MODELS_DIR, { recursive: true });
  // 모델 사실이 그대로면 받은 날도 그대로 둔다 (날짜만 바뀐 파일을 날마다 올리지 않게, D143). 가격은 사실이라 문턱 없이 바뀌면 바로 쓴다
  const path = join(MODELS_DIR, 'models-dev.json');
  if (existsSync(path)) {
    const prev = JSON.parse(readFileSync(path, 'utf8')) as ModelsFile;
    if (JSON.stringify({ ...prev, fetchedAt: '' }) === JSON.stringify({ ...file, fetchedAt: '' })) file.fetchedAt = prev.fetchedAt;
  }
  writeFileSync(path, modelsFileText(file));
  console.log(`  → data/catalog-models/models-dev.json (제공자 ${file.providers}곳, 모델 ${file.count}개)`);
}

function openRouterHome(p: OrProvider): string | undefined {
  const u = p.privacy_policy_url || p.terms_of_service_url;
  if (!u || !/^https?:\/\//.test(u)) return undefined;
  try {
    return `https://${new URL(u).hostname}`;
  } catch {
    return undefined;
  }
}

function openRouterItem(p: OrProvider, home: string, pages: PageCache): Item {
  const page = pages[home];
  const sourceText = usableDescription(page?.meta.description);
  const kind = OR_KIND[p.slug] ?? 'ai-inference';
  const where = [p.headquarters ? `headquarters: ${p.headquarters}` : '', p.datacenters?.length ? `datacenters: ${p.datacenters.join(', ')}` : ''].filter(Boolean).join('; ');
  return makeItem({
    id: `openrouter:${p.slug}`,
    name: p.name,
    kind,
    summary: sourceText ?? `${p.name}: model provider listed by OpenRouter${where ? ` (${where})` : ''}.`,
    url: home,
    source: { name: 'OpenRouter providers', url: OPENROUTER_PROVIDERS },
    tags: ['ai', kind === 'ai-llm' ? 'llm' : kind === 'ai-image' ? 'image' : 'inference', 'server-key', 'via-openrouter', p.headquarters ? `hq-${p.headquarters}` : undefined].filter(
      (t): t is string => Boolean(t),
    ),
    preview: {
      type: 'api',
      auth: 'apiKey',
      keyServerSide: true,
      headquarters: p.headquarters ?? undefined,
      datacenters: p.datacenters ?? undefined,
      statusPage: p.status_page_url ?? undefined,
      privacyPolicy: p.privacy_policy_url ?? undefined,
      terms: p.terms_of_service_url ?? undefined,
      viaOpenRouter: `https://openrouter.ai/provider/${p.slug}`,
      summarySource: sourceText ? 'official page meta description' : 'OpenRouter data',
    },
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main('api-curated', async () => {
    const md = await fetchJson<Record<string, MdProvider>>(MODELS_DEV);
    const providers = Object.values(md).sort((a, b) => cmp(a.id, b.id));
    const orAll = (await fetchJson<{ data: OrProvider[] }>(OPENROUTER_PROVIDERS)).data.sort((a, b) => cmp(a.slug, b.slug));
    // models.dev·손 목록에 이미 있는 회사는 뺀다 (id·이름·도메인이 같으면 같은 회사).
    const knownIds = new Set(providers.map((p) => p.id));
    const knownNames = new Set([...providers.map((p) => p.name.toLowerCase()), ...ALL_CURATED.map((c) => c.name.toLowerCase())]);
    const knownDomains = new Set(
      [
        ...providers.flatMap((p) => [p.doc, p.api, PROVIDER_OVERLAY[p.id]?.url, PROVIDER_OVERLAY[p.id]?.docs]),
        ...ALL_CURATED.flatMap((c) => [c.url, c.docs]),
      ]
        .filter((u): u is string => Boolean(u))
        .map(domainOf),
    );
    const orFresh = orAll.flatMap((p) => {
      const home = openRouterHome(p);
      if (!home || OR_SKIP.has(p.slug) || knownIds.has(p.slug) || knownNames.has(p.name.toLowerCase()) || knownDomains.has(domainOf(home))) return [];
      return [{ p, home }];
    });
    console.log(`  models.dev 제공자 ${providers.length}곳, 손 목록 ${ALL_CURATED.length}개`);

    const urls: string[] = [];
    const withFree = new Set<string>();
    for (const c of ALL_CURATED) {
      urls.push(c.url, c.docs);
      if (c.pricing) {
        urls.push(c.pricing);
        withFree.add(c.pricing);
      }
    }
    for (const { home } of orFresh) urls.push(home);
    for (const p of providers) {
      const o = PROVIDER_OVERLAY[p.id];
      const docsUrl = o?.docs ?? p.doc;
      if (o?.url) urls.push(o.url);
      if (docsUrl) urls.push(docsUrl);
      if (o?.pricing) {
        urls.push(o.pricing);
        withFree.add(o.pricing);
      }
      const limits = RATE_LIMIT_DOCS[p.id];
      if (limits) urls.push(limits.url);
    }
    const pages = await readPages(urls, withFree);
    const npmNames = [...ALL_CURATED.map((c) => c.npm), ...Object.values(PROVIDER_OVERLAY).map((o) => o.npm)].filter((n): n is string => Boolean(n));
    const infos = await readNpm(npmNames);
    const aiSdk = await npmDownloads(providers.flatMap(aiSdkCandidates), 'last-week');
    const crux = await cruxList();

    const problems: string[] = [];
    const slugs = new Set<string>();
    for (const c of ALL_CURATED) {
      if (slugs.has(c.slug)) throw new Error(`손 목록 슬러그 겹침: ${c.slug}`);
      slugs.add(c.slug);
    }
    // 여러 상품이 같은 소개 문장을 쓰면(클라우드 회사 공통 문구 등) 그 상품의 소개가 아니므로 쓰지 않는다.
    const seenDesc = new Map<string, Set<string>>();
    for (const c of ALL_CURATED) {
      for (const u of new Set([c.url, c.docs])) {
        const d = pages[u]?.meta.description;
        if (d) seenDesc.set(d, (seenDesc.get(d) ?? new Set()).add(c.slug));
      }
    }
    const generic = new Set([...seenDesc].filter(([, who]) => who.size > 1).map(([d]) => d));
    // 인기 신호 (D133): SDK 내려받기가 없는 상품은 사이트의 Chrome 이용 순위 묶음을 붙인다
    const official = ALL_CURATED.map((c) => withSiteRank(curatedItem(c, pages, infos, problems, generic), crux));
    const fromModelsDev = providers.map((p) => withSiteRank(providerItem(p, pages, infos, problems, aiSdk), crux));
    for (const id of Object.keys(PROVIDER_OVERLAY)) if (!md[id]) problems.push(`덧씌우기 ${id}: models.dev에 없음`);
    for (const id of Object.keys(RATE_LIMIT_DOCS)) if (!md[id]) problems.push(`사용 한도 문서 ${id}: models.dev에 없음`);
    writeModels(providers);

    writeCatalog(
      {
        id: 'models-dev',
        name: 'models.dev (AI model providers)',
        url: 'https://models.dev',
        license: 'MIT (models.dev data); each provider has its own terms',
        note: `Every provider in api.json. summary = the provider page\'s own meta description when readable, otherwise a line built from models.dev data. Korean lines (summaryKo) for the big providers are written by 코드잇소. Per-model facts (prices per 1M tokens, limits, modalities, dates) are copied as-is into data/catalog-models/models-dev.json with the collection date (D141); freeTierQuote is a sentence copied as-is from the official pricing page; limitsUrl is the official rate-limit / usage-tier page, hand-checked on limitsCheckedAt and checked alive on every import. metrics.downloads = npm weekly downloads of the official SDK or of the provider\'s own AI SDK package (named by models.dev, or @ai-sdk/<provider id> when that package exists), whichever is larger (preview.downloadsOf). ${siteRankNote()}`,
      },
      fromModelsDev,
    );
    writeCatalog(
      {
        id: 'openrouter',
        name: 'OpenRouter providers (AI inference companies)',
        url: 'https://openrouter.ai/docs/api-reference/providers/list-providers',
        license: 'Facts (provider names, links) from OpenRouter\'s public providers endpoint; one-line descriptions are each company\'s own homepage meta description',
        note: `OpenRouter lists ${orAll.length} providers; kept the ${orFresh.length} not already in models.dev or the hand-checked list (and not test/placeholder entries). Every one can be called through OpenRouter (preview.viaOpenRouter); many also sell their own API. ${siteRankNote()}`,
      },
      orFresh.map(({ p, home }) => withSiteRank(openRouterItem(p, home, pages), crux)),
    );
    writeCatalog(
      {
        id: 'official',
        name: '공식 문서에서 확인한 API (코드잇소 손 목록)',
        url: 'https://github.com/yoorrard/code-chauffeur/blob/main/scripts/import/api-curated-data.ts',
        license: 'Facts (names, official URLs) and the official pages\' own one-line descriptions; Korean lines written by 코드잇소',
        note: `AI APIs not in models.dev, Korean developer and public APIs not in public-apis-4Kr, and popular payment, messaging, login and map APIs. freeTierQuote is copied as-is from the official pricing page on the check date; it is not a promise. metrics.downloads = npm weekly downloads of the official SDK (preview.downloadsOf). ${siteRankNote()}`,
      },
      official,
    );
    console.log(`  확인할 것 ${problems.length}개`);
    for (const p of problems.sort(cmp)) console.log(`   - ${p}`);
  });
}
