// 길 지도 모형 (docs/MAP.md 4절): 기능 조합 32가지와 골든 사례·미리 짠 코스 모두에서
// 이름표가 서로·다른 것·길과 겹치지 않고, 차가 마디·출발·빈 터·굴을 덮지 않고 routeD 위 제자리에 서고,
// 모두 안전 구역 안에 있고, 기호는 12개 이하, 길은 45°·90°만 쓴다.
import { describe, expect, it } from 'vitest';
import type { EngineResult, Session } from '../../src/lib/engine/index.ts';
import { evaluate, fill } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { ko } from '../../src/copy/ko.ts';
import type { Box, HouseKind, MapInput, MapInputConflict, MapInputNode, MapModel, NodeShape, Pt } from '../../src/lib/map/model.ts';
import { MAP_CAR, MAP_CAR_GAP, MAP_GRID, MAP_MAX_SYMBOLS, MAP_SAFE, labelBox, layoutMap, mapModel, markerKind, overlaps, textWidth } from '../../src/lib/map/model.ts';
import { progress } from '../../src/lib/progress.ts';
import { statusLine } from '../../src/lib/status-line.ts';
import { realCatalog, realData } from '../fixtures/tiny.ts';

const data = realData();
const cat = realCatalog();

/** 칸 이름은 진짜 자료에서 (화면, 저장, 로그인, 외부 데이터, 알림, 배포·공유) */
const SLOT_LABEL = new Map<string, string>();
for (const r of data.rules.rules) if (r.type === 'slot') SLOT_LABEL.set(r.slot.capability, r.slot.label);
const SHAPES: NodeShape[] = ['screen', 'store', 'auth', 'data', 'notify', 'host'];
const OPTIONAL = SHAPES.slice(1);
const TYPE_LABELS = (data.questions.questions.find((q) => q.id === 'q.type')?.options ?? []).filter((o) => o.isUnknown !== true).map((o) => o.label);
const LONGEST_TYPE = [...TYPE_LABELS].sort((a, b) => textWidth(b) - textWidth(a))[0] ?? '';

const COMBOS: NodeShape[][] = Array.from({ length: 32 }, (_, mask) => ['screen', ...OPTIONAL.filter((_, i) => (mask & (1 << i)) !== 0)]);

function node(shape: NodeShape, extra: Partial<MapInputNode> = {}): MapInputNode {
  return { id: `slot.${shape}`, shape, label: SLOT_LABEL.get(shape) ?? shape, filled: false, ...extra };
}

const deferrable = (s: NodeShape): boolean => s === 'auth' || s === 'notify';

/** 한 조합의 상태 섞기: 모두 아직 / 모두 고름 / 일부 미룸 / 교통(막힘·서행) / 지금 여는 곳 / 도착 */
function mixes(shapes: NodeShape[]): { name: string; input: MapInput }[] {
  const lot = { type: 'tool' as const, label: LONGEST_TYPE };
  const tunnel = shapes.includes('data') ? ('open' as const) : null;
  const rich = { lot, houses: 'many' as HouseKind, tunnel, palette: 'bold' as const };
  const jamConflicts: MapInputConflict[] = [];
  const trafficNodes = shapes.map((s, i) => {
    const t = i % 2 === 0 ? ('jam' as const) : ('slow' as const);
    jamConflicts.push({ id: `c.${s}`, kind: t === 'jam' ? 'gap' : 'question', anchor: `slot.${s}` });
    return node(s, { filled: t === 'slow', traffic: t, hatch: s === 'store' });
  });
  return [
    { name: '모두 아직', input: { nodes: shapes.map((s) => node(s)), lot: { type: null, label: ko.map.destination } } },
    { name: '모두 고름', input: { nodes: shapes.map((s) => node(s, { filled: true })), ...rich } },
    {
      name: '일부 미룸',
      input: { nodes: shapes.map((s) => (deferrable(s) ? node(s, { later: true }) : node(s, { filled: true }))), ...rich, houses: '3' },
    },
    {
      name: '미룬 마디도 표지도 있음',
      input: {
        nodes: shapes.map((s) => (deferrable(s) ? node(s, { later: true }) : node(s, { filled: true, traffic: s === 'host' ? 'jam' : null }))),
        conflicts: [{ id: 'conflict.key-in-static-page', kind: 'lock', anchor: 'slot.host' }],
        traffic: true,
        ...rich,
        tunnel: 'ghost',
      },
    },
    { name: '교통 막힘·서행', input: { nodes: trafficNodes, conflicts: jamConflicts, traffic: true, ...rich } },
    {
      name: '교통 + 길 전체',
      input: {
        nodes: trafficNodes,
        conflicts: [{ id: 'conflict.paid-on-free', kind: 'toll', anchor: null }, ...jamConflicts.slice(0, 2), { id: 'conflict.shared-without-login', kind: 'alert', anchor: null }],
        traffic: true,
        ...rich,
        houses: '1',
      },
    },
    { name: '지금 여는 곳', input: { nodes: shapes.map((s, i) => node(s, { filled: i === 0, open: i === Math.min(1, shapes.length - 1) })), ...rich, houses: null } },
    {
      name: '도착',
      input: { nodes: shapes.map((s) => node(s, { filled: true })), conflicts: [{ id: 'c.kept', kind: 'question', anchor: 'slot.screen' }], arrived: true, ...rich },
    },
  ];
}

// ---------------------------------------------------------------- routeD를 따로 읽는 길 걷기 (모형의 계산을 쓰지 않는다)

interface Walk {
  length: number;
  at(d: number): Pt & { angle: number };
}

function parseD(d: string): { cmd: string; nums: number[] }[] {
  const out: { cmd: string; nums: number[] }[] = [];
  for (const m of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    out.push({ cmd: m[1] ?? '', nums: (m[2] ?? '').trim().split(/[\s,]+/).filter(Boolean).map(Number) });
  }
  return out;
}

