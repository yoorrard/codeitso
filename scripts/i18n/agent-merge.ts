// API 열쇠 없이 한국어 설명을 채우는 길 (D140): Claude 세션이 번역한 '번호<탭>한국어' 줄을 data/catalog-ko/agent.json에 더한다.
//   node scripts/i18n/agent-merge.ts <묶음.tsv> <번역.txt>...
// 검사는 매일 번역과 같다(cleanKo: 다체로 끝남, 100자 이하, 한글, 주소·메일 없음). 통과하지 못한 줄은 버리고 다음 묶음에서 다시 고른다.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { KO_DIR } from '../catalog/load.ts';
import { cleanKo, parseNumbered } from '../lib/ko-translate.ts';

const [batch, ...files] = process.argv.slice(2);
if (!batch || files.length === 0) {
  console.error('쓰는 법: node scripts/i18n/agent-merge.ts <묶음.tsv> <번역.txt>...');
  process.exit(1);
}
const ids = readFileSync(`${batch}.ids`, 'utf8').split('\n').filter(Boolean);
const lines = new Map<number, string>();
for (const f of files) for (const [n, t] of parseNumbered(readFileSync(f, 'utf8'))) lines.set(n, t);

const found = new Map<string, string>();
const rejected: string[] = [];
for (const [n, t] of lines) {
  const id = ids[n - 1];
  if (!id) continue;
  const ko = cleanKo(t);
  if (ko) found.set(id, ko);
  else rejected.push(`${n} ${id}: ${t}`);
}
const missing = ids.length - lines.size;

const path = join(KO_DIR, 'agent.json');
const cur = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Record<string, string>) : {};
let added = 0;
for (const [id, ko] of found) {
  if (!(id in cur)) added += 1;
  cur[id] = ko;
}
// 키 순서는 글자 코드 순 (지금까지의 agent.json과 같게)
const sorted = Object.fromEntries(Object.keys(cur).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map((k) => [k, cur[k]]));
writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`더함 ${added}개 (고친 것 포함 ${found.size}개) · 버림 ${rejected.length}개 · 번역 없음 ${missing}개 → data/catalog-ko/agent.json (모두 ${Object.keys(sorted).length}개)`);
for (const r of rejected.slice(0, 20)) console.log(`  버림: ${r}`);
