// API 진열대 전체를 다시 받는다 (네트워크 필요, 10~20분: 공공데이터포털 목록이 가장 오래 걸린다).
//   node scripts/import/api-all.ts            모두
//   node scripts/import/api-all.ts curated     이름이 들어간 것만 (예: curated, data-go-kr)
// 순서: 손 목록·models.dev → 공개 목록(손 목록과 겹치는 줄을 빼려고 뒤에) → 한국 목록 → APIs.guru → 공공데이터포털 → 목차.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const STEPS = ['api-curated.ts', 'api-public-apis.ts', 'api-kr-4kr.ts', 'api-apis-guru.ts', 'api-data-go-kr.ts', 'api-index.ts'];

const only = process.argv.slice(2);
const steps = only.length ? STEPS.filter((s) => only.some((o) => s.includes(o)) || s === 'api-index.ts') : STEPS;
const env = { ...process.env, ...(process.env.HTTPS_PROXY || process.env.https_proxy ? { NODE_USE_ENV_PROXY: '1', NODE_NO_WARNINGS: '1' } : {}) };
let failed = 0;
for (const step of steps) {
  const r = spawnSync(process.execPath, [join(HERE, step)], { stdio: 'inherit', env });
  if (r.status !== 0) {
    failed++;
    console.error(`✗ ${step} 실패 (코드 ${r.status}). 나머지는 계속한다.`);
  }
}
process.exit(failed ? 1 : 0);
