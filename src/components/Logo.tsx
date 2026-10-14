// 섬 안에서 쓰는 로고 (정적 화면은 Logo.astro). 벌의 경로 자료(art)는 부르는 쪽이 이름으로 가져와 넘긴다:
// LOGO 묶음을 여기서 가져오면 모든 벌이 섬 묶음에 들어가기 때문이다 (예: import { LOGO_BADGE } from '../lib/logo-paths.ts').
// 색은 frame.css의 .logo-* 규칙이 --logo-* 토큰으로 칠한다. label이 없으면 장식(aria-hidden).
import type { LogoArt, LogoVariant } from '../lib/logo-paths.ts';
import { logoA11y, logoWidth } from '../lib/logo.ts';

interface Props {
  variant: LogoVariant;
  art: LogoArt;
  /** 그릴 높이(CSS px). 폭은 viewBox 비율로 정한다 */
  height: number;
  label?: string;
  class?: string;
}

export function Logo({ variant, art, height, label, class: cls }: Props) {
  return (
    <svg
      class={cls ? `logo logo--${variant} ${cls}` : `logo logo--${variant}`}
      viewBox={art.viewBox}
      width={logoWidth(art, height)}
      height={height}
      {...logoA11y(label)}
      dangerouslySetInnerHTML={{ __html: art.markup }}
    />
  );
}
