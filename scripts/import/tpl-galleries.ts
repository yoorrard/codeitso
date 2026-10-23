// 프레임워크·플랫폼 공식 템플릿 갤러리를 받아 템플릿 진열대에 쓴다 (갤러리마다 파일 하나).
//   node scripts/import/tpl-galleries.ts            (전부)
//   node scripts/import/tpl-galleries.ts hugo-themes (하나만)
// - nuxt-templates: nuxt.com/templates 자료(nuxt/nuxt.com의 content/templates/*.yml). 유료(purchase) 항목은 뺀다.
// - nuxt-starters: nuxi init -t 로 고르는 공식 스타터(nuxt/starter의 templates/*.json).
// - eleventy-starters: 11ty.dev/docs/starter 자료(11ty/11ty-website의 src/_data/starters/*.json).
// - hugo-themes: themes.gohugo.io 자료(gohugoio/hugoThemesSiteBuilder의 themes.txt와 저장소 정보 캐시).
// - azd-templates: Azure Developer CLI 템플릿 갤러리(Azure/awesome-azd의 website/static/templates.json).
// - netlify-templates: Netlify 공식 템플릿 조직(github.com/netlify-templates)의 저장소 전체.
// - html5up: HTML5 UP 무료 HTML 템플릿 전체. gatsby-starters: Gatsby 스타터 라이브러리.
import {
  type Item, type SourceInfo, type TplKind, decodeEntities, fetchJson, fetchText, gitCheckout, gitFiles, githubSlug, hostOf, isHttpUrl,
  main, makeId, makeItem, ownerRepos, parseSimpleYaml, readIfExists, repoMeta, repoPreview, summaryOf, tagify,
  templateKindByText, toDate, writeCatalog, mapLimit,
} from './oss-lib.ts';
import { join } from 'node:path';

type Gallery = { id: string; run: () => Promise<{ info: SourceInfo; items: Item[] }> };

const byText = (text: string, fallback: TplKind, name?: string): TplKind => templateKindByText(text, name) ?? fallback;

async function nuxtTemplates(): Promise<{ info: SourceInfo; items: Item[] }> {
  const dir = gitCheckout('nuxt/nuxt.com', ['/content/templates/*.yml'], 'main');
  const files = gitFiles(dir, 'content/templates').filter((f) => f.endsWith('.yml'));
  const rows = files.map((f) => parseSimpleYaml(readIfExists(join(dir, f)) ?? ''));
  const free = rows.filter((y) => typeof y.repo === 'string' && !y.purchase);
  const items = await mapLimit(free, 6, async (y) => {
    const repo = y.repo as string;
    const meta = await repoMeta(repo);
    const name = String(y.name ?? repo);
    const desc = String(y.description ?? '');
    return makeItem({
      id: makeId('nuxt-templates', String(y.slug ?? repo)),
      name,
      kind: byText(`${name} ${desc}`, 'web-starter', name),
      category: 'templates',
      summary: summaryOf(desc) ?? name,
      url: `https://github.com/${repo}`,
      source: { name: 'Nuxt Templates', url: 'https://nuxt.com/templates' },
      license: meta?.license,
      metrics: meta ? { stars: meta.stars, updatedAt: meta.pushedAt } : undefined,
      tags: tagify(['nuxt', 'vue', ...(meta?.topics ?? []).slice(0, 6)]),
      preview: { type: 'template', host: 'nuxt', repo: `https://github.com/${repo}`, ...(typeof y.demo === 'string' && isHttpUrl(y.demo) ? { demo: y.demo } : {}) },
      use: { install: `npx nuxi@latest init -t gh:${repo} my-app` },
    });
  });
  return {
    info: {
      id: 'nuxt-templates', name: 'Nuxt Templates', url: 'https://nuxt.com/templates',
      license: 'Template list from nuxt/nuxt.com (content/templates, MIT); each template keeps its own repository license.',
      total: rows.length, cut: '유료(purchase) 템플릿은 싣지 않는다',
    },
    items,
  };
}

