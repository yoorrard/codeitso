// 길 지도 모형 (docs/MAP.md 4절, CONCEPT 5.5·6.3~6.6·7·9(a)).
// evaluate() 결과를 읽어 출발 → 마디 → 빈 터의 자리, 길, 이름표, 표지, 차를 계산한다. 화면(MapBoard)은 이 결과만 그린다.
// 순수 함수: DOM·저장소·시각·난수 없음. 같은 입력이면 늘 같은 출력이다.
//
// 배치: 길은 한 벌로 고정이다. 출발(왼쪽 아래) → 왼쪽 세로 → 위 줄 → 가운데 세로 → 아래 줄 → 오른쪽 세로 → 빈 터(오른쪽 위).
// 마디 수(0~6)마다 이 길 위의 어느 자리에 마디를 둘지만 손으로 정했다 (LAYOUTS). 그래서 답이 늘어도 출발·빈 터·집은 제자리다.
import { ko } from '../../copy/ko.ts';
import type { EngineResult } from '../engine/index.ts';
import { fill } from '../engine/index.ts';

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
export type NodeState = 'ghost' | 'open' | 'picked' | 'later' | 'jam' | 'slow';
export type RoadState = 'ghost' | 'built' | 'jam' | 'slow' | 'later';
export type MarkerKind = 'toll' | 'gap' | 'lock' | 'globe' | 'alert' | 'question';
export type LotType = 'record' | 'form' | 'page' | 'quiz' | 'tool' | 'board' | 'unknown';
export type LotState = 'empty' | 'outline' | 'drawn';
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
  /** 학생 정보를 받는 저장 마디 둘레의 빗금 */
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
  /** 붙은 마디(칸 id). '길 전체'면 null */
  anchor: string | null;
  /** 이 표지에 모인 막힌 곳 수 ('길 전체'에 여럿이 모일 때 화면에 숫자로) */
  count: number;
  conflicts: string[];
  box: Box;
}

export interface MapTunnel {
  x: number;
  y: number;
  /** 0 = 가로 길, 90 = 세로 길 */
  angle: 0 | 90;
  /** 중간 서버가 필요한데 아직 고르지 않음 (점선 굴) */
  ghost: boolean;
  box: Box;
}

