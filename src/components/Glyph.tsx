// 섬(Preact)에서 쓰는 직접 그린 SVG 그림 (src/lib/glyphs.ts). 늘 장식이다: 뜻은 옆의 글이 전한다.
import { glyph } from '../lib/glyphs.ts';

export function Glyph({ name, class: cls }: { name: string; class?: string }) {
  const svg = glyph(name);
  if (!svg) return null;
  return <span class={cls ? `glyph ${cls}` : 'glyph'} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}
