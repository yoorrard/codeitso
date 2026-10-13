// 직접 그린 SVG 그림 (docs/CONCEPT.md 5.7·9절): 기능 그림(fn-*), 질문 보기 그림(q-*), 청사진 자리 표시(L00~L06, P01), 브랜드 마크.
// 색은 모두 currentColor라서 화면 CSS가 정한다. 빌드 때 글자로 읽어 HTML에 바로 넣는다 (그림 요청 0, 낮·밤 색이 그대로 따라감).
const files = import.meta.glob<string>(['../assets/icons/*.svg', '../assets/blueprint/*.svg', '../assets/brand/*.svg'], { query: '?raw', import: 'default', eager: true });

const byName = new Map<string, string>();
for (const [path, svg] of Object.entries(files)) {
  const name = path.slice(path.lastIndexOf('/') + 1, -'.svg'.length);
  byName.set(name, svg);
}

/** 그림 이름(파일 이름에서 .svg를 뺀 것) → SVG 글. 없으면 빈 글 (그림 없이 이름만 보인다) */
export function glyph(name: string): string {
  return byName.get(name) ?? '';
}

export function hasGlyph(name: string): boolean {
  return byName.has(name);
}