export interface MapCar {
  x: number;
  y: number;
  /** 도 단위, 0 = 오른쪽(+x), 90 = 아래 */
  angle: number;
  /** routeD 위 거리 */
  dist: number;
  /** 'start' | 칸 id | 'lot' */
  at: string;
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
    /** 깃발 그림(16×24)의 왼쪽 위 */
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

const FONT = 17;
const LABEL_H = FONT * 1.2;
const LABEL_GAP = 2;
/** 이름표·표지·굴을 다른 물건과 띄우는 거리 (이름표 땅색 테두리 3의 절반쯤) */
const OBJECT_GAP = 2;
/** 이름표끼리 옆으로 띄우는 거리: 한 줄에 나란한 두 이름이 한 낱말처럼 붙어 읽히지 않게. 위아래로는 OBJECT_GAP이면 된다 */
const LABEL_SPACE = 6;
const RADIUS = 12;
/** 마디(28)를 '지금 여는 곳'에서 1.15배로 키운 반쪽 (32.2 / 2) */
const NODE_HALF = 16;
const START_HALF = 14;
const MARKER = 20;
const CONE = 16;
const TUNNEL_LONG = 32;
const TUNNEL_SHORT = 20;
const SPUR = 36;
/** 도착하면 차의 앞이 빈 터 가장자리에 닿게 끝에서 이만큼 뒤에 선다 */
const CAR_STOP = 16;

const START: Pt = { x: 84, y: 168 };
const LOT_C: Pt = { x: 336, y: 84 };
const LOT_W = 72;
const LOT_H = 56;
const LOT_BOX: Box = { x: LOT_C.x - LOT_W / 2, y: LOT_C.y - LOT_H / 2, w: LOT_W, h: LOT_H };
/** 길 끝: 빈 터 아래 가장자리(112)에서 4 들어간 격자 점. 빈 터가 길 위에 그려져 끝이 가려진다 */
const ENTRY: Pt = { x: LOT_C.x, y: 108 };
const FLAG_BOX: Box = { x: LOT_BOX.x - 18, y: LOT_BOX.y, w: 16, h: 24 };
const HOUSE_SIZE: Record<HouseKind, { w: number; h: number }> = { '1': { w: 24, h: 24 }, '3': { w: 40, h: 32 }, many: { w: 56, h: 40 } };
/** 집은 깃발 왼쪽, 가운데 높이 80 */
const HOUSE_RIGHT = FLAG_BOX.x - 4;
const HOUSE_CY = 80;

/** 고정 길: 출발 → 왼쪽 세로 → 위 줄(y 72) → 가운데 세로 → 아래 줄(y 168) → 오른쪽 세로 → 빈 터 아래 가장자리 */
const PATH: Pt[] = [START, { x: 84, y: 72 }, { x: 216, y: 72 }, { x: 216, y: 168 }, { x: 336, y: 168 }, ENTRY];

type Axis = 'top' | 'bottom' | 'left' | 'mid';
interface Slot {
  at: Pt;
  axis: Axis;
}
const L: Slot = { at: { x: 84, y: 132 }, axis: 'left' };
const T1: Slot = { at: { x: 132, y: 72 }, axis: 'top' };
const TM: Slot = { at: { x: 156, y: 72 }, axis: 'top' };
const T2: Slot = { at: { x: 180, y: 72 }, axis: 'top' };
const M: Slot = { at: { x: 216, y: 120 }, axis: 'mid' };
const B1: Slot = { at: { x: 252, y: 168 }, axis: 'bottom' };
const BM: Slot = { at: { x: 276, y: 168 }, axis: 'bottom' };
const B2: Slot = { at: { x: 300, y: 168 }, axis: 'bottom' };

/**
 * 마디 수별 자리 (칸 순서 그대로). 실제로 자주 나오는 조합에서 외부 데이터 다음 토막이 길어 굴이 들어가게 골랐다:
 * 3개(화면·외부 데이터·배포) = 위 줄 끝 → 가운데 세로, 5개(화면·저장·로그인·외부 데이터·배포) = 가운데 세로 → 아래 줄.
 */
const LAYOUTS: Slot[][] = [[], [TM], [TM, BM], [T1, T2, BM], [T1, T2, B1, B2], [L, T1, T2, M, B2], [L, T1, T2, M, B1, B2]];

type Side = 'above' | 'below' | 'left' | 'right';
type Corner = 'tl' | 'tr' | 'bl' | 'br';
interface AxisRule {
  /** 나중으로 미룬 마디가 비켜나는 쪽 */
  spur: Pt;
  label: Side[];
  spurLabel: Side[];
  /** 표지(사고 표시)를 붙일 모서리 순서: 이름표 반대쪽 먼저 */
  badge: Corner[];
}
const AXIS: Record<Axis, AxisRule> = {
  top: { spur: { x: 0, y: SPUR }, label: ['above', 'below', 'right', 'left'], spurLabel: ['right', 'left', 'below', 'above'], badge: ['br', 'bl', 'tr', 'tl'] },
  bottom: { spur: { x: 0, y: -SPUR }, label: ['below', 'above', 'right', 'left'], spurLabel: ['right', 'left', 'above', 'below'], badge: ['tr', 'tl', 'br', 'bl'] },
  left: { spur: { x: SPUR, y: 0 }, label: ['right', 'left', 'above', 'below'], spurLabel: ['above', 'below', 'right', 'left'], badge: ['tl', 'bl', 'tr', 'br'] },
  // 가운데 세로 마디의 이름표는 ∩ 안쪽(왼쪽)이 먼저: 오른쪽 ∪ 안쪽과 오른쪽 세로 길은 굴과 나중 가지가 쓴다
  mid: { spur: { x: SPUR, y: 0 }, label: ['left', 'right', 'above', 'below'], spurLabel: ['above', 'below', 'right', 'left'], badge: ['tr', 'br', 'tl', 'bl'] },
};
const CORNER: Record<Corner, Pt> = { tl: { x: -14, y: -14 }, tr: { x: 14, y: -14 }, bl: { x: -14, y: 14 }, br: { x: 14, y: 14 } };
/** '길 전체' 표지 자리: 출발 오른쪽 (그 자리에는 길이 없다) */
const WHOLE_ROUTE_SPOTS: Pt[] = [
  { x: 120, y: 168 },
  { x: 120, y: 192 },
  { x: 144, y: 168 },
];

// ---------------------------------------------------------------- 작은 도우미

const r2 = (n: number): number => Math.round(n * 100) / 100;
const fmt = (n: number): string => String(r2(n));
const boxAround = (c: Pt, w: number, h: number): Box => ({ x: c.x - w / 2, y: c.y - h / 2, w, h });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const same = (a: Pt, b: Pt): boolean => a.x === b.x && a.y === b.y;
const roundBox = (b: Box): Box => ({ x: r2(b.x), y: r2(b.y), w: r2(b.w), h: r2(b.h) });

export function overlaps(a: Box, b: Box, gap = 0): boolean {
  return a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
}

function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

export function insideSafe(b: Box): boolean {
  return b.x >= MAP_SAFE.x0 && b.y >= MAP_SAFE.y0 && b.x + b.w <= MAP_SAFE.x1 && b.y + b.h <= MAP_SAFE.y1;
}

/** 한글·전각 글자는 글자 크기만큼, 그 밖(숫자·영문·가운뎃점·띄어쓰기)은 0.6배로 어림한다 */
function isWide(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0x1100 && c <= 0x11ff) ||
    (c >= 0x3130 && c <= 0x318f) ||
    (c >= 0x3000 && c <= 0x303f) ||
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0xff01 && c <= 0xff60)
  );
}

