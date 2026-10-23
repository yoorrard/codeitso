// 배포 단계 (T21·T22, D53): 미리 보기(preview)는 바닥글에 시험판 안내 한 줄과 noindex를 붙인다.
// 정식(release)은 빌드 변수 PUBLIC_STAGE=release이거나 저장소 설정(src/lib/site-config.ts의 stage)이 release일 때다 (D136).
// 정식 빌드 지킴(L-04)은 scripts/lib/build-guard.ts가 맡는다 (astro.config.mjs에서 부름).
import { BASE_PATH, stripBase } from './routes.ts';
import type { Stage } from './site-config.ts';
import { resolveStage } from './site-config.ts';

export type { Stage };

export const STAGE: Stage = resolveStage(import.meta.env.PUBLIC_STAGE);

/**
 * 호스트 종류 (설계서 9.4절, D81): cloudflare(기본) = 익명 집계 /api/event와 방문 통계가 있는 곳,
 * static = 서버 없는 정적 호스트(GitHub Pages 같은 곳). static이면 집계를 보내지 않고 방문 통계도 싣지 않는다.
 */
export type Host = 'cloudflare' | 'static';

export const HOST: Host = import.meta.env.PUBLIC_HOST === 'static' ? 'static' : 'cloudflare';

/** 쿠키 없는 Cloudflare Web Analytics 사이트 토큰 (공개 값, 저장소 변수). 없으면 분석 스크립트를 싣지 않는다 (R-61) */
export const BEACON_TOKEN: string = typeof import.meta.env.PUBLIC_CF_BEACON_TOKEN === 'string' ? import.meta.env.PUBLIC_CF_BEACON_TOKEN.trim() : '';

/** 방문 통계를 싣지 않는 화면: 담은 것·프롬프트가 보이는 장바구니와 지난 프롬프트 쪽, 찜한 재료(N1), 옛 영수증 주소 (R-04, 공유 링크가 주소에 들 수 있다). 정적 호스트와 토큰이 없을 때는 어디에도 싣지 않는다 */
export function analyticsAllowed(pathname: string, host: Host = HOST, token: string = BEACON_TOKEN, base: string = BASE_PATH): boolean {
  return host === 'cloudflare' && token !== '' && !/^\/(cart|prompts|receipts?|wishlist)\/?$/.test(stripBase(pathname, base));
}
