// 디자인 진열대 전체 다시 받기: 가져오기 스크립트를 차례로 돌리고 목차를 만든다.
//   node scripts/import/design-all.ts          (프록시 뒤라면 NODE_USE_ENV_PROXY=1)
// 하나가 실패해도 나머지는 돌리고, 끝에 실패한 것을 알려 준다 (실패한 출처의 파일은 지난 자료 그대로 남는다).
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const steps = [
  'design-fonts.ts', 'design-colors.ts', 'design-gradients.ts', 'design-icons.ts', 'design-ui.ts',
  'design-curated.ts', 'design-styles.ts', 'design-assets.ts', 'design-index.ts',
];
const failed: string[] = [];
for (const s of steps) {
  const r = spawnSync(process.execPath, [join(here, s)], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) failed.push(s);
}
if (failed.length) {
  console.error(`실패: ${failed.join(', ')}`);
  process.exit(1);
}
console.log('디자인 진열대 가져오기 끝');
