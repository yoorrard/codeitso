// 사이트 주소는 이 파일 한 곳에서 정한다. 화면 코드에 주소를 직접 쓰지 않는다 (품질 바닥선 base-path 규칙).
// 주소 바탕(base path, D81): 빌드 변수 PUBLIC_BASE_PATH → astro.config.mjs의 base → import.meta.env.BASE_URL.
// 기본(Cloudflare)은 루트 '/'라 주소가 그대로이고, GitHub Pages 같은 하위 주소(/code-chauffeur)면 모든 주소 앞에 바탕이 붙는다.
// v5 (D103): 진열대 /c/<대분류>, 장바구니 /cart(공유 #s=), 영수증 /receipt?id=·/receipts, 목록 /c/<대분류>/<소분류>?sort=&page=, 상세 /item?id=, 자료 /catalog/list/…·/catalog/item/<n>.json
// (자료 JSON은 scripts/catalog/build.ts가 public/catalog/에 만든다)
import type { Selection } from './catalog/facets.ts';
import { writeSelection } from './catalog/facets.ts';
import type { SortKey } from './catalog/types.ts';
import { shareFragment } from './share.ts';

// e2e·Node 스크립트처럼 Vite 밖에서 이 파일을 읽으면 import.meta.env가 없으므로 루트로 본다
const ENV_BASE: string = import.meta.env?.BASE_URL ?? '/';

/** 바탕을 '' 또는 '/이름' 꼴로 (끝 빗금 없이). '/'와 ''는 루트 = '' */
export function normalizeBase(base: string): string {
  const b = base.trim().replace(/\/+$/, '');
  if (b === '') return '';
  return b.startsWith('/') ? b : `/${b}`;
}

/** 이 빌드의 주소 바탕. 루트면 '' */
export const BASE_PATH: string = normalizeBase(ENV_BASE);

/**
 * 사이트 안 주소(/로 시작)에 바탕을 붙인다. 루트면 그대로 돌려준다.
 * '/'로 시작하지 않는 것(#…·바깥 주소)은 건드리지 않는다.
 */
export function withBase(path: string, base: string = BASE_PATH): string {
  const b = normalizeBase(base);
  if (b === '' || !path.startsWith('/')) return path;
  return `${b}${path}`;
}

/** 사이트 첫 주소(끝 빗금 없이) = origin + 바탕 */
export function siteRoot(origin?: string, base: string = BASE_PATH): string {
  const o = (origin ?? (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/+$/, '');
  return `${o}${normalizeBase(base)}`;
}

/** 사이트 주소(site)와 바탕을 합친 절대 주소 (robots.txt·공유 그림처럼 바깥에서 읽는 곳) */
export function absoluteUrl(site: string | URL, path: string, base: string = BASE_PATH): string {
  return new URL(withBase(path, base), site).href;
}

function based<T extends Record<string, string>>(paths: T): { readonly [K in keyof T]: string } {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(paths)) out[k] = withBase(v);
  return out as { readonly [K in keyof T]: string };
}

/** 바탕을 붙이기 전 주소. 화면은 ROUTES를 쓰고, 이것은 바탕을 따로 붙이는 곳(시험)만 쓴다 */
export const PATHS = {
  home: '/',
  search: '/search',
  cart: '/cart',
  receipt: '/receipt',
  receipts: '/receipts',
  item: '/item',
  terms: '/terms',
  about: '/about',
  credits: '/about/credits',
  privacy: '/legal/privacy',
  notice: '/legal/notice',
} as const;

/** 화면 주소 (바탕을 붙인 것) */
export const ROUTES = based(PATHS);

/** public/ 파일과 빌드가 만드는 끝점 (바탕을 붙인 것) */
export const FILES = based({
  favicon: '/favicon.ico',
  appleTouchIcon: '/apple-touch-icon.png',
  icon192: '/icon-192.png',
  icon512: '/icon-512.png',
  iconMaskable: '/icon-maskable-512.png',
  og: '/og.png',
  cart: '/brand/cart.webp',
  cartNight: '/brand/cart-night.webp',
  wordmark: '/brand/wordmark.webp',
  wordmarkNight: '/brand/wordmark-night.webp',
  manifest: '/manifest.webmanifest',
  glossary: '/glossary.json',
  searchMeta: '/catalog/search/meta.json',
  event: '/api/event',
});

