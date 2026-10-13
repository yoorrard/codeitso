// 섬(Preact)에서 쓰는 직접 그린 SVG 그림 (src/lib/glyphs.ts). 늘 장식이다: 뜻은 옆의 글이 전한다.
import type { Ref } from 'preact';
import { glyph } from '../lib/glyphs.ts';
import { isBlueprint } from '../lib/option-art.ts';

export function Glyph({ name, class: cls }: { name: string; class?: string }) {
  const svg = glyph(name);
  if (!svg) return null;
  return <span class={cls ? `glyph ${cls}` : 'glyph'} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export type TileSize = 'sm' | 'md' | 'lg' | 'xl';

/** 그림 타일 (CONCEPT 5.7): 남색 둥근 네모 안에 밝은 선 그림. 기능 그림·질문 그림·청사진 자리 표시가 같은 틀을 쓴다 */
export function ArtTile({ name, size = 'md', class: cls, tileRef }: { name: string; size?: TileSize; class?: string; tileRef?: Ref<HTMLSpanElement> }) {
  const c = ['art-tile', `tile-${size}`, isBlueprint(name) ? 'is-blueprint' : '', cls ?? ''].filter(Boolean).join(' ');
  return <span ref={tileRef} class={c} aria-hidden="true" dangerouslySetInnerHTML={{ __html: glyph(name) }} />;
}
