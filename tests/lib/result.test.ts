// 엔진 결과 파생 store: 저장은 늘 정리된 r.session으로, 결과는 매번 다시 계산
import { setPersistentEngine } from '@nanostores/persistent';
import { beforeAll, describe, expect, it } from 'vitest';
import { KEYS } from '../../src/lib/saved.ts';

const storage: Record<string, string> = {};
setPersistentEngine(storage, { addEventListener() {}, removeEventListener() {} });

let result: typeof import('../../src/lib/result.ts');
let store: typeof import('../../src/lib/store.ts');
let data: typeof import('../../src/lib/data.ts');
beforeAll(async () => {
  result = await import('../../src/lib/result.ts');
  store = await import('../../src/lib/store.ts');
  data = await import('../../src/lib/data.ts');
});

describe('결과 store', () => {
  it('모르는 id를 버리고 정리한 상태만 저장한다', () => {
    const recipe = data.data.recipes.recipes[0];
    if (!recipe) throw new Error('레시피가 없습니다');
    result.commitSession({ answers: { ...recipe.answers, 'q.none': 'x' }, cart: [...recipe.cart, 'no-such'], kept: recipe.kept ?? [], deferred: [] });
    const saved = JSON.parse(storage[KEYS.session] ?? 'null') as { answers: Record<string, string>; cart: string[] };
    expect(saved.cart).toEqual(recipe.cart);
    expect(saved.answers).toEqual(recipe.answers);
    expect(result.$result.get().done).toBe(true);
  });

  it('고친 상태로 결과가 다시 계산된다', () => {
    result.updateSession(() => ({ cart: [] }));
    expect(store.$session.get().cart).toEqual([]);
    expect(result.$result.get().cart).toEqual([]);
  });
});