/** M·L·A(작은 호)만 쓰는 SVG 길을 거리로 걷는다. 호는 끝점·반지름·sweep에서 가운데를 다시 구한다 */
function walk(d: string): Walk {
  const parts: { l: number; at: (t: number) => Pt & { angle: number } }[] = [];
  let cur: Pt = { x: 0, y: 0 };
  for (const c of parseD(d)) {
    const [a = 0, b = 0, , , , f = 0, g = 0] = c.nums;
    if (c.cmd === 'M') cur = { x: a, y: b };
    else if (c.cmd === 'L') {
      const s = cur;
      const e = { x: a, y: b };
      const l = Math.hypot(e.x - s.x, e.y - s.y);
      const angle = (Math.atan2(e.y - s.y, e.x - s.x) * 180) / Math.PI;
      parts.push({ l, at: (t) => ({ x: s.x + ((e.x - s.x) * t) / (l || 1), y: s.y + ((e.y - s.y) * t) / (l || 1), angle }) });
      cur = e;
    } else if (c.cmd === 'A') {
      const r = a;
      const sweep = c.nums[4] === 1 ? 1 : -1;
      const s = cur;
      const e = { x: f, y: g };
      const q = Math.hypot(e.x - s.x, e.y - s.y) / 2;
      const h = Math.sqrt(Math.max(0, r * r - q * q));
      const n = { x: -(e.y - s.y) / (2 * q), y: (e.x - s.x) / (2 * q) };
      const mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
      const sweepOf = (cx: Pt): number => {
        let dl = Math.atan2(e.y - cx.y, e.x - cx.x) - Math.atan2(s.y - cx.y, s.x - cx.x);
        while (dl > Math.PI) dl -= 2 * Math.PI;
        while (dl <= -Math.PI) dl += 2 * Math.PI;
        return dl;
      };
      const c1 = { x: mid.x + n.x * h, y: mid.y + n.y * h };
      const c2 = { x: mid.x - n.x * h, y: mid.y - n.y * h };
      const center = Math.sign(sweepOf(c1)) === sweep ? c1 : c2;
      const delta = sweepOf(center);
      const t0 = Math.atan2(s.y - center.y, s.x - center.x);
      parts.push({
        l: Math.abs(delta) * r,
        at: (t) => {
          const th = t0 + (sweep * t) / r;
          return { x: center.x + r * Math.cos(th), y: center.y + r * Math.sin(th), angle: (Math.atan2(sweep * Math.cos(th), -sweep * Math.sin(th)) * 180) / Math.PI };
        },
      });
      cur = e;
    }
  }
  return {
    length: parts.reduce((n, p) => n + p.l, 0),
    at(dist) {
      let left = dist;
      for (const p of parts) {
        if (left <= p.l + 1e-9) return p.at(left);
        left -= p.l;
      }
      const lastPart = parts[parts.length - 1];
      return lastPart ? lastPart.at(lastPart.l) : { ...cur, angle: 0 };
    },
  };
}

const angleGap = (a: number, b: number): number => Math.abs((((a - b) % 360) + 540) % 360 - 180);

// ---------------------------------------------------------------- 불변식

const on45 = (a: Pt, b: Pt): boolean => {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  return dx < 0.01 || dy < 0.01 || Math.abs(dx - dy) < 0.01;
};

/** d를 읽어 곧은 선이 모두 0°·45°·90°이고, 굽는 곳은 반지름 12의 호인지 본다 */
function checkD(d: string, points: Pt[]): string[] {
  const errs: string[] = [];
  const cmds = parseD(d);
  const first = cmds[0];
  const p0 = points[0];
  const pN = points[points.length - 1];
  if (!first || first.cmd !== 'M' || !p0) return ['d가 M으로 시작하지 않음'];
  if (Math.abs((first.nums[0] ?? NaN) - p0.x) > 0.01 || Math.abs((first.nums[1] ?? NaN) - p0.y) > 0.01) errs.push('d 시작점이 첫 점과 다름');
  let cur: Pt = { x: first.nums[0] ?? 0, y: first.nums[1] ?? 0 };
  for (const c of cmds.slice(1)) {
    if (c.cmd === 'L') {
      const next = { x: c.nums[0] ?? 0, y: c.nums[1] ?? 0 };
      if (!on45(cur, next)) errs.push(`45°·90°가 아닌 선 ${JSON.stringify(cur)}→${JSON.stringify(next)}`);
      cur = next;
    } else if (c.cmd === 'A') {
      if (c.nums[0] !== 12 || c.nums[1] !== 12) errs.push('굽는 곳 반지름이 12가 아님');
      cur = { x: c.nums[5] ?? 0, y: c.nums[6] ?? 0 };
    } else errs.push(`모르는 명령 ${c.cmd}`);
  }
  if (pN && (Math.abs(cur.x - pN.x) > 0.01 || Math.abs(cur.y - pN.y) > 0.01)) errs.push('d 끝점이 마지막 점과 다름');
  return errs;
}

const inside = (b: Box): boolean => b.x >= MAP_SAFE.x0 - 1e-9 && b.y >= MAP_SAFE.y0 - 1e-9 && b.x + b.w <= MAP_SAFE.x1 + 1e-9 && b.y + b.h <= MAP_SAFE.y1 + 1e-9;
const onGrid = (p: Pt): boolean => p.x % MAP_GRID === 0 && p.y % MAP_GRID === 0;
const coneBox = (p: Pt): Box => ({ x: p.x - 8, y: p.y - 8, w: 16, h: 16 });
/** 길 바깥 선(굵기 8)으로 감싼 곧은 토막 */
const roadBox = (a: Pt, b: Pt): Box => ({ x: Math.min(a.x, b.x) - 4, y: Math.min(a.y, b.y) - 4, w: Math.abs(b.x - a.x) + 8, h: Math.abs(b.y - a.y) + 8 });
/** 돌린 차(가운데 x·y, 방향 angle, 36×18)가 상자에 gap보다 가까운가: 분리축 넷 (상자 가로·세로, 차 앞뒤·옆) */
function carNear(car: { x: number; y: number; angle: number }, b: Box, gap: number): boolean {
  const a = (car.angle * Math.PI) / 180;
  const ax = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: Math.cos(a), y: Math.sin(a) },
    { x: -Math.sin(a), y: Math.cos(a) },
  ];
  const corners = (pts: Pt[], u: Pt): [number, number] => {
    const v = pts.map((p) => p.x * u.x + p.y * u.y);
    return [Math.min(...v), Math.max(...v)];
  };
  const h = { x: (MAP_CAR.l / 2) * Math.cos(a), y: (MAP_CAR.l / 2) * Math.sin(a) };
  const k = { x: (-MAP_CAR.w / 2) * Math.sin(a), y: (MAP_CAR.w / 2) * Math.cos(a) };
  const carPts = [
    { x: car.x + h.x + k.x, y: car.y + h.y + k.y },
    { x: car.x + h.x - k.x, y: car.y + h.y - k.y },
    { x: car.x - h.x + k.x, y: car.y - h.y + k.y },
    { x: car.x - h.x - k.x, y: car.y - h.y - k.y },
  ];
  const boxPts = [
    { x: b.x - gap, y: b.y - gap },
    { x: b.x + b.w + gap, y: b.y - gap },
    { x: b.x - gap, y: b.y + b.h + gap },
    { x: b.x + b.w + gap, y: b.y + b.h + gap },
  ];
  return ax.every((u) => {
    const [a0, a1] = corners(carPts, u);
    const [b0, b1] = corners(boxPts, u);
    return a0 < b1 && b0 < a1;
  });
}

const contains = (outer: Box, inner: Box): boolean =>
  inner.x >= outer.x - 1e-9 && inner.y >= outer.y - 1e-9 && inner.x + inner.w <= outer.x + outer.w + 1e-9 && inner.y + inner.h <= outer.y + outer.h + 1e-9;

