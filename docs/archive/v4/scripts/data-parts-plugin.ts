// Vite 플러그인 (D82, 설계서 L-08): 자료 파일에서 화면이 쓰는 칸만 고른 가상 모듈을 만든다.
//   virtual:cc-data/concepts-core    용어 카드: 엔진·단계 화면이 쓰는 칸 → src/lib/data.ts
//   virtual:cc-data/concepts-detail  용어 카드: 풀이 칸 + id            → src/lib/data-full.ts
//   virtual:cc-data/products         진열 상품: 출처 칸(자료 검사 전용)을 뺀 것 → src/lib/data.ts
//   virtual:cc-data/tool-aliases     낱말표: 도구 짐작 말 + 빈틈만 → src/lib/tool-match.ts (T37 도구 이름 찾기 묶음)
//   virtual:cc-data/templates-core   문장 틀: 설계도 6번 문장(look)을 뺀 것 → src/lib/data.ts (T38)
//   virtual:cc-data/templates-look   문장 틀: 설계도 6번 문장(look)만 → src/lib/look-data.ts (T38 디자인 묶음)
//   virtual:cc-data/look-mood-words  느낌 낱말(looks.json keywords.mood)만 → src/lib/custom-match.ts (T38)
//   virtual:cc-data/looks-screen     디자인 값: 부품 규칙·출처 칸을 뺀 것 → src/lib/look-data.ts (T38 디자인 정하기 묶음)
//   virtual:cc-data/looks-render     디자인 값: 부품 규칙만 → src/lib/look-render-data.ts (T38 설계도 6번 묶음)
//   virtual:cc-data/look-mood-order  앱 종류마다 추천 느낌 셋만 → src/components/Interview.tsx (T38 1단계 느낌 타일 순서)
//   virtual:cc-data/look-icons-<묶음> 미리 보기 아래 메뉴 아이콘 넷 (node_modules의 SVG에서) → src/components/LookPreview.tsx (T38)
// astro.config.mjs(빌드·dev)와 vitest.config.ts(단위 시험)가 함께 건다. 나누는 규칙은 src/lib/data-parts.ts.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import type { Aliases } from '../../src/lib/aliases.ts';
import type { ConceptsFile, ProductsFile } from '../../src/lib/data-parts.ts';
import { LOOK_ICON_FILES, conceptPart, iconParts, lookMoodOrder, lookMoodWords, looksRender, looksScreen, screenProducts, templatesCore, templatesLook, toolAliases } from '../../src/lib/data-parts.ts';
import type { Concept, Looks, Product, Templates } from '../../src/lib/engine/types.ts';

const PREFIX = 'virtual:cc-data/';
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = join(ROOT_DIR, 'data');
const ICONS = 'look-icons-';
/** 가상 모듈 이름 → [읽을 자료 파일, 고르는 함수] */
const PARTS: Record<string, [string, (json: unknown) => unknown]> = {
  'concepts-core': ['concepts.json', (j) => conceptPart(j as ConceptsFile<Concept>, 'core')],
  'concepts-detail': ['concepts.json', (j) => conceptPart(j as ConceptsFile<Concept>, 'detail')],
  products: ['products.json', (j) => screenProducts(j as ProductsFile<Product>)],
  'tool-aliases': ['aliases.json', (j) => toolAliases(j as Aliases)],
  'templates-core': ['templates.json', (j) => templatesCore(j as Templates)],
  'templates-look': ['templates.json', (j) => templatesLook(j as Templates)],
  'look-mood-words': ['looks.json', (j) => lookMoodWords(j as Looks)],
  'looks-screen': ['looks.json', (j) => looksScreen(j as Looks)],
  'looks-render': ['looks.json', (j) => looksRender(j as Looks)],
  'look-mood-order': ['looks.json', (j) => lookMoodOrder(j as Looks)],
};

export function dataParts(): Plugin {
  return {
    name: 'code-chauffeur:data-parts',
    resolveId(id) {
      const name = id.startsWith(PREFIX) ? id.slice(PREFIX.length) : '';
      return name in PARTS || (name.startsWith(ICONS) && name.slice(ICONS.length) in LOOK_ICON_FILES) ? `\0${id}` : null;
    },
    load(id) {
      if (!id.startsWith(`\0${PREFIX}`)) return null;
      const name = id.slice(PREFIX.length + 1);
      const set = name.startsWith(ICONS) ? LOOK_ICON_FILES[name.slice(ICONS.length)] : undefined;
      if (set) {
        const [dir, files] = set;
        const out = Object.fromEntries(
          Object.entries(files).map(([k, f]) => {
            const file = join(ROOT_DIR, 'node_modules', dir, `${f}.svg`);
            this.addWatchFile(file);
            return [k, iconParts(readFileSync(file, 'utf8'))];
          }),
        );
        return `export default ${JSON.stringify(out)};`;
      }
      const part = PARTS[name];
      if (!part) return null;
      const file = join(DATA, part[0]);
      this.addWatchFile(file);
      return `export default ${JSON.stringify(part[1](JSON.parse(readFileSync(file, 'utf8'))))};`;
    },
  };
}
