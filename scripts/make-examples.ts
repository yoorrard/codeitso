// 레시피(화면: 미리 짠 코스)마다 영수증, AI에게 할 말, 설계도 예시를 docs/examples/에 만든다.
//   node scripts/make-examples.ts
// 발행 시각과 사이트 주소는 예시용 고정값이다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { conversationCards, evaluate, makeCatalog, packFileName, receiptModel, renderPack, renderReceiptText } from '../src/lib/engine/index.ts';
import { ROOT, loadData } from './lib/load-data.ts';

const SITE = 'https://codechauffeur.example';
const ISSUED = '2026-10-12 14:05';
const ISSUED_AT = new Date(2026, 9, 12, 14, 5);

const data = loadData();
const cat = makeCatalog(data);
const outDir = join(ROOT, 'docs', 'examples');
mkdirSync(outDir, { recursive: true });

for (const recipe of data.recipes.recipes) {
  const r = evaluate(cat, { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [], deferred: [], ...(recipe.freeText ? { freeText: recipe.freeText } : {}) });
  if (!r.canIssue) throw new Error(`${recipe.id}: 막힌 곳이 남아 출발할 수 없는 레시피입니다`);
  const receipt = renderReceiptText(receiptModel(cat, r, ISSUED));
  const cards = conversationCards(cat, r)
    .map((c) => `- **${c.title}** (${c.when}): ${c.text}`)
    .join('\n');
  const pack = renderPack(cat, r, { siteUrl: SITE, issuedAt: ISSUED });
  const doc = [
    `# 예시: ${recipe.title}`,
    '',
    '> 엔진이 미리 짠 코스(레시피)로 만든 결과물 예시입니다. `npm run examples`로 다시 만듭니다. 손으로 고치지 마세요.',
    '',
    '## 텍스트 영수증',
    '',
    '```text',
    receipt,
    '```',
    '',
    '## AI에게 할 말 (대화 카드)',
    '',
    cards,
    '',
    `## 설계도 (${packFileName(ISSUED_AT)} 내용)`,
    '',
    '````markdown',
    pack.trimEnd(),
    '````',
    '',
  ].join('\n');
  writeFileSync(join(outDir, `${recipe.id}.md`), doc);
  console.log(`docs/examples/${recipe.id}.md`);
}
