// 품질 바닥선 규칙 (scripts/guard/floor-rules.ts, D67): 금색 이름, 지운 옛 토큰, 로고 파랑·청록 글자, 진한 테두리.
// 시험 문자열 안의 옛 이름은 이 파일이 tests/ 아래라 바닥선이 보지 않는다 (규칙은 src/만 본다).
import { describe, expect, it } from 'vitest';
import { checkSource, cssBlocks } from '../scripts/guard/floor-rules.ts';

const rules = (rel: string, src: string): string[] => checkSource(rel, src).map((f) => `${f.rule}:${f.line}`);
const css = (src: string, rel = 'src/styles/parts.css'): string[] => rules(rel, src);

describe('금색 이름 (no-gold)', () => {
  it('화면 코드의 --gold·--gold-soft·--on-gold를 막는다', () => {
    expect(css('.a {\n  background: var(--gold-soft);\n}')).toEqual(['no-gold:2']);
    expect(css('.a {\n  color: var(--on-gold);\n}')).toEqual(['no-gold:2']);
    expect(rules('src/components/X.tsx', "const s = { background: 'var(--gold)' };")).toEqual(['no-gold:1']);
  });

  it('비슷한 다른 이름과 주석은 놓아준다', () => {
    expect(css('.a {\n  --golden: 1;\n}')).toEqual([]);
    expect(css('/* 옛 --gold는 지웠다 */\n.a {\n  color: var(--text);\n}')).toEqual([]);
  });

  it('토큰 파일의 남은 별명은 이유를 적은 예외로만', () => {
    expect(rules('src/styles/tokens.css', ':root {\n  --gold: var(--accent); /* floor-guard-ignore: 그림 이전 대기 */\n}')).toEqual([]);
    expect(rules('src/styles/tokens.css', ':root {\n  --gold: var(--accent);\n}')).toEqual(['no-gold:2']);
    expect(rules('src/styles/tokens.css', ':root {\n  --gold: var(--accent); /* floor-guard-ignore: */\n}')).toEqual(['ignore-reason:2']);
  });
});

describe('지운 옛 토큰 (old-token)', () => {
  it('옛 이름을 막는다', () => {
    expect(css('.a {\n  color: var(--ink-soft);\n  border-radius: var(--radius);\n  font-size: var(--text-sm);\n}')).toEqual(['old-token:2', 'old-token:3', 'old-token:4']);
    expect(css('.a {\n  background: var(--card, white);\n}')).toEqual(['old-token:2']);
  });

  it('같은 머리의 새 이름은 놓아준다', () => {
    expect(css('.a {\n  color: var(--text);\n  color: var(--text-2);\n  border-radius: var(--radius-sm);\n  min-block-size: var(--btn-sm);\n  line-height: var(--leading-body);\n}')).toEqual([]);
  });

  it('토큰 파일과 화면 밖(시험·스크립트)은 보지 않는다', () => {
    expect(rules('src/styles/tokens.css', ':root {\n  --paper: var(--bg);\n  --x: var(--paper);\n}')).toEqual([]);
    expect(rules('scripts/x.ts', "const v = 'var(--ink)';")).toEqual([]);
  });
});

describe('로고 파랑·청록 글자 (brand-color-text)', () => {
  it('color에 --brand-blue·--cyan을 쓰면 막는다', () => {
    expect(css('.a {\n  color: var(--brand-blue);\n}')).toEqual(['brand-color-text:2']);
    expect(css('.a {\n  font-weight: 600;\n  color:var(--cyan);\n}')).toEqual(['brand-color-text:3']);
  });

  it('@media 안의 규칙도 규칙마다 본다', () => {
    expect(css('@media (min-width: 768px) {\n  .a {\n    color: var(--cyan);\n  }\n}')).toEqual(['brand-color-text:3']);
  });

  it('면·선·채움과 다른 색 속성은 놓아준다', () => {
    expect(css('.a {\n  background-color: var(--cyan);\n  border-color: var(--brand-blue);\n  fill: var(--cyan);\n  outline: 2px solid var(--cyan);\n}')).toEqual([]);
  });

  it('남색 면 위 청록 글자 클래스(.cyan-on-navy)가 든 규칙만 허락한다', () => {
    expect(css('.cyan-on-navy,\n.sim-code .json-key {\n  color: var(--cyan);\n}')).toEqual([]);
    expect(css('.cyan-on-navy-ish {\n  color: var(--cyan);\n}')).toEqual(['brand-color-text:2']);
  });

  it('지도 그림 스타일은 currentColor가 선 색이라 놓아준다', () => {
    expect(css('.mb-bp {\n  color: var(--brand-blue);\n}', 'src/styles/map.css')).toEqual([]);
  });

  it('섬과 Astro의 인라인 style도 본다', () => {
    expect(rules('src/components/X.tsx', "const s = { color: 'var(--cyan)' };")).toEqual(['brand-color-text:1']);
    expect(rules('src/pages/x.astro', '---\n---\n<p style="color: var(--brand-blue)">x</p>')).toEqual(['brand-color-text:3']);
    expect(rules('src/pages/x.astro', '---\n---\n<p class="a">x</p>\n<style>\n  .a {\n    color: var(--cyan);\n  }\n</style>')).toEqual(['brand-color-text:6']);
  });
});

