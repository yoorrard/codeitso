// 지도 장면 S2·S3·S4 (CONCEPT 7절, brief 7절, D71). 지도 섬(MapBoard)이 그린 뒤 앞 모형과 새 모형을 견주어, 바뀐 것만 움직인다.
// 화면은 이미 끝 상태로 그려져 있다: 애니메이션은 모두 fill: backwards라 끝나거나 건너뛰면(finish) 그린 그대로 남는다.
// 잠깐 쓰는 그림(밑에 깔 옛 길, 가림막, 훑는 빛)은 지도 판의 빈 층(.mb-fx-r 길 밑 · .mb-fx-n 길과 마디 사이)에 붙였다가 끝나면 지운다.
//   S2 지도가 자라요 (만들 앱 정하기): 새 마디 톡(--dur-pop 스프링) · 앞 점에서 새 마디까지 길 이어 그리기 · 자리를 옮긴 마디·이름표 미끄러짐(--dur-draw)
//      · 빈 터 청사진 윤곽 비침(--dur-draw) · 집·굴 톡. 느낌 색은 map.css의 @property 전환. 동작 줄이기면 새로 생긴 것만 --dur-fade로 비친다.
//   S3 정하면 이어져요 (도구 고르기): 줄의 그림이 마디로 날아감(--dur-fly, 마디가 화면에 안 보이면 날지 않음) → 마디 남색 채움(--dur-ui 스프링)
//      · 점선이 실선으로(--dur-draw) · 차가 다음 자리로(--dur-hop). 숫자 굴리기는 상태 한 줄(StatusLine)이 한다.
//   S4 교통 정보 (도구끼리 맞춰 보기): 들어오면 교통 색 덮기(--dur-pop) → 막힌 길·마디·표지 두 번 진해짐(--dur-pulse, 1초에 고르게 2번)
//      · 풀면 빨강이 걷히고 초록이 그려짐(--dur-draw) · 그대로 가면 노랑 + 물음표 꽂힘(--dur-stamp)
//      · 다 풀리면 청록 짧은 대시가 출발에서 빈 터까지(--dur-sweep, 같은 빠르기) → 주 버튼 켜짐(--dur-ui)
// 한 번에 움직이는 길은 둘까지다(이어 그리기는 앞 둘만, 점선 → 실선은 한 줄기로 묶는다).
import type { DurToken, EaseToken, FlySource } from '../motion.ts';
import { drive, dur, ease, fly, reduced } from '../motion.ts';
import type { MapLabel, MapModel, MapRoad, NodeState } from './model.ts';
import { restPose } from './rest.ts';

/** 도구 고르기의 [{도구}로 정하기]가 남기는 신호: 어느 칸을, 어디서(떠 둔 줄 그림) */
export interface MapCue {
  slot: string;
  from: FlySource | null;
}

export interface SceneCtx {
  stage: string | undefined;
  /** 지금 출발할 수 있다 (r.canIssue) */
  clear: boolean;
  /** 앞 그림에서 출발할 수 있었다 */
  wasClear: boolean | undefined;
  cue: MapCue | null;
  /** 지난번 도구끼리 맞춰 보기에서 막혀 있던 마디 (다른 화면에서 고치고 돌아오면 '뚫림') */
  lastJams: readonly string[];
}

const NS = 'http://www.w3.org/2000/svg';
let seq = 0;

function add(parent: Element, tag: string, attrs: Record<string, string | number>): Element {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}

/** 애니메이션이 끝나거나 건너뛰거나 취소되면 할 일 */
function after(a: Animation | null, done: () => void): void {
  if (a) void a.finished.catch(() => undefined).then(done);
  else done();
}

function run(e: Element, frames: Keyframe[], d: DurToken, o: { at?: number; ease?: EaseToken; fill?: FillMode } = {}): Animation {
  return e.animate(frames, { duration: dur(d), delay: o.at ?? 0, easing: ease(o.ease ?? '--ease-out'), fill: o.fill ?? 'backwards' });
}

const POP: Keyframe[] = [{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'none' }];
const FADE: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];

