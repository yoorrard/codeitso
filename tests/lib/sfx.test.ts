// 효과음: 기본 꺼짐, 꺼져 있으면 합성기를 불러오지 않는다
import { setPersistentEngine } from '@nanostores/persistent';
import { describe, expect, it } from 'vitest';

setPersistentEngine({}, { addEventListener() {}, removeEventListener() {} });
const { $prefs } = await import('../../src/lib/store.ts');
const { engineLoaded, sfx, soundOn, shouldPlay, SFX_GATHER_MS } = await import('../../src/lib/sfx.ts');
const { soundLength } = await import('../../src/lib/sfx-engine.ts');

describe('효과음', () => {
  it('기본은 꺼짐이고, 꺼져 있으면 합성기를 불러오지 않는다', async () => {
    expect($prefs.get().sound).toBe(false);
    expect(soundOn()).toBe(false);
    await sfx('tap');
    expect(engineLoaded()).toBe(false);
  });

  it('소리는 모두 짧다 (축하 1초 안쪽, 나머지 0.5초 안쪽)', () => {
    expect(soundLength('cheer')).toBeLessThan(1);
    for (const s of ['tap', 'add', 'arrive', 'green', 'stamp', 'print'] as const) expect(soundLength(s)).toBeLessThanOrEqual(0.5);
  });
});

describe('같은 순간의 효과음', () => {
  it('앞선 소리보다 중요하지 않은 소리는 잠깐 사이에 다시 내지 않는다', () => {
    const last = { name: 'stamp' as const, at: 1000 };
    expect(shouldPlay('arrive', 1000 + 10, last)).toBe(false);
    expect(shouldPlay('green', 1000 + 10, last)).toBe(false);
    expect(shouldPlay('stamp', 1000 + 10, last)).toBe(false);
  });
  it('더 중요한 소리는 바로 낸다 (담기 뒤 도장)', () => {
    expect(shouldPlay('stamp', 1010, { name: 'add', at: 1000 })).toBe(true);
    expect(shouldPlay('cheer', 1010, { name: 'stamp', at: 1000 })).toBe(true);
  });
  it('잠깐이 지나면 무엇이든 낸다', () => {
    expect(shouldPlay('tap', 1000 + SFX_GATHER_MS, { name: 'stamp', at: 1000 })).toBe(true);
    expect(shouldPlay('tap', 0, null)).toBe(true);
  });
});
