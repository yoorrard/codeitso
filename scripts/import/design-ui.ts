// 디자인 > UI 컴포넌트 라이브러리·CSS 프레임워크·애니메이션·차트 라이브러리·shadcn 레지스트리·디자인 시스템 가져오기.
//   node scripts/import/design-ui.ts                    전부
//   node scripts/import/design-ui.ts --only=repos       하나만 (repos, shadcn, design-systems, design-md)
// 저장소 찾기: 손으로 고른 씨앗(design-ui-seeds.ts) + awesome 목록의 해당 부분 + GitHub 주제 검색(토큰이 있을 때).
// 저장소 정보: gh → GITHUB_TOKEN → repos.ecosyste.ms. 설치 명령: 공식 문서(씨앗) 또는 packages.ecosyste.ms의 가장 많이 받는 npm·pub 꾸러미.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  type Item, type RepoMeta, OUT_DIR, cmp, fetchJson, fetchRaw, fetchText, main, makeItem, mapLimit, progress, repoMeta,
  searchTopic, siteMeta, siteSummary, slugify, writeCatalog,
} from './design-lib.ts';
import { AWESOME, SEEDS, TOPICS, type UiKind } from './design-ui-seeds.ts';

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const want = (k: string) => !only || only.includes(k);

// 별 기준: 씨앗은 기준 없음, awesome 목록에서 온 것은 300개, 주제 검색은 1000개 이상.
const MIN_STARS_AWESOME = 300;
const MIN_STARS_TOPIC = 1000;
const TOPIC_SNAPSHOT = join(OUT_DIR, 'github-topics-snapshot.json');

interface Candidate { repo: string; kind: UiKind; tags: Set<string>; from: Set<string>; install?: string; listDesc?: string }

const GH_LINK = /https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?=[)\s/#?"'>\]]|$)/g;
const NOT_REPO_OWNERS = new Set(['sponsors', 'topics', 'orgs', 'marketplace', 'features', 'collections', 'about', 'apps', 'settings', 'login', 'site']);

function cleanRepo(owner: string, name: string): string | undefined {
  const n = name.replace(/\.git$/, '');
  if (NOT_REPO_OWNERS.has(owner.toLowerCase()) || !n || n === '.' || n === '..') return undefined;
  return `${owner}/${n}`;
}

