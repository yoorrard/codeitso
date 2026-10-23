// AI 확장 › 플러그인·확장 묶음 (Claude Code 플러그인, Codex 플러그인, Copilot 플러그인, Gemini CLI 확장).
// 우선순위: Anthropic 공식 마켓 → Anthropic 다른 마켓(claude-code, 커뮤니티, knowledge-work) → OpenAI Codex 마켓 → Awesome Copilot 마켓 → Gemini CLI 확장 갤러리
//          → claude-plugins.dev (커뮤니티 마켓 모음, 인기 기준)
// 실행: node scripts/import/ai-plugins.ts
import {
  type Item, type CatalogFile, checkout, cloneRepo, dedupeAcross, dedupeKey, ensureProxy, fetchJson, githubSlug, isMain, isoDate,
  log, makeItem, readRepoFile, slugify, writeCatalog,
} from './ai-lib.ts';

const KIND = 'plugin';

// claude-plugins.dev 플러그인은 5만 개가 넘는다. 내려받기 수나 저장소 별이 이 값 이상인 것만 싣는다.
export const DOWNLOAD_CUT = Number(process.env.AI_PLUGIN_DOWNLOAD_CUT ?? 50);
export const STAR_CUT = Number(process.env.AI_PLUGIN_STAR_CUT ?? 1000);

interface MarketPlugin {
  name: string; displayName?: string; description?: string; category?: string; homepage?: string; version?: string; keywords?: string[];
  author?: { name?: string } | string; license?: string;
  source: string | { source?: string; url?: string; path?: string; repo?: string; ref?: string };
}

