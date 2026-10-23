// AI 확장 › MCP 서버. 여러 등록소를 끝까지 받아 저장소 기준으로 중복을 정리한다.
// 우선순위(앞이 이긴다): 공식 참조 서버 → GitHub MCP 등록소 → Docker MCP 카탈로그 → ToolHive → 공식 MCP 등록소
//                      → mcpm.sh → Smithery → 원격 서버 목록 → awesome-mcp-servers(punkpeye) → mcpservers.org(wong2) → Claude Code Templates
// Cline MCP 마켓은 이용 약관이 자동 수집·복제를 막아서 쓰지 않는다.
// 실행: node scripts/import/ai-mcp.ts          모든 출처를 끝까지 (월요일, 약 25분)
//       node scripts/import/ai-mcp.ts --since  공식 등록소에서 바뀐 서버만 받아 mcp-registry.json을 고친다 (다른 날, 약 1분, D143)
import {
  type Item, type Preview, type CatalogFile, CATEGORY, checkout, cloneRepo, dedupeAcross, dedupeKey, ensureProxy, fetchJson,
  FETCHED_AT, githubSlug, isMain, isoDate, log, makeItem, mapLimit, parseYaml, readCatalog, readRepoFile, repoMeta, repoTreeUrl, slugify, str, strList, textKey, writeCatalog, type Yaml,
} from './ai-lib.ts';
import { AITMPL_LICENSE, aitmplItems } from './ai-aitmpl.ts';
import { npmDownloads, pypiWeekly } from './signals.ts';

const KIND = 'mcp';

// ---------- 설정 조각 ----------
// 출처가 준 패키지 이름·실행 방식·환경 변수 이름만 옮긴다 (값은 비워 둔다).

export interface PackageRef {
  registry: string; // npm | pypi | oci | nuget | mcpb …
  name: string;
  version?: string;
  runtimeHint?: string;
  transport?: string;
  env?: string[];
}

export function installFor(p: PackageRef): string | undefined {
  switch (p.registry) {
    case 'npm':
      return `npx -y ${p.name}`;
    case 'pypi':
      return `uvx ${p.name}`;
    case 'oci':
    case 'docker':
      return `docker run -i --rm ${p.name}`;
    case 'nuget':
      return `dnx ${p.name} --yes`;
    default:
      return undefined;
  }
}

export function snippetFor(key: string, p: PackageRef | undefined, remoteUrl?: string, remoteType?: string): string | undefined {
  const short = key.split('/').pop()?.replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase() || 'server';
  let entry: Record<string, unknown> | undefined;
  if (p) {
    const env = p.env?.length ? Object.fromEntries(p.env.map((e) => [e, ''])) : undefined;
    if (p.registry === 'npm') entry = { command: 'npx', args: ['-y', p.name] };
    else if (p.registry === 'pypi') entry = { command: 'uvx', args: [p.name] };
    else if (p.registry === 'oci' || p.registry === 'docker') {
      const envArgs = (p.env ?? []).flatMap((e) => ['-e', e]);
      entry = { command: 'docker', args: ['run', '-i', '--rm', ...envArgs, p.name] };
    } else if (p.registry === 'nuget') entry = { command: 'dnx', args: [p.name, '--yes'] };
    if (entry && env) entry.env = env;
  } else if (remoteUrl) {
    entry = { type: remoteType === 'sse' ? 'sse' : 'http', url: remoteUrl };
  }
  if (!entry) return undefined;
  return JSON.stringify({ mcpServers: { [short]: entry } });
}

function mcpPreview(fields: { transports?: string[]; packages?: PackageRef[]; remotes?: { type: string; url: string }[]; version?: string; tools?: string[]; requiresKey?: boolean; listedIn?: string[] }): Preview {
  return {
    type: 'mcp',
    transports: fields.transports && [...new Set(fields.transports)].sort(),
    packages: fields.packages?.map((p) => ({ registry: p.registry, name: p.name })),
    remotes: fields.remotes,
    version: fields.version,
    tools: fields.tools,
    requiresKey: fields.requiresKey,
  };
}

// ---------- 1. 공식 참조 서버 (modelcontextprotocol/servers) ----------