/** 모형 하나의 불변식. 어긋난 것을 문장으로 돌려준다 (빈 배열이면 통과) */
function violations(m: MapModel): string[] {
  const errs: string[] = [];
  const labels = [
    { key: 'start', box: m.start.label.box },
    { key: 'lot', box: m.lot.label.box },
    ...m.nodes.map((n) => ({ key: n.id, box: n.label.box })),
  ];
  const things: { key: string; box: Box; owner?: string }[] = [
    { key: '출발', box: m.start.box, owner: 'start' },
    { key: '빈 터', box: m.lot.box, owner: 'lot' },
    // 깃발은 빈 터 말뚝에 꽂혀 터와 겹친다
    { key: '깃발', box: m.lot.flagBox, owner: 'lot' },
    ...(m.houses ? [{ key: '집', box: m.houses.box }] : []),
    ...(m.tunnel ? [{ key: '굴', box: m.tunnel.box }] : []),
    ...m.nodes.map((n) => ({ key: `마디 ${n.id}`, box: n.box, owner: n.id })),
    ...m.nodes.flatMap((n) => (n.cone ? [{ key: `고깔 ${n.id}`, box: coneBox(n.cone), owner: n.id }] : [])),
    ...m.markers.map((k) => ({ key: `표지 ${k.id}`, box: k.box, owner: k.anchor ?? 'start' })),
    { key: '차', box: m.car.box },
  ];
  // 길 토막: 본선은 이어 붙인 꺾은선, 가지는 따로
  const roadPieces = m.roads.flatMap((r) =>
    r.points.slice(1).map((p, i) => ({ key: `길 ${r.id}`, road: r, box: roadBox(r.points[i] ?? p, p) })),
  );

  for (const [i, a] of labels.entries()) {
    if (a.box.w <= 0) errs.push(`이름표 ${a.key}가 비었음`);
    if (!inside(a.box)) errs.push(`이름표 ${a.key}가 안전 구역 밖 ${JSON.stringify(a.box)}`);
    for (const b of labels.slice(i + 1)) if (overlaps(a.box, b.box)) errs.push(`이름표 ${a.key} ↔ ${b.key}`);
    for (const t of things) if (overlaps(a.box, t.box)) errs.push(`이름표 ${a.key} ↔ ${t.key}`);
    for (const p of roadPieces) if (overlaps(a.box, p.box)) errs.push(`이름표 ${a.key} ↔ ${p.key}`);
  }
  for (const t of things) if (!inside(t.box)) errs.push(`${t.key}가 안전 구역 밖 ${JSON.stringify(t.box)}`);

  // 고정된 것(출발·빈 터·깃발·집·마디·고깔)끼리는 겹치지 않는다 (마디와 제 고깔, 빈 터와 깃발은 붙어 있다)
  const solids = things.filter((t) => !t.key.startsWith('표지') && t.key !== '차');
  const fixed = solids.filter((t) => t.key !== '굴');
  for (const [i, a] of fixed.entries()) {
    for (const b of fixed.slice(i + 1)) if ((a.owner === undefined || a.owner !== b.owner) && overlaps(a.box, b.box)) errs.push(`${a.key} ↔ ${b.key}`);
  }
  // 표지는 자기 마디(길 전체는 출발) 모서리에만 겹칠 수 있고, 남의 길에 앉지 않는다
  for (const [i, k] of m.markers.entries()) {
    const owner = k.anchor ?? 'start';
    for (const t of solids) if (t.owner !== owner && overlaps(k.box, t.box)) errs.push(`표지 ${k.id} ↔ ${t.key}`);
    for (const o of m.markers.slice(i + 1)) if (overlaps(k.box, o.box)) errs.push(`표지 ${k.id} ↔ 표지 ${o.id}`);
    if (overlaps(k.box, m.car.box)) errs.push(`표지 ${k.id} ↔ 차`);
    for (const p of roadPieces) {
      const own = k.anchor === null ? p.road.from === 'start' && p.box.x < m.start.x : p.road.to === k.anchor || p.road.from === k.anchor;
      if (!own && overlaps(k.box, p.box)) errs.push(`표지 ${k.id} ↔ ${p.key}`);
    }
    if (k.count > 1) {
      if (!k.countAt || !contains(k.box, { x: k.countAt.x - 7, y: k.countAt.y - 7, w: 14, h: 14 })) errs.push(`표지 ${k.id}의 개수 동그라미가 상자 밖`);
    } else if (k.countAt !== null) errs.push(`표지 ${k.id}에 개수가 하나인데 동그라미가 있음`);
  }
  // 굴은 마디·출발·빈 터·집과 겹치지 않고, 굴 표지는 굴 상자 안에
  if (m.tunnel) {
    for (const t of solids) if (t.key !== '굴' && overlaps(m.tunnel.box, t.box)) errs.push(`굴 ↔ ${t.key}`);
    if (!contains(m.tunnel.box, { x: m.tunnel.sign.x - 8, y: m.tunnel.sign.y - 8, w: 16, h: 16 })) errs.push('굴 표지가 굴 상자 밖');
  }
  // 나중 가지 끝 마디와 집은 남의 길에 앉지 않는다
  for (const n of m.nodes.filter((x) => x.state === 'later')) {
    for (const p of roadPieces) if (p.road.from !== n.id && p.road.to !== n.id && overlaps(n.box, p.box)) errs.push(`나중 마디 ${n.id} ↔ ${p.key}`);
  }
  if (m.houses) for (const p of roadPieces) if (overlaps(m.houses.box, p.box)) errs.push(`집 ↔ ${p.key}`);

  // 차: 마디·출발·빈 터·굴·고깔과 띄움만큼 떨어져, routeD 위 dist 자리에 그 방향으로 선다
  for (const t of solids) if (carNear(m.car, t.box, MAP_CAR_GAP - 0.02)) errs.push(`차 ↔ ${t.key}`);
  if (!contains(m.car.box, { x: m.car.x - 9, y: m.car.y - 9, w: 18, h: 18 })) errs.push('차 상자가 차를 감싸지 않음');
  const route = walk(m.routeD);
  const spot = route.at(m.car.dist);
  if (Math.hypot(spot.x - m.car.x, spot.y - m.car.y) > 0.05) errs.push(`차가 routeD ${m.car.dist} 자리 밖 ${JSON.stringify([m.car.x, m.car.y])} ≠ ${JSON.stringify([spot.x, spot.y])}`);
  if (angleGap(spot.angle, m.car.angle) > 0.5) errs.push(`차 방향 ${m.car.angle}° ≠ 길 방향 ${spot.angle}°`);
  if (Math.abs(route.length - m.routeLength) > 0.05) errs.push(`routeLength ${m.routeLength} ≠ ${route.length}`);
  if (m.car.dist < 0 || m.car.dist > m.routeLength) errs.push('차 거리가 길 밖');

  const expected = m.nodes.length + 2 + (m.houses ? 1 : 0) + (m.tunnel ? 1 : 0) + m.markers.length;
  if (m.symbols !== expected) errs.push(`기호 수 ${m.symbols} ≠ ${expected}`);
  if (m.symbols > MAP_MAX_SYMBOLS) errs.push(`기호 ${m.symbols}개`);

  for (const r of m.roads) {
    for (let i = 0; i + 1 < r.points.length; i += 1) {
      const a = r.points[i];
      const b = r.points[i + 1];
      if (a && b && !on45(a, b)) errs.push(`길 ${r.id}의 꺾은선이 45°·90°가 아님`);
    }
    for (const p of r.points) {
      if (!onGrid(p)) errs.push(`길 ${r.id}의 점 ${JSON.stringify(p)}가 격자 밖`);
      if (!inside({ x: p.x - 3, y: p.y - 3, w: 6, h: 6 })) errs.push(`길 ${r.id}가 안전 구역 밖`);
    }
    errs.push(...checkD(r.d, r.points).map((e) => `길 ${r.id}: ${e}`));
  }
  const mains = m.roads.filter((r) => r.kind === 'main');
  const routePts = mains.flatMap((r, i) => (i === 0 ? r.points : r.points.slice(1)));
  errs.push(...checkD(m.routeD, routePts).map((e) => `routeD: ${e}`));
  if (mains[0]?.from !== 'start' || mains[mains.length - 1]?.to !== 'lot') errs.push('본선이 출발에서 빈 터까지 이어지지 않음');
  for (const n of m.nodes) {
    if (!onGrid(n.main) || !onGrid({ x: n.x, y: n.y })) errs.push(`마디 ${n.id}가 격자 밖`);
    // 마디 거리도 routeD 위 그 자리
    const at = route.at(n.dist);
    if (Math.hypot(at.x - n.main.x, at.y - n.main.y) > 0.05) errs.push(`마디 ${n.id}의 dist ${n.dist}가 제자리가 아님`);
  }
  return errs;
}

