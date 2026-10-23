// 한국어 설명이 얼마나 있는지 (D143): 대분류마다 출처 한국어 · 번역(agent·auto) · 자료로 만든 한 줄(모양이 정해진 상품 · 그 밖) 수.
//   node scripts/i18n/ko-coverage.ts   (npm run ko)
// 진열대 빌드가 붙이는 것과 같은 차례로 센다 (scripts/catalog/load.ts). 네트워크를 쓰지 않고 파일도 쓰지 않는다.
import { CATEGORY_ORDER } from '../../src/lib/catalog/types.ts';
import { KO_DIR, rawItems, readKo } from '../catalog/load.ts';
import { isKoreanText, koLineFor } from '../lib/ko-rule.ts';

interface Row {
  total: number;
  source: number;
  translated: number;
  template: number;
  rule: number;
  none: number;
}

const ko = readKo(KO_DIR);
const rows = new Map<string, Row>(CATEGORY_ORDER.map((c) => [c, { total: 0, source: 0, translated: 0, template: 0, rule: 0, none: 0 }]));
for (const { item } of rawItems()) {
  const r = rows.get(item.category);
  if (!r) continue;
  r.total += 1;
  if (item.summaryKo?.trim() || isKoreanText(item.summary)) r.source += 1;
  else if (ko.has(item.id)) r.translated += 1;
  else {
    const line = koLineFor(item);
    if (line?.by === 'codeshopper') r.template += 1;
    else if (line) r.rule += 1;
    else r.none += 1;
  }
}
const pct = (n: number, d: number): string => `${d ? ((n / d) * 100).toFixed(1) : '0.0'}%`;
const all: Row = { total: 0, source: 0, translated: 0, template: 0, rule: 0, none: 0 };
console.log('대분류       상품   출처·원문 한국어   번역   자료 문장(모양)   자료 한 줄   없음');
for (const [c, r] of rows) {
  for (const k of Object.keys(all) as (keyof Row)[]) all[k] += r[k];
  console.log(`${c.padEnd(11)} ${String(r.total).padStart(7)} ${String(r.source).padStart(10)} ${String(r.translated).padStart(10)} ${String(r.template).padStart(12)} ${String(r.rule).padStart(12)} ${String(r.none).padStart(6)}`);
}
console.log(`모두 ${all.total}개: 사람이 읽을 한국어(출처·번역·모양 문장) ${pct(all.source + all.translated + all.template, all.total)}, 자료 한 줄까지 ${pct(all.total - all.none, all.total)}`);
