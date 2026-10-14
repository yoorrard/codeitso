// 장면 시간 상한 (brief 7절, W5 확인 '단위 시험: 장면 길이 상한', D71): tokens.css의 길이 토큰으로 장면 시간표를 계산해 상한을 고정한다.
// 시간표는 코드와 같은 순서다: S1 home.css, S2·S3·S4 src/lib/map/scene.ts, S3 숫자 굴리기 StatusLine.tsx, S8 src/lib/map/practice.ts,
// S5+S6 src/lib/arrival-plan.ts(지도 src/lib/map/arrive.ts, 영수증 arrival.css), S7 frame.css·StageRail.tsx, S9 src/lib/term-scene.ts·terms.css (W5b).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { arrivalPlan, BLINK_DIM, blinkSteps } from '../../src/lib/arrival-plan.ts';
import { pulseFrames } from '../../src/lib/map/scene.ts';
import type { DurToken } from '../../src/lib/motion.ts';
import { parseDuration } from '../../src/lib/motion.ts';

const css = readFileSync(join(import.meta.dirname, '..', '..', 'src', 'styles', 'tokens.css'), 'utf8');
const root = css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)'));
const tok = (name: string): string => {
  const m = root.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (!m?.[1]) throw new Error(`${name} 토큰이 없다`);
  return m[1];
};
const d = (name: string): number => parseDuration(tok(name));

/** cubic-bezier(x1, y1, x2, y2) 곡선의 값: 진행 u(0~1)에서 y (x(s) = u를 반으로 나눠 찾는다) */
function bezier(curve: string, u: number): number {
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = (curve.match(/-?[\d.]+/g) ?? []).map(Number);
  const b = (p1: number, p2: number, s: number): number => 3 * p1 * s * (1 - s) ** 2 + 3 * p2 * s * s * (1 - s) + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (b(x1, x2, mid) < u) lo = mid;
    else hi = mid;
  }
  return b(y1, y2, (lo + hi) / 2);
}

/** WAAPI처럼 키프레임 값을 t(0~1)에서 셈한다: 애니메이션 전체 곡선은 linear, 토막마다 그 키프레임의 곡선 */
function sample(frames: Keyframe[], t: number): number {
  for (let i = 0; i < frames.length - 1; i += 1) {
    const a = frames[i];
    const b = frames[i + 1];
    if (!a || !b || t > Number(b.offset)) continue;
    const u = (t - Number(a.offset)) / (Number(b.offset) - Number(a.offset));
    return Number(a.opacity) + (Number(b.opacity) - Number(a.opacity)) * bezier(String(a.easing ?? 'linear'), u);
  }
  return Number(frames[frames.length - 1]?.opacity);
}

