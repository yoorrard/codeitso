// 색 계산 (T38 디자인 정하기, 설계서 4.4절): WCAG 2.x 명도 대비와 OKLCH. 순수 함수, 새 의존성 없음 (D76).
// OKLab 식은 Björn Ottosson의 공개 식(2020)을 그대로 옮겼다. 색 범위(sRGB) 밖이면 색상(H)·밝기(L)는 두고 채도(C)만 줄인다.
// 자료 검사(scripts/lib/validate.ts)와 엔진(look.ts)이 같은 함수를 써서, 검사가 통과시킨 값과 화면·설계도의 값이 같게 한다.

export interface Oklch {
  /** 밝기 0~1 */
  l: number;
  /** 채도 0~0.4 남짓 */
  c: number;
  /** 색상 각도 0~360 (회색이면 0) */
  h: number;
}

/** '#RRGGBB'(대소문자 무관)인가 */
export function isHex(x: unknown): x is string {
  return typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x);
}

/** '#rrggbb' → '#RRGGBB'. 꼴이 아니면 null */
export function normHex(x: unknown): string | null {
  return isHex(x) ? x.toUpperCase() : null;
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

const toLinear = (v: number): number => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number): number => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

/** WCAG 2.x 상대 휘도. 8비트 값에서는 문턱 0.03928과 0.04045가 같은 결과를 낸다 (scripts/lib/contrast.ts와 같다) */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map(toLinear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 두 색(#RRGGBB)의 명도 대비 1~21 */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** 대비를 소수 둘째 자리에서 버린다 (4.596은 4.59: 기준에 못 미친 값을 반올림으로 통과시키지 않는다) */
export function ratio2(n: number): number {
  return Math.floor(n * 100 + 1e-9) / 100;
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = channels(hex).map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(A, B);
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c: c < 1e-4 ? 0 : c, h };
}

/** OKLCH → 선형 sRGB (범위 밖일 수 있다) */
function oklchToLinear({ l: L, c, h }: Oklch): [number, number, number] {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb: number[]): boolean => rgb.every((v) => v >= -1e-6 && v <= 1 + 1e-6);

/** 이 밝기·색상에서 sRGB 안에 드는 가장 큰 채도 (c 이하) */
export function clampChroma(o: Oklch): Oklch {
  const l = Math.min(1, Math.max(0, o.l));
  if (inGamut(oklchToLinear({ l, c: o.c, h: o.h }))) return { l, c: o.c, h: o.h };
  let [lo, hi] = [0, o.c];
  for (let i = 0; i < 24; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinear({ l, c: mid, h: o.h }))) lo = mid;
    else hi = mid;
  }
  return { l, c: lo, h: o.h };
}

/** OKLCH → '#RRGGBB' (색 범위 밖이면 채도를 줄인다) */
export function oklchToHex(o: Oklch): string {
  const rgb = oklchToLinear(clampChroma(o));
  const byte = (v: number): string =>
    Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${rgb.map(byte).join('')}`.toUpperCase();
}

/**
 * 밝기 L을 step씩 옮기며(색상 그대로, 채도는 색 범위 안으로) 조건을 처음 채우는 색을 찾는다.
 * 처음 색이 이미 채우면 그대로 돌려준다. 끝(0 또는 1)까지 가도 못 채우면 끝 색을 돌려준다
 */
export function shiftUntil(hex: string, step: number, ok: (x: string) => boolean): { hex: string; moved: boolean } {
  if (ok(hex)) return { hex, moved: false };
  const start = hexToOklch(hex);
  for (let i = 1; i <= 100; i += 1) {
    const l = start.l + step * i;
    const next = oklchToHex({ l, c: start.c, h: start.h });
    if (ok(next)) return { hex: next, moved: true };
    if (l <= 0 || l >= 1) return { hex: next, moved: true };
  }
  return { hex: oklchToHex({ l: step < 0 ? 0 : 1, c: start.c, h: start.h }), moved: true };
}
