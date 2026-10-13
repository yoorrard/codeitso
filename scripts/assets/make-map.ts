// 지어낸 도시의 땅 판 src/assets/map/land.svg를 만든다 (docs/MAP.md 2절, CONCEPT 5.5·9(a)). `npm run map`
// 고정 시드라 몇 번을 돌려도 같은 파일이 나온다. 그림을 바꾸려면 파일이 아니라 이 스크립트를 고친다.
// 색은 쓰지 않고 클래스만 붙인다: 낮·밤·느낌 팔레트가 같은 파일을 쓰고, 칠은 src/styles/map-land.css가 토큰으로 한다.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

interface Pt {
  x: number;
  y: number;
}
type Poly = Pt[];
type Grade = 1 | 2 | 3 | 4;
interface Seg {
  a: Pt;
  b: Pt;
  grade: Grade;
}
interface Line {
  pos: number;
  grade: Grade;
}
interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'src', 'assets', 'map', 'land.svg');
const SEED = 20260528;
const GZIP_LIMIT = 24 * 1024;

// 판은 지도 세계(432×240)의 세 배. 넓은 화면의 meet 배치에서 남는 자리를 채운다
const W = 1296;
const H = 720;
const OX = 432;
const OY = 240;
// 안전 구역(세계 x 60~372, y 32~208). 내 길·마디·이름표가 놓이는 곳이라 아무것도 두지 않는다
const SAFE: Rect = { x0: OX + 60, y0: OY + 32, x1: OX + 372, y1: OY + 208 };
// 안전 구역을 감싸는 빈 땅(새로 닦을 터). 둘레를 길로 두르지 않는다: 닫힌 고리 길은 액자처럼 읽혔다 (D68).
// 빈 땅으로 들어오는 격자 길은 가장자리 근처에서 저마다 다른 자리에 둥근 끝으로 멈추고(STUB_*), 안에는 옅은 오솔길 몇 줄만 둔다(FOOTPATHS).
// 아래 변은 띠 아래 이음매(세계 y 208~240)다. 시트가 띠 아래를 덮고 둥근 모서리로 깎으므로 큰길·45° 큰길을 두지 않는다
const CLEAR: Rect = { x0: 472, y0: 256, x1: 824, y1: 464 };
// 강: 빈 땅 바로 아래(남쪽)를 가로로 흐르다 오른쪽에서 45°로 한 번 꺾여 판 아래로 나간다.
// 휴대폰에서는 시트가 지도 아래를 덮으므로, 강은 넓은 화면의 아래 띠에서 보이게 둔다
const RIVER_Y = 524;
const RIVER_HW = 18;
const RIVER_ROW: [number, number] = [CLEAR.y1, 584]; // 강이 지나는 줄: 블록과 3·4등급 길을 두지 않는다
const RIVER_BEND_MIN = 1000; // 이 x 이상의 첫 세로 길에서 꺾인다
// 45° 큰길 x + y = ARTERIAL. 위 토막은 판 위에서 내려와 빈 땅 가장자리 안 ARTERIAL_IN에서 둥글게 멈춘다
// (홈 띠 360×264의 오른쪽 위에 비쳐 '빈 땅으로 들어오는 큰길'로 보인다). 아래 토막은 강 아래 길(RIVER_ROW[1])에서 시작한다:
// 빈 땅 아래 이음매를 지나지 않고, 강도 건너지 않는다
const ARTERIAL = 1040;
const ARTERIAL_IN = 6;

const WIDTH: Record<Grade, number> = { 1: 10, 2: 7, 3: 5, 4: 3 };
const EDGE = 2; // 길 테두리는 길보다 2 굵다 (양쪽 1씩)
const SIDEWALK = 3; // 길 테두리와 블록 사이 땅
const ALLEY = 6; // 한 칸을 여러 블록으로 나눌 때 사이 땅
const R_BLOCK = 6;
const MIN_BLOCK = 18; // 이보다 좁은 블록 조각은 버린다 (실오라기 방지)
const MIN_STREET = 28; // 이보다 짧은 길 토막은 버린다
const OVERHANG = 16; // 판 가장자리 너머로 길과 블록을 늘여 둥근 끝이 보이지 않게

// 작은 고정 난수 (mulberry32). Math.random을 쓰지 않아야 같은 파일이 나온다
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = prng(SEED);
const pick = <T>(xs: readonly T[]): T => {
  const v = xs[Math.floor(rnd() * xs.length)];
  if (v === undefined) throw new Error('빈 목록에서 고를 수 없다');
  return v;
};

// 길 가운데 줄에서 블록까지: 길 반폭 + 테두리 1 + 보도
const inset = (g: Grade | 0 | 'alley'): number =>
  g === 0 ? -OVERHANG : g === 'alley' ? ALLEY / 2 : Math.ceil(WIDTH[g] / 2 + EDGE / 2 + SIDEWALK);

