// 호스트 종류와 방문 통계 (설계서 9.4절, R-04·R-61): 정적 호스트와 토큰이 없을 때는 어디에도, 영수증 화면에는 늘 싣지 않는다.
import { describe, expect, it } from 'vitest';
import { analyticsAllowed, HOST } from '../../src/lib/stage.ts';

describe('방문 통계를 싣는 화면', () => {
  it('기본 호스트는 cloudflare', () => {
    expect(HOST).toBe('cloudflare');
  });

  it('cloudflare + 토큰이면 싣고, 영수증 화면만 뺀다', () => {
    expect(analyticsAllowed('/', 'cloudflare', 'tok', '')).toBe(true);
    expect(analyticsAllowed('/tools/a', 'cloudflare', 'tok', '')).toBe(true);
    expect(analyticsAllowed('/arrival', 'cloudflare', 'tok', '')).toBe(false);
    expect(analyticsAllowed('/arrival/', 'cloudflare', 'tok', '')).toBe(false);
  });

  it('주소 바탕이 있어도 영수증 화면을 알아본다', () => {
    expect(analyticsAllowed('/code-chauffeur/arrival', 'cloudflare', 'tok', '/code-chauffeur')).toBe(false);
    expect(analyticsAllowed('/code-chauffeur/check', 'cloudflare', 'tok', '/code-chauffeur')).toBe(true);
  });

  it('정적 호스트이거나 토큰이 없으면 어디에도 싣지 않는다', () => {
    expect(analyticsAllowed('/', 'static', 'tok', '')).toBe(false);
    expect(analyticsAllowed('/', 'cloudflare', '', '')).toBe(false);
  });
});
