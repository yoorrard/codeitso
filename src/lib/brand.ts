// 소유자 로고(D60)의 화면용 그림 경로. npm run logo가 public/brand/에 낮·밤 두 벌, 1배·2배로 만든다.
// 밤 지도에서는 로고 남색이 바탕에 묻혀서 남색 칸만 밝게 바꾼 밤용 그림을 쓴다 (<picture>의 prefers-color-scheme).
export interface BrandImage {
  day1: string;
  day2: string;
  night1: string;
  night2: string;
  width: number;
  height: number;
}

/** 기사·차·코드 괄호 (글자 상표 뺌). 1배 너비 48 */
export const EMBLEM: BrandImage = {
  day1: '/brand/emblem-48.webp',
  day2: '/brand/emblem-96.webp',
  night1: '/brand/emblem-night-48.webp',
  night2: '/brand/emblem-night-96.webp',
  width: 48,
  height: 41,
};

/** 글자 상표 '코드쇼퍼' (코드 남색, 쇼퍼 파랑). 1배 너비 112 */
export const WORDMARK: BrandImage = {
  day1: '/brand/wordmark-112.webp',
  day2: '/brand/wordmark-224.webp',
  night1: '/brand/wordmark-night-112.webp',
  night2: '/brand/wordmark-night-224.webp',
  width: 112,
  height: 27,
};

export const NIGHT = '(prefers-color-scheme: dark)';

export function srcset(a: string, b: string): string {
  return `${a} 1x, ${b} 2x`;
}
