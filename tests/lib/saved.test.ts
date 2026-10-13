// 저장된 값 고르기: 브라우저 저장소의 값은 누가 고쳤을 수도 있으니 모양을 믿지 않는다.
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS,
  FREE_TEXT_MAX,
  SENT_MAX,
  isDefaultPrefs,
  isEmptyMeta,
  isEmptySession,
  isEmptyStudy,
  isEmptySeen,
  readMeta,
  readPrefs,
  readSession,
  readStudy,
  readSeen,
} from '../../src/lib/saved.ts';

describe('세션 읽기', () => {
  it('정상 값은 그대로', () => {
    const s = { answers: { 'q.type': 'page' }, cart: ['a', 'b'], kept: ['conflict.x'], deferred: ['notify'], freeText: '급식 페이지' };
    expect(readSession(s)).toEqual(s);
  });

  it('깨진 값은 빈 세션으로', () => {
    for (const raw of [null, undefined, 3, 'x', [], true]) {
      expect(readSession(raw)).toEqual({ answers: {}, cart: [], kept: [], deferred: [] });
    }
  });

  it('문자열이 아닌 답·목록 값과 겹친 id를 버린다', () => {
    const s = readSession({ answers: { a: 'x', b: 3, c: null }, cart: ['p', 'p', 4, '', 'q'], kept: 'nope', deferred: [null] });
    expect(s).toEqual({ answers: { a: 'x' }, cart: ['p', 'q'], kept: [], deferred: [] });
  });

  it('자유 입력은 길이를 자르고, 빈 글은 버린다', () => {
    expect(readSession({ freeText: 'ㄱ'.repeat(FREE_TEXT_MAX + 50) }).freeText).toHaveLength(FREE_TEXT_MAX);
    expect(readSession({ freeText: '   ' }).freeText).toBeUndefined();
  });
});

describe('공부 기록 읽기', () => {
  it('읽음과 맞힌 문제 번호(정수, 겹침 없이 정렬)', () => {
    expect(readStudy({ api: { read: true, quiz: [2, 0, 2, -1, 1.5, 'x'] } })).toEqual({ api: { read: true, quiz: [0, 2] } });
  });

  it('아무것도 안 한 개념과 깨진 값은 버린다', () => {
    expect(readStudy({ api: { read: false, quiz: [] }, json: 'x', env: null })).toEqual({});
    expect(readStudy([1, 2])).toEqual({});
  });
});

describe('메타 읽기', () => {
  it('보낸 이벤트는 최근 것만 남긴다', () => {
    const sent = Array.from({ length: SENT_MAX + 5 }, (_, i) => `e${i}`);
    const m = readMeta({ sent });
    expect(m.sent).toHaveLength(SENT_MAX);
    expect(m.sent[0]).toBe('e5');
  });

  it('true일 때만 첫 수업·영수증 표시를 둔다', () => {
    expect(readMeta({ lessonDone: true, issued: 'yes', interviewStartedAt: -1 })).toEqual({ sent: [], lessonDone: true });
    expect(readMeta({ interviewStartedAt: 1_700_000_000_000 }).interviewStartedAt).toBe(1_700_000_000_000);
  });
});

describe('설정 읽기', () => {
  it('모르는 값은 기본값 (동작은 기기 설정 따르기, 효과음 꺼짐)', () => {
    expect(readPrefs({ motion: 'fast', sound: 'on' })).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS).toEqual({ motion: 'auto', sound: false });
  });

  it('줄이기와 효과음 켜기', () => {
    expect(readPrefs({ motion: 'reduce', sound: true })).toEqual({ motion: 'reduce', sound: true });
  });
});

describe('본 장면 기록 읽기', () => {
  it('장면 id만, 겹침 없이', () => {
    expect(readSeen({ scenes: ['s1', 's1', 7] })).toEqual({ scenes: ['s1'] });
    expect(readSeen({ seenStamps: ['station.interview'] })).toEqual({ scenes: [] });
  });
});

describe('처음 값 판단 (처음 값이면 저장 키를 지운다)', () => {
  it('비었는지', () => {
    expect(isEmptySession(readSession(undefined))).toBe(true);
    expect(isEmptySession(readSession({ freeText: '한 줄' }))).toBe(false);
    expect(isEmptyStudy({})).toBe(true);
    expect(isEmptyMeta({ sent: [] })).toBe(true);
    expect(isEmptyMeta({ sent: [], issued: true })).toBe(false);
    expect(isDefaultPrefs(DEFAULT_PREFS)).toBe(true);
    expect(isDefaultPrefs({ motion: 'reduce', sound: false })).toBe(false);
    expect(isEmptySeen({ scenes: [] })).toBe(true);
    expect(isEmptySeen({ scenes: ['s5'] })).toBe(false);
  });
});
