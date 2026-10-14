// 저장 값 읽기 (saved.ts): 장바구니·메타·설정. 읽은 값은 믿지 않고 모양을 고른다.
import { describe, expect, it } from 'vitest';
import { CART_MAX, DEFAULT_PREFS, MEMO_MAX, SENT_MAX, addLine, cleanMemo, isDefaultPrefs, isEmptyCart, isEmptyMeta, readCart, readMeta, readPrefs } from '../../src/lib/saved.ts';

const line = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `이름 ${id}`, cat: 'design', sub: 'fonts', at: 1, ...extra });

describe('장바구니 읽기', () => {
  it('정상 줄은 그대로, 메모는 다듬는다', () => {
    expect(readCart([line('a', { memo: '  제목 글꼴로  ' })])).toEqual([{ id: 'a', name: '이름 a', cat: 'design', sub: 'fonts', at: 1, memo: '제목 글꼴로' }]);
  });

  it('깨진 값·모양이 틀린 줄·겹친 id를 버린다', () => {
    expect(readCart('x')).toEqual([]);
    expect(readCart(null)).toEqual([]);
    expect(readCart([line('a'), line('a'), { id: 'b' }, line('c', { cat: 'Design!' }), line('', {}), line('d', { sub: '' })]).map((x) => x.id)).toEqual(['a']);
  });

  it(`메모는 ${MEMO_MAX}자, 줄은 ${CART_MAX}개까지. 시각이 이상하면 0`, () => {
    expect(cleanMemo('가'.repeat(MEMO_MAX + 10))?.length).toBe(MEMO_MAX);
    expect(cleanMemo('   ')).toBeUndefined();
    const many = Array.from({ length: CART_MAX + 5 }, (_, i) => line(`x${i}`));
    expect(readCart(many)).toHaveLength(CART_MAX);
    expect(readCart([line('a', { at: 'soon' })])[0]?.at).toBe(0);
  });

  it('더하기: 새 줄은 끝에, 있는 줄은 메모만 바꾸고, 가득 차면 그대로', () => {
    const a = { ...line('a'), memo: '처음' };
    const { list } = addLine([a], { ...line('b'), at: 2 });
    expect(list.map((x) => x.id)).toEqual(['a', 'b']);
    expect(addLine(list, { ...line('a'), memo: '다시', at: 9 }).list[0]).toEqual({ ...a, memo: '다시' });
    expect(addLine(list, { ...line('a'), at: 9 }).list[0]).toEqual(a);
    const full = Array.from({ length: CART_MAX }, (_, i) => line(`x${i}`));
    expect(addLine(full, line('new')).full).toBe(true);
  });
});

describe('메타·설정 읽기', () => {
  it('보낸 이벤트는 최근 것만 남긴다', () => {
    const sent = Array.from({ length: SENT_MAX + 3 }, (_, i) => `e${i}`);
    expect(readMeta({ sent }).sent).toEqual(sent.slice(-SENT_MAX));
    expect(readMeta('x')).toEqual({ sent: [] });
  });

  it('모르는 값은 기본값, 줄이기·풀이 끄기는 남긴다 (옛 marks 칸은 버린다)', () => {
    expect(readPrefs({ motion: 'fast', marks: false })).toEqual(DEFAULT_PREFS);
    expect(readPrefs({ motion: 'reduce', glossary: false })).toEqual({ motion: 'reduce', glossary: false });
  });

  it('처음 값 판단', () => {
    expect(isEmptyCart([])).toBe(true);
    expect(isEmptyMeta({ sent: [] })).toBe(true);
    expect(isDefaultPrefs(DEFAULT_PREFS)).toBe(true);
    expect(isDefaultPrefs({ motion: 'reduce', glossary: true })).toBe(false);
  });
});
