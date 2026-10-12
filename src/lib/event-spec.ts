// 익명 집계의 약속 (ARCHITECTURE 8절, R-60): 세는 이벤트 다섯 개와 받을 수 있는 구간 값.
// 화면(src/lib/track.ts)과 Worker(worker/index.ts)가 같이 쓴다. 브라우저·Node API 없이 순수 함수만.

export const EVENT_SPEC = {
  interview_start: [''],
  receipt_issued: ['m00-05', 'm05-10', 'm10-15', 'm15-20', 'm20-30', 'm30+', 'none'],
  card_copy: ['first', 'next', 'verify', 'error', 'change'],
  required_done: [''],
  quiz_answer: ['ok', 'ng'],
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

/** 본문 `{"t":"card_copy","b":"first"}`을 검사한다. 목록에 없는 이벤트·구간, 다른 칸, 큰 본문은 null */
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

/** 영수증 발행 구간: 인터뷰 첫 답부터 걸린 시간. 시작 시각이 없으면(레시피·공유 링크) none */
export function elapsedBucket(startedAt: number | undefined, now: number): BucketOf<'receipt_issued'> {
  if (startedAt === undefined || !Number.isFinite(startedAt) || now < startedAt) return 'none';
  const min = (now - startedAt) / 60000;
  if (min < 5) return 'm00-05';
  if (min < 10) return 'm05-10';
  if (min < 15) return 'm10-15';
  if (min < 20) return 'm15-20';
  if (min < 30) return 'm20-30';
  return 'm30+';
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

/** b가 그 이벤트의 구간 목록에 있는가 (자료에서 온 카드 id 같은 것을 좁힐 때) */
export function isBucket<T extends EventType>(type: T, b: string): b is BucketOf<T> {
  const allowed: readonly string[] = EVENT_SPEC[type];
  return allowed.includes(b);
}
