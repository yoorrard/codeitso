// GitHub 밖의 공개 코드 저장소(GitLab.com, Codeberg)에서 앱 만들기와 관련된 인기 프로젝트를 받아 오픈소스 진열대에 쓴다.
//   node scripts/import/oss-forges.ts            (둘 다)
//   node scripts/import/oss-forges.ts gitlab     (하나만)
// - GitLab: 공개 API /api/v4/projects?topic=<주제>&order_by=star_count (로그인 없이 됨). 주제마다 별 GITLAB_MIN_STARS개 이상, 끝까지.
// - Codeberg: Gitea 공개 API /api/v1/repos/search?sort=stars. 전체 45만 개라 별 CODEBERG_MIN_STARS개 이상만 (정렬된 목록을 기준 밑에서 멈춘다).
// 소분류는 설명·주제 낱말로 고른다.
import { type Item, type OssKind, cached, cleanLicense, fetchJson, isAdult, main, makeId, makeItem, sleep, summaryOf, tagify, toDate, writeCatalog } from './oss-lib.ts';

export const GITLAB_MIN_STARS = 20;
export const CODEBERG_MIN_STARS = 50;

const GITLAB_TOPICS = [
  'template', 'boilerplate', 'starter', 'nextjs', 'react', 'vue', 'vuejs', 'svelte', 'nuxt', 'angular', 'flutter', 'android',
  'ios', 'react-native', 'electron', 'web', 'website', 'webapp', 'pwa', 'javascript', 'typescript', 'python', 'django', 'flask',
  'fastapi', 'nodejs', 'php', 'laravel', 'rails', 'go', 'rust', 'discord-bot', 'telegram-bot', 'bot', 'chatbot', 'llm', 'ai',
  'machine-learning', 'game', 'gamedev', 'godot', 'cli', 'cms', 'blog', 'hugo', 'jekyll', 'static-site', 'ecommerce',
  'self-hosted', 'selfhosted', 'dashboard', 'authentication', 'browser-extension', 'firefox-addon', 'api', 'docker',
];

// 설명·주제 낱말 → 소분류. 맞는 것이 없으면 '프레임워크별 오픈소스 앱(projects)'.
const RULES: [RegExp, OssKind][] = [
  [/\b(discord|telegram|slack|matrix|mastodon|irc)\b.{0,20}\bbots?\b|\bbots?\b/i, 'bots'],
  [/\b(browser|firefox|chrome|web)[- ]?(extension|add-?on)s?\b|\buserscripts?\b/i, 'extensions'],
  [/\b(games?|gamedev|godot|game engine)\b/i, 'games'],
  [/\b(cli|command[- ]line|terminal|tui)\b/i, 'cli'],
  [/\b(cms|blog engine|static site generator|wiki|hugo theme|jekyll theme)\b/i, 'cms'],
  [/\b(e-?commerce|online shop|webshop|storefront)\b/i, 'ecommerce'],
  [/\b(authentication|oauth2?|openid|sso|identity provider|2fa|totp)\b/i, 'auth'],
  [/\b(ai|llms?|gpt|chatbots?|machine learning|neural|agents?)\b/i, 'ai-apps'],
  [/\b(self-?hosted|server|platform|dashboard|manager)\b/i, 'apps'],
];

export function forgeKind(text: string): OssKind {
  for (const [re, k] of RULES) if (re.test(text)) return k;
  return 'projects';
}

interface GitlabProject {
  id: number;
  path_with_namespace: string;
  name: string;
  description: string | null;
  web_url: string;
  star_count: number;
  topics?: string[];
  last_activity_at?: string;
  forked_from_project?: unknown;
  archived?: boolean;
  license?: { key?: string; nickname?: string } | null;
}

