// 사전·진열대 검색 색인 (T15, docs/ARCHITECTURE.md 7절): 개념 카드, 에러 안내, 상품(진열·색인), 예상 막힘 문장,
// 그리고 어려운 말 풀이 용어(brief 8절 P8, D69: 'term' 종류. 용어 카드가 있는 말은 그 카드 문서에 이름을 더한다).
// 검색 동의어(data/aliases.json searchSynonyms, v3 설계서 3.5절)는 색인을 만들 때 펼친다: 브라우저에 싣는 것은 늘어나지 않는다.
// 색인 만들기(빌드 때 /search-index.json)와 찾기(브라우저)가 같은 설정을 쓴다. 자료만 받는 순수 함수.
import MiniSearch from 'minisearch';
import type { Options } from 'minisearch';
import type { SearchSynonym } from './aliases.ts';
import { nameKey } from './aliases.ts';
import type { Data } from './engine/types.ts';
import type { Glossary } from './glossary.ts';
import { tokenize } from './search-tokenize.ts';

export type DocType = 'concept' | 'error' | 'stuck' | 'product' | 'term';

export interface SearchDoc {
  id: string;
  type: DocType;
  /** 개념·에러·상품 id, 막힘이면 규칙이나 상품 id */
  ref: string;
  title: string;
  body: string;
  /** 이름처럼 찾히는 다른 이름 (어려운 말 풀이의 다른 이름과 띄어쓰기를 뺀 꼴). 색인만 하고 저장하지 않는다 */
  keys?: string;
  /** 상품의 진열·색인 구분 */
  layer?: 'shelf' | 'index';
}

export const SEARCH_OPTIONS: Options<SearchDoc> = {
  fields: ['title', 'keys', 'body'],
  storeFields: ['type', 'ref', 'title', 'body', 'layer'],
  tokenize,
  // 낱말 나누기가 이미 소문자·조사 떼기를 했다
  processTerm: (term) => term,
  searchOptions: {
    // 이름에 걸리면 본문보다 높게 (그래서 'API키는'은 'API 키' 카드가 'API'보다 위)
    boost: { title: 3, keys: 3 },
    prefix: (term) => term.length > 1,
    combineWith: 'OR',
  },
};

/** 이름들과, 띄어 쓴 이름의 붙여 쓴 꼴 ('환경 변수' → '환경변수', 'API 키' → 'API키') */
export function termKeys(names: readonly string[]): string {
  const out = new Set<string>();
  for (const n of names) {
    out.add(n);
    if (/\s/.test(n)) out.add(n.replace(/\s+/g, ''));
  }
  return [...out].join(' ');
}

export function searchDocs(data: Data, glossary?: Glossary, synonyms: readonly SearchSynonym[] = []): SearchDoc[] {
  const docs: SearchDoc[] = [];
  /** 문서마다 이름들 (검색 동의어의 대상 `to`와 견준다). 막히기 쉬운 곳 문장은 이름이 없다 */
  const names = new Map<string, string[]>();
  const named = (doc: SearchDoc, list: readonly string[]): void => {
    names.set(doc.id, [...(names.get(doc.id) ?? []), ...list]);
  };
  const conceptDocs = new Map<string, SearchDoc>();
  for (const c of data.concepts.concepts) {
    const doc: SearchDoc = { id: `concept:${c.id}`, type: 'concept', ref: c.id, title: [c.title, ...(c.aliases ?? [])].join(' '), body: c.summary };
    conceptDocs.set(c.id, doc);
    named(doc, [c.title, ...(c.aliases ?? [])]);
    docs.push(doc);
  }
  // 어려운 말 풀이: 용어 카드가 있는 말은 그 카드 문서에 이름을 더하고(같은 말이 두 줄로 나오지 않게), 없는 말은 'term' 문서로
  for (const t of glossary?.terms ?? []) {
    const termNames = [t.term, ...(t.aliases ?? [])];
    const card = t.concept === undefined ? undefined : conceptDocs.get(t.concept);
    if (card) {
      card.keys = termKeys([...(card.keys ? [card.keys] : []), ...termNames]);
      named(card, termNames);
    } else {
      const doc: SearchDoc = { id: `term:${t.id}`, type: 'term', ref: t.id, title: t.term, keys: termKeys(termNames), body: t.plain };
      named(doc, termNames);
      docs.push(doc);
    }
  }
  for (const e of data.errors.errors) {
    const doc: SearchDoc = { id: `error:${e.id}`, type: 'error', ref: e.id, title: e.title, body: [e.meaning, ...e.causes, ...e.examples].join(' ') };
    named(doc, [e.title]);
    docs.push(doc);
  }
  for (const p of data.products.products) {
    const doc: SearchDoc = { id: `product:${p.id}`, type: 'product', ref: p.id, title: p.name, body: [p.summary, p.useWhen ?? '', p.provider.name].join(' '), layer: p.layer };
    named(doc, [p.name]);
    docs.push(doc);
    (p.stuck ?? []).forEach((text, i) => docs.push({ id: `stuck:${p.id}:${i}`, type: 'stuck', ref: p.id, title: p.name, body: text }));
  }
  for (const r of data.rules.rules) {
    if (r.type === 'stuck') docs.push({ id: `stuck:${r.id}`, type: 'stuck', ref: r.id, title: '', body: r.text });
  }
  applySynonyms(docs, names, synonyms);
  return docs;
}

/**
 * 검색 동의어를 펼친다: `to`의 이름을 가진 문서에 `aliases`를 열쇠 말로 붙인다 (이름은 띄어쓰기·대소문자를 빼고 견준다).
 * 화면 문구에서 쓰지 않는 말(테마·폰트·가이드…)을 검색어로는 받기 위한 것이다 (D83). 붙은 문서 수를 동의어 id마다 돌려준다
 */
export function applySynonyms(docs: SearchDoc[], names: ReadonlyMap<string, readonly string[]>, synonyms: readonly SearchSynonym[]): Map<string, number> {
  const attached = new Map<string, number>();
  for (const s of synonyms) {
    const targets = new Set(s.to.map(nameKey));
    let n = 0;
    for (const doc of docs) {
      if (!(names.get(doc.id) ?? []).some((name) => targets.has(nameKey(name)))) continue;
      doc.keys = [doc.keys, termKeys(s.aliases)].filter((k) => k !== undefined && k !== '').join(' ');
      n += 1;
    }
    attached.set(s.id, n);
  }
  return attached;
}

export function buildSearchIndex(data: Data, glossary?: Glossary, synonyms: readonly SearchSynonym[] = []): MiniSearch<SearchDoc> {
  const ms = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
  ms.addAll(searchDocs(data, glossary, synonyms));
  return ms;
}

export function loadSearchIndex(json: string): MiniSearch<SearchDoc> {
  return MiniSearch.loadJSON<SearchDoc>(json, SEARCH_OPTIONS);
}