export async function fromReference(): Promise<{ items: Item[]; available: number }> {
  log('· 공식 참조 서버 (modelcontextprotocol/servers)');
  const repo = cloneRepo('modelcontextprotocol/servers', ['README.md']);
  const readme = readRepoFile(repo, 'README.md') ?? '';
  const section = readme.split(/^## /m).find((s) => s.includes('Reference Servers')) ?? '';
  const current = section.split(/^### /m)[0] ?? '';
  const items: Item[] = [];
  for (const m of current.matchAll(/^- \*\*\[([^\]]+)\]\((src\/[^)]+)\)\*\* - (.+)$/gm)) {
    const [, name, path, desc] = m;
    if (!name || !path || !desc) continue;
    const pkgJson = readRepoFile(repo, `${path}/package.json`);
    const pyproject = readRepoFile(repo, `${path}/pyproject.toml`);
    let pkg: PackageRef | undefined;
    if (pkgJson) {
      const j = JSON.parse(pkgJson) as { name?: string; license?: string };
      if (j.name) pkg = { registry: 'npm', name: j.name, transport: 'stdio' };
    } else if (pyproject) {
      const n = /^name\s*=\s*"([^"]+)"/m.exec(pyproject)?.[1];
      if (n) pkg = { registry: 'pypi', name: n, transport: 'stdio' };
    }
    items.push(makeItem({
      sourceId: 'mcp-reference', slug: path.replace('src/', ''), name, kind: KIND, summary: desc,
      url: repoTreeUrl(repo, path),
      source: { name: 'MCP Reference Servers', url: 'https://github.com/modelcontextprotocol/servers' },
      license: 'MIT',
      tags: ['official', 'reference', 'stdio', pkg?.registry],
      preview: mcpPreview({ transports: ['stdio'], packages: pkg ? [pkg] : undefined }),
      use: { install: pkg && installFor(pkg), snippet: snippetFor(name, pkg), docs: repoTreeUrl(repo, path) },
    }));
  }
  // 인기 신호 (D133): 참조 서버는 한 저장소(모노레포)를 나눠 써서 스타가 같다. 서버마다 꾸러미의 지난 한 주 내려받기를 붙여 구별한다.
  const pkgOf = (it: Item) => (it.preview?.packages as PackageRef[] | undefined)?.[0];
  const npm = await npmDownloads(items.map(pkgOf).filter((p) => p?.registry === 'npm').map((p) => p?.name ?? ''), 'last-week');
  const pypi = await pypiWeekly(items.map(pkgOf).filter((p) => p?.registry === 'pypi').map((p) => p?.name ?? ''));
  for (const it of items) {
    const p = pkgOf(it);
    const weekly = p ? (p.registry === 'npm' ? npm : pypi).get(p.name) : undefined;
    if (p && weekly !== undefined) {
      it.metrics = { ...it.metrics, downloads: weekly };
      it.preview = { ...(it.preview ?? { type: 'mcp' }), downloadsOf: `${p.registry}:${p.name}` };
    }
  }
  return { items, available: items.length };
}

// ---------- 2. 공식 MCP 등록소 ----------

interface RegArg { type?: string; value?: string; name?: string }
interface RegPackage {
  registryType?: string; registry_type?: string; identifier?: string; name?: string; version?: string; runtimeHint?: string;
  transport?: { type?: string }; environmentVariables?: { name: string; isRequired?: boolean; isSecret?: boolean }[];
  runtimeArguments?: RegArg[];
}
interface RegServer {
  server: {
    name: string; title?: string; description?: string; version?: string; websiteUrl?: string;
    repository?: { url?: string; source?: string; subfolder?: string };
    packages?: RegPackage[]; remotes?: { type: string; url: string }[];
  };
  _meta?: Record<string, { status?: string; updatedAt?: string; publishedAt?: string; isLatest?: boolean }>;
}

export function regPackages(pkgs: RegPackage[] | undefined): PackageRef[] {
  return (pkgs ?? []).map((p) => ({
    registry: (p.registryType ?? p.registry_type ?? '').toLowerCase(),
    name: p.identifier ?? p.name ?? '',
    version: p.version,
    runtimeHint: p.runtimeHint,
    transport: p.transport?.type,
    env: (p.environmentVariables ?? []).filter((e) => e.isRequired || e.isSecret).map((e) => e.name),
  })).filter((p) => p.name);
}

const OFFICIAL = { sourceId: 'mcp-registry', name: 'Official MCP Registry', url: 'https://registry.modelcontextprotocol.io' };

// 공식 등록소 server.json 꼴(ToolHive 등록소도 같은 꼴)을 상품으로 바꾼다.
export function officialItem(s: RegServer, from: { sourceId: string; name: string; url: string } = OFFICIAL): Item | undefined {
  const sv = s.server;
  const meta = s._meta?.['io.modelcontextprotocol.registry/official'];
  if (meta?.status && meta.status !== 'active') return undefined;
  const pkgs = regPackages(sv.packages);
  const remotes = (sv.remotes ?? []).filter((r) => r.url && !r.url.includes('{'));
  const repoUrl = sv.repository?.url && /^https?:\/\//.test(sv.repository.url) ? sv.repository.url.replace(/\.git$/, '') : undefined;
  const slug = githubSlug(repoUrl);
  const page = repoUrl && slug && sv.repository?.subfolder
    ? `https://github.com/${slug}/tree/HEAD/${sv.repository.subfolder}`
    : repoUrl ?? sv.websiteUrl ?? `https://registry.modelcontextprotocol.io/v0.1/servers/${encodeURIComponent(sv.name)}/versions/latest`;
  const first = pkgs[0];
  const transports = [...pkgs.map((p) => p.transport ?? 'stdio'), ...remotes.map((r) => r.type)];
  return makeItem({
    sourceId: from.sourceId, slug: sv.name, name: sv.title || sv.name.split('/').pop() || sv.name, kind: KIND,
    summary: sv.description, url: page,
    source: { name: from.name, url: from.url },
    metrics: { updatedAt: isoDate(meta?.updatedAt ?? meta?.publishedAt) },
    tags: [remotes.length ? 'remote' : undefined, pkgs.length ? 'local' : undefined, ...pkgs.map((p) => p.registry), ...transports],
    // 등록소는 4만 개가 넘어서 한 줄을 가볍게 둔다: 원격 서버는 주소만으로 붙일 수 있어 설정 조각을 빼고,
    // 문서 주소가 상품 주소와 같으면 다시 적지 않는다.
    preview: { ...mcpPreview({ transports: pkgs.length ? transports : undefined, packages: pkgs, remotes: remotes.length ? remotes : undefined }), registryName: sv.name },
    use: {
      install: first ? installFor(first) : remotes[0]?.url,
      snippet: first ? snippetFor(sv.name, first) : undefined,
      docs: sv.websiteUrl && sv.websiteUrl !== page ? sv.websiteUrl : undefined,
    },
  });
}

