// 검색 색인 점검 (T15): 색인에 든 문서 수와, ARCHITECTURE 7절의 예시 질문이 맞는 항목을 맨 위에 올리는지 출력한다.
// 실제 색인 파일은 빌드 때 src/pages/search-index.json.ts가 만든다.
//   node scripts/build-search.ts
import { buildSearchIndex, searchDocs } from '../src/lib/search-index.ts';
import { loadValidationInput } from './lib/load-data.ts';

// 어려운 말 풀이 용어도 'term' 종류로 넣는다 (D69)
const { data, glossary } = loadValidationInput(false);
const docs = searchDocs(data, glossary);
const ms = buildSearchIndex(data, glossary);
const json = JSON.stringify(ms);
console.log(`문서 ${docs.length}개, 색인 ${(json.length / 1024).toFixed(1)}KB`);
for (const q of ['환경변수', 'API키는', 'CORS 에러가 났어요', '배포', '프레임워크', '캐시', '반응형', '노코드', '라이선스', 'SDK', '마크다운']) {
  const top = ms.search(q).slice(0, 3).map((r) => `${String(r['type'])}:${String(r['ref'])}`);
  console.log(`${q} → ${top.join(', ')}`);
}