describe('진한 테두리 (heavy-border)', () => {
  it('2px 넘는 --text·--chosen·--navy 테두리를 막는다', () => {
    expect(css('.card {\n  border: 2px solid var(--text);\n}')).toEqual(['heavy-border:2']);
    expect(css('.card {\n  border-inline-start: 6px solid var(--navy);\n}')).toEqual(['heavy-border:2']);
    expect(css('.card {\n  border: medium solid var(--chosen);\n}')).toEqual(['heavy-border:2']);
  });

  it('굵기와 색을 따로 적어도 같은 규칙 안이면 막는다', () => {
    expect(css('.card {\n  border-width: 2px;\n  border-style: solid;\n  border-color: var(--chosen);\n}')).toEqual(['heavy-border:4']);
  });

  it('1px 선, 옅은 선, 안쪽 고리(box-shadow), 도장 겹줄은 놓아준다', () => {
    expect(css('.a {\n  border: 1px solid var(--chosen);\n}')).toEqual([]);
    expect(css('.a {\n  border: 2px solid var(--hairline);\n}')).toEqual([]);
    expect(css('.a {\n  box-shadow: inset 0 0 0 2px var(--chosen);\n}')).toEqual([]);
    expect(css('.r-stamp {\n  border: 3px double var(--seal);\n}')).toEqual([]);
    expect(css('.a {\n  border: 2px solid var(--text-2);\n}')).toEqual([]);
  });

  it('다른 규칙의 굵기는 섞지 않는다', () => {
    expect(css('@media (min-width: 1px) {\n  .a {\n    border-width: 3px;\n  }\n  .b {\n    border-color: var(--text);\n  }\n}')).toEqual([]);
  });
});

describe('규칙 덩어리 나누기', () => {
  it('선택자와 자기 선언, 줄 번호', () => {
    const blocks = cssBlocks('.a,\n.b {\n  color: red;\n}\n@media (x) {\n  .c {\n    margin: 0;\n  }\n}');
    expect(blocks.map((b) => [b.selector, b.decls.map((d) => `${d.prop}@${d.line}`)])).toEqual([
      ['.a,\n.b', ['color@2']],
      ['.c', ['margin@6']],
      ['@media (x)', []],
    ]);
  });
});

describe('있던 규칙', () => {
  it('토큰 밖 색·길이, 이유 없는 예외', () => {
    expect(css('.a {\n  color: #fff;\n  transition: opacity 200ms ease;\n}')).toEqual(['token-color:2', 'token-duration:3']);
    expect(css('.a {\n  color: #fff; /* floor-guard-ignore: */\n}')).toEqual(['ignore-reason:2']);
  });
});

describe('사이트 안 주소 글자 (base-path, 설계서 9.4절)', () => {
  it('화면 부품·도우미의 주소 글자를 막는다 (주소 바탕이 빠진다)', () => {
    expect(rules('src/lib/search-client.ts', "fetch('/search-index.json')")).toEqual(['base-path:1']);
    expect(rules('src/lib/track.ts', "export const EVENT_URL = '/api/event';")).toEqual(['base-path:1']);
    expect(rules('src/components/X.tsx', 'const a = <a href="/tools">x</a>;')).toEqual(['base-path:1']);
    expect(rules('src/components/X.tsx', 'const p = `/terms/${id}`;')).toEqual(['base-path:1']);
    expect(rules('src/components/X.astro', '<img src="/og/default.png" alt="" />')).toEqual(['base-path:1']);
    expect(rules('src/lib/x.ts', "const u = '/fonts/a.woff2';")).toEqual(['base-path:1']);
    expect(rules('src/lib/x.ts', "if (p.startsWith('/dictionary')) {}")).toEqual(['base-path:1']);
  });

  it('routes.ts, 시험, 화면 밖, 정규식·비슷한 말·주석·이유 있는 예외는 놓아준다', () => {
    expect(rules('src/lib/routes.ts', "  tools: '/tools',")).toEqual([]);
    expect(rules('tests/lib/x.test.ts', "expect(toolPath('a')).toBe('/tools/a');")).toEqual([]);
    expect(rules('scripts/qa/x.ts', "await page.goto('/tools');")).toEqual([]);
    expect(rules('src/lib/x.ts', 'const re = /^\\/arrival\\/?$/;')).toEqual([]);
    expect(rules('src/lib/x.ts', "const a = '/checkout'; const b = s.split('/');")).toEqual([]);
    expect(rules('src/lib/x.ts', "// fetch('/search-index.json')")).toEqual([]);
    expect(rules('src/components/X.tsx', `<pre>{"fetch('/api/meal')"}</pre>{/* floor-guard-ignore: 예시 코드 글 */}`)).toEqual([]);
  });
});

describe('미리 보기 변수 (pv-scope, 설계서 4.6절)', () => {
  it('--pv-*는 미리 보기 부품·스타일 밖에서 막는다', () => {
    expect(css('.a {\n  color: var(--pv-text);\n}')).toEqual(['pv-scope:2']);
    expect(rules('src/components/LookSheet.tsx', "const s = { '--pv-bg': x };")).toEqual(['pv-scope:1']);
    expect(rules('src/components/LookPreview.tsx', "const s = { '--pv-bg': x };")).toEqual([]);
  });

  it('look.css는 .look-preview 안만, 값은 --pv-*와 모션 토큰만', () => {
    const look = (src: string): string[] => rules('src/styles/look.css', src);
    expect(look('.look-preview .pv-btn {\n  background: var(--pv-primary);\n  transition: background-color var(--dur-fade) var(--ease-out);\n}')).toEqual([]);
    expect(look(':root[data-motion="reduce"] .look-preview * {\n  transition: none;\n}')).toEqual([]);
    expect(look('@media (prefers-reduced-motion: reduce) {\n  .look-preview * {\n    transition: none;\n  }\n}')).toEqual([]);
    expect(look('.look-preview .pv-btn {\n  color: var(--accent);\n}')).toEqual(['pv-scope:2']);
    expect(look('.pv-btn {\n  color: var(--pv-text);\n}')).toEqual(['pv-scope:2']);
    expect(look('.look-preview .pv-btn {\n  color: #fff;\n}')).toEqual(['token-color:2']);
  });
});