async function nuxtStarters(): Promise<{ info: SourceInfo; items: Item[] }> {
  const dir = gitCheckout('nuxt/starter', ['/templates/**/*.json'], 'templates');
  const files = gitFiles(dir, 'templates').filter((f) => f.endsWith('.json')).sort();
  const items: Item[] = [];
  for (const f of files) {
    let j: Record<string, unknown>;
    try {
      j = JSON.parse(readIfExists(join(dir, f)) ?? '{}') as Record<string, unknown>;
    } catch {
      continue;
    }
    const name = typeof j.name === 'string' ? j.name : undefined;
    if (!name || /nightly|bridge|compat/.test(name)) continue; // 실험·옛 판 이음은 뺀다
    const repo = typeof j.repo === 'string' ? j.repo : undefined;
    const label = typeof j.label === 'string' ? j.label : name;
    const desc = typeof j.description === 'string' ? j.description : undefined;
    items.push(makeItem({
      id: makeId('nuxt-starters', name),
      name: `Nuxt starter: ${label}`,
      kind: byText(`${name} ${desc ?? ''}`, 'web-starter', name),
      category: 'templates',
      summary: summaryOf(desc) ?? `${label} (nuxi init -t ${name})`,
      url: typeof j.url === 'string' && isHttpUrl(j.url) ? j.url : repo ? `https://github.com/${repo}` : 'https://nuxt.new',
      source: { name: 'Nuxt starters (nuxi init)', url: 'https://github.com/nuxt/starter/tree/templates' },
      tags: tagify(['nuxt', 'vue', ...name.split('-')]),
      preview: { type: 'template', host: 'nuxt', ...(repo ? { repo: `https://github.com/${repo}` } : {}) },
      use: { install: `npx nuxi@latest init -t ${name} my-app`, docs: 'https://nuxt.com/docs/api/commands/init' },
    }));
  }
  return {
    info: { id: 'nuxt-starters', name: 'Nuxt 공식 스타터 (nuxi init)', url: 'https://github.com/nuxt/starter/tree/templates', license: 'Template registry of nuxt/starter (MIT).' },
    items,
  };
}

