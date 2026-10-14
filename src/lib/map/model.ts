// 길 지도 모형 (docs/MAP.md 4절, CONCEPT 5.5·6.3~6.6·7·9(a)).
// evaluate() 결과를 읽어 출발 → 마디 → 빈 터의 자리, 길, 굴, 차, 이름표, 표지를 계산한다. 화면(MapBoard)은 이 결과만 그린다.
// 순수 함수: DOM·저장소·시각·난수 없음. 같은 입력이면 늘 같은 출력이다.
//
// 배치: 길은 한 벌로 고정이다 (PATH). 마디 수(0~6)마다 이 길 위의 어느 자리에 마디를 둘지만 손으로 정했다 (LAYOUTS).
// 그래서 답이 늘어도 출발·빈 터·집은 제자리다. 자리 잡는 차례는 굴 → 차 → 이름표 → 표지이고, 뒤의 것이 앞의 것을 비킨다.
// 굴은 마디 배치만 보고 앉으므로 차가 움직여도 제자리다.
import { ko } from '../../copy/ko.ts';
import type { EngineResult } from '../engine/index.ts';
import { fill } from '../engine/index.ts';
import { progress } from '../progress.ts';

export interface Pt {
  x: number;
  y: number;
}

/** 왼쪽 위 (x, y)와 너비·높이. 지도 세계 단위 (viewBox 0 0 432 240) */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type NodeShape = 'screen' | 'store' | 'auth' | 'data' | 'notify' | 'host';
/** open = 지금 여는 칸인데 아직 고르지 않음. 골랐으면 picked이고 고리는 MapModel.focus가 따로 낸다 */
export type NodeState = 'ghost' | 'open' | 'picked' | 'later' | 'jam' | 'slow';
export type RoadState = 'ghost' | 'built' | 'jam' | 'slow' | 'later';
export type MarkerKind = 'toll' | 'gap' | 'lock' | 'globe' | 'alert' | 'question';
/** 빈 터 청사진 종류: 앱 종류 보기 id. custom = 직접 쓴 앱(점선 틀 + 연필), unknown = 아직 안 정함(X 틀) */
export type LotType = 'record' | 'form' | 'page' | 'quiz' | 'tool' | 'board' | 'custom' | 'unknown';
/** 맨땅(앱 종류를 아직 모름) / 파란 점선 청사진 / 실선 청사진(도착) */
export type LotState = 'bare' | 'outline' | 'drawn';
export type Palette = 'clean' | 'cute' | 'calm' | 'bold';
/** 표지 묶음의 mk-house-1 / mk-house-3 / mk-house-many */
export type HouseKind = '1' | '3' | 'many';
/** SVG text-anchor. 세로 기준은 가운데 (dominant-baseline: central) */
export type LabelAnchor = 'start' | 'middle' | 'end';

export interface MapLabel {
  text: string;
  /** 글자를 놓는 점: x는 anchor 기준, y는 글줄 가운데 */
  x: number;
  y: number;
  anchor: LabelAnchor;
  box: Box;
}

export interface MapNode {
  /** 칸 id (slot.*) */
  id: string;
  shape: NodeShape;
  state: NodeState;
  /** 마디 가운데. 나중으로 미룬 마디는 가지 끝 */
  x: number;
  y: number;
  /** 본선 위 자리. 나중으로 미룬 마디는 여기서 가지가 갈라진다 */
  main: Pt;
  label: MapLabel;
  /** 학생 정보를 받는 저장 마디 둘레의 빗금 고리 (mk-hatch-ring 44×44를 가운데에) */
  hatch: boolean;
  /** 차가 지나온 고른 마디 (도착 장면의 ✓) */
  passed: boolean;
  /** routeD 위에서 본선 자리까지의 거리 (offset-distance) */
  dist: number;
  /** 나중으로 미룬 마디의 공사 고깔 가운데 (가지 위) */
  cone?: Pt;
  box: Box;
}

export interface MapRoad {
  /** 'start>slot.screen', 'slot.host>lot', 가지는 'later:slot.auth' */
  id: string;
  from: string;
  to: string;
  kind: 'main' | 'spur';
  state: RoadState;
  /** 45°·90° 꺾은선을 반지름 12로 둥글린 길 */
  d: string;
  /** d를 만든 꺾은선 (꼭짓점은 24px 격자의 반 칸인 12 단위 위) */
  points: Pt[];
}

export interface MapMarker {
  /** 막힌 곳 id. '길 전체' 표지는 'whole-route' */
  id: string;
  kind: MarkerKind;
  x: number;
  y: number;
  /** 붙은 마디(칸 id). '길 전체'면 null (출발 고리 오른쪽 위 귀퉁이에 붙는다) */
  anchor: string | null;
  /** 이 표지에 모인 막힌 곳 수 ('길 전체'에 여럿이 모일 때 화면에 숫자로) */
  count: number;
  /** 개수 동그라미(반지름 7)의 가운데. count가 1이면 null */
  countAt: Pt | null;
  conflicts: string[];
  /** 표지 20×20 + 개수 동그라미 */
  box: Box;
}

export interface MapTunnel {
  /** 둔덕 가운데 */
  x: number;
  y: number;
  /** 0 = 가로 길(mk-tunnel 32×20), 90 = 세로 길(mk-tunnel-v 20×32). 돌리지 않는다 */
  angle: 0 | 90;
  /** 중간 서버가 필요한데 아직 고르지 않음 (점선 굴) */
  ghost: boolean;
  /** 굴 표지(mk-tunnel-sign 16×16)의 가운데. 길 방향과 상관없이 똑바로 세운다 */
  sign: Pt;
  /** 둔덕 + 굴 표지 */
  box: Box;
}

export interface MapCar {
  /** 차 가운데. routeD 위 dist 자리 그대로라 offset-path로 옮겨도 같은 곳에 선다 */
  x: number;
  y: number;
  /** 도 단위, 0 = 오른쪽(+x), 90 = 아래. 그 자리의 길 방향 (offset-rotate: auto와 같다) */
  angle: number;
  /** routeD 위 거리 */
  dist: number;
  /** 'start' | 칸 id | 'lot' */
  at: string;
  /** 돌린 차(36×18)를 감싸는 상자 */
  box: Box;
}

export interface MapModel {
  width: number;
  height: number;
  palette: Palette;
  traffic: boolean;
  arrived: boolean;
  start: { x: number; y: number; box: Box; label: MapLabel };
  lot: {
    x: number;
    y: number;
    box: Box;
    type: LotType | null;
    state: LotState;
    label: MapLabel;
    /** 깃발 그림(16×24)의 왼쪽 위. 밑동 (12, 22)이 빈 터 왼쪽 위 말뚝에 꽂힌다 */
    flag: Pt;
    flagBox: Box;
    /** 길이 빈 터에 닿는 점 (routeD의 끝) */
    entry: Pt;
  };
  houses: { kind: HouseKind; box: Box } | null;
  tunnel: MapTunnel | null;
  nodes: MapNode[];
  roads: MapRoad[];
  /** 출발부터 빈 터까지 본선 전체 (차의 offset-path) */
  routeD: string;
  routeLength: number;
  markers: MapMarker[];
  car: MapCar;
  /** 지금 여는 칸의 고리 (선 굵기 3, 마디 상자 안에 든다). 없으면 null */
  focus: { id: string; x: number; y: number; r: number } | null;
  /** 기호 수: 마디 + 출발 + 빈 터 + 집 + 굴 + 표지 (12 이하) */
  symbols: number;
  /** role="img"에 붙일 한 문장 */
  summary: string;
}