// ---------- 격자 ----------
// 빈 땅의 네 변에서 바깥으로 간격을 뽑아 나간다. 간격은 24 격자의 3~5칸 안팎
const STEPS = [80, 88, 96, 104, 112] as const;
function outward(from: number, dir: 1 | -1, limit: number): number[] {
  const out: number[] = [];
  let p = from;
  for (;;) {
    p += dir * pick(STEPS);
    if (dir < 0 ? p < 24 : p > limit - 24) break;
    out.push(p);
  }
  return out;
}
// 빈 땅 위·아래 띠에서 빈 땅 폭을 나누는 세로 길 (빈 땅 가장자리 근처에서 멈춘다)
function partition(total: number, parts: number): number[] {
  const base = Math.floor(total / parts / 8) * 8;
  const sizes = Array.from({ length: parts }, () => base);
  sizes[parts - 1] = total - base * (parts - 1);
  // 8씩 흔들어 똑같은 간격이 되지 않게 한다
  for (let i = 0; i < parts; i++) {
    const j = Math.floor(rnd() * parts);
    const si = sizes[i] ?? 0;
    if (i !== j && si > 80) {
      sizes[i] = si - 8;
      sizes[j] = (sizes[j] ?? 0) + 8;
    }
  }
  const cuts: number[] = [];
  let acc = 0;
  for (let i = 0; i < parts - 1; i++) {
    acc += sizes[i] ?? 0;
    cuts.push(acc);
  }
  return cuts;
}

const vLines: Line[] = [
  { pos: CLEAR.x0, grade: 3 as Grade },
  { pos: CLEAR.x1, grade: 3 as Grade },
  ...partition(CLEAR.x1 - CLEAR.x0, 4).map((d) => ({ pos: CLEAR.x0 + d, grade: 3 as Grade })),
  ...outward(CLEAR.x0, -1, W).map((pos) => ({ pos, grade: 3 as Grade })),
  ...outward(CLEAR.x1, 1, W).map((pos) => ({ pos, grade: 3 as Grade })),
].sort((a, b) => a.pos - b.pos);

const hLines: Line[] = [
  { pos: CLEAR.y0, grade: 3 as Grade },
  { pos: CLEAR.y1, grade: 3 as Grade },
  { pos: (CLEAR.y0 + CLEAR.y1) / 2, grade: 3 as Grade },
  { pos: RIVER_ROW[1], grade: 3 as Grade },
  ...outward(CLEAR.y0, -1, H).map((pos) => ({ pos, grade: 3 as Grade })),
  ...outward(RIVER_ROW[1], 1, H).map((pos) => ({ pos, grade: 3 as Grade })),
].sort((a, b) => a.pos - b.pos);

// 빈 땅에서 몇 줄 떨어진 길 셋을 2등급으로 올려 위계를 준다 (2등급은 강을 다리로 건넌다)
function promote(lines: Line[], near: number, dir: 1 | -1, nth: number): void {
  const side = lines.filter((l) => (dir < 0 ? l.pos < near : l.pos > near)).sort((a, b) => dir * (a.pos - b.pos));
  const l = side[nth];
  if (l) l.grade = 2;
}
promote(vLines, CLEAR.x0, -1, 2);
promote(vLines, CLEAR.x1, 1, 2);
promote(hLines, CLEAR.y0, -1, 1);

const bendX = vLines.find((l) => l.pos >= RIVER_BEND_MIN)?.pos ?? RIVER_BEND_MIN;
// 꺾인 뒤 강 가운데 줄: y - x = RIVER_C
const RIVER_C = RIVER_Y - bendX;

// 몇몇 칸 사이의 짧은 길 토막을 빼서 두 칸을 큰 블록 하나로 잇는다. 모눈종이처럼 똑같은 격자를 깨려는 것.
// 한 갈림길에서 두 토막을 빼지 않아야 막다른 길이 생기지 않는다. 빈 땅 가장자리·강 줄·꺾임 근처는 건드리지 않는다
const DROP_RATE = 0.3;
const dropped = new Set<string>(); // 'v:x:y0' 또는 'h:y:x0'
{
  const used = new Set<string>();
  const near = (x: number, y: number): boolean =>
    (x >= CLEAR.x0 - 1 && x <= CLEAR.x1 + 1 && y >= CLEAR.y0 - 1 && y <= CLEAR.y1 + 1) ||
    (y >= RIVER_ROW[0] && y <= RIVER_ROW[1]) ||
    (x >= bendX - 40 && y >= RIVER_ROW[0] - 40);
  const fixed = (pos: number, isV: boolean): boolean =>
    isV ? pos === CLEAR.x0 || pos === CLEAR.x1 : pos === CLEAR.y0 || pos === CLEAR.y1 || pos === RIVER_ROW[1];
  const tryDrop = (key: string, a: Pt, b: Pt): void => {
    const ka = `${a.x},${a.y}`;
    const kb = `${b.x},${b.y}`;
    if (used.has(ka) || used.has(kb) || near(a.x, a.y) || near(b.x, b.y)) return;
    if (rnd() >= DROP_RATE) return;
    dropped.add(key);
    used.add(ka);
    used.add(kb);
  };
  for (const v of vLines) {
    if (v.grade !== 3 || fixed(v.pos, true)) continue;
    for (let j = 0; j + 1 < hLines.length; j++) {
      const y0 = hLines[j]?.pos ?? 0;
      const y1 = hLines[j + 1]?.pos ?? 0;
      tryDrop(`v:${v.pos}:${y0}`, { x: v.pos, y: y0 }, { x: v.pos, y: y1 });
    }
  }
  for (const h of hLines) {
    if (h.grade !== 3 || fixed(h.pos, false)) continue;
    for (let i = 0; i + 1 < vLines.length; i++) {
      const x0 = vLines[i]?.pos ?? 0;
      const x1 = vLines[i + 1]?.pos ?? 0;
      tryDrop(`h:${h.pos}:${x0}`, { x: x0, y: h.pos }, { x: x1, y: h.pos });
    }
  }
}
const nextPos = (lines: Line[], pos: number): number => lines.find((l) => l.pos > pos)?.pos ?? pos;

