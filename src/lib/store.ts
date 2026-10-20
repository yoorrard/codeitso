// 브라우저 저장은 이 파일 한 곳에서만 한다 (docs/ARCHITECTURE.md 5절, CLAUDE.md 꼭 지킬 것 2).
// v5.1: 장바구니(담은 재료와 메모), 프로젝트 메모, 지난 프롬프트, 최근 본 재료, 찜(N1), 설정, 연 용어, 집계 기록, 이용 가이드(O1).
// localStorage를 못 쓰면(사생활 보호 모드, 막힌 저장소) 메모리에만 두고 $storageOk를 false로 둔다.
import { persistentAtom, setPersistentEngine } from '@nanostores/persistent';
import { atom, computed } from 'nanostores';
import type { AddResult, CartLine, Guide, Meta, Prefs, PromptEntry, RecentItem, WishItem } from './saved.ts';
import {
  DEFAULT_PREFS,
  EMPTY_GUIDE,
  EMPTY_META,
  KEYS,
  LEGACY_KEYS,
  OLD_RECEIPTS_KEY,
  PROMPTS_MAX,
  SENT_MAX,
  addLine,
  addLines,
  cleanMemo,
  isDefaultPrefs,
  isEmptyGuide,
  isEmptyList,
  isEmptyMeta,
  pushRecent,
  readCart,
  readGuide,
  readMeta,
  readPrefs,
  readProject,
  readPrompts,
  readRecent,
  readWish,
  samePrompt,
  toggleWishList,
} from './saved.ts';

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
else if (typeof window !== 'undefined') {
  for (const k of LEGACY_KEYS) window.localStorage.removeItem(k);
  // v5 영수증 → v5.1 지난 프롬프트 (한 번만 옮긴다)
  const old = window.localStorage.getItem(OLD_RECEIPTS_KEY);
  if (old !== null) {
    if (window.localStorage.getItem(KEYS.prompts) === null) {
      try {
        const moved = readPrompts(JSON.parse(old));
        if (moved.length > 0) window.localStorage.setItem(KEYS.prompts, JSON.stringify(moved));
      } catch {
        // 깨진 옛 값은 버린다
      }
    }
    window.localStorage.removeItem(OLD_RECEIPTS_KEY);
  }
}

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

export const $cart = persistentAtom<CartLine[]>(KEYS.cart, [], codec(readCart, isEmptyList));
export const $project = persistentAtom<string>(KEYS.project, '', codec(readProject, (s) => s === ''));
export const $prompts = persistentAtom<PromptEntry[]>(KEYS.prompts, [], codec(readPrompts, isEmptyList));
export const $recent = persistentAtom<RecentItem[]>(KEYS.recent, [], codec((raw) => readRecent(raw), isEmptyList));
export const $wish = persistentAtom<WishItem[]>(KEYS.wish, [], codec(readWish, isEmptyList));
export const $meta = persistentAtom<Meta>(KEYS.meta, EMPTY_META, codec(readMeta, isEmptyMeta));
export const $prefs = persistentAtom<Prefs>(KEYS.prefs, DEFAULT_PREFS, codec(readPrefs, isDefaultPrefs));
export const $guide = persistentAtom<Guide>(KEYS.guide, EMPTY_GUIDE, codec(readGuide, isEmptyGuide));

/** 담은 재료 개수 (머리줄 배지) */
export const $cartCount = computed($cart, (l) => l.length);

export type NewLine = Omit<CartLine, 'addedAt' | 'memo'> & { memo?: string };

function lineOf(line: NewLine, now: number): CartLine {
  const memo = cleanMemo(line.memo);
  const next: CartLine = { id: line.id, name: line.name, cat: line.cat, sub: line.sub, addedAt: now };
  if (memo) next.memo = memo;
  return next;
}