export function textWidth(text: string, size = FONT): number {
  let w = 0;
  for (const ch of text) w += isWide(ch) ? size : size * 0.6;
  return w;
}

/** 이름표 상자 어림: at은 글자를 놓는 점(x는 place 기준, y는 글줄 가운데), 글자 크기 17, 높이 1.2배 */
export function labelBox(text: string, at: Pt, place: LabelAnchor): Box {
  const w = textWidth(text);
  const x = place === 'start' ? at.x : place === 'end' ? at.x - w : at.x - w / 2;
  return { x, y: at.y - LABEL_H / 2, w, h: LABEL_H };
}

// ---------------------------------------------------------------- 길 그리기

interface Piece {
  a: Pt;
  b: Pt;
}

function unit(a: Pt, b: Pt): Pt {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  return len === 0 ? { x: 0, y: 0 } : { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/** 같은 점과 한 줄 위의 가운데 점을 뺀다 */
function simplify(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && same(last, p)) continue;
    out.push(p);
  }
  for (let i = out.length - 2; i >= 1; i -= 1) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    if (!a || !b || !c) continue;
    const u = unit(a, b);
    const v = unit(b, c);
    if (Math.abs(u.x - v.x) < 1e-9 && Math.abs(u.y - v.y) < 1e-9) out.splice(i, 1);
  }
  return out;
}

interface Rounded {
  d: string;
  length: number;
}

/** 꺾은선을 반지름 12로 둥글린 SVG 길과 그 길이 */
function roundPath(raw: Pt[]): Rounded {
  const pts = simplify(raw);
  const first = pts[0];
  if (!first) return { d: '', length: 0 };
  const parts = [`M${fmt(first.x)} ${fmt(first.y)}`];
  let length = 0;
  let cursor = first;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const prev = pts[i - 1];
    const p = pts[i];
    const next = pts[i + 1];
    if (!prev || !p || !next) continue;
    const u = unit(prev, p);
    const v = unit(p, next);
    const turn = Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y)));
    const t = RADIUS * Math.tan(turn / 2);
    const inPt = { x: p.x - u.x * t, y: p.y - u.y * t };
    const outPt = { x: p.x + v.x * t, y: p.y + v.y * t };
    const sweep = u.x * v.y - u.y * v.x > 0 ? 1 : 0;
    parts.push(`L${fmt(inPt.x)} ${fmt(inPt.y)}`);
    parts.push(`A${RADIUS} ${RADIUS} 0 0 ${sweep} ${fmt(outPt.x)} ${fmt(outPt.y)}`);
    length += Math.hypot(inPt.x - cursor.x, inPt.y - cursor.y) + RADIUS * turn;
    cursor = outPt;
  }
  const last = pts[pts.length - 1] ?? first;
  if (pts.length > 1) {
    parts.push(`L${fmt(last.x)} ${fmt(last.y)}`);
    length += Math.hypot(last.x - cursor.x, last.y - cursor.y);
  }
  return { d: parts.join(''), length };
}

function onPiece(p: Pt, a: Pt, b: Pt): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(cross) > 1e-9) return false;
  return p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
}

/** 고정 길에 본선 점(출발, 마디 자리, 빈 터)을 끼운 꺾은선과 점마다의 꺾은선 위 번호 */
function threadMain(mains: Pt[]): { line: Pt[]; at: number[] } {
  const line: Pt[] = [];
  const at: number[] = [];
  let k = 0;
  for (let i = 0; i < PATH.length; i += 1) {
    const a = PATH[i];
    if (!a) continue;
    if (line.length === 0 || !same(line[line.length - 1] ?? a, a)) line.push(a);
    const b = PATH[i + 1];
    // 이 토막 위에 놓인 본선 점을 차례로 끼운다
    while (k < mains.length) {
      const m = mains[k];
      if (!m) break;
      if (same(m, a)) {
        at.push(line.length - 1);
        k += 1;
        continue;
      }
      if (b && onPiece(m, a, b) && !same(m, b)) {
        line.push(m);
        at.push(line.length - 1);
        k += 1;
        continue;
      }
      break;
    }
  }
  return { line, at };
}

/** 꺾은선의 곧은 조각 가운데 모서리 둥글림을 뺀 부분 */
function straightPieces(line: Pt[]): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i + 1 < line.length; i += 1) {
    const a = line[i];
    const b = line[i + 1];
    if (!a || !b) continue;
    const u = unit(a, b);
    const trimA = i > 0 && !isStraightThrough(line, i) ? RADIUS : 0;
    const trimB = i + 2 < line.length && !isStraightThrough(line, i + 1) ? RADIUS : 0;
    out.push({ a: { x: a.x + u.x * trimA, y: a.y + u.y * trimA }, b: { x: b.x - u.x * trimB, y: b.y - u.y * trimB } });
  }
  return out;
}