// marketplace.json의 source를 사람이 열어 볼 주소로 바꾼다.
export function pluginUrl(repoSlug: string, branch: string, p: MarketPlugin): { url: string; repo?: string; path?: string } {
  const s = p.source;
  if (typeof s === 'string') {
    const path = s.replace(/^\.\//, '').replace(/\/$/, '');
    return { url: path ? `https://github.com/${repoSlug}/tree/${branch}/${path}` : `https://github.com/${repoSlug}`, repo: repoSlug, path };
  }
  if (s.source === 'github' && s.repo) return { url: `https://github.com/${s.repo}`, repo: s.repo };
  if (s.source === 'local' && s.path) {
    const path = s.path.replace(/^\.\//, '');
    return { url: `https://github.com/${repoSlug}/tree/${branch}/${path}`, repo: repoSlug, path };
  }
  const slug = githubSlug(s.url);
  if (slug && s.path) return { url: `https://github.com/${slug}/tree/${s.ref ?? 'HEAD'}/${s.path}`, repo: slug, path: s.path };
  if (slug) return { url: `https://github.com/${slug}`, repo: slug };
  return { url: s.url ?? p.homepage ?? `https://github.com/${repoSlug}` };
}

const authorName = (a: MarketPlugin['author']): string | undefined => (typeof a === 'string' ? a : a?.name);

// ---------- Claude Code 마켓 (marketplace.json) ----------

async function fromClaudeMarket(repoSlug: string, sourceId: string, sourceName: string, tags: string[]): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log(`· ${sourceName} (${repoSlug})`);
  const repo = cloneRepo(repoSlug, ['.claude-plugin/marketplace.json']);
  const market = JSON.parse(readRepoFile(repo, '.claude-plugin/marketplace.json') ?? '{"plugins":[]}') as { name: string; plugins: MarketPlugin[] };
  const keys = new Map<string, string>();
  const items = market.plugins.map((p) => {
    const loc = pluginUrl(repo.slug, repo.branch, p);
    const it = makeItem({
      sourceId, slug: p.name, name: p.displayName ?? p.name, kind: KIND, summary: p.description, url: loc.url,
      source: { name: sourceName, url: `https://github.com/${repoSlug}` },
      license: p.license,
      tags: [...tags, p.category, authorName(p.author), ...(p.keywords ?? []).slice(0, 4)],
      preview: { type: 'skill', agent: 'claude-code', marketplace: market.name, author: authorName(p.author), homepage: p.homepage, version: p.version },
      use: { install: `/plugin marketplace add ${repoSlug}\n/plugin install ${p.name}@${market.name}`, docs: p.homepage },
    });
    const k = dedupeKey(loc.url.includes('github.com') ? loc.url : undefined, loc.path);
    if (k) keys.set(it.id, k);
    return it;
  });
  return { items, available: market.plugins.length, keys };
}

// ---------- OpenAI Codex 마켓 (openai/plugins) ----------

interface CodexPluginJson {
  name: string; description?: string; homepage?: string; license?: string; version?: string; keywords?: string[];
  author?: { name?: string }; interface?: { displayName?: string; shortDescription?: string; category?: string; developerName?: string; websiteURL?: string };
}

export async function fromCodex(): Promise<{ items: Item[]; available: number }> {
  log('· OpenAI Codex 플러그인 (openai/plugins)');
  const repo = cloneRepo('openai/plugins', ['.agents/plugins/marketplace.json']);
  const market = JSON.parse(readRepoFile(repo, '.agents/plugins/marketplace.json') ?? '{"plugins":[]}') as { name: string; plugins: MarketPlugin[] };
  const manifests = repo.files.filter((f) => /^plugins\/[^/]+\/\.codex-plugin\/plugin\.json$/.test(f));
  checkout(repo, manifests);
  const items: Item[] = [];
  for (const p of market.plugins) {
    const loc = pluginUrl(repo.slug, repo.branch, p);
    const raw = loc.path ? readRepoFile(repo, `${loc.path}/.codex-plugin/plugin.json`) : undefined;
    const j = raw ? (JSON.parse(raw) as CodexPluginJson) : undefined;
    items.push(makeItem({
      sourceId: 'plugin-codex', slug: p.name, name: j?.interface?.displayName ?? p.name, kind: KIND,
      summary: j?.description ?? j?.interface?.shortDescription, url: loc.url,
      source: { name: 'OpenAI Codex Plugins', url: 'https://github.com/openai/plugins' },
      license: j?.license,
      tags: ['codex', 'openai', p.category, j?.interface?.category, ...(j?.keywords ?? []).slice(0, 4)],
      preview: { type: 'skill', agent: 'codex', marketplace: market.name, author: j?.interface?.developerName ?? j?.author?.name, homepage: j?.homepage ?? j?.interface?.websiteURL, version: j?.version },
      use: { docs: 'https://developers.openai.com/codex/plugins' },
    }));
  }
  return { items, available: market.plugins.length };
}

// ---------- Awesome Copilot 마켓 ----------

export async function fromCopilot(): Promise<{ items: Item[]; available: number }> {
  log('· Awesome Copilot 플러그인 (github/awesome-copilot)');
  const repo = cloneRepo('github/awesome-copilot', ['.github/plugin/marketplace.json']);
  const market = JSON.parse(readRepoFile(repo, '.github/plugin/marketplace.json') ?? '{"plugins":[]}') as { name: string; plugins: MarketPlugin[] };
  const manifests = market.plugins.map((p) => `${typeof p.source === 'string' ? p.source.replace(/^\.\//, '') : ''}/plugin.json`);
  checkout(repo, manifests);
  const items = market.plugins.map((p) => {
    const loc = pluginUrl(repo.slug, repo.branch, p);
    const raw = loc.path ? readRepoFile(repo, `${loc.path}/plugin.json`) : undefined;
    const j = raw ? (JSON.parse(raw) as { keywords?: string[]; author?: { name?: string } }) : undefined;
    return makeItem({
      sourceId: 'plugin-copilot', slug: p.name, name: p.name, kind: KIND, summary: p.description, url: loc.url,
      source: { name: 'Awesome GitHub Copilot (plugins)', url: 'https://github.com/github/awesome-copilot' },
      license: 'MIT',
      tags: ['copilot', ...(j?.keywords ?? []).slice(0, 6)],
      preview: { type: 'skill', agent: 'github-copilot', marketplace: market.name, author: j?.author?.name, version: p.version },
      use: { install: `copilot plugin install ${p.name}@${market.name}`, docs: `https://awesome-copilot.github.com/plugins` },
    });
  });
  return { items, available: market.plugins.length };
}

// ---------- Gemini CLI 확장 갤러리 ----------

interface GeminiExt {
  id: string; url: string; fullName: string; repoDescription?: string; stars?: number; lastUpdated?: string; extensionName: string;
  extensionVersion?: string; extensionDescription?: string; avatarUrl?: string; hasMCP?: boolean; hasContext?: boolean;
  isGoogleOwned?: boolean; licenseKey?: string; hasHooks?: boolean; hasSkills?: boolean; hasCustomCommands?: boolean;
}

export async function fromGemini(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· Gemini CLI 확장 갤러리 (geminicli.com/extensions.json)');
  const list = await fetchJson<GeminiExt[]>('https://geminicli.com/extensions.json');
  const keys = new Map<string, string>();
  const items = list.map((e) => {
    const it = makeItem({
      sourceId: 'plugin-gemini', slug: e.id.replace(/^@/, ''), name: e.extensionName, kind: KIND,
      summary: e.extensionDescription || e.repoDescription, url: e.url,
      source: { name: 'Gemini CLI Extensions', url: 'https://geminicli.com/extensions/' },
      license: e.licenseKey,
      metrics: { stars: e.stars, updatedAt: isoDate(e.lastUpdated) },
      tags: ['gemini-cli', e.isGoogleOwned ? 'google' : undefined, e.hasMCP ? 'mcp' : undefined, e.hasSkills ? 'skills' : undefined,
        e.hasContext ? 'context' : undefined, e.hasCustomCommands ? 'commands' : undefined, e.hasHooks ? 'hooks' : undefined],
      preview: { type: 'skill', agent: 'gemini-cli', author: e.fullName.split('/')[0], icon: e.avatarUrl, version: e.extensionVersion },
      use: { install: `gemini extensions install ${e.url}` },
    });
    const k = dedupeKey(e.url);
    if (k) keys.set(it.id, `gemini:${k}`);
    return it;
  });
  return { items, available: list.length, keys };
}

// ---------- Dify 마켓 (marketplace.dify.ai) ----------

interface DifyPlugin {
  plugin_id: string; org: string; name: string; category?: string; install_count?: number; latest_version?: string; version_updated_at?: string;
  label?: Record<string, string>; brief?: Record<string, string>; tags?: { name: string }[] | string[]; verification?: { authorized_category?: string } | null;
  badges?: string[]; type?: string;
}

export async function fromDify(): Promise<{ items: Item[]; available: number }> {
  log('· Dify 마켓 (marketplace.dify.ai, 설치 수 순으로 끝까지)');
  const all: DifyPlugin[] = [];
  let page = 1;
  let total = Infinity;
  while (all.length < total) {
    const body = JSON.stringify({ page, page_size: 100, query: '', sort_by: 'install_count', sort_order: 'DESC', category: '', tags: [], type: 'plugin' });
    const d = await fetchJson<{ data: { plugins: DifyPlugin[]; total: number } }>('https://marketplace.dify.ai/api/v1/plugins/search/advanced', { method: 'POST', body });
    total = d.data.total;
    if (!d.data.plugins.length) break;
    all.push(...d.data.plugins);
    page++;
  }
  const items = all.filter((p) => p.brief?.en_US).map((p) => makeItem({
    sourceId: 'plugin-dify', slug: p.plugin_id, name: p.label?.en_US ?? p.name, kind: KIND, summary: p.brief?.en_US,
    url: `https://marketplace.dify.ai/plugin/${p.plugin_id}`,
    source: { name: 'Dify Marketplace', url: 'https://marketplace.dify.ai' },
    metrics: { downloads: p.install_count, updatedAt: isoDate(p.version_updated_at) },
    tags: ['dify', p.category, p.org, ...(p.tags ?? []).map((t) => (typeof t === 'string' ? t : t.name)).slice(0, 5), p.verification?.authorized_category === 'langgenius' ? 'official' : undefined],
    preview: { type: 'skill', agent: 'dify', author: p.org, version: p.latest_version, component: p.category },
  }));
  return { items, available: total === Infinity ? all.length : total };
}

// ---------- claude-plugins.dev ----------

interface CpdPlugin {
  name: string; namespace: string; gitUrl?: string; description?: string; version?: string; author?: string; keywords?: string[];
  category?: string; stars?: number; verified?: boolean; downloads?: number; metadata?: { homepage?: string | null; license?: string | null };
  updatedAt?: string;
}

export async function fromClaudePluginsDev(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· claude-plugins.dev 플러그인 (끝까지)');
  const all: CpdPlugin[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const d = await fetchJson<{ plugins: CpdPlugin[]; total: number }>(`https://claude-plugins.dev/api/plugins?limit=100&offset=${offset}`);
    total = d.total;
    if (!d.plugins.length) break;
    all.push(...d.plugins);
    offset += d.plugins.length;
    if (offset % 5000 < 100) log(`  ${offset}/${total}`);
  }
  const keys = new Map<string, string>();
  const items: Item[] = [];
  for (const p of all) {
    if ((p.downloads ?? 0) < DOWNLOAD_CUT && (p.stars ?? 0) < STAR_CUT) continue;
    if (!p.description) continue;
    const ns = p.namespace.replace(/^@/, '');
    const it = makeItem({
      sourceId: 'plugin-cpd', slug: `${ns}-${p.name}`, name: p.name, kind: KIND, summary: p.description,
      url: p.gitUrl ?? `https://claude-plugins.dev/plugins/${p.namespace}/${p.name}`,
      source: { name: 'Claude Plugins (claude-plugins.dev)', url: 'https://claude-plugins.dev/plugins' },
      license: p.metadata?.license ?? undefined,
      metrics: { stars: p.stars, downloads: p.downloads, updatedAt: isoDate(p.updatedAt) },
      tags: ['claude-code', p.category, p.author, p.verified ? 'verified' : undefined, ...(p.keywords ?? []).slice(0, 4)],
      preview: { type: 'skill', agent: 'claude-code', marketplace: p.namespace, author: p.author, homepage: p.metadata?.homepage ?? undefined, version: p.version },
      use: { docs: `https://claude-plugins.dev/plugins/${p.namespace}/${p.name}` },
    });
    keys.set(it.id, `cc:${(githubSlug(p.gitUrl) ?? ns).toLowerCase()}#${slugify(p.name)}`);
    items.push(it);
  }
  return { items, available: all.length, keys };
}

export async function main(): Promise<void> {
  const off = await fromClaudeMarket('anthropics/claude-plugins-official', 'plugin-claude-official', 'Claude Plugins Official', ['claude-code', 'official-marketplace']);
  const cc = await fromClaudeMarket('anthropics/claude-code', 'plugin-claude-code', 'Claude Code Plugins (Anthropic)', ['claude-code', 'anthropic']);
  const com = await fromClaudeMarket('anthropics/claude-plugins-community', 'plugin-claude-community', 'Claude Plugins Community (Anthropic)', ['claude-code', 'community-marketplace']);
  const kw = await fromClaudeMarket('anthropics/knowledge-work-plugins', 'plugin-knowledge-work', 'Knowledge Work Plugins (Anthropic)', ['claude', 'cowork', 'anthropic']);
  const codex = await fromCodex();
  const cop = await fromCopilot();
  const gem = await fromGemini();
  const dify = await fromDify();
  const cpd = await fromClaudePluginsDev();

  // Claude 마켓끼리는 (저장소 + 플러그인 이름)으로 겹침을 본다.
  const ccKey = (slug: string) => (it: Item) => `cc:${slug}#${it.id.split(':').pop() ?? ''}`;
  const [r1, r2, r2b, r3, r4, r5, r6, r6b, r7] = dedupeAcross([
    { key: ccKey('anthropics/claude-plugins-official'), items: off.items },
    { key: ccKey('anthropics/claude-code'), items: cc.items },
    { key: ccKey('anthropics/claude-plugins-community'), items: com.items },
    { key: ccKey('anthropics/knowledge-work-plugins'), items: kw.items },
    { key: () => undefined, items: codex.items },
    { key: () => undefined, items: cop.items },
    { key: (it) => gem.keys.get(it.id), items: gem.items },
    { key: () => undefined, items: dify.items },
    { key: (it) => cpd.keys.get(it.id), items: cpd.items },
  ], { mergeStars: false });
  const files: Omit<CatalogFile, 'count' | 'fetchedAt'>[] = [
    { source: { id: 'plugin-claude-official', name: 'Claude Plugins Official', url: 'https://github.com/anthropics/claude-plugins-official', kind: KIND, license: 'Apache-2.0 (마켓 목록), 각 플러그인은 원 저장소 라이선스' }, available: off.available, items: r1 ?? [] },
    { source: { id: 'plugin-claude-code', name: 'Claude Code Plugins (Anthropic)', url: 'https://github.com/anthropics/claude-code/tree/main/plugins', kind: KIND, license: '저장소 LICENSE.md (Anthropic 상용 약관) 아래 공개 목록. 이름·설명·주소만 싣는다' }, available: cc.available, items: r2 ?? [] },
    { source: { id: 'plugin-claude-community', name: 'Claude Plugins Community (Anthropic)', url: 'https://github.com/anthropics/claude-plugins-community', kind: KIND, license: 'Apache-2.0 (마켓 목록), 각 플러그인은 원 저장소 라이선스' }, available: com.available, items: r2b ?? [] },
    { source: { id: 'plugin-knowledge-work', name: 'Knowledge Work Plugins (Anthropic)', url: 'https://github.com/anthropics/knowledge-work-plugins', kind: KIND, license: 'Apache-2.0' }, available: kw.available, items: r3 ?? [] },
    { source: { id: 'plugin-codex', name: 'OpenAI Codex Plugins', url: 'https://github.com/openai/plugins', kind: KIND, license: '플러그인마다 plugin.json의 license' }, available: codex.available, items: r4 ?? [] },
    { source: { id: 'plugin-copilot', name: 'Awesome GitHub Copilot (plugins)', url: 'https://github.com/github/awesome-copilot', kind: KIND, license: 'MIT' }, available: cop.available, items: r5 ?? [] },
    { source: { id: 'plugin-gemini', name: 'Gemini CLI Extensions', url: 'https://geminicli.com/extensions/', kind: KIND, license: '공개 갤러리 JSON (geminicli.com/extensions.json). 각 확장은 원 저장소 라이선스' }, available: gem.available, items: r6 ?? [] },
    { source: { id: 'plugin-dify', name: 'Dify Marketplace', url: 'https://marketplace.dify.ai', kind: KIND, license: '공개 마켓 API (marketplace.dify.ai) 메타데이터와 링크만 싣는다', note: 'Dify 앱 플랫폼용 모델·도구·에이전트 전략 플러그인' }, available: dify.available, items: r6b ?? [] },
    { source: { id: 'plugin-cpd', name: 'Claude Plugins (claude-plugins.dev)', url: 'https://claude-plugins.dev/plugins', kind: KIND, license: '공개 API 메타데이터 (각 플러그인은 원 저장소 라이선스)', note: '공개 GitHub 마켓(marketplace.json)을 모은 커뮤니티 등록소' }, available: cpd.available, cut: `내려받기 ${DOWNLOAD_CUT}회 이상 또는 저장소 별 ${STAR_CUT}개 이상`, items: r7 ?? [] },
  ];
  for (const f of files) writeCatalog(f);
  log(`플러그인 합계: ${files.reduce((n, f) => n + f.items.length, 0)}`);
}

if (isMain(import.meta.url)) {
  ensureProxy();
  await main();
}

