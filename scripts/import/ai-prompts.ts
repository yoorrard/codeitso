// AI 확장 › 프롬프트 (공개 라이선스로 풀린 프롬프트 모음).
// prompts.chat(CC0) · Fabric 패턴(MIT) · LobeHub 에이전트 색인(MIT, 한국어 색인 있음)
// 실행: node scripts/import/ai-prompts.ts
import {
  type Item, cloneRepo, ensureProxy, fetchJson, isMain, isoDate, log, makeItem, readRepoFile, repoMeta, repoTreeUrl, writeCatalog,
} from './ai-lib.ts';
import { AITMPL_LICENSE, aitmplItems } from './ai-aitmpl.ts';

const KIND = 'prompt';

// ---------- 1. prompts.chat (구 awesome-chatgpt-prompts) ----------

interface PcPrompt {
  id: string; slug?: string; title: string; description?: string | null; content: string; type?: string; createdAt?: string; updatedAt?: string;
  voteCount?: number; isFeatured?: boolean; delistReason?: string | null;
  category?: { name: string; parent?: { name: string } | null } | null; tags?: { tag: { name: string } }[];
  author?: { username?: string };
}

export function promptsChatItem(p: PcPrompt): Item | undefined {
  if (p.delistReason) return undefined;
  const summary = p.description || p.content;
  if (!summary || !p.title.trim()) return undefined;
  return makeItem({
    sourceId: 'prompt-prompts-chat', slug: `${p.id}`, name: p.title, kind: KIND, summary,
    url: `https://prompts.chat/prompts/${p.id}`,
    source: { name: 'prompts.chat', url: 'https://prompts.chat' },
    license: 'CC0-1.0',
    metrics: { likes: p.voteCount, updatedAt: isoDate(p.updatedAt ?? p.createdAt) },
    tags: [p.category?.parent?.name, p.category?.name, (p.type ?? '').toLowerCase(), ...(p.tags ?? []).map((t) => t.tag.name), p.isFeatured ? 'featured' : undefined],
    // 설명이 따로 있을 때만 본문 첫머리를 덧붙인다 (없으면 summary가 곧 본문 첫머리다).
    preview: { type: 'prompt', format: (p.type ?? 'TEXT').toLowerCase(), excerpt: p.description ? p.content.slice(0, 400) : undefined, author: p.author?.username },
  });
}

export async function fromPromptsChat(): Promise<{ items: Item[]; available: number }> {
  log('· prompts.chat (공개 API, 끝까지)');
  const items: Item[] = [];
  let page = 1;
  let totalPages = 1;
  let available = 0;
  do {
    const d = await fetchJson<{ prompts: PcPrompt[]; total: number; totalPages: number }>(`https://prompts.chat/api/prompts?perPage=100&page=${page}`);
    totalPages = d.totalPages;
    available = d.total;
    for (const p of d.prompts) {
      const it = promptsChatItem(p);
      if (it) items.push(it);
    }
    page++;
  } while (page <= totalPages);
  return { items, available };
}

// ---------- 2. Fabric 패턴 (danielmiessler/fabric) ----------

export async function fromFabric(): Promise<{ items: Item[]; available: number }> {
  log('· Fabric 패턴 (danielmiessler/fabric)');
  const repo = cloneRepo('danielmiessler/fabric', ['scripts/pattern_descriptions/pattern_descriptions.json']);
  const meta = await repoMeta('danielmiessler/fabric');
  const d = JSON.parse(readRepoFile(repo, 'scripts/pattern_descriptions/pattern_descriptions.json') ?? '{"patterns":[]}') as {
    patterns: { patternName: string; description?: string; tags?: string[] }[];
  };
  const present = new Set(repo.files.filter((f) => /^data\/patterns\/[^/]+\/system\.md$/.test(f)).map((f) => f.split('/')[2]));
  const items = d.patterns.filter((p) => present.has(p.patternName) && p.description).map((p) => makeItem({
    sourceId: 'prompt-fabric', slug: p.patternName, name: p.patternName, kind: KIND, summary: p.description,
    url: repoTreeUrl(repo, `data/patterns/${p.patternName}/system.md`, 'blob'),
    source: { name: 'Fabric patterns', url: 'https://github.com/danielmiessler/fabric' },
    license: 'MIT',
    // 별은 Fabric 저장소 전체의 값이라 metrics에 넣지 않는다.
    metrics: { updatedAt: meta?.pushedAt },
    tags: ['fabric', ...(p.tags ?? []).map((t) => t.toLowerCase())],
    preview: { type: 'prompt', format: 'system', file: `data/patterns/${p.patternName}/system.md`, repoStars: meta?.stars },
    use: { install: 'go install github.com/danielmiessler/fabric/cmd/fabric@latest', snippet: `fabric --pattern ${p.patternName}` },
  }));
  return { items, available: present.size };
}

