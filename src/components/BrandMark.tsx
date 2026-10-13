// 브랜드 마크 = 소유자 로고의 그림(기사·차·코드 괄호, D60). 늘 장식이다 (옆의 글이 뜻을 전한다). 낮·밤 두 벌은 src/lib/brand.ts.
import { EMBLEM, NIGHT, srcset } from '../lib/brand.ts';

export function BrandMark({ class: cls }: { class?: string }) {
  return (
    <picture class={cls ? `brand-mark ${cls}` : 'brand-mark'}>
      <source media={NIGHT} srcset={srcset(EMBLEM.night1, EMBLEM.night2)} />
      <img src={EMBLEM.day1} srcset={srcset(EMBLEM.day1, EMBLEM.day2)} width={EMBLEM.width} height={EMBLEM.height} alt="" decoding="async" />
    </picture>
  );
}
