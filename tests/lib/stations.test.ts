// 정류장 규칙 (docs/UX.md 2.1절): 열리는 조건, 보낼 곳, 이어서 하기, 두 상태 비교
import { describe, expect, it } from 'vitest';
import type { EngineResult } from '../../src/lib/engine/index.ts';
import { evaluate } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { STATIONS, continueTarget, gate, hasProgress, sameSession, stationById } from '../../src/lib/stations.ts';
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
const blocked = find((r) => r.done && r.session.cart.length > 0 && !r.canIssue, '고칠 곳이 남은');
const ready = find((r) => r.canIssue && r.session.cart.length > 0, '영수증을 뽑을 수 있는');

describe('정류장 목록', () => {
  it('다섯 곳이 순서대로', () => {
    expect(STATIONS.map((s) => s.id)).toEqual(['lesson', 'interview', 'shop', 'check', 'receipt']);
    expect(stationById('shop').path).toBe('/shop');
  });
});

describe('열리는 조건', () => {
  it('첫 수업·인터뷰는 늘 열림', () => {
    for (const r of [empty, halfway, ready]) {
      expect(gate('lesson', r).open).toBe(true);
      expect(gate('interview', r).open).toBe(true);
    }
  });

  it('인터뷰가 안 끝나면 장보기·재확인·계산대는 인터뷰로', () => {
    expect(halfway.done).toBe(false);
    for (const id of ['shop', 'check', 'receipt'] as const) {
      expect(gate(id, halfway)).toEqual({ open: false, redirect: 'interview', reason: 'interview' });
    }
  });

  it('인터뷰가 끝나면 장보기·재확인이 열린다', () => {
    expect(gate('shop', doneNoCart).open).toBe(true);
    expect(gate('check', doneNoCart).open).toBe(true);
  });

  it('고칠 곳이 남으면 계산대는 재확인으로', () => {
    expect(gate('receipt', blocked)).toEqual({ open: false, redirect: 'check', reason: 'fix' });
    expect(gate('receipt', ready)).toEqual({ open: true });
  });
});

describe('이어서 하기', () => {
  it('인터뷰 중이면 다음 질문 번호와 함께 인터뷰로', () => {
    expect(continueTarget(empty)).toEqual({ station: 'interview', questionNumber: 1 });
    expect(continueTarget(halfway)).toEqual({ station: 'interview', questionNumber: halfway.interview.answered + 1 });
  });

  it('장바구니가 비었으면 장보기, 발행할 수 없으면 재확인, 아니면 계산대', () => {
    expect(doneNoCart.done).toBe(true);
    expect(continueTarget(doneNoCart)).toEqual({ station: 'shop' });
    expect(continueTarget(blocked)).toEqual({ station: 'check' });
    expect(continueTarget(ready)).toEqual({ station: 'receipt' });
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