/**
 * S4 막힌 길 두 번 진해짐 (1 → 0.45 → 1 두 번): 키프레임을 고르게(0 · 0.25 · 0.5 · 0.75 · 1) 두고 곡선은 토막마다 건다.
 * 애니메이션 전체에는 --ease-linear를 건다: 전체에 곡선을 걸면 두 번이 앞쪽에 몰린다(가장 옅은 때 124·349ms, D71 검토 반영).
 * 그래서 가장 옅은 때가 --dur-pulse의 1/4·3/4, 1초에 고르게 2번이다 (tests/lib/scene-times.test.ts가 곡선을 표본으로 잰다)
 */
export function pulseFrames(curve: string): Keyframe[] {
  const at = [1, 0.45, 1, 0.45, 1];
  return at.map((opacity, i) => ({ opacity, offset: i / (at.length - 1), ...(i < at.length - 1 ? { easing: curve } : {}) }));
}

/** 길 한 토막을 앞에서부터 그린다: 가림막(mask) 안의 굵은 선을 from → to 거리까지 늘린다 (routeD 위 거리, 지도 단위) */
function reveal(fx: Element, targets: Element[], d: string, len: number, from: number, to: number, o: { dur: DurToken; at?: number }): Animation | null {
  if (targets.length === 0 || to <= from) return null;
  const id = `mb-rv${(seq += 1)}`;
  const mask = add(fx, 'mask', { id, maskUnits: 'userSpaceOnUse' });
  const p = add(mask, 'path', { d, class: 'mb-mask', pathLength: len, 'stroke-dasharray': `${len} ${len * 2}` });
  for (const t of targets) t.setAttribute('mask', `url(#${id})`);
  const a = p.animate([{ strokeDashoffset: len - from }, { strokeDashoffset: len - to }], {
    duration: dur(o.dur),
    delay: o.at ?? 0,
    easing: ease('--ease-in-out'),
    fill: 'both',
  });
  after(a, () => {
    for (const t of targets) t.removeAttribute('mask');
    mask.remove();
  });
  return a;
}

/** 옛 모습을 밑에 잠깐 깐다 (점선 길, 빨간 길, 교통 색 전 내 길). a가 끝나면 지운다 */
function under(fx: Element, roads: MapRoad[], cls: string, a: Animation | null): Element | null {
  if (roads.length === 0) return null;
  const g = add(fx, 'g', { class: cls });
  for (const r of roads) {
    if (cls.includes('is-ghost')) add(g, 'path', { d: r.d });
    else {
      add(g, 'path', { d: r.d, class: 'mb-outer' });
      add(g, 'path', { d: r.d, class: 'mb-core' });
    }
  }
  after(a, () => g.remove());
  return g;
}

/** 이름표: 출발 · 빈 터 · 마디 (MapSvg의 data-k 'l:…'와 같은 이름) */
const labelsOf = (m: MapModel): [string, MapLabel][] => [['start', m.start.label], ['lot', m.lot.label], ...m.nodes.map((n): [string, MapLabel] => [n.id, n.label])];

/** 지도 판의 요소 (MapSvg가 data-k로 이름을 붙였다) */
function pick(svg: Element, k: string): Element[] {
  return [...svg.querySelectorAll(`[data-k="${k}"]`)];
}

/** 화면에 실제로 보이는가 (머리줄·시트에 가렸거나 굴려서 밖에 있으면 날지 않는다) */
function onScreen(svg: Element, e: Element): boolean {
  const b = e.getBoundingClientRect();
  if (b.width === 0) return false;
  const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  return hit !== null && svg.contains(hit);
}