// ---------- 기하 도우미 ----------
const SQ2 = Math.SQRT2;
function clipHalf(poly: Poly, a: number, b: number, c: number): Poly {
  // a·x + b·y <= c 쪽만 남긴다 (Sutherland–Hodgman 한 번)
  const out: Poly = [];
  const inside = (p: Pt): boolean => a * p.x + b * p.y <= c + 1e-9;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (!p || !q) continue;
    const pin = inside(p);
    const qin = inside(q);
    if (pin) out.push(p);
    if (pin !== qin) {
      const fp = a * p.x + b * p.y - c;
      const fq = a * q.x + b * q.y - c;
      const t = fp / (fp - fq);
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
    }
  }
  return out;
}
const rectPoly = (r: Rect): Poly => [
  { x: r.x0, y: r.y0 },
  { x: r.x1, y: r.y0 },
  { x: r.x1, y: r.y1 },
  { x: r.x0, y: r.y1 },
];
function area(poly: Poly): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (p && q) s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s) / 2;
}
function perimeter(poly: Poly): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (p && q) s += Math.hypot(q.x - p.x, q.y - p.y);
  }
  return s;
}
// 얇은 조각 판정: 넓이 / 반둘레 (내접원 반지름 꼴)
const thick = (poly: Poly): number => (poly.length < 3 ? 0 : (2 * area(poly)) / perimeter(poly));
function tidy(poly: Poly): Poly {
  const out: Poly = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) out.push(p);
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (first && last && out.length > 1 && Math.hypot(first.x - last.x, first.y - last.y) <= 0.5) out.pop();
  return out;
}

// ---------- 길 ----------
// 선분에서 [lo, hi] 구간(매개변수)을 빼고 남는 토막
function cut(seg: Seg, lo: number, hi: number): Seg[] {
  if (hi <= lo || hi <= 0 || lo >= 1) return [seg];
  const at = (t: number): Pt => ({ x: seg.a.x + (seg.b.x - seg.a.x) * t, y: seg.a.y + (seg.b.y - seg.a.y) * t });
  const out: Seg[] = [];
  if (lo > 0) out.push({ a: seg.a, b: at(lo), grade: seg.grade });
  if (hi < 1) out.push({ a: at(hi), b: seg.b, grade: seg.grade });
  return out;
}
// 선분이 볼록 다각형 안을 지나는 구간 (Cyrus–Beck). 경계에 닿기만 하면 빼지 않는다
function insideSpan(seg: Seg, poly: Poly): [number, number] | null {
  let lo = 0;
  let hi = 1;
  const d = { x: seg.b.x - seg.a.x, y: seg.b.y - seg.a.y };
  // 시계 방향(화면 좌표) 다각형의 바깥 법선
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    if (!p || !q) continue;
    const n = { x: q.y - p.y, y: -(q.x - p.x) };
    const num = n.x * (seg.a.x - p.x) + n.y * (seg.a.y - p.y);
    const den = n.x * d.x + n.y * d.y;
    if (Math.abs(den) < 1e-9) {
      if (num >= -1e-9) return null;
      continue;
    }
    const t = -num / den;
    if (den < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
  }
  return hi - lo > 1e-6 ? [lo, hi] : null;
}
function subtract(segs: Seg[], poly: Poly, grades: readonly Grade[]): Seg[] {
  return segs.flatMap((s) => {
    if (!grades.includes(s.grade)) return [s];
    const span = insideSpan(s, poly);
    return span ? cut(s, span[0], span[1]) : [s];
  });
}

let streets: Seg[] = [];
for (const l of vLines) streets.push({ a: { x: l.pos, y: -OVERHANG }, b: { x: l.pos, y: H + OVERHANG }, grade: l.grade });
for (const l of hLines) streets.push({ a: { x: -OVERHANG, y: l.pos }, b: { x: W + OVERHANG, y: l.pos }, grade: l.grade });
// 45° 큰길 두 토막. 아래 토막의 둥근 시작은 보통 길 가운데 줄보다 조금 아래에 둬서 그 길 너머로 혹처럼 비어져 나오지 않게 한다
const ART_TOP = CLEAR.y0 + ARTERIAL_IN;
const ART_BOTTOM = RIVER_ROW[1] + 3;
streets.push({ a: { x: ARTERIAL + OVERHANG, y: -OVERHANG }, b: { x: ARTERIAL - ART_TOP, y: ART_TOP }, grade: 1 });
streets.push({ a: { x: ARTERIAL - ART_BOTTOM, y: ART_BOTTOM }, b: { x: ARTERIAL - H - OVERHANG, y: H + OVERHANG }, grade: 1 });