function isStraightThrough(line: Pt[], i: number): boolean {
  const a = line[i - 1];
  const p = line[i];
  const c = line[i + 1];
  if (!a || !p || !c) return true;
  const u = unit(a, p);
  const v = unit(p, c);
  return Math.abs(u.x - v.x) < 1e-9 && Math.abs(u.y - v.y) < 1e-9;
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
  if (side === 'above' || side === 'below') {
    const y = side === 'above' ? c.y - hh - LABEL_GAP - LABEL_H / 2 : c.y + hh + LABEL_GAP + LABEL_H / 2;
    for (const dx of shifts) {
      if (Math.abs(dx) > w / 2 + hw - 6) continue;
      out.push({ at: { x: c.x + dx, y }, anchor: 'middle' });
    }
  } else {
    const x = side === 'right' ? c.x + hw + LABEL_GAP : c.x - hw - LABEL_GAP;
    for (const dy of shifts) {
      if (Math.abs(dy) > hh) continue;
      out.push({ at: { x, y: c.y + dy }, anchor: side === 'right' ? 'start' : 'end' });
    }
  }
  return out;
}

function labelCands(c: Pt, hw: number, hh: number, w: number, sides: Side[]): Cand[] {
  const [first, second, ...rest] = sides;
  const out: Cand[] = [];
  if (first) out.push(...sideCands(c, hw, hh, w, first, NEAR));
  if (second) out.push(...sideCands(c, hw, hh, w, second, NEAR));
  if (first) out.push(...sideCands(c, hw, hh, w, first, FAR));
  if (second) out.push(...sideCands(c, hw, hh, w, second, FAR));
  for (const s of rest) out.push(...sideCands(c, hw, hh, w, s, [...NEAR, ...FAR]));
  return out;
}

interface Placed<T> {
  value: T;
  clean: boolean;
}

interface Blocker {
  box: Box;
  /** 가로·세로로 이만큼 띄워야 겹치지 않은 것으로 본다 */
  gx: number;
  gy: number;
}

function blocks(a: Box, o: Blocker): boolean {
  return a.x < o.box.x + o.box.w + o.gx && o.box.x < a.x + a.w + o.gx && a.y < o.box.y + o.box.h + o.gy && o.box.y < a.y + a.h + o.gy;
}

/** 후보 중 안전 구역 안에서 아무것과도 겹치지 않는 첫 자리. 없으면 겹침이 가장 적은 자리 */
function pick<T>(cands: T[], boxOf: (c: T) => Box, blockers: Blocker[]): Placed<T> | null {
  let best: { value: T; cost: number } | null = null;
  for (const c of cands) {
    const b = boxOf(c);
    const inside = insideSafe(b);
    let cost = 0;
    for (const o of blockers) if (blocks(b, o)) cost += overlapArea(b, o.box) + 1;
    if (inside && cost === 0) return { value: c, clean: true };
    const total = cost + (inside ? 0 : 1e6);
    if (!best || total < best.cost) best = { value: c, cost: total };
  }
  return best ? { value: best.value, clean: false } : null;
}

const solidOf = (boxes: Box[]): Blocker[] => boxes.map((box) => ({ box, gx: OBJECT_GAP, gy: OBJECT_GAP }));

// ---------------------------------------------------------------- 지도 짜기

interface Work {
  id: string;
  input: MapInputNode;
  slot: Slot;
  main: Pt;
  pos: Pt;
  later: boolean;
  state: NodeState;
  box: Box;
  cone?: Pt;
}

function nodeState(n: MapInputNode, traffic: boolean): NodeState {
  if (n.later === true) return 'later';
  if (traffic && n.traffic === 'jam') return 'jam';
  if (traffic && n.traffic === 'slow') return 'slow';
  if (n.open === true) return 'open';
  if (n.filled) return 'picked';
  return 'ghost';
}

interface TunnelSpot {
  c: Pt;
  angle: 0 | 90;
}

const tunnelBox = (t: TunnelSpot): Box => (t.angle === 0 ? boxAround(t.c, TUNNEL_LONG, TUNNEL_SHORT) : boxAround(t.c, TUNNEL_SHORT, TUNNEL_LONG));

