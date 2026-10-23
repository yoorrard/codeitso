// 쓰지 않는 말 검사 (D108, v5.1 D119): 화면 문구(src/copy/ko.ts·data/kits.json)에서 버린 세계의 말과 다체 끝맺음을,
// 용어 풀이(data/glossary.json, 사전 글이라 다체)에서 버린 세계의 말만 찾는다. 상품 자료(data/catalog/**)는 출처 원문이라 보지 않는다.
//   node scripts/guard/check-words.ts
import { join } from 'node:path';
import { ko } from '../../src/copy/ko.ts';
import { DATA_DIR, readJson } from '../lib/load-data.ts';
import { collectStrings, findBanned } from '../lib/words.ts';

/** 문장이 아닌 칸: id·주소·다른 이름(이용자가 칠 말) */
const SKIP = new Set(['id', 'aliases', 'say', 'see', 'kind', 'version', 'items', 'about']);

const findings: string[] = [];
const scan = (file: string, value: unknown, tone: boolean): void => {
  for (const { path, text } of collectStrings(value, SKIP)) {
    for (const hit of findBanned(text, tone)) findings.push(`${file} ${path}: '${hit.word}' → ${hit.instead}\n    ${text.slice(0, 90)}`);
  }
};

scan('src/copy/ko.ts', ko, true);
scan('data/kits.json', readJson(join(DATA_DIR, 'kits.json')), true);
scan('data/glossary.json', readJson(join(DATA_DIR, 'glossary.json')), false);

if (findings.length > 0) {
  console.log(findings.join('\n'));
  console.log(`\n쓰지 않는 말 ${findings.length}건. 쇼핑몰 말과 해요체로 바꾼다 (scripts/lib/words.ts).`);
  process.exit(1);
}
console.log('쓰지 않는 말 검사 통과');
