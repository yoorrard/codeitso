// 단위 시험 설정 (T03). 화면 흐름 시험(tests/e2e/)은 Playwright가 따로 돌린다.
import { defineConfig } from 'vitest/config';
import { dataParts } from './scripts/lib/data-parts-plugin.ts';

export default defineConfig({
  // src/lib/data.ts가 싣는 용어 카드 가상 모듈 (D82)
  plugins: [dataParts()],
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/engine/**/*.ts'],
      reporter: ['text-summary', 'text', 'html'],
      reportsDirectory: 'coverage',
      // 엔진 줄 기준 90% 아래로 내려가면 실패 (T04, .claude/rules/engine.md)
      thresholds: { lines: 90 },
    },
  },
});
