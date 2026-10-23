// 이용 가이드 (O1, D138): 처음 방문 가이드가 저절로 열리는 쪽과 가이드에 싣는 말. 순수 함수만 (DOM 없음, 시험 있음).
// 가이드를 여는 일은 src/lib/tour.ts, 그리는 일은 src/components/Tour.tsx(늦게 불러온다)가 한다.

/** 가이드가 저절로 열리는 쪽: 둘러보는 쪽(처음 화면·카테고리·목록·검색·상세·스타터 키트).
 *  장바구니(공유 링크로 받기)·비교·찜·지난 프롬프트·법 문서·소개·용어 사전처럼 할 일을 들고 온 쪽은 막지 않는다 */
const AUTO = [/^\/$/, /^\/c(\/.*)?$/, /^\/search$/, /^\/item$/, /^\/kits$/];

/** 바탕을 뗀 주소(pathname)가 가이드를 저절로 열 쪽인지. 끝 빗금은 보지 않는다 */
export function tourAutoPath(path: string): boolean {
  const p = path === '/' ? '/' : path.replace(/\/+$/, '').replace(/\.html$/, '') || '/';
  return AUTO.some((re) => re.test(p));
}

/** 가이드의 걸음 (순서대로). 문구는 ko.tour.steps의 같은 이름 */
export const TOUR_STEPS = ['welcome', 'categories', 'search', 'kits', 'add', 'prompt', 'words', 'drag'] as const;
export type TourStep = (typeof TOUR_STEPS)[number];

/** '꼭 알아 둘 바이브코딩 말' 걸음에 싣는 용어 (data/glossary.json id). 풀이는 용어 자료에서 그대로 가져온다 */
export const TOUR_TERMS = ['vibe-coding', 'prompt', 'ai-agent', 'mcp', 'agent-skill', 'api', 'api-key', 'framework', 'template', 'license'] as const;

/** 걸음 번호를 0 ~ 마지막 사이로 */
export function clampStep(n: number): number {
  return Math.min(Math.max(Math.trunc(Number.isFinite(n) ? n : 0), 0), TOUR_STEPS.length - 1);
}
