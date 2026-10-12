// 자료 검사(scripts/lib/validate.ts): 지금 자료가 통과하는지, 그리고 일부러 망가뜨린 자료를 잡는지.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadValidationInput } from '../scripts/lib/load-data.ts';
import type { ValidationInput } from '../scripts/lib/validate.ts';
import { validateAll } from '../scripts/lib/validate.ts';

let base: ValidationInput;
beforeAll(() => {
  base = loadValidationInput(false, new Date(2026, 9, 12));
});

/** 자료 사본을 고쳐서 검사한다 (원본은 그대로) */
function broken(change: (input: ValidationInput) => void): string[] {
  const input = structuredClone(base);
  change(input);
  return validateAll(input).errors;
}

function first<T>(list: T[]): T {
  const x = list[0];
  if (x === undefined) throw new Error('자료가 비어 있습니다');
  return x;
}

describe('지금 자료', () => {
  it('개발용 검사를 통과한다', () => {
    expect(validateAll(base).errors).toEqual([]);
  });

  it('배포용 검사는 사람 확인이 남은 진열 상품마다 오류를 낸다', () => {
    const pending = base.data.products.products.filter((p) => p.layer === 'shelf' && p.needsReview).length;
    const errors = validateAll({ ...base, release: true }).errors;
    expect(errors.filter((e) => e.includes('needsReview'))).toHaveLength(pending);
  });
});

describe('망가뜨린 자료를 잡는다', () => {
  it('스키마: 상품의 필수 항목이 빠짐', () => {
    const errors = broken((x) => {
      delete (first(x.data.products.products) as unknown as Record<string, unknown>)['summary'];
    });
    expect(errors.some((e) => e.startsWith('products.json'))).toBe(true);
  });

  it('스키마: 골든 사례 모양이 틀림', () => {
    const errors = broken((x) => {
      first(x.goldens).value = { id: 'case-x' };
    });
    expect(errors.some((e) => e.includes(first(base.goldens).name))).toBe(true);
  });

  it('id 겹침', () => {
    const errors = broken((x) => {
      x.data.products.products.push(structuredClone(first(x.data.products.products)));
    });
    expect(errors.some((e) => e.includes('id가 겹칩니다'))).toBe(true);
  });

  it('분류표에 없는 태그', () => {
    const errors = broken((x) => {
      const p = first(x.data.products.products);
      p.goodFor = [...(p.goodFor ?? []), 'ai.nowhere'];
    });
    expect(errors.some((e) => e.includes('분류표에 없는 태그 ai.nowhere'))).toBe(true);
  });

  it('확인한 때가 미래', () => {
    const errors = broken((x) => {
      x.thisMonth = '2000-01';
    });
    expect(errors.some((e) => e.includes('미래'))).toBe(true);
  });

  it('{{project}} 바로 뒤 조사', () => {
    const errors = broken((x) => {
      first(x.data.concepts.concepts).askAI = '{{project}}를 만들 때 이 개념을 설명해 줘.';
    });
    expect(errors.some((e) => e.includes('조사를 붙이면'))).toBe(true);
  });

  it('개념 선후 관계 순환', () => {
    const errors = broken((x) => {
      const concepts = x.data.concepts.concepts;
      const a = first(concepts);
      const b = concepts.find((c) => c.prerequisites.includes(a.id));
      if (!b) throw new Error('선수 개념으로 쓰이는 개념이 없습니다');
      a.prerequisites = [...a.prerequisites, b.id];
    });
    expect(errors.some((e) => e.includes('선후 관계가 돕니다'))).toBe(true);
  });

  it('스타일 색 대비 부족', () => {
    const errors = broken((x) => {
      const style = Object.values(x.data.templates.styles)[0];
      if (!style) throw new Error('스타일이 없습니다');
      style.palette.text = style.palette.background;
    });
    expect(errors.some((e) => e.includes('대비'))).toBe(true);
  });

  it('에러 안내 예시가 패턴에 맞지 않음', () => {
    const errors = broken((x) => {
      first(x.data.errors.errors).examples.push('전혀 관계없는 문장');
    });
    expect(errors.some((e) => e.includes('예시가 패턴에 맞지 않습니다'))).toBe(true);
  });

  it('레시피에 없는 상품', () => {
    const errors = broken((x) => {
      first(x.data.recipes.recipes).cart.push('no-such-product');
    });
    expect(errors.some((e) => e.includes('없는 상품 no-such-product'))).toBe(true);
  });

  it('출처 대응표가 domain 태그가 아닌 곳을 가리킴', () => {
    const errors = broken((x) => {
      const s = first(x.sources.sources);
      s.categoryMap['아무거나'] = 'type.page';
    });
    expect(errors.some((e) => e.includes('domain 태그가 아닙니다'))).toBe(true);
  });
});
