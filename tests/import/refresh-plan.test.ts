// 매일 갱신의 줄과 받는 날 (D143, scripts/lib/refresh-plan.ts)
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { INDEX, LANES, MON, TUE, kstDay, planLane, runsOn } from '../../scripts/lib/refresh-plan.ts';

const steps = Object.entries(LANES).flatMap(([lane, l]) => l.steps.map((s) => ({ lane, ...s })));

describe('refresh-plan', () => {
  it('모든 단계의 스크립트가 있고, 모든 줄의 갈래에 목차 스크립트가 있다', () => {
    for (const s of steps) expect(existsSync(join(import.meta.dirname, '..', '..', 'scripts', 'import', s.file)), s.file).toBe(true);
    for (const l of Object.values(LANES)) expect(INDEX[l.group]).toBeTruthy();
  });

  it('모든 단계가 한 주에 한 번 넘게 돈다', () => {
    for (const s of steps) {
      const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => runsOn(s, d, false));
      expect(days.length, `${s.lane} ${s.file}`).toBeGreaterThan(0);
    }
  });

  it('MCP 등록소: 월요일은 전체, 다른 날은 바뀐 것만, 모두 받기에는 전체만', () => {
    const mcp = LANES['ai-mcp'];
    if (!mcp) throw new Error('ai-mcp 줄이 없다');
    expect(planLane(mcp, MON, false).run.map((s) => s.args ?? [])).toEqual([[]]);
    expect(planLane(mcp, TUE, false).run.map((s) => s.args ?? [])).toEqual([['--since']]);
    expect(planLane(mcp, TUE, true).run.map((s) => s.args ?? [])).toEqual([[]]);
  });

  it('매일 도는 단계가 있고, 긴 단계는 월요일에만, 주간 단계는 여러 요일로 나뉜다', () => {
    expect(steps.filter((s) => !s.days).length).toBeGreaterThan(10);
    for (const s of steps.filter((x) => x.long)) expect(s.days, s.file).toEqual([MON]);
    const weekly = steps.filter((s) => s.days && s.days.length === 1 && !s.long);
    expect(new Set(weekly.map((s) => s.days?.[0])).size).toBeGreaterThanOrEqual(4);
  });

  it('kstDay는 한국 시각 요일', () => {
    // 2026-10-25T18:17Z = 한국 시각 10월 26일 월요일 03:17 (매일 작업 흐름이 도는 때)
    expect(kstDay(new Date('2026-10-25T18:17:00Z'))).toBe(MON);
  });
});
