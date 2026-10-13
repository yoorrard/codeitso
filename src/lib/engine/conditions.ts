import type { Condition, Product, ProductField, ProductPredicate, Scalar } from './types.ts';

/** 조건을 판단할 때 보는 것 */
export interface Ctx {
  /** 태그 → 합계 점수 */
  tags: Record<string, number>;
  /** 보이는 질문에 한 답만 (질문 id → 보기 id) */
  answers: Record<string, string>;
  /** 장바구니 상품 */
  cart: Product[];
  /** 나중으로 미룬 칸 id (점검 뒤에만 쓴다. 칸 규칙·질문 조건에서는 늘 빈 배열) */
  deferred: string[];
}

export function hasTag(tags: Record<string, number>, tag: string): boolean {
  return (tags[tag] ?? 0) >= 1;
}

/** 값이 1 이상인 태그 중 접두어가 맞는 것 */
export function tagsWithPrefix(tags: Record<string, number>, prefix: string): string[] {
  return Object.keys(tags)
    .filter((t) => t.startsWith(prefix) && (tags[t] ?? 0) >= 1)
    .sort();
}

export function productField(p: Product, field: ProductField): Scalar | undefined {
  switch (field) {
    case 'provider.type':
      return p.provider.type;
    case 'access':
      return p.access;
    case 'realtime':
      return p.realtime;
    case 'serverRegion':
      return p.serverRegion;
    case 'layer':
      return p.layer;
    case 'cost.free':
      return p.cost.free;
    case 'keyExposureRisk':
      return p.keyExposureRisk;
    case 'publicKey':
      return p.publicKey ?? false;
    case 'recommendable':
      return p.recommendable;
  }
}

/** 상품 하나가 조건을 모두 만족하는지 */
export function matchProduct(p: Product, pred: ProductPredicate): boolean {
  if (pred.capability !== undefined && !p.capabilities.includes(pred.capability)) return false;
  if (pred.field !== undefined) {
    const v = productField(p, pred.field);
    if (pred.is !== undefined && v !== pred.is) return false;
    if (pred.in !== undefined && (v === undefined || !pred.in.includes(v))) return false;
  }
  return true;
}

export function evalCondition(c: Condition, ctx: Ctx): boolean {
  if ('always' in c) return true;
  if ('answer' in c) {
    const a = ctx.answers[c.answer];
    if ('is' in c) return a === c.is;
    return a !== undefined && c.in.includes(a);
  }
  if ('tag' in c) return (ctx.tags[c.tag] ?? 0) >= c.gte;
  if ('cartHas' in c) return ctx.cart.some((p) => p.id === c.cartHas);
  if ('cartAny' in c) return ctx.cart.some((p) => matchProduct(p, c.cartAny));
  if ('all' in c) return c.all.every((x) => evalCondition(x, ctx));
  if ('any' in c) return c.any.some((x) => evalCondition(x, ctx));
  if ('deferred' in c) return ctx.deferred.includes(c.deferred);
  return !evalCondition(c.not, ctx);
}

/** 조건 안에서 장바구니나 나중으로 미룬 칸을 보는지 (칸 규칙과 질문 노출 조건에는 쓰면 안 된다) */
export function usesCart(c: Condition): boolean {
  if ('cartHas' in c || 'cartAny' in c || 'deferred' in c) return true;
  if ('all' in c) return c.all.some(usesCart);
  if ('any' in c) return c.any.some(usesCart);
  if ('not' in c) return usesCart(c.not);
  return false;
}