async function eleventyStarters(): Promise<{ info: SourceInfo; items: Item[] }> {
  const dir = gitCheckout('11ty/11ty-website', ['/src/_data/starters/*.json'], 'main');
  const files = gitFiles(dir, 'src/_data/starters').filter((f) => f.endsWith('.json')).sort();
  const rows = files.map((f) => {
    try {
      return JSON.parse(readIfExists(join(dir, f)) ?? '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }).filter((j) => typeof j.url === 'string' && typeof j.name === 'string' && !j.disabled);
  const items = await mapLimit(rows, 6, async (j) => {
    const url = j.url as string;
    const repo = githubSlug(url);
    const meta = repo ? await repoMeta(repo) : undefined;
    const name = j.name as string;
    const desc = typeof j.description === 'string' ? j.description : meta?.description;
    return makeItem({
      id: makeId('eleventy-starters', repo ?? name),
      name,
      kind: byText(`${name} ${desc ?? ''}`, 'blog-portfolio', name),
      category: 'templates',
      summary: summaryOf(desc) ?? name,
      url,
      source: { name: 'Eleventy starter projects', url: 'https://www.11ty.dev/docs/starter/' },
      license: meta?.license,
      metrics: meta ? { stars: meta.stars, updatedAt: meta.pushedAt } : undefined,
      tags: tagify(['eleventy', '11ty', ...(meta?.topics ?? []).slice(0, 6)]),
      preview: { type: 'template', host: 'eleventy', repo: url, ...(typeof j.demo === 'string' && isHttpUrl(j.demo) ? { demo: j.demo } : {}), ...(typeof j.author === 'string' ? { author: j.author } : {}) },
      use: repo ? { install: `git clone https://github.com/${repo}.git` } : undefined,
    });
  });
  return {
    info: { id: 'eleventy-starters', name: 'Eleventy 스타터', url: 'https://www.11ty.dev/docs/starter/', license: 'Starter list from 11ty/11ty-website (src/_data/starters, MIT); each starter keeps its own license.' },
    items,
  };
}

interface HugoRepoCache {
  description?: string;
  html_url?: string;
  stargazers_count?: number;
  updated_at?: string;
  name?: string;
}

async function hugoThemes(): Promise<{ info: SourceInfo; items: Item[] }> {
  const dir = gitCheckout('gohugoio/hugoThemesSiteBuilder', ['/themes.txt', '/cmd/hugothemesitebuilder/build/cache/githubrepos.json'], 'main');
  const modules = (readIfExists(join(dir, 'themes.txt')) ?? '').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const cache = JSON.parse(readIfExists(join(dir, 'cmd/hugothemesitebuilder/build/cache/githubrepos.json')) ?? '{}') as Record<string, HugoRepoCache>;
  const items = await mapLimit(modules, 6, async (mod) => {
    const c = cache[mod] ?? {};
    const host = mod.split('/')[0] ?? '';
    const path = mod.split('/').slice(1, 3).join('/');
    const url = c.html_url || `https://${mod.split('/').slice(0, 3).join('/')}`;
    const repo = host === 'github.com' ? githubSlug(url) ?? path : undefined;
    const meta = repo ? await repoMeta(repo) : undefined;
    const name = (mod.split('/').at(-1) ?? mod).replace(/^hugo-?theme-?|-hugo-?theme$|^hugo-/i, '') || mod;
    const desc = c.description || meta?.description;
    if (!desc) return undefined;
    const text = `${name} ${desc} ${(meta?.topics ?? []).join(' ')}`;
    return makeItem({
      id: makeId('hugo-themes', mod.replace(/^(github\.com|gitlab\.com|codeberg\.org)\//, '').split('/').slice(0, 2).join('/')),
      name,
      kind: byText(text, 'blog-portfolio', name),
      category: 'templates',
      summary: summaryOf(desc) ?? name,
      url,
      source: { name: 'Hugo Themes', url: 'https://themes.gohugo.io/' },
      license: meta?.license,
      metrics: { stars: meta?.stars ?? c.stargazers_count, updatedAt: meta?.pushedAt ?? toDate(c.updated_at) },
      tags: tagify(['hugo', ...(meta?.topics ?? []).filter((t) => !/^hugo/.test(t)).slice(0, 6)]),
      preview: { type: 'template', host: hostOf(url) || host, repo: url, module: mod },
      use: { install: `hugo mod get ${mod}`, docs: 'https://gohugo.io/hugo-modules/use-modules/' },
    });
  });
  return {
    info: {
      id: 'hugo-themes', name: 'Hugo Themes', url: 'https://themes.gohugo.io/',
      license: 'Theme module list and repository cache from gohugoio/hugoThemesSiteBuilder (Apache-2.0); each theme keeps its own license.',
      total: modules.length, cut: '설명이 없는 테마는 뺀다',
    },
    items: items.filter((x): x is Item => !!x),
  };
}

interface AzdTemplate {
  id: string;
  title: string;
  description?: string;
  source?: string;
  author?: string;
  tags?: string[];
  languages?: string[];
  frameworks?: string[];
  azureServices?: string[];
  IaC?: string[];
  preview?: string;
}

async function azdTemplates(): Promise<{ info: SourceInfo; items: Item[] }> {
  const dir = gitCheckout('Azure/awesome-azd', ['/website/static/templates.json'], 'main');
  const rows = JSON.parse(readIfExists(join(dir, 'website/static/templates.json')) ?? '[]') as AzdTemplate[];
  const usable = rows.filter((t) => t.source && isHttpUrl(t.source) && t.title);
  const items = await mapLimit(usable, 6, async (t) => {
    const repo = githubSlug(t.source as string);
    const meta = repo ? await repoMeta(repo) : undefined;
    const text = `${t.title} ${t.description ?? ''} ${(t.tags ?? []).includes('ai') ? 'ai' : ''}`;
    return makeItem({
      id: makeId('azd-templates', repo ?? t.id),
      name: t.title,
      kind: byText(text, 'backend', t.title),
      category: 'templates',
      summary: summaryOf(t.description) ?? t.title,
      url: t.source as string,
      source: { name: 'Azure Developer CLI templates (awesome-azd)', url: 'https://azure.github.io/awesome-azd/' },
      license: meta?.license,
      metrics: meta ? { stars: meta.stars, updatedAt: meta.pushedAt } : undefined,
      tags: tagify(['azure', 'azd', ...(t.tags ?? []).filter((x) => x !== 'msft' && x !== 'community'), ...(t.languages ?? []), ...(t.frameworks ?? [])]),
      preview: {
        type: 'template', host: 'azure', repo: t.source,
        ...(t.author ? { author: t.author } : {}),
        ...((t.tags ?? []).includes('msft') ? { official: true } : {}),
        ...(t.azureServices?.length ? { services: t.azureServices.slice(0, 8) } : {}),
      },
      use: { install: `azd init -t ${repo ?? t.source}`, docs: 'https://learn.microsoft.com/azure/developer/azure-developer-cli/azd-templates' },
    });
  });
  return {
    info: { id: 'azd-templates', name: 'Azure Developer CLI 템플릿 갤러리', url: 'https://azure.github.io/awesome-azd/', license: 'Gallery data from Azure/awesome-azd (MIT); each template keeps its own repository license.' },
    items,
  };
}

async function netlifyTemplates(): Promise<{ info: SourceInfo; items: Item[] }> {
  const repos = (await ownerRepos('netlify-templates')).filter((r) => !r.fork && !r.archived && r.description && !/^\.github$/.test(r.fullName.split('/')[1] ?? ''));
  const items = repos.map((r) => makeItem({
    id: makeId('netlify-templates', r.fullName),
    name: r.fullName.split('/')[1] ?? r.fullName,
    kind: byText(`${r.fullName} ${r.description} ${r.topics.join(' ')}`, 'web-starter', r.fullName.split('/')[1]),
    category: 'templates',
    summary: summaryOf(r.description) ?? r.fullName,
    url: `https://github.com/${r.fullName}`,
    source: { name: 'Netlify Templates', url: 'https://github.com/netlify-templates' },
    license: r.license,
    metrics: { stars: r.stars, updatedAt: r.pushedAt },
    tags: tagify(['netlify', ...r.topics.slice(0, 6)]),
    preview: repoPreview(r),
    use: { install: `git clone https://github.com/${r.fullName}.git`, docs: `https://app.netlify.com/start/deploy?repository=https://github.com/${r.fullName}` },
  }));
  return {
    info: { id: 'netlify-templates', name: 'Netlify 공식 템플릿', url: 'https://www.netlify.com/integrations/templates/', license: 'Repository metadata of the netlify-templates GitHub organization via repos.ecosyste.ms (CC BY-SA 4.0); each template keeps its own license.', cut: '포크·보관된 저장소는 뺀다' },
    items,
  };
}

// HTML5 UP: 반응형 HTML5·CSS3 무료 템플릿 (사이트 전체가 CC BY 3.0으로 배포한다고 html5up.net/license에 적혀 있다).
// 목록 쪽에서 이름·데모·다운로드 수·그림을, 템플릿 쪽의 meta description에서 설명을 읽는다.
async function html5up(): Promise<{ info: SourceInfo; items: Item[] }> {
  const UA = { 'user-agent': 'Mozilla/5.0 (compatible; codeitso-catalog-import/1.0)' };
  const html = await fetchText('https://html5up.net/', { headers: UA });
  const rows = [...html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)].map((m) => {
    const a = m[1] as string;
    const slug = a.match(/href="\/([a-z0-9-]+)"/)?.[1];
    const title = a.match(/<h2>([^<]+)<\/h2>/)?.[1];
    const downloads = a.match(/Download <em>\(([\d,]+)\)<\/em>/)?.[1];
    const image = a.match(/data-src="([^"]+)"/)?.[1];
    return slug && title ? { slug, title, downloads: downloads ? Number(downloads.replace(/,/g, '')) : undefined, image } : undefined;
  }).filter((x): x is { slug: string; title: string; downloads: number | undefined; image: string | undefined } => !!x);
  const items = await mapLimit(rows, 4, async (r) => {
    let desc: string | undefined;
    try {
      const page = await fetchText(`https://html5up.net/${r.slug}`, { headers: UA, retries: 3 });
      desc = page.match(/<meta name="description" content="([^"]*)"/)?.[1];
    } catch {
      desc = undefined;
    }
    const summary = summaryOf(desc ? decodeEntities(desc) : undefined);
    return makeItem({
      id: makeId('html5up', r.slug),
      name: r.title,
      kind: byText(`${r.title} ${summary ?? ''}`, 'html', r.title),
      category: 'templates',
      summary: summary ?? `${r.title}: responsive HTML5 and CSS3 site template designed by @ajlkn.`,
      url: `https://html5up.net/${r.slug}`,
      source: { name: 'HTML5 UP', url: 'https://html5up.net/' },
      license: 'CC-BY-3.0',
      metrics: { downloads: r.downloads },
      tags: tagify(['html', 'css', 'responsive']),
      preview: { type: 'template', host: 'html5up', demo: `https://html5up.net/${r.slug}`, ...(r.image ? { image: `https://html5up.net/${r.image.replace(/^\//, '')}` } : {}) },
      use: { install: `curl -L -o ${r.slug}.zip https://html5up.net/${r.slug}/download` },
    });
  });
  return {
    info: {
      id: 'html5up', name: 'HTML5 UP', url: 'https://html5up.net/',
      license: 'Template names, demo links and download counts from html5up.net; all HTML5 UP templates are released under CC BY 3.0 (html5up.net/license).',
      note: '설명은 템플릿 쪽의 meta description(만든 이의 소개 글)이다. 없는 경우 사이트 소개 문장을 쓴다.',
    },
    items,
  };
}

// Gatsby 스타터 라이브러리(gatsbyjs.com/starters): 사이트가 만들어 둔 쪽 자료(page-data.json)에 목록이 다 들어 있다.
interface GatsbyStarter {
  title: string;
  starterFields?: { description?: string; features?: string; repoUrl?: string; url?: string };
}

async function gatsbyStarters(): Promise<{ info: SourceInfo; items: Item[] }> {
  const j = await fetchJson<{ result: { data: { allWpStarter: { nodes: GatsbyStarter[] } } } }>('https://www.gatsbyjs.com/page-data/starters/page-data.json', {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; codeitso-catalog-import/1.0)' },
  });
  const nodes = j.result.data.allWpStarter.nodes.filter((n) => n.starterFields?.repoUrl && isHttpUrl(n.starterFields.repoUrl));
  const items = await mapLimit(nodes, 6, async (n) => {
    const f = n.starterFields ?? {};
    const repo = githubSlug(f.repoUrl as string);
    const meta = repo ? await repoMeta(repo) : undefined;
    const name = n.title.split('/').pop() ?? n.title;
    return makeItem({
      id: makeId('gatsby-starters', repo ?? n.title),
      name,
      kind: byText(`${name.replace(/-/g, ' ')} ${f.description ?? ''}`, 'web-starter', name.replace(/-/g, ' ')),
      category: 'templates',
      summary: summaryOf(f.description) ?? name,
      url: f.repoUrl as string,
      source: { name: 'Gatsby Starters', url: 'https://www.gatsbyjs.com/starters/' },
      license: meta?.license,
      metrics: meta ? { stars: meta.stars, updatedAt: meta.pushedAt } : undefined,
      tags: tagify(['gatsby', 'react', ...(meta?.topics ?? []).slice(0, 6)]),
      preview: { type: 'template', host: 'gatsby', repo: f.repoUrl, ...(f.url && isHttpUrl(f.url) ? { demo: f.url } : {}) },
      use: repo ? { install: `npx gatsby new my-site https://github.com/${repo}` } : undefined,
    });
  });
  return {
    info: { id: 'gatsby-starters', name: 'Gatsby Starters', url: 'https://www.gatsbyjs.com/starters/', license: 'Starter list from the gatsbyjs.com starters page data; each starter keeps its own repository license (field license).' },
    items,
  };
}

const GALLERIES: Gallery[] = [
  { id: 'html5up', run: html5up },
  { id: 'gatsby-starters', run: gatsbyStarters },
  { id: 'nuxt-templates', run: nuxtTemplates },
  { id: 'nuxt-starters', run: nuxtStarters },
  { id: 'eleventy-starters', run: eleventyStarters },
  { id: 'hugo-themes', run: hugoThemes },
  { id: 'azd-templates', run: azdTemplates },
  { id: 'netlify-templates', run: netlifyTemplates },
];

main(async () => {
  const only = process.argv[2];
  for (const g of GALLERIES) {
    if (only && g.id !== only) continue;
    try {
      const { info, items } = await g.run();
      writeCatalog('templates', info, items);
    } catch (err) {
      console.error(`✘ ${g.id}: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }
});
