// 만들 앱 정하기의 지금 질문 자리 (brief 6.5, D70). 질문 섬(Interview), 아래 막대 섬(InterviewAction의 [이전]),
// 상태 한 줄('n번째 질문')이 따로 붙지만 같은 모듈을 나눠 쓰므로 이 atom으로 이어진다. 저장하지 않는다 (페이지를 떠나면 잊는다).
import { atom } from 'nanostores';
import type { EngineResult } from './engine/index.ts';

/** 손님이 옮겨 간 질문 자리. null이면 처음 안 답한 질문 */
export const $questionPick = atom<number | null>(null);

/** 질문을 옮긴 횟수. 바뀌면 질문 섬이 새 질문 제목으로 초점을 옮긴다 (처음 열 때·다른 곳에서 답이 바뀔 때는 옮기지 않는다) */
export const $questionMoves = atom(0);

/**
 * 지금 보이는 자리. 처음 안 답한 질문을 넘지 않는다 (기록을 지워 답이 사라져도 빈 질문으로 건너뛰지 않게).
 * 보이는 질문 수와 같으면 마지막 한 줄 쓰기(선택)다.
 */
export function questionAt(r: EngineResult, picked: number | null): number {
  const { visible, next } = r.interview;
  const first = next ? visible.findIndex((q) => q.id === next.id) : visible.length;
  const open = first < 0 ? visible.length : first;
  return Math.max(0, Math.min(picked ?? open, open));
}

/** 질문 i로 옮긴다 (초점은 질문 섬이 제목으로 옮긴다) */
export function goToQuestion(i: number): void {
  $questionPick.set(i);
  $questionMoves.set($questionMoves.get() + 1);
}
