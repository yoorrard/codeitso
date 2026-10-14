// 화면 자료 나누기 (D82, 설계서 L-08): 단계 화면이 처음 싣는 자료에서 그 화면이 쓰지 않는 칸을 뺀다.
//  - 용어 카드(data/concepts.json)는 엔진과 단계 화면이 쓰는 칸(CONCEPT_CORE)만 src/lib/data.ts에 싣고,
//    풀이 칸(CONCEPT_DETAIL: 설명·문제·AI에게 물을 말…)은 src/lib/data-full.ts가 id로 다시 붙인다.
//  - 에러 안내(data/errors.json)는 사전과 빌드 때만 쓰므로 data-full.ts에만 싣는다.
//  - 진열 상품의 출처 칸(sources)은 자료 검사(npm run validate, Node)만 읽으므로 브라우저에는 싣지 않는다 (data-full.ts에도 없다).
// 빌드에서는 Vite 플러그인(scripts/lib/data-parts-plugin.ts)이 이 함수로 가상 모듈을 만든다. 순수 함수만 둔다 (시험 있음).
import type { Concept, Product } from './engine/types.ts';

/** 엔진(evaluate·영수증·설계도)과 단계 화면 섬이 읽는 용어 칸 */
export const CONCEPT_CORE = ['id', 'title', 'level', 'order', 'prerequisites', 'stepHint'] as const;
/** 용어 화면·사전·검색 색인만 읽는 칸. 스키마의 칸은 둘 중 한쪽에 꼭 있다 (tests/lib/data-parts.test.ts) */
export const CONCEPT_DETAIL = ['aliases', 'summary', 'figure', 'tryIt', 'quiz', 'askAI', 'relatedProducts'] as const;

export type ConceptCore = Pick<Concept, (typeof CONCEPT_CORE)[number]>;
export type ConceptDetail = Pick<Concept, 'id' | (typeof CONCEPT_DETAIL)[number]>;
export interface ConceptsFile<T> {
  version: number;
  concepts: T[];
}
export type ConceptPart = 'core' | 'detail';

/** 진열 상품에서 브라우저에 싣지 않는 칸 (자료 검사만 읽는다) */
export const PRODUCT_CHECK_ONLY = ['sources'] as const;
export type ScreenProduct = Omit<Product, (typeof PRODUCT_CHECK_ONLY)[number]>;
export interface ProductsFile<T> {
  version: number;
  products: T[];
}

function pick(o: object, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (keys.includes(k)) out[k] = v;
  return out;
}

/** 용어 카드 파일을 칸으로 나눈다. detail에도 id를 남겨 다시 붙일 수 있게 한다 */
export function conceptPart(file: ConceptsFile<Concept>, part: 'core'): ConceptsFile<ConceptCore>;
export function conceptPart(file: ConceptsFile<Concept>, part: 'detail'): ConceptsFile<ConceptDetail>;
export function conceptPart(file: ConceptsFile<Concept>, part: ConceptPart): ConceptsFile<ConceptCore | ConceptDetail>;
export function conceptPart(file: ConceptsFile<Concept>, part: ConceptPart): ConceptsFile<ConceptCore | ConceptDetail> {
  const keys: readonly string[] = part === 'core' ? CONCEPT_CORE : ['id', ...CONCEPT_DETAIL];
  return { version: file.version, concepts: file.concepts.map((c) => pick(c, keys) as unknown as ConceptCore | ConceptDetail) };
}

/** 화면에 싣는 진열 상품: 자료 검사만 읽는 칸을 뺀다 */
export function screenProducts(file: ProductsFile<Product>): ProductsFile<ScreenProduct> {
  const drop: readonly string[] = PRODUCT_CHECK_ONLY;
  return {
    version: file.version,
    products: file.products.map((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !drop.includes(k))) as unknown as ScreenProduct),
  };
}

/** 나눈 두 쪽을 id로 다시 붙인다. 순서는 core를 따른다 (원래 파일 순서) */
export function joinConcepts(core: readonly ConceptCore[], detail: readonly ConceptDetail[]): Concept[] {
  const byId = new Map(detail.map((d) => [d.id, d]));
  return core.map((c) => {
    const d = byId.get(c.id);
    if (!d) throw new Error(`concepts: '${c.id}'의 풀이 칸이 없다 (D82)`);
    return { ...c, ...d } as Concept;
  });
}

/**
 * 이 묶음에 싣지 않은 칸을 읽으면 바로 멈춘다: 화면이 조용히 빈칸(undefined)을 그리지 않게.
 * 칸은 열거하지 않으므로 펼치기({...o})·JSON.stringify에는 끼지 않는다.
 */
export function guardMissing<T extends object>(o: T, keys: readonly string[], where: string): T {
  for (const k of keys) {
    Object.defineProperty(o, k, {
      configurable: true,
      enumerable: false,
      get(): never {
        throw new Error(`${where}.${k}: src/lib/data.ts에 싣지 않은 칸이다. src/lib/data-full.ts를 쓴다 (D82)`);
      },
    });
  }
  return o;
}
