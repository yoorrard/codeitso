// 쓰지 않는 말 검사 (docs/CONCEPT.md 3.8·3.9절): 화면 문구(src/copy/ko.ts·ko-look.ts)와 자료 문장(data/*.json)에서
// 버린 비유와 바꾼 말을 찾는다. 내부 id·주소·출처·에러 원문 예시는 보지 않는다.
//   node scripts/guard/check-words.ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ko } from '../../src/copy/ko.ts';
import { koLook } from '../../src/copy/ko-look.ts';
import { ROOT } from '../lib/load-data.ts';
import { collectStrings, findBanned } from '../lib/words.ts';

/**
 * 문장이 아닌 칸: id·참조·주소·출처, 에러 원문 예시(영어 메시지), 내부 메모,
 * 그리고 이용자가 칠 말을 모은 칸(다른 이름 `aliases`, 느낌 낱말 `keywords`). 이용자의 말에는 우리 글에서 쓰지 않는 말도 들어간다 (D83)
 */
const SKIP = new Set([
  'id', 'ids', 'slotId', 'anchorSlot', 'capability', 'capabilities', 'domains', 'topics', 'tags', 'goodFor', 'needsConcepts', 'related',
  'links', 'sources', 'url', 'href', 'source', 'license', 'examples', 'patterns', '$schema', 'version', 'checkedAt', 'stepHint', 'conceptLink',
  'note', 'notes', 'aliases', 'keywords',
]);
/** 묶음일 때만 건너뛰는 칸 (답·고른 도구·조건 같은 id 묶음). 같은 이름이라도 문장 하나면 검사한다 (예: pack.labels.answers) */
const SKIP_IF_GROUP = new Set(['cart', 'answers', 'kept', 'deferred', 'expect', 'match', 'when', 'requires', 'conditions']);

/**
 * 낱말표: 이용자가 칠 말(검색어·직접 쓰기)을 모은 표라 열쇠와 대상 이름은 보지 않고, 화면에 보이는 문장 칸(`message`)만 본다
 * (docs/review/v3/brief.md 3.5절 · input.md 9.2절 규칙 6, D83)
 */
const WORD_TABLES = new Set(['data/aliases.json']);
const TABLE_TEXT = /(?:^|\.)message$/;

/** 화면·설계도 문장 파일 (일반 동사 '담다'도 막는다). 개념·상품·에러 설명은 일반 동사를 쓸 수 있다 */
const UI_FILES = new Set(['src/copy/ko.ts', 'src/copy/ko-look.ts', 'data/templates.json', 'data/rules.json', 'data/questions.json', 'data/research-cards.json', 'data/recipes.json']);

const findings: string[] = [];
const scan = (file: string, value: unknown): void => {
  for (const { path, text } of collectStrings(value, SKIP, SKIP_IF_GROUP)) {
    if (WORD_TABLES.has(file) && !TABLE_TEXT.test(path)) continue;
    for (const hit of findBanned(text, UI_FILES.has(file))) findings.push(`${file} ${path}: '${hit.word}' → ${hit.instead}\n    ${text.slice(0, 90)}`);
  }
};

scan('src/copy/ko.ts', ko);
// 디자인 정하기 시트 문구 (T38): ko.ts의 한 갈래 (시트를 열 때만 받는 묶음)
scan('src/copy/ko-look.ts', koLook);
const dataDir = join(ROOT, 'data');
for (const name of readdirSync(dataDir).filter((n) => n.endsWith('.json')).sort()) {
  scan(`data/${name}`, JSON.parse(readFileSync(join(dataDir, name), 'utf8')));
}

if (findings.length > 0) {
  console.log(findings.join('\n'));
  console.log(`\n쓰지 않는 말 ${findings.length}건. docs/CONCEPT.md 3절 용어 사전의 새 말로 바꾼다.`);
  process.exit(1);
}
console.log('쓰지 않는 말 검사 통과');
