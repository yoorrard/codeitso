// 서 있는 차 (src/lib/map/rest.ts, D71): 굽는 곳(호) 안에 선 차는 호의 가까운 끝으로 옮겨 곧게 선다. 옮겨도 길 위이고 마디·빈 터와 겹치지 않는다.
import { describe, expect, it } from 'vitest';
import type { MapInputNode, NodeShape } from '../../src/lib/map/model.ts';
import { MAP_CAR, layoutMap, overlaps } from '../../src/lib/map/model.ts';
import { pieces, restPose } from '../../src/lib/map/rest.ts';

const SHAPES: NodeShape[] = ['screen', 'store', 'auth', 'data', 'notify', 'host'];

function cases(): { tag: string; nodes: MapInputNode[]; arrived: boolean; traffic: boolean }[] {
  const out = [];
  for (let n = 0; n <= SHAPES.length; n += 1)
    for (let filled = 0; filled <= n; filled += 1)
      for (const arrived of [false, true])
        for (const traffic of [false, true]) {
          const nodes = SHAPES.slice(0, n).map((s, i) => ({ id: `slot.${s}`, shape: s, label: '화면', filled: i < filled }));
          out.push({ tag: `마디 ${n}개 중 ${filled}개 고름${arrived ? ' 도착' : ''}${traffic ? ' 교통' : ''}`, nodes, arrived: arrived && filled === n, traffic });
        }
  return out;
}

const straight = (a: number): boolean => Math.abs(((a % 90) + 90) % 90) < 0.01 || Math.abs((((a % 90) + 90) % 90) - 90) < 0.01;

describe('서 있는 차', () => {
  it('routeD를 읽은 길이가 모형의 길이와 같다', () => {
    for (const c of cases()) {
      const m = layoutMap(c);
      expect(pieces(m.routeD).reduce((a, p) => a + p.len, 0), c.tag).toBeCloseTo(m.routeLength, 1);
    }
  });

  it('곧은 길 위의 차는 그대로, 굽는 곳의 차는 호의 끝으로 옮겨 곧게 선다 (9.5 이하로 옮김)', () => {
    let moved = 0;
    for (const c of cases()) {
      const m = layoutMap(c);
      const p = restPose(m.routeD, m.car);
      expect(straight(p.angle), c.tag).toBe(true);
      if (straight(m.car.angle)) expect(p, c.tag).toBe(m.car);
      else {
        moved += 1;
        expect(Math.abs(p.dist - m.car.dist), c.tag).toBeLessThanOrEqual(9.5);
      }
    }
    // 지금 배치에서 굽는 곳에 서는 경우가 있다 (위 오른쪽 굽이, 아래 오른쪽 굽이)
    expect(moved).toBeGreaterThan(0);
  });

  it('옮긴 차는 마디·빈 터와 겹치지 않는다', () => {
    for (const c of cases()) {
      const m = layoutMap(c);
      const p = restPose(m.routeD, m.car);
      const vertical = Math.abs(Math.abs(p.angle) - 90) < 0.01;
      const box = vertical ? { x: p.x - MAP_CAR.w / 2, y: p.y - MAP_CAR.l / 2, w: MAP_CAR.w, h: MAP_CAR.l } : { x: p.x - MAP_CAR.l / 2, y: p.y - MAP_CAR.w / 2, w: MAP_CAR.l, h: MAP_CAR.w };
      for (const n of m.nodes) expect(overlaps(box, n.box), `${c.tag} ↔ ${n.id}`).toBe(false);
      expect(overlaps(box, m.lot.box), `${c.tag} ↔ 빈 터`).toBe(false);
    }
  });
});

describe('출발 → 도착(S5)의 차 자리', () => {
  it('도구끼리 맞춰 보기의 지도와 도착한 지도는 길이 같고, 차는 거기서 앞으로만 달려 빈 터 앞에 선다 (출발로 튀지 않는다)', () => {
    let checked = 0;
    for (const c of cases()) {
      if (!c.arrived || c.traffic) continue;
      const done = layoutMap(c);
      const check = layoutMap({ ...c, arrived: false, traffic: true });
      expect(check.routeD, c.tag).toBe(done.routeD);
      expect(restPose(check.routeD, check.car).dist, c.tag).toBeLessThanOrEqual(restPose(done.routeD, done.car).dist);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });
});
