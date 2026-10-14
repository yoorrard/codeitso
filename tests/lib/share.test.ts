// 장바구니 공유 링크 (share.ts·routes.ts): 재료 id만, 쉼표가 든 id도 안전하게, 모양이 틀린 것은 버린다.
import { describe, expect, it } from 'vitest';
import { sharePath, shareUrl } from '../../src/lib/routes.ts';
import { CART_MAX } from '../../src/lib/saved.ts';
import { readShare, shareFragment } from '../../src/lib/share.ts';

describe('공유 링크', () => {
  it('id 목록이 조각을 거쳐 그대로 돌아온다', () => {
    const ids = ['google-fonts:roboto', 'mcp-registry:io.github/x', 'odd:a,b', 'data-go-kr:15122275'];
    const frag = shareFragment(ids);
    expect(frag.startsWith('s=')).toBe(true);
    expect(frag).not.toContain('odd:a,b');
    expect(readShare(`#${frag}`)).toEqual(ids);
    expect(readShare(frag)).toEqual(ids);
  });

  it('다른 조각·빈 칸·겹친 id·깨진 인코딩·이상한 글자는 버린다', () => {
    expect(readShare('#r=abc')).toEqual([]);
    expect(readShare('')).toEqual([]);
    expect(readShare('#s=a,,a,%E0%A4%A,b%20c,%3Cx%3E,d')).toEqual(['a', 'd']);
  });

  it(`${CART_MAX}개까지만 읽는다`, () => {
    const many = Array.from({ length: CART_MAX + 10 }, (_, i) => `x:${i}`);
    expect(readShare(shareFragment(many))).toHaveLength(CART_MAX);
  });

  it('주소: 장바구니 쪽 + #s=, 절대 주소는 origin을 붙인다 (메모는 없다)', () => {
    expect(sharePath(['a:b'])).toBe('/cart#s=a%3Ab');
    expect(shareUrl(['a:b'], 'https://shop.example/')).toBe('https://shop.example/cart#s=a%3Ab');
  });
});