/** 다 풀림: 청록 짧은 대시 하나가 출발에서 빈 터까지 훑고, 아래 막대의 주 버튼이 켜진다 */
function sweep(svg: Element, fx: Element, m: MapModel, at: number): (Animation | null)[] {
  const len = m.routeLength;
  const dash = 28;
  const p = add(fx, 'path', { d: m.routeD, class: 'mb-sweep', pathLength: len, 'stroke-dasharray': `${dash} ${len * 2}` });
  const a = p.animate([{ strokeDashoffset: dash + 4 }, { strokeDashoffset: -len - 4 }], {
    duration: dur('--dur-sweep'),
    delay: at,
    easing: ease('--ease-linear'),
    fill: 'both',
  });
  after(a, () => p.remove());
  // 아래 막대 섬이 이 그림보다 늦게 다시 그려질 수 있어 꺼짐 표시와 상관없이 찾는다 (같은 버튼 요소가 켜짐으로 바뀐다)
  const btn = svg.ownerDocument.querySelector('.action-bar .btn-issue');
  return [a, btn ? run(btn, [{ opacity: 0.5 }, { opacity: 1 }], '--dur-ui', { at: at + dur('--dur-sweep') }) : null];
}

/** 막힌 길이 풀렸다: 밑에 깐 빨간 길이 걷히고 새 길(초록·노랑)이 그려진다 */
function unjam(svg: Element, fxR: Element, m: MapModel, roads: MapRoad[], distOf: (id: string) => number, at: number): (Animation | null)[] {
  const out: (Animation | null)[] = [];
  for (const r of roads.slice(0, 2)) {
    const els = pick(svg, r.id);
    // 그대로 가기(서행): 노랑이 빨강 위로 비친다. 풀림(원활): 초록이 출발 쪽에서부터 그려진다
    const a = r.state === 'slow' ? els.map((e) => run(e, FADE, '--dur-stamp', { at }))[0] ?? null : reveal(fxR, els, m.routeD, m.routeLength, distOf(r.from), distOf(r.to), { dur: '--dur-draw', at });
    const red = under(fxR, [r], 'mb-road is-jam', a);
    // 걷힌 빨강은 지울 때까지 안 보이게 남긴다 (fill: both)
    if (red) out.push(run(red, [{ opacity: 1 }, { opacity: 0 }], r.state === 'slow' ? '--dur-stamp' : '--dur-draw', { at, fill: 'both' }));
    out.push(a);
  }
  return out;
}

/**
 * 앞 모형(prev)에서 새 모형(next)으로 바뀐 것을 움직인다. prev가 없으면 화면에 막 들어온 것(S4 들어오기만).
 * 돌린 애니메이션을 돌려준다 (장면 틀이 [건너뛰기]를 보이는 데 쓴다)
 */