function expectValid(m: MapModel, name: string): void {
  expect(violations(m), name).toEqual([]);
}

// ---------------------------------------------------------------- 1. 기능 조합 32가지

describe('기능 조합 32가지 × 상태 섞기', () => {
  it('조합은 32가지이고 화면은 늘 있다', () => {
    expect(COMBOS).toHaveLength(32);
    expect(new Set(COMBOS.map((c) => c.join(','))).size).toBe(32);
    expect(COMBOS.every((c) => c[0] === 'screen')).toBe(true);
  });

  for (const shapes of COMBOS) {
    it(`${shapes.join('·')}`, () => {
      for (const { name, input } of mixes(shapes)) {
        const m = layoutMap(input);
        expectValid(m, `${shapes.join('·')} / ${name}`);
        expect(m.nodes.map((n) => n.id)).toEqual(shapes.map((s) => `slot.${s}`));
        // 같은 입력이면 같은 출력
        expect(layoutMap(structuredClone(input))).toEqual(m);
      }
    });
  }

  it('가장 긴 앱 종류 이름과 집 셋 모두에서도 겹치지 않는다', () => {
    for (const shapes of COMBOS) {
      for (const label of TYPE_LABELS) {
        for (const houses of ['1', '3', 'many'] as HouseKind[]) {
          const m = layoutMap({ nodes: shapes.map((s) => node(s, { filled: true })), lot: { type: 'page', label }, houses, tunnel: 'open' });
          expectValid(m, `${shapes.join('·')} / ${label} / ${houses}`);
        }
      }
    }
  });
});

// ---------------------------------------------------------------- 2. 골든 사례와 미리 짠 코스

const sessions: { name: string; s: Partial<Session> }[] = [
  ...goldenFiles().map((f) => {
    const g = readJson<Golden>(f);
    return { name: g.id, s: goldenSession(g) };
  }),
  ...data.recipes.recipes.map((rc) => ({
    name: rc.id,
    s: { answers: rc.answers, cart: rc.cart, kept: rc.kept ?? [], deferred: [], ...(rc.freeText ? { freeText: rc.freeText } : {}) },
  })),
];

describe('골든 사례와 미리 짠 코스', () => {
  it('사례가 있다', () => {
    expect(sessions.length).toBeGreaterThanOrEqual(20);
  });

  for (const { name, s } of sessions) {
    it(name, () => {
      const r = evaluate(cat, s);
      for (const slot of [undefined, ...r.slots.map((x) => x.slot.id)]) {
        for (const opts of [{}, { traffic: true }, { arrived: true }, { focus: slot }, { traffic: true, focus: slot }]) {
          const m = mapModel(r, opts);
          expectValid(m, `${name} ${JSON.stringify(opts)}`);
          expect(m.nodes.map((n) => n.id)).toEqual(r.slots.map((x) => x.slot.id));
          expect(m.summary.length).toBeGreaterThan(0);
        }
      }
      expect(mapModel(evaluate(cat, s), { traffic: true })).toEqual(mapModel(r, { traffic: true }));
    });
  }

  it('답할 때마다 자라는 지도 (목적지 질문을 하나씩 더해도) 모두 유효하다', () => {
    for (const { name, s } of sessions) {
      const answers: Record<string, string> = {};
      for (const [q, a] of Object.entries(s.answers ?? {})) {
        answers[q] = a;
        expectValid(mapModel(evaluate(cat, { answers: { ...answers } })), `${name} ${q}`);
      }
    }
  });

  it('도구를 하나씩 고를 때마다 차는 앞으로만 간다 (S3가 offset-distance를 늘리기만 한다)', () => {
    for (const { name, s } of sessions) {
      const r0 = evaluate(cat, { answers: s.answers ?? {} });
      if (!r0.done) continue;
      let prev = -1;
      for (let k = 0; k <= (s.cart ?? []).length; k += 1) {
        const m = mapModel(evaluate(cat, { answers: s.answers ?? {}, cart: (s.cart ?? []).slice(0, k) }));
        expectValid(m, `${name} 고른 도구 ${k}개`);
        expect(m.car.dist, `${name} 고른 도구 ${k}개`).toBeGreaterThanOrEqual(prev);
        prev = m.car.dist;
      }
    }
  });
});

// ---------------------------------------------------------------- 3. 낱낱의 약속

function golden(id: string): Partial<Session> {
  const f = goldenFiles().find((x) => x.endsWith(`${id}.json`));
  if (!f) throw new Error(`${id} 없음`);
  return goldenSession(readJson<Golden>(f));
}

const near = (a: Pt, b: Pt, d: number): boolean => Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d;

