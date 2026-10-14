// 출발 → 도착 장면 S5 (brief 7절, D71 W5b·검토 반영): 도구끼리 맞춰 보기의 [설계도 받으러 출발하기]로 처음 왔을 때 한 번 (src/lib/depart.ts).
// 지도는 이미 도착한 끝 모습이다(차는 빈 터 앞, 지난 마디 ✓, 윤곽 실선·두루마리·깃발). 장면은 그 위에 얹는 애니메이션이라
// (fill: backwards) 끝나거나 건너뛰면 그린 그대로 남는다. 시간표는 src/lib/arrival-plan.ts, 영수증 출력·도장(S6)은 설계도 받기 섬이 같은 시계로 맞춘다.
//   0~300 밤 주행 모드: 지도 판의 색 변수만 밤 값으로(tokens.css .map-board[data-night]), --route-halo가 켜진다
//   300~go 되돌아보기: 지도 판이 1.2배로 기울며 출발부터 지나온 길을 훑고, 차 뒤의 지난 마디에 차례로 ✓(--dur-ui 스프링).
//     차는 도구끼리 맞춰 보기에서 서 있던 자리에 그대로 있다 (페이지가 바뀌어도 차가 출발로 튀지 않게)
//   go~1500 마지막 접근: 차가 남은 길을 한 번에 달려(--ease-drive 하나) 빈 터 앞에 서고 카메라가 따라간다. 차 앞의 지난 마디는 지날 때 ✓
//   1500~1820 전조등 두 번 깜빡임(브랜드 서명, 앞으로 짧은 빛) · 1500~1900 윤곽이 실선으로, 두루마리가 놓이고, 깃발이 오른다
//   1900~2300 지도가 낮으로 돌아오고 기울기가 풀린다 · 1980~2300 시트가 올라온다(--ease-drawer)
//   2300 영수증 종이가 화면에 보이면 출력(S6)이 이어지고 [건너뛰기]도 3000까지. 보이지 않으면 장면은 여기서 끝난다(출력은 종이가 처음 보일 때)
// 장면 동안 지도 띠의 아래쪽 자르기를 푼다(map.css [data-driving]): 시트를 내려 둔 사이 기울어진 밤 땅이 화면을 채운다.
// 이 파일은 지도 섬이 장면을 돌릴 때만 불러온다(지도 섬 묶음을 키우지 않으려고).
import type { DurToken, EaseToken } from '../motion.ts';
import { canDrive, dur, ease } from '../motion.ts';
import { arrivalPlan, BLINK_DIM, blinkSteps } from '../arrival-plan.ts';
import { departing, markChimed, markDeparted, printLater, sceneClock, untilScene, wasChimed } from '../depart.ts';
import { sfx } from '../sfx.ts';
import type { MapModel, MapNode, Pt } from './model.ts';
import { restPose } from './rest.ts';

const NS = 'http://www.w3.org/2000/svg';

/** 밤으로 넘기는 지도 색 (tokens.css .map-board[data-night]). 색으로 등록한 것(map.css @property)은 섞이며, 나머지는 반쯤에서 바뀐다 */
const NIGHT_VARS = [
  '--map-land',
  '--map-block',
  '--map-road',
  '--map-road-edge',
  '--map-water',
  '--map-park',
  '--map-ghost',
  '--route-outer',
  '--route-core',
  '--route-halo',
  '--node-fill',
  '--on-node',
  '--map-car',
  '--map-car-light',
  '--map-car-edge',
  '--map-flag',
  '--map-lot',
  '--map-roof',
  '--text',
  '--text-2',
  '--text-3',
  '--surface',
  '--ok',
] as const;

/** 따라갈 때: 1.2배, 위가 멀어지게 기울임, 보는 점을 가운데 쪽으로 (다 따라가면 차가 멈춰 보여 4/5만) */
const ZOOM = 1.2;
const TILT_DEG = 18;
const DEPTH_PX = 640;
const FOLLOW = 0.8;
/** 도구끼리 맞춰 보기의 자리를 모를 때 출발에서 차가 서는 거리 (출발 표지 반쪽 14 + 띄움 4 + 차 반쪽 18) */
const START_GAP = 36;

