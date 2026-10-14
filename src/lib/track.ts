// 익명 집계 보내기 (R-60, docs/ARCHITECTURE.md 8절). 세는 이벤트는 다섯 개뿐(event-spec.ts)이고 본문은 이름과 구간뿐이다.
// once 열쇠를 주면 같은 열쇠는 한 번만 보낸다 (cc:meta:v1.sent, 최근 20개). 보내기에 실패해도 이용자에게 알리지 않는다.
import type { Session } from './engine/types.ts';
import type { BucketOf, EventType } from './event-spec.ts';
import { shortHash } from './event-spec.ts';
import { FILES } from './routes.ts';
import { shareHash } from './share.ts';
import { HOST } from './stage.ts';
import { rememberSent } from './store.ts';

export const EVENT_URL = FILES.event;

export function track<T extends EventType>(type: T, bucket?: BucketOf<T>, once?: string): void {
  // 서버 없는 정적 호스트(PUBLIC_HOST=static, 설계서 9.4절)에는 받을 곳이 없으므로 아무것도 보내지 않는다
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

/** 지금 상태를 가리는 짧은 열쇠 (같은 상태의 영수증·카드 복사를 한 번만 세려고). 답·장바구니가 같으면 같다 */
export function stateKey(s: Session): string {
  return shortHash(shareHash(s));
}
