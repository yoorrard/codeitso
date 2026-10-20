// 저장소(store.ts): 깨진 저장 값, 처음 값이면 키 지우기, 장바구니 담기·여러 개 담기·빼기·메모·비우기, 프로젝트 메모, 지난 프롬프트(v5 영수증 옮기기), 최근 본 재료, 옛 키 지우기
import { setPersistentEngine } from '@nanostores/persistent';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, KEYS } from '../../src/lib/saved.ts';
import type { PromptEntry } from '../../src/lib/saved.ts';

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

const prompt = (id: string, at: number, memo?: string): PromptEntry => ({ id, at, lines: [{ id: 'x:y', name: 'Y', cat: 'api', sub: 'weather', ...(memo ? { memo } : {}) }] });

describe('저장소', () => {
  it('깨진 저장 값은 처음 값으로 읽는다', () => {
    expect(store.$cart.get()).toEqual([]);
    expect(store.$prefs.get()).toEqual({ ...DEFAULT_PREFS, motion: 'reduce' });
    expect(store.$storageOk.get()).toBe(true);
  });

  it('담기·다시 담기·메모·빼기, 비면 키를 지운다', () => {
    expect(store.addToCart({ id: 'google-fonts:roboto', name: 'Roboto', cat: 'design', sub: 'fonts' }, 10)).toBe('added');
    expect(store.addToCart({ id: 'mcp-registry:x', name: 'X', cat: 'ai', sub: 'mcp', memo: '파일 읽기' }, 11)).toBe('added');
    expect(store.addToCart({ id: 'mcp-registry:x', name: 'X', cat: 'ai', sub: 'mcp' }, 12)).toBe('exists');
    expect(store.$cartCount.get()).toBe(2);
    expect(store.inCart('google-fonts:roboto')).toBe(true);
    store.setCartMemo('google-fonts:roboto', '본문 글꼴');
    expect(JSON.parse(storage[KEYS.cart] ?? '[]')[0]).toEqual({ id: 'google-fonts:roboto', name: 'Roboto', cat: 'design', sub: 'fonts', addedAt: 10, memo: '본문 글꼴' });
    store.setCartMemo('google-fonts:roboto', '  ');
    expect(store.$cart.get()[0]?.memo).toBeUndefined();
    expect(store.$cart.get()[1]?.memo).toBe('파일 읽기');
    store.removeFromCart('google-fonts:roboto');
    store.removeFromCart('mcp-registry:x');
    expect(KEYS.cart in storage).toBe(false);
  });

  it('여러 개 담기(키트·공유 링크)는 있는 것을 건너뛰고, 비우기는 모두 뺀다', () => {
    store.addToCart({ id: 'a:1', name: 'A1', cat: 'api', sub: 'weather' }, 1);
    const r = store.addManyToCart(
      [
        { id: 'a:1', name: 'A1', cat: 'api', sub: 'weather' },
        { id: 'a:2', name: 'A2', cat: 'design', sub: 'icons' },
      ],
      2,
    );
    expect(r).toEqual({ added: 1, skipped: 1, full: false });
    expect(store.$cart.get().map((x) => x.id)).toEqual(['a:1', 'a:2']);
    store.clearCart();
    expect(store.$cart.get()).toEqual([]);
  });

  it('프로젝트 메모는 다듬어 저장하고 비면 키를 지운다', () => {
    store.setProject('  급식 앱  ');
    expect(store.$project.get()).toBe('급식 앱');
    expect(storage[KEYS.project]).toBe(JSON.stringify('급식 앱'));
    store.setProject('');
    expect(KEYS.project in storage).toBe(false);
  });

  it('지난 프롬프트는 새것이 앞에 남고, 같은 재료로 다시 뽑으면 하나만 남고, 지운다', () => {
    store.savePrompt(prompt('a', 1, '메모'));
    store.savePrompt(prompt('b', 2));
    expect(store.$prompts.get().map((r) => r.id)).toEqual(['b', 'a']);
    store.savePrompt(prompt('c', 3));
    expect(store.$prompts.get().map((r) => r.id)).toEqual(['c', 'a']);
    store.removePrompt('a');
    store.removePrompt('c');
    expect(KEYS.prompts in storage).toBe(false);
  });

  it('최근 본 재료는 맨 앞에, 지우면 키도 지운다', () => {
    store.markViewed({ id: 'a', name: 'A', cat: 'api', sub: 'weather' }, 1);
    store.markViewed({ id: 'b', name: 'B', cat: 'api', sub: 'weather' }, 2);
    store.markViewed({ id: 'a', name: 'A', cat: 'api', sub: 'weather' }, 3);
    expect(store.$recent.get().map((x) => x.id)).toEqual(['a', 'b']);
    store.clearRecent();
    expect(KEYS.recent in storage).toBe(false);
  });

  it('찜은 켜면 맨 앞에, 다시 누르면 빼고, 비면 키를 지운다', () => {
    expect(store.toggleWish({ id: 'a', name: 'A', cat: 'api', sub: 'weather' }, 1)).toBe('on');
    expect(store.toggleWish({ id: 'b', name: 'B', cat: 'design', sub: 'fonts' }, 2)).toBe('on');
    expect(store.$wish.get().map((x) => x.id)).toEqual(['b', 'a']);
    expect(store.toggleWish({ id: 'a', name: 'A', cat: 'api', sub: 'weather' }, 3)).toBe('off');
    store.removeWish('b');
    expect(KEYS.wish in storage).toBe(false);
    store.toggleWish({ id: 'c', name: 'C', cat: 'api', sub: 'weather' }, 4);
    store.clearWish();
    expect(store.$wish.get()).toEqual([]);
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

  it('기록 지우기는 장바구니·프로젝트 메모·지난 프롬프트·최근 본 재료·찜·메타·연 용어를 지우고 설정과 남의 키는 남긴다', () => {
    store.addToCart({ id: 'a:b', name: 'B', cat: 'api', sub: 'weather' }, 1);
    store.setProject('앱');
    store.savePrompt(prompt('c', 3));
    store.markViewed({ id: 'a', name: 'A', cat: 'api', sub: 'weather' }, 1);
    store.toggleWish({ id: 'w', name: 'W', cat: 'api', sub: 'weather' }, 1);
    store.setPrefs({ motion: 'reduce' });
    store.clearAll();
    expect(store.$wish.get()).toEqual([]);
    expect(store.$cart.get()).toEqual([]);
    expect(store.$project.get()).toBe('');
    expect(store.$prompts.get()).toEqual([]);
    expect(store.$recent.get()).toEqual([]);
    expect(store.$termsSeen.get()).toEqual([]);
    expect(store.$prefs.get().motion).toBe('reduce');
    expect(storage['other:key']).toBe('그대로');
  });
});
