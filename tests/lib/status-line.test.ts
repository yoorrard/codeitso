// 아래 막대의 상태 한 줄과 미니 길 (CONCEPT 5.8)
import { describe, expect, it } from 'vitest';
import { evaluate } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { miniPath, statusLine } from '../../src/lib/status-line.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const results = goldenFiles().map((f) => evaluate(cat, goldenSession(readJson<Golden>(f))));
const ready = results.find((r) => r.canIssue && r.session.cart.length > 0 && r.slots.some((s) => s.slot.required));
const blocked = results.find((r) => r.done && r.session.cart.length > 0 && !r.canIssue);
if (!ready || !blocked) throw new Error('골든 사례가 모자란다');
const empty = evaluate(cat, {});
const answersOnly = evaluate(cat, { answers: ready.session.answers });

describe('상태 한 줄', () => {
  it('단계 이름 · 지금 상태', () => {
    expect(statusLine('test-drive', empty, {})).toBe('시운전 · 연습 3개, 10분이면 돼요');
    expect(statusLine('test-drive', empty, { lessonDone: true })).toBe('시운전 · 마쳤어요');
    expect(statusLine('destination', empty, {})).toBe('목적지 · 1번째 질문');
    expect(statusLine('destination', ready, {})).toBe('목적지 · 정했어요');
  });

  it('목적지를 정하기 전에는 경유지·점검이 열리는 조건을 말한다', () => {
    expect(statusLine('waypoints', empty, {})).toBe('경유지 · 목적지를 정하면 열려요');
    expect(statusLine('check', empty, {})).toBe('점검 · 목적지를 정하면 열려요');
  });

  it('남은 일의 개수', () => {
    const left = answersOnly.slots.filter((s) => s.slot.required).length;
    expect(statusLine('waypoints', answersOnly, {})).toBe(`경유지 · 꼭 고를 것 ${left}개 남음`);
    expect(statusLine('waypoints', ready, {})).toBe('경유지 · 꼭 고를 것을 다 골랐어요');
    const n = blocked.conflicts.filter((c) => !c.kept).length;
    expect(statusLine('check', blocked, {})).toBe(`점검 · 막힌 곳 ${n}개`);
    expect(statusLine('check', ready, {})).toBe('점검 · 모두 원활해요');
  });

  it('도착: 영수증을 받았는지', () => {
    expect(statusLine('arrival', ready, {})).toBe('도착 · 영수증을 받을 수 있어요');
    expect(statusLine('arrival', ready, { issued: true })).toBe('도착 · 영수증 받음');
  });
});

describe('미니 길', () => {
  it('목적지를 정하기 전에는 비어 있다', () => {
    expect(miniPath(empty)).toEqual([]);
  });

  it('꼭 고를 것이 먼저, 고른 것은 picked', () => {
    const dots = miniPath(ready);
    expect(dots.length).toBe(ready.slots.length);
    const firstOptional = dots.findIndex((d) => !d.required);
    if (firstOptional >= 0) expect(dots.slice(firstOptional).every((d) => !d.required)).toBe(true);
    expect(dots.filter((d) => d.required).every((d) => d.picked)).toBe(true);
    expect(miniPath(answersOnly).every((d) => !d.picked)).toBe(true);
  });
});
