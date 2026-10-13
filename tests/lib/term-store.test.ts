// 한 번 연 풀이 용어 (store.ts $termsSeen, brief 8절 '300개까지', D69): 모양 고르기, 한 번만, 넘치면 오래된 것부터, 기록 지우기
import { setPersistentEngine } from '@nanostores/persistent';
import { beforeAll, describe, expect, it } from 'vitest';

const storage: Record<string, string> = {};
setPersistentEngine(storage, { addEventListener() {}, removeEventListener() {} });

let store: typeof import('../../src/lib/store.ts');
beforeAll(async () => {
  store = await import('../../src/lib/store.ts');
});

describe('한 번 연 풀이 용어', () => {
  it('용어 id 모양만 받는다 (고른 글 같은 것은 버린다)', () => {
    expect(store.readTermsSeen(['api-key', 'tool:supabase', 'API 키를 고른 글', 3, 'api-key', ''])).toEqual(['api-key', 'tool:supabase']);
    expect(store.readTermsSeen('api')).toEqual([]);
  });

  it('한 번만 적고, 300개를 넘으면 가장 오래된 것부터 뺀다', () => {
    store.markTermSeen('api');
    store.markTermSeen('api');
    expect(store.$termsSeen.get()).toEqual(['api']);
    for (let i = 0; i < store.TERMS_SEEN_MAX + 5; i++) store.markTermSeen(`t-${i}`);
    const list = store.$termsSeen.get();
    expect(list).toHaveLength(store.TERMS_SEEN_MAX);
    expect(list).not.toContain('api');
    expect(list.at(-1)).toBe(`t-${store.TERMS_SEEN_MAX + 4}`);
    expect(JSON.parse(storage[store.TERMS_KEY] ?? '[]')).toHaveLength(store.TERMS_SEEN_MAX);
  });

  it("'저장한 기록 지우기'가 함께 지운다", () => {
    store.clearAll();
    expect(store.$termsSeen.get()).toEqual([]);
    expect(store.TERMS_KEY in storage).toBe(false);
  });
});