/** 굴 자리 후보: 외부 데이터 다음 토막의 곧은 곳 → 앞 토막 → 그 뒤 토막들 → 나머지. 외부 데이터가 없으면 배포·공유 앞 토막부터 */
function tunnelSpots(work: Work[], roads: MapRoad[], segCount: number): TunnelSpot[] {
  const dataIdx = work.findIndex((w) => w.input.shape === 'data');
  const hostIdx = work.findIndex((w) => w.input.shape === 'host');
  const order: number[] = [];
  const push = (k: number): void => {
    if (k >= 0 && k < segCount && !order.includes(k)) order.push(k);
  };
  if (dataIdx >= 0) {
    const k = dataIdx + 1;
    push(k);
    push(k - 1);
    for (let j = k + 1; j < segCount; j += 1) push(j);
    for (let j = k - 2; j >= 0; j -= 1) push(j);
  } else {
    if (hostIdx >= 0) push(hostIdx);
    for (let j = segCount - 1; j >= 0; j -= 1) push(j);
  }
  const out: TunnelSpot[] = [];
  const len = (p: Piece): number => Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y);
  for (const k of order) {
    const road = roads[k];
    if (!road) continue;
    const pieces = straightPieces(road.points).sort((p, q) => len(q) - len(p));
    for (const p of pieces) {
      const angle: 0 | 90 = p.a.y === p.b.y ? 0 : 90;
      const l = len(p);
      const u = unit(p.a, p.b);
      // 굴 전체가 이 곧은 조각 안에 들도록, 가운데에서 가까운 자리부터 4씩 옮겨 본다
      const half = TUNNEL_LONG / 2;
      if (l < TUNNEL_LONG) continue;
      const mid = l / 2;
      const offs: number[] = [0];
      for (let d = 4; mid - d >= half || mid + d <= l - half; d += 4) offs.push(d, -d);
      for (const o of offs) {
        const at = mid + o;
        if (at < half || at > l - half) continue;
        out.push({ c: { x: p.a.x + u.x * at, y: p.a.y + u.y * at }, angle });
      }
    }
  }
  return out;
}

