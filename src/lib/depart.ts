// 출발 → 도착 장면(S5+S6, D71 W5b)을 돌릴지와 장면 시계.
// 기본 틀(Base.astro)의 첫 그림 전 스크립트가 설계도 받기 화면에 html[data-depart]를 붙인다:
//   play = 도구끼리 맞춰 보기의 [설계도 받으러 출발하기]로 처음 왔다(장면을 아직 안 봤다) · still = 같은데 조용히 모시기·동작 줄이기(끝 모습 + 짧은 비침)
//   run = 지도 섬이 장면을 시작했다 · skip = 섬이 붙기 전에 화면을 누르거나 Esc를 눌렀다(끝 모습)
// 지도 섬(지도·시트)과 설계도 받기 섬(영수증 출력·도장)은 따로 붙는다. 먼저 시계를 부른 쪽의 때를 장면 0으로 두고 둘 다 거기에 맞춘다.
import { reduced } from './motion.ts';

let zero: number | null = null;
let chimed = false;
let skipped = false;
// 건너뛰기(화면 누르기·Esc·[건너뛰기], 기본 틀의 cc:skip)를 이 화면에서 한 번이라도 했는가: 섬이 그린 뒤 듣기 시작하기 전에 온 것도 놓치지 않게
if (typeof document !== 'undefined')
  document.addEventListener('cc:skip', () => {
    skipped = true;
  });

function state(): string | null {
  return typeof document === 'undefined' ? null : document.documentElement.getAttribute('data-depart');
}

/** 이 화면에서 출발 → 도착 장면이 돈다 (돌 차례이거나 이미 도는 중) */
export function departing(): boolean {
  const s = state();
  return (s === 'play' || s === 'run') && !reduced();
}

/** 지도 섬이 장면을 시작했다고 적는다 (첫 그림 전에 시트를 내려 두던 CSS가 풀리고 애니메이션이 이어받는다).
 *  섬이 붙기 전에 건너뛴 것(skip)은 덮어쓰지 않는다: 이미 끝 모습을 보는 사람에게 장면이 처음부터 다시 돌지 않게 (D71 검토 반영) */
export function markDeparted(): void {
  if (state() === 'play') document.documentElement.setAttribute('data-depart', 'run');
}

/**
 * el이 보이는 화면(붙박이 아래 막대 위)에 part 이상 들어와 있다. 화면보다 길면 보이는 곳의 절반을 채울 때.
 * 영수증 출력(S6)을 지금 돌릴지 설계도 받기 섬이 정한다
 */
export function inView(el: Element, part = 0.25): boolean {
  const b = el.getBoundingClientRect();
  const bar = document.querySelector('.action-bar:not(.is-static)');
  const bottom = Math.min(window.innerHeight, bar ? bar.getBoundingClientRect().top : window.innerHeight);
  return b.height > 0 && Math.min(b.bottom, bottom) - Math.max(b.top, 0) >= Math.min(b.height * part, bottom / 2);
}

let later = false;

/** 설계도 받기 섬이 출력 때(2300) 종이가 화면 밖이라 출력을 미뤘다고 알린다: 지도 장면은 그때 끝내고 [건너뛰기]를 거둔다 (정하는 쪽은 한 곳) */
export function markPrintLater(): void {
  later = true;
  document.dispatchEvent(new CustomEvent('cc:print-later'));
}

/** 출력을 미뤘다 (지도 장면 모듈이 늦게 와도 알 수 있게) */
export function printLater(): boolean {
  return later;
}

/** 이 화면에서 장면을 건너뛰었다 (설계도 받기 섬은 그러면 종이를 뽑지 않고 다 나온 모습으로 둔다) */
export function wasSkipped(): boolean {
  return skipped;
}

/** 장면 0 (performance.now 기준 ms). 처음 부를 때 정한다 */
export function sceneClock(): number {
  zero ??= performance.now();
  return zero;
}

/** 장면 시각 at(ms)까지 남은 길이. 이미 지났으면 음수다: delay에 그대로 넣으면 그만큼 진행한 모습으로 시작한다 */
export function untilScene(at: number): number {
  return at - (performance.now() - sceneClock());
}

/** 도착 차임을 이미 냈다 (장면 끝의 도장 소리 앞에 다시 내지 않으려고) */
export function markChimed(): void {
  chimed = true;
}

export function wasChimed(): boolean {
  return chimed;
}
