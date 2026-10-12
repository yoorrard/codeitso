// 저장소(store.ts): 깨진 저장 값, 처음 값이면 키 지우기, 기록 지우기, 되풀이해도 한 번만
import { setPersistentEngine } from '@nanostores/persistent';
import { beforeAll, describe, expect, it } from 'vitest';
import { KEYS } from '../../src/lib/saved.ts';

// store.ts를 불러오기 전에 가짜 저장소를 끼운다 (일부러 깨진 값과 남의 키를 넣어 둔다)
const storage: Record<string, string> = {
  [KEYS.session]: '{깨진 JSON',
  [KEYS.prefs]: JSON.stringify({ motion: 'reduce', sound: 'yes' }),
  'other:key': '그대로',
};
setPersistentEngine(storage, { addEventListener() {}, removeEventListener() {} });

let store: typeof import('../../src/lib/store.ts');
beforeAll(async () => {
  store = await import('../../src/lib/store.ts');
});

describe('저장소', () => {
  it('깨진 저장 값은 처음 값으로 읽는다', () => {
    expect(store.$session.get()).toEqual({ answers: {}, cart: [], kept: [], deferred: [] });
    expect(store.$prefs.get()).toEqual({ motion: 'reduce', sound: false });
  });

  it('빌드(서버)에서는 저장 안내를 띄우지 않는다', () => {
    expect(store.$storageOk.get()).toBe(true);
  });

  it('세션을 JSON으로 저장하고, 처음 값이 되면 키를 지운다', () => {
    store.$session.set({ answers: { 'q.type': 'page' }, cart: [], kept: [], deferred: [] });
    expect(JSON.parse(storage[KEYS.session] ?? 'null')).toEqual({ answers: { 'q.type': 'page' }, cart: [], kept: [], deferred: [] });
    store.$session.set({ answers: {}, cart: [], kept: [], deferred: [] });
    expect(KEYS.session in storage).toBe(false);
  });

  it('설정은 모양을 골라 저장한다', () => {
    store.setPrefs({ sound: true });
    expect(store.$prefs.get()).toEqual({ motion: 'reduce', sound: true });
    store.setPrefs({ motion: 'auto', sound: false });
    expect(KEYS.prefs in storage).toBe(false);
  });

  it('맞힌 문제는 한 번만 기록하고, 읽음 표시는 문제 기록을 지우지 않는다', () => {
    store.markQuizCorrect('api', 1);
    store.markQuizCorrect('api', 1);
    store.markQuizCorrect('api', 0);
    store.markConceptRead('api');
    expect(store.$study.get()).toEqual({ api: { read: true, quiz: [0, 1] } });
  });

  it('보낸 이벤트는 한 번만', () => {
    expect(store.rememberSent('issue:abc')).toBe(true);
    expect(store.rememberSent('issue:abc')).toBe(false);
    expect(store.$meta.get().sent).toEqual(['issue:abc']);
  });

  it('본 도장을 더한다 (겹침 없이)', () => {
    store.markStampsSeen(['station.interview']);
    store.markStampsSeen(['station.interview', 'station.shop']);
    expect(store.$trip.get().seenStamps).toEqual(['station.interview', 'station.shop']);
  });

  it('기록 지우기는 진행 기록 네 키를 지우고, 설정과 남의 키는 그대로 둔다', () => {
    store.patchMeta({ lessonDone: true });
    store.$session.set({ answers: { 'q.type': 'page' }, cart: ['x'], kept: [], deferred: [] });
    store.setPrefs({ motion: 'reduce', sound: true });
    store.clearAll();
    for (const key of [KEYS.session, KEYS.study, KEYS.meta, KEYS.trip]) expect(key in storage).toBe(false);
    expect(storage['other:key']).toBe('그대로');
    expect(store.$prefs.get()).toEqual({ motion: 'reduce', sound: true });
    expect(KEYS.prefs in storage).toBe(true);
  });
});
