// 단위 시험 설정. 화면 흐름 시험(tests/e2e/)은 Playwright가 따로 돌린다.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/catalog/**/*.ts'],
      reporter: ['text-summary', 'text', 'html'],
      reportsDirectory: 'coverage',
    },
  },
});