/** layoutMap에 넣는 마디 하나. 마디 상태는 layoutMap이 정한다 */
export interface MapInputNode {
  id: string;
  shape: NodeShape;
  label: string;
  /** 도구를 골랐다 */
  filled: boolean;
  /** 나중으로 미뤘다 */
  later?: boolean;
  /** 지금 여는 마디 (도구 고르기의 focus) */
  open?: boolean;
  /** 교통 정보: 풀지 않은 막힌 곳(jam) / 그대로 가기로 둔 막힌 곳(slow). input.traffic일 때만 쓴다 */
  traffic?: 'jam' | 'slow' | null;
  hatch?: boolean;
}

export interface MapInputConflict {
  id: string;
  kind: MarkerKind;
  /** 붙일 칸 id. 없으면 '길 전체' */
  anchor: string | null;
}

export interface MapInput {
  nodes: MapInputNode[];
  /** 지도에 표지로 그릴 막힌 곳 (그대로 둔 것은 kind 'question') */
  conflicts?: MapInputConflict[];
  traffic?: boolean;
  arrived?: boolean;
  /** 홈 본보기 (brief 6.3): 길은 고른 대로 그리고 차만 출발 위에 세운다. 도착(arrived)보다 앞선다 */
  parked?: boolean;
  lot?: { type: LotType | null; label: string };
  houses?: HouseKind | null;
  tunnel?: 'open' | 'ghost' | null;
  palette?: Palette;
  summary?: string;
}

// ---------------------------------------------------------------- 치수

export const MAP_WORLD = { w: 432, h: 240 } as const;
/** 어느 띠 높이에서도 잘리지 않는 구역 (MAP.md 1절) */
export const MAP_SAFE = { x0: 60, y0: 32, x1: 372, y1: 208 } as const;
export const MAP_GRID = 12;
export const MAP_MAX_SYMBOLS = 12;
/** 차 그림(mk-car-top, 앞이 +x)의 길이·폭 */
export const MAP_CAR = { l: 36, w: 18 } as const;
/** 차가 마디·출발·빈 터·굴 상자와 띄우는 거리 */
export const MAP_CAR_GAP = 4;

const FONT = 17;
const LABEL_H = FONT * 1.2;
const LABEL_GAP = 2;
/** 이름표·표지·굴을 다른 물건과 띄우는 거리 (이름표 땅색 테두리 3의 절반쯤) */
const OBJECT_GAP = 2;
/** 이름표끼리 옆으로 띄우는 거리: 한 줄에 나란한 두 이름이 한 낱말처럼 붙어 읽히지 않게. 위아래로는 OBJECT_GAP이면 된다 */
const LABEL_SPACE = 6;
const RADIUS = 12;
/** 마디(28)와 지금 여는 곳 고리(반지름 16, 선 3)를 품는 반쪽 */
const NODE_HALF = 16;
const FOCUS_R = 16;
const START_HALF = 14;
const MARKER = 20;
const CONE = 16;
const TUNNEL_LONG = 32;
const TUNNEL_SHORT = 20;
const SIGN = 16;
const SPUR = 36;
/** 내 길 바깥 선(8)의 반쪽 */
const ROAD_HALF = 4;
/** 개수 동그라미: 표지 가운데에서 (10, 9), 반지름 7 */
const COUNT_AT: Pt = { x: 10, y: 9 };
const COUNT_R = 7;
/** '길 전체' 표지: 출발 고리 오른쪽 위 귀퉁이 (막히면 오른쪽 아래, 그다음 출발 오른쪽 빈 땅) */
const WHOLE_AT: Pt[] = [
  { x: 12, y: -12 },
  { x: 12, y: 12 },
  { x: 36, y: 0 },
];
/** 마디에 선 차: 마디 반쪽 + 띄움 + 차 길이의 반 (앞 마디·뒤 마디 모두에서) */
const CAR_CLEAR = NODE_HALF + MAP_CAR_GAP + MAP_CAR.l / 2;
/** 출발에 선 차: 출발 위로 올라가는 길에서, '길 전체' 표지 위 끝(출발 가운데에서 22)과 띄운다. 출발 고리는 덮지 않는다 */
const CAR_START = -(WHOLE_AT[0]?.y ?? 0) + MARKER / 2 + MAP_CAR_GAP + MAP_CAR.l / 2;

const START: Pt = { x: 84, y: 168 };
const LOT_C: Pt = { x: 336, y: 84 };
const LOT_W = 72;
const LOT_H = 56;
const LOT_BOX: Box = { x: LOT_C.x - LOT_W / 2, y: LOT_C.y - LOT_H / 2, w: LOT_W, h: LOT_H };
/** 길 끝: 빈 터 아래 가장자리(112)에서 4 들어간 격자 점. 빈 터가 길 위에 그려져 끝이 가려진다 */
const ENTRY: Pt = { x: LOT_C.x, y: 108 };
/** 도착한 차: 앞이 빈 터 가장자리에서 띄움만큼 떨어지게 길 끝에서 이만큼 뒤 */
const CAR_STOP = LOT_BOX.y + LOT_H - ENTRY.y + MAP_CAR_GAP + MAP_CAR.l / 2;
/** 깃발(16×24) 밑동 (12, 22)을 빈 터 왼쪽 위 말뚝 (6, 6)에 꽂는다 (MAP.md 3절) */
const FLAG_BOX: Box = { x: LOT_BOX.x + 6 - 12, y: LOT_BOX.y + 6 - 22, w: 16, h: 24 };
const HOUSE_SIZE: Record<HouseKind, Pt> = { '1': { x: 24, y: 24 }, '3': { x: 40, y: 32 }, many: { x: 56, y: 40 } };
/** 집은 깃발 왼쪽(위 오른쪽 굽는 곳을 도는 차와 띄움을 남기게 깃발에 붙여), 가운데 높이 80 */
const HOUSE_RIGHT = FLAG_BOX.x - OBJECT_GAP;
const HOUSE_CY = 80;

/** 고정 길: 출발 → 왼쪽 세로 → 위 줄(y 72) → 가운데 세로(x 216) → 아래 줄(y 168) → 오른쪽 세로 → 빈 터 아래 가장자리 */
const PATH: Pt[] = [START, { x: 84, y: 72 }, { x: 216, y: 72 }, { x: 216, y: 168 }, { x: 336, y: 168 }, ENTRY];

