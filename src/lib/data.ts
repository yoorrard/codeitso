// 빌드 때 data/*.json을 묶어 엔진에 넘길 Data 모양을 만든다 (docs/ARCHITECTURE.md 6절).
// scripts/lib/load-data.ts의 Node 판과 같은 모양이어야 한다.
import concepts from '../../data/concepts.json';
import errors from '../../data/errors.json';
import products from '../../data/products.json';
import questions from '../../data/questions.json';
import recipes from '../../data/recipes.json';
import researchCards from '../../data/research-cards.json';
import rules from '../../data/rules.json';
import scoring from '../../data/scoring.json';
import taxonomy from '../../data/taxonomy.json';
import templates from '../../data/templates.json';
import { makeCatalog } from './engine/index.ts';
import type { Catalog, Data } from './engine/index.ts';

// JSON import는 넓은 타입(string 등)으로 들어오므로, 스키마 검사(npm run validate)를 믿고 Data로 본다.
export const data = {
  taxonomy,
  scoring,
  questions,
  rules,
  products,
  concepts,
  researchCards,
  templates,
  recipes,
  errors,
} as unknown as Data;

export const catalog: Catalog = makeCatalog(data);