/** 곡선(cubic-bezier) 위에서 진행 y에 닿는 시간의 몫: 한 번에 달리는 차가 앞의 마디를 지나는 때 */
function timeAt(curve: string, y: number): number {
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = (curve.match(/-?[\d.]+/g) ?? []).map(Number);
  const b = (p1: number, p2: number, t: number): number => 3 * p1 * t * (1 - t) ** 2 + 3 * p2 * t * t * (1 - t) + t ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (b(y1, y2, mid) < y) lo = mid;
    else hi = mid;
  }
  return b(x1, x2, (lo + hi) / 2);
}

/** 지금 색과 밤 색: 지도 판에 data-night를 잠깐 붙여 읽는다 (그리기 전에 떼므로 깜빡이지 않는다) */
function palettes(svg: Element): [Keyframe, Keyframe] {
  const cs = getComputedStyle(svg);
  const read = (): Keyframe => Object.fromEntries(NIGHT_VARS.map((v) => [v, cs.getPropertyValue(v).trim()]));
  const day = read();
  svg.setAttribute('data-night', '');
  const night = read();
  svg.removeAttribute('data-night');
  return [day, night];
}

/** 길(routeD) 위 거리들의 점 (지도 단위). 잠깐 path를 붙여 잰다 */
function pointsOn(fx: Element, d: string, dists: number[]): Pt[] {
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', d);
  fx.append(p);
  const out = dists.map((n) => {
    const q = p.getPointAtLength(n);
    return { x: q.x, y: q.y };
  });
  p.remove();
  return out;
}