/**
 * 마디 수별 자리 [x, y] (칸 순서 그대로). 모두 굽는 곳의 둥글림(12) 밖, 곧은 길 위의 격자 점이다.
 * 왼쪽 세로에는 두지 않는다: 출발에 선 차의 자리다. 마디 4개까지는 차가 어느 마디에 서도 앞이나 뒤에 한 대 자리가 있고,
 * 5·6개는 촘촘한 두 마디 사이에서 차가 한 마디 뒤에 남는다. 시험(tests/lib/map.test.ts)의 기능 조합·상태를 모두
 * 겹침 없이 통과하는 자리 가운데, 고를 때마다 차가 앞으로 가는 횟수가 많고 마디 사이가 고른 것을 골랐다 (D68).
 */
const LAYOUTS: [number, number][][] = [
  [],
  [[156, 72]],
  [[156, 72], [252, 168]],
  [[120, 72], [216, 96], [300, 168]],
  [[108, 72], [180, 72], [216, 144], [300, 168]],
  [[108, 72], [180, 72], [216, 132], [252, 168], [300, 168]],
  [[108, 72], [180, 72], [216, 132], [228, 168], [264, 168], [300, 168]],
];

type Axis = 'top' | 'bottom' | 'mid';
type Side = 'above' | 'below' | 'left' | 'right';
/** 표지 자리: 네 귀퉁이, 그다음 길과 직각인 두 변 가운데 (t·b·l·r) */
type Corner = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
interface AxisRule {
  /** 나중으로 미룬 마디가 비켜나는 쪽 */
  spur: Pt;
  label: Side[];
  spurLabel: Side[];
  /** 표지(사고 표시)를 붙일 자리 순서: 이름표 반대쪽 귀퉁이 먼저 */
  badge: Corner[];
}
const AXIS: Record<Axis, AxisRule> = {
  top: { spur: { x: 0, y: SPUR }, label: ['above', 'below', 'right', 'left'], spurLabel: ['right', 'left', 'below', 'above'], badge: ['br', 'bl', 'tr', 'tl', 'b', 't'] },
  bottom: { spur: { x: 0, y: -SPUR }, label: ['below', 'above', 'right', 'left'], spurLabel: ['right', 'left', 'above', 'below'], badge: ['tr', 'tl', 'br', 'bl', 't', 'b'] },
  // 가운데 세로 마디의 이름표와 나중 가지는 ∩ 안쪽(왼쪽)으로: 오른쪽 ∪ 안쪽은 집과 아래 줄의 나중 가지가 쓴다
  mid: { spur: { x: -SPUR, y: 0 }, label: ['left', 'right', 'above', 'below'], spurLabel: ['above', 'below', 'left', 'right'], badge: ['tr', 'br', 'tl', 'bl', 'r', 'l'] },
};
const axisOf = (p: Pt): Axis => (p.y === 72 ? 'top' : p.y === 168 ? 'bottom' : 'mid');
const CORNER: Record<Corner, Pt> = {
  tl: { x: -14, y: -14 },
  tr: { x: 14, y: -14 },
  bl: { x: -14, y: 14 },
  br: { x: 14, y: 14 },
  t: { x: 0, y: -18 },
  b: { x: 0, y: 18 },
  l: { x: -18, y: 0 },
  r: { x: 18, y: 0 },
};

// ---------------------------------------------------------------- 작은 도우미

const r2 = (n: number): number => Math.round(n * 100) / 100;
const fmt = (n: number): string => String(r2(n));
const boxAround = (c: Pt, w: number, h: number): Box => ({ x: c.x - w / 2, y: c.y - h / 2, w, h });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const same = (a: Pt, b: Pt): boolean => a.x === b.x && a.y === b.y;
const roundBox = (b: Box): Box => ({ x: r2(b.x), y: r2(b.y), w: r2(b.w), h: r2(b.h) });
function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}
/** 곧은 길 한 토막을 바깥 선 굵기까지 감싼 상자 */
const pieceBox = (a: Pt, b: Pt): Box => ({
  x: Math.min(a.x, b.x) - ROAD_HALF,
  y: Math.min(a.y, b.y) - ROAD_HALF,
  w: Math.abs(b.x - a.x) + 2 * ROAD_HALF,
  h: Math.abs(b.y - a.y) + 2 * ROAD_HALF,
});

export function overlaps(a: Box, b: Box, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

/** 한글(자모 U+1100부터)은 글자 크기만큼, 그 밖(숫자·영문·가운뎃점·띄어쓰기)은 0.6배로 어림한다 */
export function textWidth(text: string, size = FONT): number {
  let w = 0;
  for (const ch of text) w += (ch.codePointAt(0) ?? 0) >= 0x1100 ? size : size * 0.6;
  return w;
}

/** 이름표 상자 어림: at은 글자를 놓는 점(x는 place 기준, y는 글줄 가운데), 글자 크기 17, 높이 1.2배 */
export function labelBox(text: string, at: Pt, place: LabelAnchor): Box {
  const w = textWidth(text);
  const x = place === 'start' ? at.x : place === 'end' ? at.x - w : at.x - w / 2;
  return { x, y: at.y - LABEL_H / 2, w, h: LABEL_H };
}

// ---------------------------------------------------------------- 길 그리기

function unit(a: Pt, b: Pt): Pt {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return len === 0 ? { x: 0, y: 0 } : { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/** 같은 점과 한 줄 위의 가운데 점을 뺀다 */
function simplify(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const a = out[out.length - 2];
    const b = out[out.length - 1];
    if (b && same(b, p)) continue;
    const u = a && b ? unit(a, b) : null;
    const v = b ? unit(b, p) : null;
    if (u && v && Math.abs(u.x - v.x) < 1e-9 && Math.abs(u.y - v.y) < 1e-9) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

/** 둥글린 길의 한 조각: 곧은 선(c 없음) 또는 반지름 12의 호(가운데 c, 도는 쪽 s: 1 = 화면에서 시계 방향) */
interface Seg {
  a: Pt;
  /** 시작 방향 (단위) */
  u: Pt;
  l: number;
  c?: Pt;
  s?: number;
}

interface Traced {
  d: string;
  length: number;
  segs: Seg[];
}

/** 꺾은선을 반지름 12로 둥글린 SVG 길, 그 길이, 거리로 점을 찾을 조각들 */
function trace(raw: Pt[]): Traced {
  const pts = simplify(raw);
  let cur = pts[0] ?? START;
  const parts = [`M${fmt(cur.x)} ${fmt(cur.y)}`];
  const segs: Seg[] = [];
  const line = (to: Pt): void => {
    segs.push({ a: cur, u: unit(cur, to), l: Math.hypot(to.x - cur.x, to.y - cur.y) });
    parts.push(`L${fmt(to.x)} ${fmt(to.y)}`);
    cur = to;
  };
  for (let i = 1; i + 1 < pts.length; i += 1) {
    const [prev, p, next] = [pts[i - 1] ?? cur, pts[i] ?? cur, pts[i + 1] ?? cur];
    const u = unit(prev, p);
    const v = unit(p, next);
    const turn = Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y)));
    const t = RADIUS * Math.tan(turn / 2);
    const s = u.x * v.y - u.y * v.x > 0 ? 1 : -1;
    line({ x: p.x - u.x * t, y: p.y - u.y * t });
    const out = { x: p.x + v.x * t, y: p.y + v.y * t };
    segs.push({ a: cur, u, l: RADIUS * turn, c: { x: cur.x - s * u.y * RADIUS, y: cur.y + s * u.x * RADIUS }, s });
    parts.push(`A${RADIUS} ${RADIUS} 0 0 ${s > 0 ? 1 : 0} ${fmt(out.x)} ${fmt(out.y)}`);
    cur = out;
  }
  const last = pts[pts.length - 1];
  if (last && pts.length > 1) line(last);
  return { d: parts.join(''), length: segs.reduce((n, g) => n + g.l, 0), segs };
}

/** 길 위 거리 d의 점과 그 자리의 방향(도). CSS offset-distance + offset-rotate: auto와 같은 값이다 */
function poseAt(path: Traced, d: number): Pt & { angle: number } {
  let left = Math.max(0, d);
  let seg = path.segs[0];
  for (const g of path.segs) {
    seg = g;
    if (left <= g.l) break;
    left -= g.l;
  }
  if (!seg) return { ...START, angle: -90 };
  left = Math.min(left, seg.l);
  let h = seg.u;
  let p: Pt = { x: seg.a.x + h.x * left, y: seg.a.y + h.y * left };
  if (seg.c && seg.s) {
    const f = (seg.s * left) / RADIUS;
    h = { x: seg.u.x * Math.cos(f) - seg.u.y * Math.sin(f), y: seg.u.x * Math.sin(f) + seg.u.y * Math.cos(f) };
    p = { x: seg.c.x + seg.s * h.y * RADIUS, y: seg.c.y - seg.s * h.x * RADIUS };
  }
  return { ...p, angle: (Math.atan2(h.y, h.x) * 180) / Math.PI };
}

/** 고정 길에 본선 점(출발, 마디 자리, 빈 터)을 끼운 꺾은선과 점마다의 꺾은선 위 번호 */
function threadMain(mains: Pt[]): { line: Pt[]; at: number[] } {
  const line: Pt[] = [];
  const at: number[] = [];
  let k = 0;
  PATH.forEach((a, i) => {
    if (!line.length || !same(line[line.length - 1] ?? a, a)) line.push(a);
    const b = PATH[i + 1];
    // 이 토막 위에 놓인 본선 점을 차례로 끼운다
    for (let m = mains[k]; m; m = mains[k]) {
      if (same(m, a)) at.push(line.length - 1);
      else if (b && !same(m, b) && onPiece(m, a, b)) at.push(line.push(m) - 1);
      else break;
      k += 1;
    }
  });
  return { line, at };
}

function onPiece(p: Pt, a: Pt, b: Pt): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  return Math.abs(cross) < 1e-9 && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
}

