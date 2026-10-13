// 길 지도 모형 (docs/MAP.md 4절): 기능 조합 32가지와 골든 사례·미리 짠 코스 모두에서
// 이름표가 서로·다른 것과 겹치지 않고, 모두 안전 구역 안에 있고, 기호는 12개 이하, 길은 45°·90°만 쓴다.
import { describe, expect, it } from 'vitest';
import type { EngineResult, Session } from '../../src/lib/engine/index.ts';
import { evaluate, fill } from '../../src/lib/engine/index.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { ko } from '../../src/copy/ko.ts';
import type { Box, HouseKind, MapInput, MapInputConflict, MapInputNode, MapModel, NodeShape, Pt } from '../../src/lib/map/model.ts';
import { MAP_GRID, MAP_MAX_SYMBOLS, MAP_SAFE, labelBox, layoutMap, mapModel, markerKind, overlaps, textWidth } from '../../src/lib/map/model.ts';
import { realCatalog, realData } from '../fixtures/tiny.ts';

const data = realData();
const cat = realCatalog();

/** 칸 이름은 진짜 자료에서 (화면, 저장, 로그인, 외부 데이터, 알림, 배포·공유) */
const SLOT_LABEL = new Map<string, string>();
for (const r of data.rules.rules) if (r.type === 'slot') SLOT_LABEL.set(r.slot.capability, r.slot.label);
const OPTIONAL: NodeShape[] = ['store', 'auth', 'data', 'notify', 'host'];
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

// ---------------------------------------------------------------- 불변식

function parseD(d: string): { cmd: string; nums: number[] }[] {
  const out: { cmd: string; nums: number[] }[] = [];
  for (const m of d.matchAll(/([A-Za-z])([^A-Za-z]*)/g)) {
    out.push({ cmd: m[1] ?? '', nums: (m[2] ?? '').trim().split(/[\s,]+/).filter(Boolean).map(Number) });
  }
  return out;
}

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

/** 모형 하나의 불변식. 어긋난 것을 문장으로 돌려준다 (빈 배열이면 통과) */
function violations(m: MapModel): string[] {
  const errs: string[] = [];
  const labels = [
    { key: 'start', box: m.start.label.box },
    { key: 'lot', box: m.lot.label.box },
    ...m.nodes.map((n) => ({ key: n.id, box: n.label.box })),
  ];
  const things: { key: string; box: Box; owner?: string }[] = [
    { key: '출발', box: m.start.box },
    { key: '빈 터', box: m.lot.box },
    { key: '깃발', box: m.lot.flagBox },
    ...(m.houses ? [{ key: '집', box: m.houses.box }] : []),
    ...(m.tunnel ? [{ key: '굴', box: m.tunnel.box }] : []),
    ...m.nodes.map((n) => ({ key: `마디 ${n.id}`, box: n.box, owner: n.id })),
    ...m.nodes.flatMap((n) => (n.cone ? [{ key: `고깔 ${n.id}`, box: coneBox(n.cone), owner: n.id }] : [])),
    ...m.markers.map((k) => ({ key: `표지 ${k.id}`, box: k.box, owner: k.anchor ?? undefined })),
  ];

  for (const [i, a] of labels.entries()) {
    if (a.box.w <= 0) errs.push(`이름표 ${a.key}가 비었음`);
    if (!inside(a.box)) errs.push(`이름표 ${a.key}가 안전 구역 밖 ${JSON.stringify(a.box)}`);
    for (const b of labels.slice(i + 1)) if (overlaps(a.box, b.box)) errs.push(`이름표 ${a.key} ↔ ${b.key}`);
    for (const t of things) if (overlaps(a.box, t.box)) errs.push(`이름표 ${a.key} ↔ ${t.key}`);
  }
  for (const t of things) if (!inside(t.box)) errs.push(`${t.key}가 안전 구역 밖 ${JSON.stringify(t.box)}`);

  // 표지는 자기 마디 모서리에만 겹칠 수 있다
  const solids = things.filter((t) => !t.key.startsWith('표지'));
  for (const [i, k] of m.markers.entries()) {
    for (const t of solids) if (t.owner !== k.anchor && overlaps(k.box, t.box)) errs.push(`표지 ${k.id} ↔ ${t.key}`);
    for (const o of m.markers.slice(i + 1)) if (overlaps(k.box, o.box)) errs.push(`표지 ${k.id} ↔ 표지 ${o.id}`);
  }
  // 굴은 마디·출발·빈 터·집과 겹치지 않는다
  if (m.tunnel) {
    for (const t of solids) if (t.key !== '굴' && overlaps(m.tunnel.box, t.box)) errs.push(`굴 ↔ ${t.key}`);
  }

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
  for (const n of m.nodes) if (!onGrid(n.main) || !onGrid({ x: n.x, y: n.y })) errs.push(`마디 ${n.id}가 격자 밖`);
  if (!inside({ x: m.car.x - 1, y: m.car.y - 1, w: 2, h: 2 })) errs.push('차가 안전 구역 밖');
  if (m.car.dist < 0 || m.car.dist > m.routeLength) errs.push('차 거리가 길 밖');
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
      const focus = r.slots[0]?.slot.id;
      for (const opts of [{}, { traffic: true }, { arrived: true }, { focus }, { traffic: true, focus }]) {
        const m = mapModel(r, opts);
        expectValid(m, `${name} ${JSON.stringify(opts)}`);
        expect(m.nodes.map((n) => n.id)).toEqual(r.slots.map((x) => x.slot.id));
        expect(mapModel(evaluate(cat, s), opts)).toEqual(m);
        expect(m.summary.length).toBeGreaterThan(0);
      }
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
});

