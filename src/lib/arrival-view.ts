// 설계도 받기에서 지금 보는 영수증 (brief 6.8, D70): 내 것 · 영수증 링크로 연 남의 것(읽기 전용) · 깨진 링크 · 읽는 중.
// 영수증 섬(Receipt)이 주소의 #r=를 읽어 정하고, 아래 막대 섬(ArrivalAction)과 상태 한 줄(StatusLine)이 같은 값을 읽는다.
// 그래서 셋이 같은 까닭을 말한다 (잠긴 화면의 빈 상태·상태 한 줄·주 버튼). 화면 상태일 뿐 저장하지 않는다
// (저장은 store.ts 한 곳, '이 영수증으로 이어서 가기'를 누를 때만).
import { atom } from 'nanostores';
import type { Catalog, EngineResult } from './engine/index.ts';
import { evaluate } from './engine/index.ts';
import type { Session } from './engine/types.ts';
import type { ShareRead } from './share.ts';

export type ArrivalView = { kind: 'loading' } | { kind: 'own' } | { kind: 'shared'; session: Partial<Session> } | { kind: 'broken' };

export const $arrivalView = atom<ArrivalView>({ kind: 'loading' });

/** 영수증을 찍은 때 ('2026-10-13 14:05'). 열 때마다 새로 찍고, 영수증 종이와 내려받는 설계도가 같은 값을 쓴다 */
export const $issuedAt = atom('');

/** 주소에서 읽은 영수증 링크 → 볼 것. 풀 수는 있어도 설계도를 낼 수 없는 상태(막힌 곳이 남음)면 깨진 링크로 본다 */
export function viewOf(cat: Catalog, read: ShareRead): ArrivalView {
  if (read.status === 'none') return { kind: 'own' };
  if (read.status === 'broken') return { kind: 'broken' };
  return evaluate(cat, read.session).canIssue ? { kind: 'shared', session: read.session } : { kind: 'broken' };
}

const shared = new WeakMap<Partial<Session>, EngineResult>();

/** 화면이 그릴 결과: 남의 영수증이면 그 상태를 평가하고(같은 링크는 한 번만), 아니면 내 결과 그대로 */
export function resultFor(cat: Catalog, view: ArrivalView, own: EngineResult): EngineResult {
  if (view.kind !== 'shared') return own;
  const hit = shared.get(view.session);
  if (hit) return hit;
  const r = evaluate(cat, view.session);
  shared.set(view.session, r);
  return r;
}
