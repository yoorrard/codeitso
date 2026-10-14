// 브라우저에 저장하는 값의 모양과, 읽은 값을 믿지 않고 고르는 함수 (부작용 없음, 시험 있음).
// 저장·불러오기 자체는 store.ts가 한다 (docs/ARCHITECTURE.md 4절). v5: 장바구니(담은 재료와 메모) + 설정 + 연 용어 + 집계 기록.

export const KEYS = {
  cart: 'cc:cart:v1',
  meta: 'cc:meta:v1',
  prefs: 'cc:prefs:v1',
} as const;

/** 더는 쓰지 않는 옛 키(v4 단계 흐름의 답·용어 카드·장면·영수증). 옮길 값이 없어 읽지 않고, 남아 있으면 지운다 */
export const LEGACY_KEYS = ['cc:trip:v1', 'cc:session:v1', 'cc:study:v1', 'cc:seen:v1', 'cc:receipts:v1'] as const;

/** 장바구니 한 줄: 재료 id와 다시 그리기에 필요한 이름·자리, 이용자 메모(어디에 어떻게 쓸지) */
export interface CartLine {
  id: string;
  name: string;
  /** 대분류 id (design, ai, api…) */
  cat: string;
  /** 소분류 id */
  sub: string;
  memo?: string;
  /** 담은 때 (ms) */
  at: number;
}

export interface Meta {
  /** 보낸 집계 이벤트 열쇠 (최근 SENT_MAX개) */
  sent: string[];
}

export interface Prefs {
  motion: 'auto' | 'reduce';
  /** 어려운 말 풀이: 글을 골라 뜨는 풀이. 기본 켜짐 */
  glossary: boolean;
}

export const SENT_MAX = 20;
/** 장바구니에 담을 수 있는 줄 수 (넘치면 가장 오래된 것부터 빠지지 않고 담기를 막는다) */
export const CART_MAX = 300;
export const MEMO_MAX = 200;
const ID_MAX = 200;
const NAME_MAX = 200;

export const DEFAULT_PREFS: Prefs = { motion: 'auto', glossary: true };
export const EMPTY_META: Meta = { sent: [] };

function obj(raw: unknown): Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function strings(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 100))].slice(0, max);
}

const SLUG = /^[a-z0-9][a-z0-9-]{0,39}$/;

/** 메모는 앞뒤 공백을 걷고 MEMO_MAX자(글자 단위)까지. 비면 없음 */
export function cleanMemo(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const t = [...raw.trim()].slice(0, MEMO_MAX).join('');
  return t === '' ? undefined : t;
}

/** 장바구니: 모양이 맞는 줄만, 같은 id는 처음 것 하나, CART_MAX줄까지 */
export function readCart(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const o = obj(item);
    const [id, name, cat, sub, at] = [o['id'], o['name'], o['cat'], o['sub'], o['at']];
    if (typeof id !== 'string' || id.length === 0 || id.length > ID_MAX || seen.has(id)) continue;
    if (typeof name !== 'string' || name.length === 0) continue;
    if (typeof cat !== 'string' || !SLUG.test(cat) || typeof sub !== 'string' || !SLUG.test(sub)) continue;
    const line: CartLine = { id, name: [...name].slice(0, NAME_MAX).join(''), cat, sub, at: typeof at === 'number' && Number.isFinite(at) && at > 0 ? at : 0 };
    const memo = cleanMemo(o['memo']);
    if (memo) line.memo = memo;
    seen.add(id);
    out.push(line);
    if (out.length === CART_MAX) break;
  }
  return out;
}

export function readMeta(raw: unknown): Meta {
  return { sent: strings(obj(raw)['sent'], 200).slice(-SENT_MAX) };
}

export function readPrefs(raw: unknown): Prefs {
  const o = obj(raw);
  return { motion: o['motion'] === 'reduce' ? 'reduce' : 'auto', glossary: o['glossary'] !== false };
}

/** 처음 값과 같으면 저장할 필요가 없다 (키를 지운다) */
export function isEmptyCart(l: CartLine[]): boolean {
  return l.length === 0;
}
export function isEmptyMeta(m: Meta): boolean {
  return m.sent.length === 0;
}
export function isDefaultPrefs(p: Prefs): boolean {
  return p.motion === DEFAULT_PREFS.motion && p.glossary === DEFAULT_PREFS.glossary;
}

/** 줄 하나를 더한다. 이미 있으면 메모만 바꾸고 자리는 그대로. 가득 찼으면 그대로 돌려준다 (full: true) */
export function addLine(list: readonly CartLine[], line: CartLine): { list: CartLine[]; full: boolean } {
  const at = list.findIndex((x) => x.id === line.id);
  if (at >= 0) {
    const next = [...list];
    const prev = next[at];
    if (prev) next[at] = line.memo === undefined ? prev : { ...prev, memo: line.memo };
    return { list: next, full: false };
  }
  if (list.length >= CART_MAX) return { list: [...list], full: true };
  return { list: [...list, line], full: false };
}