const SMALL: readonly Grade[] = [3, 4];
streets = streets.flatMap((s) => {
  const vertical = s.a.x === s.b.x;
  const horizontal = s.a.y === s.b.y;
  // 칸을 잇느라 뺀 토막
  if (vertical) {
    let out: Seg[] = [s];
    for (const k of dropped) {
      const [o, p, from] = k.split(':');
      if (o !== 'v' || Number(p) !== s.a.x) continue;
      const y0 = Number(from);
      const y1 = nextPos(hLines, y0);
      out = out.flatMap((q) => cut(q, (y0 - q.a.y) / (q.b.y - q.a.y), (y1 - q.a.y) / (q.b.y - q.a.y)));
    }
    return out;
  }
  if (horizontal) {
    let out: Seg[] = [s];
    for (const k of dropped) {
      const [o, p, from] = k.split(':');
      if (o !== 'h' || Number(p) !== s.a.y) continue;
      const x0 = Number(from);
      const x1 = nextPos(vLines, x0);
      out = out.flatMap((q) => cut(q, (x0 - q.a.x) / (q.b.x - q.a.x), (x1 - q.a.x) / (q.b.x - q.a.x)));
    }
    return out;
  }
  return [s];
});
// 강이 지나는 줄에는 3·4등급 길을 두지 않는다 (1·2등급 길만 다리로 건넌다).
// 꺾이는 자리의 세로 길까지 빼려고 오른쪽 끝을 1 넘긴다
streets = subtract(streets, rectPoly({ x0: -OVERHANG * 2, y0: RIVER_ROW[0], x1: bendX + 1, y1: RIVER_ROW[1] }), SMALL);
// 꺾인 뒤의 강 띠 (강가 여백 포함)
const riverBand = (hw: number): Poly => {
  const far = 400;
  const n = { x: 1 / SQ2, y: -1 / SQ2 }; // 흐름 방향 (1,1)의 왼쪽(위·오른쪽) 법선
  const d = { x: 1 / SQ2, y: 1 / SQ2 };
  const b0 = { x: bendX - d.x * hw, y: RIVER_Y - d.y * hw };
  const b1 = { x: bendX + d.x * far, y: RIVER_Y + d.y * far };
  return [
    { x: b0.x + n.x * hw, y: b0.y + n.y * hw },
    { x: b1.x + n.x * hw, y: b1.y + n.y * hw },
    { x: b1.x - n.x * hw, y: b1.y - n.y * hw },
    { x: b0.x - n.x * hw, y: b0.y - n.y * hw },
  ];
};
streets = subtract(streets, riverBand(RIVER_HW + 10), SMALL);

// ---------- 블록 ----------
// 칸의 네 변. 판 가장자리 너머의 가짜 변(0)에서는 블록을 판 밖까지 늘인다
interface Bound {
  pos: number;
  grade: Grade | 0;
}
// 변의 종류: 길 등급, 판 가장자리(0), 길을 뺀 자리('alley': 이웃 칸 블록과 골목 땅만큼 띄운다)
type Edge = Grade | 0 | 'alley';
interface Cell {
  r: Rect;
  edges: { l: Edge; r: Edge; t: Edge; b: Edge };
}
const vs: Bound[] = [{ pos: -OVERHANG * 2, grade: 0 }, ...vLines, { pos: W + OVERHANG * 2, grade: 0 }];
const hs: Bound[] = [{ pos: -OVERHANG * 2, grade: 0 }, ...hLines, { pos: H + OVERHANG * 2, grade: 0 }];

const cells: Cell[] = [];
for (let i = 0; i + 1 < vs.length; i++) {
  for (let j = 0; j + 1 < hs.length; j++) {
    const L = vs[i];
    const R = vs[i + 1];
    const T = hs[j];
    const B = hs[j + 1];
    if (!L || !R || !T || !B) continue;
    // 빈 땅에 닿는 변도 보통 길 자리만큼 물린다: 길이 끊겨도 블록 끝이 이웃 블록과 한 줄로 맞는다
    const g = (b: Bound, key: string): Edge => (dropped.has(key) ? 'alley' : b.grade);
    cells.push({
      r: { x0: L.pos, y0: T.pos, x1: R.pos, y1: B.pos },
      edges: {
        l: g(L, `v:${L.pos}:${T.pos}`),
        r: g(R, `v:${R.pos}:${T.pos}`),
        t: g(T, `h:${T.pos}:${L.pos}`),
        b: g(B, `h:${B.pos}:${L.pos}`),
      },
    });
  }
}
// 길을 뺀 자리를 사이에 둔 칸끼리 합친다 (한 줄로만 이어지므로 합친 칸도 사각형이다)
{
  const at = new Map(cells.map((c) => [`${c.r.x0},${c.r.y0}`, c] as const));
  const gone = new Set<Cell>();
  for (const c of [...cells].sort((p, q) => p.r.x0 - q.r.x0 || p.r.y0 - q.r.y0)) {
    if (gone.has(c)) continue;
    for (let n = at.get(`${c.r.x1},${c.r.y0}`); c.edges.r === 'alley' && n; n = at.get(`${c.r.x1},${c.r.y0}`)) {
      c.r.x1 = n.r.x1;
      c.edges.r = n.edges.r;
      gone.add(n);
    }
    for (let n = at.get(`${c.r.x0},${c.r.y1}`); c.edges.b === 'alley' && n; n = at.get(`${c.r.x0},${c.r.y1}`)) {
      c.r.y1 = n.r.y1;
      c.edges.b = n.edges.b;
      gone.add(n);
    }
  }
  for (let i = cells.length - 1; i >= 0; i--) if (gone.has(cells[i] as Cell)) cells.splice(i, 1);
}
const within = (r: Rect, o: Rect): boolean => r.x0 >= o.x0 && r.x1 <= o.x1 && r.y0 >= o.y0 && r.y1 <= o.y1;
const innerRect = (c: Cell): Rect => ({
  x0: c.r.x0 + inset(c.edges.l),
  y0: c.r.y0 + inset(c.edges.t),
  x1: c.r.x1 - inset(c.edges.r),
  y1: c.r.y1 - inset(c.edges.b),
});

// 공원 둘: 휴대폰 넓은 띠(360×160, 768×320)의 왼쪽·오른쪽 기둥에 하나씩, 대각선으로 마주 보게
const isLeftPark = (c: Cell): boolean => c.r.x1 === CLEAR.x0 && c.r.y0 === CLEAR.y0;
const isRightPark = (c: Cell): boolean => c.r.x0 === CLEAR.x1 && c.r.y1 === CLEAR.y1;