export async function fromOfficialRegistry(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· 공식 MCP 등록소 (registry.modelcontextprotocol.io, version=latest)');
  const items: Item[] = [];
  const keys = new Map<string, string>();
  let cursor: string | undefined;
  let available = 0;
  let pages = 0;
  do {
    const url = `https://registry.modelcontextprotocol.io/v0.1/servers?limit=100&version=latest${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const d = await fetchJson<{ servers: RegServer[]; metadata: { nextCursor?: string } }>(url);
    for (const s of d.servers) {
      available++;
      const it = officialItem(s);
      if (!it) continue;
      items.push(it);
      const k = dedupeKey(s.server.repository?.url, s.server.repository?.subfolder);
      if (k) keys.set(it.id, k);
    }
    cursor = d.metadata.nextCursor;
    if (++pages % 20 === 0) log(`  ${available}개…`);
  } while (cursor);
  return { items, available, keys };
}

const REGISTRY_SOURCE: CatalogFile['source'] = {
  id: 'mcp-registry', name: 'Official MCP Registry', url: 'https://registry.modelcontextprotocol.io', kind: KIND,
  license: '공개 등록소 API (게시자가 올린 server.json 메타데이터, 재배포를 위한 공개 API)', note: 'version=latest, status=active만 싣는다',
};
const REGISTRY_CUT = '활성(active) 최신판만';

// 공식 등록소에서 since(ISO 시각) 뒤에 바뀐 서버 (상태가 바뀐 것 포함). 등록소 API의 updated_since를 쓴다.
export async function officialSince(since: string): Promise<RegServer[]> {
  const out: RegServer[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const url = `https://registry.modelcontextprotocol.io/v0.1/servers?limit=100&version=latest&updated_since=${encodeURIComponent(since)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const d = await fetchJson<{ servers: RegServer[]; metadata: { nextCursor?: string } }>(url);
    out.push(...d.servers);
    cursor = d.metadata.nextCursor;
    if (++pages > 2000) throw new Error('updated_since 쪽이 너무 많다');
  } while (cursor);
  return out;
}

/**
 * 바뀐 것만 받는 날의 '출처 전체 개수'(available) 어림: 새로 실은 수만큼 늘리고, 실은 개수보다 작게 두지 않는다.
 * 정확한 수는 쪽을 끝까지 넘기는 월요일 전체 받기가 다시 센다.
 */
export function sinceAvailable(prevAvailable: number, added: number, count: number): number {
  return Math.max(prevAvailable + added, count);
}

/**
 * 바뀐 것만 받기 (D143, 월요일 밖의 날): 지난 mcp-registry.json의 받은 날 하루 전부터 바뀐 서버만 받아
 * 활성이면 더하거나 고치고, 활성이 아니면(지움·폐기) 뺀다. 새 서버가 앞 출처(참조·GitHub·Docker·ToolHive)와 같은 저장소면 싣지 않는다.
 * 뒤 출처(mcpm·Smithery…)와의 겹침과 출처의 전체 개수(available)는 월요일 전체 받기가 맞춘다.
 */
export async function mainSince(): Promise<void> {
  const prev = readCatalog('mcp-registry');
  if (!prev) {
    log('지난 mcp-registry.json이 없어 전체를 받는다');
    await main();
    return;
  }
  const since = new Date(Date.parse(`${prev.fetchedAt}T00:00:00Z`) - 86_400_000).toISOString();
  log(`· 공식 MCP 등록소: ${since} 뒤에 바뀐 서버만 (지난 파일 ${prev.items.length}개)`);
  const servers = await officialSince(since);
  const keyOf = (it: Item): string[] => [dedupeKey(
    it.url.includes('github.com') ? it.url : (it.preview?.repo as string | undefined) ?? it.url,
    /github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\/(.+)$/.exec(it.url)?.[1],
  ), textKey(it)].filter((k): k is string => !!k);
  const ahead = new Set(['mcp-reference', 'mcp-github', 'mcp-docker', 'mcp-toolhive'].flatMap((id) => (readCatalog(id)?.items ?? []).flatMap(keyOf)));
  const items = new Map(prev.items.map((it) => [it.id, it]));
  let added = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;
  for (const s of servers) {
    const id = `mcp-registry:${slugify(s.server.name)}`;
    const it = officialItem(s);
    if (!it) {
      if (items.delete(id)) removed++;
      continue;
    }
    it.category = CATEGORY;
    if (items.has(id)) {
      items.set(id, it);
      updated++;
      continue;
    }
    const k = dedupeKey(s.server.repository?.url, s.server.repository?.subfolder);
    if ((k && ahead.has(k)) || keyOf(it).some((x) => ahead.has(x))) {
      skipped++;
      continue;
    }
    items.set(id, it);
    added++;
  }
  log(`  바뀐 서버 ${servers.length}개: 새 ${added} · 고침 ${updated} · 뺌 ${removed} · 앞 출처와 겹쳐 건너뜀 ${skipped}`);
  writeCatalog({ source: REGISTRY_SOURCE, available: sinceAvailable(prev.available, added, items.size), cut: prev.cut ?? REGISTRY_CUT, items: [...items.values()] });
  log(`(받은 날 ${FETCHED_AT})`);
}

// ---------- 3. GitHub MCP 등록소 (api.mcp.github.com) ----------

