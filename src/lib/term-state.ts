// 용어 카드의 상태 (brief 7절의 S9에서 연출만 걷어 낸 것, v4 D96). 용어 카드의 옅은 판(.plate)이 상태를 그린다:
//   아직 = 옅은 판(--plate) · 읽음 = 한 단 짙은 판(--plate-read) · 다 맞힘 = 그 위에 2px 고리(--plate-ring).
// 판 그림은 정적 HTML이라 섬(ConceptRead·ConceptActions·StudyList)이 여기 함수로 칠한다. 채우기·빛 돌기 연출은 없다.
import { catalog } from './data-full.ts';
import type { StudyRecord } from './saved.ts';

export type TermState = 'todo' | 'read' | 'solved';

/** 읽음 기록과 맞힌 문제 수로 용어 하나의 상태 */
export function termState(study: StudyRecord, id: string): TermState {
  const rec = study[id];
  const total = catalog.concept.get(id)?.quiz.length ?? 0;
  if (rec && total > 0 && rec.quiz.length >= total) return 'solved';
  return rec?.read ? 'read' : 'todo';
}

/** 판에 상태를 칠한다 (data-state: read · solved) */
export function paintPlate(plate: Element | null, s: TermState): void {
  if (!plate) return;
  if (s === 'todo') plate.removeAttribute('data-state');
  else plate.setAttribute('data-state', s);
}