// ---------------------------------------------------------------- 자리 고르기

interface Cand {
  at: Pt;
  anchor: LabelAnchor;
}

const NEAR = [0, 6, -6, 12, -12];
const FAR = [18, -18, 24, -24, 30, -30, 36, -36, 42, -42, 48, -48, 54, -54, 60, -60];

/** 물건(가운데 c, 반쪽 hw·hh) 둘레의 이름표 자리 후보. 위·아래는 물건과 가로로 겹치게만 민다 */
function sideCands(c: Pt, hw: number, hh: number, w: number, side: Side, shifts: number[]): Cand[] {
  const out: Cand[] = [];
  const vertical = side === 'above' || side === 'below';
  for (const s of shifts) {
    if (Math.abs(s) > (vertical ? w / 2 + hw - 6 : hh)) continue;
    if (vertical) out.push({ at: { x: c.x + s, y: c.y + (side === 'above' ? -1 : 1) * (hh + LABEL_GAP + LABEL_H / 2) }, anchor: 'middle' });
    else out.push({ at: { x: c.x + (side === 'right' ? 1 : -1) * (hw + LABEL_GAP), y: c.y + s }, anchor: side === 'right' ? 'start' : 'end' });
  }
  return out;
}

function labelCands(c: Pt, hw: number, hh: number, w: number, sides: Side[]): Cand[] {
  const [first, second, ...rest] = sides;
  const near = (s: Side | undefined, shifts: number[]): Cand[] => (s ? sideCands(c, hw, hh, w, s, shifts) : []);
  return [...near(first, NEAR), ...near(second, NEAR), ...near(first, FAR), ...near(second, FAR), ...rest.flatMap((s) => near(s, [...NEAR, ...FAR]))];
}

interface Blocker {
  box: Box;
  /** 이만큼 띄워야 겹치지 않은 것으로 본다 (가로, 세로) */
  gx: number;
  gy: number;
}

const solidOf = (boxes: Box[], gap = OBJECT_GAP): Blocker[] => boxes.map((box) => ({ box, gx: gap, gy: gap }));

/** 후보 중 안전 구역 안에서 아무것과도 겹치지 않는 첫 자리. 없으면 겹친 넓이가 가장 적은 자리 (clean: false) */
function pick<T>(cands: T[], boxOf: (c: T) => Box, blockers: Blocker[]): { value: T; clean: boolean } | null {
  let best: { value: T; cost: number } | null = null;
  for (const c of cands) {
    const b = boxOf(c);
    let cost = b.x >= MAP_SAFE.x0 && b.y >= MAP_SAFE.y0 && b.x + b.w <= MAP_SAFE.x1 && b.y + b.h <= MAP_SAFE.y1 ? 0 : 1e6;
    for (const o of blockers) {
      if (b.x < o.box.x + o.box.w + o.gx && o.box.x < b.x + b.w + o.gx && b.y < o.box.y + o.box.h + o.gy && o.box.y < b.y + b.h + o.gy) {
        cost += Math.max(0, Math.min(b.x + b.w, o.box.x + o.box.w) - Math.max(b.x, o.box.x)) * Math.max(0, Math.min(b.y + b.h, o.box.y + o.box.h) - Math.max(b.y, o.box.y)) + 1;
      }
    }
    if (cost === 0) return { value: c, clean: true };
    if (!best || cost < best.cost) best = { value: c, cost };
  }
  return best && { value: best.value, clean: false };
}

// ---------------------------------------------------------------- 지도 짜기

interface Work {
  id: string;
  input: MapInputNode;
  axis: Axis;
  main: Pt;
  pos: Pt;
  later: boolean;
  state: NodeState;
  box: Box;
  cone?: Pt;
}

function nodeState(n: MapInputNode, traffic: boolean): NodeState {
  if (n.later === true) return 'later';
  if (traffic && n.traffic) return n.traffic;
  if (n.filled) return 'picked';
  return n.open === true ? 'open' : 'ghost';
}

interface TunnelSpot {
  c: Pt;
  angle: 0 | 90;
  sign: Pt;
  box: Box;
}

/** 가로 굴은 둔덕 오른쪽 위 귀퉁이에, 세로 굴은 오른쪽에 표지를 세운다 */
function tunnelAt(c: Pt, angle: 0 | 90): TunnelSpot {
  const sign = angle ? { x: c.x + 14, y: c.y - 8 } : { x: c.x + 12, y: c.y - 12 };
  const mound = angle ? boxAround(c, TUNNEL_SHORT, TUNNEL_LONG) : boxAround(c, TUNNEL_LONG, TUNNEL_SHORT);
  return { c, angle, sign, box: union(mound, boxAround(sign, SIGN, SIGN)) };
}