/** 대분류 쪽 */
export function categoryPath(cat: string): string {
  return withBase(`/c/${encodeURIComponent(cat)}`);
}

/** 목록 쪽: 기본(인기순 1쪽, 거르기 없음)은 주소에 붙이지 않는다. 거르기는 칸 이름=값 (같은 칸 여러 값은 되풀이) */
export function listPath(cat: string, sub: string, sort: SortKey = 'popular', page = 1, sel: Selection = {}): string {
  const q = new URLSearchParams();
  writeSelection(q, sel);
  if (sort !== 'popular') q.set('sort', sort);
  if (page > 1) q.set('page', String(page));
  const qs = q.toString();
  return withBase(`/c/${encodeURIComponent(cat)}/${encodeURIComponent(sub)}${qs ? `?${qs}` : ''}`);
}

/** 상품 상세 */
export function itemPath(id: string): string {
  return `${ROUTES.item}?id=${encodeURIComponent(id)}`;
}

/** 영수증 한 장 (지난 영수증에서 연다, 저장은 이 브라우저에만) */
export function receiptPath(id: string): string {
  return `${ROUTES.receipt}?id=${encodeURIComponent(id)}`;
}

/** 장바구니 공유 링크 (바탕을 붙인 경로 + #s=…, 재료 id만). 바깥에 줄 때는 siteRoot와 합친다 (shareUrl) */
export function sharePath(ids: readonly string[]): string {
  return `${ROUTES.cart}#${shareFragment(ids)}`;
}

/** 장바구니 공유 링크 (절대 주소) */
export function shareUrl(ids: readonly string[], origin?: string): string {
  return `${siteRoot(origin, '')}${sharePath(ids)}`;
}

/** 검색 결과: 대분류 하나만(cat)·쪽 번호는 고른 때만 */
export function searchPath(q: string, cat?: string, page = 1): string {
  const p = new URLSearchParams({ q });
  if (cat) p.set('cat', cat);
  if (cat && page > 1) p.set('page', String(page));
  return `${ROUTES.search}?${p.toString().replace(/\+/g, '%20')}`;
}

/** 검색 낱말 조각 (진열대 빌드가 만드는 JSON) */
export function searchShardPath(n: number): string {
  return withBase(`/catalog/search/t-${n}.json`);
}

/** 검색 결과 카드 블록 */
export function searchBlockPath(cat: string, k: number): string {
  return withBase(`/catalog/search/b-${cat}-${k}.json`);
}

/** 거르기 파일 (값마다 자리 목록) */
export function facetDataPath(cat: string, sub: string): string {
  return withBase(`/catalog/facet/${cat}/${sub}.json`);
}

/** 거르기용 정렬 순서 파일 (이름순·최근 갱신순) */
export function facetOrderPath(cat: string, sub: string, sort: Exclude<SortKey, 'popular'>): string {
  return withBase(`/catalog/facet/${cat}/${sub}-${sort}.json`);
}

/** 용어 사전의 한 용어 */
export function termPath(id: string): string {
  return `${ROUTES.terms}#${encodeURIComponent(id)}`;
}

/** 목록 자료 파일 하나 (진열대 빌드가 만드는 JSON, 8쪽씩 묶음. chunk는 0부터) */
export function listDataPath(cat: string, sub: string, sort: SortKey, chunk: number): string {
  return withBase(`/catalog/list/${cat}/${sub}/${sort}-${chunk}.json`);
}

/** 상세 자료 조각 (진열대 빌드가 만드는 JSON) */
export function itemDataPath(shard: number): string {
  return withBase(`/catalog/item/${shard}.json`);
}

/** 주소에서 바탕을 뗀다 ('/code-chauffeur/cart' → '/cart'). 바탕 밖 주소는 그대로 */
export function stripBase(pathname: string, base: string = BASE_PATH): string {
  const b = normalizeBase(base);
  if (b === '') return pathname;
  if (pathname === b) return '/';
  return pathname.startsWith(`${b}/`) ? pathname.slice(b.length) : pathname;
}
