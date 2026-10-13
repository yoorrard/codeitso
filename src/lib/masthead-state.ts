// 머리줄(단계 줄)이 그리는 값. 빌드 때는 처음 온 사람 기준으로 계산해 섬에 넘기고(브라우저 계산 한 번 줄이기),
// 섬이 붙은 뒤에는 저장된 진행으로 다시 계산한다 (D41 검토 반영).
import type { EngineResult } from './engine/index.ts';
import type { Progress } from './progress.ts';
import { progress } from './progress.ts';
import type { Meta } from './saved.ts';
import type { Gate, StageId } from './stages.ts';
import { STAGES, gate } from './stages.ts';

export interface MastheadState {
  gates: Record<StageId, Gate>;
  progress: Progress;
}

export function mastheadState(r: EngineResult, meta: Pick<Meta, 'lessonDone' | 'issued'>): MastheadState {
  const gates = Object.fromEntries(STAGES.map((s) => [s.id, gate(s.id, r)])) as Record<StageId, Gate>;
  return { gates, progress: progress(r, meta) };
}
