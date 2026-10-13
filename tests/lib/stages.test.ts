// 단계 규칙 (docs/CONCEPT.md 2.1절): 열리는 조건, 보낼 곳, 이어서 가기, 두 상태 비교
import { describe, expect, it } from 'vitest';
import type { EngineResult } from '../../src/lib/engine/index.ts';
import { evaluate } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { STAGES, continueTarget, gate, hasProgress, sameSession, stageById } from '../../src/lib/stages.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const results = goldenFiles().map((f) => evaluate(cat, goldenSession(readJson<Golden>(f))));

function find(pred: (r: EngineResult) => boolean, what: string): EngineResult {
  const r = results.find(pred);
  if (!r) throw new Error(`골든 사례에 ${what} 상태가 없습니다`);
  return r;
}

const empty = evaluate(cat, {});
const halfway = evaluate(cat, { answers: Object.fromEntries(Object.entries(results[0]?.session.answers ?? {}).slice(0, 2)) });
const doneNoCart = evaluate(cat, { answers: results[0]?.session.answers ?? {} });
const blocked = find((r) => r.done && r.session.cart.length > 0 && !r.canIssue, '막힌 곳이 남은');
const ready = find((r) => r.canIssue && r.session.cart.length > 0, '출발할 수 있는');

describe('단계 목록', () => {
  it('다섯 단계가 순서대로, 새 주소로', () => {
    expect(STAGES.map((s) => s.id)).toEqual(['test-drive', 'destination', 'waypoints', 'check', 'arrival']);
    expect(STAGES.map((s) => s.path)).toEqual(['/test-drive', '/destination', '/waypoints', '/check', '/arrival']);
    expect(stageById('waypoints').path).toBe('/waypoints');
  });
});

describe('열리는 조건', () => {
  it('시운전·목적지는 늘 열림', () => {
    for (const r of [empty, halfway, ready]) {
      expect(gate('test-drive', r).open).toBe(true);
      expect(gate('destination', r).open).toBe(true);
    }
  });

  it('목적지를 정하지 않았으면 경유지·점검·도착은 목적지로', () => {
    expect(halfway.done).toBe(false);
    for (const id of ['waypoints', 'check', 'arrival'] as const) {
      expect(gate(id, halfway)).toEqual({ open: false, redirect: 'destination', reason: 'destination' });
    }
  });

  it('목적지를 정하면 경유지·점검이 열린다', () => {
    expect(gate('waypoints', doneNoCart).open).toBe(true);
    expect(gate('check', doneNoCart).open).toBe(true);
  });

  it('막힌 곳이 남으면 도착은 점검으로', () => {
    expect(gate('arrival', blocked)).toEqual({ open: false, redirect: 'check', reason: 'fix' });
    expect(gate('arrival', ready)).toEqual({ open: true });
  });
});

describe('이어서 가기', () => {
  it('목적지를 정하는 중이면 다음 질문 번호와 함께 목적지로', () => {
    expect(continueTarget(empty)).toEqual({ stage: 'destination', questionNumber: 1 });
    expect(continueTarget(halfway)).toEqual({ stage: 'destination', questionNumber: halfway.interview.answered + 1 });
  });

  it('고른 도구가 없으면 경유지, 출발할 수 없으면 점검, 아니면 도착', () => {
    expect(doneNoCart.done).toBe(true);
    expect(continueTarget(doneNoCart)).toEqual({ stage: 'waypoints' });
    expect(continueTarget(blocked)).toEqual({ stage: 'check' });
    expect(continueTarget(ready)).toEqual({ stage: 'arrival' });
  });

  it('진행이 있는지', () => {
    expect(hasProgress(empty.session)).toBe(false);
    expect(hasProgress(halfway.session)).toBe(true);
    expect(hasProgress({ answers: {}, cart: ['x'], kept: [], deferred: [] })).toBe(true);
  });
});

describe('두 상태가 같은지', () => {
  const s = ready.session;

  it('답 순서·목록 순서·자유 입력은 상관없다', () => {
    const shuffled = Object.fromEntries(Object.entries(s.answers).reverse());
    expect(sameSession(cat, s, { ...s, answers: shuffled, kept: [...s.kept].reverse(), freeText: '다른 메모' })).toBe(true);
  });

  it('모르는 id는 정리한 뒤 비교한다', () => {
    expect(sameSession(cat, s, { ...s, cart: [...s.cart, 'no-such-product'], answers: { ...s.answers, 'q.none': 'x' } })).toBe(true);
  });

  it('답이나 장바구니가 다르면 다르다', () => {
    expect(sameSession(cat, s, { ...s, cart: s.cart.slice(1) })).toBe(false);
    expect(sameSession(cat, s, { ...s, answers: {} })).toBe(false);
  });

  it('장바구니는 담은 순서도 본다', () => {
    if (s.cart.length < 2) return;
    expect(sameSession(cat, s, { ...s, cart: [...s.cart].reverse() })).toBe(false);
  });
});
