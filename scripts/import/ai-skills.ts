// AI 확장 › Agent Skills (SKILL.md). 공식 저장소는 SKILL.md 머리말을 직접 읽고,
// 모음·등록소는 목록을 끝까지 받아 (저장소 + 스킬 이름) 기준으로 중복을 정리한다.
// 우선순위: anthropics/skills → github/awesome-copilot → ToolHive 스킬 등록소 → awesome-agent-skills(공식 팀 스킬 모음) → claude-plugins.dev
// 실행: node scripts/import/ai-skills.ts
import {
  type Item, type CatalogFile, type Repo, checkout, cloneRepo, dedupeAcross, ensureProxy, fetchJson, githubSlug, isMain, isoDate, log, makeItem,
  readRepoFile, repoTreeUrl, splitFrontMatter, str, strList, textKey, writeCatalog,
} from './ai-lib.ts';
import { AITMPL_LICENSE, aitmplItems } from './ai-aitmpl.ts';

const KIND = 'skill';

// claude-plugins.dev는 4만 개가 넘는다. 설치 수가 이 값 이상이거나 별이 STAR_CUT 이상인 저장소의 스킬만 싣는다.
export const INSTALL_CUT = Number(process.env.AI_SKILL_INSTALL_CUT ?? 25);
export const STAR_CUT = Number(process.env.AI_SKILL_STAR_CUT ?? 1000);

export const skillKey = (owner: string, repo: string, name: string): string =>
  `${owner}/${repo}#${name}`.toLowerCase().replace(/[\s_]+/g, '-');

// LICENSE.txt 첫머리로 라이선스를 알아본다. 모르면 비운다.
export function licenseFromText(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const head = text.slice(0, 600);
  if (/Apache License[\s\S]{0,40}Version 2\.0/i.test(head)) return 'Apache-2.0';
  if (/^\s*MIT License/i.test(head) || /Permission is hereby granted, free of charge/i.test(text.slice(0, 2000))) return 'MIT';
  if (/CC0 1\.0/i.test(head)) return 'CC0-1.0';
  if (/Creative Commons Attribution 4\.0/i.test(head)) return 'CC-BY-4.0';
  return undefined;
}

export interface SkillFile {
  path: string; // .../SKILL.md
  dir: string;
  name: string;
  description: string;
  license?: string;
  tags: string[];
}

export function readSkills(repo: Repo, filter: (path: string) => boolean): SkillFile[] {
  const paths = repo.files.filter((f) => /(^|\/)SKILL\.md$/.test(f) && filter(f));
  // 파일마다 따로 받으면 느리니 한 번에 꺼낸다 (머리말 옆 LICENSE도 함께).
  const dirs = new Set(paths.map((p) => p.replace(/\/?SKILL\.md$/, '')));
  checkout(repo, [...paths, ...repo.files.filter((f) => /\/LICENSE(\.txt|\.md)?$/.test(f) && dirs.has(f.replace(/\/[^/]+$/, '')))]);
  const out: SkillFile[] = [];
  for (const p of paths) {
    const text = readRepoFile(repo, p);
    if (!text) continue;
    const { data } = splitFrontMatter(text);
    const dir = p.replace(/\/?SKILL\.md$/, '');
    const name = str(data.name) ?? dir.split('/').pop() ?? dir;
    const description = str(data.description) ?? '';
    if (!description) continue;
    const metadata = (data.metadata && typeof data.metadata === 'object' && !Array.isArray(data.metadata) ? data.metadata : {}) as Record<string, never>;
    let license = str(data.license);
    if (!license || /LICENSE/i.test(license) || license.length > 40) {
      const licFile = repo.files.find((f) => f === `${dir}/LICENSE.txt` || f === `${dir}/LICENSE` || f === `${dir}/LICENSE.md`);
      license = licFile ? licenseFromText(readRepoFile(repo, licFile)) : undefined;
    }
    out.push({ path: p, dir, name, description, license, tags: [...strList(data.tags), ...strList(metadata.tags)] });
  }
  return out;
}

// ---------- 1. anthropics/skills ----------

