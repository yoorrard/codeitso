// 진행 (docs/CONCEPT.md 8절, D56): 단계마다 마쳤는지와 실제로 남은 일의 개수. 따로 쌓는 점수(km·도장)는 없다.
// 저장된 상태와 evaluate() 결과에서 매번 계산한다. 같은 상태면 늘 같은 값이다 (부작용 없음, 시험 있음).
import type { EngineResult } from './engine/index.ts';
import { emptySlotId } from './engine/index.ts';
import type { Meta } from './saved.ts';
import type { StageId } from './stages.ts';
import { STAGES } from './stages.ts';

export interface Progress {
  /** 단계마다 마쳤는가 */
  stages: Record<StageId, boolean>;
  /** 마친 단계 수 (0~5) */
  passed: number;
  /** 꼭 고를 것(필수) 전체와 아직 고르지 않은 수. 목적지를 정하기 전에는 0.
   *  나중으로 미룬 칸과, 빈 칸을 알고 '그대로 가기'로 둔 칸은 이미 정한 것이라 남은 수에 넣지 않는다 */
  requiredTotal: number;
  requiredLeft: number;
  /** 아직 풀지 않은 막힌 곳 (그대로 가기를 고른 것은 빼고) */
  blocked: number;
}

export function progress(r: EngineResult, meta: Pick<Meta, 'lessonDone' | 'issued'>): Progress {
  const required = r.done ? r.slots.filter((s) => s.slot.required) : [];
  const settled = (id: string): boolean => r.session.deferred.includes(id) || r.session.kept.includes(emptySlotId(id));
  const requiredLeft = required.filter((s) => s.filledBy.length === 0 && !settled(s.slot.id)).length;
  const stages: Record<StageId, boolean> = {
    'test-drive': meta.lessonDone === true,
    destination: r.done,
    waypoints: r.done && r.session.cart.length > 0 && requiredLeft === 0,
    check: r.canIssue,
    arrival: meta.issued === true && r.canIssue,
  };
  return {
    stages,
    passed: STAGES.filter((s) => stages[s.id]).length,
    requiredTotal: required.length,
    requiredLeft,
    blocked: r.done ? r.conflicts.filter((c) => !c.kept).length : 0,
  };
}
