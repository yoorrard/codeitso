// 로고 벌(logo-paths.ts, D65)을 화면에 놓을 때의 크기 셈과 접근성 속성. Logo.astro와 Logo.tsx가 같이 쓴다.
import type { LogoArt } from './logo-paths.ts';

/** 그릴 높이(CSS px)를 주면 viewBox 비율대로 폭을 낸다 (소수 첫째 자리까지) */
export function logoWidth(art: LogoArt, height: number): number {
  const [, , w = 1, h = 1] = art.viewBox.split(' ').map(Number);
  return Math.round(((height * w) / h) * 10) / 10;
}

/** 이름이 있으면 그림으로 읽고, 없으면 장식으로 숨긴다 (이름은 곁의 글이 전한다) */
export function logoA11y(label?: string): Record<string, string> {
  return label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true', focusable: 'false' };
}
