// 모션 기반 (T06b, D25·D30, v4 D96): 동작 줄이기 판단, 토큰에서 길이 읽기, WAAPI 감싸기, 건너뛰기.
// 장면·비행·길 따라 이동은 게임 요소와 함께 걷어 냈다 (D96).
// 길이는 숫자로 쓰지 않고 늘 tokens.css 변수(--dur-…)에서 읽는다. 동작 줄이기면 토큰 값이 0이 된다 (--dur-fade만 남음).

export type DurToken = `--dur-${string}`;
export type EaseToken = `--ease-${string}`;

/** '240ms', '0.24s', '0' 같은 CSS 시간 값을 ms로. 읽을 수 없으면 0 */
export function parseDuration(v: string): number {
  const s = v.trim();
  const m = s.match(/^(-?[\d.]+)(ms|s)?$/);
  if (!m || m[1] === undefined) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0) return 0;
  return m[2] === 's' ? n * 1000 : n;
}

function root(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.documentElement;
}

/** 기기 설정의 동작 줄이기 또는 사이트 설정(html[data-motion="reduce"]) */
export function reduced(): boolean {
  const html = root();
  if (html?.getAttribute('data-motion') === 'reduce') return true;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 사이트 설정의 동작 줄이기를 html에 붙이거나 뗀다 (첫 그림 전에는 기본 틀의 인라인 스크립트가 한다) */
export function applyMotionPref(motion: 'auto' | 'reduce'): void {
  const html = root();
  if (!html) return;
  if (motion === 'reduce') html.setAttribute('data-motion', 'reduce');
  else html.removeAttribute('data-motion');
}

function cssVar(name: string): string {
  const html = root();
  if (!html || typeof getComputedStyle !== 'function') return '';
  return getComputedStyle(html).getPropertyValue(name);
}

/** 길이 토큰(ms). 동작 줄이기면 --dur-fade 말고는 0 (사이트 설정만 켜져 있어도) */
export function dur(token: DurToken): number {
  if (token !== '--dur-fade' && reduced()) return 0;
  return parseDuration(cssVar(token));
}

/** 곡선 토큰 값 (cubic-bezier·linear()). 없으면 ease-out */
export function ease(token: EaseToken): string {
  return cssVar(token).trim() || 'ease-out';
}

export interface PlayOptions {
  dur: DurToken;
  ease?: EaseToken;
  /** 시작을 늦추는 길이 토큰 (줄이기면 0) */
  after?: DurToken;
  iterations?: number;
}

/** element.animate 감싸기: 토큰 길이·곡선, 끝 상태 유지. 줄이기면 길이 0이라 바로 끝 상태 */
export function play(el: Element, keyframes: Keyframe[], opts: PlayOptions): Animation {
  return el.animate(keyframes, {
    duration: dur(opts.dur),
    delay: opts.after ? dur(opts.after) : 0,
    easing: opts.ease ? ease(opts.ease) : 'ease-out',
    iterations: opts.iterations ?? 1,
    fill: 'both',
  });
}

/** scope 안에서 돌고 있는 애니메이션을 모두 끝 상태로 (누르기·Esc·건너뛰기 버튼). 끝이 없는 반복은 멈춘다 */
export function skipAll(scope?: Element | Document): number {
  const target = scope ?? (typeof document === 'undefined' ? undefined : document);
  if (!target) return 0;
  const list = 'documentElement' in target ? target.getAnimations() : target.getAnimations({ subtree: true });
  for (const a of list) {
    try {
      a.finish();
    } catch {
      a.cancel();
    }
  }
  return list.length;
}
