// AI 확장 › 워크플로 템플릿 (자동화·AI 흐름을 가져다 쓰는 공개 템플릿 갤러리).
// n8n 템플릿(공개 API) · Activepieces 템플릿(공개 API) · Flowise 마켓 템플릿(Apache-2.0 저장소) · Langflow 시작 프로젝트(MIT 저장소)
// 실행: node scripts/import/ai-workflows.ts
import {
  type Item, checkout, cloneRepo, ensureProxy, fetchJson, isMain, isoDate, log, makeItem, readRepoFile, repoTreeUrl, splitFrontMatter,
  str, writeCatalog,
} from './ai-lib.ts';

const KIND = 'workflow';

// n8n은 템플릿이 1만 개가 넘는다. 무료 템플릿 가운데 조회 수가 이 값 이상인 것만 싣는다.
export const N8N_VIEW_CUT = Number(process.env.AI_N8N_VIEW_CUT ?? 1000);

// ---------- 1. n8n ----------

interface N8nNode { displayName?: string; name?: string }
interface N8nTemplate {
  id: number; name: string; totalViews?: number; price?: number | null; description?: string; createdAt?: string;
  user?: { username?: string; name?: string; verified?: boolean }; nodes?: N8nNode[];
}

const N8N_SKIP_NODES = new Set(['Sticky Note', 'Manual Trigger', 'When clicking ‘Test workflow’', 'No Operation, do nothing', 'Edit Fields (Set)', 'If', 'Merge', 'Code', 'Set']);

export function n8nItem(t: N8nTemplate): Item {
  const nodes = [...new Set((t.nodes ?? []).map((n) => n.displayName ?? '').filter((n) => n && !N8N_SKIP_NODES.has(n)))];
  return makeItem({
    sourceId: 'wf-n8n', slug: String(t.id), name: t.name, kind: KIND, summary: t.description ?? t.name,
    url: `https://n8n.io/workflows/${t.id}/`,
    source: { name: 'n8n workflow templates', url: 'https://n8n.io/workflows/' },
    // 조회 수는 내려받기와 달라서 metrics.views(인기 점수에만 쓰는 칸, D133)에 둔다. 날짜는 게시일이라 updatedAt이 아니다.
    metrics: { views: t.totalViews },
    tags: ['n8n', ...nodes.slice(0, 8), t.user?.verified ? 'verified-creator' : undefined],
    preview: { type: 'template', platform: 'n8n', nodes: nodes.slice(0, 12), author: t.user?.username, views: t.totalViews, publishedAt: isoDate(t.createdAt) },
    use: { docs: 'https://docs.n8n.io/workflows/templates/' },
  });
}

export async function fromN8n(): Promise<{ items: Item[]; available: number; free: number }> {
  log('· n8n 템플릿 (api.n8n.io, 끝까지)');
  const all: N8nTemplate[] = [];
  let page = 1;
  let total = Infinity;
  while (all.length < total) {
    const d = await fetchJson<{ totalWorkflows: number; workflows: N8nTemplate[] }>(`https://api.n8n.io/api/templates/search?page=${page}&rows=100`);
    total = d.totalWorkflows;
    if (!d.workflows.length) break;
    all.push(...d.workflows);
    page++;
    if (page % 20 === 0) log(`  ${all.length}/${total}`);
  }
  const free = all.filter((t) => !t.price);
  const items = free.filter((t) => (t.totalViews ?? 0) >= N8N_VIEW_CUT).map(n8nItem);
  return { items, available: total, free: free.length };
}

// ---------- 2. Activepieces ----------

interface ApTemplate {
  id: string; name: string; summary?: string; description?: string; type?: string; status?: string; updated?: string; created?: string;
  author?: string; categories?: string[]; pieces?: string[]; tags?: { title: string }[]; blogUrl?: string;
}

export async function fromActivepieces(): Promise<{ items: Item[]; available: number }> {
  log('· Activepieces 템플릿 (cloud.activepieces.com)');
  const d = await fetchJson<{ data: ApTemplate[] }>('https://cloud.activepieces.com/api/v1/templates');
  const items = d.data.filter((t) => !t.status || t.status === 'PUBLISHED').map((t) => makeItem({
    sourceId: 'wf-activepieces', slug: t.id, name: t.name, kind: KIND, summary: t.summary || t.description,
    url: `https://cloud.activepieces.com/templates/${t.id}`,
    source: { name: 'Activepieces templates', url: 'https://www.activepieces.com/templates' },
    metrics: { updatedAt: isoDate(t.updated ?? t.created) },
    tags: ['activepieces', ...(t.categories ?? []), ...(t.pieces ?? []).map((p) => p.replace(/^@activepieces\/piece-/, '')).slice(0, 6), t.type === 'OFFICIAL' ? 'official' : undefined],
    preview: { type: 'template', platform: 'activepieces', nodes: (t.pieces ?? []).map((p) => p.replace(/^@activepieces\/piece-/, '')), author: t.author },
    use: { docs: t.blogUrl },
  }));
  return { items, available: d.data.length };
}

// ---------- 3. Flowise 마켓 템플릿 ----------

