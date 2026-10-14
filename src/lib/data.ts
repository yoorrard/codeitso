// 빌드 때 data/*.json을 묶어 엔진에 넘길 Data 모양을 만든다 (docs/ARCHITECTURE.md 6절).
// 섬(화면)이 처음 싣는 자료라 가볍게 둔다 (D82, 설계서 L-08, src/lib/data-parts.ts):
//  - 용어 카드는 엔진·단계 화면이 쓰는 칸만 (가상 모듈 virtual:cc-data/concepts-core, scripts/lib/data-parts-plugin.ts)
//  - 에러 안내(errors.json)는 싣지 않는다
//  - 문장 틀의 설계도 6번 문장(templates.look, T38)은 싣지 않는다 (virtual:cc-data/templates-core, 디자인 묶음 look-data.ts가 받는다)
//  - 진열 상품의 출처 칸(sources, 자료 검사 전용)은 싣지 않는다 (virtual:cc-data/products). 타입에서도 없을 수 있는 칸이라
//    막지 않고 빼기만 한다 (상품은 결과 곳곳에 실려 다닌다)
// 풀이 칸·에러 안내가 필요한 곳(사전, 용어 화면, 검색 색인·풀이 끝점)은 src/lib/data-full.ts를 쓴다.
// 여기 없는 용어 칸·에러 안내를 읽으면 조용히 비지 않고 바로 멈춘다(guardMissing). scripts/lib/load-data.ts의 Node 판은 모든 칸을 읽는다.
import conceptsCore from 'virtual:cc-data/concepts-core';
import products from 'virtual:cc-data/products';
import questions from '../../data/questions.json';
import recipes from '../../data/recipes.json';
import researchCards from '../../data/research-cards.json';
import rules from '../../data/rules.json';
import scoring from '../../data/scoring.json';
import taxonomy from '../../data/taxonomy.json';
import templatesCore from 'virtual:cc-data/templates-core';
import { CONCEPT_DETAIL, TEMPLATE_LOOK_ONLY, guardMissing } from './data-parts.ts';
import { makeCatalog } from './engine/index.ts';
import type { Catalog, Data } from './engine/index.ts';

// 설계도 6번 문장(templates.look)은 디자인 묶음(src/lib/look-data.ts)이 따로 받는다 (T38)
const templates = guardMissing({ ...templatesCore }, TEMPLATE_LOOK_ONLY, 'data.templates');

const concepts = { version: conceptsCore.version, concepts: conceptsCore.concepts.map((c) => guardMissing(c, CONCEPT_DETAIL, `concepts.${c.id}`)) };

// JSON import는 넓은 타입(string 등)으로 들어오므로, 스키마 검사(npm run validate)를 믿고 Data로 본다.
export const data = guardMissing(
  {
    taxonomy,
    scoring,
    questions,
    rules,
    products,
    concepts,
    researchCards,
    templates,
    recipes,
  },
  ['errors'],
  'data',
) as unknown as Data;

export const catalog: Catalog = makeCatalog(data);
