// 사이트 주소는 이 파일 한 곳에서 정한다 (docs/CONCEPT.md 2절, D56). 화면 코드에 주소를 직접 쓰지 않는다.
// 옛 주소는 public/_redirects가 301로 넘긴다. 이 파일의 REDIRECTS와 같은지 시험이 확인한다.

export const ROUTES = {
  home: '/',
  testDrive: '/test-drive',
  destination: '/destination',
  waypoints: '/waypoints',
  check: '/check',
  arrival: '/arrival',
  tools: '/tools',
  terms: '/terms',
  courses: '/courses',
  dictionary: '/dictionary',
  about: '/about',
  criteria: '/about/criteria',
  credits: '/about/credits',
  privacy: '/legal/privacy',
  notice: '/legal/notice',
} as const;

/** 도구 상세 */
export function toolPath(id: string): string {
  return `${ROUTES.tools}/${encodeURIComponent(id)}`;
}

/** 용어 카드 */
export function termPath(id: string): string {
  return `${ROUTES.terms}/${encodeURIComponent(id)}`;
}

/** 경유지 단계에서 고를 것 하나를 펼친 채로 */
export function waypointPath(slotId?: string): string {
  return slotId ? `${ROUTES.waypoints}?slot=${encodeURIComponent(slotId)}` : ROUTES.waypoints;
}

/** 옛 주소 → 새 주소 (배포 전이지만 미리 보기 링크와 e2e를 지키려고 넘긴다). :id는 Cloudflare _redirects 자리 표시 */
export const REDIRECTS: readonly (readonly [string, string])[] = [
  ['/lesson', ROUTES.testDrive],
  ['/interview', ROUTES.destination],
  ['/shop', ROUTES.waypoints],
  ['/receipt', ROUTES.arrival],
  ['/shelf', ROUTES.tools],
  ['/products/:id', `${ROUTES.tools}/:id`],
  ['/concepts/:id', `${ROUTES.terms}/:id`],
  ['/study', ROUTES.terms],
  ['/recipes', ROUTES.courses],
  ['/about/scoring', ROUTES.criteria],
];