/** 재료를 담는다. 이미 있으면 'exists'(메모를 주었으면 메모만 바꾼다), 가득 차서 못 담았으면 'full' */
export function addToCart(line: NewLine, now: number): AddResult {
  const { list, result } = addLine($cart.get(), lineOf(line, now));
  if (result !== 'full') $cart.set(list);
  return result;
}

/** 여러 재료를 한 번에 담는다 (스타터 키트·공유 링크). 이미 담은 것은 건너뛴다 */
export function addManyToCart(lines: readonly NewLine[], now: number): { added: number; skipped: number; full: boolean } {
  const r = addLines(
    $cart.get(),
    lines.map((l) => lineOf(l, now)),
  );
  $cart.set(r.list);
  return { added: r.added, skipped: r.skipped, full: r.full };
}

export function removeFromCart(id: string): void {
  $cart.set($cart.get().filter((x) => x.id !== id));
}

export function clearCart(): void {
  $cart.set([]);
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

/** 프로젝트 메모 (만들 앱 한 줄). 프롬프트를 뽑아도 지우지 않는다 */
export function setProject(text: string): void {
  $project.set(readProject(text));
}

/** 뽑은 프롬프트를 맨 앞에 남긴다. 같은 재료·메모로 다시 뽑으면 지난 것을 지우고 새것만 남긴다 (PROMPTS_MAX개까지) */
export function savePrompt(p: PromptEntry): void {
  $prompts.set(readPrompts([p, ...$prompts.get().filter((x) => x.id !== p.id && !samePrompt(x, p))]).slice(0, PROMPTS_MAX));
}

export function removePrompt(id: string): void {
  $prompts.set($prompts.get().filter((x) => x.id !== id));
}

/** 상세를 연 재료를 최근 본 재료 맨 앞에 */
export function markViewed(item: Omit<RecentItem, 'at'>, now: number): void {
  $recent.set(readRecent(pushRecent($recent.get(), { ...item, at: now })));
}

export function clearRecent(): void {
  $recent.set([]);
}

/** 찜을 켜고 끈다. 켰으면 'on', 껐으면 'off', 가득 차서 못 켰으면 'full' */
export function toggleWish(item: Omit<WishItem, 'at'>, now: number): 'on' | 'off' | 'full' {
  const r = toggleWishList($wish.get(), { ...item, at: now });
  if (!r.full) $wish.set(readWish(r.list));
  return r.full ? 'full' : r.on ? 'on' : 'off';
}

export function removeWish(id: string): void {
  $wish.set($wish.get().filter((x) => x.id !== id));
}

export function clearWish(): void {
  $wish.set([]);
}

/** 뺀 찜을 되돌린다 (찜한 재료 쪽의 [되돌리기]): 뺄 때 잡아 둔 목록 그대로 */
export function restoreWish(list: readonly WishItem[]): void {
  $wish.set(readWish(list));
}

export function setPrefs(patch: Partial<Prefs>): void {
  $prefs.set(readPrefs({ ...$prefs.get(), ...patch }));
}

/** 처음 방문 가이드를 열었다 (O1): 끝까지 봤든 건너뛰었든 다시 저절로 열지 않는다. [이용 가이드]로는 언제든 다시 연다 */
export function markTourSeen(): void {
  $guide.set({ ...$guide.get(), tour: true });
}

/** 상세의 '어려운 말 풀이' 안내를 닫았다 (O1): 다음부터는 작은 [어려운 말 풀이] 단추만 둔다 */
export function closeTermHint(): void {
  $guide.set({ ...$guide.get(), hint: true });
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

/** '저장한 기록 지우기': 장바구니·프로젝트 메모·지난 프롬프트·최근 본 재료·찜·연 용어·집계 기록을 지운다. 설정(동작 줄이기)과 이용 가이드는 기록이 아니라서 남긴다 */
export function clearAll(): void {
  $cart.set([]);
  $project.set('');
  $prompts.set([]);
  $recent.set([]);
  $wish.set([]);
  $meta.set(EMPTY_META);
  $termsSeen.set([]);
}