interface GhRegServer {
  server: {
    name: string; description?: string; packages?: { name: string; registry_name?: string; runtime_hint?: string; version?: string }[];
    remotes?: { transport_type?: string; url?: string }[];
    repository?: { url?: string }; updated_at?: string; version_detail?: { version?: string };
  };
  'x-github'?: { display_name?: string; license?: string; stargazer_count?: number; pushed_at?: string; primary_language?: string; topics?: string[] };
}

export async function fromGithubRegistry(): Promise<{ items: Item[]; available: number }> {
  log('· GitHub MCP 등록소 (api.mcp.github.com)');
  const items: Item[] = [];
  let cursor: string | undefined;
  let available = 0;
  do {
    const d = await fetchJson<{ servers: GhRegServer[]; metadata: { next_cursor?: string; total?: number } }>(
      `https://api.mcp.github.com/v0/servers?limit=100${cursor ? `&cursor=${cursor}` : ''}`,
    );
    for (const s of d.servers) {
      available++;
      const sv = s.server;
      const gh = s['x-github'] ?? {};
      const repoUrl = sv.repository?.url;
      const pkgs: PackageRef[] = (sv.packages ?? []).map((p) => ({
        registry: (p.registry_name || (p.runtime_hint === 'npx' ? 'npm' : p.runtime_hint === 'uvx' ? 'pypi' : p.runtime_hint === 'docker' ? 'oci' : '')).toLowerCase(),
        name: p.name, version: p.version, runtimeHint: p.runtime_hint,
      })).filter((p) => p.name && p.registry);
      const remotes = (sv.remotes ?? []).filter((r) => r.url).map((r) => ({ type: r.transport_type ?? 'streamable-http', url: r.url as string }));
      const first = pkgs[0];
      items.push(makeItem({
        sourceId: 'mcp-github', slug: sv.name, name: gh.display_name || sv.name, kind: KIND, summary: sv.description,
        url: repoUrl ?? `https://github.com/mcp/${sv.name}`,
        source: { name: 'GitHub MCP Registry', url: 'https://github.com/mcp' },
        license: gh.license,
        metrics: { stars: gh.stargazer_count, updatedAt: isoDate(gh.pushed_at ?? sv.updated_at) },
        tags: [gh.primary_language, ...(gh.topics ?? []).slice(0, 6), remotes.length ? 'remote' : undefined, pkgs.length ? 'local' : undefined],
        preview: mcpPreview({ transports: [...(pkgs.length ? ['stdio'] : []), ...remotes.map((r) => r.type)], packages: pkgs, remotes: remotes.length ? remotes : undefined, version: sv.version_detail?.version }),
        use: { install: first ? installFor(first) : remotes[0]?.url, snippet: snippetFor(sv.name, first, remotes[0]?.url, remotes[0]?.type) },
      }));
    }
    cursor = d.metadata.next_cursor;
  } while (cursor);
  return { items, available };
}

// ---------- 4. Docker MCP 카탈로그 (docker/mcp-registry) ----------

export function dockerItem(y: Record<string, Yaml>, dir: string): Item | undefined {
  const about = (y.about ?? {}) as Record<string, Yaml>;
  const meta = (y.meta ?? {}) as Record<string, Yaml>;
  const source = (y.source ?? {}) as Record<string, Yaml>;
  const config = (y.config ?? {}) as Record<string, Yaml>;
  const remote = (y.remote ?? {}) as Record<string, Yaml>;
  const name = str(y.name);
  if (!name) return undefined;
  const type = str(y.type) ?? 'server';
  const image = str(y.image);
  const title = str(about.title) ?? name;
  if (/\(archived\)/i.test(title)) return undefined;
  const secrets = Array.isArray(config.secrets) ? (config.secrets as Record<string, Yaml>[]).map((s) => str(s.env)).filter((x): x is string => !!x) : [];
  const project = str(source.project);
  const pkg: PackageRef | undefined = image ? { registry: 'oci', name: image, env: secrets } : undefined;
  const remoteUrl = str(remote.url);
  return makeItem({
    sourceId: 'mcp-docker', slug: name, name: title, kind: KIND, summary: str(about.description),
    url: project ?? `https://hub.docker.com/mcp/server/${name}/overview`,
    source: { name: 'Docker MCP Catalog', url: 'https://github.com/docker/mcp-registry' },
    tags: [str(meta.category), ...strList(meta.tags), type === 'remote' ? 'remote' : 'docker'],
    preview: { ...mcpPreview({ transports: type === 'remote' ? [str(remote.transport_type) ?? 'streamable-http'] : ['stdio'], packages: pkg ? [pkg] : undefined, requiresKey: secrets.length > 0 || undefined }), icon: str(about.icon), catalog: dir },
    use: {
      install: pkg ? installFor(pkg) : remoteUrl,
      snippet: type === 'remote' ? undefined : snippetFor(name, pkg),
      docs: `https://hub.docker.com/mcp/server/${name}/overview`,
    },
  });
}

export async function fromDocker(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· Docker MCP 카탈로그 (docker/mcp-registry)');
  const repo = cloneRepo('docker/mcp-registry');
  const files = repo.files.filter((f) => /^servers\/[^/]+\/server\.yaml$/.test(f));
  checkout(repo, files);
  const items: Item[] = [];
  const keys = new Map<string, string>();
  for (const f of files) {
    const text = readRepoFile(repo, f);
    if (!text) continue;
    const y = parseYaml(text) as Record<string, Yaml>;
    const it = dockerItem(y, f.split('/')[1] ?? '');
    if (!it) continue;
    items.push(it);
    const src = (y.source ?? {}) as Record<string, Yaml>;
    const k = dedupeKey(str(src.project), str(src.directory));
    if (k) keys.set(it.id, k);
  }
  return { items, available: files.length, keys };
}