describe('장면 시간 상한', () => {
  it('모션 하나는 1초 안쪽 (대표 장면 상한 --dur-scene과 마디 뛰기의 합 --dur-drive만 빼고: 한 번 뛰기는 아래 S5에서 잰다)', () => {
    for (const m of root.matchAll(/(--dur-[\w-]+):\s*([^;]+);/g)) {
      if (m[1] === '--dur-scene' || m[1] === '--dur-drive') continue;
      expect(parseDuration(m[2] ?? ''), m[1]).toBeLessThanOrEqual(1000);
    }
  });

  it('S1 홈 첫 방문: 가라앉기·길 그리기와 차(가라앉은 뒤) → 출발 고리 퍼짐, 1.6초 이하', () => {
    const car = d('--dur-settle') + d('--dur-approach');
    const total = Math.max(d('--dur-settle'), d('--dur-route'), car + d('--dur-pop'));
    expect(total).toBe(1500);
    expect(total).toBeLessThanOrEqual(1600);
  });

  it('S2 지도가 자라요: 마디 톡·길 이어 그리기·윤곽 비침이 함께, 700 이하', () => {
    expect(Math.max(d('--dur-pop'), d('--dur-draw'))).toBeLessThanOrEqual(700);
  });

  it('S3 정하면 이어져요: 날기 → 채움·실선·차, 숫자 굴리기는 겹쳐서. 900 이하', () => {
    const fly = d('--dur-fly');
    expect(fly + Math.max(d('--dur-ui'), d('--dur-draw'), d('--dur-hop'))).toBeLessThanOrEqual(900);
    expect(d('--dur-pop') + d('--dur-roll')).toBeLessThanOrEqual(900);
  });

  it('S4 교통 정보: 비친 뒤 덮기 → 두 번 진해짐(1초에 2번, 3번 미만) / 풀림 → 훑기 → 주 버튼. 장면 3초 이하', () => {
    const t0 = d('--dur-fade');
    expect(t0 + d('--dur-pop') + d('--dur-pulse')).toBeLessThanOrEqual(d('--dur-scene'));
    // 진해지는 꼭짓점 사이 = 길이의 절반: 500ms 이상이면 1초에 2번 이하
    expect(d('--dur-pulse') / 2).toBeGreaterThanOrEqual(500);
    expect(t0 + Math.max(d('--dur-pop'), d('--dur-draw')) + d('--dur-sweep') + d('--dur-ui')).toBeLessThanOrEqual(d('--dur-scene'));
    expect(d('--dur-stamp') + d('--dur-sweep') + d('--dur-ui')).toBeLessThanOrEqual(d('--dur-scene'));
  });

  it('S8 연습 한 바퀴: 차가 한 바퀴 → 고리 채움, 900 이하', () => {
    expect(d('--dur-loop') + d('--dur-pop')).toBeLessThanOrEqual(900);
  });

  it('S5+S6 출발 → 도착: brief 7절 시간표 그대로, 합계 --dur-scene(3000) 이하', () => {
    const p = arrivalPlan(d as (t: DurToken) => number, 0.05);
    expect(p).toMatchObject({ night: 300, go: 1100, arrive: 1500, day: 1900, sheet: 1980, print: 2300, stamp: 2750, end: 3000 });
    expect(p.end).toBeLessThanOrEqual(d('--dur-scene'));
    // 전조등 깜빡임(1500~1820)과 윤곽·두루마리·깃발(1500~1900)은 낮으로 돌아오기(1900) 전에 끝난다
    expect(p.arrive + d('--dur-blink')).toBeLessThanOrEqual(p.day);
    // 시트는 출력 직전에 다 올라오고, 도장은 출력과 함께 끝난다
    expect(p.sheet + d('--dur-sheet')).toBe(p.print);
    expect(p.stamp + d('--dur-stamp')).toBe(p.end);
    // 지난 마디 ✓(--dur-ui)는 차가 빈 터에 닿기 전에 시작하므로 낮으로 돌아오기(day) 전에 끝난다
    expect(p.arrive + d('--dur-ui')).toBeLessThanOrEqual(p.day);
  });

  it('S5 되돌아보기 → 마지막 접근: 차는 남은 길 몫만큼(--dur-hop 이상 --dur-drive 이하) 한 번에 달리고, 늘 같은 때(1500) 빈 터에 닿는다', () => {
    for (const share of [0, 0.05, 0.3, 0.5, 0.6, 0.9, 1, 2, -1]) {
      const p = arrivalPlan(d as (t: DurToken) => number, share);
      const run = p.arrive - p.go;
      expect(run, `몫 ${share}`).toBeGreaterThanOrEqual(d('--dur-hop'));
      expect(run, `몫 ${share}`).toBeLessThanOrEqual(d('--dur-drive'));
      // 카메라가 훑는 시간(night~go)은 늘 0 이상
      expect(p.go, `몫 ${share}`).toBeGreaterThanOrEqual(p.night);
      expect(p.arrive).toBe(1500);
    }
    // 같은 빠르기: 길의 절반이 남았으면 --dur-drive의 절반
    const half = arrivalPlan(d as (t: DurToken) => number, 0.5);
    expect(half.arrive - half.go).toBe(600);
  });

  it('S4 막힌 길 두 번 진해짐: 가장 옅은 때가 1/4·3/4에 고르게(1초에 2번), 끝에서만 다 돌아온다 (곡선을 표본으로 잰다)', () => {
    const total = d('--dur-pulse');
    const frames = pulseFrames(tok('--ease-in-out'));
    const at = (ms: number): number => sample(frames, ms / total);
    const values = Array.from({ length: total + 1 }, (_, ms) => at(ms));
    // 방향이 바뀌는 때 (가장 옅은 때·가장 진한 때)
    const turns: number[] = [];
    for (let ms = 1; ms < total; ms += 1) {
      const a = values[ms - 1] ?? 0;
      const b = values[ms] ?? 0;
      const c = values[ms + 1] ?? 0;
      if ((b < a && b <= c) || (b > a && b >= c)) turns.push(ms);
    }
    expect(turns).toEqual([total / 4, total / 2, (total * 3) / 4]);
    expect(at(total / 4)).toBeCloseTo(0.45, 6);
    expect(at((total * 3) / 4)).toBeCloseTo(0.45, 6);
    // 옅어지는 두 번 사이 500ms: 1초에 2번(3번 미만). 방향이 바뀌는 사이도 250ms로 고르다
    expect(total / 2).toBeGreaterThanOrEqual(500);
    // 앞쪽에 몰려 일찍 끝나지 않는다: 끝 직전(95%)까지 아직 덜 돌아왔다
    expect(at(total * 0.95)).toBeLessThan(1);
    expect(at(total)).toBe(1);
  });

  it('전조등 깜빡임(브랜드 서명): 켜짐 120 · 꺼짐 80 · 켜짐 120, 0.35 ↔ 1. 번쩍임은 1초에 2번 (3번 미만)', () => {
    const blink = d('--dur-blink');
    const steps = blinkSteps(blink);
    expect(steps.map((x) => x.at)).toEqual([0, 120, 200]);
    expect(steps.map((x) => x.on)).toEqual([true, false, true]);
    expect(BLINK_DIM).toBe(0.35);
    // 달리는 동안 낮춰 둔(0.35) 전조등이 켜지는 번 = 번쩍임. 장면에서 한 번만 깜빡이므로 어느 1초에도 이 수가 전부다
    let flashes = 0;
    let on = false;
    for (const x of steps) {
      if (x.on && !on) flashes += 1;
      on = x.on;
    }
    expect(flashes).toBe(2);
    expect(blink).toBeLessThan(1000);
    expect(flashes).toBeLessThan(3);
  });

  it('S7 단계 이동: 전환 200(--dur-ui), 마친 단계 ✓ 300(--dur-pop), 막대 칸 채우기 200(--dur-ui)', () => {
    expect(d('--dur-ui')).toBe(200);
    expect(d('--dur-pop')).toBe(300);
  });

  it('S9 용어 카드: 판 채우기 400(--dur-draw) · 고리 위 청록 빛 한 바퀴 700(--dur-sweep) · n장 굴리기 600(--dur-roll), 모두 1초 안쪽', () => {
    expect(d('--dur-draw')).toBe(400);
    expect(d('--dur-sweep')).toBe(700);
    expect(d('--dur-roll')).toBe(600);
  });

  it('동작 줄이기 두 곳이 새 장면 토큰도 0으로 둔다', () => {
    for (const block of [css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{([\s\S]*?)\}\s*\}/)?.[1] ?? '', css.match(/:root\[data-motion='reduce'\]\s*\{([\s\S]*?)\}/)?.[1] ?? '']) {
      for (const t of ['--dur-route', '--dur-approach', '--dur-pulse', '--dur-loop', '--dur-night', '--dur-drive', '--dur-blink', '--dur-scene', '--dur-skip-min'])
        expect(block, t).toMatch(new RegExp(`${t}:\\s*0ms`));
    }
  });
});