/** 굴 자리 후보: 외부 데이터 다음 토막의 곧은 곳 → 앞 토막 → 그 뒤 토막들 → 나머지. 외부 데이터가 없으면 배포·공유 앞 토막부터 */
function tunnelSpots(work: Work[], roads: MapRoad[], segCount: number): TunnelSpot[] {
  const dataIdx = work.findIndex((w) => w.input.shape === 'data');
  const hostIdx = work.findIndex((w) => w.input.shape === 'host');
  const order: number[] = [];
  const push = (k: number): void => {
    if (k >= 0 && k < segCount && !order.includes(k)) order.push(k);
  };
  if (dataIdx >= 0) {
    push(dataIdx + 1);
    push(dataIdx);
    for (let j = dataIdx + 2; j < segCount; j += 1) push(j);
    for (let j = dataIdx - 1; j >= 0; j -= 1) push(j);
  } else {
    push(hostIdx);
    for (let j = segCount - 1; j >= 0; j -= 1) push(j);
  }
  const out: TunnelSpot[] = [];
  const half = TUNNEL_LONG / 2;
  for (const k of order) {
    const pts = roads[k]?.points ?? [];
    // 곧은 조각 (굽는 곳의 둥글림 12를 뺀 부분), 긴 것부터
    const pieces: { a: Pt; u: Pt; l: number }[] = [];
    for (let i = 0; i + 1 < pts.length; i += 1) {
      const a = pts[i] ?? START;
      const b = pts[i + 1] ?? START;
      const u = unit(a, b);
      const trimA = i > 0 ? RADIUS : 0;
      const l = Math.hypot(b.x - a.x, b.y - a.y) - trimA - (i + 2 < pts.length ? RADIUS : 0);
      pieces.push({ a: { x: a.x + u.x * trimA, y: a.y + u.y * trimA }, u, l });
    }
    pieces.sort((p, q) => q.l - p.l);
    for (const p of pieces) {
      // 굴 전체가 이 곧은 조각 안에 들도록, 가운데에서 가까운 자리부터 4씩 옮겨 본다
      for (let o = 0; p.l / 2 - o >= half; o += 4) {
        for (const at of o ? [p.l / 2 + o, p.l / 2 - o] : [p.l / 2]) {
          out.push(tunnelAt({ x: p.a.x + p.u.x * at, y: p.a.y + p.u.y * at }, p.u.y === 0 ? 0 : 90));
        }
      }
    }
  }
  return out;
}