/** 마디 수에 맞는 배치에 마디를 앉히고 길·이름표·표지·굴·차를 계산한다. 시험이 기능 조합을 바로 넣어 볼 수 있게 나눈 안쪽 함수 */
export function layoutMap(input: MapInput): MapModel {
  const traffic = input.traffic === true;
  const arrived = input.arrived === true;
  const nodesIn = input.nodes.slice(0, LAYOUTS.length - 1);
  const layout = LAYOUTS[nodesIn.length] ?? [];

  const work: Work[] = nodesIn.map((n, i) => {
    const slot = layout[i] ?? TM;
    const later = n.later === true;
    const pos = later ? add(slot.at, AXIS[slot.axis].spur) : slot.at;
    const w: Work = { id: n.id, input: n, slot, main: slot.at, pos, later, state: nodeState(n, traffic), box: boxAround(pos, NODE_HALF * 2, NODE_HALF * 2) };
    if (later) {
      const s = AXIS[slot.axis].spur;
      const len = Math.hypot(s.x, s.y);
      w.cone = { x: slot.at.x + (s.x / len) * 11, y: slot.at.y + (s.y / len) * 11 };
    }
    return w;
  });

  // 본선: 출발 → 마디 자리 → 빈 터
  const mains: Pt[] = [START, ...work.map((w) => w.main), ENTRY];
  const thread = threadMain(mains);
  const route = roundPath(thread.line);
  const distAt = (k: number): number => roundPath(thread.line.slice(0, (thread.at[k] ?? 0) + 1)).length;

  // 이어서 끝난 앞부분: 고른 마디와 미룬 마디는 지나갈 수 있다
  const done = work.map((w) => w.input.filled || w.later);
  const prefix: boolean[] = [true];
  for (let i = 0; i < work.length; i += 1) prefix.push((prefix[i] ?? false) && (done[i] ?? false));
  prefix.push(prefix[work.length] ?? false);

  // 길 토막
  const roads: MapRoad[] = [];
  const idOf = (k: number): string => (k === 0 ? 'start' : k === mains.length - 1 ? 'lot' : (work[k - 1]?.id ?? ''));
  for (let k = 0; k + 1 < mains.length; k += 1) {
    const from = thread.at[k] ?? 0;
    const to = thread.at[k + 1] ?? 0;
    const points = simplify(thread.line.slice(from, to + 1));
    const target = work[k];
    let state: RoadState = prefix[k + 1] === true ? 'built' : 'ghost';
    if (target && target.state === 'jam') state = 'jam';
    if (target && target.state === 'slow') state = 'slow';
    roads.push({ id: `${idOf(k)}>${idOf(k + 1)}`, from: idOf(k), to: idOf(k + 1), kind: 'main', state, d: roundPath(points).d, points });
  }
  for (const w of work) {
    if (!w.later) continue;
    const points = [w.main, w.pos];
    roads.push({ id: `later:${w.id}`, from: w.id, to: w.id, kind: 'spur', state: 'later', d: roundPath(points).d, points });
  }

  // 고정된 것: 출발, 빈 터, 깃발, 집, 마디, 고깔
  const startBox = boxAround(START, START_HALF * 2, START_HALF * 2);
  const housesKind = input.houses ?? null;
  const housesBox = housesKind
    ? { x: HOUSE_RIGHT - HOUSE_SIZE[housesKind].w, y: HOUSE_CY - HOUSE_SIZE[housesKind].h / 2, w: HOUSE_SIZE[housesKind].w, h: HOUSE_SIZE[housesKind].h }
    : null;
  const coneBoxes = work.flatMap((w) => (w.cone ? [boxAround(w.cone, CONE, CONE)] : []));
  const fixed: Box[] = [startBox, LOT_BOX, FLAG_BOX, ...(housesBox ? [housesBox] : []), ...work.map((w) => w.box), ...coneBoxes];

  const tunnelKind = input.tunnel ?? null;
  const tunnelCands = tunnelKind ? tunnelSpots(work, roads, mains.length - 1) : [];

  // 기호 수와 표지
  const base = work.length + 2 + (housesBox ? 1 : 0) + (tunnelKind ? 1 : 0);
  const conflicts = input.conflicts ?? [];
  const nodeIds = new Set(work.map((w) => w.id));

  /** 이름표 → 표지 → 굴 차례로 자리를 잡는다. 표지는 마디 네 모서리 중 빈 곳에, 굴은 길 위에서 미끄러져 빈 곳에 앉는다 */
  const placeAll = (collapseAll: boolean): { markers: MapMarker[]; labels: Map<string, MapLabel>; tunnel: MapTunnel | null; clean: boolean } => {
    let clean = true;

    // 이름표: 출발 → 빈 터 → 마디 (길 순서)
    const labels = new Map<string, MapLabel>();
    const taken: Blocker[] = solidOf(fixed);
    const place = (key: string, text: string, c: Pt, hw: number, hh: number, sides: Side[]): void => {
      const w = textWidth(text);
      const got = pick(labelCands(c, hw, hh, w, sides), (cd) => labelBox(text, cd.at, cd.anchor), taken);
      const cd = got?.value ?? { at: c, anchor: 'middle' as const };
      if (!got?.clean) clean = false;
      const box = labelBox(text, cd.at, cd.anchor);
      taken.push({ box, gx: LABEL_SPACE, gy: OBJECT_GAP });
      labels.set(key, { text, x: r2(cd.at.x), y: r2(cd.at.y), anchor: cd.anchor, box: roundBox(box) });
    };
    place('start', ko.map.start, START, START_HALF, START_HALF, ['below', 'above', 'right']);
    place('lot', input.lot?.label ?? ko.map.destination, LOT_C, LOT_W / 2, LOT_H / 2, ['above', 'below']);
    for (const w of work) {
      const rule = AXIS[w.slot.axis];
      place(w.id, w.input.label, w.pos, NODE_HALF, NODE_HALF, w.later ? rule.spurLabel : rule.label);
    }
    const labelBoxes = [...labels.values()].map((l) => l.box);

    // 표지: 붙일 마디의 모서리 (자기 마디와는 겹쳐도 된다). 빈 모서리가 없거나 마디가 없으면 '길 전체'로
    const markers: MapMarker[] = [];
    const markerBoxes: Box[] = [];
    let whole: MapInputConflict[] = [];
    if (collapseAll || base + conflicts.length > MAP_MAX_SYMBOLS) whole = [...conflicts];
    else {
      for (const c of conflicts) {
        const node = c.anchor !== null && nodeIds.has(c.anchor) ? work.find((w) => w.id === c.anchor) : undefined;
        if (!node) {
          whole.push(c);
          continue;
        }
        const rule = AXIS[node.slot.axis];
        const corners = (node.later ? rule.badge.slice().reverse() : rule.badge).map((k) => add(node.pos, CORNER[k]));
        const got = pick(corners, (p) => boxAround(p, MARKER, MARKER), solidOf([...fixed.filter((b) => b !== node.box), ...labelBoxes, ...markerBoxes]));
        if (!got || !got.clean) {
          whole.push(c);
          continue;
        }
        const box = boxAround(got.value, MARKER, MARKER);
        markerBoxes.push(box);
        markers.push({ id: c.id, kind: c.kind, x: got.value.x, y: got.value.y, anchor: node.id, count: 1, conflicts: [c.id], box });
      }
      if (base + markers.length + (whole.length > 0 ? 1 : 0) > MAP_MAX_SYMBOLS) {
        whole = [...conflicts];
        markers.length = 0;
        markerBoxes.length = 0;
      }
    }
    if (whole.length > 0) {
      const got = pick(WHOLE_ROUTE_SPOTS, (p) => boxAround(p, MARKER, MARKER), solidOf([...fixed, ...labelBoxes, ...markerBoxes]));
      const spot = got?.value ?? WHOLE_ROUTE_SPOTS[0] ?? START;
      if (!got?.clean) clean = false;
      // 풀지 않은 막힌 곳이 하나라도 있으면 그 첫 번째의 그림, 모두 그대로 둔 것이면 물음표
      const kind = whole.find((c) => c.kind !== 'question')?.kind ?? 'question';
      const box = boxAround(spot, MARKER, MARKER);
      markerBoxes.push(box);
      markers.push({ id: 'whole-route', kind, x: spot.x, y: spot.y, anchor: null, count: whole.length, conflicts: whole.map((c) => c.id), box });
    }

    let tunnel: MapTunnel | null = null;
    if (tunnelKind) {
      const got = pick(tunnelCands, tunnelBox, solidOf([...fixed, ...labelBoxes, ...markerBoxes]));
      if (got) tunnel = { x: r2(got.value.c.x), y: r2(got.value.c.y), angle: got.value.angle, ghost: tunnelKind === 'ghost', box: roundBox(tunnelBox(got.value)) };
      if (!got?.clean) clean = false;
    }
    return { markers, labels, tunnel, clean };
  };

  let placed = placeAll(false);
  if (!placed.clean && conflicts.length > 0) {
    const collapsed = placeAll(true);
    if (collapsed.clean) placed = collapsed;
  }
  const label = (key: string): MapLabel => placed.labels.get(key) ?? { text: '', x: 0, y: 0, anchor: 'middle', box: { x: 0, y: 0, w: 0, h: 0 } };

  // 차: 이어서 끝난 마지막 점 (미룬 마디의 갈림목은 건너뛴다). 도착이면 빈 터 앞
  let carK = 0;
  for (let k = 1; k <= work.length; k += 1) {
    if (prefix[k] !== true) break;
    if (work[k - 1]?.later !== true) carK = k;
  }
  let car: MapCar;
  const last = thread.line[thread.line.length - 1] ?? ENTRY;
  const beforeLast = thread.line[thread.line.length - 2] ?? START;
  if (arrived) {
    const u = unit(beforeLast, last);
    car = { x: r2(last.x - u.x * CAR_STOP), y: r2(last.y - u.y * CAR_STOP), angle: angleOf(u), dist: r2(route.length - CAR_STOP), at: 'lot' };
  } else {
    const idx = thread.at[carK] ?? 0;
    const p = thread.line[idx] ?? START;
    const next = thread.line[idx + 1] ?? last;
    car = { x: p.x, y: p.y, angle: angleOf(unit(p, next)), dist: r2(distAt(carK)), at: idOf(carK) };
  }
  const carMain = arrived ? mains.length - 1 : carK;

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
      passed: w.input.filled && !w.later && i + 1 <= carMain,
      dist: r2(distAt(i + 1)),
      box: w.box,
    };
    if (w.cone) n.cone = { x: r2(w.cone.x), y: r2(w.cone.y) };
    return n;
  });

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
      state: arrived ? 'drawn' : lotType ? 'outline' : 'empty',
      label: label('lot'),
      flag: { x: FLAG_BOX.x, y: FLAG_BOX.y },
      flagBox: FLAG_BOX,
      entry: ENTRY,
    },
    houses: housesKind && housesBox ? { kind: housesKind, box: housesBox } : null,
    tunnel: placed.tunnel,
    nodes,
    roads,
    routeD: route.d,
    routeLength: r2(route.length),
    markers: placed.markers,
    car,
    symbols: work.length + 2 + (housesBox ? 1 : 0) + (placed.tunnel ? 1 : 0) + placed.markers.length,
    summary: input.summary ?? '',
  };
}