// 마크다운에서 제목 이름으로 부분을 잘라 그 안의 GitHub 저장소 링크를 모은다.
export function sectionRepos(md: string, title: string): { repo: string; desc?: string }[] {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^(#{1,6})\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`).test(l.trim()));
  if (start < 0) return [];
  const level = (lines[start]?.match(/^#+/)?.[0].length ?? 2);
  const out: { repo: string; desc?: string }[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i] as string;
    const h = l.match(/^(#{1,6})\s/);
    if (h && (h[1] as string).length <= level) break;
    for (const m of l.matchAll(GH_LINK)) {
      const repo = cleanRepo(m[1] as string, m[2] as string);
      if (!repo) continue;
      const desc = l.split(/\)\s*[-–—:]\s*/)[1]?.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim();
      out.push({ repo, desc: desc || undefined });
    }
  }
  return out;
}

function addCandidate(map: Map<string, Candidate>, repo: string, kind: UiKind, tags: string[], from: string, extra: Partial<Candidate> = {}): void {
  const key = repo.toLowerCase();
  const c = map.get(key);
  if (c) {
    tags.forEach((t) => c.tags.add(t));
    c.from.add(from);
    if (!c.install && extra.install) c.install = extra.install;
    if (!c.listDesc && extra.listDesc) c.listDesc = extra.listDesc;
    return;
  }
  map.set(key, { repo, kind, tags: new Set(tags), from: new Set([from]), install: extra.install, listDesc: extra.listDesc });
}

interface EcoPackage { ecosystem: string; name: string; downloads: number | null; repository_url?: string }

async function topPackage(repo: string): Promise<{ install: string; downloads: number } | undefined> {
  const res = await fetchRaw(`https://packages.ecosyste.ms/api/v1/packages/lookup?repository_url=${encodeURIComponent(`https://github.com/${repo}`)}`, { allowStatus: [404], retries: 3 }).catch(() => undefined);
  if (!res || res.status !== 200) {
    await res?.body?.cancel();
    return undefined;
  }
  const list = (await res.json()) as EcoPackage[];
  const best = list
    .filter((p) => (p.ecosystem === 'npm' || p.ecosystem === 'pub') && (p.downloads ?? 0) > 0)
    .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))[0];
  if (!best) return undefined;
  return { install: best.ecosystem === 'pub' ? `flutter pub add ${best.name}` : `npm install ${best.name}`, downloads: best.downloads ?? 0 };
}

// 주제 검색으로 온 저장소는 주제가 넓어서(테스트 도구, 앱 등이 섞인다) 설명·주제 낱말로 한 번 더 거르고 종류를 다시 정한다.
function topicKind(defaultKind: UiKind, meta: RepoMeta): UiKind | undefined {
  const text = `${meta.description} ${meta.topics.join(' ')}`.toLowerCase();
  if (/\b(chart|charts|charting|data-visualization|visuali[sz]ation|graph)\b/.test(text)) return 'charts';
  if (/\b(animation|animations|motion|transition|lottie|spinner|reveal)\b/.test(text) && !/component-library|ui-kit|ui-library/.test(text)) return 'animation';
  if (/css-framework/.test(text) && !/component-library/.test(text)) return 'css-frameworks';
  if (/\b(ui|component|components|design[- ]system|kit|widget|widgets|tailwind|css|headless|primitives)\b/.test(text)) return defaultKind;
  return undefined;
}

// 저장소 이름만으로는 알아보기 어려운 것(ui, react, core …)은 '소유자/이름'으로 보여 준다.
const GENERIC_NAMES = new Set(['ui', 'react', 'core', 'components', 'primitives', 'themes', 'web', 'kit', 'design', 'library', 'lib', 'uikit', 'css', 'frontend', 'packages', 'base', 'framework', 'icons', 'charts', 'react-ui', 'vue', 'svelte', 'angular']);
function displayName(full: string): string {
  const name = full.split('/')[1] as string;
  return GENERIC_NAMES.has(name.toLowerCase()) || name.length <= 3 ? full : name;
}

const KIND_SOURCE_NOTE: Record<UiKind, string> = {
  'ui-libraries': 'UI component libraries and kits',
  'css-frameworks': 'CSS frameworks and styling tools',
  animation: 'Animation libraries (CSS, JS, Lottie, Rive, 3D)',
  charts: 'Chart and data-visualisation libraries',
};

async function importRepos(): Promise<void> {
  console.log('UI 저장소 모으기');
  const cands = new Map<string, Candidate>();
  for (const seed of SEEDS) addCandidate(cands, seed.repo, seed.kind, seed.tags, 'seed', { install: seed.install });

  const listLicenses: string[] = [];
  for (const a of AWESOME) {
    const md = await fetchText(`https://raw.githubusercontent.com/${a.repo}/${a.branch}/README.md`).catch(() => '');
    if (!md) {
      console.log(`  ! awesome 목록을 못 읽음 ${a.repo}`);
      continue;
    }
    const meta = await repoMeta(a.repo).catch(() => undefined);
    listLicenses.push(`${a.repo} (${meta?.license ?? 'no license file'})`);
    let n = 0;
    for (const [title, kind] of Object.entries(a.sections)) {
      for (const r of sectionRepos(md, title)) {
        addCandidate(cands, r.repo, kind, a.tags, `awesome:${a.repo}`, { listDesc: r.desc });
        n++;
      }
    }
    console.log(`  ${a.repo}: 링크 ${n}개`);
  }

  // 주제 검색: 되면 새로 받아 스냅숏에 쓰고, 안 되면 마지막 스냅숏을 쓴다.
  const snapshot: { takenAt?: string; topics: Record<string, string[]> } = existsSync(TOPIC_SNAPSHOT)
    ? (JSON.parse(readFileSync(TOPIC_SNAPSHOT, 'utf8')) as { takenAt?: string; topics: Record<string, string[]> })
    : { topics: {} };
  let live = 0;
  for (const [topic, def] of Object.entries(TOPICS)) {
    const res = await searchTopic(topic, MIN_STARS_TOPIC);
    const names = res.available ? res.names.slice(0, 100) : (snapshot.topics[topic] ?? []);
    if (res.available) {
      snapshot.topics[topic] = names;
      live++;
    }
    for (const r of names) addCandidate(cands, r, def.kind, def.tags, `topic:${topic}`);
  }
  if (live) {
    snapshot.takenAt = new Date().toISOString().slice(0, 10);
    writeFileSync(TOPIC_SNAPSHOT, `${JSON.stringify({ takenAt: snapshot.takenAt, topics: Object.fromEntries(Object.entries(snapshot.topics).sort(([a], [b]) => cmp(a, b))) }, null, 2)}\n`);
  }
  console.log(`  주제 검색: ${live ? `새로 ${live}개 주제` : `스냅숏 사용 (${snapshot.takenAt ?? '없음'})`}`);
  console.log(`  후보 저장소 ${cands.size}개`);

  const list = [...cands.values()];
  let done = 0;
  const rows = await mapLimit(list, 6, async (c) => {
    const meta = await repoMeta(c.repo).catch(() => undefined);
    progress('저장소 정보', ++done, list.length);
    return { c, meta };
  });

  const kept: { c: Candidate; meta: RepoMeta }[] = [];
  const dropped = { missing: 0, fork: 0, archived: 0, stars: 0, offTopic: 0 };
  const seenFull = new Set<string>();
  for (const { c, meta } of rows) {
    if (!meta) {
      dropped.missing++;
      if (c.from.has('seed')) console.log(`  ! 씨앗 저장소를 못 찾음: ${c.repo}`);
      continue;
    }
    if (seenFull.has(meta.fullName.toLowerCase())) continue; // 이름이 바뀐 저장소가 두 번 잡힌 경우
    const isSeed = c.from.has('seed');
    if (meta.fork && !isSeed) { dropped.fork++; continue; }
    if (meta.archived && !isSeed) { dropped.archived++; continue; }
    const fromAwesome = [...c.from].some((f) => f.startsWith('awesome:'));
    const min = isSeed ? 0 : fromAwesome ? MIN_STARS_AWESOME : MIN_STARS_TOPIC;
    if (meta.stars < min) { dropped.stars++; continue; }
    if (!isSeed && !fromAwesome) {
      const k = topicKind(c.kind, meta);
      if (!k) { dropped.offTopic++; continue; }
      c.kind = k;
    }
    seenFull.add(meta.fullName.toLowerCase());
    kept.push({ c, meta });
  }
  console.log(`  남김 ${kept.length}개 / 뺌: 없는 저장소 ${dropped.missing}, 포크 ${dropped.fork}, 보관됨 ${dropped.archived}, 별 부족 ${dropped.stars}, 주제 밖 ${dropped.offTopic}`);

  done = 0;
  const pkgs = await mapLimit(kept, 6, async ({ c }) => {
    const p = await topPackage(c.repo);
    progress('설치 꾸러미', ++done, kept.length);
    return p;
  });

  const byKind = new Map<UiKind, Item[]>();
  kept.forEach(({ c, meta }, i) => {
    const pkg = pkgs[i];
    const full = meta.fullName;
    const lang = meta.language ? [slugify(meta.language)] : [];
    const item = makeItem({
      id: `github:${full.toLowerCase()}`,
      name: displayName(full),
      kind: c.kind,
      summary: meta.description || c.listDesc || `${full} on GitHub`,
      url: meta.homepage && /^https?:\/\//.test(meta.homepage) ? meta.homepage : `https://github.com/${full}`,
      source: { name: 'GitHub', url: `https://github.com/${full}` },
      license: meta.license,
      metrics: { stars: meta.stars, downloads: pkg?.downloads, updatedAt: meta.pushedAt },
      tags: [...c.tags, ...lang, ...meta.topics.slice(0, 12), ...(meta.archived ? ['archived'] : [])],
      preview: {
        type: 'repo', fullName: full, stars: meta.stars, language: meta.language, license: meta.license,
        topics: meta.topics.slice(0, 12), image: `https://opengraph.githubassets.com/1/${full}`,
        foundIn: [...c.from].sort(cmp),
      },
      use: { install: c.install ?? pkg?.install, docs: meta.homepage && /^https?:\/\//.test(meta.homepage) ? meta.homepage : `https://github.com/${full}#readme` },
    });
    const arr = byKind.get(c.kind) ?? [];
    arr.push(item);
    byKind.set(c.kind, arr);
  });

  for (const kind of ['ui-libraries', 'css-frameworks', 'animation', 'charts'] as UiKind[]) {
    writeCatalog(
      {
        id: `github-${kind}`,
        name: `${KIND_SOURCE_NOTE[kind]} (GitHub)`,
        url: 'https://github.com',
        license: `Repository metadata (description, stars, license, topics) from GitHub via ${kept[0]?.meta.via === 'ecosystems' ? 'repos.ecosyste.ms (CC BY-SA 4.0 data mirror of GitHub)' : 'the GitHub REST API'}; each library keeps its own license (field license). Discovery lists: ${listLicenses.join('; ')}.`,
        note: `Found via hand-picked seeds, awesome-list sections and GitHub topic search (${live ? 'live' : `snapshot ${snapshot.takenAt ?? 'n/a'}`}). Kept: seeds always; awesome-list repos with ≥${MIN_STARS_AWESOME} stars; topic repos with ≥${MIN_STARS_TOPIC} stars; forks and archived repos dropped unless hand-picked. metrics.downloads = last-month downloads of the repo's most-downloaded npm/pub package (packages.ecosyste.ms); use.install = that package unless the official docs command was hand-copied.`,
      },
      byKind.get(kind) ?? [],
    );
  }
}

// ---------- shadcn/ui 레지스트리 디렉터리와 공식 컴포넌트 ----------

interface ShadcnRegistry {
  name: string; homepage: string; url: string; description?: string;
  health?: { status?: string; score?: number }; ranking?: { score?: number; itemCount?: number };
}

async function importShadcn(): Promise<void> {
  console.log('shadcn/ui 레지스트리');
  const regs = await fetchJson<ShadcnRegistry[]>('https://ui.shadcn.com/r/registries.json');
  const usable = regs.filter((r) => r.health?.status !== 'unavailable');
  const totalItems = usable.reduce((n, r) => n + (r.ranking?.itemCount ?? 0), 0);
  const items: Item[] = usable.map((r) => {
    const slug = slugify(r.name.replace(/^@/, '')) || 'registry';
    return makeItem({
      id: `shadcn-registry:${slug}`,
      name: r.name,
      kind: 'ui-registries',
      summary: r.description?.trim() || `${r.name} shadcn/ui registry (${r.homepage}).`,
      url: r.homepage,
      source: { name: 'shadcn/ui registry directory', url: 'https://ui.shadcn.com/docs/directory' },
      tags: ['shadcn', 'registry', 'react', ...(r.health?.status && r.health.status !== 'healthy' ? [r.health.status] : [])],
      preview: {
        type: 'site', url: r.homepage, registryUrl: r.url, itemCount: r.ranking?.itemCount, healthScore: r.health?.score,
        rankingScore: r.ranking?.score, health: r.health?.status,
      },
      use: { install: `npx shadcn@latest add ${r.name}/<component>`, docs: 'https://ui.shadcn.com/docs/directory' },
    });
  });
  writeCatalog(
    {
      id: 'shadcn-registries',
      name: 'shadcn/ui registry directory',
      url: 'https://ui.shadcn.com/docs/directory',
      license: 'Directory data from ui.shadcn.com/r/registries.json (shadcn/ui, MIT). Each registry\'s components keep their own license — check the registry site.',
      note: `${regs.length} registries listed; ${regs.length - usable.length} marked unavailable by the directory's health check were skipped. Individual components of community registries (${totalItems} in total) are not listed one by one: the directory gives no per-component popularity, so each registry is one item with preview.itemCount.`,
    },
    items,
  );

  console.log('shadcn/ui 공식 컴포넌트');
  type IndexItem = { name: string; type: string; meta?: { links?: Record<string, { docs?: string }> } };
  const index = await fetchJson<IndexItem[]>('https://ui.shadcn.com/r/index.json');
  let done = 0;
  const comps = await mapLimit(index, 6, async (c) => {
    const docs = `https://ui.shadcn.com/docs/components/${c.name}`;
    const meta = await siteMeta(docs);
    progress('컴포넌트', ++done, index.length);
    const title = c.name.split('-').map((w) => (w[0]?.toUpperCase() ?? '') + w.slice(1)).join(' ');
    return makeItem({
      id: `shadcn:${c.name}`,
      name: `${title} (shadcn/ui)`,
      kind: 'ui-blocks',
      summary: meta.ok && meta.description && !/^Beautifully designed components/i.test(meta.description) ? meta.description : siteSummary(title, docs, meta),
      url: docs,
      source: { name: 'shadcn/ui', url: 'https://ui.shadcn.com' },
      license: 'MIT',
      tags: ['shadcn', 'react', 'tailwind', 'component', slugify(c.type.replace('registry:', ''))],
      preview: { type: 'site', url: docs },
      use: { install: `npx shadcn@latest add ${c.name}`, docs },
    });
  });
  writeCatalog(
    { id: 'shadcn-components', name: 'shadcn/ui components', url: 'https://ui.shadcn.com/docs/components', license: 'MIT (shadcn/ui). Component list from ui.shadcn.com/r/index.json; summaries from each docs page.' },
    comps,
  );
}

// ---------- 디자인 시스템 (awesome-design-systems 표 + 손으로 더한 것) ----------

const EXTRA_DESIGN_SYSTEMS: { name: string; url: string; repo?: string; summaryKo: string }[] = [
  { name: 'KRDS 범정부 UI/UX 디자인 시스템', url: 'https://www.krds.go.kr', summaryKo: '한국 정부·공공 누리집이 함께 쓰는 디자인 시스템. 색·글꼴(Pretendard GOV)·컴포넌트·접근성 기준이 있다.' },
  { name: 'Material Design 3', url: 'https://m3.material.io', summaryKo: '구글 머티리얼 디자인 3판(Material You) 가이드.' },
  { name: 'Apple Human Interface Guidelines', url: 'https://developer.apple.com/design/human-interface-guidelines', summaryKo: '애플 기기용 앱 화면 설계 지침.' },
  { name: 'GOV.UK Design System', url: 'https://design-system.service.gov.uk', repo: 'alphagov/govuk-frontend', summaryKo: '영국 정부 서비스 디자인 시스템. 접근성 좋은 양식 패턴으로 유명하다.' },
  { name: 'U.S. Web Design System (USWDS)', url: 'https://designsystem.digital.gov', repo: 'uswds/uswds', summaryKo: '미국 연방 정부 웹 디자인 시스템.' },
];

async function importDesignSystems(): Promise<void> {
  console.log('디자인 시스템');
  const md = await fetchText('https://raw.githubusercontent.com/alexpate/awesome-design-systems/master/README.md');
  const rows: { name: string; url: string; components: boolean; voice: boolean; kit: boolean; code?: string }[] = [];
  for (const line of md.split('\n')) {
    const cells = line.split('|').map((x) => x.trim());
    const link = cells[1]?.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (!link) continue;
    const code = cells[5]?.match(/\((https?:\/\/[^)]+)\)/)?.[1];
    rows.push({ name: link[1] as string, url: link[2] as string, components: !!cells[2], voice: !!cells[3], kit: !!cells[4], code });
  }
  const listMeta = await repoMeta('alexpate/awesome-design-systems').catch(() => undefined);
  let done = 0;
  const items = await mapLimit(rows, 6, async (r) => {
    const meta = await siteMeta(r.url);
    progress('사이트', ++done, rows.length);
    return { r, meta };
  });
  const out: Item[] = [];
  const used = new Set<string>();
  for (const { r, meta } of items) {
    let slug = slugify(r.name);
    while (used.has(slug)) slug = `${slug}-2`;
    used.add(slug);
    out.push(makeItem({
      id: `design-systems:${slug}`,
      name: r.name,
      kind: 'design-systems',
      summary: siteSummary(r.name, r.url, meta),
      url: r.url,
      source: { name: 'awesome-design-systems', url: 'https://github.com/alexpate/awesome-design-systems' },
      tags: [
        'design-system', ...(r.components ? ['components'] : []), ...(r.voice ? ['voice-and-tone'] : []),
        ...(r.kit ? ['designers-kit'] : []), ...(r.code ? ['source-code'] : []), ...(meta.ok ? [] : ['link-check-failed']),
      ],
      preview: { type: 'site', url: r.url, ...(r.code ? { sourceCode: r.code } : {}), linkStatus: meta.status },
      use: { docs: r.url },
    }));
  }
  for (const e of EXTRA_DESIGN_SYSTEMS) {
    const meta = await siteMeta(e.url);
    if (!meta.ok) console.log(`  ! 주소 확인 실패 ${meta.status} ${e.url}`);
    const id = `design-systems:${slugify(e.name)}`;
    const host = (u: string) => new URL(u).hostname.replace(/^www\./, '');
    if (out.some((x) => x.id === id || host(x.url) === host(e.url))) continue;
    out.push(makeItem({
      id,
      name: e.name,
      kind: 'design-systems',
      summary: siteSummary(e.name, e.url, meta),
      summaryKo: e.summaryKo,
      written: 'codeshopper',
      url: e.url,
      source: { name: e.name, url: e.url },
      tags: ['design-system', 'guidelines', ...(e.name.startsWith('KRDS') ? ['korea', 'government', 'accessibility'] : [])],
      preview: { type: 'site', url: e.url, ...(e.repo ? { sourceCode: `https://github.com/${e.repo}` } : {}) },
      use: { docs: e.url },
    }));
  }
  const failed = out.filter((x) => x.tags.includes('link-check-failed')).length;
  writeCatalog(
    {
      id: 'design-systems',
      name: 'Design systems (awesome-design-systems + hand-picked)',
      url: 'https://github.com/alexpate/awesome-design-systems',
      license: `List from alexpate/awesome-design-systems (${listMeta?.license ?? 'see repo'}); summaries are each site's own meta description.`,
      note: `${rows.length} rows in the list; ${failed} failed the link check today (kept with tag link-check-failed so they can be reviewed, not hidden).`,
    },
    out,
  );
}

// ---------- DESIGN.md 모음 (AI 코딩 도구에 주는 디자인 설명서) ----------

async function importDesignMd(): Promise<void> {
  console.log('DESIGN.md 모음');
  const md = await fetchText('https://raw.githubusercontent.com/voltagent/awesome-design-md/main/README.md');
  const listMeta = await repoMeta('voltagent/awesome-design-md').catch(() => undefined);
  const items: Item[] = [];
  let section = '';
  const used = new Set<string>();
  for (const line of md.split('\n')) {
    const h = line.match(/^###\s+(.+)$/);
    if (h) { section = (h[1] as string).trim(); continue; }
    const m = line.match(/^- \[\*\*(.+?)\*\*\]\((https?:\/\/[^)]+)\)\s*[-–—]\s*(.+)$/);
    if (!m || !section || /how to use/i.test(section)) continue;
    const [, brand, url, desc] = m as unknown as [string, string, string, string];
    let slug = slugify(brand);
    while (used.has(slug)) slug = `${slug}-2`;
    used.add(slug);
    items.push(makeItem({
      id: `design-md:${slug}`,
      name: `${brand} DESIGN.md`,
      kind: 'design-md',
      summary: `${brand} — ${desc.trim()}`,
      url,
      source: { name: 'awesome-design-md (VoltAgent)', url: 'https://github.com/VoltAgent/awesome-design-md' },
      license: listMeta?.license ?? 'MIT',
      metrics: listMeta ? { stars: listMeta.stars } : undefined,
      tags: ['design-md', 'ai-agent', slugify(section)],
      preview: { type: 'prompt', format: 'DESIGN.md', brand, section },
      use: { docs: url },
    }));
  }
  writeCatalog(
    {
      id: 'design-md',
      name: 'DESIGN.md collection (awesome-design-md)',
      url: 'https://github.com/VoltAgent/awesome-design-md',
      license: `List from VoltAgent/awesome-design-md (${listMeta?.license ?? 'MIT'}); descriptions quoted from the list. Each DESIGN.md is an analysis of a public website's look; brand names belong to their owners.`,
      note: 'DESIGN.md is a plain-text design-system file format introduced by Google Stitch for AI agents. metrics.stars = stars of the list repository (same for every row).',
    },
    items,
  );
}

await main('design-ui', async () => {
  if (want('repos')) await importRepos();
  if (want('shadcn')) await importShadcn();
  if (want('design-systems')) await importDesignSystems();
  if (want('design-md')) await importDesignMd();
});