/** 돌린 차를 감싸는 상자 (이름표·표지가 비킬 때 쓴다) */
function carBox(p: Pt & { angle: number }): Box {
  const a = (p.angle * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  return boxAround(p, MAP_CAR.l * c + MAP_CAR.w * s, MAP_CAR.l * s + MAP_CAR.w * c);
}

/**
 * 돌린 차(36×18 직사각형)가 상자에 gap보다 가까운가. 굽는 곳에서는 감싸는 상자가 실제 차보다 훨씬 커서
 * 네 축(상자의 가로·세로, 차의 앞뒤·옆)에 비춰 본다
 */
function carHits(p: Pt & { angle: number }, b: Box, gap: number): boolean {
  const a = (p.angle * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const [l, w, bw, bh] = [MAP_CAR.l / 2, MAP_CAR.w / 2, b.w / 2 + gap, b.h / 2 + gap];
  const dx = b.x + b.w / 2 - p.x;
  const dy = b.y + b.h / 2 - p.y;
  return (
    Math.abs(dx) < bw + l * Math.abs(c) + w * Math.abs(s) &&
    Math.abs(dy) < bh + l * Math.abs(s) + w * Math.abs(c) &&
    Math.abs(dx * c + dy * s) < l + bw * Math.abs(c) + bh * Math.abs(s) &&
    Math.abs(dy * c - dx * s) < w + bw * Math.abs(s) + bh * Math.abs(c)
  );
}

/** 마디 수에 맞는 배치에 마디를 앉히고 길·굴·차·이름표·표지를 계산한다. 시험이 기능 조합을 바로 넣어 볼 수 있게 나눈 안쪽 함수 */
export function layoutMap(input: MapInput): MapModel {
  const traffic = input.traffic === true;
  const parked = input.parked === true;
  const arrived = input.arrived === true && !parked;
  const nodesIn = input.nodes.slice(0, LAYOUTS.length - 1);
  const layout = LAYOUTS[nodesIn.length] ?? [];

  const work: Work[] = nodesIn.map((n, i) => {
    const [x, y] = layout[i] ?? [START.x, START.y];
    const main = { x, y };
    const axis = axisOf(main);
    const later = n.later === true;
    const spur = AXIS[axis].spur;
    const pos = later ? add(main, spur) : main;
    const w: Work = { id: n.id, input: n, axis, main, pos, later, state: nodeState(n, traffic), box: boxAround(pos, NODE_HALF * 2, NODE_HALF * 2) };
    if (later) w.cone = { x: x + Math.sign(spur.x) * 11, y: y + Math.sign(spur.y) * 11 };
    return w;
  });

  // 본선: 출발 → 마디 자리 → 빈 터
  const mains: Pt[] = [START, ...work.map((w) => w.main), ENTRY];
  const last = mains.length - 1;
  const thread = threadMain(mains);
  const route = trace(thread.line);
  const distOf = mains.map((_, k) => (k === 0 ? 0 : k === last ? route.length : trace(thread.line.slice(0, (thread.at[k] ?? 0) + 1)).length));

  // 이어서 끝난 앞부분: 고른 마디와 미룬 마디는 지나갈 수 있다
  const prefix: boolean[] = [true];
  work.forEach((w, i) => prefix.push(prefix[i] === true && (w.input.filled || w.later)));
  prefix.push(prefix[work.length] === true);

  // 길 토막
  const idOf = (k: number): string => (k === 0 ? 'start' : k === last ? 'lot' : (work[k - 1]?.id ?? ''));
  const roads: MapRoad[] = [];
  for (let k = 0; k < last; k += 1) {
    const points = simplify(thread.line.slice(thread.at[k] ?? 0, (thread.at[k + 1] ?? 0) + 1));
    const target = work[k]?.state;
    const state: RoadState = target === 'jam' || target === 'slow' ? target : prefix[k + 1] === true ? 'built' : 'ghost';
    roads.push({ id: `${idOf(k)}>${idOf(k + 1)}`, from: idOf(k), to: idOf(k + 1), kind: 'main', state, d: trace(points).d, points });
  }
  // 이름표·표지가 비킬 길 상자. 첫 토막은 출발에서 올라가는 왼쪽 세로 길이다
  const routePts = simplify(thread.line);
  const roadBoxes = routePts.slice(1).map((p, i) => pieceBox(routePts[i] ?? p, p));
  for (const w of work) {
    if (!w.later) continue;
    const points = [w.main, w.pos];
    roads.push({ id: `later:${w.id}`, from: w.id, to: w.id, kind: 'spur', state: 'later', d: trace(points).d, points });
    roadBoxes.push(pieceBox(w.main, w.pos));
  }

  // 고정된 것: 출발, 빈 터, 깃발, 집, 마디, 고깔
  const startBox = boxAround(START, START_HALF * 2, START_HALF * 2);
  const housesKind = input.houses ?? null;
  const hs = housesKind ? HOUSE_SIZE[housesKind] : null;
  const housesBox = hs ? { x: HOUSE_RIGHT - hs.x, y: HOUSE_CY - hs.y / 2, w: hs.x, h: hs.y } : null;
  const fixed: Box[] = [startBox, LOT_BOX, FLAG_BOX, ...(housesBox ? [housesBox] : []), ...work.map((w) => w.box)];
  for (const w of work) if (w.cone) fixed.push(boxAround(w.cone, CONE, CONE));

  // 차 자리: 길 위 거리 d의 점과 돌린 차 상자
  const poseOf = (d: number) => {
    const dist = r2(Math.max(0, Math.min(route.length, d)));
    const p = poseAt(route, dist);
    return { ...p, dist, box: carBox(p) };
  };
  /** 본선 점 k에 선 차가 먼저 서 보는 거리: 출발 위 / 마디 앞(다음 점과 띄울 수 있으면) 아니면 뒤 / 빈 터 앞 */
  const firstSpot = (k: number): number => {
    const d = distOf[k] ?? 0;
    if (k === 0) return CAR_START;
    if (k === last) return d - CAR_STOP;
    return (distOf[k + 1] ?? d) - d >= CAR_CLEAR + (k + 1 === last ? CAR_STOP : CAR_CLEAR) ? d + CAR_CLEAR : d - CAR_CLEAR;
  };

  // 1. 굴: 마디 배치만 보고 앉는다. 차가 먼저 서 보는 자리(본선 점마다)는 될 수 있으면 비워 두고, 그럴 수 없으면 덜 겹치는 곳에 앉아 차가 비킨다.
  //    고른 것과 상관없이 정해지므로 차가 움직여도 굴은 제자리다
  const tunnelKind = input.tunnel ?? null;
  let tunnel: MapTunnel | null = null;
  if (tunnelKind) {
    const got = pick(tunnelSpots(work, roads, last), (t) => t.box, [...solidOf(fixed), ...solidOf(mains.map((_, k) => poseOf(firstSpot(k)).box), MAP_CAR_GAP)]);
    if (got) {
      const t = got.value;
      tunnel = { x: r2(t.c.x), y: r2(t.c.y), angle: t.angle, ghost: tunnelKind === 'ghost', sign: { x: r2(t.sign.x), y: r2(t.sign.y) }, box: roundBox(t.box) };
    }
  }
  const solids = tunnel ? [...fixed, tunnel.box] : fixed;

  // 2. 차: 출발부터 이어서 끝난 마지막 점(미룬 마디의 갈림목은 건너뛴다). 막힌 마디(교통 정보)에 닿으면 그 앞에서 기다린다.
  // 첫 자리에서 앞으로, 막히면 뒤로 2씩 옮겨 빈 곳에 선다.
  // 출발부터 지금까지 점마다 차례로 자리를 잡아, 앞 점에서 선 자리보다 뒤로는 가지 않는다 (고를수록 앞으로만 간다)
  // 본보기(parked)는 출발에 선다: 이름표가 출발에 선 차를 비키도록 차부터 그 자리에 둔다
  let carK = 0;
  if (!parked) for (let k = 1; k < last && prefix[k] === true && work[k - 1]?.state !== 'jam'; k += 1) if (!work[k - 1]?.later) carK = k;
  const chain = [0, ...work.flatMap((w, i) => (i < carK && !w.later ? [i + 1] : [])), ...(arrived ? [last] : [])];
  const neighbor = (k: number, step: number): number => {
    let j = k + step;
    while (j > 0 && j < last && work[j - 1]?.later) j += step;
    return distOf[Math.max(0, Math.min(last, j))] ?? 0;
  };
  const free = (p: ReturnType<typeof poseOf>): boolean => solids.every((b) => !carHits(p, b, MAP_CAR_GAP - 0.01));
  let pose = poseOf(CAR_START);
  for (const k of chain) {
    const d0 = distOf[k] ?? 0;
    const first = firstSpot(k);
    const floor = k ? pose.dist : CAR_START;
    const dists: number[] = [];
    const scan = (from: number, to: number): void => {
      for (let d = from; from <= to ? d <= to : d >= to; d += from <= to ? 2 : -2) dists.push(d);
    };
    if (first > d0 || k === 0) scan(first, neighbor(k, 1));
    // 뒤로는 앞 점에서 선 자리까지 (마디가 촘촘하면 한 마디 뒤에 남는다). 도착은 빈 터 앞 토막 안에서만
    if (k > 0) scan(k === last ? first : d0 - CAR_CLEAR, k === last ? Math.max(floor, neighbor(k, -1)) : floor);
    // 빈 자리가 없으면 앞 점의 자리 (시험이 막는다)
    pose = dists.map(poseOf).find(free) ?? poseOf(floor);
  }
  const car: MapCar = { x: r2(pose.x), y: r2(pose.y), angle: r2(pose.angle), dist: pose.dist, at: arrived ? 'lot' : idOf(carK), box: roundBox(pose.box) };
  const moving = [...solids, car.box];

  // 3. 이름표: 출발 → 빈 터 → 마디 (길 순서). 길·굴·차를 비킨다
  const labels = new Map<string, MapLabel>();
  const taken: Blocker[] = [...solidOf(moving), ...solidOf(roadBoxes)];
  const place = (key: string, text: string, cands: Cand[], extra: Blocker[] = []): boolean => {
    const got = pick(cands, (cd) => labelBox(text, cd.at, cd.anchor), [...taken, ...extra]);
    if (extra.length && !got?.clean) return false;
    const cd = got?.value ?? { at: START, anchor: 'middle' as const };
    const box = labelBox(text, cd.at, cd.anchor);
    taken.push({ box, gx: LABEL_SPACE, gy: OBJECT_GAP });
    labels.set(key, { text, x: r2(cd.at.x), y: r2(cd.at.y), anchor: cd.anchor, box: roundBox(box) });
    return true;
  };
  place('start', ko.map.start, labelCands(START, START_HALF, START_HALF, textWidth(ko.map.start), ['below', 'above', 'right']));
  // 빈 터 이름은 위에. 깃발이 위로 솟아 있어 넓은 이름은 깃발 왼쪽에 붙인다
  const lotText = input.lot?.label ?? ko.map.destination;
  const lotW = textWidth(lotText);
  place('lot', lotText, [
    ...sideCands(LOT_C, LOT_W / 2, LOT_H / 2, lotW, 'above', NEAR),
    { at: { x: FLAG_BOX.x - OBJECT_GAP, y: LOT_BOX.y - LABEL_GAP - LABEL_H / 2 }, anchor: 'end' },
    ...labelCands(LOT_C, LOT_W / 2, LOT_H / 2, lotW, ['above', 'below']),
  ]);
  const conflicts = input.conflicts ?? [];
  /** 표지 자리 후보: 마디 귀퉁이 (이름표 반대쪽 먼저, 나중 가지는 거꾸로) */
  const corners = (w: Work): Box[] => (w.later ? AXIS[w.axis].badge.slice().reverse() : AXIS[w.axis].badge).map((k) => boxAround(add(w.pos, CORNER[k]), MARKER, MARKER));
  const nodeCands = (w: Work): Cand[] => labelCands(w.pos, NODE_HALF, NODE_HALF, textWidth(w.input.label), w.later ? AXIS[w.axis].spurLabel : AXIS[w.axis].label);
  for (const w of work) place(w.id, w.input.label, nodeCands(w));
  // 3b. 표지 하나가 붙을 마디의 귀퉁이가 모두 막혔는데 그 마디 이름표가 한몫하면(예: 마디 셋짜리 지도의 가운데 '외부 데이터'),
  //     표지 자리를 먼저 잡고 그 마디 이름표를 다시 놓아 본다. 둘 다 깨끗할 때만 바꾼다 (아니면 아래 4가 '길 전체'로 물린다)
  for (const w of work) {
    const old = labels.get(w.id);
    if (!old || conflicts.filter((c) => c.anchor === w.id).length !== 1) continue;
    const block = (skip?: Box): Blocker[] => [
      ...solidOf([...moving.filter((b) => b !== w.box), ...[...labels.values()].map((l) => l.box).filter((b) => b !== skip)]),
      ...solidOf(roadBoxes, 0),
    ];
    if (pick(corners(w), (b) => b, block())?.clean) continue;
    // 옛 이름표 자리는 taken에 남겨 둔다: 새 이름표는 그 자리도 비킨다 (깨끗하지 않으면 place가 아무것도 바꾸지 않는다)
    const mark = pick(corners(w), (b) => b, block(old.box));
    if (mark?.clean) place(w.id, w.input.label, nodeCands(w), solidOf([mark.value]));
  }
  const labelBoxes = [...labels.values()].map((l) => l.box);
  const label = (key: string): MapLabel => labels.get(key) ?? { text: '', x: 0, y: 0, anchor: 'middle', box: { x: 0, y: 0, w: 0, h: 0 } };

  // 4. 표지: 붙일 마디의 귀퉁이, 막히면 길과 직각인 변 가운데 (자기 마디와는 겹쳐도 된다). 빈 자리가 없거나 마디가 없으면 '길 전체'로
  const base = work.length + 2 + (housesBox ? 1 : 0) + (tunnel ? 1 : 0);
  const placeMarkers = (collapseAll: boolean): { markers: MapMarker[]; ok: boolean } => {
    const markers: MapMarker[] = [];
    // 표지는 제 길에 닿을 만큼 붙으므로 길과는 띄움 없이 본다
    const others = (skip: Box | null, roadsFrom: number): Blocker[] => [
      ...solidOf([...moving.filter((b) => b !== skip), ...labelBoxes, ...markers.map((m) => m.box)]),
      ...solidOf(roadBoxes.slice(roadsFrom), 0),
    ];
    let whole: MapInputConflict[] = collapseAll || base + conflicts.length > MAP_MAX_SYMBOLS ? [...conflicts] : [];
    let ok = true;
    if (!whole.length) {
      for (const c of conflicts) {
        const node = work.find((w) => w.id === c.anchor);
        const got = node && pick(corners(node), (b) => b, others(node.box, 0));
        if (!node || !got?.clean) whole.push(c);
        else markers.push({ id: c.id, kind: c.kind, x: got.value.x + MARKER / 2, y: got.value.y + MARKER / 2, anchor: node.id, count: 1, countAt: null, conflicts: [c.id], box: got.value });
      }
      if (base + markers.length + (whole.length ? 1 : 0) > MAP_MAX_SYMBOLS) {
        whole = [...conflicts];
        markers.length = 0;
      }
    }
    if (whole.length) {
      const count = whole.length;
      const shape = (p: Pt): { p: Pt; countAt: Pt | null; box: Box } => {
        const countAt = count > 1 ? add(p, COUNT_AT) : null;
        const box = boxAround(p, MARKER, MARKER);
        return { p, countAt, box: countAt ? union(box, boxAround(countAt, COUNT_R * 2, COUNT_R * 2)) : box };
      };
      // 출발 고리 귀퉁이에 붙으므로 출발과 거기서 올라가는 첫 길은 겹쳐도 된다
      const got = pick(WHOLE_AT.map((o) => shape(add(START, o))), (s) => s.box, others(startBox, 1));
      const s = got?.value ?? shape(START);
      ok = got?.clean === true;
      // 풀지 않은 막힌 곳이 하나라도 있으면 그 첫 번째의 그림, 모두 그대로 둔 것이면 물음표
      const kind = whole.find((c) => c.kind !== 'question')?.kind ?? 'question';
      markers.push({ id: 'whole-route', kind, x: s.p.x, y: s.p.y, anchor: null, count, countAt: s.countAt, conflicts: whole.map((c) => c.id), box: s.box });
    }
    return { markers, ok };
  };
  let placed = placeMarkers(false);
  if (!placed.ok && conflicts.length > 0) {
    const collapsed = placeMarkers(true);
    if (collapsed.ok) placed = collapsed;
  }
  const markers = placed.markers;

  const carMain = arrived ? last : carK;
  const nodes: MapNode[] = work.map((w, i) => {
    const n: MapNode = {
      id: w.id,
      shape: w.input.shape,
      state: w.state,
      x: w.pos.x,
      y: w.pos.y,
      main: w.main,
      label: label(w.id),
      hatch: w.input.hatch === true,
      passed: w.input.filled && !w.later && i < carMain,
      dist: r2(distOf[i + 1] ?? 0),
      box: w.box,
    };
    if (w.cone) n.cone = w.cone;
    return n;
  });
  const focused = work.find((w) => w.input.open === true);

  const lotType = input.lot?.type ?? null;
  return {
    width: MAP_WORLD.w,
    height: MAP_WORLD.h,
    palette: input.palette ?? 'clean',
    traffic,
    arrived,
    start: { x: START.x, y: START.y, box: startBox, label: label('start') },
    lot: {
      x: LOT_C.x,
      y: LOT_C.y,
      box: LOT_BOX,
      type: lotType,
      state: arrived ? 'drawn' : lotType ? 'outline' : 'bare',
      label: label('lot'),
      flag: { x: FLAG_BOX.x, y: FLAG_BOX.y },
      flagBox: FLAG_BOX,
      entry: ENTRY,
    },
    houses: housesKind && housesBox ? { kind: housesKind, box: housesBox } : null,
    tunnel,
    nodes,
    roads,
    routeD: route.d,
    routeLength: r2(route.length),
    markers,
    car,
    focus: focused ? { id: focused.id, x: focused.pos.x, y: focused.pos.y, r: FOCUS_R } : null,
    symbols: base + markers.length,
    summary: input.summary ?? '',
  };
}

// ---------------------------------------------------------------- 엔진 결과 → 지도 입력

const SHAPES: NodeShape[] = ['screen', 'store', 'auth', 'data', 'notify', 'host'];
const LOT_TYPES: LotType[] = ['record', 'form', 'page', 'quiz', 'tool', 'board', 'custom', 'unknown'];
/** 느낌 질문(q.style)의 보기 id → 지도 팔레트 */
/** 새 느낌 둘(T38)은 있는 팔레트에 잇는다: 포근하게 → cute, 오락실처럼 → bold (data/looks.json mapPalette와 같다, 시험이 본다) */
const PALETTE_OF: Record<string, Palette> = { clean: 'clean', cute: 'cute', serious: 'calm', bold: 'bold', warm: 'cute', retro: 'bold' };
/** 느낌 보기 id의 지도 팔레트 (모르면 기본). 만들 앱 정하기의 느낌 견본도 이것으로 칠한다 */
export const paletteOf = (id: string | undefined): Palette => PALETTE_OF[id ?? ''] ?? 'clean';
/** 막힌 곳 id → 사고 표시 (나머지는 alert) */
const MARKER_OF: Record<string, MarkerKind> = {
  'conflict.paid-on-free': 'toll',
  'conflict.key-in-static-page': 'lock',
  'conflict.key-on-public-host': 'lock',
  'conflict.personal-server': 'globe',
};

/** 직접 쓴 앱의 빈 터 이름표 글자 수 (input.md 5.2절): 넘으면 11자 + '…' (지도 요약 글과 같게 낱말 중간에서 끊긴 것을 보인다) */
const LOT_NOTE_MAX = 12;
/** 글자(코드 포인트) max개까지. 넘으면 max−1자 + '…' */
const cut = (text: string, max: number): string => {
  const chars = [...text];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : text;
};

/** 막힌 곳 id로 사고 표시 종류를 고른다 (MAP.md 4절) */
export function markerKind(c: { id: string; kind: 'rule' | 'empty-slot' | 'custom-tool'; kept: boolean }): MarkerKind {
  return c.kept ? 'question' : c.kind === 'empty-slot' ? 'gap' : (MARKER_OF[c.id] ?? 'alert');
}

const hasTag = (r: EngineResult, tag: string): boolean => (r.interview.tags[tag] ?? 0) >= 1;

export interface MapOptions {
  /** 지금 여는 칸 id (도구 고르기) */
  focus?: string;
  /** 도구끼리 맞춰 보기: 교통 색과 사고 표시 */
  traffic?: boolean;
  /** 도착: 차가 빈 터 앞에, 윤곽이 실선으로 */
  arrived?: boolean;
  /** 홈 본보기 (brief 6.3): 길은 그대로, 차는 출발 위에 */
  parked?: boolean;
}

/**
 * 엔진 결과를 지도로. 사고 표시는 교통 정보를 보는 도구끼리 맞춰 보기(traffic)와 설계도 받기(arrived)에서만 그린다.
 * 도구 고르기에서는 빈 마디가 곧 남은 일이라, 빈 칸마다 표시를 달면 지도가 시끄러워진다.
 */
export function mapModel(r: EngineResult, opts: MapOptions = {}): MapModel {
  const traffic = opts.traffic === true;
  const arrived = opts.arrived === true;
  const deferred = new Set(r.session.deferred);
  const students = hasTag(r, 'sensitive.students');

  const nodes: MapInputNode[] = [];
  for (const s of r.slots) {
    const shape = SHAPES.find((x) => x === s.slot.capability);
    if (!shape) continue;
    const anchored = r.conflicts.filter((c) => c.anchorSlot === s.slot.id);
    nodes.push({
      id: s.slot.id,
      shape,
      label: s.slot.label,
      filled: s.filledBy.length > 0,
      later: deferred.has(s.slot.id),
      open: opts.focus === s.slot.id,
      traffic: anchored.some((c) => !c.kept) ? 'jam' : anchored.length > 0 ? 'slow' : null,
      hatch: shape === 'store' && students,
    });
  }

  const typeAnswer = r.interview.answers['q.type'];
  const typeOption = r.interview.visible.find((q) => q.id === 'q.type')?.options.find((o) => o.id === typeAnswer);
  // 직접 쓴 앱(D74): 빈 터 이름표는 내 말 12자(넘으면 11자 + '…'). 내 말이 없으면(영수증 링크로 받음) '목적지'.
  // 빈 터에는 직접 쓴 앱의 청사진(점선 틀 + 연필)이 비친다: 고른 것이 있다는 진행을 지도가 그린다
  const note = (r.session.notes?.['q.type'] ?? '').replace(/\s+/g, ' ').trim();
  const typeLabel = typeOption?.isCustom === true ? cut(note, LOT_NOTE_MAX) || null : typeOption && typeOption.isUnknown !== true ? typeOption.label : null;
  const proxy = r.cart.some((p) => p.capabilities.includes('proxy'));

  return layoutMap({
    nodes,
    conflicts: traffic || arrived ? r.conflicts.map((c) => ({ id: c.id, kind: markerKind(c), anchor: c.anchorSlot ?? null })) : [],
    traffic,
    arrived,
    parked: opts.parked === true,
    lot: { type: LOT_TYPES.find((t) => t === typeAnswer) ?? null, label: typeLabel ?? ko.map.destination },
    houses: hasTag(r, 'audience.public') ? 'many' : hasTag(r, 'audience.few') ? '3' : hasTag(r, 'audience.me') ? '1' : null,
    tunnel: proxy ? 'open' : r.conflicts.some((c) => c.id === 'conflict.key-in-static-page') ? 'ghost' : null,
    palette: paletteOf(r.interview.answers['q.style']),
    summary: mapSummary(r, { traffic, arrived, typeLabel }),
  });
}

/**
 * role="img" 요약. 수와 말은 상태 한 줄(src/lib/status-line.ts)과 같은 progress()에서 온다:
 * "목적지 체험학습 신청서. 꼭 고를 것이 1개 남았어요. 막힌 곳이 1개 있어요." 만들 앱을 다 정하기 전에는 목적지 한 문장만.
 */
export function mapSummary(r: EngineResult, o: { traffic: boolean; arrived: boolean; typeLabel: string | null }): string {
  const S = ko.map.summary;
  // 이름 순서: 한 줄 입력 → 만들 것의 내 말 → 종류 이름 (projectName과 같다)
  const clean = (t: string | undefined): string => (t ?? '').replace(/\s+/g, ' ').trim();
  const text = clean(r.session.freeText) || clean(r.session.notes?.['q.type']);
  const name = cut(text, 31) || o.typeLabel;
  const out = name ? [fill(S.destination, { name })] : [];
  if (!r.done) return out[0] ?? S.noDestination;
  const p = progress(r, {});
  const pickable = p.requiredLeft - p.requiredNoTool;
  if (o.arrived) out.push(S.arrived);
  else out.push(pickable > 0 ? fill(S.requiredLeft, { n: pickable }) : p.requiredNoTool > 0 ? fill(S.noTool, { n: p.requiredNoTool }) : S.requiredDone);
  if (r.session.deferred.length > 0) out.push(fill(S.later, { n: r.session.deferred.length }));
  if (o.traffic) out.push(p.blocked > 0 ? fill(S.blocked, { n: p.blocked }) : S.clear);
  return out.join(' ');
}
