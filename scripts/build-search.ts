// 검색 색인 점검 (T15): 색인에 든 문서 수와, ARCHITECTURE 7절의 예시 질문이 맞는 항목을 맨 위에 올리는지 출력한다.
// 검색 동의어(data/aliases.json searchSynonyms)마다 지금 붙은 문서 수도 찍는다: 0이면 그 화면이 아직 색인에 없다는 뜻이다 (v3 설계서 3.5절).
// 실제 색인 파일은 빌드 때 src/pages/search-index.json.ts가 만든다.
//   node scripts/build-search.ts
import { buildSearchIndex, searchDocs } from '../src/lib/search-index.ts';
import { loadValidationInput } from './lib/load-data.ts';

// 어려운 말 풀이 용어도 'term' 종류로 넣는다 (D69)
const { data, glossary, aliases } = loadValidationInput(false);
const synonyms = aliases.searchSynonyms;
const docs = searchDocs(data, glossary, synonyms);
const ms = buildSearchIndex(data, glossary, synonyms);
const json = JSON.stringify(ms);
console.log(`문서 ${docs.length}개, 색인 ${(json.length / 1024).toFixed(1)}KB`);
for (const q of ['환경변수', 'API키는', 'CORS 에러가 났어요', '배포', '프레임워크', '캐시', '반응형', '노코드', '라이선스', 'SDK', '마크다운', '테마', '다크모드', '폰트', '가이드']) {
  const top = ms.search(q).slice(0, 3).map((r) => `${String(r['type'])}:${String(r['ref'])}`);
  console.log(`${q} → ${top.join(', ')}`);
}
// 동의어 하나씩 펼쳐 열쇠 말이 바뀐 문서를 센다
const base = new Map(searchDocs(data, glossary).map((d) => [d.id, d.keys]));
console.log('\n검색 동의어 → 붙은 문서 (없으면 그 화면이 아직 색인에 없음)');
for (const s of synonyms) {
  const hit = searchDocs(data, glossary, [s]).filter((d) => d.keys !== base.get(d.id)).map((d) => d.id);
  console.log(`${s.id}: ${s.aliases.join('·')} → ${s.to.join('·')} = ${hit.length > 0 ? hit.join(', ') : '(없음)'}`);
}
