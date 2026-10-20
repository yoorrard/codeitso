// API 열쇠 없이 한국어 설명을 채우는 길 (D140): 번역할 묶음을 뽑는다. 번역은 이 파일을 읽은 Claude 세션이 하고,
// 결과는 agent-merge.ts가 data/catalog-ko/agent.json에 더한다. 매일 예약 작업(docs/DATA.md '한국어 설명')이 쓴다.
//   node scripts/i18n/agent-batch.ts <묶음.tsv> [최대 수, 기본 1000]
// 고르는 순서: 스타터 키트 재료 → 소분류 안 인기 순위(모든 목록의 첫 쪽부터 고르게) → 원문 있는 것. 이미 한국어가 있는 것은 뺀다.
// 묶음.tsv 줄: 번호<탭>대분류/종류<탭>이름<탭>원문, 같은 순서의 id는 <묶음.tsv>.ids에.
import { writeFileSync } from 'node:fs';
import { KO_DIR, kitsFile, rawItems, readKo } from '../catalog/load.ts';
import { batchLines, pickCandidates, preferIds } from '../lib/ko-translate.ts';

const out = process.argv[2];
if (!out) {
  console.error('쓰는 법: node scripts/i18n/agent-batch.ts <묶음.tsv> [최대 수]');
  process.exit(1);
}
const limit = Number(process.argv[3]) > 0 ? Math.floor(Number(process.argv[3])) : 1000;

const have = readKo(KO_DIR, ['template.json']);
const templated = new Set(readKo(KO_DIR).keys());
for (const id of have.keys()) templated.delete(id);
const all = pickCandidates(rawItems(), new Set(have.keys()), templated, Number.POSITIVE_INFINITY);
const kitIds = new Set(kitsFile().kits.flatMap((k) => k.items));
const batch = preferIds(all, kitIds, limit);

writeFileSync(out, batch.length ? `${batchLines(batch).join('\n')}\n` : '');
writeFileSync(`${out}.ids`, batch.length ? `${batch.map((c) => c.id).join('\n')}\n` : '');
console.log(`번역할 묶음 ${batch.length}개 → ${out} (남은 것 모두 ${all.length}개)`);
