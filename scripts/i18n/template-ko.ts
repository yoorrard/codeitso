// 모양이 정해진 상품(글꼴·색·그라디언트·패턴·아이콘·로고·3D·게임 에셋·차트 색·색 체계)의 한국어 설명을 자료로 만든다 (v5.1 P4, D128).
//   node scripts/i18n/template-ko.ts
// 출처가 한국어를 주었거나 data/catalog-ko의 다른 파일(agent·auto-<n>)에 이미 있는 상품은 건너뛴다.
// 결과는 data/catalog-ko/template.json 하나로, 같은 자료면 늘 같은 파일이다 (키 정렬). 네트워크를 쓰지 않는다.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cmpText } from '../../src/lib/catalog/core.ts';
import { KO_DIR, rawItems, readKo } from '../catalog/load.ts';
import { TEMPLATE_KINDS, templateKo } from '../lib/ko-template.ts';

export const TEMPLATE_FILE = 'template.json';

const kinds = new Set<string>(TEMPLATE_KINDS);
const others = readKo(KO_DIR, [TEMPLATE_FILE]);
const out: Record<string, string> = {};
let skipped = 0;
let empty = 0;
for (const { item } of rawItems()) {
  if (!kinds.has(item.kind)) continue;
  if (item.summaryKo?.trim() || others.has(item.id)) {
    skipped++;
    continue;
  }
  const ko = templateKo(item);
  if (ko) out[item.id] = ko;
  else empty++;
}
const sorted = Object.fromEntries(Object.keys(out).sort(cmpText).map((k) => [k, out[k]]));
writeFileSync(join(KO_DIR, TEMPLATE_FILE), `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`자료로 만든 한국어 설명 ${Object.keys(sorted).length}개 → data/catalog-ko/${TEMPLATE_FILE} (이미 있어 건너뜀 ${skipped}, 자료가 모자라 못 만듦 ${empty})`);
