// 모든 칸을 다 실은 자료 (D82, 설계서 L-08): src/lib/data.ts(섬이 처음 싣는 가벼운 자료)에 용어 카드의 풀이 칸과 에러 안내를 더한다.
// 진열 상품의 출처 칸(sources)은 자료 검사 전용이라 여기에도 싣지 않는다 (src/lib/data-parts.ts).
// 쓰는 곳: 빌드 때만 도는 곳(용어 화면, 검색 색인·풀이 끝점)과 풀이 칸·에러 안내를 읽는 섬(사전, 용어 화면의 섬).
// 사전은 머리줄 '사전'을 누를 때 import()로 불러오므로 단계 화면의 첫 묶음에는 들지 않는다.
import conceptsDetail from 'virtual:cc-data/concepts-detail';
import errors from '../../data/errors.json';
import { data as base } from './data.ts';
import { joinConcepts } from './data-parts.ts';
import { makeCatalog } from './engine/index.ts';
import type { Catalog, Data } from './engine/index.ts';

// base는 싣지 않은 칸(errors)을 열거하지 않으므로 펼쳐도 끼지 않는다. 용어 카드는 새 물건으로 다시 붙인다
export const data = {
  ...base,
  concepts: { version: base.concepts.version, concepts: joinConcepts(base.concepts.concepts, conceptsDetail.concepts) },
  errors,
} as unknown as Data;

export const catalog: Catalog = makeCatalog(data);
