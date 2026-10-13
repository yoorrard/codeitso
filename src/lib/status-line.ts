// 아래 막대 위 줄의 상태 한 줄과 미니 길 (docs/CONCEPT.md 5.8). 지금 상태 → 남은 것 순서 (Live Activity).
// 저장된 상태와 evaluate() 결과에서 매번 계산한다 (부작용 없음, 시험 있음).
import { ko } from '../copy/ko.ts';
import type { EngineResult } from './engine/index.ts';
import { fill } from './engine/index.ts';
import { progress } from './progress.ts';
import type { Meta } from './saved.ts';
import type { StageId } from './stages.ts';

/** '경유지 · 꼭 고를 것 1개 남음' */
export function statusLine(stage: StageId, r: EngineResult, meta: Pick<Meta, 'lessonDone' | 'issued'>): string {
  const S = ko.progress.status;
  const p = progress(r, meta);
  let text: string;
  switch (stage) {
    case 'test-drive':
      text = meta.lessonDone === true ? S.testDriveDone : S.testDriveTodo;
      break;
    case 'destination':
      text = r.done ? S.destinationDone : fill(S.question, { n: r.interview.answered + 1 });
      break;
    case 'waypoints':
      text = !r.done ? S.locked : p.requiredLeft > 0 ? fill(S.requiredLeft, { n: p.requiredLeft }) : S.requiredDone;
      break;
    case 'check':
      text = !r.done ? S.locked : p.blocked > 0 ? fill(S.blocked, { n: p.blocked }) : S.clear;
      break;
    case 'arrival':
      text = !r.done ? S.locked : p.stages.arrival ? S.issued : p.blocked > 0 ? fill(S.blocked, { n: p.blocked }) : S.arrivalReady;
      break;
  }
  return `${ko.stages[stage]} · ${text}`;
}

export interface PathDot {
  slotId: string;
  capability: string;
  label: string;
  picked: boolean;
  required: boolean;
  deferred: boolean;
}

/** 미니 길: 목적지를 정한 뒤 생긴 고를 것 (꼭 고를 것 먼저, 엔진의 칸 순서) */
export function miniPath(r: EngineResult): PathDot[] {
  if (!r.done) return [];
  const dots = r.slots.map((s) => ({
    slotId: s.slot.id,
    capability: s.slot.capability,
    label: s.slot.label,
    picked: s.filledBy.length > 0,
    required: s.slot.required,
    deferred: r.session.deferred.includes(s.slot.id),
  }));
  return [...dots.filter((d) => d.required), ...dots.filter((d) => !d.required)];
}
