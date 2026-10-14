// e2e 시험 (T20, docs/ARCHITECTURE.md 12절): 빌드한 dist/를 작은 정적 서버로 띄우고 휴대폰 360px로 주요 흐름을 걷는다.
// 먼저 npm run build. 브라우저는 컨테이너의 Chromium(PLAYWRIGHT_BROWSERS_PATH), CI는 npx playwright install --with-deps chromium.
// 주소 바탕 시험(tests/e2e/base-path.spec.ts, 설계서 9.4절)은 따로 돈다: npm run e2e:base가 .qa/dist-base에 하위 주소 빌드를 만들고
// E2E_BASE=1로 이 설정을 불러 그 프로젝트(base-path)와 --base 서버만 켠다. 그래서 npm run e2e는 기본 빌드만 본다.
import { defineConfig, devices } from '@playwright/test';

// 여러 작업 공간이 함께 돌 때는 E2E_PORT로 포트를 나눈다 (기본 4400, 바탕 시험은 그다음 번호)
const PORT = Number(process.env['E2E_PORT'] ?? 4400);
const BASE_PORT = PORT + 1;
/** scripts/qa/base-build.ts의 BASE와 같다 */
const BASE = '/code-chauffeur';
const baseRun = process.env['E2E_BASE'] === '1';

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: '.qa/e2e-results',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${baseRun ? BASE_PORT : PORT}`,
    ...devices['Pixel 7'],
    viewport: { width: 360, height: 800 },
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: baseRun
    ? [{ name: 'base-path', testMatch: /base-path\.spec\.ts$/, use: { browserName: 'chromium' } }]
    : [{ name: 'phone-360', testIgnore: /base-path\.spec\.ts$/, use: { browserName: 'chromium' } }],
  webServer: baseRun
    ? {
        command: `node scripts/qa/serve.ts ${BASE_PORT} --base ${BASE} --dist .qa/dist-base`,
        url: `http://127.0.0.1:${BASE_PORT}${BASE}/`,
        reuseExistingServer: !process.env['CI'],
      }
    : {
        command: `node scripts/qa/serve.ts ${PORT}`,
        url: `http://127.0.0.1:${PORT}/`,
        reuseExistingServer: !process.env['CI'],
      },
});
