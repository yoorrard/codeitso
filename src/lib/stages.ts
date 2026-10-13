// 단계 다섯과 열리는 조건 (docs/CONCEPT.md 2·2.1절). evaluate() 결과로만 정한다 (부작용 없음, 시험 있음).
import type { Catalog, EngineResult } from './engine/index.ts';
import { normalizeSession } from './engine/index.ts';
import type { Session } from './engine/types.ts';
import { ROUTES } from './routes.ts';

export type StageId = 'test-drive' | 'destination' | 'waypoints' | 'check' | 'arrival';

export interface Stage {
  id: StageId;
  path: string;
}

/** 시운전(선택) → 목적지 → 경유지 → 점검 → 도착 */
export const STAGES: readonly Stage[] = [
  { id: 'test-drive', path: ROUTES.testDrive },
  { id: 'destination', path: ROUTES.destination },
  { id: 'waypoints', path: ROUTES.waypoints },
  { id: 'check', path: ROUTES.check },
  { id: 'arrival', path: ROUTES.arrival },
];

export function stageById(id: StageId): Stage {
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`없는 단계 ${id}`);
  return s;
}

/** 아직 못 가는 이유: destination = 목적지를 정하면 열림, fix = 점검에서 막힌 곳이 남음 */
export type LockReason = 'destination' | 'fix';

export interface Gate {
  open: boolean;
  /** 못 갈 때 보낼 단계 */
  redirect?: StageId;
  reason?: LockReason;
}

export function gate(id: StageId, r: EngineResult): Gate {
  switch (id) {
    case 'test-drive':
    case 'destination':
      return { open: true };
    case 'waypoints':
    case 'check':
      return r.done ? { open: true } : { open: false, redirect: 'destination', reason: 'destination' };
    case 'arrival':
      if (!r.done) return { open: false, redirect: 'destination', reason: 'destination' };
      return r.canIssue ? { open: true } : { open: false, redirect: 'check', reason: 'fix' };
  }
}

export interface ContinueTarget {
  stage: StageId;
  /** 목적지라면 다음 질문이 몇 번째인지 (1부터) */
  questionNumber?: number;
}

/** 홈의 '이어서 가기': 목적지 → 경유지(고른 도구가 없을 때) → 점검(출발할 수 없을 때) → 도착 */
export function continueTarget(r: EngineResult): ContinueTarget {
  if (!r.done) return { stage: 'destination', questionNumber: r.interview.answered + 1 };
  if (r.session.cart.length === 0) return { stage: 'waypoints' };
  if (!r.canIssue) return { stage: 'check' };
  return { stage: 'arrival' };
}

/** 저장된 진행이 있는가 (이어서 가기를 보여 줄지) */
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