// 한 칸을 1~4개 블록으로 나눈다. 긴 쪽을 먼저 자르고, 자를 자리는 24 격자의 절반(12)에 맞춘다
function split(r: Rect): Rect[] {
  const w = r.x1 - r.x0;
  const h = r.y1 - r.y0;
  const parts = (lo: number, hi: number, n: number): [number, number][] => {
    if (n <= 1) return [[lo, hi]];
    const size = hi - lo;
    const at = lo + Math.round((size * (0.38 + rnd() * 0.24)) / 4) * 4;
    const left: [number, number] = [lo, at - ALLEY / 2];
    const rest = parts(at + ALLEY / 2, hi, n - 1);
    return [left, ...rest];
  };
  const roll = rnd();
  let nx = 1;
  let ny = 1;
  if (w >= h) {
    nx = roll < 0.2 ? 1 : w > 130 && roll > 0.75 ? 3 : 2;
    ny = h > 74 && rnd() < 0.45 ? 2 : 1;
  } else {
    ny = roll < 0.2 ? 1 : h > 130 && roll > 0.75 ? 3 : 2;
    nx = w > 74 && rnd() < 0.45 ? 2 : 1;
  }
  const out: Rect[] = [];
  for (const [x0, x1] of parts(r.x0, r.x1, nx)) for (const [y0, y1] of parts(r.y0, r.y1, ny)) out.push({ x0, y0, x1, y1 });
  return out;
}

const ART_K = Math.ceil(inset(1) * SQ2);
const RIV_K = Math.ceil((RIVER_HW + SIDEWALK + 3) * SQ2);
function carve(poly: Poly): Poly[] {
  // 45° 큰길 양쪽으로 나누고, 꺾인 뒤의 강 띠 양쪽으로 다시 나눈다
  let pieces: Poly[] = [clipHalf(poly, 1, 1, ARTERIAL - ART_K), clipHalf(poly, -1, -1, -(ARTERIAL + ART_K))];
  const nearBend = (p: Poly): boolean => p.some((q) => q.x > bendX - RIVER_HW * 2) && p.some((q) => q.y > RIVER_ROW[0]);
  pieces = pieces.flatMap((p) => (nearBend(p) ? [clipHalf(p, -1, 1, RIVER_C - RIV_K), clipHalf(p, 1, -1, -(RIVER_C + RIV_K))] : [p]));
  return pieces.map(tidy).filter((p) => p.length >= 3 && thick(p) >= MIN_BLOCK / 2.2 && area(p) >= MIN_BLOCK * MIN_BLOCK * 1.4);
}

const blocks: Poly[] = [];
const parks: Poly[] = [];
const parkPaths: Seg[] = [];
for (const c of cells) {
  if (within(c.r, CLEAR)) continue;
  if (c.r.y0 === RIVER_ROW[0] && c.r.y1 === RIVER_ROW[1] && c.r.x1 <= bendX) continue;
  const inner = innerRect(c);
  if (inner.x1 - inner.x0 < MIN_BLOCK || inner.y1 - inner.y0 < MIN_BLOCK) continue;
  if (isLeftPark(c) || isRightPark(c)) {
    parks.push(rectPoly(inner));
    // 공원 오솔길: 45°로 가로지르는 지름길 하나 (4등급). 왼쪽 공원은 바깥 갈림길(왼쪽 위)에서 빈 땅 쪽으로 내려오고,
    // 오른쪽 공원은 빈 땅 쪽(왼쪽 위)에서 바깥 갈림길(오른쪽 아래)로 나간다. 이음매(아래 변) 쪽 모서리에는 닿지 않는다
    const run = Math.min(c.r.x1 - c.r.x0, c.r.y1 - c.r.y0);
    if (isLeftPark(c)) parkPaths.push({ a: { x: c.r.x0, y: c.r.y0 }, b: { x: c.r.x0 + run, y: c.r.y0 + run }, grade: 4 });
    else parkPaths.push({ a: { x: c.r.x1 - run, y: c.r.y1 - run }, b: { x: c.r.x1, y: c.r.y1 }, grade: 4 });
    continue;
  }
  for (const r of split(inner)) blocks.push(...carve(rectPoly(r)));
}
streets.push(...parkPaths);
// 강가에서 끊긴 길 끝이 바로 옆 갈림길을 조금 지나 툭 튀어나와 있으면, 그 갈림길까지 줄여 깔끔한 ㅗ자로 만든다
const TRIM = 40;
const onSeg = (p: Pt, s: Seg): boolean => {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  const t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2;
  if (t < -1e-6 || t > 1 + 1e-6) return false;
  return Math.hypot(s.a.x + dx * t - p.x, s.a.y + dy * t - p.y) < 0.5;
};
const inPlate = (p: Pt): boolean => p.x > 0 && p.x < W && p.y > 0 && p.y < H;
streets = streets.map((s) => {
  if (!SMALL.includes(s.grade) || (s.a.x !== s.b.x && s.a.y !== s.b.y)) return s;
  const others = streets.filter((o) => o !== s);
  const free = (p: Pt): boolean => inPlate(p) && !others.some((o) => onSeg(p, o));
  const vertical = s.a.x === s.b.x;
  // 이 토막 위의 갈림길 자리 (가로지르는 길이 실제로 지나는 곳만)
  const cross = (vertical ? hLines : vLines)
    .map((l) => (vertical ? { x: s.a.x, y: l.pos } : { x: l.pos, y: s.a.y }))
    .filter((p) => onSeg(p, s) && others.some((o) => onSeg(p, o)));
  let { a, b } = s;
  const dist = (p: Pt, q: Pt): number => Math.hypot(p.x - q.x, p.y - q.y);
  if (free(a)) {
    const j = cross.filter((p) => dist(p, a) > 0.5).sort((p, q) => dist(p, a) - dist(q, a))[0];
    if (j && dist(j, a) < TRIM) a = j;
  }
  if (free(b)) {
    const j = cross.filter((p) => dist(p, b) > 0.5).sort((p, q) => dist(p, b) - dist(q, b))[0];
    if (j && dist(j, b) < TRIM) b = j;
  }
  return { a, b, grade: s.grade };
});

