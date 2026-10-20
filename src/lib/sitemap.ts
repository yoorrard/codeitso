// 사이트맵 (L, D136): 검색 엔진에 알릴 정적 쪽 주소. 상품 상세(/item?id=)·검색·장바구니·지난 프롬프트·최근 본 재료는 넣지 않는다
// (쿼리로 그리는 쪽이거나 이용자 상태라서). 주소는 routes.ts 도우미로 만들고(바탕 포함), 사이트 주소와 합쳐 절대 주소로 쓴다.
import { ROUTES, categoryPath, listPath } from './routes.ts';

interface SitemapCategory {
  id: string;
  subcategories: readonly { id: string }[];
}

/** 사이트맵에 넣을 쪽 주소 (바탕을 붙인 경로). 홈 → 카테고리 → 대분류 → 소분류 → 키트 → 정보·법 문서 차례 */
export function sitemapPaths(categories: readonly SitemapCategory[]): string[] {
  return [
    ROUTES.home,
    ROUTES.categories,
    ...categories.flatMap((c) => [categoryPath(c.id), ...c.subcategories.map((s) => listPath(c.id, s.id))]),
    ROUTES.kits,
    ROUTES.terms,
    ROUTES.about,
    ROUTES.credits,
    ROUTES.legalTerms,
    ROUTES.privacy,
    ROUTES.notice,
    ROUTES.copyright,
  ];
}

const XML_ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/** sitemaps.org 0.9 꼴의 XML. 같은 주소는 한 번만 */
export function sitemapXml(site: string | URL, paths: readonly string[]): string {
  const urls = [...new Set(paths.map((p) => new URL(p, site).href))];
  const body = urls.map((u) => `  <url><loc>${u.replace(/[&<>"']/g, (c) => XML_ESC[c] ?? c)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