describe('표지', () => {
  it('anchorSlot이 있는 막힌 곳은 그 마디 귀퉁이(막히면 변 가운데)에 붙는다 (case-04: 저장, 나라 밖 저장)', () => {
    const r = evaluate(cat, golden('case-04'));
    const c = r.conflicts.find((x) => x.id === 'conflict.personal-server');
    expect(c?.anchorSlot).toBe('slot.store');
    expect(c?.kept).toBe(false);
    const m = mapModel(r, { traffic: true });
    const mk = m.markers.find((x) => x.id === 'conflict.personal-server');
    const store = m.nodes.find((n) => n.id === 'slot.store');
    expect(mk?.kind).toBe('globe');
    expect(mk?.anchor).toBe('slot.store');
    expect(mk?.countAt).toBeNull();
    expect(store?.state).toBe('jam');
    if (!mk || !store) throw new Error('표지나 마디가 없음');
    expect(near(mk, store, 18)).toBe(true);
    // 다른 마디보다 붙은 마디에 가장 가깝다
    const closest = [...m.nodes].sort((a, b) => Math.hypot(a.x - mk.x, a.y - mk.y) - Math.hypot(b.x - mk.x, b.y - mk.y))[0];
    expect(closest?.id).toBe('slot.store');
    expect(m.roads.find((x) => x.to === 'slot.store')?.state).toBe('jam');
    expect(m.summary).toContain(fill(ko.map.summary.blocked, { n: 1 }));
  });

  it('그대로 가기로 둔 것은 물음표, 마디와 길은 서행 (case-02)', () => {
    const r = evaluate(cat, golden('case-02'));
    expect(r.conflicts.find((x) => x.id === 'conflict.personal-server')?.kept).toBe(true);
    const m = mapModel(r, { traffic: true });
    expect(m.markers.find((x) => x.id === 'conflict.personal-server')?.kind).toBe('question');
    expect(m.nodes.find((n) => n.id === 'slot.store')?.state).toBe('slow');
    expect(m.roads.find((x) => x.to === 'slot.store')?.state).toBe('slow');
  });

  it('anchorSlot이 없으면 출발 고리 오른쪽 위 귀퉁이(+12, −12)에 길 전체 표지 하나 (case-21: 유료 도구)', () => {
    const r = evaluate(cat, golden('case-21'));
    const m = mapModel(r, { traffic: true });
    expect(m.markers).toHaveLength(1);
    const mk = m.markers[0];
    expect(mk?.id).toBe('whole-route');
    expect(mk?.anchor).toBeNull();
    expect(mk?.kind).toBe('toll');
    expect(mk?.count).toBe(1);
    expect(mk?.countAt).toBeNull();
    expect(mk?.conflicts).toEqual(['conflict.paid-on-free']);
    expect([mk?.x, mk?.y]).toEqual([m.start.x + 12, m.start.y - 12]);
  });

  it('길 전체 표지는 여럿을 모아 세고, 개수 동그라미 자리를 함께 낸다', () => {
    const r = evaluate(cat, golden('case-20'));
    const m = mapModel(r, { traffic: true });
    expect(m.markers.find((x) => x.anchor === 'slot.store')?.kind).toBe('globe');
    const whole = m.markers.find((x) => x.id === 'whole-route');
    expect(whole?.count).toBe(1);
    expect(whole?.conflicts).toEqual(['conflict.shared-without-login']);
    const two = layoutMap({
      nodes: [node('screen', { filled: true }), node('host', { filled: true })],
      conflicts: [
        { id: 'a', kind: 'toll', anchor: null },
        { id: 'b', kind: 'alert', anchor: null },
      ],
      traffic: true,
    });
    expectValid(two, '길 전체 둘');
    const mk = two.markers[0];
    expect(mk?.count).toBe(2);
    expect(mk?.countAt).toEqual({ x: two.start.x + 12 + 10, y: two.start.y - 12 + 9 });
  });

  it('표지는 도구끼리 맞춰 보기(traffic)와 설계도 받기에서만 그린다', () => {
    const r = evaluate(cat, golden('case-04'));
    expect(mapModel(r).markers).toEqual([]);
    expect(mapModel(r, { focus: 'slot.store' }).markers).toEqual([]);
    expect(mapModel(r).nodes.every((n) => n.state !== 'jam' && n.state !== 'slow')).toBe(true);
    expect(mapModel(r).roads.every((x) => x.state !== 'jam' && x.state !== 'slow')).toBe(true);
  });

  it('막힌 곳 종류는 충돌 id로 고른다', () => {
    expect(markerKind({ id: 'conflict.paid-on-free', kind: 'rule', kept: false })).toBe('toll');
    expect(markerKind({ id: 'conflict.empty-slot:slot.data', kind: 'empty-slot', kept: false })).toBe('gap');
    expect(markerKind({ id: 'conflict.key-in-static-page', kind: 'rule', kept: false })).toBe('lock');
    expect(markerKind({ id: 'conflict.key-on-public-host', kind: 'rule', kept: false })).toBe('lock');
    expect(markerKind({ id: 'conflict.personal-server', kind: 'rule', kept: false })).toBe('globe');
    expect(markerKind({ id: 'conflict.realtime-mismatch', kind: 'rule', kept: false })).toBe('alert');
    expect(markerKind({ id: 'conflict.paid-on-free', kind: 'rule', kept: true })).toBe('question');
  });

  it('기호가 12개를 넘으면 표지를 길 전체 하나로 모은다', () => {
    const conflicts: MapInputConflict[] = SHAPES.slice(0, 4).map((s) => ({ id: `c.${s}`, kind: 'gap', anchor: `slot.${s}` }));
    const m = layoutMap({ nodes: SHAPES.map((s) => node(s, { traffic: 'jam' })), conflicts, traffic: true, houses: 'many', tunnel: 'open' });
    expectValid(m, '모으기');
    expect(m.symbols).toBeLessThanOrEqual(MAP_MAX_SYMBOLS);
    expect(m.markers).toHaveLength(1);
    expect(m.markers[0]?.id).toBe('whole-route');
    expect(m.markers[0]?.count).toBe(4);
    expect(m.markers[0]?.kind).toBe('gap');
  });
});

