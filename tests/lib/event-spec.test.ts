// 익명 집계의 약속 (v5 S2): 정해진 이벤트·구간만 받고, 큰 본문·다른 칸은 버린다. 재료 수 구간과 짧은 해시.
import { describe, expect, it } from 'vitest';
import { BODY_MAX, EVENT_SPEC, countBucket, isBucket, parseEvent, shortHash, utcDay } from '../../src/lib/event-spec.ts';
import { KIT_IDS } from '../../src/lib/kits.ts';

describe('본문 검사', () => {
  it('정해진 이벤트와 구간', () => {
    expect(parseEvent('{"t":"cart_add","b":"design"}')).toEqual({ type: 'cart_add', bucket: 'design' });
    expect(parseEvent('{"t":"checkout","b":"n21+"}')).toEqual({ type: 'checkout', bucket: 'n21+' });
    expect(parseEvent('{"t":"bundle_add","b":"school"}')).toEqual({ type: 'bundle_add', bucket: 'school' });
  });
  it('구간이 없는 이벤트는 b를 빼도 빈 구간', () => {
    expect(parseEvent('{"t":"md_download"}')).toEqual({ type: 'md_download', bucket: '' });
    expect(parseEvent('{"t":"md_copy","b":""}')).toEqual({ type: 'md_copy', bucket: '' });
  });
  it('목록에 없는 이벤트·구간은 버린다 (v4 이벤트도)', () => {
    expect(parseEvent('{"t":"page_view"}')).toBeNull();
    expect(parseEvent('{"t":"interview_start"}')).toBeNull();
    expect(parseEvent('{"t":"cart_add","b":"google-fonts:roboto"}')).toBeNull();
    expect(parseEvent('{"t":"cart_add"}')).toBeNull();
    expect(parseEvent('{"t":"md_download","b":"n01"}')).toBeNull();
    expect(parseEvent('{"t":"bundle_add","b":"secret-kit"}')).toBeNull();
    expect(parseEvent('{"t":"toString"}')).toBeNull();
    expect(parseEvent('{"t":"__proto__"}')).toBeNull();
  });
  it('다른 칸이 붙거나 모양이 다르면 버린다', () => {
    expect(parseEvent('{"t":"cart_add","b":"design","id":"x"}')).toBeNull();
    expect(parseEvent('["cart_add"]')).toBeNull();
    expect(parseEvent('null')).toBeNull();
    expect(parseEvent('{"t":1}')).toBeNull();
    expect(parseEvent('{"t":"cart_add","b":1}')).toBeNull();
    expect(parseEvent('not json')).toBeNull();
    expect(parseEvent('')).toBeNull();
  });
  it(`${BODY_MAX}바이트를 넘는 본문은 버린다 (한글은 3바이트)`, () => {
    const pad = ' '.repeat(BODY_MAX - '{"t":"md_copy"}'.length);
    expect(parseEvent(`{"t":"md_copy"}${pad}`)).not.toBeNull();
    expect(parseEvent(`{"t":"md_copy"}${pad} `)).toBeNull();
    expect(parseEvent(`{"t":"md_copy","x":"${'가'.repeat(60)}"}`)).toBeNull();
  });
  it('구간 좁히기: 담기는 대분류, 키트 담기는 키트 id', () => {
    expect(isBucket('cart_add', 'datasets')).toBe(true);
    expect(isBucket('cart_add', 'fonts')).toBe(false);
    expect(EVENT_SPEC.bundle_add).toEqual(KIT_IDS);
  });
});

describe('계산한 재료 수 구간', () => {
  it('경계', () => {
    expect([0, 1, 2, 3, 4, 6, 7, 10, 11, 20, 21, 300].map(countBucket)).toEqual(['n01', 'n01', 'n02-03', 'n02-03', 'n04-06', 'n04-06', 'n07-10', 'n07-10', 'n11-20', 'n11-20', 'n21+', 'n21+']);
  });
});

describe('짧은 해시와 날짜', () => {
  it('같은 글이면 같고, 다르면 다르다', () => {
    expect(shortHash('abc')).toBe(shortHash('abc'));
    expect(shortHash('abc')).not.toBe(shortHash('abd'));
    expect(shortHash('')).toMatch(/^[0-9a-z]+$/);
  });
  it('UTC 날짜', () => {
    expect(utcDay(Date.UTC(2026, 9, 12, 23, 59))).toBe('2026-10-12');
    expect(utcDay(Date.UTC(2026, 9, 13, 0, 0))).toBe('2026-10-13');
  });
});
