// 사이트 주소는 이 파일 한 곳에서 정한다. 화면 코드에 주소를 직접 쓰지 않는다 (품질 바닥선 base-path 규칙).
// 주소 바탕(base path, D81): 빌드 변수 PUBLIC_BASE_PATH → astro.config.mjs의 base → import.meta.env.BASE_URL.
// 기본(Cloudflare)은 루트 '/'라 주소가 그대로이고, GitHub Pages 같은 하위 주소(/code-chauffeur)면 모든 주소 앞에 바탕이 붙는다.
// v5 (D103): 진열대 /c/<대분류>, 목록 /c/<대분류>/<소분류>?sort=&page=, 상세 /item?id=, 자료 /catalog/list/…·/catalog/item/<n>.json
// (자료 JSON은 scripts/catalog/build.ts가 public/catalog/에 만든다)
import type { SortKey } from './catalog/types.ts';

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
  searchLite: '/catalog/search-lite.json',
  event: '/api/event',
});

/** 대분류 쪽 */
export function categoryPath(cat: string): string {
  return withBase(`/c/${encodeURIComponent(cat)}`);
}

/** 목록 쪽: 기본(인기순 1쪽)은 주소에 붙이지 않는다 */
export function listPath(cat: string, sub: string, sort: SortKey = 'popular', page = 1): string {
  const q = new URLSearchParams();
  if (sort !== 'popular') q.set('sort', sort);
  if (page > 1) q.set('page', String(page));
  const qs = q.toString();
  return withBase(`/c/${encodeURIComponent(cat)}/${encodeURIComponent(sub)}${qs ? `?${qs}` : ''}`);
}

/** 상품 상세 */
export function itemPath(id: string): string {
  return `${ROUTES.item}?id=${encodeURIComponent(id)}`;
}

/** 검색 결과 */
export function searchPath(q: string): string {
  return `${ROUTES.search}?q=${encodeURIComponent(q)}`;
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
