// 검색 색인 점검 (T15): 색인에 든 문서 수와, ARCHITECTURE 7절의 예시 질문이 맞는 항목을 맨 위에 올리는지 출력한다.
// 실제 색인 파일은 빌드 때 src/pages/search-index.json.ts가 만든다.
//   node scripts/build-search.ts
import { buildSearchIndex, searchDocs } from '../src/lib/search-index.ts';
import { loadData } from './lib/load-data.ts';

const data = loadData();
const docs = searchDocs(data);
const ms = buildSearchIndex(data);
const json = JSON.stringify(ms);
console.log(`문서 ${docs.length}개, 색인 ${(json.length / 1024).toFixed(1)}KB`);
for (const q of ['환경변수', 'API키는', 'CORS 에러가 났어요', '배포']) {
  const top = ms.search(q).slice(0, 3).map((r) => `${String(r['type'])}:${String(r['ref'])}`);
  console.log(`${q} → ${top.join(', ')}`);
}