function angleOf(u: Pt): number {
  return r2((Math.atan2(u.y, u.x) * 180) / Math.PI);
}

// ---------------------------------------------------------------- 엔진 결과 → 지도 입력

const SHAPES: NodeShape[] = ['screen', 'store', 'auth', 'data', 'notify', 'host'];
const LOT_TYPES: LotType[] = ['record', 'form', 'page', 'quiz', 'tool', 'board', 'unknown'];
/** 느낌 질문(q.style)의 보기 id → 지도 팔레트 */
const PALETTE_OF: Record<string, Palette> = { clean: 'clean', cute: 'cute', serious: 'calm', bold: 'bold' };
const Q_TYPE = 'q.type';
const Q_STYLE = 'q.style';

/** 막힌 곳 id로 사고 표시 종류를 고른다 (MAP.md 4절) */
export function markerKind(c: { id: string; kind: 'rule' | 'empty-slot'; kept: boolean }): MarkerKind {
  if (c.kept) return 'question';
  if (c.kind === 'empty-slot') return 'gap';
  switch (c.id) {
    case 'conflict.paid-on-free':
      return 'toll';
    case 'conflict.key-in-static-page':
    case 'conflict.key-on-public-host':
      return 'lock';
    case 'conflict.personal-server':
      return 'globe';
    default:
      return 'alert';
  }
}

