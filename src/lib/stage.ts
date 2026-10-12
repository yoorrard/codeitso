// 배포 단계 (T21·T22, D53): 미리 보기(preview)는 모든 화면 위에 '검토 중인 시험판' 띠와 noindex를 붙인다.
// 정식(release)은 빌드 때 PUBLIC_STAGE=release일 때만이고, 배포 작업이 그때 npm run validate:release를 먼저 통과시킨다.
export type Stage = 'preview' | 'release';

export const STAGE: Stage = import.meta.env.PUBLIC_STAGE === 'release' ? 'release' : 'preview';

/** 쿠키 없는 Cloudflare Web Analytics 사이트 토큰 (공개 값, 저장소 변수). 없으면 분석 스크립트를 싣지 않는다 (R-61) */
export const BEACON_TOKEN: string = typeof import.meta.env.PUBLIC_CF_BEACON_TOKEN === 'string' ? import.meta.env.PUBLIC_CF_BEACON_TOKEN.trim() : '';

/** 방문 통계를 싣지 않는 화면: 공유 상태가 주소에 있는 영수증 (R-04) */
export function analyticsAllowed(pathname: string): boolean {
  return BEACON_TOKEN !== '' && !/^\/receipt\/?$/.test(pathname);
}