export async function fromAnthropic(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· anthropics/skills');
  const repo = cloneRepo('anthropics/skills', ['.claude-plugin/marketplace.json']);
  const market = JSON.parse(readRepoFile(repo, '.claude-plugin/marketplace.json') ?? '{"plugins":[]}') as {
    name: string; plugins: { name: string; skills?: string[] }[];
  };
  const pluginOf = new Map<string, string>();
  for (const p of market.plugins) for (const s of p.skills ?? []) pluginOf.set(s.replace(/^\.\//, ''), p.name);
  const skills = readSkills(repo, (p) => p.startsWith('skills/'));
  const keys = new Map<string, string>();
  const items = skills.map((s) => {
    const plugin = pluginOf.get(s.dir);
    const it = makeItem({
      sourceId: 'skill-anthropic', slug: s.name, name: s.name, kind: KIND, summary: s.description,
      url: repoTreeUrl(repo, s.dir),
      source: { name: 'Anthropic Agent Skills', url: 'https://github.com/anthropics/skills' },
      license: s.license,
      tags: ['official', 'anthropic', 'claude', ...s.tags],
      preview: { type: 'skill', file: `${s.dir}/SKILL.md`, plugin, agents: ['claude-code', 'claude-ai', 'claude-api'] },
      use: {
        install: plugin ? `/plugin marketplace add anthropics/skills\n/plugin install ${plugin}@${market.name}` : undefined,
        docs: repoTreeUrl(repo, `${s.dir}/SKILL.md`, 'blob'),
      },
    });
    keys.set(it.id, skillKey('anthropics', 'skills', s.name));
    return it;
  });
  return { items, available: skills.length, keys };
}

// ---------- 2. github/awesome-copilot (skills/) ----------

export async function fromCopilot(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· github/awesome-copilot skills');
  const repo = cloneRepo('github/awesome-copilot');
  const skills = readSkills(repo, (p) => /^skills\/[^/]+\/SKILL\.md$/.test(p));
  const keys = new Map<string, string>();
  const items = skills.map((s) => {
    const it = makeItem({
      sourceId: 'skill-copilot', slug: s.name, name: s.name, kind: KIND, summary: s.description,
      url: repoTreeUrl(repo, s.dir),
      source: { name: 'Awesome GitHub Copilot', url: 'https://github.com/github/awesome-copilot' },
      license: s.license ?? 'MIT',
      tags: ['copilot', ...s.tags],
      preview: { type: 'skill', file: `${s.dir}/SKILL.md`, agents: ['github-copilot'] },
      use: { docs: `https://awesome-copilot.github.com/skills/${s.dir.split('/').pop()}` },
    });
    keys.set(it.id, skillKey('github', 'awesome-copilot', s.name));
    return it;
  });
  return { items, available: skills.length, keys };
}

// ---------- ToolHive 스킬 등록소 (stacklok/toolhive-registry, Apache-2.0) ----------

interface ThSkill {
  namespace?: string; name: string; title?: string; description?: string; version?: string; status?: string;
  repository?: { url?: string }; packages?: { registryType?: string; identifier?: string; url?: string; ref?: string; subfolder?: string }[];
}

export async function fromToolhive(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· ToolHive 스킬 등록소 (stacklok/toolhive-registry)');
  const repo = cloneRepo('stacklok/toolhive-registry');
  const files = repo.files.filter((f) => /^registries\/toolhive\/skills\/[^/]+\/skill\.json$/.test(f));
  checkout(repo, files);
  const keys = new Map<string, string>();
  const items: Item[] = [];
  for (const f of files) {
    const raw = readRepoFile(repo, f);
    if (!raw) continue;
    const j = JSON.parse(raw) as ThSkill;
    if (!j.description || (j.status && j.status !== 'active')) continue;
    const git = j.packages?.find((p) => p.registryType === 'git');
    const oci = j.packages?.find((p) => p.registryType === 'oci');
    const gh = githubSlug(git?.url ?? j.repository?.url);
    const url = gh ? `https://github.com/${gh}${git?.subfolder ? `/tree/HEAD/${git.subfolder}` : ''}` : (j.repository?.url ?? `https://github.com/stacklok/toolhive-registry/tree/main/${f.replace(/\/skill\.json$/, '')}`);
    const it = makeItem({
      sourceId: 'skill-toolhive', slug: j.name, name: j.title ?? j.name, kind: KIND, summary: j.description, url,
      source: { name: 'ToolHive Registry (skills)', url: 'https://github.com/stacklok/toolhive-registry' },
      tags: [gh?.split('/')[0], 'toolhive'],
      preview: { type: 'skill', owner: gh?.split('/')[0], repo: gh ? `https://github.com/${gh}` : undefined, file: git?.subfolder ? `${git.subfolder}/SKILL.md` : undefined, oci: oci?.identifier, version: j.version },
    });
    if (gh) keys.set(it.id, skillKey(gh.split('/')[0] ?? '', gh.split('/')[1] ?? '', j.name));
    items.push(it);
  }
  return { items, available: files.length, keys };
}

// ---------- 3. VoltAgent/awesome-agent-skills (공식 팀이 낸 스킬 모음, MIT) ----------

export function parseAwesomeSkills(readme: string): { owner: string; repo: string; skill: string; name: string; url: string; desc: string; section: string }[] {
  const out: { owner: string; repo: string; skill: string; name: string; url: string; desc: string; section: string }[] = [];
  let section = '';
  for (const line of readme.split('\n')) {
    const h = /^#{2,4}\s+(.+?)\s*$/.exec(line);
    if (h?.[1]) {
      section = h[1].replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}\s&.+-]/gu, '').trim();
      continue;
    }
    const m = /^\s*- \*\*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)\*\*\s*[-–—]\s*(.+)$/.exec(line);
    if (!m || !m[1] || !m[2] || !m[3]) continue;
    const url = m[2];
    const o = /officialskills\.sh\/([^/]+)\/([^/]+)\/([^/?#]+)/.exec(url) ?? /github\.com\/([^/]+)\/([^/]+)\/(?:tree|blob)\/[^/]+\/(?:.*\/)?([^/?#]+)\/?$/.exec(url);
    out.push({
      owner: o?.[1] ?? '', repo: o?.[2] ?? '', skill: o?.[3] ?? m[1].split('/').pop() ?? m[1],
      name: m[1].trim(), url, desc: m[3].trim(), section,
    });
  }
  return out;
}