// 빈 땅으로 들어오는 격자 길은 가장자리 근처에서 저마다 다른 자리에 둥근 끝으로 멈춘다 (막다른 길).
// 따로 둔 난수라 격자·블록 배치는 그대로다. 값은 빈 땅 가장자리에서 안쪽(+)·바깥쪽(-)으로 간 거리.
// - 안쪽 줄: 안전 구역 여백(가로 20, 세로 16)에서 길 반폭을 뺀 만큼까지만 들어온다.
// - 위 두 모서리: 가장자리 위를 지나는 두 줄 가운데 하나만 모서리를 지나 조금 따라 들어오고, 다른 하나는 거기 닿거나 못 미쳐 멈춘다.
//   둘 다 모서리를 지나면 귀퉁이마다 '+' 표가 생겨 재단 표시처럼 다시 테두리를 그린다.
// - 아래 변(이음매, 그 아래는 강 줄)으로는 들어오지 않는다
const rndStub = prng(SEED + 1);
const pickStub = (xs: readonly number[]): number => xs[Math.floor(rndStub() * xs.length)] ?? 0;
const STUB_IN = [-24, -8, 4, 10] as const;
const STUB_SEAM = [-28, -12, 0] as const;
const CORNER_RUN = [12, 28, 44] as const;
const CORNER_STOP = [-24, 0] as const;
const stubAt = new Map<string, number>();
for (const [v, h] of [
  [`v:${CLEAR.x0}:a`, `h:${CLEAR.y0}:a`],
  [`v:${CLEAR.x1}:a`, `h:${CLEAR.y0}:b`],
] as const) {
  const vRuns = rndStub() < 0.5;
  stubAt.set(vRuns ? v : h, pickStub(CORNER_RUN));
  stubAt.set(vRuns ? h : v, pickStub(CORNER_STOP));
}
// 'a'는 위·왼쪽 끝, 'b'는 아래·오른쪽 끝
function stubCut(s: Seg): Seg[] {
  const vertical = s.a.x === s.b.x;
  const horizontal = s.a.y === s.b.y;
  if (!SMALL.includes(s.grade) || (!vertical && !horizontal)) return [s];
  const pos = vertical ? s.a.x : s.a.y;
  const [lo, hi] = vertical ? [CLEAR.x0, CLEAR.x1] : [CLEAR.y0, CLEAR.y1];
  if (pos < lo || pos > hi) return [s];
  const key = `${vertical ? 'v' : 'h'}:${pos}`;
  const seamSide = horizontal && pos === CLEAR.y1;
  const da = stubAt.get(`${key}:a`) ?? pickStub(seamSide ? STUB_SEAM : STUB_IN);
  const db = stubAt.get(`${key}:b`) ?? pickStub(seamSide || vertical ? STUB_SEAM : STUB_IN);
  const [from, to] = vertical ? [CLEAR.y0, CLEAR.y1] : [CLEAR.x0, CLEAR.x1];
  const a0 = vertical ? s.a.y : s.a.x;
  const len = (vertical ? s.b.y : s.b.x) - a0;
  return cut(s, (from + da - a0) / len, (to - db - a0) / len);
}
streets = streets.flatMap(stubCut);
streets = streets.filter((s) => Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) >= MIN_STREET);

// ---------- 강 ----------
function riverPoly(): { poly: Poly; radii: number[] } {
  const hw = RIVER_HW;
  const t = hw * (SQ2 - 1); // 45° 꺾임에서 바깥·안쪽 모서리가 가운데 줄 꺾임점에서 벗어나는 거리
  const far = 400;
  const left = -OVERHANG * 2;
  const n = { x: 1 / SQ2, y: -1 / SQ2 };
  const end = { x: bendX + far, y: RIVER_Y + far };
  return {
    poly: [
      { x: left, y: RIVER_Y - hw },
      { x: bendX + t, y: RIVER_Y - hw },
      { x: end.x + n.x * hw, y: end.y + n.y * hw },
      { x: end.x - n.x * hw, y: end.y - n.y * hw },
      { x: bendX - t, y: RIVER_Y + hw },
      { x: left, y: RIVER_Y + hw },
    ],
    // 꺾이는 곳만 둥글게: 바깥은 크게, 안쪽은 작게 (같은 중심의 굽이처럼 보이게)
    radii: [0, 96, 0, 0, 40, 0],
  };
}

