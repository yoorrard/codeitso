// Vite 플러그인 (D82, 설계서 L-08): 자료 파일에서 화면이 쓰는 칸만 고른 가상 모듈을 만든다.
//   virtual:cc-data/concepts-core    용어 카드: 엔진·단계 화면이 쓰는 칸 → src/lib/data.ts
//   virtual:cc-data/concepts-detail  용어 카드: 풀이 칸 + id            → src/lib/data-full.ts
//   virtual:cc-data/products         진열 상품: 출처 칸(자료 검사 전용)을 뺀 것 → src/lib/data.ts
//   virtual:cc-data/tool-aliases     낱말표: 도구 짐작 말 + 빈틈만 → src/lib/tool-match.ts (T37 도구 이름 찾기 묶음)
// astro.config.mjs(빌드·dev)와 vitest.config.ts(단위 시험)가 함께 건다. 나누는 규칙은 src/lib/data-parts.ts.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import type { Aliases } from '../../src/lib/aliases.ts';
import type { ConceptsFile, ProductsFile } from '../../src/lib/data-parts.ts';
import { conceptPart, screenProducts, toolAliases } from '../../src/lib/data-parts.ts';
import type { Concept, Product } from '../../src/lib/engine/types.ts';

const PREFIX = 'virtual:cc-data/';
const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');
/** 가상 모듈 이름 → [읽을 자료 파일, 고르는 함수] */
const PARTS: Record<string, [string, (json: unknown) => unknown]> = {
  'concepts-core': ['concepts.json', (j) => conceptPart(j as ConceptsFile<Concept>, 'core')],
  'concepts-detail': ['concepts.json', (j) => conceptPart(j as ConceptsFile<Concept>, 'detail')],
  products: ['products.json', (j) => screenProducts(j as ProductsFile<Product>)],
  'tool-aliases': ['aliases.json', (j) => toolAliases(j as Aliases)],
};

export function dataParts(): Plugin {
  return {
    name: 'code-chauffeur:data-parts',
    resolveId(id) {
      return id.startsWith(PREFIX) && id.slice(PREFIX.length) in PARTS ? `\0${id}` : null;
    },
    load(id) {
      if (!id.startsWith(`\0${PREFIX}`)) return null;
      const part = PARTS[id.slice(PREFIX.length + 1)];
      if (!part) return null;
      const file = join(DATA, part[0]);
      this.addWatchFile(file);
      return `export default ${JSON.stringify(part[1](JSON.parse(readFileSync(file, 'utf8'))))};`;
    },
  };
}
