// 사이트맵 /sitemap.xml (L, D136): 정적 쪽(홈·카테고리·대분류·소분류·키트·정보·법 문서)의 절대 주소. robots.txt가 정식일 때 이 주소를 알린다.
import type { APIRoute } from 'astro';
import { categories } from '../lib/catalog/site.ts';
import { sitemapPaths, sitemapXml } from '../lib/sitemap.ts';

export const GET: APIRoute = ({ site }) => {
  const body = site ? sitemapXml(site, sitemapPaths(categories())) : '';
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