describe('마디와 길', () => {
  it('나중으로 미룬 칸은 본선에서 비켜난 가지 끝에 고깔과 함께 (case-08: 알림)', () => {
    const r = evaluate(cat, golden('case-08'));
    expect(r.session.deferred).toEqual(['slot.notify']);
    const m = mapModel(r);
    const n = m.nodes.find((x) => x.id === 'slot.notify');
    expect(n?.state).toBe('later');
    if (!n?.cone) throw new Error('고깔 없음');
    expect(n.x !== n.main.x || n.y !== n.main.y).toBe(true);
    expect(Math.hypot(n.x - n.main.x, n.y - n.main.y)).toBe(36);
    const spur = m.roads.find((x) => x.kind === 'spur');
    expect(spur?.id).toBe('later:slot.notify');
    expect(spur?.state).toBe('later');
    expect(spur?.points).toEqual([n.main, { x: n.x, y: n.y }]);
    // 본선은 갈림목을 지나간다
    expect(m.roads.some((x) => x.kind === 'main' && x.points.some((p) => p.x === n.main.x && p.y === n.main.y))).toBe(true);
    expect(n.passed).toBe(false);
    expect(m.summary).toContain(fill(ko.map.summary.later, { n: 1 }));
  });

  it('이름표는 길에 앉지 않는다 (case-08·case-21의 외부 데이터가 가운데 세로 길 위에 있던 것)', () => {
    for (const id of ['case-08', 'case-21']) {
      for (const opts of [{}, { traffic: true }]) {
        const m = mapModel(evaluate(cat, golden(id)), opts);
        const data = m.nodes.find((n) => n.id === 'slot.data');
        if (!data) throw new Error(`${id}: 외부 데이터 없음`);
        for (const r of m.roads) {
          for (let i = 0; i + 1 < r.points.length; i += 1) {
            const a = r.points[i];
            const b = r.points[i + 1];
            if (a && b) expect(overlaps(data.label.box, roadBox(a, b)), `${id} ${r.id}`).toBe(false);
          }
        }
      }
    }
  });

  it('지금 여는 칸은 고리(focus)를 받는다: 비었으면 open, 골랐으면 picked + 고리', () => {
    const answers = evaluate(cat, golden('case-04')).session.answers;
    const r = evaluate(cat, { answers, cart: ['react-vite'] });
    const m = mapModel(r, { focus: 'slot.store' });
    const store = m.nodes.find((n) => n.id === 'slot.store');
    expect(m.nodes.find((n) => n.id === 'slot.screen')?.state).toBe('picked');
    expect(store?.state).toBe('open');
    expect(m.nodes.find((n) => n.id === 'slot.host')?.state).toBe('ghost');
    expect(m.focus).toEqual({ id: 'slot.store', x: store?.x, y: store?.y, r: 16 });
    // 고리(반지름 16 + 선 3의 반)는 마디 상자 반쪽 16 + 이름표 띄움 2 안에 든다
    expect((m.focus?.r ?? 0) + 1.5).toBeLessThanOrEqual(18);
    expect(m.roads.find((x) => x.to === 'slot.screen')?.state).toBe('built');
    expect(m.roads.find((x) => x.to === 'slot.store')?.state).toBe('ghost');
    const picked = mapModel(r, { focus: 'slot.screen' });
    expect(picked.nodes.find((n) => n.id === 'slot.screen')?.state).toBe('picked');
    expect(picked.focus?.id).toBe('slot.screen');
    expect(mapModel(r).focus).toBeNull();
  });

  it('학생 정보를 받으면 저장 마디에 빗금 (case-02)', () => {
    const r = evaluate(cat, golden('case-02'));
    expect(r.interview.tags['sensitive.students']).toBe(1);
    const m = mapModel(r);
    expect(m.nodes.find((n) => n.id === 'slot.store')?.hatch).toBe(true);
    expect(m.nodes.filter((n) => n.hatch)).toHaveLength(1);
  });

  it('중간 서버를 고르면 외부 데이터 다음 토막에 굴 (case-01), 키가 드러나는 막힌 곳이면 점선 굴 (case-09)', () => {
    const m1 = mapModel(evaluate(cat, golden('case-01')));
    expect(m1.tunnel?.ghost).toBe(false);
    const after = m1.roads.find((x) => x.from === 'slot.data');
    if (!m1.tunnel || !after) throw new Error('굴이나 토막이 없음');
    const t = m1.tunnel;
    expect(after.points.some((p, i) => {
      const q = after.points[i + 1];
      return q !== undefined && Math.min(p.x, q.x) <= t.x && t.x <= Math.max(p.x, q.x) && Math.min(p.y, q.y) <= t.y && t.y <= Math.max(p.y, q.y);
    })).toBe(true);
    // 굴 표지는 늘 똑바로: 가로 굴은 오른쪽 위, 세로 굴은 오른쪽
    expect(t.sign).toEqual(t.angle === 0 ? { x: t.x + 12, y: t.y - 12 } : { x: t.x + 14, y: t.y - 8 });
    const m9 = mapModel(evaluate(cat, golden('case-09')));
    expect(m9.tunnel?.ghost).toBe(true);
    expect(mapModel(evaluate(cat, golden('case-11'))).tunnel).toBeNull();
  });

  it('굴은 차가 움직여도 제자리다', () => {
    const s = golden('case-01');
    const places = new Set<string>();
    for (let k = 0; k <= (s.cart ?? []).length; k += 1) {
      const m = mapModel(evaluate(cat, { ...s, cart: (s.cart ?? []).slice(0, k) }));
      if (m.tunnel) places.add(JSON.stringify([m.tunnel.x, m.tunnel.y]));
    }
    expect(places.size).toBe(1);
  });

  it('마디 수가 늘어도 출발·빈 터는 제자리이고, 마디 자리는 마디 수마다 정해져 있다', () => {
    const places = new Set<string>();
    for (let n = 1; n <= 6; n += 1) {
      const m = layoutMap({ nodes: SHAPES.slice(0, n).map((s) => node(s)) });
      places.add(JSON.stringify([m.start.x, m.start.y, m.lot.x, m.lot.y]));
      expect(m.nodes).toHaveLength(n);
    }
    expect(places.size).toBe(1);
  });
});

