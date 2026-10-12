// 모션 기반 (T06b, D25·D30): 동작 줄이기 판단, 토큰에서 길이 읽기, WAAPI 감싸기, 건너뛰기, 담기 비행, 길 따라 이동.
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

/** 장면을 누르거나 Esc를 누르면 그 안의 애니메이션을 끝낸다. 떼는 함수를 돌려준다 */
export function skippable(scene: HTMLElement): () => void {
  const skip = (): void => {
    skipAll(scene);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') skip();
  };
  scene.addEventListener('pointerdown', skip);
  window.addEventListener('keydown', onKey);
  return () => {
    scene.removeEventListener('pointerdown', skip);
    window.removeEventListener('keydown', onKey);
  };
}

/**
 * 담기 비행(M3): from 자리에 유령 사본을 띄워 to 쪽으로 호를 그리며 날린 뒤 지운다.
 * 줄이기면 날리지 않고 바로 끝난다 (확인 표시와 알림은 부르는 쪽이 한다).
 */
export async function flip(from: Element, to: Element, opts: { dur?: DurToken; lift?: number } = {}): Promise<void> {
  if (reduced() || typeof document === 'undefined') return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const ghost = from.cloneNode(true) as HTMLElement;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.removeAttribute('id');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '50',
  });
  document.body.append(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const lift = opts.lift ?? 80;
  const anim = play(
    ghost,
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${dx / 2}px, ${dy / 2 - lift}px) scale(0.7)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
    ],
    { dur: opts.dur ?? '--dur-move', ease: '--ease-in-out' },
  );
  try {
    await anim.finished;
  } catch {
    // 건너뛰거나 취소해도 유령은 지운다
  }
  ghost.remove();
}

/** 노선도 차 이동(M1): offset-path가 걸린 요소를 offset-distance from → to로 (예: '25%' → '50%') */
export function followPath(el: Element, from: string, to: string, opts: { dur?: DurToken } = {}): Animation {
  return play(el, [{ offsetDistance: from }, { offsetDistance: to }], { dur: opts.dur ?? '--dur-move', ease: '--ease-in-out' });
}
