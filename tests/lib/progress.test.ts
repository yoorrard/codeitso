// 주행 거리와 도장 (D32): 저장된 상태에서 계산, 같은 상태면 같은 값, 되풀이해도 늘지 않음
import { describe, expect, it } from 'vitest';
import type { EngineResult } from '../../src/lib/engine/index.ts';
import { evaluate } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { KM, progress, unseenStamps } from '../../src/lib/progress.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const results = goldenFiles().map((f) => evaluate(cat, goldenSession(readJson<Golden>(f))));
const ready = results.find((r) => r.canIssue && r.session.cart.length > 0 && r.study.required.length > 0);
if (!ready) throw new Error('영수증을 뽑을 수 있고 필수 공부가 있는 골든 사례가 없습니다');
const empty = evaluate(cat, {});

const filled = (r: EngineResult): number => r.slots.filter((s) => s.filledBy.length > 0).length;

describe('주행 거리', () => {
  it('처음에는 0km, 정류장 0곳', () => {
    const p = progress(empty, {}, {});
    expect(p.km).toBe(0);
    expect(p.passed).toBe(0);
    expect(p.stamps).toEqual([]);
  });

  it('답한 질문·채운 칸·재확인을 더한다', () => {
    const p = progress(ready, {}, {});
    expect(p.km).toBe(ready.interview.answered * KM.answer + filled(ready) * KM.slot + KM.check);
    expect(p.stations).toEqual({ lesson: false, interview: true, shop: true, check: true, receipt: false });
    expect(p.passed).toBe(3);
  });

  it('첫 수업·영수증·읽은 개념·맞힌 문제를 더한다', () => {
    const base = progress(ready, {}, {}).km;
    const p = progress(ready, { api: { read: true, quiz: [0, 1] }, json: { read: false, quiz: [2] } }, { lessonDone: true, issued: true });
    expect(p.km).toBe(base + KM.lesson + KM.receipt + 1 * KM.conceptRead + 3 * KM.quizCorrect);
    expect(p.passed).toBe(5);
  });

  it('같은 상태면 늘 같은 값', () => {
    const study = { api: { read: true, quiz: [1] } };
    expect(progress(ready, study, { issued: true })).toEqual(progress(ready, structuredClone(study), { issued: true }));
  });

  it('영수증을 뽑은 뒤 고칠 곳이 생기면 계산대 도장은 빠진다', () => {
    const blocked = results.find((r) => r.done && r.session.cart.length > 0 && !r.canIssue);
    if (!blocked) throw new Error('고칠 곳이 남은 사례가 없습니다');
    expect(progress(blocked, {}, { issued: true }).stations.receipt).toBe(false);
  });
});

describe('도장', () => {
  it('정류장 도장은 정류장 순서대로', () => {
    expect(progress(ready, {}, { lessonDone: true, issued: true }).stamps.slice(0, 5)).toEqual([
      'station.lesson',
      'station.interview',
      'station.shop',
      'station.check',
      'station.receipt',
    ]);
  });

  it('필수 개념을 다 읽으면 공부 도장', () => {
    const allRead = Object.fromEntries(ready.study.required.map((id) => [id, { read: true, quiz: [] }]));
    expect(progress(ready, allRead, {}).stamps).toContain('study.required');
    const oneMissing = Object.fromEntries(ready.study.required.slice(1).map((id) => [id, { read: true, quiz: [] }]));
    expect(progress(ready, oneMissing, {}).stamps).not.toContain('study.required');
  });

  it('필수 개념이 없으면 공부 도장도 없다', () => {
    expect(progress(empty, {}, {}).stamps).not.toContain('study.required');
  });

  it('맞힌 문제마다 작은 도장 (정렬)', () => {
    expect(progress(empty, { json: { read: false, quiz: [2] }, api: { read: false, quiz: [0] } }, {}).stamps).toEqual(['quiz.api.0', 'quiz.json.2']);
  });

  it('장면을 아직 안 본 도장만', () => {
    const p = progress(ready, {}, {});
    expect(unseenStamps(p, ['station.interview'])).toEqual(['station.shop', 'station.check']);
    expect(unseenStamps(p, p.stamps)).toEqual([]);
  });
});
