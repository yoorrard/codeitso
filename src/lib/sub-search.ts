// 소분류 안 검색 (N1, D137): 목록 섬(Listing)이 주소의 ?q=로 그 소분류 안에서만 찾는다.
// 전체 검색과 같은 파일(메타 · 낱말 조각)을 받고, 소분류 안 검색 파일(s-<대분류>-<소분류>.json)로 문서 번호를 소분류 인기순 자리로 바꾼다.
// 그래서 결과는 목록과 같은 자리 번호라 거르기·정렬(이름순·최근 갱신순)·목록 묶음(카드)을 그대로 쓴다. 받은 파일은 기억해 두어 다시 받지 않는다.
import type { PosHit, SearchMeta, SubDocsFile, TokenShard } from './catalog/search.ts';
import { decodeSubDocs, hitsInSub, queryTerms, runQuery, shardsFor, synonymMap } from './catalog/search.ts';
import { FILES, searchShardPath, searchSubPath } from './routes.ts';

function cached<T>(map: Map<string, Promise<T>>, url: string): Promise<T> {
  let p = map.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<T>;
    });
    map.set(url, p);
    p.catch(() => map.delete(url));
  }
  return p;
}

const metaFiles = new Map<string, Promise<SearchMeta>>();
const shardFiles = new Map<string, Promise<TokenShard>>();
const subFiles = new Map<string, Promise<SubDocsFile>>();
const opened = new Map<string, Map<number, number>>();

async function positions(cat: string, sub: string): Promise<Map<number, number>> {
  const url = searchSubPath(cat, sub);
  const have = opened.get(url);
  if (have) return have;
  const map = decodeSubDocs(await cached(subFiles, url));
  opened.set(url, map);
  return map;
}

export interface SubSearch {
  /** 점수 높은 순 → 인기순 */
  hits: PosHit[];
  /** 모든 낱말이 든 재료가 없어 하나라도 든 재료를 보인다 */
  loose: boolean;
}

/** 검색어 q를 대분류 cat의 소분류 sub 안에서 찾는다 */
export async function findInSub(q: string, cat: string, sub: string): Promise<SubSearch> {
  const [meta, posOf] = await Promise.all([cached(metaFiles, FILES.searchMeta), positions(cat, sub)]);
  const terms = queryTerms(q, synonymMap(meta.syn), new Set(meta.common));
  if (terms.length === 0) return { hits: [], loose: false };
  const loaded = new Map<number, TokenShard>();
  await Promise.all(shardsFor(terms, meta.shards).map(async (n) => loaded.set(n, await cached(shardFiles, searchShardPath(n)))));
  const res = runQuery(terms, (n) => loaded.get(n), meta.shards, (doc) => posOf.has(doc));
  return { hits: hitsInSub(res.hits, posOf), loose: res.loose };
}
