// 만들 앱 정하기의 질문 자리 (brief 6.5, D70): 질문 섬·[이전]·상태 한 줄이 같은 자리를 본다
import { afterEach, describe, expect, it } from 'vitest';
import { evaluate } from '../../src/lib/engine/index.ts';
import { $questionMoves, $questionPick, goToQuestion, questionAt } from '../../src/lib/interview-nav.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const empty = evaluate(cat, {});
const halfway = evaluate(cat, { answers: { 'q.type': 'page', 'q.audience': 'me' } });
const done = evaluate(cat, {
  answers: { 'q.type': 'page', 'q.audience': 'anyone', 'q.ai': 'chat-free', 'q.save': 'no', 'q.domain': 'education', 'q.edu-topic': 'meal', 'q.realtime': 'daily', 'q.budget': 'free-only', 'q.payment': 'no', 'q.device': 'phone', 'q.style': 'cute' },
});

afterEach(() => {
  $questionPick.set(null);
  $questionMoves.set(0);
});

describe('questionAt: 지금 보이는 질문 자리', () => {
  it('고른 자리가 없으면 처음 안 답한 질문', () => {
    expect(questionAt(empty, null)).toBe(0);
    expect(questionAt(halfway, null)).toBe(2);
  });

  it('[이전]으로 옮긴 자리를 따르되, 처음 안 답한 질문을 넘지 않는다 (빈 질문으로 건너뛰지 않게)', () => {
    expect(questionAt(halfway, 0)).toBe(0);
    expect(questionAt(halfway, 7)).toBe(2);
    expect(questionAt(halfway, -3)).toBe(0);
  });

  it('다 답하면 보이는 질문 수 = 마지막 한 줄 쓰기', () => {
    expect(done.done).toBe(true);
    expect(questionAt(done, null)).toBe(done.interview.visible.length);
    expect(questionAt(done, 3)).toBe(3);
  });
});

describe('goToQuestion', () => {
  it('자리를 바꾸고 옮긴 횟수를 하나 올린다 (질문 섬이 제목으로 초점을 옮기는 신호)', () => {
    goToQuestion(1);
    expect($questionPick.get()).toBe(1);
    expect($questionMoves.get()).toBe(1);
    goToQuestion(1);
    expect($questionMoves.get()).toBe(2);
  });
});
