// 오픈소스·데이터셋·템플릿 진열대를 모두 다시 받는다 (네트워크 필요, 30분~1시간). 끝나면 목차를 다시 만든다.
//   node scripts/import/oss-all.ts             (전부)
//   node scripts/import/oss-all.ts data-       (이름이 data-로 시작하는 것만)
// 스크립트마다 따로 띄운다. 넓게 모으는 스크립트(oss-github, tpl-github)는 겹침을 빼려고 다른 출처 다음에 돈다. 하나가 실패해도 나머지는 계속하고, 마지막에 실패한 것을 알리며 1로 끝낸다.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT } from './oss-lib.ts';

const SCRIPTS = [
  'oss-hf.ts', 'oss-ollama.ts', 'oss-selfhosted.ts', 'oss-awesome.ts', 'oss-packages.ts', 'oss-forges.ts', 'oss-github.ts',
  'data-hf.ts', 'data-kaggle.ts', 'data-owid.ts', 'data-worldbank.ts', 'data-go-kr.ts', 'data-collections.ts',
  'tpl-vercel.ts', 'tpl-official.ts', 'tpl-astro.ts', 'tpl-galleries.ts', 'tpl-github.ts',
];

const only = process.argv[2];
const failed: string[] = [];
for (const s of SCRIPTS) {
  if (only && !s.startsWith(only)) continue;
  console.log(`\n▶ ${s}`);
  const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'import', s)], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) failed.push(s);
}
const idx = spawnSync(process.execPath, [join(ROOT, 'scripts', 'import', 'oss-index.ts')], { stdio: 'inherit', env: process.env });
if (idx.status !== 0) failed.push('oss-index.ts');
if (failed.length) {
  console.error(`\n✘ 실패: ${failed.join(', ')} — 위 기록을 보고 그 스크립트만 다시 돌린다.`);
  process.exit(1);
}
console.log('\n✔ 오픈소스·데이터셋·템플릿 진열대를 모두 받았다.');
