// 브라우저에서 검색 색인(/search-index.json)을 한 번만 불러와 함께 쓴다 (사전·진열대).
import type MiniSearch from 'minisearch';
import type { SearchDoc } from './search-index.ts';
import { loadSearchIndex } from './search-index.ts';

let indexPromise: Promise<MiniSearch<SearchDoc>> | null = null;

export function getSearchIndex(): Promise<MiniSearch<SearchDoc>> {
  indexPromise ??= fetch('/search-index.json')
    .then((r) => {
      if (!r.ok) throw new Error(`search-index ${r.status}`);
      return r.text();
    })
    .then(loadSearchIndex)
    .catch((e: unknown) => {
      // 실패한 약속을 남겨 두면 망이 돌아와도 그 페이지에서 다시 받지 않으므로 비운다
      indexPromise = null;
      throw e;
    });
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
