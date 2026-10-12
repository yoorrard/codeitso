// 익명 집계의 약속: 정해진 이벤트·구간만 받고, 큰 본문·다른 칸은 버린다. 걸린 시간 구간과 짧은 해시.
import { describe, expect, it } from 'vitest';
import { BODY_MAX, elapsedBucket, isBucket, parseEvent, shortHash, utcDay } from '../../src/lib/event-spec.ts';

describe('본문 검사', () => {
  it('정해진 이벤트와 구간', () => {
    expect(parseEvent('{"t":"card_copy","b":"first"}')).toEqual({ type: 'card_copy', bucket: 'first' });
    expect(parseEvent('{"t":"receipt_issued","b":"m30+"}')).toEqual({ type: 'receipt_issued', bucket: 'm30+' });
    expect(parseEvent('{"t":"quiz_answer","b":"ng"}')).toEqual({ type: 'quiz_answer', bucket: 'ng' });
  });
  it('구간이 없는 이벤트는 b를 빼도 빈 구간', () => {
    expect(parseEvent('{"t":"interview_start"}')).toEqual({ type: 'interview_start', bucket: '' });
    expect(parseEvent('{"t":"required_done","b":""}')).toEqual({ type: 'required_done', bucket: '' });
  });
  it('목록에 없는 이벤트·구간은 버린다', () => {
    expect(parseEvent('{"t":"page_view"}')).toBeNull();
    expect(parseEvent('{"t":"card_copy","b":"secret"}')).toBeNull();
    expect(parseEvent('{"t":"card_copy"}')).toBeNull();
    expect(parseEvent('{"t":"interview_start","b":"m00-05"}')).toBeNull();
    expect(parseEvent('{"t":"toString"}')).toBeNull();
    expect(parseEvent('{"t":"__proto__"}')).toBeNull();
  });
  it('다른 칸이 붙거나 모양이 다르면 버린다', () => {
    expect(parseEvent('{"t":"card_copy","b":"first","ip":"1.2.3.4"}')).toBeNull();
    expect(parseEvent('["card_copy"]')).toBeNull();
    expect(parseEvent('null')).toBeNull();
    expect(parseEvent('{"t":1}')).toBeNull();
    expect(parseEvent('{"t":"card_copy","b":1}')).toBeNull();
    expect(parseEvent('not json')).toBeNull();
    expect(parseEvent('')).toBeNull();
  });
  it(`${BODY_MAX}바이트를 넘는 본문은 버린다 (한글은 3바이트)`, () => {
    const pad = ' '.repeat(BODY_MAX - '{"t":"interview_start"}'.length);
    expect(parseEvent(`{"t":"interview_start"}${pad}`)).not.toBeNull();
    expect(parseEvent(`{"t":"interview_start"}${pad} `)).toBeNull();
    expect(parseEvent(`{"t":"interview_start","x":"${'가'.repeat(60)}"}`)).toBeNull();
  });
  it('구간 좁히기', () => {
    expect(isBucket('card_copy', 'verify')).toBe(true);
    expect(isBucket('card_copy', 'other')).toBe(false);
  });
});

describe('영수증 발행 구간', () => {
  const t0 = Date.UTC(2026, 9, 12, 9, 0, 0);
  const min = 60000;
  it('경계는 앞 구간에 넣지 않는다 (5분이면 m05-10)', () => {
    expect(elapsedBucket(t0, t0)).toBe('m00-05');
    expect(elapsedBucket(t0, t0 + 5 * min - 1)).toBe('m00-05');
    expect(elapsedBucket(t0, t0 + 5 * min)).toBe('m05-10');
    expect(elapsedBucket(t0, t0 + 14 * min)).toBe('m10-15');
    expect(elapsedBucket(t0, t0 + 19 * min)).toBe('m15-20');
    expect(elapsedBucket(t0, t0 + 29 * min)).toBe('m20-30');
    expect(elapsedBucket(t0, t0 + 30 * min)).toBe('m30+');
  });
  it('시작 시각이 없거나 앞뒤가 바뀌면 none', () => {
    expect(elapsedBucket(undefined, t0)).toBe('none');
    expect(elapsedBucket(t0 + min, t0)).toBe('none');
    expect(elapsedBucket(Number.NaN, t0)).toBe('none');
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
