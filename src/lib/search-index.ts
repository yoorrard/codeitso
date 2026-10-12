// 사전·진열대 검색 색인 (T15, docs/ARCHITECTURE.md 7절): 개념 카드, 에러 안내, 상품(진열·색인), 예상 막힘 문장.
// 색인 만들기(빌드 때 /search-index.json)와 찾기(브라우저)가 같은 설정을 쓴다. 자료만 받는 순수 함수.
import MiniSearch from 'minisearch';
import type { Options } from 'minisearch';
import type { Data } from './engine/types.ts';
import { tokenize } from './search-tokenize.ts';

export type DocType = 'concept' | 'error' | 'stuck' | 'product';

export interface SearchDoc {
  id: string;
  type: DocType;
  /** 개념·에러·상품 id, 막힘이면 규칙이나 상품 id */
  ref: string;
  title: string;
  body: string;
  /** 상품의 진열·색인 구분 */
  layer?: 'shelf' | 'index';
}

export const SEARCH_OPTIONS: Options<SearchDoc> = {
  fields: ['title', 'body'],
  storeFields: ['type', 'ref', 'title', 'body', 'layer'],
  tokenize,
  // 낱말 나누기가 이미 소문자·조사 떼기를 했다
  processTerm: (term) => term,
  searchOptions: {
    // 이름에 걸리면 본문보다 높게 (그래서 'API키는'은 'API 키' 카드가 'API'보다 위)
    boost: { title: 3 },
    prefix: (term) => term.length > 1,
    combineWith: 'OR',
  },
};

export function searchDocs(data: Data): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const c of data.concepts.concepts) {
    docs.push({ id: `concept:${c.id}`, type: 'concept', ref: c.id, title: [c.title, ...(c.aliases ?? [])].join(' '), body: c.summary });
  }
  for (const e of data.errors.errors) {
    docs.push({ id: `error:${e.id}`, type: 'error', ref: e.id, title: e.title, body: [e.meaning, ...e.causes, ...e.examples].join(' ') });
  }
  for (const p of data.products.products) {
    docs.push({ id: `product:${p.id}`, type: 'product', ref: p.id, title: p.name, body: [p.summary, p.useWhen ?? '', p.provider.name].join(' '), layer: p.layer });
    (p.stuck ?? []).forEach((text, i) => docs.push({ id: `stuck:${p.id}:${i}`, type: 'stuck', ref: p.id, title: p.name, body: text }));
  }
  for (const r of data.rules.rules) {
    if (r.type === 'stuck') docs.push({ id: `stuck:${r.id}`, type: 'stuck', ref: r.id, title: '', body: r.text });
  }
  return docs;
}

export function buildSearchIndex(data: Data): MiniSearch<SearchDoc> {
  const ms = new MiniSearch<SearchDoc>(SEARCH_OPTIONS);
  ms.addAll(searchDocs(data));
  return ms;
}

export function loadSearchIndex(json: string): MiniSearch<SearchDoc> {
  return MiniSearch.loadJSON<SearchDoc>(json, SEARCH_OPTIONS);
}
