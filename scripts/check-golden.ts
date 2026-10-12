// 추천 회귀 검사: data/golden/case-*.json의 기대 결과와 엔진 결과를 비교한다.
//   node scripts/check-golden.ts           비교만 한다 (다르면 실패)
//   node scripts/check-golden.ts --print   엔진 결과를 기대 결과 모양으로 출력한다 (새 사례를 만들 때)
// 기대 결과를 고칠 때는 사람이 차이를 읽고 이유를 커밋 메시지에 남긴다. 자동으로 덮어쓰지 않는다.
import { basename } from 'node:path';
import { evaluate, makeCatalog } from '../src/lib/engine/index.ts';
import type { Golden } from './lib/golden.ts';
import { actual, compareGolden, goldenSession } from './lib/golden.ts';
import { goldenFiles, loadData, readJson } from './lib/load-data.ts';

const data = loadData();
const cat = makeCatalog(data);
const print = process.argv.includes('--print');
let failed = 0;
const fired = new Set<string>();

for (const file of goldenFiles()) {
  const g = readJson<Golden>(file);
  const r = evaluate(cat, goldenSession(g));

  for (const s of r.slots) for (const id of s.slot.ruleIds) fired.add(id);
  for (const c of r.conflicts) fired.add(c.id);
  for (const id of r.safety.ruleIds) fired.add(id);
  for (const rule of data.rules.rules) {
    if (rule.type === 'research' && r.research.some((x) => x.id === rule.card && x.source === 'rule')) fired.add(rule.id);
    if (rule.type === 'stuck' && r.stuck.some((x) => x.from === rule.id)) fired.add(rule.id);
  }

  if (print) {
    console.log(`\n=== ${basename(file)} ${g.title}`);
    console.log(JSON.stringify(actual(r), null, 2));
    continue;
  }
  const problems = compareGolden(r, g.expect);
  if (problems.length > 0) {
    failed += 1;
    console.log(`✗ ${basename(file)} ${g.title}`);
    for (const p of problems) console.log(`    - ${p}`);
  } else {
    console.log(`✓ ${basename(file)} ${g.title}`);
  }
}

if (!print) {
  const never = data.rules.rules.filter((rule) => !fired.has(rule.id)).map((rule) => rule.id);
  if (never.length > 0) console.log(`\n참고: 골든 사례에서 한 번도 켜지지 않은 규칙 ${never.length}개 → ${never.join(', ')}`);
  if (failed > 0) {
    console.log(`\n${failed}개 사례가 기대와 다릅니다. 의도한 변경이면 기대 결과를 손으로 고치고 이유를 남기세요.`);
    process.exit(1);
  }
  console.log('\n모든 골든 사례 통과');
}
