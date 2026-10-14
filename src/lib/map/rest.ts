// 서 있는 차의 자리 (docs/MAP.md 5절, D71). 지도 모형(model.ts)은 차를 routeD 위 거리 dist의 점과 그 접선에 세우므로,
// 그 거리가 굽는 곳(반지름 12의 호) 안이면 차가 비스듬히 선다(76° 같은 각). 그리는 쪽에서만 호의 가까운 끝(곧은 길이 시작하는 곳)으로
// 옮겨 세운다: 길 위의 점이라 차를 offset-distance로 몰아도(S3·S5) 끝 자리가 그대로 맞는다. 옮기는 거리는 호의 절반(9.4) 이하다.
// 순수 함수: 모형을 더 키우지 않으려고(예산 6.5KB) 따로 둔다.

export interface Pose {
  x: number;
  y: number;
  /** 도, 0 = 오른쪽(+x), 90 = 아래 */
  angle: number;
  /** routeD 위 거리 */
  dist: number;
}

interface Piece {
  /** 곧은 길(L) 또는 호(A) */
  arc: boolean;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  len: number;
}

/** model.ts trace()가 쓰는 꼴(M x y, L x y, A r r 0 0 s x y)만 읽는다 */
export function pieces(d: string): Piece[] {
  const out: Piece[] = [];
  let x = 0;
  let y = 0;
  for (const m of d.matchAll(/([MLA])([^MLA]*)/g)) {
    const n = (m[2] ?? '').trim().split(/[\s,]+/).map(Number);
    const bx = n[n.length - 2] ?? x;
    const by = n[n.length - 1] ?? y;
    if (m[1] !== 'M') {
      const chord = Math.hypot(bx - x, by - y);
      const r = n[0] ?? 0;
      const len = m[1] === 'A' && r > 0 ? 2 * r * Math.asin(Math.min(1, chord / (2 * r))) : chord;
      out.push({ arc: m[1] === 'A', ax: x, ay: y, bx, by, len });
    }
    x = bx;
    y = by;
  }
  return out;
}

const r2 = (n: number): number => Math.round(n * 100) / 100;
const heading = (p: Piece): number => r2((Math.atan2(p.by - p.ay, p.bx - p.ax) * 180) / Math.PI);

/** 차가 굽는 곳 안에 서 있으면 호의 가까운 끝(앞뒤 곧은 길의 방향)으로 옮긴 자리. 곧은 길 위면 그대로 */
export function restPose(d: string, car: Pose): Pose {
  const list = pieces(d);
  let at = 0;
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    if (!p) break;
    if (car.dist <= at + p.len + 1e-6) {
      if (!p.arc) return car;
      const back = car.dist - at <= at + p.len - car.dist;
      const near = list[back ? i - 1 : i + 1];
      if (!near || near.arc) return car;
      return back ? { x: p.ax, y: p.ay, angle: heading(near), dist: r2(at) } : { x: p.bx, y: p.by, angle: heading(near), dist: r2(at + p.len) };
    }
    at += p.len;
  }
  return car;
}
