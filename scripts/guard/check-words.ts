// 쓰지 않는 말 검사 (D108): 화면 문구(src/copy/ko.ts)와 용어 풀이(data/glossary.json)에서 버린 v1~v4 세계의 말과
// 해요체 끝맺음을 찾는다. 상품 자료(data/catalog/**)는 출처 원문이라 보지 않는다.
//   node scripts/guard/check-words.ts
import { join } from 'node:path';
import { ko } from '../../src/copy/ko.ts';
import { DATA_DIR, readJson } from '../lib/load-data.ts';
import { collectStrings, findBanned } from '../lib/words.ts';

/** 문장이 아닌 칸: id·주소·다른 이름(이용자가 칠 말) */
const SKIP = new Set(['id', 'aliases', 'say', 'see', 'kind', 'version']);

const findings: string[] = [];
const scan = (file: string, value: unknown): void => {
  for (const { path, text } of collectStrings(value, SKIP)) {
    for (const hit of findBanned(text)) findings.push(`${file} ${path}: '${hit.word}' → ${hit.instead}\n    ${text.slice(0, 90)}`);
  }
};

scan('src/copy/ko.ts', ko);
scan('data/glossary.json', readJson(join(DATA_DIR, 'glossary.json')));

if (findings.length > 0) {
  console.log(findings.join('\n'));
  console.log(`\n쓰지 않는 말 ${findings.length}건. 쇼핑몰 말과 다체로 바꾼다 (scripts/lib/words.ts).`);
  process.exit(1);
}
console.log('쓰지 않는 말 검사 통과');