function hasTag(r: EngineResult, tag: string): boolean {
  return (r.interview.tags[tag] ?? 0) >= 1;
}

function oneLine(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return [...t].length > max ? `${[...t].slice(0, max).join('')}…` : t;
}

export interface MapOptions {
  /** 지금 여는 칸 id (도구 고르기) */
  focus?: string;
  /** 도구끼리 맞춰 보기: 교통 색과 사고 표시 */
  traffic?: boolean;
  /** 도착: 차가 빈 터 앞에, 윤곽이 실선으로 */
  arrived?: boolean;
}

/**
 * 엔진 결과를 지도로. 사고 표시는 교통 정보를 보는 도구끼리 맞춰 보기(traffic)와 설계도 받기(arrived)에서만 그린다.
 * 도구 고르기에서는 빈 마디가 곧 남은 일이라, 빈 칸마다 표시를 달면 지도가 시끄러워진다.
 */
export function mapModel(r: EngineResult, opts: MapOptions = {}): MapModel {
  const traffic = opts.traffic === true;
  const arrived = opts.arrived === true;
  const showMarkers = traffic || arrived;
  const deferred = new Set(r.session.deferred);
  const students = hasTag(r, 'sensitive.students');

  const nodes: MapInputNode[] = [];
  for (const s of r.slots) {
    const shape = SHAPES.find((x) => x === s.slot.capability);
    if (!shape) continue;
    const anchored = r.conflicts.filter((c) => c.anchorSlot === s.slot.id);
    const node: MapInputNode = { id: s.slot.id, shape, label: s.slot.label, filled: s.filledBy.length > 0 };
    if (deferred.has(s.slot.id)) node.later = true;
    if (opts.focus === s.slot.id) node.open = true;
    if (anchored.some((c) => !c.kept)) node.traffic = 'jam';
    else if (anchored.length > 0) node.traffic = 'slow';
    if (shape === 'store' && students) node.hatch = true;
    nodes.push(node);
  }

  const conflicts: MapInputConflict[] = showMarkers
    ? r.conflicts.map((c) => ({ id: c.id, kind: markerKind(c), anchor: c.anchorSlot ?? null }))
    : [];

  const typeAnswer = r.interview.answers[Q_TYPE];
  const lotType = LOT_TYPES.find((t) => t === typeAnswer) ?? null;
  const typeOption = r.interview.visible.find((q) => q.id === Q_TYPE)?.options.find((o) => o.id === typeAnswer);
  const lotLabel = typeOption && typeOption.isUnknown !== true ? typeOption.label : ko.map.destination;

  const houses: HouseKind | null = hasTag(r, 'audience.public') ? 'many' : hasTag(r, 'audience.few') ? '3' : hasTag(r, 'audience.me') ? '1' : null;
  const proxy = r.cart.some((p) => p.capabilities.includes('proxy'));
  const tunnel = proxy ? 'open' : r.conflicts.some((c) => c.id === 'conflict.key-in-static-page') ? 'ghost' : null;
  const palette = PALETTE_OF[r.interview.answers[Q_STYLE] ?? ''] ?? 'clean';

  return layoutMap({
    nodes,
    conflicts,
    traffic,
    arrived,
    lot: { type: lotType, label: lotLabel },
    houses,
    tunnel,
    palette,
    summary: mapSummary(r, { traffic, arrived, typeLabel: typeOption && typeOption.isUnknown !== true ? typeOption.label : null }),
  });
}

/** role="img" 요약: "목적지 체험학습 신청서. 꼭 고를 것 4개 중 3개 골랐어요. 막힌 곳 1개." */
export function mapSummary(r: EngineResult, o: { traffic: boolean; arrived: boolean; typeLabel: string | null }): string {
  const S = ko.map.summary;
  const out: string[] = [];
  const name = oneLine(r.session.freeText ?? '', 30) || o.typeLabel;
  out.push(name ? fill(S.destination, { name }) : S.noDestination);
  if (o.arrived) out.push(S.arrived);
  const deferred = new Set(r.session.deferred);
  const required = r.slots.filter((s) => s.slot.required && !deferred.has(s.slot.id));
  if (required.length > 0) out.push(fill(S.picked, { total: required.length, picked: required.filter((s) => s.filledBy.length > 0).length }));
  if (deferred.size > 0) out.push(fill(S.later, { n: deferred.size }));
  if (o.traffic) {
    const blocked = r.conflicts.filter((c) => !c.kept).length;
    const kept = r.conflicts.length - blocked;
    if (blocked > 0) out.push(fill(S.blocked, { n: blocked }));
    if (kept > 0) out.push(fill(S.kept, { n: kept }));
    if (r.conflicts.length === 0) out.push(S.clear);
  }
  return out.join(' ');
}