// ---------- 6. Smithery ----------

interface SmitheryServer {
  qualifiedName: string; displayName?: string; description?: string; iconUrl?: string; verified?: boolean; useCount?: number;
  remote?: boolean; homepage?: string; createdAt?: string; unlisted?: boolean; inactive?: boolean;
}

export async function fromSmithery(): Promise<{ items: Item[]; available: number; exposed: number }> {
  log('· Smithery (registry.smithery.ai)');
  const items: Item[] = [];
  let page = 1;
  let totalPages = 1;
  let available = 0;
  let exposed = 0;
  do {
    const d = await fetchJson<{ servers: SmitheryServer[]; pagination: { totalPages: number; totalCount: number } }>(
      `https://registry.smithery.ai/servers?pageSize=100&page=${page}`,
    );
    totalPages = d.pagination.totalPages;
    available = d.pagination.totalCount;
    for (const s of d.servers) {
      exposed++;
      if (s.unlisted || s.inactive) continue;
      const gh = githubSlug(s.homepage);
      items.push(makeItem({
        sourceId: 'mcp-smithery', slug: s.qualifiedName, name: s.displayName || s.qualifiedName, kind: KIND, summary: s.description,
        url: `https://smithery.ai/servers/${s.qualifiedName}`,
        source: { name: 'Smithery', url: 'https://smithery.ai' },
        // useCount는 Smithery에서 부른 횟수라 내려받기와 단위가 다르다: 미리 보기에만 두고 인기순은 저장소 스타로 본다 (D133)
        tags: [s.remote ? 'remote' : 'local', s.verified ? 'verified' : undefined],
        preview: { ...mcpPreview({ transports: s.remote ? ['streamable-http'] : undefined }), icon: s.iconUrl, repo: gh ? `https://github.com/${gh}` : undefined, useCount: s.useCount },
        use: { docs: s.homepage },
      }));
    }
    page++;
  } while (page <= totalPages);
  return { items, available, exposed };
}

// ---------- 7. awesome-mcp-servers (punkpeye) ----------

const LEGEND: Record<string, string> = {
  '🎖️': 'official', '🐍': 'python', '📇': 'typescript', '🏎️': 'go', '🦀': 'rust', '#️⃣': 'csharp', '☕': 'java', '🌊': 'cpp',
  '💎': 'ruby', '☁️': 'cloud', '🏠': 'local', '📟': 'embedded', '🍎': 'macos', '🪟': 'windows', '🐧': 'linux',
};

export function parseAwesomeMcp(readme: string): { name: string; url: string; desc: string; section: string; tags: string[] }[] {
  const out: { name: string; url: string; desc: string; section: string; tags: string[] }[] = [];
  const start = readme.indexOf('## Server Implementations');
  if (start < 0) return out;
  const endIdx = readme.indexOf('\n## ', start + 5);
  const body = readme.slice(start, endIdx > 0 ? endIdx : undefined);
  let section = '';
  for (const line of body.split('\n')) {
    const h = /^### .*?<\/a>\s*(.+)$/.exec(line);
    if (h?.[1]) {
      section = h[1].trim();
      continue;
    }
    const m = /^\s*- \[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(.*)$/.exec(line);
    if (!m || !m[1] || !m[2]) continue;
    const rest = (m[3] ?? '').replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, ' ');
    const dash = rest.search(/\s[-–—]\s/);
    const marks = dash >= 0 ? rest.slice(0, dash) : rest;
    const desc = dash >= 0 ? rest.slice(dash + 3).trim() : '';
    const tags = Object.entries(LEGEND).filter(([e]) => marks.includes(e)).map(([, t]) => t);
    out.push({ name: m[1].trim(), url: m[2].trim(), desc, section, tags });
  }
  return out;
}

export async function fromAwesome(): Promise<{ items: Item[]; available: number }> {
  log('· awesome-mcp-servers (punkpeye)');
  const repo = cloneRepo('punkpeye/awesome-mcp-servers', ['README.md']);
  const rows = parseAwesomeMcp(readRepoFile(repo, 'README.md') ?? '');
  const items = rows.map((r) => makeItem({
    sourceId: 'mcp-awesome', slug: githubSlug(r.url) ?? r.name, name: r.name.includes('/') ? (r.name.split('/').pop() ?? r.name) : r.name, kind: KIND,
    summary: r.desc, url: r.url,
    source: { name: 'awesome-mcp-servers', url: 'https://github.com/punkpeye/awesome-mcp-servers' },
    tags: [r.section.toLowerCase().replace(/&/g, 'and'), ...r.tags],
    preview: { ...mcpPreview({ transports: r.tags.includes('cloud') ? ['remote'] : r.tags.includes('local') ? ['stdio'] : undefined }), owner: githubSlug(r.url)?.split('/')[0] },
  }));
  return { items, available: rows.length };
}

// ---------- ToolHive 등록소 (stacklok/toolhive-registry, Apache-2.0) ----------