// ---------- 3. LobeHub 에이전트 색인 (lobehub/lobe-chat-agents) ----------

interface LobeAgent {
  identifier: string; author?: string; createdAt?: string; homepage?: string; tokenUsage?: number;
  meta: { title: string; description?: string; tags?: string[]; category?: string; avatar?: string };
}

export async function fromLobeHub(): Promise<{ items: Item[]; available: number }> {
  log('· LobeHub 에이전트 (chat-agents.lobehub.com, 영어·한국어 색인)');
  const en = await fetchJson<{ agents: LobeAgent[] }>('https://chat-agents.lobehub.com/index.json');
  const ko = await fetchJson<{ agents: LobeAgent[] }>('https://chat-agents.lobehub.com/index.ko-KR.json');
  const koById = new Map(ko.agents.map((a) => [a.identifier, a]));
  const items = en.agents.filter((a) => a.meta.description).map((a) => {
    const k = koById.get(a.identifier);
    return makeItem({
      sourceId: 'prompt-lobehub', slug: a.identifier, name: a.meta.title, kind: KIND, summary: a.meta.description,
      summaryKo: k?.meta.description,
      url: `https://lobehub.com/agent/${a.identifier}`,
      source: { name: 'LobeHub Agents', url: 'https://github.com/lobehub/lobe-chat-agents' },
      license: 'MIT',
      tags: [a.meta.category, ...(a.meta.tags ?? []).slice(0, 6)],
      preview: { type: 'prompt', format: 'system', avatar: a.meta.avatar, titleKo: k?.meta.title, author: a.author, publishedAt: isoDate(a.createdAt) },
      use: { docs: `https://github.com/lobehub/lobe-chat-agents/blob/main/locales/${a.identifier}/index.json` },
    });
  });
  return { items, available: en.agents.length };
}

export async function main(): Promise<void> {
  const pc = await fromPromptsChat();
  writeCatalog({ source: { id: 'prompt-prompts-chat', name: 'prompts.chat', url: 'https://prompts.chat', kind: KIND, license: 'CC0-1.0 (프롬프트 내용과 자료, 저장소 LICENSE)', note: '내려진(delisted) 프롬프트는 뺀다' }, available: pc.available, items: pc.items });
  const fb = await fromFabric();
  writeCatalog({ source: { id: 'prompt-fabric', name: 'Fabric patterns', url: 'https://github.com/danielmiessler/fabric', kind: KIND, license: 'MIT' }, available: fb.available, items: fb.items });
  const lh = await fromLobeHub();
  writeCatalog({ source: { id: 'prompt-lobehub', name: 'LobeHub Agents', url: 'https://github.com/lobehub/lobe-chat-agents', kind: KIND, license: 'MIT (lobe-chat-agents 저장소)' }, available: lh.available, items: lh.items });
  const cmd = await aitmplItems('commands', KIND, 'prompt-aitmpl-commands', 'prompt');
  cmd.items.forEach((it) => { it.tags = [...new Set([...it.tags, 'slash-command'])].slice(0, 12).sort(); });
  writeCatalog({ source: { id: 'prompt-aitmpl-commands', name: 'Claude Code Templates (slash commands)', url: 'https://www.aitmpl.com', kind: KIND, license: AITMPL_LICENSE }, available: cmd.available, items: cmd.items });
  log(`프롬프트 합계: ${pc.items.length + fb.items.length + lh.items.length + cmd.items.length}`);
}

if (isMain(import.meta.url)) {
  ensureProxy();
  await main();
}
