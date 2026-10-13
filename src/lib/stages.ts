// 단계 다섯과 열리는 조건 (docs/CONCEPT.md 2·2.1절, D64: 연습 하나 + 번호 단계 넷). evaluate() 결과로만 정한다 (부작용 없음, 시험 있음).
import type { Catalog, EngineResult } from './engine/index.ts';
import { normalizeSession } from './engine/index.ts';
import type { Session } from './engine/types.ts';
// progress.ts도 이 파일의 STAGES를 쓴다. 서로 함수 안에서만 부르므로 순환 import여도 처음 평가 때 문제가 없다
import { progress } from './progress.ts';
import { ROUTES } from './routes.ts';

export type StageId = 'test-drive' | 'destination' | 'waypoints' | 'check' | 'arrival';

export interface Stage {
  id: StageId;
  path: string;
}

/** 내 AI 써 보기(연습, 선택) → 1 만들 앱 정하기 → 2 도구 고르기 → 3 도구끼리 맞춰 보기 → 4 설계도 받기. 주소와 id는 옛 이름 그대로 둔다 (D64) */
export const STAGES: readonly Stage[] = [
  { id: 'test-drive', path: ROUTES.testDrive },
  { id: 'destination', path: ROUTES.destination },
  { id: 'waypoints', path: ROUTES.waypoints },
  { id: 'check', path: ROUTES.check },
  { id: 'arrival', path: ROUTES.arrival },
];

/** 번호가 붙는 단계 넷 (연습 '내 AI 써 보기'는 번호 밖) */
export const NUMBERED: readonly Stage[] = STAGES.filter((s) => s.id !== 'test-drive');

/** 단계 번호 1~4. 연습이면 null */
export function stageNumber(id: StageId): number | null {
  const i = NUMBERED.findIndex((s) => s.id === id);
  return i < 0 ? null : i + 1;
}

export function stageById(id: StageId): Stage {
  const s = STAGES.find((x) => x.id === id);
  if (!s) throw new Error(`없는 단계 ${id}`);
  return s;
}

/** 아직 못 가는 이유: destination = 만들 앱을 정하면 열림, fix = 도구끼리 맞춰 보기에서 막힌 곳이 남음 */
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
  /** 만들 앱 정하기라면 다음 질문이 몇 번째인지 (1부터) */
  questionNumber?: number;
}

/**
 * 홈의 '이어서 가기': 만들 앱 정하기 → 도구 고르기(고른 도구가 없거나, 지금 고를 수 있는 꼭 고를 것이 남았을 때)
 * → 도구끼리 맞춰 보기(출발할 수 없을 때) → 설계도 받기.
 * 맞는 도구가 없는 꼭 고를 것은 도구 고르기에서 고를 수 없으므로(도구끼리 맞춰 보기에서 '그대로 가기') 남은 수에서 뺀다.
 * 수는 상태 한 줄과 같은 progress()로 센다
 */
export function continueTarget(r: EngineResult): ContinueTarget {
  if (!r.done) return { stage: 'destination', questionNumber: r.interview.answered + 1 };
  if (r.session.cart.length === 0) return { stage: 'waypoints' };
  const p = progress(r, {});
  if (p.requiredLeft - p.requiredNoTool > 0) return { stage: 'waypoints' };
  if (!r.canIssue) return { stage: 'check' };
  return { stage: 'arrival' };
}

/** 저장된 진행이 있는가 (이어서 가기를 보여 줄지). 엔진 없이 쓰도록 saved.ts에 두고 여기서도 내보낸다 */
export { hasProgress } from './saved.ts';

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
