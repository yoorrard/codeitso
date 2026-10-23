// 전체 검색 색인 만들기 (S3, D114). 진열대 빌드(build.ts)가 부르고, 시험(tests/lib/search.test.ts)이 작은 자료로 부른다.
// 문서 번호 = 대분류 순서 → 대분류 안 인기순 (같은 id가 두 진열대에 있으면 처음 것만). 모양은 src/lib/catalog/search.ts.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { monogram, sortRanked } from '../../src/lib/catalog/core.ts';
import type { Ranked } from '../../src/lib/catalog/core.ts';
import type { SearchCat, SearchMeta, SubDocsFile, TokenShard } from '../../src/lib/catalog/search.ts';
import { COMMON_DF, INDEX_TEXT_MAX, SEARCH_BLOCK, SEARCH_SHARDS, encodePostings, encodeSubDocs, indexTokens, tokenShard } from '../../src/lib/catalog/search.ts';
import type { Card, CategoryMeta } from '../../src/lib/catalog/types.ts';

export const WORDS_FILE = join(import.meta.dirname, '..', '..', 'data', 'search-words.json');

/** 결과 카드는 블록에 실리므로 무거운 미리 보기(아이콘 SVG·패턴)는 머리글자로 줄인다 */
const THUMB_MAX = 2500;

export function searchCard(card: Card): Card {
  if ((card.thumb.t === 'icons' || card.thumb.t === 'pattern') && JSON.stringify(card.thumb).length > THUMB_MAX) {
    return { ...card, thumb: { t: 'mono', label: monogram(card.name) } };
  }
  return card;
}

export function readWords(file: string = WORDS_FILE): string[][] {
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { groups?: unknown };
  if (!Array.isArray(raw.groups)) throw new Error(`${file}: groups가 없다`);
  return raw.groups.map((g) => (Array.isArray(g) ? g.filter((w): w is string => typeof w === 'string') : []));
}

export interface SearchBuild {
  meta: SearchMeta;
  shards: TokenShard[];
  /** `${대분류}-${블록}` → 카드 */
  blocks: Map<string, Card[]>;
  /** `${대분류}-${소분류}` → 소분류 안 검색 파일 (N1) */
  subDocs: Map<string, SubDocsFile>;
}

/**
 * lists: `${대분류}/${소분류}` → 인기순 목록, byId: id → 처음 놓인 것 (load.ts catalog()), card: 카드 모양 (load.ts card)
 */
export function buildSearch(
  categories: readonly CategoryMeta[],
  lists: ReadonlyMap<string, readonly Ranked[]>,
  byId: ReadonlyMap<string, Ranked>,
  card: (r: Ranked) => Card,
  words: string[][],
  shardCount: number = SEARCH_SHARDS,
  block: number = SEARCH_BLOCK,
  commonDf: number = COMMON_DF,
): SearchBuild {
  const cats: SearchCat[] = [];
  const subs: SearchMeta['subs'] = [];
  const blocks = new Map<string, Card[]>();
  const postings: Map<string, { n: number[]; o: number[] }>[] = Array.from({ length: shardCount }, () => new Map());
  const docOf = new Map<string, number>();
  let doc = 0;
  for (const c of categories) {
    const mine: Ranked[] = [];
    for (const s of c.subcategories) {
      subs.push([c.id, s.id, s.nameKo, s.count]);
      for (const r of lists.get(`${c.id}/${s.id}`) ?? []) if (byId.get(r.item.id) === r) mine.push(r);
    }
    const ordered = sortRanked(mine, 'popular');
    cats.push({ id: c.id, start: doc, count: ordered.length });
    ordered.forEach((r, i) => {
      const k = Math.floor(i / block);
      const key = `${c.id}-${k}`;
      let b = blocks.get(key);
      if (!b) {
        b = [];
        blocks.set(key, b);
      }
      b.push(searchCard(card(r)));
      docOf.set(r.item.id, doc);
      const it = r.item;
      const titleKo = typeof it.preview['titleKo'] === 'string' ? it.preview['titleKo'] : '';
      const name = new Set(indexTokens(`${it.name} ${titleKo}`));
      // 출처 이름·소분류 이름은 넣지 않는다: 문서 수만 개에 같은 낱말이 붙어 조각만 커진다 (소분류는 matchSubs가 따로 찾는다)
      const other = new Set(indexTokens([it.tags.join(' '), it.summary.slice(0, INDEX_TEXT_MAX), (it.summaryKo ?? '').slice(0, INDEX_TEXT_MAX)].join(' ')));
      for (const t of name) add(postings, shardCount, t, 'n', doc);
      for (const t of other) if (!name.has(t)) add(postings, shardCount, t, 'o', doc);
      doc += 1;
    });
  }
  const common: string[] = [];
  const shards: TokenShard[] = postings.map((m) => {
    const out: TokenShard = {};
    for (const [t, p] of [...m].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
      const isCommon = p.o.length > commonDf;
      if (isCommon) common.push(t);
      out[t] = [encodePostings(p.n), isCommon ? '' : encodePostings(p.o)];
    }
    return out;
  });
  common.sort();
  // 소분류 안 검색 (N1): 소분류 인기순 자리마다 문서 번호. 같은 재료가 다른 소분류에 먼저 놓였으면 그 문서 번호
  const subDocs = new Map<string, SubDocsFile>();
  for (const c of categories) {
    for (const s of c.subcategories) {
      const docs = (lists.get(`${c.id}/${s.id}`) ?? []).map((r) => docOf.get(r.item.id) ?? -1);
      subDocs.set(`${c.id}-${s.id}`, encodeSubDocs(docs));
    }
  }
  const meta: SearchMeta = { v: 1, docs: doc, shards: shardCount, block, cats, subs, syn: words, common };
  return { meta, shards, blocks, subDocs };
}

function add(postings: Map<string, { n: number[]; o: number[] }>[], shardCount: number, token: string, field: 'n' | 'o', doc: number): void {
  const m = postings[tokenShard(token, shardCount)];
  if (!m) return;
  let p = m.get(token);
  if (!p) {
    p = { n: [], o: [] };
    m.set(token, p);
  }
  p[field].push(doc);
}
