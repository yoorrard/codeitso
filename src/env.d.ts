/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** 배포 단계: release면 띠·noindex를 뗀다 (src/lib/stage.ts) */
  readonly PUBLIC_STAGE?: string;
  /** Cloudflare Web Analytics 사이트 토큰 (공개 값) */
  readonly PUBLIC_CF_BEACON_TOKEN?: string;
  /** 사이트 주소 (대표 주소 canonical) */
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
