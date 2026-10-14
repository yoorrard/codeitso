// 가짜 자료 도우미가 엔진을 끝까지 돌릴 수 있는지 (다른 엔진 시험의 바탕)
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/lib/engine/index.ts';
import { option, product, question, slotRule, tinyCatalog } from '../fixtures/tiny.ts';

describe('작은 가짜 자료', () => {
  it('질문 하나, 칸 하나, 상품 하나로 끝까지 돈다', () => {
    const cat = tinyCatalog({
      questions: [question('q.a', [option('x', { 'type.page': 1 })])],
      rules: [slotRule('slot.screen', { id: 'screen', capability: 'screen', required: true })],
      products: [product('p1')],
    });
    const r = evaluate(cat, { answers: { 'q.a': 'x' }, cart: ['p1'] });
    expect(r.done).toBe(true);
    expect(r.slots.map((s) => s.slot.id)).toEqual(['screen']);
    expect(r.slots[0]?.recommended?.product.id).toBe('p1');
  });
});