export async function fromToolhive(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· ToolHive 등록소 (stacklok/toolhive-registry)');
  const repo = cloneRepo('stacklok/toolhive-registry', ['pkg/catalog/toolhive/data/registry-upstream.json']);
  const d = JSON.parse(readRepoFile(repo, 'pkg/catalog/toolhive/data/registry-upstream.json') ?? '{"data":{"servers":[]}}') as { data: { servers: RegServer['server'][] } };
  const keys = new Map<string, string>();
  const items: Item[] = [];
  for (const sv of d.data.servers) {
    const it = officialItem({ server: sv }, { sourceId: 'mcp-toolhive', name: 'ToolHive Registry', url: 'https://github.com/stacklok/toolhive-registry' });
    if (!it) continue;
    const pub = Object.values((sv as { _meta?: Record<string, Record<string, Record<string, { metadata?: { stars?: number; last_updated?: string }; tags?: string[]; tier?: string; status?: string }>>> })._meta?.['io.modelcontextprotocol.registry/publisher-provided'] ?? {})
      .flatMap((x) => Object.values(x))[0];
    if (pub?.status && pub.status !== 'Active') continue;
    if (pub?.metadata?.stars !== undefined) it.metrics = { ...it.metrics, stars: pub.metadata.stars };
    const updated = isoDate(pub?.metadata?.last_updated);
    if (updated) it.metrics = { ...it.metrics, updatedAt: updated };
    if (pub?.tags?.length) it.tags = [...new Set([...it.tags, ...pub.tags.map((t) => t.toLowerCase())])].slice(0, 12).sort();
    items.push(it);
    const k = dedupeKey(sv.repository?.url, sv.repository?.subfolder);
    if (k) keys.set(it.id, k);
  }
  return { items, available: d.data.servers.length, keys };
}

// ---------- mcpm.sh 등록소 (pathintegral-institute/mcpm.sh, MIT) ----------

interface McpmServer {
  name: string; display_name?: string; description?: string; repository?: { url?: string }; homepage?: string; license?: string;
  categories?: string[]; tags?: string[]; is_official?: boolean;
  installations?: Record<string, { type?: string; command?: string; args?: string[]; package?: string; env?: Record<string, string> }>;
}

export async function fromMcpm(): Promise<{ items: Item[]; available: number }> {
  log('· mcpm.sh 등록소 (pathintegral-institute/mcpm.sh)');
  const repo = cloneRepo('pathintegral-institute/mcpm.sh');
  const files = repo.files.filter((f) => /^mcp-registry\/servers\/[^/]+\.json$/.test(f));
  checkout(repo, files);
  const items: Item[] = [];
  for (const f of files) {
    const raw = readRepoFile(repo, f);
    if (!raw) continue;
    const j = JSON.parse(raw) as McpmServer;
    if (!j.description) continue;
    const inst = Object.values(j.installations ?? {})[0];
    const pkg: PackageRef | undefined = inst?.type === 'npm' && inst.package ? { registry: 'npm', name: inst.package }
      : inst?.type === 'uvx' && inst.package ? { registry: 'pypi', name: inst.package }
      : inst?.type === 'docker' && inst.package ? { registry: 'oci', name: inst.package } : undefined;
    items.push(makeItem({
      sourceId: 'mcp-mcpm', slug: j.name, name: j.display_name ?? j.name, kind: KIND, summary: j.description,
      url: j.repository?.url ?? j.homepage ?? `https://mcpm.sh/registry/${j.name}`,
      source: { name: 'MCPM registry', url: 'https://mcpm.sh/registry/' },
      license: j.license,
      tags: [...(j.categories ?? []), ...(j.tags ?? []).slice(0, 6), j.is_official ? 'official' : undefined],
      preview: mcpPreview({ transports: ['stdio'], packages: pkg ? [pkg] : undefined }),
      use: { install: `mcpm install ${j.name}`, docs: `https://mcpm.sh/registry/${j.name}` },
    }));
  }
  return { items, available: files.length };
}

// ---------- 원격 MCP 서버 목록 (jaw9c/awesome-remote-mcp-servers, MIT) ----------

