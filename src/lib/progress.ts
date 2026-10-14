// 진행 (docs/CONCEPT.md 8절, D56): 단계마다 마쳤는지와 실제로 남은 일의 개수. 따로 쌓는 점수(km·도장)는 없다.
// 저장된 상태와 evaluate() 결과에서 매번 계산한다. 같은 상태면 늘 같은 값이다 (부작용 없음, 시험 있음).
import type { EngineResult, SlotRanking } from './engine/index.ts';
import { emptySlotId } from './engine/index.ts';
import type { Meta } from './saved.ts';
import type { StageId } from './stages.ts';
import { STAGES } from './stages.ts';

export interface Progress {
  /** 단계마다 마쳤는가 */
  stages: Record<StageId, boolean>;
  /** 마친 단계 수 (0~5) */
  passed: number;
  /** 꼭 고를 것(필수) 전체와 아직 고르지 않은 수. 만들 앱을 정하기 전에는 0.
   *  나중으로 미룬 칸과, 빈 칸을 알고 '그대로 가기'로 둔 칸은 이미 정한 것이라 남은 수에 넣지 않는다 */
  requiredTotal: number;
  requiredLeft: number;
  /** requiredLeft 가운데 도구 모음에 맞는 도구가 없어 지금 고를 수 없는 것 (도구끼리 맞춰 볼 때 '그대로 가기'로 넘긴다).
   *  그 칸에 직접 쓴 도구가 있으면 그 도구로 정할 수 있으므로 고를 수 있는 쪽에 센다 */
  requiredNoTool: number;
  /** 아직 풀지 않은 막힌 곳 (그대로 가기를 고른 것은 빼고) */
  blocked: number;
}

/**
 * 아직 고르지 않은 꼭 고를 것 (칸 순서). 만들 앱을 정하기 전에는 없다.
 * 나중으로 미룬 칸과, 빈 칸을 알고 '그대로 가기'로 둔 칸은 이미 정한 것이라 뺀다 (도구 고르기의 '다음 고를 것'도 이 목록에서 고른다)
 */
export function requiredLeftSlots(r: EngineResult): SlotRanking[] {
  if (!r.done) return [];
  const settled = (id: string): boolean => r.session.deferred.includes(id) || r.session.kept.includes(emptySlotId(id));
  return r.slots.filter((s) => s.slot.required && s.filledBy.length === 0 && !settled(s.slot.id));
}

export function progress(r: EngineResult, meta: Pick<Meta, 'lessonDone' | 'issued'>): Progress {
  const required = r.done ? r.slots.filter((s) => s.slot.required) : [];
  const left = requiredLeftSlots(r);
  const stages: Record<StageId, boolean> = {
    'test-drive': meta.lessonDone === true,
    destination: r.done,
    waypoints: r.done && r.session.cart.length > 0 && left.length === 0,
    check: r.canIssue,
    arrival: meta.issued === true && r.canIssue,
  };
  return {
    stages,
    passed: STAGES.filter((s) => stages[s.id]).length,
    requiredTotal: required.length,
    requiredLeft: left.length,
    requiredNoTool: left.filter((s) => s.shelf.length === 0 && s.custom.length === 0).length,
    blocked: r.done ? r.conflicts.filter((c) => !c.kept).length : 0,
  };
}