// ---------- 출력 (정수 좌표, 상대 명령) ----------
const num = (v: number): string => String(Math.round(v) === 0 ? 0 : Math.round(v));
function pairs(...vals: number[]): string {
  // 음수 부호가 구분자 역할을 하므로 그 앞의 빈칸은 뺀다
  let s = '';
  for (const v of vals) {
    const t = num(v);
    s += s === '' || t.startsWith('-') ? t : ` ${t}`;
  }
  return s;
}
class PathOut {
  d = '';
  cx = 0;
  cy = 0;
  move(x: number, y: number): void {
    const X = Math.round(x);
    const Y = Math.round(y);
    this.d += `M${pairs(X, Y)}`;
    this.cx = X;
    this.cy = Y;
  }
  line(x: number, y: number): void {
    const X = Math.round(x);
    const Y = Math.round(y);
    const dx = X - this.cx;
    const dy = Y - this.cy;
    if (dx === 0 && dy === 0) return;
    if (dy === 0) this.d += `h${num(dx)}`;
    else if (dx === 0) this.d += `v${num(dy)}`;
    else this.d += `l${pairs(dx, dy)}`;
    this.cx = X;
    this.cy = Y;
  }
  quad(qx: number, qy: number, x: number, y: number): void {
    const QX = Math.round(qx);
    const QY = Math.round(qy);
    const X = Math.round(x);
    const Y = Math.round(y);
    if (X === this.cx && Y === this.cy) return;
    this.d += `q${pairs(QX - this.cx, QY - this.cy, X - this.cx, Y - this.cy)}`;
    this.cx = X;
    this.cy = Y;
  }
  close(): void {
    this.d += 'z';
  }
}

// 둥근 모서리 다각형. 모서리마다 접선 길이 r / tan(θ/2)에서 꺾고, 꼭짓점을 조절점으로 하는 2차 곡선으로 잇는다
function roundedPoly(out: PathOut, poly: Poly, radii: number | number[]): void {
  const n = poly.length;
  const corner = (i: number): { a: Pt; v: Pt; b: Pt } => {
    const v = poly[i] as Pt;
    const p = poly[(i - 1 + n) % n] as Pt;
    const q = poly[(i + 1) % n] as Pt;
    const r = typeof radii === 'number' ? radii : (radii[i] ?? 0);
    const lp = Math.hypot(p.x - v.x, p.y - v.y);
    const lq = Math.hypot(q.x - v.x, q.y - v.y);
    const u1 = { x: (p.x - v.x) / lp, y: (p.y - v.y) / lp };
    const u2 = { x: (q.x - v.x) / lq, y: (q.y - v.y) / lq };
    const cos = Math.max(-1, Math.min(1, u1.x * u2.x + u1.y * u2.y));
    const theta = Math.acos(cos);
    // 45° 같은 뾰족한 모서리는 접선이 길어져 잎사귀처럼 휘므로, 직각 모서리 접선의 1.2배에서 멈춘다
    let t = r > 0 ? Math.min(r / Math.tan(theta / 2), r * 1.2) : 0;
    t = Math.min(t, lp * 0.48, lq * 0.48);
    return { a: { x: v.x + u1.x * t, y: v.y + u1.y * t }, v, b: { x: v.x + u2.x * t, y: v.y + u2.y * t } };
  };
  const cs = poly.map((_, i) => corner(i));
  const c0 = cs[0];
  if (!c0) return;
  out.move(c0.b.x, c0.b.y);
  for (let k = 1; k <= n; k++) {
    const c = cs[k % n];
    if (!c) continue;
    out.line(c.a.x, c.a.y);
    out.quad(c.v.x, c.v.y, c.b.x, c.b.y);
  }
  out.close();
}

function streetPath(grade: Grade): string {
  const out = new PathOut();
  const segs = streets.filter((s) => s.grade === grade).sort((p, q) => p.a.x - q.a.x || p.a.y - q.a.y);
  for (const s of segs) {
    out.move(s.a.x, s.a.y);
    out.line(s.b.x, s.b.y);
  }
  return out.d;
}

// ---------- 검사: 안전 구역 안에 아무것도 없어야 한다 ----------
function hitsSafe(poly: Poly, pad: number): boolean {
  const s = { x0: SAFE.x0 - pad, y0: SAFE.y0 - pad, x1: SAFE.x1 + pad, y1: SAFE.y1 + pad };
  // 볼록 다각형과 사각형의 겹침: 사각형으로 잘라 남는 넓이로 본다
  let p = poly;
  p = clipHalf(p, -1, 0, -s.x0);
  p = clipHalf(p, 1, 0, s.x1);
  p = clipHalf(p, 0, -1, -s.y0);
  p = clipHalf(p, 0, 1, s.y1);
  return p.length >= 3 && area(p) > 0.5;
}
const problems: string[] = [];
for (const b of blocks) if (hitsSafe(b, 0)) problems.push(`블록이 안전 구역에 걸림: ${JSON.stringify(b[0])}`);
for (const p of parks) if (hitsSafe(p, 0)) problems.push('공원이 안전 구역에 걸림');
const river = riverPoly();
if (hitsSafe(river.poly, 0)) problems.push('강이 안전 구역에 걸림');
for (const s of streets) {
  const half = (WIDTH[s.grade] + EDGE) / 2;
  const span = insideSpan(s, rectPoly({ x0: SAFE.x0 - half, y0: SAFE.y0 - half, x1: SAFE.x1 + half, y1: SAFE.y1 + half }));
  if (span) problems.push(`길이 안전 구역에 걸림: ${JSON.stringify(s.a)}→${JSON.stringify(s.b)}`);
}
// 띠 아래 이음매(세계 y 208~240)에는 큰길(1·2등급)과 45° 큰길을 두지 않는다. 휴대폰 띠가 보이는 가로 범위(세계 x -40~472)만 본다
for (const s of streets) {
  if (s.grade > 2) continue;
  const half = (WIDTH[s.grade] + EDGE) / 2;
  const grown = rectPoly({ x0: OX - 40 - half, y0: OY + 208 - half, x1: OX + 472 + half, y1: OY + 240 + half });
  if (insideSpan(s, grown)) problems.push(`큰길이 띠 아래 이음매에 걸림: ${JSON.stringify(s.a)}→${JSON.stringify(s.b)}`);
}

