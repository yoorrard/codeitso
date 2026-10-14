import { describe, expect, it } from 'vitest';
import { receiptDate, receiptNo } from '../../src/lib/receipt-no.ts';

describe('receiptNo', () => {
  it('늘 네 자리 숫자이고 같은 조각이면 같은 번호', () => {
    for (const s of ['', 'a', 'N4IgdghgtgpiBcIAqALApgZwATQI4FcB7', 'x'.repeat(500)]) {
      expect(receiptNo(s)).toMatch(/^\d{4}$/);
      expect(receiptNo(s)).toBe(receiptNo(s));
    }
  });

  it('조각이 한 글자만 달라도 번호가 대개 달라진다', () => {
    const seen = new Set(Array.from({ length: 50 }, (_, i) => receiptNo(`N4IgdghgtgpiBcIA${i}`)));
    expect(seen.size).toBeGreaterThan(45);
  });

  it('FNV-1a 값을 그대로 쓴다 (다른 곳에서 같은 번호를 찍을 수 있게)', () => {
    // FNV-1a('a') = 0xe40c292c = 3826002220
    expect(receiptNo('a')).toBe('2220');
  });
});

describe('receiptDate', () => {
  it('받은 때를 연·월·일로 나누고 올해인지 알려 준다', () => {
    expect(receiptDate('2026-10-03 09:05', 2026)).toEqual({
      y: 2026,
      m: 10,
      d: 3,
      sameYear: true,
    });
    expect(receiptDate('2025-01-30 21:40', 2026)).toEqual({
      y: 2025,
      m: 1,
      d: 30,
      sameYear: false,
    });
  });

  it('모양이 다르면 null', () => {
    expect(receiptDate('어제', 2026)).toBeNull();
  });
});