async function gitlab(): Promise<void> {
  const all = new Map<number, GitlabProject>();
  for (const topic of GITLAB_TOPICS) {
    const rows = await cached(`gitlab-${topic}-${GITLAB_MIN_STARS}`, async () => {
      const out: GitlabProject[] = [];
      for (let page = 1; ; page++) {
        const list = await fetchJson<GitlabProject[]>(
          `https://gitlab.com/api/v4/projects?topic=${encodeURIComponent(topic)}&order_by=star_count&sort=desc&per_page=100&page=${page}&archived=false`,
        );
        out.push(...list.filter((p) => p.star_count >= GITLAB_MIN_STARS));
        if (list.length < 100 || (list.at(-1)?.star_count ?? 0) < GITLAB_MIN_STARS) break;
        await sleep(400);
      }
      return out;
    }, 7);
    for (const p of rows) if (!all.has(p.id)) all.set(p.id, p);
    await sleep(300);
  }
  const items: Item[] = [...all.values()]
    .filter((p) => !p.forked_from_project && p.description && !isAdult([p.name, p.description], p.topics ?? []))
    .map((p) => makeItem({
      id: makeId('gitlab', p.path_with_namespace),
      name: p.name,
      kind: forgeKind(`${p.name} ${p.description} ${(p.topics ?? []).join(' ')}`),
      category: 'opensource',
      summary: summaryOf(p.description) ?? p.name,
      url: p.web_url,
      source: { name: 'GitLab.com', url: 'https://gitlab.com/explore/projects/topics' },
      license: cleanLicense(p.license?.nickname ?? p.license?.key),
      metrics: { stars: p.star_count, updatedAt: toDate(p.last_activity_at) },
      tags: tagify(['gitlab', ...(p.topics ?? []).slice(0, 8)]),
      preview: { type: 'repo', host: 'gitlab', repo: p.path_with_namespace },
      use: { install: `git clone ${p.web_url}.git` },
    }));
  writeCatalog('opensource', {
    id: 'gitlab',
    name: 'GitLab.com 인기 프로젝트 (주제별)',
    url: 'https://gitlab.com/explore/projects/topics',
    license: 'Project metadata from the public GitLab.com REST API; each project keeps its own license (field license).',
    cut: `주제 ${GITLAB_TOPICS.length}개마다 별 ${GITLAB_MIN_STARS}개 이상, 포크·보관·설명 없는 프로젝트 제외`,
  }, items);
}

interface GiteaRepo {
  full_name: string;
  name: string;
  description: string;
  html_url: string;
  stars_count: number;
  fork: boolean;
  archived: boolean;
  topics?: string[];
  updated_at?: string;
  language?: string;
  website?: string;
}

async function codeberg(): Promise<void> {
  const { rows, total } = await cached(`codeberg-${CODEBERG_MIN_STARS}`, async () => {
    const out: GiteaRepo[] = [];
    let total: number | undefined;
    for (let page = 1; ; page++) {
      const res = await fetchJson<{ ok: boolean; data: GiteaRepo[] }>(`https://codeberg.org/api/v1/repos/search?sort=stars&order=desc&limit=50&page=${page}`);
      out.push(...res.data);
      if (!res.data.length || (res.data.at(-1)?.stars_count ?? 0) < CODEBERG_MIN_STARS) break;
      await sleep(500);
    }
    return { rows: out, total };
  }, 7);
  const items: Item[] = rows
    .filter((r) => r.stars_count >= CODEBERG_MIN_STARS && !r.fork && !r.archived && r.description && !isAdult([r.name, r.description], r.topics ?? []))
    .map((r) => makeItem({
      id: makeId('codeberg', r.full_name),
      name: r.name,
      kind: forgeKind(`${r.name} ${r.description} ${(r.topics ?? []).join(' ')}`),
      category: 'opensource',
      summary: summaryOf(r.description) ?? r.name,
      url: r.html_url,
      source: { name: 'Codeberg', url: 'https://codeberg.org/explore/repos' },
      metrics: { stars: r.stars_count, updatedAt: toDate(r.updated_at) },
      tags: tagify(['codeberg', r.language, ...(r.topics ?? []).slice(0, 8)]),
      preview: { type: 'repo', host: 'codeberg', repo: r.full_name, ...(r.language ? { language: r.language } : {}) },
      use: { install: `git clone ${r.html_url}.git` },
    }));
  writeCatalog('opensource', {
    id: 'codeberg',
    name: 'Codeberg 인기 저장소',
    url: 'https://codeberg.org/explore/repos',
    license: 'Repository metadata from the public Codeberg (Gitea) API. License is not exposed by the list API, so the field is left empty.',
    total,
    cut: `별 ${CODEBERG_MIN_STARS}개 이상, 포크·보관·설명 없는 저장소 제외 (전체 약 45만 개)`,
  }, items);
}

main(async () => {
  const only = process.argv[2];
  if (!only || only === 'gitlab') await gitlab();
  if (!only || only === 'codeberg') await codeberg();
});
