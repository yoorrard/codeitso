// 단계 규칙 (docs/CONCEPT.md 2.1절): 열리는 조건, 보낼 곳, 이어서 가기, 두 상태 비교
import { describe, expect, it } from 'vitest';
import type { EngineResult } from '../../src/lib/engine/index.ts';
import { evaluate } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { progress } from '../../src/lib/progress.ts';
import { NUMBERED, STAGES, continueTarget, gate, hasProgress, sameSession, stageById, stageNumber } from '../../src/lib/stages.ts';
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

  it('연습(내 AI 써 보기)은 번호 밖, 나머지 넷이 1~4 (D64)', () => {
    expect(NUMBERED.map((s) => s.id)).toEqual(['destination', 'waypoints', 'check', 'arrival']);
    expect(STAGES.map((s) => stageNumber(s.id))).toEqual([null, 1, 2, 3, 4]);
  });
});

describe('열리는 조건', () => {
  it('내 AI 써 보기·만들 앱 정하기는 늘 열림', () => {
    for (const r of [empty, halfway, ready]) {
      expect(gate('test-drive', r).open).toBe(true);
      expect(gate('destination', r).open).toBe(true);
    }
  });

  it('만들 앱을 정하지 않았으면 도구 고르기·도구끼리 맞춰 보기·설계도 받기는 만들 앱 정하기로', () => {
    expect(halfway.done).toBe(false);
    for (const id of ['waypoints', 'check', 'arrival'] as const) {
      expect(gate(id, halfway)).toEqual({ open: false, redirect: 'destination', reason: 'destination' });
    }
  });

  it('만들 앱을 정하면 도구 고르기·도구끼리 맞춰 보기가 열린다', () => {
    expect(gate('waypoints', doneNoCart).open).toBe(true);
    expect(gate('check', doneNoCart).open).toBe(true);
  });

  it('막힌 곳이 남으면 설계도 받기는 도구끼리 맞춰 보기로', () => {
    expect(gate('arrival', blocked)).toEqual({ open: false, redirect: 'check', reason: 'fix' });
    expect(gate('arrival', ready)).toEqual({ open: true });
  });
});

describe('이어서 가기', () => {
  it('만들 앱을 정하는 중이면 다음 질문 번호와 함께 만들 앱 정하기로', () => {
    expect(continueTarget(empty)).toEqual({ stage: 'destination', questionNumber: 1 });
    expect(continueTarget(halfway)).toEqual({ stage: 'destination', questionNumber: halfway.interview.answered + 1 });
  });

  it('고른 도구가 없으면 도구 고르기, 출발할 수 없으면 도구끼리 맞춰 보기, 아니면 설계도 받기', () => {
    expect(doneNoCart.done).toBe(true);
    expect(continueTarget(doneNoCart)).toEqual({ stage: 'waypoints' });
    expect(continueTarget(blocked)).toEqual({ stage: 'check' });
    expect(continueTarget(ready)).toEqual({ stage: 'arrival' });
  });

  it('도구를 하나라도 골랐어도 꼭 고를 것이 남았으면 도구 고르기로 (도구끼리 맞춰 보기가 아니라)', () => {
    // 고를 수 있는 꼭 고를 것이 둘 이상인 골든 사례에서 도구를 하나만 남긴다
    const base = find((r) => {
      if (!r.done || r.session.cart.length < 2) return false;
      const one = evaluate(cat, { ...r.session, cart: r.session.cart.slice(0, 1) });
      const p = progress(one, {});
      return p.requiredLeft - p.requiredNoTool > 0;
    }, '꼭 고를 것이 둘 이상인');
    const partial = evaluate(cat, { ...base.session, cart: base.session.cart.slice(0, 1) });
    expect(partial.session.cart.length).toBe(1);
    expect(continueTarget(partial)).toEqual({ stage: 'waypoints' });
  });

  it('남은 꼭 고를 것이 모두 맞는 도구가 없는 기능이면 도구끼리 맞춰 보기로 (거기서 그대로 가기를 고른다)', () => {
    const noTool = results.find((r) => {
      const p = progress(r, {});
      return r.done && r.session.cart.length > 0 && p.requiredLeft > 0 && p.requiredLeft === p.requiredNoTool;
    });
    if (!noTool) return;
    expect(continueTarget(noTool).stage).not.toBe('waypoints');
  });

  it('미룬 칸은 남은 것으로 세지 않는다', () => {
    for (const r of results.filter((x) => x.session.deferred.length > 0 && x.session.cart.length > 0)) {
      const p = progress(r, {});
      if (p.requiredLeft - p.requiredNoTool === 0) expect(continueTarget(r).stage).not.toBe('waypoints');
    }
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

describe('홈 이어서 가기의 갈 곳과 둘째 줄 (continue.ts, D70)', () => {
  it('꼭 고를 것이 남으면 도구 고르기, 만들 앱을 정하는 중이면 몇 번째 질문인지', async () => {
    const { continueInfo } = await import('../../src/lib/continue.ts');
    const { ko } = await import('../../src/copy/ko.ts');
    const base = find((r) => r.done && r.session.cart.length >= 2, '도구를 둘 이상 고른');
    const one = evaluate(cat, { ...base.session, cart: base.session.cart.slice(0, 1) });
    const p = progress(one, {});
    if (p.requiredLeft - p.requiredNoTool > 0) expect(continueInfo(one.session)).toEqual({ path: '/waypoints', where: `2/4 · ${ko.stages.waypoints}` });
    expect(continueInfo(halfway.session)).toEqual({ path: '/destination', where: `1/4 · ${ko.stages.destination} · ${halfway.interview.answered + 1}번째 질문` });
    expect(continueInfo(ready.session).path).toBe('/arrival');
  });

  it('코스로 채울 상태: 코스의 답·도구·그대로 간 막힌 곳·한 줄 입력 (course.ts)', async () => {
    const { courseSession } = await import('../../src/lib/course.ts');
    const { data } = await import('../../src/lib/data.ts');
    for (const r of data.recipes.recipes) {
      const s = courseSession(r.id);
      expect(s?.cart).toEqual(r.cart);
      expect(s?.kept).toEqual(r.kept ?? []);
      expect(s?.freeText).toBe(r.freeText);
    }
    expect(courseSession('no-such-course')).toBeNull();
  });
});
