import type { Concept, Data, Product, Question, ResearchCard } from './types.ts';

/** 데이터와 id 찾기 표. 화면이 열릴 때 한 번 만들고 계속 쓴다. */
export interface Catalog {
  data: Data;
  product: Map<string, Product>;
  concept: Map<string, Concept>;
  card: Map<string, ResearchCard>;
  question: Map<string, Question>;
  tagLabel: Map<string, string>;
}

export function makeCatalog(data: Data): Catalog {
  return {
    data,
    product: new Map(data.products.products.map((p) => [p.id, p])),
    concept: new Map(data.concepts.concepts.map((c) => [c.id, c])),
    card: new Map(data.researchCards.cards.map((c) => [c.id, c])),
    question: new Map(data.questions.questions.map((q) => [q.id, q])),
    tagLabel: new Map(data.taxonomy.tags.map((t) => [t.id, t.label])),
  };
}

/** 장바구니 id 목록을 상품으로 바꾼다. 모르는 id는 버린다. */
export function cartProducts(cat: Catalog, cart: string[]): Product[] {
  const out: Product[] = [];
  const seen = new Set<string>();
  for (const id of cart) {
    const p = cat.product.get(id);
    if (p && !seen.has(id)) {
      out.push(p);
      seen.add(id);
    }
  }
  return out;
}

/** 로캘과 상관없이 늘 같은 순서를 내는 문자열 비교 */
export function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