describe('차', () => {
  const answers = evaluate(cat, golden('case-04')).session.answers;
  const nodeBoxes = (m: MapModel): Box[] => [m.start.box, m.lot.box, ...m.nodes.map((n) => n.box)];
  const clear = (m: MapModel): boolean => nodeBoxes(m).every((b) => !carNear(m.car, b, MAP_CAR_GAP - 0.02));

  it('아무것도 고르지 않았으면 출발 위 길에 선다 (출발 고리와 길 전체 표지 자리를 덮지 않는다)', () => {
    const m = mapModel(evaluate(cat, { answers }));
    expect(m.car.at).toBe('start');
    expect(m.car.angle).toBe(-90);
    expect(m.car.x).toBe(m.start.x);
    expect(m.car.dist).toBe(44);
    expect(overlaps(m.car.box, m.start.box, MAP_CAR_GAP - 0.02)).toBe(false);
    expect(overlaps(m.car.box, { x: m.start.x + 2, y: m.start.y - 22, w: 20, h: 20 })).toBe(false);
    expect(m.car.box).toEqual({ x: m.start.x - MAP_CAR.w / 2, y: m.car.y - MAP_CAR.l / 2, w: MAP_CAR.w, h: MAP_CAR.l });
  });

  it('출발부터 이어서 고른 마지막 마디의 앞(막히면 뒤)에 띄워 선다 (중간이 비면 그 앞에서 멈춘다)', () => {
    const r = evaluate(cat, { answers, cart: ['react-vite', 'cloudflare-workers'] });
    const m = mapModel(r);
    expect(m.car.at).toBe('slot.screen');
    const screen = m.nodes.find((n) => n.id === 'slot.screen');
    if (!screen) throw new Error('화면 없음');
    expect(Math.abs(m.car.dist - screen.dist)).toBeGreaterThanOrEqual(16 + MAP_CAR_GAP + MAP_CAR.l / 2 - 0.01);
    expect(clear(m)).toBe(true);
    expect(screen.passed).toBe(true);
    expect(m.nodes.find((n) => n.id === 'slot.host')?.passed).toBe(false);
  });

  it('교통 정보에서 막힌 마디(고른 도구끼리 부딪침)에 닿으면 그 앞에서 기다린다 (서행은 지나간다)', () => {
    const shapes: NodeShape[] = ['screen', 'store', 'data', 'host'];
    const jamAt = (j: number, t: 'jam' | 'slow') => shapes.map((s, i) => node(s, { filled: true, traffic: i === j ? t : null }));
    for (let j = 0; j < shapes.length; j += 1) {
      const m = layoutMap({ nodes: jamAt(j, 'jam'), traffic: true });
      expect(m.car.at, `막힘 ${j}`).toBe(j === 0 ? 'start' : `slot.${shapes[j - 1]}`);
      expect(m.nodes[j]?.passed, `막힘 ${j}`).toBe(false);
      expectValid(m, `막힘 ${j}`);
      expect(layoutMap({ nodes: jamAt(j, 'slow'), traffic: true }).car.at, `서행 ${j}`).toBe('slot.host');
    }
  });

  it('마디 1~6개, 앞에서부터 k개를 골랐을 때마다 어느 마디에도 닿지 않고 뒤로 가지 않는다 (마디 4개까지는 늘 앞으로)', () => {
    for (let n = 1; n <= 6; n += 1) {
      const shapes = SHAPES.slice(0, n);
      let prev = -1;
      for (let k = 0; k <= n + 1; k += 1) {
        const arrived = k === n + 1;
        const m = layoutMap({ nodes: shapes.map((s, i) => node(s, { filled: i < k })), arrived });
        const tag = `${n}개 중 ${arrived ? '도착' : `${k}개`}`;
        expect(clear(m), tag).toBe(true);
        expectValid(m, tag);
        expect(m.car.at, tag).toBe(arrived ? 'lot' : k === 0 ? 'start' : `slot.${shapes[Math.min(k, n) - 1]}`);
        if (n <= 4) expect(m.car.dist, tag).toBeGreaterThan(prev);
        else expect(m.car.dist, tag).toBeGreaterThanOrEqual(prev);
        prev = m.car.dist;
      }
    }
  });

  it('두 마디 사이가 좁던 곳에서도 어느 쪽에도 닿지 않는다 (지도 점검 장면 six-partial-calm · case-04 · case-09)', () => {
    const c19 = golden('case-19');
    const six: Partial<Session> = {
      ...c19,
      answers: { ...c19.answers, 'q.notify': 'yes', 'q.personal': 'yes-students', 'q.style': 'serious' },
      cart: ['html-single', 'supabase'],
      kept: [],
      deferred: [],
      freeText: '반 도서 기록장',
    };
    for (const [name, s] of [
      ['six', six],
      ['case-04', golden('case-04')],
      ['case-09', golden('case-09')],
    ] as const) {
      const r = evaluate(cat, s);
      for (const opts of [{}, { traffic: true }, { focus: r.slots[1]?.slot.id }]) {
        const m = mapModel(r, opts);
        expect(clear(m), `${name} ${JSON.stringify(opts)}`).toBe(true);
        expectValid(m, `${name} ${JSON.stringify(opts)}`);
      }
    }
  });

  it('다 고르면 마지막 마디 앞에, 도착하면 빈 터 가장자리에서 띄움만큼 앞에 선다', () => {
    const r = evaluate(cat, golden('case-19'));
    const m = mapModel(r);
    const last = m.nodes[m.nodes.length - 1];
    expect(m.car.at).toBe(last?.id);
    const a = mapModel(r, { arrived: true });
    expect(a.car.at).toBe('lot');
    expect(a.car.dist).toBeCloseTo(a.routeLength - 26, 1);
    expect(a.car.angle).toBe(-90);
    expect(a.car.box.y - (a.lot.box.y + a.lot.box.h)).toBeCloseTo(MAP_CAR_GAP, 1);
    expect(a.lot.state).toBe('drawn');
    expect(a.nodes.every((n) => n.passed)).toBe(true);
    expect(a.roads.filter((x) => x.kind === 'main').every((x) => x.state === 'built')).toBe(true);
  });

  it('홈 본보기(parked): 길은 다 이어 그리고 차는 출발 위에 세운다 (마디 1~6개, 이름표는 출발에 선 차를 비킨다)', () => {
    const start = mapModel(evaluate(cat, { answers }));
    for (let n = 1; n <= 6; n += 1) {
      const m = layoutMap({ nodes: SHAPES.slice(0, n).map((s) => node(s, { filled: true })), parked: true });
      const tag = `${n}개`;
      expect(m.car.at, tag).toBe('start');
      expect(m.car.dist, tag).toBe(start.car.dist);
      expect(m.roads.filter((x) => x.kind === 'main').every((x) => x.state === 'built'), tag).toBe(true);
      expect(clear(m), tag).toBe(true);
      expectValid(m, tag);
    }
    const r = evaluate(cat, golden('case-19'));
    expect(mapModel(r, { parked: true }).car.at).toBe('start');
    expect(mapModel(r).car.at).not.toBe('start');
  });

  it('마디 거리는 길 순서대로 늘어난다', () => {
    const m = mapModel(evaluate(cat, golden('case-19')));
    const d = m.nodes.map((n) => n.dist);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    expect(d[0]).toBeGreaterThan(0);
    expect(d[d.length - 1]).toBeLessThan(m.routeLength);
  });
});

