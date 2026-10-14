// 브라우저 저장은 이 파일 한 곳에서만 한다 (docs/ARCHITECTURE.md 4절, CLAUDE.md 꼭 지킬 것 2).
// v5: 장바구니(담은 재료와 메모), 설정, 연 용어, 집계 기록. 영수증·지난 영수증은 S2에서 더한다.
// localStorage를 못 쓰면(사생활 보호 모드, 막힌 저장소) 메모리에만 두고 $storageOk를 false로 둔다.
import { persistentAtom, setPersistentEngine } from '@nanostores/persistent';
import { atom, computed } from 'nanostores';
import type { CartLine, Meta, Prefs } from './saved.ts';
import { DEFAULT_PREFS, EMPTY_META, KEYS, LEGACY_KEYS, SENT_MAX, addLine, cleanMemo, isDefaultPrefs, isEmptyCart, isEmptyMeta, readCart, readMeta, readPrefs } from './saved.ts';

/** 빌드(서버)에서는 저장소가 없어도 안내를 띄우지 않는다. 브라우저에서만 실제로 써 본다. */
function storageWorks(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const probe = 'cc:probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const ok = storageWorks();
if (!ok) setPersistentEngine({}, { addEventListener() {}, removeEventListener() {} });
else if (typeof window !== 'undefined') for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);

/** localStorage를 쓸 수 있는가 (false면 '담은 것이 저장되지 않는다' 한 줄) */
export const $storageOk = atom(ok);

/** JSON으로 저장하되, 읽을 때는 모양을 고르고, 처음 값이면 키를 지운다 */
function codec<T>(read: (raw: unknown) => T, empty: (v: T) => boolean): { encode: (v: T) => string | undefined; decode: (s: string) => T } {
  return {
    encode: (v) => (empty(v) ? undefined : JSON.stringify(v)),
    decode: (s) => {
      try {
        return read(JSON.parse(s));
      } catch {
        return read(undefined);
      }
    },
  };
}

export const $cart = persistentAtom<CartLine[]>(KEYS.cart, [], codec(readCart, isEmptyCart));
export const $meta = persistentAtom<Meta>(KEYS.meta, EMPTY_META, codec(readMeta, isEmptyMeta));
export const $prefs = persistentAtom<Prefs>(KEYS.prefs, DEFAULT_PREFS, codec(readPrefs, isDefaultPrefs));

/** 담은 재료 개수 (머리줄 배지) */
export const $cartCount = computed($cart, (l) => l.length);

/** 재료를 담는다. 이미 있으면 메모만 바꾼다. 장바구니가 가득 차서 못 담았으면 false */
export function addToCart(line: Omit<CartLine, 'at' | 'memo'> & { memo?: string }, now: number): boolean {
  const memo = cleanMemo(line.memo);
  const next: CartLine = { id: line.id, name: line.name, cat: line.cat, sub: line.sub, at: now };
  if (memo) next.memo = memo;
  const { list, full } = addLine($cart.get(), next);
  if (full) return false;
  $cart.set(list);
  return true;
}

export function removeFromCart(id: string): void {
  $cart.set($cart.get().filter((x) => x.id !== id));
}

/** 메모를 바꾼다. 빈 글이면 메모를 지운다 */
export function setCartMemo(id: string, memo: string): void {
  const clean = cleanMemo(memo);
  $cart.set(
    $cart.get().map((x) => {
      if (x.id !== id) return x;
      const { memo: _old, ...rest } = x;
      return clean ? { ...rest, memo: clean } : rest;
    }),
  );
}

export function inCart(id: string): boolean {
  return $cart.get().some((x) => x.id === id);
}

export function setPrefs(patch: Partial<Prefs>): void {
  $prefs.set(readPrefs({ ...$prefs.get(), ...patch }));
}

/** 한 번 연 어려운 말 풀이 용어 (D69). 고른 글은 저장하지 않는다 */
export const TERMS_KEY = 'cc:terms:v1';
export const TERMS_SEEN_MAX = 300;

/** 용어 id 목록만 고른다 (풀이 id: 영문 소문자·숫자·-). 같은 것은 한 번, 최근 300개 */
export function readTermsSeen(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((x): x is string => typeof x === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(x));
  return [...new Set(ids)].slice(-TERMS_SEEN_MAX);
}

export const $termsSeen = persistentAtom<string[]>(TERMS_KEY, [], codec(readTermsSeen, (l) => l.length === 0));

/** 풀이를 연 용어를 적는다 (이미 있으면 그대로, 넘치면 가장 오래된 것부터 뺀다) */
export function markTermSeen(id: string): void {
  const list = $termsSeen.get();
  if (list.includes(id)) return;
  $termsSeen.set(readTermsSeen([...list, id]));
}

/** 보낸 집계 이벤트 열쇠를 기억한다. 이미 보냈으면 false */
export function rememberSent(key: string): boolean {
  const m = $meta.get();
  if (m.sent.includes(key)) return false;
  $meta.set({ sent: [...m.sent, key].slice(-SENT_MAX) });
  return true;
}

/** '저장한 기록 지우기': 장바구니·연 용어·집계 기록을 지운다. 설정(동작 줄이기)은 기록이 아니라서 남긴다 */
export function clearAll(): void {
  $cart.set([]);
  $meta.set(EMPTY_META);
  $termsSeen.set([]);
}