// 빈 땅 안의 오솔길: 아주 옅게(길 테두리 색, 굵기 3) 두세 줄. 안전 구역을 지나도 되는 유일한 꾸밈이다.
// 길 끝이나 공원 길 끝에서 이어져, 아직 닦지 않은 새 땅을 사람들이 질러 다닌 자국처럼 보이게 한다.
// 세계 좌표(지도 세계 0 0 432 240)로 적고, 45°·90°만, 꼭짓점은 빈 땅 안에 둔다
const FOOTPATHS: Pt[][] = [
  // 위 격자 길 끝(세계 120, 24, 둥근 끝 아래)에서 45°로 내려와 왼쪽 공원 길 끝(40, 104)에 닿는 지름길
  [
    { x: 120, y: 24 },
    { x: 40, y: 104 },
  ],
  // 오른쪽 위 격자 길 끝(세계 304, 26)에서 45°로 내려와 집 자리(빈 터 왼쪽, 가운데 높이 80) 쪽으로 가는 길
  [
    { x: 304, y: 26 },
    { x: 256, y: 74 },
  ],
];
const footpaths = FOOTPATHS.map((pts) => pts.map((p) => ({ x: p.x + OX, y: p.y + OY })));
for (const pts of footpaths) {
  // 첫 점은 길(또는 공원 길) 위에서 시작해야 '길 끝에서 이어진 자국'으로 읽힌다. 시드나 STUB_*를 바꿔 길 끝이 옮겨 가면 여기서 걸린다
  const first = pts[0];
  if (first && !streets.some((st) => onSeg(first, st))) problems.push(`오솔길 첫 점이 길 위에 있지 않음: 세계 ${first.x - OX},${first.y - OY}`);
  pts.forEach((p, i) => {
    if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) problems.push(`오솔길 좌표는 정수: ${JSON.stringify(p)}`);
    if (p.x < CLEAR.x0 || p.x > CLEAR.x1 || p.y < CLEAR.y0 || p.y > CLEAR.y1) problems.push(`오솔길이 빈 땅 밖: ${JSON.stringify(p)}`);
    const q = pts[i + 1];
    if (q && q.x !== p.x && q.y !== p.y && Math.abs(q.x - p.x) !== Math.abs(q.y - p.y)) problems.push(`오솔길은 45°·90°만: ${JSON.stringify(p)}→${JSON.stringify(q)}`);
  });
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  console.error('\n안전 구역(docs/MAP.md 1절)은 비워 둬야 하고, 이음매에는 큰길을 두지 않는다. 빈 땅(CLEAR)·STUB_*·FOOTPATHS·강·큰길 자리를 고친다.');
  process.exit(1);
}

// ---------- 쓰기 ----------
const water = new PathOut();
roundedPoly(water, river.poly, river.radii);
const parkOut = new PathOut();
for (const p of parks) roundedPoly(parkOut, p, R_BLOCK);
const blockOut = new PathOut();
for (const b of blocks.sort((p, q) => (p[0]?.y ?? 0) - (q[0]?.y ?? 0) || (p[0]?.x ?? 0) - (q[0]?.x ?? 0))) roundedPoly(blockOut, b, R_BLOCK);

const pathOut = new PathOut();
for (const pts of footpaths) {
  const [first, ...rest] = pts;
  if (!first) continue;
  pathOut.move(first.x, first.y);
  for (const p of rest) pathOut.line(p.x, p.y);
}

const grades: Grade[] = [4, 3, 2, 1];
const lines = [
  `<svg xmlns="http://www.w3.org/2000/svg" x="-${OX}" y="-${OY}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">`,
  `<rect class="ml-land" width="${W}" height="${H}"/>`,
  `<path class="ml-water" d="${water.d}"/>`,
  `<path class="ml-park" d="${parkOut.d}"/>`,
  `<path class="ml-block" d="${blockOut.d}"/>`,
  // 오솔길: 길 테두리 색(ml-street-edge)에 굵기 3. 길이 그 위에 깔려 이어지는 끝을 덮는다
  `<path class="ml-street-edge ml-path" stroke-width="3" d="${pathOut.d}"/>`,
  // 테두리를 모두 먼저 깔고 길을 그 위에 그려야 갈림길에서 테두리가 길을 끊지 않는다
  ...grades.map((g) => `<path class="ml-street-edge ml-g${g}" d="${streetPath(g)}"/>`),
  ...grades.map((g) => `<path class="ml-street ml-g${g}" d="${streetPath(g)}"/>`),
  '</svg>',
];
const svg = `${lines.join('\n')}\n`;
const gz = gzipSync(svg, { level: 9 }).length;
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, svg);
console.log(`land.svg: 블록 ${blocks.length}, 길 토막 ${streets.length}, ${svg.length} B (gzip ${gz} B)`);
if (gz > GZIP_LIMIT) {
  console.error(`gzip ${gz} B가 한도 ${GZIP_LIMIT} B를 넘는다 (docs/MAP.md 2절). 블록 나누기를 줄인다.`);
  process.exit(1);
}
