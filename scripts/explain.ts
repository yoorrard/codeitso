// 점수 풀어 보기: 레시피나 골든 사례 하나를 넣으면 칸마다 후보 점수와 항목별 점수를 보여 준다.
// 가중치(data/scoring.json)를 바꾸기 전후로 돌려 보고 차이를 확인한다.
//   node scripts/explain.ts lunch-page      (레시피 id)
//   node scripts/explain.ts case-03         (골든 사례 id)
import { join } from 'node:path';
import { evaluate, makeCatalog } from '../src/lib/engine/index.ts';
import type { Session } from '../src/lib/engine/types.ts';
import { DATA_DIR, loadData, readJson } from './lib/load-data.ts';

const id = process.argv[2];
if (!id) {
  console.log('사용법: node scripts/explain.ts <레시피 id 또는 case-NN>');
  process.exit(1);
}
const data = loadData();
const cat = makeCatalog(data);
let session: Partial<Session>;
if (id.startsWith('case-')) {
  session = readJson<Partial<Session>>(join(DATA_DIR, 'golden', `${id}.json`));
} else {
  const recipe = data.recipes.recipes.find((r) => r.id === id);
  if (!recipe) {
    console.log(`레시피 ${id}가 없습니다`);
    process.exit(1);
  }
  session = { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [] };
}
const r = evaluate(cat, session);
console.log(`인터뷰 ${r.done ? '끝' : `미완료 (다음: ${r.interview.next?.id})`} · 태그 ${JSON.stringify(r.interview.tags)}`);
for (const s of r.slots) {
  const rec = s.recommended?.product.id ?? '없음';
  console.log(`\n[${s.slot.label}] ${s.slot.required ? '필수' : '선택'} · 추천 ${rec} · 담은 것 ${s.filledBy.join(', ') || '-'}`);
  for (const x of [...s.shelf, ...s.index]) {
    const mark = x === s.recommended ? '★' : x.product.layer === 'index' ? '색' : ' ';
    console.log(`  ${mark} ${String(x.score).padStart(3)}  ${x.product.id.padEnd(36)} ${JSON.stringify(x.parts)}`);
  }
}
console.log(`\n충돌: ${r.conflicts.map((c) => `${c.id}${c.kept ? '(그대로 둠)' : ''}`).join(', ') || '없음'}`);
console.log(`조사할 것: ${r.research.map((x) => x.id).join(', ') || '없음'}`);
console.log(`공부할 것: 필수 ${r.study.required.join(', ') || '-'} / 전체 ${r.study.all.join(', ') || '-'}`);
console.log(`난이도 ${r.split.difficulty} (1차 ${r.split.difficultyFirst}) · 나누기 ${r.split.needed ? `제안 → ${r.split.defer.join(', ') || '미룰 칸 없음'}` : '필요 없음'} · 예상 ${r.minutes}분`);