export async function fromAwesomeAgentSkills(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· VoltAgent/awesome-agent-skills');
  const repo = cloneRepo('VoltAgent/awesome-agent-skills', ['README.md']);
  const rows = parseAwesomeSkills(readRepoFile(repo, 'README.md') ?? '');
  const keys = new Map<string, string>();
  const items = rows.map((r) => {
    const by = /^Official Skills by (.+)$/i.exec(r.section)?.[1];
    const it = makeItem({
      sourceId: 'skill-awesome-agent', slug: `${r.owner}-${r.repo}-${r.skill}`, name: r.skill, kind: KIND, summary: r.desc,
      url: r.url,
      source: { name: 'Awesome Agent Skills', url: 'https://github.com/VoltAgent/awesome-agent-skills' },
      tags: [by ? 'official' : 'community', by ?? r.section, r.owner],
      preview: { type: 'skill', owner: r.owner, repo: r.owner && r.repo ? `https://github.com/${r.owner}/${r.repo}` : undefined },
    });
    if (r.owner && r.repo) keys.set(it.id, skillKey(r.owner, r.repo, r.skill));
    return it;
  });
  return { items, available: rows.length, keys };
}

// ---------- 4. claude-plugins.dev 스킬 등록소 ----------

interface CpdSkill {
  name: string; namespace: string; sourceUrl: string; description?: string; author?: string; stars?: number; installs?: number;
  metadata?: { repoOwner?: string; repoName?: string; directoryPath?: string }; updatedAt?: string;
}