export function animateMap(svg: SVGSVGElement, prev: MapModel | null, next: MapModel, c: SceneCtx): Animation[] {
  const fxR = svg.querySelector('.mb-fx-r');
  const fxN = svg.querySelector('.mb-fx-n');
  if (!fxR || !fxN) return [];
  const out: (Animation | null)[] = [];
  const distOf = (id: string): number => (id === 'start' ? 0 : id === 'lot' ? next.routeLength : (next.nodes.find((n) => n.id === id)?.dist ?? 0));
  const mains = next.roads.filter((r) => r.kind === 'main');

  // 들어오기: 도구끼리 맞춰 보기의 교통 정보
  if (!prev) {
    if (c.stage !== 'check' || !next.traffic || reduced()) return [];
    // 지도가 비친 뒤(--dur-fade, map.css .mb-live)에 시작한다: 교통 색을 덮기 전 내 길과 고치기 전 빨간 길이 먼저 보이게
    const t0 = dur('--dur-fade');
    const fixed = mains.filter((r) => c.lastJams.includes(r.to) && r.state !== 'jam' && r.state !== 'ghost');
    const lit = mains.filter((r) => r.state !== 'ghost' && !fixed.includes(r));
    const cover = lit.flatMap((r) => pick(svg, r.id)).map((e) => run(e, FADE, '--dur-pop', { at: t0, ease: '--ease-in-out' }));
    under(fxR, lit, 'mb-fx-plain', cover[0] ?? null);
    out.push(...cover, ...unjam(svg, fxR, next, fixed, distOf, t0));
    const at = t0 + Math.max(dur('--dur-pop'), fixed.length > 0 ? dur('--dur-draw') : 0);
    if (c.clear) out.push(...sweep(svg, fxN, next, at));
    else {
      // 막힌 길과 함께 그 마디와 표지도 같이 진해진다: 짧은 막힌 토막(case-04)은 길만으로는 잘 보이지 않는다
      const jams = mains.filter((x) => x.state === 'jam');
      const marks = next.markers.filter((k) => jams.some((r) => r.to === k.anchor));
      const els = [...jams.flatMap((r) => [...pick(svg, r.id), ...pick(svg, r.to)]), ...marks.flatMap((k) => pick(svg, `m:${k.id}`))];
      const frames = pulseFrames(ease('--ease-in-out'));
      for (const e of els) out.push(run(e, frames, '--dur-pulse', { at, ease: '--ease-linear' }));
    }
    return out.filter((a): a is Animation => a !== null);
  }

  const was = new Map(prev.nodes.map((n) => [n.id, n]));
  const added = next.nodes.filter((n) => !was.has(n.id));

  // 동작 줄이기: 움직이지 않고, 새로 생긴 것만 짧게 비친다 (S2)
  if (reduced()) {
    for (const n of added) for (const e of [...pick(svg, n.id), ...pick(svg, `l:${n.id}`)]) out.push(run(e, FADE, '--dur-fade'));
    return out.filter((a): a is Animation => a !== null);
  }

  // S2: 자리를 옮긴 것은 미끄러지고, 새로 생긴 것은 톡
  const slide = (k: string, dx: number, dy: number): void => {
    if (dx === 0 && dy === 0) return;
    for (const e of pick(svg, k)) out.push(run(e, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], '--dur-draw', { ease: '--ease-in-out' }));
  };
  const pop = (k: string, at = 0): void => {
    for (const e of pick(svg, k)) out.push(run(e, POP, '--dur-pop', { at, ease: '--ease-spring' }));
  };
  for (const n of next.nodes) {
    const p = was.get(n.id);
    if (!p) {
      pop(n.id);
      pop(`l:${n.id}`);
    } else {
      slide(n.id, p.x - n.x, p.y - n.y);
      slide(`s:${n.id}`, p.x - n.x, p.y - n.y);
    }
  }
  const labelsBefore = new Map(labelsOf(prev));
  // 이름표 글이 바뀌면(빈 터 '목적지' → 직접 쓴 앱 이름) 자리 이동이 아니라 새 글이 그 자리에 톡 생긴다
  for (const [k, l] of labelsOf(next)) {
    const b = labelsBefore.get(k);
    if (b && b.text !== l.text) pop(`l:${k}`);
    else if (b) slide(`l:${k}`, b.x - l.x, b.y - l.y);
  }
  // 새 마디까지 길 이어 그리기 (앞 둘만)
  for (const n of added.filter((x) => x.state !== 'later').slice(0, 2)) {
    const r = mains.find((x) => x.to === n.id);
    if (r) out.push(reveal(fxR, pick(svg, r.id), next.routeD, next.routeLength, distOf(r.from), n.dist, { dur: '--dur-draw' }));
  }
  if (next.lot.type && next.lot.type !== prev.lot.type) {
    const bp = svg.querySelector('.mb-bp');
    if (bp) out.push(run(bp, [{ opacity: 0, strokeDashoffset: 14 }, { opacity: 1, strokeDashoffset: 0 }], '--dur-draw'));
  }
  if (next.houses && next.houses.kind !== prev.houses?.kind) pop('houses');
  if (next.tunnel && (!prev.tunnel || prev.tunnel.ghost !== next.tunnel.ghost)) pop('tunnel');
  else if (next.tunnel && prev.tunnel) slide('tunnel', prev.tunnel.x - next.tunnel.x, prev.tunnel.y - next.tunnel.y);

  // S3: 고른 마디. 줄의 그림이 마디로 날아간 뒤 채워진다
  const picked = next.nodes.filter((n) => n.state === 'picked' && was.get(n.id) !== undefined && was.get(n.id)?.state !== 'picked');
  let t = 0;
  // 이미 정한 칸을 다른 도구로 바꿔도 날아가 앉는다 (채움은 새로 고른 마디만)
  const target = c.cue ? next.nodes.find((n) => n.id === c.cue?.slot && n.state === 'picked') : undefined;
  const shape = target ? svg.querySelector(`[data-k="${target.id}"] .mb-shape`) : null;
  if (c.cue?.from && shape && onScreen(svg, shape)) {
    const f = fly(c.cue.from, shape, { dur: '--dur-fly' });
    if (f) {
      out.push(f);
      t = dur('--dur-fly');
    }
  }
  for (const n of picked) {
    const before: NodeState = was.get(n.id)?.state ?? 'ghost';
    // 밑에 까는 '전' 모습: 마디를 통째로 떠서(모양·기능 그림·고깔) 옛 상태로 칠한다. 모양만 깔면 그림이 날아오는 동안 빈 칸이 된다
    const real = pick(svg, n.id)[0];
    if (!real) continue;
    const g = real.cloneNode(true) as Element;
    g.removeAttribute('data-k');
    g.setAttribute('class', `mb-node is-${before}`);
    fxN.append(g);
    for (const e of pick(svg, n.id)) {
      const a = run(e, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], '--dur-ui', { at: t, ease: '--ease-spring' });
      out.push(a);
      after(a, () => g.remove());
    }
  }
  // 점선이 실선으로: 바뀐 토막들을 한 줄기로 (밤 빛도 함께)
  const built = mains.filter((r) => r.state === 'built' && prev.roads.some((p) => p.id === r.id && p.state === 'ghost'));
  if (built.length > 0) {
    const els = [...built.flatMap((r) => pick(svg, r.id)), ...svg.querySelectorAll('.mb-halo')];
    const a = reveal(fxR, els, next.routeD, next.routeLength, Math.min(...built.map((r) => distOf(r.from))), Math.max(...built.map((r) => distOf(r.to))), { dur: '--dur-draw', at: t });
    under(fxR, built, 'mb-road is-ghost', a);
    out.push(a);
  }

  // S4: 막힌 길이 풀림(초록) · 그대로 가기(노랑 + 물음표)
  const unjammed = mains.filter((r) => r.state !== 'jam' && r.state !== 'ghost' && prev.roads.some((p) => p.id === r.id && p.state === 'jam'));
  out.push(...unjam(svg, fxR, next, unjammed, distOf, 0));
  const marks = new Map(prev.markers.map((k) => [k.id, k]));
  for (const k of next.markers) {
    const p = marks.get(k.id);
    if (!p) pop(`m:${k.id}`);
    else if (p.kind !== k.kind) for (const e of pick(svg, `m:${k.id}`)) out.push(run(e, [{ opacity: 0, transform: 'scale(1.3)' }, { opacity: 1, transform: 'none' }], '--dur-stamp'));
    else slide(`m:${k.id}`, p.x - k.x, p.y - k.y);
  }
  if (c.stage === 'check' && c.clear && c.wasClear === false) out.push(...sweep(svg, fxN, next, dur(unjammed.some((r) => r.state !== 'slow') ? '--dur-draw' : '--dur-stamp')));

  // 차: 같은 길 위에서 서는 자리가 바뀌면 길을 따라 간다 (굽는 곳에서는 접선을 따라 돈다)
  if (prev.routeD === next.routeD) {
    const from = restPose(prev.routeD, prev.car).dist;
    const to = restPose(next.routeD, next.car).dist;
    const car = svg.querySelector('.mb-car');
    // 도구끼리 맞춰 보기에서 막힌 곳이 풀려 마디 여럿을 지나가면 --dur-approach로 (도구 고르기는 마디 하나씩이라 --dur-hop)
    const far = c.stage === 'check' && Math.abs(to - from) > 120;
    if (car) out.push(drive(car, next.routeD, from, to, { dur: far ? '--dur-approach' : '--dur-hop', after: t }));
  }
  return out.filter((a): a is Animation => a !== null);
}
