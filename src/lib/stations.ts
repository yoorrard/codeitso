// 정류장 다섯 곳과 열리는 조건 (docs/UX.md 2.1절). evaluate() 결과로만 정한다 (부작용 없음, 시험 있음).
import type { Catalog, EngineResult } from './engine/index.ts';
import { normalizeSession } from './engine/index.ts';
import type { Session } from './engine/types.ts';

export type StationId = 'lesson' | 'interview' | 'shop' | 'check' | 'receipt';

export interface Station {
  id: StationId;
  path: string;
  /** public/emoji/<emoji>.webp */
  emoji: string;
}

export const STATIONS: readonly Station[] = [
  { id: 'lesson', path: '/lesson', emoji: 'station-lesson' },
  { id: 'interview', path: '/interview', emoji: 'station-interview' },
  { id: 'shop', path: '/shop', emoji: 'station-shop' },
  { id: 'check', path: '/check', emoji: 'station-check' },
  { id: 'receipt', path: '/receipt', emoji: 'station-receipt' },
];

export function stationById(id: StationId): Station {
  const s = STATIONS.find((x) => x.id === id);
  if (!s) throw new Error(`없는 정류장 ${id}`);
  return s;
}

/** 잠긴 이유: interview = 인터뷰를 마치면 열림, fix = 재확인에서 고칠 곳이 남음 */
export type LockReason = 'interview' | 'fix';

export interface Gate {
  open: boolean;
  /** 잠겼을 때 보낼 정류장 */
  redirect?: StationId;
  reason?: LockReason;
}

export function gate(id: StationId, r: EngineResult): Gate {
  switch (id) {
    case 'lesson':
    case 'interview':
      return { open: true };
    case 'shop':
    case 'check':
      return r.done ? { open: true } : { open: false, redirect: 'interview', reason: 'interview' };
    case 'receipt':
      if (!r.done) return { open: false, redirect: 'interview', reason: 'interview' };
      return r.canIssue ? { open: true } : { open: false, redirect: 'check', reason: 'fix' };
  }
}

export interface ContinueTarget {
  station: StationId;
  /** 인터뷰라면 다음 질문이 몇 번째인지 (1부터) */
  questionNumber?: number;
}

/** 홈의 '이어서 하기': 인터뷰 → 장보기(장바구니가 비었을 때) → 재확인(발행 불가) → 계산대 */
export function continueTarget(r: EngineResult): ContinueTarget {
  if (!r.done) return { station: 'interview', questionNumber: r.interview.answered + 1 };
  if (r.session.cart.length === 0) return { station: 'shop' };
  if (!r.canIssue) return { station: 'check' };
  return { station: 'receipt' };
}

/** 저장된 진행이 있는가 (이어서 하기를 보여 줄지) */
export function hasProgress(s: Session): boolean {
  return Object.keys(s.answers).length > 0 || s.cart.length > 0;
}

/** 두 상태가 같은지: normalizeSession 결과의 answers·cart·kept·deferred를 비교 (자유 입력은 보지 않는다) */
export function sameSession(cat: Catalog, a: Partial<Session>, b: Partial<Session>): boolean {
  const x = normalizeSession(cat, a);
  const y = normalizeSession(cat, b);
  const sortedAnswers = (s: Session): [string, string][] => Object.entries(s.answers).sort(([p], [q]) => (p < q ? -1 : p > q ? 1 : 0));
  const sorted = (xs: string[]): string[] => [...xs].sort();
  return (
    JSON.stringify(sortedAnswers(x)) === JSON.stringify(sortedAnswers(y)) &&
    JSON.stringify(x.cart) === JSON.stringify(y.cart) &&
    JSON.stringify(sorted(x.kept)) === JSON.stringify(sorted(y.kept)) &&
    JSON.stringify(sorted(x.deferred)) === JSON.stringify(sorted(y.deferred))
  );
}