// ---------------------------------------------------------------- 3. 낱낱의 약속

function golden(id: string): Partial<Session> {
  const f = goldenFiles().find((x) => x.endsWith(`${id}.json`));
  if (!f) throw new Error(`${id} 없음`);
  return goldenSession(readJson<Golden>(f));
}

const near = (a: Pt, b: Pt, d: number): boolean => Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d;

describe('표지', () => {
  it('anchorSlot이 있는 막힌 곳은 그 마디 모서리에 붙는다 (case-04: 저장, 나라 밖 저장)', () => {
    const r = evaluate(cat, golden('case-04'));
    const c = r.conflicts.find((x) => x.id === 'conflict.personal-server');
    expect(c?.anchorSlot).toBe('slot.store');
    expect(c?.kept).toBe(false);
    const m = mapModel(r, { traffic: true });
    const mk = m.markers.find((x) => x.id === 'conflict.personal-server');
    const store = m.nodes.find((n) => n.id === 'slot.store');
    expect(mk?.kind).toBe('globe');
    expect(mk?.anchor).toBe('slot.store');
    expect(store?.state).toBe('jam');
    if (!mk || !store) throw new Error('표지나 마디가 없음');
    expect(near(mk, store, 14)).toBe(true);
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
    expect(m.summary).toContain(fill(ko.map.summary.kept, { n: 1 }));
  });

  it('anchorSlot이 없으면 출발 옆 길 전체 표지 하나에 개수를 단다 (case-21: 유료 도구)', () => {
    const r = evaluate(cat, golden('case-21'));
    const m = mapModel(r, { traffic: true });
    expect(m.markers).toHaveLength(1);
    const mk = m.markers[0];
    expect(mk?.id).toBe('whole-route');
    expect(mk?.anchor).toBeNull();
    expect(mk?.kind).toBe('toll');
    expect(mk?.count).toBe(1);
    expect(mk?.conflicts).toEqual(['conflict.paid-on-free']);
    if (!mk) throw new Error('표지 없음');
    expect(Math.hypot(mk.x - m.start.x, mk.y - m.start.y)).toBeLessThanOrEqual(64);
  });

  it('길 전체 표지는 여럿을 모아 센다 (case-20: 나라 밖 저장 + 로그인 없이 같이 씀)', () => {
    const r = evaluate(cat, golden('case-20'));
    const m = mapModel(r, { traffic: true });
    expect(m.markers.find((x) => x.anchor === 'slot.store')?.kind).toBe('globe');
    const whole = m.markers.find((x) => x.id === 'whole-route');
    expect(whole?.count).toBe(1);
    expect(whole?.conflicts).toEqual(['conflict.shared-without-login']);
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
    const shapes: NodeShape[] = ['screen', 'store', 'auth', 'data', 'notify', 'host'];
    const conflicts: MapInputConflict[] = shapes.slice(0, 4).map((s) => ({ id: `c.${s}`, kind: 'gap', anchor: `slot.${s}` }));
    const m = layoutMap({ nodes: shapes.map((s) => node(s, { traffic: 'jam' })), conflicts, traffic: true, houses: 'many', tunnel: 'open' });
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

  it('지금 여는 칸은 open, 고른 칸은 picked, 나머지는 ghost', () => {
    const r = evaluate(cat, { answers: evaluate(cat, golden('case-04')).session.answers, cart: ['react-vite'] });
    const m = mapModel(r, { focus: 'slot.store' });
    expect(m.nodes.find((n) => n.id === 'slot.screen')?.state).toBe('picked');
    expect(m.nodes.find((n) => n.id === 'slot.store')?.state).toBe('open');
    expect(m.nodes.find((n) => n.id === 'slot.host')?.state).toBe('ghost');
    expect(m.roads.find((x) => x.to === 'slot.screen')?.state).toBe('built');
    expect(m.roads.find((x) => x.to === 'slot.store')?.state).toBe('ghost');
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
    const m9 = mapModel(evaluate(cat, golden('case-09')));
    expect(m9.tunnel?.ghost).toBe(true);
    expect(mapModel(evaluate(cat, golden('case-11'))).tunnel).toBeNull();
  });

  it('마디 수가 늘어도 출발·빈 터는 제자리이고, 마디 자리는 마디 수마다 정해져 있다', () => {
    const places = new Set<string>();
    for (let n = 1; n <= 6; n += 1) {
      const shapes = (['screen', 'store', 'auth', 'data', 'notify', 'host'] as NodeShape[]).slice(0, n);
      const m = layoutMap({ nodes: shapes.map((s) => node(s)) });
      places.add(JSON.stringify([m.start.x, m.start.y, m.lot.x, m.lot.y]));
      expect(m.nodes).toHaveLength(n);
    }
    expect(places.size).toBe(1);
  });
});

describe('차', () => {
  const answers = evaluate(cat, golden('case-04')).session.answers;

  it('아무것도 고르지 않았으면 출발에', () => {
    const m = mapModel(evaluate(cat, { answers }));
    expect(m.car.at).toBe('start');
    expect(m.car.dist).toBe(0);
    expect([m.car.x, m.car.y]).toEqual([m.start.x, m.start.y]);
  });

  it('출발부터 이어서 고른 마지막 마디에 선다 (중간이 비면 그 앞에서 멈춘다)', () => {
    const r = evaluate(cat, { answers, cart: ['react-vite', 'cloudflare-workers'] });
    const m = mapModel(r);
    expect(m.car.at).toBe('slot.screen');
    const screen = m.nodes.find((n) => n.id === 'slot.screen');
    expect([m.car.x, m.car.y]).toEqual([screen?.x, screen?.y]);
    expect(m.car.dist).toBe(screen?.dist);
    expect(screen?.passed).toBe(true);
    expect(m.nodes.find((n) => n.id === 'slot.host')?.passed).toBe(false);
  });

  it('다 고르면 마지막 마디에, 도착하면 빈 터 앞에 선다', () => {
    const r = evaluate(cat, golden('case-19'));
    const m = mapModel(r);
    const last = m.nodes[m.nodes.length - 1];
    expect(m.car.at).toBe(last?.id);
    const a = mapModel(r, { arrived: true });
    expect(a.car.at).toBe('lot');
    expect(a.car.dist).toBeCloseTo(a.routeLength - 16, 1);
    expect(Math.hypot(a.car.x - a.lot.entry.x, a.car.y - a.lot.entry.y)).toBe(16);
    expect(a.lot.state).toBe('drawn');
    expect(a.nodes.every((n) => n.passed)).toBe(true);
    expect(a.roads.filter((x) => x.kind === 'main').every((x) => x.state === 'built')).toBe(true);
  });

  it('마디 거리는 길 순서대로 늘어난다', () => {
    const m = mapModel(evaluate(cat, golden('case-19')));
    const d = m.nodes.map((n) => n.dist);
    expect([...d].sort((a, b) => a - b)).toEqual(d);
    expect(d[0]).toBeGreaterThan(0);
    expect(d[d.length - 1]).toBeLessThan(m.routeLength);
  });
});

describe('빈 터, 집, 팔레트, 요약 글', () => {
  it('앱 종류를 정하기 전에는 빈 터만, 정하면 윤곽 + 종류 이름', () => {
    const empty = mapModel(evaluate(cat, {}));
    expect(empty.lot.state).toBe('empty');
    expect(empty.lot.type).toBeNull();
    expect(empty.lot.label.text).toBe(ko.map.destination);
    expect(empty.start.label.text).toBe(ko.map.start);
    expect(empty.summary.startsWith(ko.map.summary.noDestination)).toBe(true);
    const form = mapModel(evaluate(cat, { answers: { 'q.type': 'form' } }));
    expect(form.lot.state).toBe('outline');
    expect(form.lot.type).toBe('form');
    expect(form.lot.label.text).toBe(data.questions.questions[0]?.options.find((o) => o.id === 'form')?.label);
    const unknown = mapModel(evaluate(cat, { answers: { 'q.type': 'unknown' } }));
    expect(unknown.lot.type).toBe('unknown');
    expect(unknown.lot.label.text).toBe(ko.map.destination);
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

  it('요약 글: 목적지 이름 · 꼭 고를 것 · 막힌 곳 (MAP.md 4절의 본보기 꼴)', () => {
    const trip = data.recipes.recipes.find((x) => x.id === 'trip-form');
    if (!trip) throw new Error('trip-form 없음');
    const base: Partial<Session> = { answers: trip.answers, cart: trip.cart, kept: [], freeText: '체험학습 신청서' };
    const r: EngineResult = evaluate(cat, base);
    const required = r.slots.filter((s) => s.slot.required).length;
    const picked = r.slots.filter((s) => s.slot.required && s.filledBy.length > 0).length;
    expect(mapModel(r, { traffic: true }).summary).toBe(`목적지 체험학습 신청서. 꼭 고를 것 ${required}개 중 ${picked}개 골랐어요. 막힌 곳 1개.`);
    const kept = evaluate(cat, { ...base, kept: ['conflict.personal-server'] });
    expect(mapModel(kept, { traffic: true }).summary).toBe(`목적지 체험학습 신청서. 꼭 고를 것 ${required}개 중 ${picked}개 골랐어요. 그대로 가는 곳 1개.`);
    expect(mapModel(kept, { arrived: true }).summary).toBe(
      `목적지 체험학습 신청서. ${ko.map.summary.arrived} 꼭 고를 것 ${required}개 중 ${picked}개 골랐어요.`,
    );
    // 한 줄 입력이 없으면 앱 종류 이름
    const noText = mapModel(evaluate(cat, { answers: trip.answers, cart: trip.cart }));
    expect(noText.summary.startsWith(fill(ko.map.summary.destination, { name: noText.lot.label.text }))).toBe(true);
    // 막힌 곳이 없으면 원활
    expect(mapModel(evaluate(cat, golden('case-01')), { traffic: true }).summary.endsWith(ko.map.summary.clear)).toBe(true);
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