/** fromDist: 도구끼리 맞춰 보기에서 차가 서 있던 거리(routeD 위). 모르면 출발 바로 앞에서 떠난다 */
export function arriveScene(svg: SVGSVGElement, m: MapModel, fromDist?: number): Animation[] {
  const fx = svg.querySelector('.mb-fx-n');
  const car = svg.querySelector<SVGGElement>('.mb-car');
  // 이 모듈을 받는 사이에 화면을 누르거나 Esc로 건너뛰었으면 돌리지 않는다 (끝 모습 그대로, D71 검토 반영)
  if (!fx || !car || !departing()) return [];
  markDeparted();
  const ms = (t: DurToken): number => dur(t);
  const passed = m.nodes.filter((n) => n.passed).sort((a, b) => a.dist - b.dist);
  const lot = restPose(m.routeD, m.car).dist;
  const from = Math.min(lot, fromDist ?? Math.min(START_GAP, (passed[0]?.dist ?? lot) / 2));
  const p = arrivalPlan(ms, (lot - from) / Math.max(1, m.routeLength));
  const drive = ease('--ease-drive');
  const inOut = ease('--ease-in-out');
  // 모든 애니메이션을 장면 0에 묶는다 (시작 시각을 박는다): 만든 뒤 첫 그림까지 기다리는 사이만큼 늦게 돌지 않게.
  // 그래야 영수증 섬의 시계(setTimeout, untilScene)와 시트·카메라가 같은 때를 본다. 이미 지난 때는 그만큼 진행한 모습으로 시작한다
  const zero = sceneClock();
  const pin = (a: Animation): Animation => {
    a.startTime = zero;
    return a;
  };
  const out: Animation[] = [];
  const play = (e: Element, frames: Keyframe[], d: DurToken, at: number, curve: EaseToken = '--ease-out', fill: FillMode = 'backwards'): Animation => {
    const a = pin(e.animate(frames, { duration: dur(d), delay: at, easing: ease(curve), fill }));
    out.push(a);
    return a;
  };
  const settled = (a: Animation): Promise<unknown> => a.finished.catch(() => undefined);

  // 장면 전체 길이 (영수증 출력이 끝날 때까지 [건너뛰기]를 둔다. 종이가 화면 밖이면 출력 때 끝낸다: 아래)
  const whole = pin(svg.animate([], { duration: p.end }));
  out.push(whole);

  // 밤 주행 모드 → 낮 (지도 판의 색 변수만). 둘로 나눈다: 가운데 밤 동안(300~1900) 색 변수 23개를 그림마다 다시 셈하지 않게.
  // 밤은 끝난 애니메이션이 붙들고(fill), 낮으로는 그 위에 얹는다. 다 돌아오면(건너뛰어도) 둘 다 떼어 지도 판이 제 색을 따르게
  const [day, night] = palettes(svg);
  const toNight = pin(svg.animate([day, night], { duration: p.night, easing: inOut, fill: 'both' }));
  const toDay = pin(svg.animate([night, day], { duration: ms('--dur-settle'), delay: p.day, easing: inOut, fill: 'forwards' }));
  out.push(toNight, toDay);
  void settled(toDay).then(() => {
    toNight.cancel();
    toDay.cancel();
  });

  // 카메라: 지도 판이 1.2배로 기울며 출발 → 차 뒤의 지난 마디 → 차를 차례로 보고(되돌아보기), 차를 따라 빈 터로. 낮으로 돌아올 때 풀린다
  const box = svg.getBoundingClientRect();
  const s = box.width / m.width;
  const cam = (q: Pt | null, k: number): string => {
    const dx = q ? -(q.x * s - box.width / 2) * FOLLOW : 0;
    const dy = q ? -(q.y * s - box.height / 2) * FOLLOW : 0;
    return `perspective(${DEPTH_PX}px) rotateX(${TILT_DEG * k}deg) scale(${1 + (ZOOM - 1) * k}) translate(${dx}px, ${dy}px)`;
  };
  const back = p.day + ms('--dur-settle');
  const behind = passed.filter((n) => n.dist <= from);
  const ahead = passed.filter((n) => n.dist > from);
  const [carAt = m.start, lotAt = m.start] = pointsOn(fx, m.routeD, [from, lot]);
  const look: Pt[] = [m.start, ...behind, carAt];
  const step = (p.go - p.night) / look.length;
  const camFrames: Keyframe[] = [
    { transform: cam(null, 0), offset: 0 },
    { transform: cam(null, 0), offset: p.night / back, easing: inOut },
    ...look.map((q, i): Keyframe => ({ transform: cam(q, 1), offset: (p.night + (i + 1) * step) / back, easing: i === look.length - 1 ? drive : inOut })),
    { transform: cam(lotAt, 1), offset: p.arrive / back },
    { transform: cam(lotAt, 1), offset: p.day / back, easing: inOut },
    { transform: cam(null, 0), offset: 1 },
  ];
  const camera = pin(svg.animate(camFrames, { duration: back, fill: 'backwards' }));
  out.push(camera);

  // 지난 마디의 ✓: 차 뒤의 것은 카메라가 볼 때, 차 앞의 것은 차가 지날 때 톡
  const tick = (n: MapNode, at: number): void => {
    const done = svg.querySelector(`[data-k="${n.id}"] .mb-done`);
    if (done) play(done, [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], '--dur-ui', at, '--ease-spring');
  };
  behind.forEach((n, i) => tick(n, p.night + (i + 2) * step));
  const run = p.arrive - p.go;
  ahead.forEach((n) => tick(n, p.go + run * timeAt(drive, (n.dist - from) / Math.max(1, lot - from))));

  // 차: 도구끼리 맞춰 보기에서 선 자리에서 남은 길을 한 번에 달려 빈 터 앞으로. 마디마다 서지 않는다(곡선은 효과 전체에 하나).
  // 이동 경로는 애니메이션 안에만, 끝 자리는 그려 둔 자리와 같은 거리
  if (canDrive() && lot > from) {
    const at = (n: number): Keyframe => ({ offsetPath: `path('${m.routeD}')`, offsetDistance: `${n}px`, offsetRotate: 'auto', transform: 'none' });
    out.push(pin(car.animate([at(from), at(lot)], { duration: run, delay: p.go, easing: drive, fill: 'backwards' })));
  }
  // 전조등: 달리는 동안 낮춰 두었다가 빈 터 앞에서 두 번 깜빡이고 켜진 채 (앞으로 짧은 빛이 함께 깜빡인다)
  const blink = ms('--dur-blink');
  const lightsEnd = p.arrive + blink;
  const steps = blinkSteps(blink);
  const lightFrames = (on: number, off: number): Keyframe[] => [
    { opacity: off, offset: 0, easing: 'step-end' },
    ...steps.map((b): Keyframe => ({ opacity: b.on ? on : off, offset: (p.arrive + b.at) / lightsEnd, easing: 'step-end' })),
    { opacity: on, offset: 1 },
  ];
  const lights = car.querySelector('.mb-car-lights');
  if (lights) out.push(pin(lights.animate(lightFrames(1, BLINK_DIM), { duration: lightsEnd, fill: 'backwards' })));
  const beam = document.createElementNS(NS, 'path');
  beam.setAttribute('class', 'mb-beam');
  beam.setAttribute('d', 'M14 -5L30 -10V-1ZM14 5L30 1V10Z');
  car.append(beam);
  const glow = pin(beam.animate([...lightFrames(1, 0).slice(0, -1), { opacity: 0, offset: 1 }], { duration: lightsEnd, fill: 'both' }));
  out.push(glow);
  void glow.finished.catch(() => undefined).then(() => beam.remove());

  // 빈 터: 점선 윤곽이 실선으로(밑에 점선 사본을 깔았다 걷는다), 두루마리가 놓이고, 깃발이 오른다
  const bp = svg.querySelector('.mb-bp');
  if (bp) {
    const dashed = bp.cloneNode() as SVGElement;
    dashed.classList.add('is-dashed');
    bp.before(dashed);
    const a = play(dashed, [{ opacity: 1 }, { opacity: 0 }], '--dur-settle', p.arrive, '--ease-in-out', 'both');
    void a.finished.catch(() => undefined).then(() => dashed.remove());
    play(bp, [{ opacity: 0 }, { opacity: 1 }], '--dur-settle', p.arrive, '--ease-in-out');
  }
  const scroll = svg.querySelector('.mb-scroll');
  if (scroll) play(scroll, [{ opacity: 0, transform: 'translateY(-8px) scale(1.15)' }, { opacity: 1, transform: 'none' }], '--dur-settle', p.arrive);
  const flag = svg.querySelector('.mb-flag');
  if (flag) play(flag, [{ transform: 'scaleY(0.3)' }, { transform: 'none' }], '--dur-settle', p.arrive, '--ease-spring');

  // 시트: 빈 터에 닿은 뒤 아래에서 올라온다 (첫 그림 전에는 CSS가 내려 두었다: arrival.css).
  // 내려 둔 동안은 inert: Tab으로 화면 밖 시트에 초점이 들어가 페이지가 굴러가지 않게 (WCAG 2.4.11, D71 검토 반영)
  const sheet = document.querySelector<HTMLElement>('.content-sheet.on-map');
  let rise: Animation | null = null;
  if (sheet) {
    const down = Math.max(0, window.innerHeight - sheet.getBoundingClientRect().top);
    rise = play(sheet, [{ transform: `translateY(${down}px)` }, { transform: 'none' }], '--dur-sheet', p.sheet, '--ease-drawer');
    sheet.inert = true;
    void settled(rise).then(() => {
      sheet.inert = false;
    });
  }

  // 지도 띠의 아래쪽 자르기를 푼다: 시트를 내려 둔 사이 띠 밖까지 그려 둔 땅이 화면을 채운다. 시트가 올라오고 카메라가 풀리면 다시 자른다
  const band = svg.closest('.map-band');
  if (band) {
    band.setAttribute('data-driving', '');
    void Promise.all([settled(camera), ...(rise ? [settled(rise)] : [])]).then(() => band.removeAttribute('data-driving'));
  }

  // 영수증(S6): 시트가 다 올라왔을 때 종이가 화면에 보이면 출력이 이어진다(장면 끝까지 [건너뛰기]). 보이지 않으면 설계도 받기 섬이
  // 출력을 미루고 알린다(Receipt.tsx, src/lib/depart.ts): 그러면 장면은 시트가 다 올라온 때(print) 끝난다. 정하는 쪽은 섬 하나다
  const cut = (): void => whole.effect?.updateTiming({ duration: p.print });
  if (printLater()) cut();
  else document.addEventListener('cc:print-later', cut, { once: true });

  // 도착 차임: 빈 터에 닿을 때. 건너뛰면 바로 (영수증 섬이 장면 끝에 도장 '쿵'을 낸다)
  const chime = (): void => {
    if (wasChimed()) return;
    markChimed();
    void sfx('arrive');
  };
  const timer = window.setTimeout(chime, Math.max(0, untilScene(p.arrive)));
  document.addEventListener(
    'cc:skip',
    () => {
      window.clearTimeout(timer);
      chime();
    },
    { once: true },
  );
  return out;
}
