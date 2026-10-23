// DESIGN.md 예시 린트 (T38, 설계서 4.11절): docs/examples/*.design.md를 @google/design.md 0.4.0(개발 의존성, 판 고정)으로 돌려
// 오류·경고가 0인지 본다. 예시는 npm run examples가 엔진(engine/look.ts renderDesignMd)으로 만든다. 형식이 alpha라
// 판이 바뀌어 규칙이 달라지면 여기서 먼저 알게 된다.
//   node scripts/check-design-md.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { lint } from '@google/design.md/linter';
import { ROOT } from './lib/load-data.ts';

const dir = join(ROOT, 'docs', 'examples');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.design.md'))
  .sort();
const problems: string[] = [];
if (files.length < 5) problems.push(`docs/examples/*.design.md가 ${files.length}개입니다 (코스 다섯 모두). npm run examples로 다시 만듭니다`);
for (const f of files) {
  const report = lint(readFileSync(join(dir, f), 'utf8'));
  for (const x of report.findings) {
    if (x.severity === 'error' || x.severity === 'warning') problems.push(`docs/examples/${f}: ${x.severity} ${x.rule ?? ''} ${x.message}`);
  }
}
if (problems.length > 0) {
  console.log(problems.join('\n'));
  console.log(`\nDESIGN.md 린트 실패 ${problems.length}건. src/lib/engine/look.ts renderDesignMd를 고치고 npm run examples로 다시 만든다.`);
  process.exit(1);
}
console.log(`DESIGN.md 린트 통과: ${files.length}개, 오류·경고 0`);
