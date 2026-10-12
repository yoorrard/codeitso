// 브라우저에서 검색 색인(/search-index.json)을 한 번만 불러와 함께 쓴다 (사전·진열대).
import type MiniSearch from 'minisearch';
import type { SearchDoc } from './search-index.ts';
import { loadSearchIndex } from './search-index.ts';

let indexPromise: Promise<MiniSearch<SearchDoc>> | null = null;

export function getSearchIndex(): Promise<MiniSearch<SearchDoc>> {
  indexPromise ??= fetch('/search-index.json')
    .then((r) => r.text())
    .then(loadSearchIndex);
  return indexPromise;
}

/** 검색어에 맞는 상품 id (상품 문서와, 상품에 달린 예상 막힘 문서) */
export function productHits(ms: MiniSearch<SearchDoc>, query: string): Set<string> {
  const out = new Set<string>();
  for (const h of ms.search(query)) {
    const type = String(h['type']);
    if (type === 'product' || (type === 'stuck' && String(h.id).split(':').length === 3)) out.add(String(h['ref']));
  }
  return out;
}
