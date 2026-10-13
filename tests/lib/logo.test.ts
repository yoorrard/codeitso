// 로고 벌 (D65, brief 3.1·3.5): 크기 셈, 경로에 색 값이 없고 다섯 칠 클래스만 쓰는지, 단색판은 currentColor 한 색인지
import { describe, expect, it } from 'vitest';
import { logoA11y, logoWidth } from '../../src/lib/logo.ts';
import { LOGO, LOGO_BADGE, LOGO_LOCKUP, LOGO_MONO_MARK, LOGO_WORDMARK } from '../../src/lib/logo-paths.ts';

describe('logoWidth', () => {
  it('머리줄 가로 묶음은 높이 44에서 폭 142 (그림 52 + 사이 8 + 글자 상표 82)', () => {
    expect(logoWidth(LOGO_LOCKUP, 44)).toBe(142);
  });
  it('모자 배지는 정사각, 글자 상표는 높이 16에서 폭 약 66', () => {
    expect(logoWidth(LOGO_BADGE, 32)).toBe(32);
    expect(logoWidth(LOGO_WORDMARK, 16)).toBeCloseTo(66.2, 1);
  });
  it('단색 모자 마크는 높이 20에서 폭 약 35', () => {
    expect(logoWidth(LOGO_MONO_MARK, 20)).toBeCloseTo(35.4, 1);
  });
});

describe('logoA11y', () => {
  it('이름이 없으면 장식으로 숨기고, 있으면 그림으로 읽는다', () => {
    expect(logoA11y()).toEqual({ 'aria-hidden': 'true', focusable: 'false' });
    expect(logoA11y('코드쇼퍼')).toEqual({ role: 'img', 'aria-label': '코드쇼퍼' });
  });
});

describe('logo-paths', () => {
  const ALLOWED = new Set(['logo-body', 'logo-letter', 'logo-accent', 'logo-light', 'logo-white']);
  for (const [name, art] of Object.entries(LOGO)) {
    it(`${name}: 색 값 없이 다섯 칠 클래스나 currentColor만 쓴다`, () => {
      expect(art.markup).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      for (const m of art.markup.matchAll(/class="([^"]+)"/g)) expect(ALLOWED.has(m[1] ?? '')).toBe(true);
      if (name.startsWith('mono')) {
        expect(art.markup).toContain('fill="currentColor"');
        expect(art.markup).not.toContain('class=');
      }
    });
  }
});
