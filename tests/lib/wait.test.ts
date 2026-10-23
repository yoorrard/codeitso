// 기다림 표시 (U, D148): 빨리 끝나면 뼈대를 보이지 않고, 보였으면 최소 시간은 붙잡는다. CSS 토큰과 같은 기다림 길이.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HOLD_MS, WAIT_MS, holdLeft } from '../../src/lib/wait.ts';

describe('뼈대 붙잡기', () => {
  it('보이기 전(기다림 안)에 끝나면 바로 놓는다', () => {
    expect(holdLeft(1000, 1000)).toBe(0);
    expect(holdLeft(1000, 1000 + WAIT_MS - 1)).toBe(0);
  });

  it('보인 바로 뒤에 끝나면 보인 때부터 최소 시간까지 붙잡는다', () => {
    expect(holdLeft(1000, 1000 + WAIT_MS)).toBe(HOLD_MS);
    expect(holdLeft(1000, 1000 + WAIT_MS + 100)).toBe(HOLD_MS - 100);
  });

  it('충분히 보였으면 바로 놓는다', () => {
    expect(holdLeft(1000, 1000 + WAIT_MS + HOLD_MS)).toBe(0);
    expect(holdLeft(1000, 5000)).toBe(0);
  });

  it('CSS 기다림 토큰(--dur-wait)과 같은 길이', () => {
    const css = readFileSync(new URL('../../src/styles/tokens.css', import.meta.url), 'utf8');
    expect(css).toMatch(new RegExp(`--dur-wait:\\s*${WAIT_MS}ms`));
  });
});
