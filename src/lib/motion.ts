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

/** 조용히 모시기 (brief 7절): 큰 장면(S1·S5+S6)을 끝 상태로. 사이트 설정을 html[data-quiet]에 붙인다 (첫 그림 전에는 기본 틀) */
export function quiet(): boolean {
  const html = root();
  return html !== null && html.getAttribute('data-quiet') !== null;
}

export function applyQuietPref(on: boolean): void {
  const html = root();
  if (!html) return;
  if (on) html.setAttribute('data-quiet', '');
  else html.removeAttribute('data-quiet');
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

/** 날릴 것: 누른 때의 자리와 겉모습 (누른 줄은 곧 다시 그려져 사라지므로 미리 떠 둔다) */
export interface FlySource {
  rect: DOMRect;
  ghost: Element;
}

/** 지금 자리와 겉모습을 떠 둔다 (fly의 from) */
export function capture(el: Element): FlySource {
  const ghost = el.cloneNode(true) as Element;
  ghost.setAttribute('aria-hidden', 'true');
  ghost.removeAttribute('id');
  return { rect: el.getBoundingClientRect(), ghost };
}

/**
 * 고르기 비행(S3): 떠 둔 사본을 from 자리에 띄워, 살짝 휜 호(2차 베지어를 12토막)를 따라 to 가운데로 날리며 작아지고 사라진다.
 * 곡선은 애니메이션 전체에 한 번 걸린다 (WAAPI의 easing은 진행률에, 토막 사이는 곧게). 줄이기면 날리지 않는다
 */
export function fly(from: FlySource, to: Element, opts: { dur?: DurToken } = {}): Animation | null {
  if (reduced() || typeof document === 'undefined') return null;
  const a = from.rect;
  const b = to.getBoundingClientRect();
  const g = from.ghost as HTMLElement;
  // 그림자(--elev-2)로 지도 위에 떠 보이게 한다: 어두운 모드에서는 남색 그림이 밤 지도에 묻힌다 (D71 검토 반영)
  Object.assign(g.style, { position: 'fixed', left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, margin: '0', pointerEvents: 'none', zIndex: '50', boxShadow: 'var(--elev-2)' });
  document.body.append(g);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  // 가운데에서 진행 방향의 오른쪽으로 거리의 1/5(최대 64)만큼 비킨 조절점
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(64, len / 5);
  const cx = dx / 2 - (dy / len) * bend;
  const cy = dy / 2 + (dx / len) * bend;
  const end = Math.max(0.3, Math.min(1, b.width / Math.max(1, a.width)));
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    const u = 1 - t;
    const x = 2 * u * t * cx + t * t * dx;
    const y = 2 * u * t * cy + t * t * dy;
    frames.push({ transform: `translate(${x}px, ${y}px) scale(${1 + (end - 1) * t})`, opacity: t < 0.8 ? 1 : 1 - (t - 0.8) * 5 });
  }
  const anim = play(g, frames, { dur: opts.dur ?? '--dur-fly', ease: '--ease-in-out' });
  void anim.finished.catch(() => undefined).then(() => g.remove());
  return anim;
}

/** CSS 이동 경로를 쓸 수 있는가 (없으면 차는 움직이지 않고 끝 자리에 바로 선다) */
export function canDrive(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('offset-path', "path('M0 0')");
}

/**
 * 지도 위 차 이동(S1·S3·S5·S8): 길(d, 지도 단위) 위 from에서 to까지 offset-distance로, 차 머리는 길의 접선(offset-rotate: auto).
 * 이동 경로는 애니메이션 안에만 둔다(fill: backwards): 끝나면 차는 자기 자리(transform 속성)로 돌아가므로,
 * to는 그 자리와 같은 거리여야 한다. 동작 줄이기거나 이동 경로를 못 쓰면 움직이지 않는다
 */
export function drive(car: Element, d: string, from: number, to: number, opts: { dur: DurToken; after?: number }): Animation | null {
  if (from === to || reduced() || !canDrive()) return null;
  const at = (n: number): Keyframe => ({ offsetPath: `path('${d}')`, offsetDistance: `${n}px`, offsetRotate: 'auto', transform: 'none' });
  return car.animate([at(from), at(to)], { duration: dur(opts.dur), delay: opts.after ?? 0, easing: ease('--ease-drive'), fill: 'backwards' });
}
