// 빌드 때 만드는 검색 색인 파일 /search-index.json (T15). 사전 옆 창을 처음 열 때만 불러온다.
import { data } from '../lib/data.ts';
import { buildSearchIndex } from '../lib/search-index.ts';

export function GET(): Response {
  return new Response(JSON.stringify(buildSearchIndex(data)), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
