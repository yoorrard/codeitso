// 사이트 설정 (L, D136): 저장소에 두는 비밀 아닌 값. 배포 화면(빌드 변수)을 건드리지 않고 운영자 정보를 싣고 정식 공개를 켠다.
// 운영자 이름과 문의 메일은 소유자가 사이트에 밝히기로 한 값이다(2026-10-20). 빌드 변수가 있으면 그것이 먼저다:
// PUBLIC_SITE_URL·PUBLIC_CONTACT_EMAIL은 값이 있으면 덮어쓰고, 단계는 빌드 변수와 이 설정 중 하나라도 release면 정식이다.
// astro.config.mjs(Node)와 화면(stage.ts·feedback.ts)이 같이 읽으므로 import.meta.env를 쓰지 않는 순수 값·함수만 둔다.

export type Stage = 'preview' | 'release';

export interface SiteConfig {
  /** 정식 공개 스위치. 'preview' → 'release' 한 줄로 바꾼다 (docs/DEPLOY.md '정식 공개 스위치') */
  stage: Stage;
  /** 대표 주소 (끝 빗금 없이) */
  url: string;
  /** 운영자(개인정보 보호책임자) 이름 */
  operator: string;
  /** 문의 메일 */
  email: string;
  /** 저작권 표시의 첫해 */
  since: number;
}

export const SITE_CONFIG: SiteConfig = {
  stage: 'preview',
  url: 'https://codeitso.yoorrard.workers.dev',
  operator: '유영재',
  email: 'yyj19962004@gmail.com',
  since: 2026,
};

/** 빌드 변수의 단계와 설정의 단계 중 하나라도 release면 정식 */
export function resolveStage(envStage: string | undefined, config: Stage = SITE_CONFIG.stage): Stage {
  return envStage === 'release' || config === 'release' ? 'release' : 'preview';
}

/** 빌드 변수에 값이 있으면 그것, 없으면 설정 값 (앞뒤 빈칸·끝 빗금은 뗀다) */
export function resolveSiteUrl(envUrl: string | undefined, config: string = SITE_CONFIG.url): string {
  const v = (envUrl ?? '').trim();
  return (v === '' ? config : v).replace(/\/+$/, '');
}

/** 빌드 변수에 값이 있으면 그것, 없으면 설정 값 (꼴 검사는 feedback.ts contactEmail) */
export function resolveEmail(envEmail: string | undefined, config: string = SITE_CONFIG.email): string {
  const v = (envEmail ?? '').trim();
  return v === '' ? config : v;
}

export interface SiteEnv {
  PUBLIC_STAGE?: string;
  PUBLIC_SITE_URL?: string;
  PUBLIC_CONTACT_EMAIL?: string;
}

/** 빌드가 실제로 쓰는 값: 빌드 변수에 설정을 채워 넣은 것 (빌드 지킴·astro site가 이것을 본다) */
export function effectiveEnv<T extends SiteEnv>(env: T, config: SiteConfig = SITE_CONFIG): T & Required<SiteEnv> {
  return {
    ...env,
    PUBLIC_STAGE: resolveStage(env.PUBLIC_STAGE, config.stage),
    PUBLIC_SITE_URL: resolveSiteUrl(env.PUBLIC_SITE_URL, config.url),
    PUBLIC_CONTACT_EMAIL: resolveEmail(env.PUBLIC_CONTACT_EMAIL, config.email),
  };
}
