// 저장 값 읽기 (saved.ts): 장바구니·프로젝트 메모·영수증·최근 본 재료·메타·설정. 읽은 값은 믿지 않고 모양을 고른다.
import { describe, expect, it } from 'vitest';
import {
  CART_MAX,
  DEFAULT_PREFS,
  MEMO_MAX,
  PROJECT_MAX,
  RECEIPTS_MAX,
  RECEIPT_FIELD_MAX,
  RECENT_MAX,
  SENT_MAX,
  addLine,
  addLines,
  cleanMemo,
  isDefaultPrefs,
  isEmptyCart,
  isEmptyMeta,
  pushRecent,
  readCart,
  readMeta,
  readPrefs,
  readProject,
  readReceipt,
  readReceipts,
  readRecent,
  receiptNumber,
  stamp,
} from '../../src/lib/saved.ts';

const line = (id: string, extra: Record<string, unknown> = {}) => ({ id, name: `이름 ${id}`, cat: 'design', sub: 'fonts', addedAt: 1, ...extra });

describe('장바구니 읽기', () => {
  it('정상 줄은 그대로, 메모는 다듬는다', () => {
    expect(readCart([line('a', { memo: '  제목 글꼴로  ' })])).toEqual([{ id: 'a', name: '이름 a', cat: 'design', sub: 'fonts', addedAt: 1, memo: '제목 글꼴로' }]);
  });

  it('S1 판의 담은 때(at)도 읽는다', () => {
    expect(readCart([{ id: 'a', name: 'A', cat: 'ai', sub: 'mcp', at: 42 }])[0]?.addedAt).toBe(42);
  });

  it('깨진 값·모양이 틀린 줄·겹친 id를 버린다', () => {
    expect(readCart('x')).toEqual([]);
    expect(readCart(null)).toEqual([]);
    expect(readCart([line('a'), line('a'), { id: 'b' }, line('c', { cat: 'Design!' }), line('', {}), line('d', { sub: '' }), line('e', { name: '  ' })]).map((x) => x.id)).toEqual(['a']);
  });

  it(`메모는 ${MEMO_MAX}자, 줄은 ${CART_MAX}개까지. 시각이 이상하면 0`, () => {
    expect(cleanMemo('가'.repeat(MEMO_MAX + 10))?.length).toBe(MEMO_MAX);
    expect(cleanMemo('   ')).toBeUndefined();
    const many = Array.from({ length: CART_MAX + 5 }, (_, i) => line(`x${i}`));
    expect(readCart(many)).toHaveLength(CART_MAX);
    expect(readCart([line('a', { addedAt: 'soon' })])[0]?.addedAt).toBe(0);
  });

  it('더하기: 새 줄은 끝에, 있는 줄은 메모만 바꾸고(exists), 가득 차면 full', () => {
    const a = { ...line('a'), memo: '처음' };
    const first = addLine([a], { ...line('b'), addedAt: 2 });
    expect(first.result).toBe('added');
    expect(first.list.map((x) => x.id)).toEqual(['a', 'b']);
    const again = addLine(first.list, { ...line('a'), memo: '다시', addedAt: 9 });
    expect(again.result).toBe('exists');
    expect(again.list[0]).toEqual({ ...a, memo: '다시' });
    expect(addLine(first.list, { ...line('a'), addedAt: 9 }).list[0]).toEqual(a);
    const full = Array.from({ length: CART_MAX }, (_, i) => line(`x${i}`));
    expect(addLine(full, line('new')).result).toBe('full');
  });

  it('여러 줄 더하기: 있는 것은 건너뛰고, 가득 차면 거기서 멈춘다', () => {
    const r = addLines([line('a')], [line('a'), line('b'), line('c')]);
    expect(r).toMatchObject({ added: 2, skipped: 1, full: false });
    expect(r.list.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    const almost = Array.from({ length: CART_MAX - 1 }, (_, i) => line(`x${i}`));
    const f = addLines(almost, [line('n1'), line('n2')]);
    expect(f).toMatchObject({ added: 1, full: true });
    expect(f.list).toHaveLength(CART_MAX);
  });
});

describe('프로젝트 메모·영수증·최근 본 재료 읽기', () => {
  it(`프로젝트 메모는 ${PROJECT_MAX}자까지, 아니면 빈 글`, () => {
    expect(readProject('  급식 앱 ')).toBe('급식 앱');
    expect(readProject(3)).toBe('');
    expect(readProject('가'.repeat(PROJECT_MAX + 1))).toHaveLength(PROJECT_MAX);
  });

  const receipt = (id: string, at: number, extra: Record<string, unknown> = {}) => ({
    id,
    no: '20261014-0427',
    at,
    lines: [{ id: 'google-fonts:roboto', name: 'Roboto', cat: 'design', sub: 'fonts', url: 'https://fonts.google.com/specimen/Roboto', license: 'OFL-1.1', install: 'npm i @fontsource/roboto' }],
    ...extra,
  });

  it('영수증: 모양이 맞는 것만, 주소는 http(s)만, 칸은 길이 상한까지', () => {
    const r = readReceipt(receipt('abc', 5, { project: ' 급식 앱 ' }));
    expect(r).toMatchObject({ id: 'abc', no: '20261014-0427', at: 5, project: '급식 앱' });
    expect(r?.lines[0]).toMatchObject({ url: 'https://fonts.google.com/specimen/Roboto', license: 'OFL-1.1', install: 'npm i @fontsource/roboto' });
    expect(readReceipt(receipt('abc', 5, { lines: [{ ...receipt('x', 1).lines[0], url: 'javascript:alert(1)', docs: 'ftp://x' }] }))?.lines[0]?.url).toBeUndefined();
    const long = readReceipt(receipt('abc', 5, { lines: [{ ...receipt('x', 1).lines[0], snippet: 'x'.repeat(RECEIPT_FIELD_MAX.snippet + 50) }] }));
    expect(long?.lines[0]?.snippet).toHaveLength(RECEIPT_FIELD_MAX.snippet);
    expect(readReceipt(receipt('ABC!', 5))).toBeNull();
    expect(readReceipt(receipt('abc', 0))).toBeNull();
    expect(readReceipt(receipt('abc', 5, { no: '1234' }))).toBeNull();
    expect(readReceipt(receipt('abc', 5, { lines: [] }))).toBeNull();
  });

  it(`지난 영수증: 새것이 앞, 같은 id는 하나, ${RECEIPTS_MAX}장까지`, () => {
    expect(readReceipts([receipt('a', 1), receipt('b', 3), receipt('a', 9), 'x']).map((r) => r.id)).toEqual(['b', 'a']);
    const many = Array.from({ length: RECEIPTS_MAX + 4 }, (_, i) => receipt(`r${i}`, i + 1));
    const got = readReceipts(many);
    expect(got).toHaveLength(RECEIPTS_MAX);
    expect(got[0]?.id).toBe(`r${RECEIPTS_MAX + 3}`);
  });

  it(`최근 본 재료: 본 것이 앞, 다시 보면 앞으로, ${RECENT_MAX}개까지`, () => {
    const it0 = { id: 'a', name: 'A', cat: 'api', sub: 'weather', at: 1 };
    let list = pushRecent([], it0);
    list = pushRecent(list, { ...it0, id: 'b', at: 2 });
    list = pushRecent(list, { ...it0, at: 3 });
    expect(list.map((x) => x.id)).toEqual(['a', 'b']);
    const many = Array.from({ length: RECENT_MAX + 3 }, (_, i) => ({ ...it0, id: `x${i}` }));
    expect(readRecent(many)).toHaveLength(RECENT_MAX);
    expect(readRecent([{ id: 'a' }, 'x'])).toEqual([]);
  });
});

describe('번호와 시각', () => {
  it('영수증 번호는 날짜 8자리-네 자리, 파일 이름 시각은 YYYYMMDD-HHMM (기기 시각)', () => {
    const at = new Date(2026, 9, 14, 9, 5).getTime();
    expect(stamp(at)).toBe('20261014-0905');
    expect(receiptNumber(at, '0427')).toBe('20261014-0427');
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
