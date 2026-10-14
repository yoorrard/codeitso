// 빌드 때 만드는 검색 색인 파일 /search-index.json (T15). 사전 옆 창을 처음 열 때만 불러온다.
// 어려운 말 풀이 용어도 'term' 종류로 넣는다 (brief 8절 P8, D69). 검색 동의어(data/aliases.json)는 여기서 펼친다 (v3 설계서 3.5절).
import aliases from '../../data/aliases.json';
import glossary from '../../data/glossary.json';
import type { Aliases } from '../lib/aliases.ts';
import { data } from '../lib/data-full.ts';
import type { Glossary } from '../lib/glossary.ts';
import { buildSearchIndex } from '../lib/search-index.ts';

export function GET(): Response {
  const synonyms = (aliases as unknown as Aliases).searchSynonyms;
  return new Response(JSON.stringify(buildSearchIndex(data, glossary as unknown as Glossary, synonyms)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
