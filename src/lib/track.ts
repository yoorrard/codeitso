// 익명 집계 보내기 (docs/ARCHITECTURE.md 7절). 세는 이벤트는 event-spec.ts에 적힌 것뿐이고 본문은 이름과 구간뿐이다
// (담기 = 대분류, 계산 = 재료 수 구간, .md 받기·복사, 스타터 키트 담기 = 키트 id). 재료 id·메모는 보내지 않는다.
// once 열쇠를 주면 같은 열쇠는 한 번만 보낸다 (cc:meta:v1.sent). 보내기에 실패해도 이용자에게 알리지 않는다.
import type { BucketOf, EventType } from './event-spec.ts';
import { isBucket } from './event-spec.ts';
import { FILES } from './routes.ts';
import { HOST } from './stage.ts';
import { rememberSent } from './store.ts';

export const EVENT_URL = FILES.event;

export function track<T extends EventType>(type: T, bucket?: BucketOf<T>, once?: string): void {
  // 서버 없는 정적 호스트(PUBLIC_HOST=static)에는 받을 곳이 없으므로 아무것도 보내지 않는다
  if (HOST === 'static') return;
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
  if (once !== undefined && !rememberSent(`${type}:${once}`)) return;
  const body = JSON.stringify(bucket ? { t: type, b: bucket } : { t: type });
  try {
    navigator.sendBeacon(EVENT_URL, body);
  } catch {
    // 집계는 없어도 되는 것이라 조용히 넘긴다
  }
}

/** 담기 한 번 (구간 = 대분류). 모르는 대분류면 보내지 않는다 */
export function trackAdd(cat: string): void {
  if (isBucket('cart_add', cat)) track('cart_add', cat);
}