describe('빈 터, 깃발, 집, 팔레트, 요약 글', () => {
  it('앱 종류를 정하기 전에는 맨땅(bare), 정하면 윤곽(outline) + 종류 이름', () => {
    const empty = mapModel(evaluate(cat, {}));
    expect(empty.lot.state).toBe('bare');
    expect(empty.lot.type).toBeNull();
    expect(empty.lot.label.text).toBe(ko.map.destination);
    expect(empty.start.label.text).toBe(ko.map.start);
    const form = mapModel(evaluate(cat, { answers: { 'q.type': 'form' } }));
    expect(form.lot.state).toBe('outline');
    expect(form.lot.type).toBe('form');
    expect(form.lot.label.text).toBe(data.questions.questions[0]?.options.find((o) => o.id === 'form')?.label);
    const unknown = mapModel(evaluate(cat, { answers: { 'q.type': 'unknown' } }));
    expect(unknown.lot.type).toBe('unknown');
    expect(unknown.lot.label.text).toBe(ko.map.destination);
  });

  it("직접 쓴 앱: 직접 쓴 앱 청사진(윤곽), 이름표는 내 말 12자(넘으면 11자 + '…', 내 말이 없으면 '목적지'), 요약 글은 내 말 30자", () => {
    const note = '반려식물 물 주기 알림을 보내는 앱이에요 정말로';
    const m = mapModel(evaluate(cat, { answers: { 'q.type': 'custom' }, notes: { 'q.type': note } }));
    expect(m.lot.type).toBe('custom');
    expect(m.lot.state).toBe('outline');
    expect(m.lot.label.text).toBe(`${[...note].slice(0, 11).join('')}…`);
    const short = mapModel(evaluate(cat, { answers: { 'q.type': 'custom' }, notes: { 'q.type': '반려식물 물 주기 알림' } }));
    expect(short.lot.label.text).toBe('반려식물 물 주기 알림');
    expect(m.lot.label.box.y + m.lot.label.box.h).toBeLessThanOrEqual(m.lot.box.y);
    expect(m.summary).toContain([...note].slice(0, 30).join(''));
    const hidden = mapModel(evaluate(cat, { answers: { 'q.type': 'custom' } }));
    expect(hidden.lot.label.text).toBe(ko.map.destination);
    expect(hidden.lot.label.text).not.toBe('직접 쓰기');
  });

  it('직접 쓴 도구의 서행 표지는 물음표', () => {
    expect(markerKind({ id: 'conflict.custom-tool:custom-1', kind: 'custom-tool', kept: true })).toBe('question');
  });

  it("표지 하나가 붙을 마디의 귀퉁이를 그 마디 이름표가 막으면 이름표를 옮겨 표지를 마디에 단다 ('길 전체'로 물리지 않는다)", () => {
    // case-01의 분야를 직접 쓰고 외부 데이터 칸을 직접 쓴 도구로: 마디 셋짜리 지도의 가운데 '외부 데이터'
    const g = readJson<Golden>(goldenFiles().find((f) => f.endsWith('case-01.json')) ?? '');
    const r = evaluate(cat, {
      answers: { ...g.answers, 'q.domain': 'custom' },
      notes: { 'q.domain': '포켓몬 도감' },
      customTools: [{ id: 'custom-1', name: 'PokeAPI', capability: 'data' }],
      cart: ['html-single', 'custom-1', 'github-pages'],
    });
    for (const opts of [{ traffic: true }, { arrived: true }]) {
      const m = mapModel(r, opts);
      const marker = m.markers.find((x) => x.conflicts.includes('conflict.custom-tool:custom-1'));
      expect(marker?.anchor).toBe('slot.data');
      const data = m.nodes.find((n) => n.id === 'slot.data');
      expect(data && marker && overlaps(data.label.box, marker.box)).toBe(false);
    }
  });

  it('깃발 밑동(12, 22)이 빈 터 왼쪽 위 말뚝(6, 6)에 꽂히고, 이름표는 깃발을 비킨다', () => {
    for (const label of TYPE_LABELS) {
      const m = layoutMap({ nodes: [node('screen')], lot: { type: 'page', label } });
      expect([m.lot.flag.x + 12, m.lot.flag.y + 22]).toEqual([m.lot.box.x + 6, m.lot.box.y + 6]);
      expect(overlaps(m.lot.label.box, m.lot.flagBox), label).toBe(false);
      // 빈 터 위 줄에 앉는다 (넓으면 깃발 왼쪽)
      expect(m.lot.label.box.y + m.lot.label.box.h, label).toBeLessThanOrEqual(m.lot.box.y);
    }
  });

  it('쓰는 사람: 나만 1채, 몇 명 3채, 아무나 골목, 모름은 나만', () => {
    const h = (a: string): string | undefined => mapModel(evaluate(cat, { answers: { 'q.type': 'page', 'q.audience': a } })).houses?.kind;
    expect(h('me')).toBe('1');
    expect(h('few')).toBe('3');
    expect(h('anyone')).toBe('many');
    expect(h('unknown')).toBe('1');
    expect(mapModel(evaluate(cat, { answers: { 'q.type': 'page' } })).houses).toBeNull();
  });

  it('느낌 답 → 팔레트 (차분하고 믿음직하게 = calm, 모름·없음 = clean)', () => {
    const p = (a?: string): string => mapModel(evaluate(cat, { answers: a ? { 'q.style': a } : {} })).palette;
    expect([p('clean'), p('cute'), p('serious'), p('bold'), p('unknown'), p()]).toEqual(['clean', 'cute', 'calm', 'bold', 'clean', 'clean']);
  });

  it('요약 글: 처음 오면 목적지 한 문장만', () => {
    expect(mapModel(evaluate(cat, {})).summary).toBe(ko.map.summary.noDestination);
    expect(mapModel(evaluate(cat, { answers: { 'q.type': 'form' } })).summary).toBe(fill(ko.map.summary.destination, { name: '신청서·설문' }));
  });

  it('요약 글: 목적지 이름 · 남은 꼭 고를 것 · 막힌 곳 (상태 한 줄과 같은 수와 말)', () => {
    const trip = data.recipes.recipes.find((x) => x.id === 'trip-form');
    if (!trip) throw new Error('trip-form 없음');
    const base: Partial<Session> = { answers: trip.answers, cart: trip.cart, kept: [], freeText: '체험학습 신청서' };
    const r: EngineResult = evaluate(cat, base);
    const p = progress(r, {});
    expect(p.blocked).toBe(1);
    const picks = p.requiredLeft > 0 ? fill(ko.map.summary.requiredLeft, { n: p.requiredLeft }) : ko.map.summary.requiredDone;
    expect(mapModel(r, { traffic: true }).summary).toBe(`목적지 체험학습 신청서. ${picks} 막힌 곳이 1개 있어요.`);
    expect(statusLine('check', r, {})).toContain(ko.progress.status.blocked.replace('{{n}}', '1'));
    // 그대로 가기로 두면 상태 한 줄처럼 '막힌 곳이 없어요' (그대로 가는 곳을 따로 세지 않는다)
    const kept = evaluate(cat, { ...base, kept: ['conflict.personal-server'] });
    expect(mapModel(kept, { traffic: true }).summary).toBe(`목적지 체험학습 신청서. ${picks} ${ko.map.summary.clear}`);
    expect(statusLine('check', kept, {})).toContain(ko.progress.status.clear);
    expect(mapModel(kept, { arrived: true }).summary).toBe(`목적지 체험학습 신청서. ${ko.map.summary.arrived}`);
    // 한 줄 입력이 없으면 앱 종류 이름
    const noText = mapModel(evaluate(cat, { answers: trip.answers, cart: trip.cart }));
    expect(noText.summary.startsWith(fill(ko.map.summary.destination, { name: noText.lot.label.text }))).toBe(true);
    // 막힌 곳이 없으면 상태 한 줄과 같은 말
    expect(mapModel(evaluate(cat, golden('case-01')), { traffic: true }).summary.endsWith(ko.map.summary.clear)).toBe(true);
  });

  it('요약 글: 남은 꼭 고를 것 수는 상태 한 줄과 같다 (골든 사례 모두)', () => {
    for (const { name, s } of sessions) {
      const r = evaluate(cat, { answers: s.answers ?? {}, cart: (s.cart ?? []).slice(0, 1) });
      if (!r.done) continue;
      const p = progress(r, {});
      const pickable = p.requiredLeft - p.requiredNoTool;
      const summary = mapModel(r).summary;
      const line = statusLine('waypoints', r, {});
      if (pickable > 0) {
        expect(summary, name).toContain(fill(ko.map.summary.requiredLeft, { n: pickable }));
        expect(line, name).toContain(fill(ko.progress.status.requiredLeft, { n: pickable }));
      } else expect(summary, name).not.toContain(fill(ko.map.summary.requiredLeft, { n: 0 }));
    }
  });
});

describe('이름표 상자 어림', () => {
  it('한글은 글자 크기만큼, 그 밖은 0.6배, 높이는 1.2배 (글자 크기 17)', () => {
    expect(labelBox('화면', { x: 100, y: 50 }, 'middle')).toEqual({ x: 83, y: 39.8, w: 34, h: 20.4 });
    const b = labelBox('배포·공유', { x: 10, y: 20 }, 'start');
    expect(b.x).toBe(10);
    expect(b.w).toBeCloseTo(17 * 4 + 17 * 0.6, 5);
    const e = labelBox('외부 데이터', { x: 200, y: 20 }, 'end');
    expect(e.x + e.w).toBeCloseTo(200, 5);
    expect(e.w).toBeCloseTo(17 * 5 + 17 * 0.6, 5);
  });
});
