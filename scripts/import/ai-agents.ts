// AI 확장 › 서브에이전트·사용자 에이전트 (.md 머리말에 name·description을 둔 에이전트 정의 파일).
// Claude Code 서브에이전트 모음과 GitHub Copilot 사용자 에이전트를 저장소에서 직접 읽는다.
// 실행: node scripts/import/ai-agents.ts
import {
  type Item, type CatalogFile, type Repo, checkout, cloneRepo, dedupeAcross, ensureProxy, isMain, log, makeItem, readRepoFile,
  repoMeta, repoTreeUrl, splitFrontMatter, str, strList, textKey, writeCatalog,
} from './ai-lib.ts';
import { AITMPL_LICENSE, aitmplItems } from './ai-aitmpl.ts';

const KIND = 'subagent';

export interface AgentRepo {
  id: string; // 파일 이름
  slug: string; // owner/repo
  name: string;
  match: RegExp; // 에이전트 파일 경로
  agent: 'claude-code' | 'github-copilot';
  license: string; // 목록을 싣는 근거
  install?: (path: string, plugin?: string) => string | undefined;
  tags?: string[];
}

export const REPOS: AgentRepo[] = [
  {
    id: 'agent-voltagent', slug: 'VoltAgent/awesome-claude-code-subagents', name: 'Awesome Claude Code Subagents (VoltAgent)',
    match: /^categories\/[^/]+\/(?!README)[^/]+\.md$/, agent: 'claude-code', license: 'MIT',
    install: (_p, plugin) => (plugin ? `claude plugin marketplace add VoltAgent/awesome-claude-code-subagents\nclaude plugin install ${plugin}` : undefined),
  },
  {
    id: 'agent-wshobson', slug: 'wshobson/agents', name: 'Claude Code Plugins: Orchestration and Automation (wshobson/agents)',
    match: /^plugins\/[^/]+\/agents\/[^/]+\.md$/, agent: 'claude-code', license: 'MIT',
    install: (_p, plugin) => (plugin ? `/plugin marketplace add wshobson/agents\n/plugin install ${plugin}` : undefined),
  },
  {
    id: 'agent-copilot', slug: 'github/awesome-copilot', name: 'Awesome GitHub Copilot (agents)',
    match: /^agents\/[^/]+\.agent\.md$/, agent: 'github-copilot', license: 'MIT',
  },
  {
    id: 'agent-vijaythecoder', slug: 'vijaythecoder/awesome-claude-agents', name: 'Awesome Claude Agents (vijaythecoder)',
    match: /^agents\/.+\.md$/, agent: 'claude-code', license: 'MIT',
  },
  {
    id: 'agent-0xfurai', slug: '0xfurai/claude-code-subagents', name: 'Claude Code Subagents (0xfurai)',
    match: /^agents\/[^/]+\.md$/, agent: 'claude-code', license: 'MIT',
  },
  {
    id: 'agent-lst97', slug: 'lst97/claude-code-sub-agents', name: 'Claude Code Sub-Agents (lst97)',
    match: /^agents\/.+\.md$/, agent: 'claude-code', license: 'MIT',
  },
  {
    id: 'agent-iannuttall', slug: 'iannuttall/claude-agents', name: 'Claude Agents (iannuttall)',
    match: /^agents\/[^/]+\.md$/, agent: 'claude-code', license: 'MIT',
  },
];

// marketplace.json이 있으면 (플러그인 폴더 → 플러그인 이름)을 만든다.
function pluginDirs(repo: Repo): [string, string][] {
  const raw = readRepoFile(repo, '.claude-plugin/marketplace.json');
  if (!raw) return [];
  const m = JSON.parse(raw) as { plugins?: { name: string; source?: unknown }[] };
  return (m.plugins ?? [])
    .map((p) => [typeof p.source === 'string' ? p.source.replace(/^\.\//, '').replace(/\/$/, '') : '', p.name] as [string, string])
    .filter(([dir]) => dir);
}

export async function fromRepo(cfg: AgentRepo): Promise<{ items: Item[]; available: number }> {
  log(`· ${cfg.name} (${cfg.slug})`);
  let repo: Repo;
  try {
    repo = cloneRepo(cfg.slug, ['.claude-plugin/marketplace.json']);
  } catch (err) {
    log(`  건너뜀: ${String(err).slice(0, 120)}`);
    return { items: [], available: 0 };
  }
  const meta = await repoMeta(cfg.slug);
  const paths = repo.files.filter((f) => cfg.match.test(f));
  checkout(repo, paths);
  const plugins = pluginDirs(repo);
  const items: Item[] = [];
  for (const p of paths) {
    const text = readRepoFile(repo, p);
    if (!text) continue;
    const { data } = splitFrontMatter(text);
    const base = p.split('/').pop()?.replace(/(\.agent)?\.md$/, '') ?? p;
    const name = str(data.name) ?? base;
    const description = str(data.description);
    if (!description) continue;
    const plugin = plugins.find(([dir]) => p.startsWith(`${dir}/`))?.[1];
    const tools = strList(data.tools);
    const category = p.split('/').slice(-2, -1)[0];
    items.push(makeItem({
      sourceId: cfg.id, slug: p.replace(/\.md$/, ''), name, kind: KIND, summary: description,
      url: repoTreeUrl(repo, p, 'blob'),
      source: { name: cfg.name, url: `https://github.com/${cfg.slug}` },
      license: cfg.license,
      // 별은 모음 저장소 전체의 값이라 이 에이전트의 인기로 보지 않고 미리 보기 정보로만 둔다.
      metrics: { updatedAt: meta?.pushedAt },
      tags: [cfg.agent, category && category !== 'agents' ? category.replace(/^\d+-/, '') : undefined, plugin, str(data.model), ...(cfg.tags ?? [])],
      preview: { type: 'skill', agent: cfg.agent, file: p, tools: tools.length ? tools.slice(0, 12) : undefined, model: str(data.model), plugin, repoStars: meta?.stars },
      use: { install: cfg.install?.(p, plugin) },
    }));
  }
  return { items, available: paths.length };
}

export async function main(): Promise<void> {
  const results: { source: CatalogFile['source']; items: Item[]; available: number }[] = [];
  for (const cfg of REPOS) {
    const r = await fromRepo(cfg);
    results.push({ source: { id: cfg.id, name: cfg.name, url: `https://github.com/${cfg.slug}`, kind: KIND, license: cfg.license }, ...r });
  }
  const tmpl = await aitmplItems('agents', KIND, 'agent-aitmpl', 'skill');
  results.push({ source: { id: 'agent-aitmpl', name: 'Claude Code Templates (agents)', url: 'https://www.aitmpl.com', kind: KIND, license: AITMPL_LICENSE }, ...tmpl });
  // 같은 이름의 에이전트는 모음마다 내용이 달라서 이름으로는 겹침을 보지 않는다. 같은 파일 주소나 같은 설명이면 겹침.
  const kept = dedupeAcross(results.map((r) => ({ key: (it: Item) => [it.url.toLowerCase(), textKey(it)], items: r.items })), { mergeStars: false });
  const files: Omit<CatalogFile, 'count' | 'fetchedAt'>[] = results.map((r, i) => ({ source: r.source, available: r.available, items: kept[i] ?? [] }));
  for (const f of files) if (f.available > 0) writeCatalog(f);
  log(`서브에이전트 합계: ${files.reduce((n, f) => n + f.items.length, 0)}`);
}

if (isMain(import.meta.url)) {
  ensureProxy();
  await main();
}
