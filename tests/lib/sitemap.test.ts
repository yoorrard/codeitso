// 사이트맵 (D136): 정적 쪽만, 절대 주소, XML 글자 이스케이프, 같은 주소는 한 번
import { describe, expect, it } from 'vitest';
import { PATHS } from '../../src/lib/routes.ts';
import { sitemapPaths, sitemapXml } from '../../src/lib/sitemap.ts';

const CATS = [
  { id: 'design', subcategories: [{ id: 'fonts' }, { id: 'icons' }] },
  { id: 'api', subcategories: [{ id: 'weather' }] },
];

describe('사이트맵', () => {
  it('홈·카테고리·대분류·소분류·키트·정보·법 문서를 넣고, 상세·검색·장바구니는 뺀다', () => {
    const p = sitemapPaths(CATS);
    expect(p).toContain('/');
    expect(p).toContain('/c/design');
    expect(p).toContain('/c/design/fonts');
    expect(p).toContain('/c/design/icons');
    expect(p).toContain('/c/api/weather');
    for (const k of ['categories', 'kits', 'terms', 'about', 'credits', 'legalTerms', 'privacy', 'notice', 'copyright'] as const) expect(p).toContain(PATHS[k]);
    for (const k of ['item', 'search', 'cart', 'prompts', 'recent'] as const) expect(p).not.toContain(PATHS[k]);
  });

  it('절대 주소로 쓰고 & 같은 글자를 이스케이프한다', () => {
    const xml = sitemapXml('https://codeitso.yoorrard.workers.dev', ['/', '/c/design', '/c/design', '/a?b=1&c=2']);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    expect(xml).toContain('<loc>https://codeitso.yoorrard.workers.dev/</loc>');
    expect(xml.match(/<loc>https:\/\/codeitso.yoorrard.workers.dev\/c\/design<\/loc>/g)).toHaveLength(1);
    expect(xml).toContain('/a?b=1&amp;c=2</loc>');
  });
});
