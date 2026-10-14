// @ts-check
import { fileURLToPath } from 'node:url';
import preact from '@astrojs/preact';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import { basePathProblem, envProblems, hostProblem, oneLine, scanBuild } from './scripts/lib/build-guard.ts';
import { dataParts } from './scripts/lib/data-parts-plugin.ts';

// 빌드 변수: 셸·배포 환경 변수와 .env 파일 (화면의 import.meta.env와 같은 값을 보려고 Vite 규칙대로 읽는다)
const env = loadEnv(process.env.NODE_ENV === 'development' ? 'development' : 'production', process.cwd(), 'PUBLIC_');

/** 한 줄로 알리고 멈춘다 (긴 오류 더미 대신, 설계서 L-04) */
function stop(/** @type {string} */ line) {
  console.error(`\n${line}\n`);
  process.exit(1);
}

/**
 * 빌드 지킴 (설계서 8.1 L-04·9.4절, D81): 주소 바탕·호스트 꼴은 늘, 정식(PUBLIC_STAGE=release) 빌드는 빌드 변수와 결과(dist/)까지 본다.
 * 통합으로 걸어 두어 npm run build와 build:cf 모두 걸린다. 규칙은 scripts/lib/build-guard.ts (시험 있음).
 * @returns {import('astro').AstroIntegration}
 */
function buildGuard() {
  return {
    name: 'code-chauffeur:build-guard',
    hooks: {
      'astro:config:setup': ({ command }) => {
        const problems = command === 'build' ? envProblems(env) : [basePathProblem(env.PUBLIC_BASE_PATH), hostProblem(env.PUBLIC_HOST)].filter((x) => x !== null);
        if (problems.length > 0) stop(oneLine(problems));
      },
      'astro:build:done': ({ dir }) => {
        const line = scanBuild(fileURLToPath(dir), env);
        if (line) stop(line);
      },
    },
  };
}

// 정적 호스트(PUBLIC_HOST=static)는 방문 통계를 싣지 않으므로 CSP에서도 Cloudflare Web Analytics를 뺀다 (설계서 9.4절)
const analytics = env.PUBLIC_HOST !== 'static';

// 사이트는 전부 정적 HTML로 빌드한다 (docs/ARCHITECTURE.md 1절, D03).
// 페이지 전환은 Astro ClientRouter 대신 CSS 문서 간 View Transitions로 한다 (D25).
export default defineConfig({
  // 저장소 변수가 비어 있어도(빈 글자) 예시 주소로. 정식 빌드는 빌드 지킴이 예시 주소를 막는다
  site: env.PUBLIC_SITE_URL || 'https://codechauffeur.example',
  // 주소 바탕 (설계서 9.4절): 기본 루트, GitHub Pages 프로젝트 사이트면 /저장소 이름. 화면 주소는 src/lib/routes.ts withBase()가 붙인다
  base: env.PUBLIC_BASE_PATH || '/',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [buildGuard(), preact()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  // 용어 카드를 칸으로 나눠 단계 화면에는 엔진이 쓰는 칸만 싣는다 (D82, 설계서 L-08, src/lib/data.ts)
  vite: { plugins: [dataParts()] },
  // 보안 헤더 (T21, D53): 스크립트·스타일은 Astro가 빌드 때 해시를 모아 CSP <meta>로 넣는다.
  // 외부는 쿠키 없는 Cloudflare Web Analytics 둘뿐이다 (R-61, CLAUDE.md 꼭 지킬 것 1). frame-ancestors는 meta에서 안 되므로 public/_headers에 둔다.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        analytics ? "connect-src 'self' https://cloudflareinsights.com" : "connect-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: { resources: analytics ? ["'self'", 'https://static.cloudflareinsights.com'] : ["'self'"] },
      // 노선 띠의 --here 같은 인라인 style 속성만 허용 (스타일 요소는 해시)
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
});
