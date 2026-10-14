// AI API(모델 회사·호스팅·이미지·음성·검색·비전)와 손으로 고른 국내·세계 개발자 API를 받아 쓴다.
//   node scripts/import/api-curated.ts
// 1) models.dev (MIT, https://models.dev/api.json)의 AI 제공자 전체 → data/catalog/api/models-dev.json
// 2) 손 목록(api-curated-data.ts)                                → official.json
// 공식 쪽마다: 주소가 살아 있는지 보고, 쪽이 스스로 쓴 한 줄(meta description)을 summary에 그대로 쓴다.
// 요금 쪽이 있으면 그 쪽에서 '무료'를 말하는 문장 하나를 그대로 따 온다(preview.freeTierQuote). 지어내지 않는다.
// 공식 SDK 꾸러미는 npm에 있고 저장소가 그 회사 것일 때만 설치 명령으로 싣는다(주간 내려받기 = metrics.downloads).
import { type CuratedApi, type ProviderOverlay, ALL_CURATED, FIRST_PARTY_PREFIXES, PROVIDER_OVERLAY, QUOTE_REJECT } from './api-curated-data.ts';
import {
  type Item, type Kind, type NpmInfo, type SiteMeta, CURATED_AT, cmp, fetchJson, freeSentence, hostOf, main, makeItem, mapLimit,
  npmInfo, readCache, siteMeta, usableDescription, writeCache, writeCatalog,
} from './api-lib.ts';

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

interface MdModel { id: string; name: string; release_date?: string; last_updated?: string; open_weights?: boolean; modalities?: { input?: string[]; output?: string[] } }
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

function providerItem(p: MdProvider, pages: PageCache, infos: Record<string, NpmInfo>, problems: string[]): Item {
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
  const outputs = [...new Set(models.flatMap((m) => m.modalities?.output ?? []))].sort(cmp);
  const kind = providerKind(p.id, o);
  const plan = /(coding|token|step)-plan/.test(p.id);
  return makeItem({
    id: `models-dev:${p.id}`,
    name: p.name,
    kind,
    summary: sourceText ?? derived,
    ...(o?.ko ? { summaryKo: o.ko, written: 'codeshopper' as const } : {}),
    url: alive(mainPage) || !docsUrl ? mainUrl : docsUrl,
    source: { name: 'models.dev', url: 'https://models.dev' },
    ...(npm?.weeklyDownloads !== undefined ? { metrics: { downloads: npm.weeklyDownloads } } : {}),
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
      downloadsOf: npm?.weeklyDownloads !== undefined ? `npm:${npm.name}` : undefined,
      modelCount: models.length,
      openWeightModels: models.filter((m) => m.open_weights).length || undefined,
      models: newestModels(p, 8),
      outputs,
      pricingUrl: o?.pricing && alive(pricing) ? o.pricing : undefined,
      freeTierQuote: quote,
      freeTierCheckedAt: quote ? today : undefined,
      summarySource: sourceText ? 'official page meta description' : 'models.dev data',
    },
    use: {
      install: npm ? `npm install ${npm.name}` : p.npm ? `npm install ${p.npm}` : undefined,
      snippet: p.env?.length ? p.env.map((e) => `${e}=`).join('\n') : undefined,
      docs: docsUrl,
    },
  });
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
    }
    const pages = await readPages(urls, withFree);
    const npmNames = [...ALL_CURATED.map((c) => c.npm), ...Object.values(PROVIDER_OVERLAY).map((o) => o.npm)].filter((n): n is string => Boolean(n));
    const infos = await readNpm(npmNames);

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
    const official = ALL_CURATED.map((c) => curatedItem(c, pages, infos, problems, generic));
    const fromModelsDev = providers.map((p) => providerItem(p, pages, infos, problems));
    for (const id of Object.keys(PROVIDER_OVERLAY)) if (!md[id]) problems.push(`덧씌우기 ${id}: models.dev에 없음`);

    writeCatalog(
      {
        id: 'models-dev',
        name: 'models.dev (AI model providers)',
        url: 'https://models.dev',
        license: 'MIT (models.dev data); each provider has its own terms',
        note: 'Every provider in api.json. summary = the provider page\'s own meta description when readable, otherwise a line built from models.dev data. Korean lines (summaryKo) for the big providers are written by 코드쇼퍼. Prices from models.dev are not copied; freeTierQuote is a sentence copied as-is from the official pricing page.',
      },
      fromModelsDev,
    );
    writeCatalog(
      {
        id: 'openrouter',
        name: 'OpenRouter providers (AI inference companies)',
        url: 'https://openrouter.ai/docs/api-reference/providers/list-providers',
        license: 'Facts (provider names, links) from OpenRouter\'s public providers endpoint; one-line descriptions are each company\'s own homepage meta description',
        note: `OpenRouter lists ${orAll.length} providers; kept the ${orFresh.length} not already in models.dev or the hand-checked list (and not test/placeholder entries). Every one can be called through OpenRouter (preview.viaOpenRouter); many also sell their own API.`,
      },
      orFresh.map(({ p, home }) => openRouterItem(p, home, pages)),
    );
    writeCatalog(
      {
        id: 'official',
        name: '공식 문서에서 확인한 API (코드쇼퍼 손 목록)',
        url: 'https://github.com/yoorrard/code-chauffeur/blob/main/scripts/import/api-curated-data.ts',
        license: 'Facts (names, official URLs) and the official pages\' own one-line descriptions; Korean lines written by 코드쇼퍼',
        note: 'AI APIs not in models.dev, Korean developer and public APIs not in public-apis-4Kr, and popular payment, messaging, login and map APIs. freeTierQuote is copied as-is from the official pricing page on the check date; it is not a promise.',
      },
      official,
    );
    console.log(`  확인할 것 ${problems.length}개`);
    for (const p of problems.sort(cmp)) console.log(`   - ${p}`);
  });
}
