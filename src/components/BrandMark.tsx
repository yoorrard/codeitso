// 브랜드 마크 (docs/CONCEPT.md 5.7): 둥근 네모 안의 끊긴 금색 고리 + 목적지 점. 그림(src/assets/brand/mark.svg)이 있으면 그것을,
// 없으면 CSS로 그린 고리를 쓴다. 늘 장식이다 (옆의 글자 상표나 글이 뜻을 전한다).
import { glyph } from '../lib/glyphs.ts';

export function BrandMark({ class: cls }: { class?: string }) {
  const svg = glyph('mark');
  const c = cls ? `brand-mark ${cls}` : 'brand-mark';
  if (!svg) return <span class={c} aria-hidden="true" />;
  return <span class={`${c} has-svg`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
