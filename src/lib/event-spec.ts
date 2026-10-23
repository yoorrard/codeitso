// 익명 집계의 약속 (ARCHITECTURE 7절): 세는 이벤트 다섯 개와 받을 수 있는 구간 값.
// 화면(src/lib/track.ts)과 Worker(worker/index.ts)가 같이 쓴다. 브라우저·Node API 없이 순수 함수만.
// v5 S2: 담기(대분류), 계산(재료 수 구간), .md 받기, .md 복사, 스타터 키트 담기(키트 id). 재료 id·메모·검색어는 보내지 않는다.
// 방문(D134): 브라우저마다 한국 날짜로 하루 한 번(cc:meta:v1.sent에 'visit:<날짜>'), 바닥글의 Today·Total 숫자가 된다.
import { CATEGORY_ORDER } from './catalog/types.ts';
import { KIT_IDS } from './kits.ts';

/** 계산한 재료 수 구간 */
export const CHECKOUT_BUCKETS = ['n01', 'n02-03', 'n04-06', 'n07-10', 'n11-20', 'n21+'] as const;

export const EVENT_SPEC = {
  cart_add: CATEGORY_ORDER,
  checkout: CHECKOUT_BUCKETS,
  md_download: [''],
  md_copy: [''],
  bundle_add: KIT_IDS,
  visit: [''],
} as const satisfies Record<string, readonly string[]>;

export type EventType = keyof typeof EVENT_SPEC;
export type BucketOf<T extends EventType> = (typeof EVENT_SPEC)[T][number];

/** 본문 상한 (바이트). 넘으면 읽지 않고 버린다 */
export const BODY_MAX = 200;

export interface EventRecord {
  type: EventType;
  bucket: string;
}

function isEventType(t: unknown): t is EventType {
  return typeof t === 'string' && Object.hasOwn(EVENT_SPEC, t);
}

/** 본문 `{"t":"cart_add","b":"design"}`을 검사한다. 목록에 없는 이벤트·구간, 다른 칸, 큰 본문은 null */
export function parseEvent(body: string): EventRecord | null {
  if (new TextEncoder().encode(body).length > BODY_MAX) return null;
  let o: unknown;
  try {
    o = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return null;
  const rec = o as Record<string, unknown>;
  if (Object.keys(rec).some((k) => k !== 't' && k !== 'b')) return null;
  const t = rec['t'];
  const b = rec['b'] ?? '';
  if (!isEventType(t) || typeof b !== 'string') return null;
  const allowed: readonly string[] = EVENT_SPEC[t];
  return allowed.includes(b) ? { type: t, bucket: b } : null;
}

/** 계산한 재료 수 → 구간 */
export function countBucket(n: number): BucketOf<'checkout'> {
  if (n <= 1) return 'n01';
  if (n <= 3) return 'n02-03';
  if (n <= 6) return 'n04-06';
  if (n <= 10) return 'n07-10';
  if (n <= 20) return 'n11-20';
  return 'n21+';
}

/** 같은 상태를 가리는 짧은 해시 (FNV-1a 32비트, 36진수). 보낸 열쇠를 기억할 때 쓴다 */
export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** UTC 날짜 YYYY-MM-DD (D1 표의 day) */
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** 한국 날짜 YYYY-MM-DD: 방문 수의 '오늘'은 한국 자정에 바뀐다 */
export function kstDay(now: number): string {
  return new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);
}

/** D1 표 day 칸: 방문은 한국 날짜, 나머지 이벤트는 UTC 날짜(지금까지와 같게) */
export function dayKey(type: EventType, now: number): string {
  return type === 'visit' ? kstDay(now) : utcDay(now);
}

/** 누적 방문 수를 한 줄로 들고 있는 칸 (day='all'). 바닥글이 날짜 줄 전체를 더하지 않고 두 줄만 읽게 한다 */
export const VISIT_TOTAL = { day: 'all', type: 'visit_total', bucket: '' } as const;

/** b가 그 이벤트의 구간 목록에 있는가 (자료에서 온 카드 id 같은 것을 좁힐 때) */
export function isBucket<T extends EventType>(type: T, b: string): b is BucketOf<T> {
  const allowed: readonly string[] = EVENT_SPEC[type];
  return allowed.includes(b);
}
