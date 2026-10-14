// 호스트 종류와 방문 통계 (R-04·R-61): 정적 호스트와 토큰이 없을 때는 어디에도, 장바구니·영수증 쪽에는 늘 싣지 않는다.
import { describe, expect, it } from 'vitest';
import { analyticsAllowed, HOST } from '../../src/lib/stage.ts';

describe('방문 통계를 싣는 화면', () => {
  it('기본 호스트는 cloudflare', () => {
    expect(HOST).toBe('cloudflare');
  });

  it('cloudflare + 토큰이면 싣고, 장바구니·영수증 쪽만 뺀다', () => {
    expect(analyticsAllowed('/', 'cloudflare', 'tok', '')).toBe(true);
    expect(analyticsAllowed('/c/design/fonts', 'cloudflare', 'tok', '')).toBe(true);
    expect(analyticsAllowed('/cart', 'cloudflare', 'tok', '')).toBe(false);
    expect(analyticsAllowed('/receipts/', 'cloudflare', 'tok', '')).toBe(false);
    expect(analyticsAllowed('/receipt', 'cloudflare', 'tok', '')).toBe(false);
  });

  it('주소 바탕이 있어도 장바구니를 알아본다', () => {
    expect(analyticsAllowed('/code-chauffeur/cart', 'cloudflare', 'tok', '/code-chauffeur')).toBe(false);
    expect(analyticsAllowed('/code-chauffeur/item', 'cloudflare', 'tok', '/code-chauffeur')).toBe(true);
  });

  it('정적 호스트이거나 토큰이 없으면 어디에도 싣지 않는다', () => {
    expect(analyticsAllowed('/', 'static', 'tok', '')).toBe(false);
    expect(analyticsAllowed('/', 'cloudflare', '', '')).toBe(false);
  });
});
