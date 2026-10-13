// 진행 (CONCEPT 8절, D56): 단계 마침과 실제로 남은 일. 저장된 상태에서 계산, 같은 상태면 같은 값
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { progress } from '../../src/lib/progress.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const results = goldenFiles().map((f) => evaluate(cat, goldenSession(readJson<Golden>(f))));
const ready = results.find((r) => r.canIssue && r.session.cart.length > 0 && r.slots.some((s) => s.slot.required));
if (!ready) throw new Error('출발할 수 있고 꼭 고를 것이 있는 골든 사례가 없습니다');
const blocked = results.find((r) => r.done && r.session.cart.length > 0 && !r.canIssue);
if (!blocked) throw new Error('막힌 곳이 남은 사례가 없습니다');
const empty = evaluate(cat, {});

describe('단계 마침', () => {
  it('처음에는 0단계, 남은 일도 0 (목적지를 정하기 전)', () => {
    expect(progress(empty, {})).toEqual({
      stages: { 'test-drive': false, destination: false, waypoints: false, check: false, arrival: false },
      passed: 0,
      requiredTotal: 0,
      requiredLeft: 0,
      blocked: 0,
    });
  });

  it('목적지·경유지·점검을 마친 사례', () => {
    const p = progress(ready, {});
    expect(p.stages).toEqual({ 'test-drive': false, destination: true, waypoints: true, check: true, arrival: false });
    expect(p.passed).toBe(3);
    expect(p.requiredLeft).toBe(0);
    expect(p.requiredTotal).toBe(ready.slots.filter((s) => s.slot.required).length);
    expect(p.blocked).toBe(0);
  });

  it('시운전과 영수증을 받으면 다섯 단계', () => {
    expect(progress(ready, { lessonDone: true, issued: true }).passed).toBe(5);
  });

  it('영수증을 받은 뒤 막힌 곳이 생기면 도착은 마침이 아니다', () => {
    const p = progress(blocked, { issued: true });
    expect(p.stages.arrival).toBe(false);
    expect(p.blocked).toBe(blocked.conflicts.filter((c) => !c.kept).length);
    expect(p.blocked).toBeGreaterThan(0);
  });

  it('꼭 고를 것이 비어 있으면 경유지는 마침이 아니고, 남은 수를 센다', () => {
    const answersOnly = evaluate(cat, { answers: ready.session.answers });
    const p = progress(answersOnly, {});
    expect(p.stages.waypoints).toBe(false);
    expect(p.requiredLeft).toBe(p.requiredTotal);
    expect(p.requiredTotal).toBeGreaterThan(0);
  });

  it('같은 상태면 늘 같은 값', () => {
    expect(progress(ready, { issued: true })).toEqual(progress(ready, { issued: true }));
  });
});
