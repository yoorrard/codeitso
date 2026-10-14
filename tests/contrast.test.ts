import { describe, expect, it } from 'vitest';
import { contrast } from '../scripts/lib/contrast.ts';

describe('명도 대비 (WCAG 2.x)', () => {
  it('검정과 흰색은 21:1', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('순서와 대소문자에 상관없다', () => {
    expect(contrast('#FFFFFF', '#16213f')).toBeCloseTo(contrast('#16213F', '#ffffff'), 10);
  });

  it('같은 색은 1:1', () => {
    expect(contrast('#f5b700', '#f5b700')).toBeCloseTo(1, 10);
  });
});