export async function fromFlowise(): Promise<{ items: Item[]; available: number }> {
  log('· Flowise 마켓 템플릿 (FlowiseAI/Flowise)');
  const repo = cloneRepo('FlowiseAI/Flowise');
  const files = repo.files.filter((f) => /^packages\/server\/marketplaces\/(chatflows|agentflows|agentflowsv2|tools)\/[^/]+\.json$/.test(f));
  checkout(repo, files);
  const items: Item[] = [];
  for (const f of files) {
    const raw = readRepoFile(repo, f);
    if (!raw) continue;
    const j = JSON.parse(raw) as { description?: string; framework?: string[]; usecases?: string[]; badge?: string };
    const group = f.split('/')[3] ?? '';
    const name = (f.split('/').pop() ?? f).replace(/\.json$/, '');
    if (!j.description) continue;
    items.push(makeItem({
      sourceId: 'wf-flowise', slug: `${group}-${name}`, name, kind: KIND, summary: j.description,
      url: repoTreeUrl(repo, f, 'blob'),
      source: { name: 'Flowise marketplace templates', url: 'https://github.com/FlowiseAI/Flowise' },
      license: 'Apache-2.0',
      tags: ['flowise', group, ...(j.framework ?? []), ...(j.usecases ?? [])],
      preview: { type: 'template', platform: 'flowise', group, badge: j.badge },
      use: { docs: 'https://docs.flowiseai.com/' },
    }));
  }
  return { items, available: files.length };
}

// ---------- 4. Langflow 시작 프로젝트 ----------

export async function fromLangflow(): Promise<{ items: Item[]; available: number }> {
  log('· Langflow 시작 프로젝트 (langflow-ai/langflow)');
  const repo = cloneRepo('langflow-ai/langflow');
  const files = repo.files.filter((f) => /^src\/backend\/base\/langflow\/initial_setup\/starter_projects\/[^/]+\.json$/.test(f));
  checkout(repo, files);
  const items: Item[] = [];
  for (const f of files) {
    const raw = readRepoFile(repo, f);
    if (!raw) continue;
    const j = JSON.parse(raw) as { name?: string; description?: string; tags?: string[] };
    const name = j.name ?? (f.split('/').pop() ?? f).replace(/\.json$/, '');
    if (!j.description) continue;
    items.push(makeItem({
      sourceId: 'wf-langflow', slug: name, name, kind: KIND, summary: j.description,
      url: repoTreeUrl(repo, f, 'blob'),
      source: { name: 'Langflow starter projects', url: 'https://github.com/langflow-ai/langflow' },
      license: 'MIT',
      tags: ['langflow', ...(j.tags ?? [])],
      preview: { type: 'template', platform: 'langflow' },
      use: { docs: 'https://docs.langflow.org/' },
    }));
  }
  return { items, available: files.length };
}

// ---------- 5. GitHub Agentic Workflows (github/awesome-copilot workflows/) ----------

export async function fromCopilotWorkflows(): Promise<{ items: Item[]; available: number }> {
  log('· Awesome GitHub Copilot (agentic workflows)');
  const repo = cloneRepo('github/awesome-copilot');
  const files = repo.files.filter((f) => /^workflows\/[^/]+\.md$/.test(f));
  checkout(repo, files);
  const items: Item[] = [];
  for (const f of files) {
    const { data } = splitFrontMatter(readRepoFile(repo, f) ?? '');
    const description = str(data.description);
    if (!description) continue;
    const base = (f.split('/').pop() ?? f).replace(/\.md$/, '');
    items.push(makeItem({
      sourceId: 'wf-copilot', slug: base, name: str(data.name) ?? base, kind: KIND, summary: description,
      url: repoTreeUrl(repo, f, 'blob'),
      source: { name: 'Awesome GitHub Copilot (agentic workflows)', url: 'https://github.com/github/awesome-copilot' },
      license: 'MIT',
      tags: ['github-actions', 'agentic-workflow', 'copilot'],
      preview: { type: 'template', platform: 'github-agentic-workflows', file: f },
    }));
  }
  return { items, available: files.length };
}

export async function main(): Promise<void> {
  const n = await fromN8n();
  writeCatalog({ source: { id: 'wf-n8n', name: 'n8n workflow templates', url: 'https://n8n.io/workflows/', kind: KIND, license: '공개 템플릿 API (api.n8n.io) 메타데이터와 링크만 싣는다. 템플릿 본문은 n8n에서 받는다', note: `전체 ${n.available}개 중 무료 ${n.free}개` }, available: n.available, cut: `무료 템플릿 중 조회 ${N8N_VIEW_CUT}회 이상`, items: n.items });
  const a = await fromActivepieces();
  writeCatalog({ source: { id: 'wf-activepieces', name: 'Activepieces templates', url: 'https://www.activepieces.com/templates', kind: KIND, license: '공개 템플릿 API (cloud.activepieces.com) 메타데이터와 링크' }, available: a.available, items: a.items });
  const f = await fromFlowise();
  writeCatalog({ source: { id: 'wf-flowise', name: 'Flowise marketplace templates', url: 'https://github.com/FlowiseAI/Flowise', kind: KIND, license: 'Apache-2.0 (packages/server 아래)' }, available: f.available, items: f.items });
  const l = await fromLangflow();
  writeCatalog({ source: { id: 'wf-langflow', name: 'Langflow starter projects', url: 'https://github.com/langflow-ai/langflow', kind: KIND, license: 'MIT' }, available: l.available, items: l.items });
  const g = await fromCopilotWorkflows();
  writeCatalog({ source: { id: 'wf-copilot', name: 'Awesome GitHub Copilot (agentic workflows)', url: 'https://github.com/github/awesome-copilot', kind: KIND, license: 'MIT' }, available: g.available, items: g.items });
  log(`워크플로 합계: ${n.items.length + a.items.length + f.items.length + l.items.length + g.items.length}`);
}

if (isMain(import.meta.url)) {
  ensureProxy();
  await main();
}
