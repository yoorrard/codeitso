// @ts-check
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';

// 사이트는 전부 정적 HTML로 빌드한다 (docs/ARCHITECTURE.md 1절, D03).
// 페이지 전환은 Astro ClientRouter 대신 CSS 문서 간 View Transitions로 한다 (D25).
export default defineConfig({
  // 저장소 변수가 비어 있어도(빈 글자) 예시 주소로
  site: process.env.PUBLIC_SITE_URL || 'https://codechauffeur.example',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [preact()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  // 보안 헤더 (T21, D53): 스크립트·스타일은 Astro가 빌드 때 해시를 모아 CSP <meta>로 넣는다.
  // 외부는 쿠키 없는 Cloudflare Web Analytics 둘뿐이다 (R-61, CLAUDE.md 꼭 지킬 것 1). frame-ancestors는 meta에서 안 되므로 public/_headers에 둔다.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' https://cloudflareinsights.com",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: { resources: ["'self'", 'https://static.cloudflareinsights.com'] },
      // 노선 띠의 --here 같은 인라인 style 속성만 허용 (스타일 요소는 해시)
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
});