export async function fromClaudePluginsDev(): Promise<{ items: Item[]; available: number; keys: Map<string, string> }> {
  log('· claude-plugins.dev 스킬 (설치 수 순으로 끝까지)');
  const all: CpdSkill[] = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const d = await fetchJson<{ skills: CpdSkill[]; total: number }>(`https://claude-plugins.dev/api/skills?limit=100&offset=${offset}`);
    total = d.total;
    if (!d.skills.length) break;
    all.push(...d.skills);
    offset += d.skills.length;
    if (offset % 5000 < 100) log(`  ${offset}/${total}`);
  }
  const keys = new Map<string, string>();
  const items: Item[] = [];
  for (const s of all) {
    if ((s.installs ?? 0) < INSTALL_CUT && (s.stars ?? 0) < STAR_CUT) continue;
    if (!s.description) continue;
    const owner = s.metadata?.repoOwner ?? '';
    const repoName = s.metadata?.repoName ?? '';
    const it = makeItem({
      sourceId: 'skill-cpd', slug: s.namespace.replace(/^@/, ''), name: s.name, kind: KIND, summary: s.description,
      url: s.sourceUrl,
      source: { name: 'Claude Plugins (claude-plugins.dev)', url: 'https://claude-plugins.dev/skills' },
      metrics: { stars: s.stars, downloads: s.installs, updatedAt: isoDate(s.updatedAt) },
      tags: [owner, 'community'],
      preview: { type: 'skill', owner, repo: owner && repoName ? `https://github.com/${owner}/${repoName}` : undefined, file: s.metadata?.directoryPath ? `${s.metadata.directoryPath}/SKILL.md` : undefined },
      use: { install: `npx skills-installer add ${s.namespace}`, docs: `https://claude-plugins.dev/skills/${s.namespace}` },
    });
    if (owner && repoName) keys.set(it.id, skillKey(owner, repoName, s.name));
    items.push(it);
  }
  return { items, available: all.length, keys };
}

export async function main(): Promise<void> {
  const a = await fromAnthropic();
  const c = await fromCopilot();
  const t = await fromToolhive();
  const v = await fromAwesomeAgentSkills();
  const m = await aitmplItems('skills', KIND, 'skill-aitmpl', 'skill');
  const p = await fromClaudePluginsDev();
  // (저장소 + 스킬 이름)과 설명 첫머리 둘 다 열쇠로 쓴다. 모음들이 같은 SKILL.md를 옮겨 싣는 일이 많다.
  const by = (keys?: Map<string, string>) => (it: Item) => [keys?.get(it.id), textKey(it)];
  const [ra, rc, rt, rv, rm, rp] = dedupeAcross([
    { key: by(a.keys), items: a.items },
    { key: by(c.keys), items: c.items },
    { key: by(t.keys), items: t.items },
    { key: by(v.keys), items: v.items },
    { key: by(), items: m.items },
    { key: by(p.keys), items: p.items },
  ], { mergeStars: false });
  const files: Omit<CatalogFile, 'count' | 'fetchedAt'>[] = [
    { source: { id: 'skill-anthropic', name: 'Anthropic Agent Skills', url: 'https://github.com/anthropics/skills', kind: KIND, license: '스킬마다 LICENSE.txt (Apache-2.0 또는 소스 공개 전용). 메타데이터(이름·설명)는 저장소 SKILL.md 머리말' }, available: a.available, items: ra ?? [] },
    { source: { id: 'skill-copilot', name: 'Awesome GitHub Copilot (skills)', url: 'https://github.com/github/awesome-copilot', kind: KIND, license: 'MIT' }, available: c.available, items: rc ?? [] },
    { source: { id: 'skill-toolhive', name: 'ToolHive Registry (skills)', url: 'https://github.com/stacklok/toolhive-registry', kind: KIND, license: 'Apache-2.0 (등록소 자료), 각 스킬은 원 저장소 라이선스' }, available: t.available, items: rt ?? [] },
    { source: { id: 'skill-awesome-agent', name: 'Awesome Agent Skills', url: 'https://github.com/VoltAgent/awesome-agent-skills', kind: KIND, license: 'MIT' }, available: v.available, items: rv ?? [] },
    { source: { id: 'skill-aitmpl', name: 'Claude Code Templates (skills)', url: 'https://www.aitmpl.com', kind: KIND, license: AITMPL_LICENSE }, available: m.available, items: rm ?? [] },
    { source: { id: 'skill-cpd', name: 'Claude Plugins (claude-plugins.dev)', url: 'https://claude-plugins.dev/skills', kind: KIND, license: '공개 API 메타데이터 (각 스킬은 원 저장소 라이선스)', note: 'GitHub 공개 저장소의 SKILL.md를 모은 등록소' }, available: p.available, cut: `설치 ${INSTALL_CUT}회 이상 또는 저장소 별 ${STAR_CUT}개 이상`, items: rp ?? [] },
  ];
  for (const f of files) writeCatalog(f);
  log(`스킬 합계: ${files.reduce((n, f) => n + f.items.length, 0)}`);
}

if (isMain(import.meta.url)) {
  ensureProxy();
  await main();
}
