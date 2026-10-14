// 엔진 결과 파생 store: 저장된 Session으로 매번 evaluate()를 돌린다 (결과는 저장하지 않는다).
// 자료 전체를 불러오므로 엔진 결과가 필요한 섬만 import한다. 설정 메뉴처럼 결과가 필요 없는 섬은 store.ts만.
import { computed } from 'nanostores';
import type { Session } from './engine/types.ts';
import { evaluate } from './engine/index.ts';
import { catalog } from './data.ts';
import { $session } from './store.ts';

export const $result = computed($session, (s) => evaluate(catalog, s));

/** 바뀐 상태를 정리해서 저장한다. 저장은 늘 evaluate()가 돌려준 r.session으로 */
export function commitSession(next: Partial<Session>): void {
  $session.set(evaluate(catalog, next).session);
}

/** 지금 상태를 고쳐서 저장한다 */
export function updateSession(change: (s: Session) => Partial<Session>): void {
  const now = $session.get();
  commitSession({ ...now, ...change(now) });
}
