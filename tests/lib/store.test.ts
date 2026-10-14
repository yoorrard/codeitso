// 저장소(store.ts): 깨진 저장 값, 처음 값이면 키 지우기, 장바구니 담기·빼기·메모, 옛 키 지우기
import { setPersistentEngine } from '@nanostores/persistent';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, KEYS } from '../../src/lib/saved.ts';

// store.ts를 불러오기 전에 가짜 저장소를 끼운다 (일부러 깨진 값과 남의 키를 넣어 둔다)
const storage: Record<string, string> = {
  [KEYS.cart]: '{깨진 JSON',
  [KEYS.prefs]: JSON.stringify({ motion: 'reduce', sound: 'yes' }),
  'other:key': '그대로',
};
setPersistentEngine(storage, { addEventListener() {}, removeEventListener() {} });

let store: typeof import('../../src/lib/store.ts');
beforeAll(async () => {
  store = await import('../../src/lib/store.ts');
});

describe('저장소', () => {
  it('깨진 저장 값은 처음 값으로 읽는다', () => {
    expect(store.$cart.get()).toEqual([]);
    expect(store.$prefs.get()).toEqual({ ...DEFAULT_PREFS, motion: 'reduce' });
    expect(store.$storageOk.get()).toBe(true);
  });

  it('담기·메모·빼기, 비면 키를 지운다', () => {
    expect(store.addToCart({ id: 'google-fonts:roboto', name: 'Roboto', cat: 'design', sub: 'fonts' }, 10)).toBe(true);
    expect(store.addToCart({ id: 'mcp-registry:x', name: 'X', cat: 'ai', sub: 'mcp', memo: '파일 읽기' }, 11)).toBe(true);
    expect(store.$cartCount.get()).toBe(2);
    expect(store.inCart('google-fonts:roboto')).toBe(true);
    store.setCartMemo('google-fonts:roboto', '본문 글꼴');
    expect(JSON.parse(storage[KEYS.cart] ?? '[]')[0]).toEqual({ id: 'google-fonts:roboto', name: 'Roboto', cat: 'design', sub: 'fonts', at: 10, memo: '본문 글꼴' });
    store.setCartMemo('google-fonts:roboto', '  ');
    expect(store.$cart.get()[0]?.memo).toBeUndefined();
    store.removeFromCart('google-fonts:roboto');
    store.removeFromCart('mcp-registry:x');
    expect(KEYS.cart in storage).toBe(false);
  });

  it('설정은 모양을 골라 저장하고, 처음 값이면 키를 지운다', () => {
    store.setPrefs({ glossary: false });
    expect(store.$prefs.get()).toEqual({ motion: 'reduce', glossary: false });
    store.setPrefs({ motion: 'auto', glossary: true });
    expect(KEYS.prefs in storage).toBe(false);
  });

  it('보낸 이벤트는 한 번만, 연 용어도 한 번만', () => {
    expect(store.rememberSent('a')).toBe(true);
    expect(store.rememberSent('a')).toBe(false);
    store.markTermSeen('api');
    store.markTermSeen('api');
    expect(store.$termsSeen.get()).toEqual(['api']);
  });

  it('기록 지우기는 장바구니·메타·연 용어를 지우고 설정과 남의 키는 남긴다', () => {
    store.addToCart({ id: 'a:b', name: 'B', cat: 'api', sub: 'weather' }, 1);
    store.setPrefs({ motion: 'reduce' });
    store.clearAll();
    expect(store.$cart.get()).toEqual([]);
    expect(store.$termsSeen.get()).toEqual([]);
    expect(store.$prefs.get().motion).toBe('reduce');
    expect(storage['other:key']).toBe('그대로');
  });
});
