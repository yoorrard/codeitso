// 사이트 주소는 이 파일 한 곳에서 정한다 (docs/CONCEPT.md 2절, D56). 화면 코드에 주소를 직접 쓰지 않는다.
// 주소 바탕(base path, 설계서 9.4절, D81): 빌드 변수 PUBLIC_BASE_PATH → astro.config.mjs의 base → import.meta.env.BASE_URL.
// 기본(Cloudflare)은 루트 '/'라 주소가 그대로이고, GitHub Pages 같은 하위 주소(/code-chauffeur)면 모든 주소 앞에 바탕이 붙는다.
// 품질 바닥선(scripts/guard/floor-rules.ts)이 src/components·src/lib에서 이 파일 밖의 사이트 안 주소 글자를 막는다.

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
 * 홈 '/'는 '/code-chauffeur/'처럼 끝 빗금을 둔다(바탕 폴더의 index.html). '/'로 시작하지 않는 것(#…·바깥 주소)은 건드리지 않는다.
 */
export function withBase(path: string, base: string = BASE_PATH): string {
  const b = normalizeBase(base);
  if (b === '' || !path.startsWith('/')) return path;
  return `${b}${path}`;
}

/** 사이트 첫 주소(끝 빗금 없이) = origin + 바탕. 영수증 링크·설계도 속 용어 주소의 앞부분 (브라우저에서는 origin을 생략) */
export function siteRoot(origin?: string, base: string = BASE_PATH): string {
  const o = (origin ?? (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/+$/, '');
  return `${o}${normalizeBase(base)}`;
}

/** 사이트 주소(site)와 바탕을 합친 절대 주소 (robots.txt·사이트맵·공유 그림처럼 바깥에서 읽는 곳) */
export function absoluteUrl(site: string | URL, path: string, base: string = BASE_PATH): string {
  return new URL(withBase(path, base), site).href;
}

function based<T extends Record<string, string>>(paths: T): { readonly [K in keyof T]: string } {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(paths)) out[k] = withBase(v);
  return out as { readonly [K in keyof T]: string };
}

/** 바탕을 붙이기 전 주소. 화면은 ROUTES를 쓰고, 이것은 바탕을 따로 붙이는 곳(영수증 링크·시험)만 쓴다 */
export const PATHS = {
  home: '/',
  testDrive: '/test-drive',
  destination: '/destination',
  waypoints: '/waypoints',
  check: '/check',
  arrival: '/arrival',
  tools: '/tools',
  terms: '/terms',
  courses: '/courses',
  receipts: '/receipts',
  dictionary: '/dictionary',
  about: '/about',
  criteria: '/about/criteria',
  credits: '/about/credits',
  privacy: '/legal/privacy',
  notice: '/legal/notice',
} as const;

/** 화면 주소 (바탕을 붙인 것) */
export const ROUTES = based(PATHS);

/** public/ 파일과 빌드가 만드는 끝점 (바탕을 붙인 것) */
export const FILES = based({
  favicon: '/favicon.ico',
  icon: '/icon.svg',
  appleTouchIcon: '/apple-touch-icon.png',
  icon192: '/icon-192.png',
  icon512: '/icon-512.png',
  iconMaskable: '/icon-maskable-512.png',
  manifest: '/manifest.webmanifest',
  searchIndex: '/search-index.json',
  glossary: '/glossary.json',
  glossaryTools: '/glossary-tools.json',
  event: '/api/event',
});

/** 도구 상세 */
export function toolPath(id: string): string {
  return `${ROUTES.tools}/${encodeURIComponent(id)}`;
}

/** 용어 카드 */
export function termPath(id: string): string {
  return `${ROUTES.terms}/${encodeURIComponent(id)}`;
}

/** 도구 고르기 단계에서 고를 것 하나를 펼친 채로. write면 그 칸의 '목록에 없는 도구 쓰기' 칸까지 펼친다 (T37, 막힌 곳에서) */
export function waypointPath(slotId?: string, write = false): string {
  if (!slotId) return ROUTES.waypoints;
  return `${ROUTES.waypoints}?slot=${encodeURIComponent(slotId)}${write ? '&write=1' : ''}`;
}

/** 주소에서 바탕을 뗀다 ('/code-chauffeur/arrival' → '/arrival'). 바탕 밖 주소는 그대로 */
export function stripBase(pathname: string, base: string = BASE_PATH): string {
  const b = normalizeBase(base);
  if (b === '') return pathname;
  if (pathname === b) return '/';
  return pathname.startsWith(`${b}/`) ? pathname.slice(b.length) : pathname;
}
