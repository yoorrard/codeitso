// 미리 짠 코스(자료: recipes)마다 영수증, AI에게 할 말, 설계도 예시를 docs/examples/에 만든다.
// 직접 쓴 답·도구가 든 설계도도 읽어 볼 수 있게 골든 사례 둘(내 말과 직접 쓴 앱, 직접 쓴 데이터 도구)로 예시를 더 만든다.
//   node scripts/make-examples.ts
// 발행 시각과 사이트 주소는 예시용 고정값이다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EngineResult } from '../src/lib/engine/index.ts';
import { conversationCards, evaluate, makeCatalog, packFileName, receiptModel, renderPack, renderReceiptText } from '../src/lib/engine/index.ts';
import type { Golden } from './lib/golden.ts';
import { goldenSession } from './lib/golden.ts';
import { ROOT, goldenFiles, loadData, readJson } from './lib/load-data.ts';

const SITE = 'https://codechauffeur.example';
const ISSUED = '2026-10-12 14:05';
const ISSUED_AT = new Date(2026, 9, 12, 14, 5);

const data = loadData();
const cat = makeCatalog(data);
const outDir = join(ROOT, 'docs', 'examples');
mkdirSync(outDir, { recursive: true });

/** 결과 하나를 예시 문서로 (영수증 · AI에게 할 말 · 설계도) */
function writeExample(file: string, title: string, lead: string, r: EngineResult): void {
  const receipt = renderReceiptText(receiptModel(cat, r, ISSUED));
  const cards = conversationCards(cat, r)
    .map((c) => `- **${c.title}** (${c.when}): ${c.text}`)
    .join('\n');
  const pack = renderPack(cat, r, { siteUrl: SITE, issuedAt: ISSUED });
  const doc = [
    `# 예시: ${title}`,
    '',
    `> ${lead} \`npm run examples\`로 다시 만듭니다. 손으로 고치지 마세요.`,
    '',
    '## 텍스트 영수증',
    '',
    '```text',
    receipt,
    '```',
    '',
    '## AI에게 할 말',
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
  writeFileSync(join(outDir, file), doc);
  console.log(`docs/examples/${file}`);
}

for (const recipe of data.recipes.recipes) {
  const r = evaluate(cat, { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [], deferred: [], ...(recipe.freeText ? { freeText: recipe.freeText } : {}) });
  if (!r.canIssue) throw new Error(`${recipe.id}: 막힌 곳이 남아 출발할 수 없는 레시피입니다`);
  writeExample(`${recipe.id}.md`, recipe.title, '엔진이 미리 짠 코스로 만든 결과물 예시입니다.', r);
}

// 직접 쓴 답·도구 (D74): 설계도 1번 '내 말 그대로', 7번 '(직접 씀)', 8번 준비물, 9번 '직접 쓴 도구 확인하기'를 실제 결과로 읽게
const CUSTOM_EXAMPLES: { file: string; golden: string }[] = [
  { file: 'custom-app.md', golden: 'case-24' },
  { file: 'custom-tool.md', golden: 'case-28' },
];
for (const x of CUSTOM_EXAMPLES) {
  const f = goldenFiles().find((p) => p.endsWith(`${x.golden}.json`));
  if (!f) throw new Error(`골든 사례가 없습니다: ${x.golden}`);
  const g = readJson<Golden>(f);
  const r = evaluate(cat, goldenSession(g));
  if (!r.canIssue) throw new Error(`${g.id}: 막힌 곳이 남아 출발할 수 없는 사례입니다`);
  writeExample(x.file, g.title, `엔진이 골든 사례 ${g.id}(직접 쓴 답·도구)로 만든 결과물 예시입니다.`, r);
}