export function parseRemoteTable(readme: string): { name: string; category: string; url: string; auth: string; maintainer: string; maintainerUrl?: string }[] {
  const out: { name: string; category: string; url: string; auth: string; maintainer: string; maintainerUrl?: string }[] = [];
  const start = readme.indexOf('## Remote MCP Server List');
  for (const line of readme.slice(start < 0 ? 0 : start).split('\n')) {
    if (!line.startsWith('|') || /^\|\s*-/.test(line) || /^\|\s*Name\s*\|/i.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 5) continue;
    const url = /`([^`]+)`/.exec(cells[2] ?? '')?.[1] ?? (cells[2] ?? '').replace(/[<>]/g, '');
    if (!/^https:\/\//.test(url)) continue;
    const m = /\[([^\]]+)\]\(([^)]+)\)/.exec(cells[4] ?? '');
    out.push({ name: (cells[0] ?? '').replace(/\[([^\]]+)\]\([^)]*\)/, '$1'), category: cells[1] ?? '', url, auth: cells[3] ?? '', maintainer: m?.[1] ?? cells[4] ?? '', maintainerUrl: m?.[2] });
  }
  return out;
}

export async function fromRemoteList(): Promise<{ items: Item[]; available: number }> {
  log('· 원격 MCP 서버 목록 (jaw9c/awesome-remote-mcp-servers)');
  const repo = cloneRepo('jaw9c/awesome-remote-mcp-servers', ['README.md']);
  const rows = parseRemoteTable(readRepoFile(repo, 'README.md') ?? '');
  const items = rows.map((r) => {
    const type = /\/sse\/?$/.test(r.url) ? 'sse' : 'streamable-http';
    return makeItem({
      sourceId: 'mcp-remote', slug: `${r.name}-${r.url}`, name: r.name, kind: KIND,
      // 표에는 설명 칸이 없어서 표의 칸(분류·인증·관리 주체)을 그대로 옮겨 적는다.
      summary: `Remote MCP server (${r.category}). Authentication: ${r.auth}. Maintainer: ${r.maintainer}.`,
      url: r.maintainerUrl && /^https:\/\//.test(r.maintainerUrl) ? r.maintainerUrl : r.url,
      source: { name: 'Awesome Remote MCP Servers', url: 'https://github.com/jaw9c/awesome-remote-mcp-servers' },
      tags: ['remote', r.category, r.auth],
      preview: { ...mcpPreview({ transports: [type], remotes: [{ type, url: r.url }] }), auth: r.auth, maintainer: r.maintainer },
      use: { install: r.url, snippet: snippetFor(r.name, undefined, r.url, type) },
    });
  });
  return { items, available: rows.length };
}

// ---------- mcpservers.org 목록 (wong2/awesome-mcp-servers, MIT) ----------

export function parseWong2(readme: string): { name: string; url: string; desc: string; section: string }[] {
  const out: { name: string; url: string; desc: string; section: string }[] = [];
  let section = '';
  for (const line of readme.split('\n')) {
    const h = /^## (.+)$/.exec(line);
    if (h?.[1]) {
      section = h[1].trim();
      continue;
    }
    if (!/Servers$/.test(section)) continue;
    const m = /^- \*\*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\*\*\s*-\s*(.+)$/.exec(line);
    if (m?.[1] && m[2] && m[3]) out.push({ name: m[1].trim(), url: m[2], desc: m[3].trim(), section });
  }
  return out;
}

export async function fromWong2(): Promise<{ items: Item[]; available: number }> {
  log('· mcpservers.org (wong2/awesome-mcp-servers)');
  const repo = cloneRepo('wong2/awesome-mcp-servers', ['README.md']);
  const rows = parseWong2(readRepoFile(repo, 'README.md') ?? '');
  const items = rows.map((r) => makeItem({
    sourceId: 'mcp-wong2', slug: githubSlug(r.url) ?? r.name, name: r.name, kind: KIND, summary: r.desc, url: r.url,
    source: { name: 'mcpservers.org (awesome-mcp-servers)', url: 'https://github.com/wong2/awesome-mcp-servers' },
    tags: [r.section.replace(/ Servers$/, '').toLowerCase()],
    preview: mcpPreview({}),
  }));
  return { items, available: rows.length };
}

// ---------- 인기 신호: 저장소 스타 (D133) ----------
// 등록소마다 인기 지표가 다르거나 없어서(사용 횟수·설치 수·없음) 인기순이 틀렸다. GitHub 저장소가 있는 상품은 그 저장소의 스타와
// 마지막 푸시 날짜를 받아 붙인다(gh → GITHUB_TOKEN → repos.ecosyste.ms). 4만 개가 넘는 공식 등록소는 요청이 너무 많아 붙이지 않는다.
export async function withRepoStars(items: Item[]): Promise<number> {
  const slugOf = (it: Item): string | undefined =>
    githubSlug(typeof it.preview?.repo === 'string' ? it.preview.repo : undefined) ?? githubSlug(it.url) ?? githubSlug(it.use?.docs);
  const need = items.filter((it) => it.metrics?.stars === undefined && slugOf(it));
  const slugs = [...new Set(need.map((it) => (slugOf(it) as string).toLowerCase()))].sort();
  const metas = new Map<string, Awaited<ReturnType<typeof repoMeta>>>();
  let done = 0;
  await mapLimit(slugs, 6, async (slug) => {
    metas.set(slug, await repoMeta(slug));
    if (++done % 250 === 0) log(`  저장소 스타 ${done}/${slugs.length}`);
  });
  let n = 0;
  for (const it of need) {
    const meta = metas.get((slugOf(it) as string).toLowerCase());
    if (!meta) continue;
    it.metrics = { ...it.metrics, stars: meta.stars, ...(it.metrics?.updatedAt || !meta.pushedAt ? {} : { updatedAt: meta.pushedAt }) };
    n++;
  }
  return n;
}

// ---------- 모으기 ----------

export async function main(): Promise<void> {
  const ref = await fromReference();
  const off = await fromOfficialRegistry();
  const ghr = await fromGithubRegistry();
  const dock = await fromDocker();
  const tool = await fromToolhive();
  const mcpm = await fromMcpm();
  const smith = await fromSmithery();
  const remote = await fromRemoteList();
  const awe = await fromAwesome();
  const wong = await fromWong2();

  const tmpl = await aitmplItems('mcps', KIND, 'mcp-aitmpl', 'mcp');
  const keyOf = (keys?: Map<string, string>) => (it: Item): (string | undefined)[] => [keys?.get(it.id) ?? dedupeKey(
    it.url.includes('github.com') ? it.url : (it.preview?.repo as string | undefined) ?? it.url,
    // github.com/a/b/tree/<branch>/<path> 꼴이면 하위 경로까지 본다
    /github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\/(.+)$/.exec(it.url)?.[1],
  ), textKey(it)];
  // 원격 목록은 저장소 대신 원격 주소로 겹침을 본다.
  const remoteKey = (it: Item): string | undefined => {
    const r = (it.preview?.remotes as { url: string }[] | undefined)?.[0]?.url;
    return r ? `remote:${r.toLowerCase().replace(/\/+$/, '')}` : undefined;
  };
  // 고른 목록(별·라이선스가 있는 GitHub 등록소, Docker, ToolHive)이 먼저, 4만 개가 넘는 공식 등록소는 그 뒤.
  const [r1, r3, r4, r5, r2, r7, r8, r9, r10, r11, r12] = dedupeAcross([
    { key: keyOf(), items: ref.items },
    { key: keyOf(), items: ghr.items, self: false },
    { key: keyOf(dock.keys), items: dock.items, self: false },
    { key: keyOf(tool.keys), items: tool.items, self: false },
    { key: keyOf(off.keys), items: off.items, self: false },
    { key: keyOf(), items: mcpm.items, self: false },
    { key: keyOf(), items: smith.items, self: false },
    { key: remoteKey, items: remote.items },
    { key: keyOf(), items: awe.items },
    { key: keyOf(), items: wong.items },
    { key: (it) => textKey(it), items: tmpl.items },
  ]);
  // 원격 주소가 이미 앞 출처(공식 등록소 등)에 있으면 원격 목록에서 뺀다.
  const knownRemotes = new Set([...(r2 ?? []), ...(r3 ?? []), ...(r5 ?? [])].map(remoteKey).filter(Boolean));
  const r9b = (r9 ?? []).filter((it) => !knownRemotes.has(remoteKey(it)));

  const files: Omit<CatalogFile, 'count' | 'fetchedAt'>[] = [
    { source: { id: 'mcp-reference', name: 'MCP Reference Servers', url: 'https://github.com/modelcontextprotocol/servers', kind: KIND, license: 'MIT (저장소 README·패키지 정보)', note: 'metrics.stars = 저장소(모노레포) 스타, metrics.downloads = 서버 꾸러미의 지난 한 주 내려받기(npm 또는 pypistats.org, preview.downloadsOf)' }, available: ref.available, items: r1 ?? [] },
    { source: REGISTRY_SOURCE, available: off.available, cut: REGISTRY_CUT, items: r2 ?? [] },
    { source: { id: 'mcp-github', name: 'GitHub MCP Registry', url: 'https://github.com/mcp', kind: KIND, license: '공개 API (api.mcp.github.com) 메타데이터, 원문은 각 저장소 라이선스' }, available: ghr.available, items: r3 ?? [] },
    { source: { id: 'mcp-docker', name: 'Docker MCP Catalog', url: 'https://github.com/docker/mcp-registry', kind: KIND, license: 'MIT (docker/mcp-registry)' }, available: dock.available, cut: '보관(Archived) 표시 서버 제외', items: r4 ?? [] },
    { source: { id: 'mcp-toolhive', name: 'ToolHive Registry', url: 'https://github.com/stacklok/toolhive-registry', kind: KIND, license: 'Apache-2.0' }, available: tool.available, items: r5 ?? [] },
    { source: { id: 'mcp-mcpm', name: 'MCPM registry', url: 'https://github.com/pathintegral-institute/mcpm.sh', kind: KIND, license: 'MIT' }, available: mcpm.available, items: r7 ?? [] },
    { source: { id: 'mcp-smithery', name: 'Smithery', url: 'https://smithery.ai', kind: KIND, license: '공개 등록소 API (registry.smithery.ai) 메타데이터', note: `등록 ${smith.available}개 중 API가 사용량 순 상위 ${smith.exposed}개만 내준다. preview.useCount = Smithery에서 부른 횟수(인기순에는 쓰지 않음). metrics.stars = 저장소 스타(GitHub, 없으면 repos.ecosyste.ms)` }, available: smith.available, cut: `API가 내주는 사용량 순 상위 ${smith.exposed}개`, items: r8 ?? [] },
    { source: { id: 'mcp-remote', name: 'Awesome Remote MCP Servers', url: 'https://github.com/jaw9c/awesome-remote-mcp-servers', kind: KIND, license: 'MIT' }, available: remote.available, items: r9b },
    { source: { id: 'mcp-awesome', name: 'awesome-mcp-servers', url: 'https://github.com/punkpeye/awesome-mcp-servers', kind: KIND, license: 'MIT' }, available: awe.available, items: r10 ?? [] },
    { source: { id: 'mcp-wong2', name: 'mcpservers.org (awesome-mcp-servers)', url: 'https://github.com/wong2/awesome-mcp-servers', kind: KIND, license: 'MIT' }, available: wong.available, items: r11 ?? [] },
    { source: { id: 'mcp-aitmpl', name: 'Claude Code Templates (MCP)', url: 'https://www.aitmpl.com', kind: KIND, license: AITMPL_LICENSE }, available: tmpl.available, items: r12 ?? [] },
  ];
  const curated = files.filter((f) => f.source.id !== 'mcp-registry').flatMap((f) => f.items);
  log(`· 저장소 스타 붙이기: ${await withRepoStars(curated)}개`);
  for (const f of files) {
    f.items.forEach((it) => { it.category = CATEGORY; });
    writeCatalog(f);
  }
  log(`MCP 합계: ${files.reduce((n, f) => n + f.items.length, 0)}`);
}

if (isMain(import.meta.url)) {
  ensureProxy();
  if (process.argv.includes('--since')) await mainSince();
  else await main();
}

