// e2e 시험 (T20, docs/ARCHITECTURE.md 12절): 빌드한 dist/를 작은 정적 서버로 띄우고 휴대폰 360px로 주요 흐름을 걷는다.
// 먼저 npm run build. 브라우저는 컨테이너의 Chromium(PLAYWRIGHT_BROWSERS_PATH), CI는 npx playwright install --with-deps chromium.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4400;

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: '.qa/e2e-results',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices['Pixel 7'],
    viewport: { width: 360, height: 800 },
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'phone-360', use: { browserName: 'chromium' } }],
  webServer: {
    command: `node scripts/qa/serve.ts ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env['CI'],
  },
});
