/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** 배포 단계: release면 띠·noindex를 뗀다 (src/lib/stage.ts) */
  readonly PUBLIC_STAGE?: string;
  /** Cloudflare Web Analytics 사이트 토큰 (공개 값) */
  readonly PUBLIC_CF_BEACON_TOKEN?: string;
  /** 사이트 주소 (대표 주소 canonical) */
  readonly PUBLIC_SITE_URL?: string;
  /** 연락 메일 주소 (의견 보내기, src/lib/feedback.ts). 비면 의견 묶음을 그리지 않는다 (H22) */
  readonly PUBLIC_CONTACT_EMAIL?: string;
  /** 주소 바탕 (설계서 9.4절, D81). 기본 '/'. astro.config.mjs의 base가 되고, 화면은 import.meta.env.BASE_URL로 읽는다 (src/lib/routes.ts) */
  readonly PUBLIC_BASE_PATH?: string;
  /** 호스트 종류: cloudflare(기본) | static. static이면 익명 집계와 방문 통계를 끈다 (src/lib/stage.ts) */
  readonly PUBLIC_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 자료에서 화면이 쓰는 칸만 고른 가상 모듈 (D82, scripts/lib/data-parts-plugin.ts, src/lib/data-parts.ts)
declare module 'virtual:cc-data/concepts-core' {
  const file: import('./lib/data-parts.ts').ConceptsFile<import('./lib/data-parts.ts').ConceptCore>;
  export default file;
}
declare module 'virtual:cc-data/products' {
  const file: import('./lib/data-parts.ts').ProductsFile<import('./lib/data-parts.ts').ScreenProduct>;
  export default file;
}
declare module 'virtual:cc-data/tool-aliases' {
  const file: import('./lib/data-parts.ts').ToolAliases;
  export default file;
}
declare module 'virtual:cc-data/concepts-detail' {
  const file: import('./lib/data-parts.ts').ConceptsFile<import('./lib/data-parts.ts').ConceptDetail>;
  export default file;
}
declare module 'virtual:cc-data/templates-core' {
  const file: import('./lib/data-parts.ts').CoreTemplates;
  export default file;
}
declare module 'virtual:cc-data/templates-look' {
  const file: import('./lib/data-parts.ts').LookTemplatesPart;
  export default file;
}
declare module 'virtual:cc-data/look-mood-words' {
  const file: { mood: import('./lib/aliases.ts').AliasEntry[] };
  export default file;
}
declare module 'virtual:cc-data/looks-screen' {
  const file: import('./lib/data-parts.ts').ScreenLooks;
  export default file;
}
declare module 'virtual:cc-data/look-mood-order' {
  const file: Record<string, string[]>;
  export default file;
}
declare module 'virtual:cc-data/look-icons-*' {
  const file: Record<import('./lib/data-parts.ts').LookIconName, import('./lib/data-parts.ts').LookIcon>;
  export default file;
}
declare module 'virtual:cc-data/looks-render' {
  const file: import('./lib/data-parts.ts').RenderLooks;
  export default file;
}
