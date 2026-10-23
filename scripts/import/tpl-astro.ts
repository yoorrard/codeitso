// Astro 테마 갤러리(astro.build/themes)의 무료 테마 전체를 받아 템플릿 진열대에 쓴다.
//   node scripts/import/tpl-astro.ts
// 목록: Astro 개발자 포털의 공개 API(portal.astro.build/api/themes, astro.build 저장소의 갱신 스크립트가 쓰는 주소).
// 저장소·데모 주소는 테마 쪽(astro.build/themes/details/<slug>/)의 'Get started'·'Live demo' 링크에서 읽는다.
// 유료 테마(paid)는 싣지 않는다 (무료 재료 쇼핑몰). 별 수·라이선스는 repos.ecosyste.ms.
import {
  type Item, cached, decodeEntities, fetchJson, fetchText, githubSlug, main, makeId, makeItem, mapLimit, progress,
  repoMeta, summaryOf, tagify, templateKindByText, toDate, writeCatalog,
} from './oss-lib.ts';

interface PortalTheme {
  Theme: { id: number; slug: string; title: string; description?: string; image?: string; paid?: boolean; featured?: boolean; updatedAt?: string };
  Author?: { name?: string; url?: string };
}

interface Links {
  repo?: string;
  demo?: string;
}

export function parseThemeLinks(html: string): Links {
  const out: Links = {};
  for (const m of html.matchAll(/<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)) {
    const href = decodeEntities(m[1] as string);
    const text = (m[2] as string).replace(/<[^>]+>/g, '').trim().toLowerCase();
    if (/github\.com\/withastro\//.test(href)) continue;
    if (!out.repo && text.includes('get started')) out.repo = href;
    if (!out.demo && text.includes('live demo')) out.demo = href;
  }
  return out;
}

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; codeitso-catalog-import/1.0)' };

main(async () => {
  const all = await cached('astro-themes', () => fetchJson<PortalTheme[]>('https://portal.astro.build/api/themes'));
  const free = all.filter((t) => t.Theme.paid === false).sort((a, b) => (a.Theme.slug < b.Theme.slug ? -1 : 1));
  console.log(`  전체 ${all.length}, 무료 ${free.length}`);
  let done = 0;
  const links = await cached('astro-theme-links', async () => {
    const out: Record<string, Links> = {};
    await mapLimit(free, 4, async (t) => {
      try {
        out[t.Theme.slug] = parseThemeLinks(await fetchText(`https://astro.build/themes/details/${t.Theme.slug}/`, { headers: UA, retries: 3 }));
      } catch {
        out[t.Theme.slug] = {};
      }
      progress('쪽', ++done, free.length, 100);
    });
    return out;
  });
  let looked = 0;
  const items: Item[] = await mapLimit(free, 6, async (t) => {
    const l = links[t.Theme.slug] ?? {};
    const repo = l.repo ? githubSlug(l.repo) : undefined;
    const meta = repo ? await repoMeta(repo) : undefined;
    progress('저장소', ++looked, free.length, 100);
    const text = `${t.Theme.title} ${t.Theme.description ?? ''}`;
    const url = `https://astro.build/themes/details/${t.Theme.slug}/`;
    return makeItem({
      id: makeId('astro-themes', t.Theme.slug),
      name: t.Theme.title.trim(),
      kind: templateKindByText(text, t.Theme.title) ?? 'blog-portfolio',
      category: 'templates',
      summary: summaryOf(t.Theme.description) ?? t.Theme.title,
      url,
      source: { name: 'Astro Themes', url: 'https://astro.build/themes/' },
      license: meta?.license,
      metrics: { stars: meta?.stars, updatedAt: meta?.pushedAt ?? toDate(t.Theme.updatedAt) },
      tags: tagify(['astro', t.Theme.featured ? 'featured' : undefined, ...(meta?.topics ?? []).slice(0, 6)]),
      preview: {
        type: 'template',
        host: 'astro',
        ...(t.Theme.image ? { image: t.Theme.image } : {}),
        ...(l.demo ? { demo: l.demo } : {}),
        ...(l.repo ? { repo: l.repo } : {}),
        ...(t.Author?.name ? { author: t.Author.name } : {}),
      },
      use: repo ? { install: `npm create astro@latest -- --template ${repo}` } : undefined,
    });
  });
  writeCatalog('templates', {
    id: 'astro-themes',
    name: 'Astro Themes (무료)',
    url: 'https://astro.build/themes/',
    license: 'Theme titles, descriptions and links from the public Astro developer portal API and astro.build theme pages; each theme keeps its own repository license (field license, from repos.ecosyste.ms, CC BY-SA 4.0).',
    total: all.length,
    cut: '무료 테마만 (유료 테마는 싣지 않는다)',
    note: '설치 명령은 Astro 공식 문서의 GitHub 저장소 템플릿 꼴(npm create astro@latest -- --template <owner>/<repo>)이다.',
  }, items);
});
