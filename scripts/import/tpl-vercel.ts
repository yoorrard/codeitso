// Vercel 템플릿 갤러리(vercel.com/templates) 전체를 받아 템플릿 진열대에 쓴다.
//   node scripts/import/tpl-vercel.ts
// 목록 API가 없어 공식 사이트맵(vercel.com/sitemap.xml, robots.txt가 /templates 수집을 허용)에서 템플릿 주소를 모두 모으고,
// 쪽마다 이름·설명·저장소·데모·그림과 Use Cases·Stack 꼬리표를 읽는다. 저장소 별 수는 repos.ecosyste.ms에서.
import {
  type Item, type TplKind, cached, decodeEntities, fetchText, githubSlug, main, makeId, makeItem, mapLimit, progress,
  repoMeta, summaryOf, tagify, templateKindByText, writeCatalog,
} from './oss-lib.ts';

const BASE = 'https://vercel.com';

interface VercelTemplate {
  url: string;
  path: string; // <분류>/<slug>
  name: string;
  description: string;
  githubUrl?: string;
  demoUrl?: string;
  thumbnailUrl?: string;
  useCases: string[];
  stack: string[];
  owner?: string;
}

// 쪽의 RSC 자료에서 "fields":{...} 덩어리와 옆 칸 꼬리표를 읽는다.
export function parseTemplatePage(html: string, url: string, path: string): VercelTemplate | undefined {
  const s = html.replace(/\\"/g, '"');
  const fm = s.match(/"fields":(\{"cdnRoutingRuleHref"[\s\S]*?"thumbnailUrl":"[^"]*"\})/) ?? s.match(/"fields":(\{[^{}]*"slug":"[^"]*"[^{}]*\})/);
  let fields: Record<string, unknown> = {};
  if (fm?.[1]) {
    try {
      fields = JSON.parse(fm[1]) as Record<string, unknown>;
    } catch {
      fields = {};
    }
  }
  const str = (k: string) => (typeof fields[k] === 'string' && (fields[k] as string).trim() ? (fields[k] as string).trim() : undefined);
  const meta = (p: string) => s.match(new RegExp(`<meta (?:name|property)="${p}" content="([^"]*)"`))?.[1];
  const name = str('name') ?? (meta('og:title') ? decodeEntities(meta('og:title') as string) : undefined);
  const description = str('description') ?? (meta('description') ? decodeEntities(meta('description') as string) : undefined);
  if (!name || !description) return undefined;
  const facet = (label: string): string[] => {
    const i = s.indexOf(`font-medium">${label}</span>`);
    if (i < 0) return [];
    const rest = s.slice(i, i + 6000);
    const end = rest.indexOf('<span class="text-gray-1000 text-md', 20);
    return [...rest.slice(0, end > 0 ? end : undefined).matchAll(/href="\.\.\/([^"/]+)"/g)].map((m) => m[1] as string).filter((x) => x !== 'none');
  };
  const owner = s.match(/font-medium">Owner<\/span>[\s\S]{0,600}?>([A-Za-z0-9_.-]+)</)?.[1];
  const thumb = str('thumbnailUrl');
  return {
    url,
    path,
    name,
    description,
    githubUrl: str('githubUrl'),
    demoUrl: str('demoUrl'),
    thumbnailUrl: thumb ? (thumb.startsWith('//') ? `https:${thumb}` : thumb) : undefined,
    useCases: [...new Set(facet('Use Cases'))],
    stack: [...new Set(facet('Stack'))],
    owner,
  };
}

const KIND_BY_USE_CASE: [RegExp, TplKind][] = [
  [/^(ai|agents?|chatbot)/, 'ai-app'],
  [/^(ecommerce|commerce)/, 'ecommerce'],
  [/^(saas|multi-tenant-apps|subscription|billing)/, 'saas'],
  [/^(admin-dashboard|dashboards?|analytics|observability)/, 'admin'],
  [/^(portfolio|blog)/, 'blog-portfolio'],
  [/^(documentation|docs)/, 'docs-site'],
  [/^(marketing-sites|landing|virtual-event)/, 'landing'],
  [/^(cms)/, 'blog-portfolio'],
  [/^(backend|api|edge-functions|edge-middleware|cron|functions|vercel-functions|workflow|queues)/, 'backend'],
  [/^(slack|discord|telegram|bots?)/, 'bot'],
  [/^(game)/, 'game'],
];

// 이름·설명 낱말을 먼저 보고(가장 구체적), 없으면 Vercel의 Use Cases, 그것도 없으면 웹앱 기본 스타터.
export function kindFor(t: Pick<VercelTemplate, 'useCases' | 'stack' | 'name' | 'description' | 'path'>): TplKind {
  const byText = templateKindByText(`${t.name} ${t.description}`, t.name);
  if (byText) return byText;
  for (const uc of t.useCases) for (const [re, k] of KIND_BY_USE_CASE) if (re.test(uc)) return k;
  return 'web-starter';
}

main(async () => {
  const sitemap = await fetchText(`${BASE}/sitemap.xml`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; codeshopper-catalog-import/1.0)' } });
  const urls = [...new Set([...sitemap.matchAll(/<loc>(https:\/\/vercel\.com\/templates\/[^<]+)<\/loc>/g)].map((m) => m[1] as string))]
    .filter((u) => u.replace(`${BASE}/templates/`, '').split('/').length === 2 && !u.includes('/templates/page/'))
    .sort();
  console.log(`  사이트맵의 템플릿 쪽 ${urls.length}`);
  let done = 0;
  const pages = await cached('vercel-templates', async () => {
    const out = await mapLimit(urls, 4, async (u) => {
      const path = u.replace(`${BASE}/templates/`, '');
      try {
        const html = await fetchText(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; codeshopper-catalog-import/1.0)' }, retries: 3 });
        return parseTemplatePage(html, u, path) ?? null;
      } catch (err) {
        console.warn(`  실패 ${u}: ${err instanceof Error ? err.message : err}`);
        return null;
      } finally {
        progress('쪽', ++done, urls.length, 100);
      }
    });
    return out.filter((x): x is VercelTemplate => x !== null);
  });
  // 같은 템플릿이 여러 분류 주소로 나오면 하나로 (저장소 주소 또는 이름 기준).
  const unique = new Map<string, VercelTemplate>();
  for (const p of pages) {
    if (p.path.startsWith('page/') || !p.githubUrl) continue; // 목록 쪽 번호·저장소 없는 쪽은 템플릿이 아니다
    const slug = p.path.split('/')[1] ?? p.path;
    if (!unique.has(slug)) unique.set(slug, p);
  }
  const list = [...unique.values()];
  let looked = 0;
  const items: Item[] = await mapLimit(list, 6, async (t) => {
    const slug = t.path.split('/')[1] ?? t.path;
    const repo = t.githubUrl ? githubSlug(t.githubUrl) : undefined;
    const isRepoRoot = !!t.githubUrl && /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(t.githubUrl);
    const meta = repo ? await repoMeta(repo) : undefined;
    progress('저장소', ++looked, list.length, 100);
    return makeItem({
      id: makeId('vercel', slug),
      name: t.name,
      kind: kindFor(t),
      category: 'templates',
      summary: summaryOf(t.description) ?? t.name,
      url: t.url,
      source: { name: 'Vercel Templates', url: `${BASE}/templates` },
      license: meta?.license,
      metrics: meta ? { stars: meta.stars, updatedAt: meta.pushedAt } : undefined,
      tags: tagify([...t.useCases, ...t.stack]),
      preview: {
        type: 'template',
        host: 'vercel',
        ...(t.thumbnailUrl ? { image: t.thumbnailUrl } : {}),
        ...(t.demoUrl ? { demo: t.demoUrl } : {}),
        ...(t.githubUrl ? { repo: t.githubUrl } : {}),
        ...(t.stack.length ? { stack: t.stack } : {}),
        ...(t.useCases.length ? { useCases: t.useCases } : {}),
        ...(t.owner ? { owner: t.owner } : {}),
      },
      use: isRepoRoot && t.githubUrl ? { install: `git clone ${t.githubUrl.replace(/\/$/, '')}.git` } : undefined,
    });
  });
  writeCatalog('templates', {
    id: 'vercel',
    name: 'Vercel Templates',
    url: `${BASE}/templates`,
    license: 'Template names, descriptions, links and tags as published on vercel.com/templates (collected from the public sitemap; robots.txt allows /templates). Each template keeps its own repository license (field license, from repos.ecosyste.ms, CC BY-SA 4.0).',
    note: '같은 템플릿이 여러 분류 주소에 걸리면 하나만 남긴다. 그림(image)은 Vercel이 쓰는 CDN 주소다.',
  }, items);
});
