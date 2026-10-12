// @ts-check
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';

// 사이트는 전부 정적 HTML로 빌드한다 (docs/ARCHITECTURE.md 1절, D03).
// 페이지 전환은 Astro ClientRouter 대신 CSS 문서 간 View Transitions로 한다 (D25).
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://codechauffeur.example',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [preact()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
