// 효과음: 기본 꺼짐, 꺼져 있으면 합성기를 불러오지 않는다
import { setPersistentEngine } from '@nanostores/persistent';
import { describe, expect, it } from 'vitest';

setPersistentEngine({}, { addEventListener() {}, removeEventListener() {} });
const { $prefs } = await import('../../src/lib/store.ts');
const { engineLoaded, sfx, soundOn, shouldPlay, SFX_GATHER_MS } = await import('../../src/lib/sfx.ts');
const { SCALE, VOLUME, soundLength, soundNotes } = await import('../../src/lib/sfx-engine.ts');

describe('효과음', () => {
  it('기본은 꺼짐이고, 꺼져 있으면 합성기를 불러오지 않는다', async () => {
    expect($prefs.get().sound).toBe(false);
    expect(soundOn()).toBe(false);
    await sfx('answer');
    expect(engineLoaded()).toBe(false);
  });

  it('조용히 모시기면 효과음을 켜 두어도 내지 않는다 (brief 7절)', () => {
    $prefs.set({ ...$prefs.get(), sound: true, quiet: true });
    expect(soundOn()).toBe(false);
    $prefs.set({ ...$prefs.get(), quiet: false });
    expect(soundOn()).toBe(true);
    $prefs.set({ ...$prefs.get(), sound: false });
  });

  it('길이는 brief 7절대로: 답함 60ms, 정함 120ms(두 음), 다 풀림 240ms(올라가는 두 음), 도착 600ms(세 음), 도장 90ms', () => {
    const near = (a: number, b: number): void => expect(Math.abs(a - b)).toBeLessThan(1e-9);
    near(soundLength('answer'), 0.06);
    near(soundLength('confirm'), 0.12);
    near(soundLength('clear'), 0.24);
    near(soundLength('arrive'), 0.6);
    near(soundLength('stamp'), 0.09);
    expect(soundNotes('answer')).toHaveLength(1);
    expect(soundNotes('confirm')).toHaveLength(2);
    expect(soundNotes('arrive')).toHaveLength(3);
    const [lo, hi] = soundNotes('clear');
    expect(hi).toBeGreaterThan(lo ?? Infinity);
  });

  it('음은 C장조(523·587·659·784·880·1047Hz)만, 도장은 그 도의 낮은 옥타브. 음량 0.12', () => {
    expect(VOLUME).toBe(0.12);
    for (const s of ['answer', 'confirm', 'clear', 'arrive'] as const) for (const f of soundNotes(s)) expect(SCALE).toContain(f);
    const [thud] = soundNotes('stamp');
    expect(((thud ?? 0) * 4) / 523).toBeCloseTo(1, 6);
  });
});

describe('같은 순간의 효과음', () => {
  it('앞선 소리보다 중요하지 않은 소리는 잠깐 사이에 다시 내지 않는다', () => {
    const last = { name: 'stamp' as const, at: 1000 };
    expect(shouldPlay('arrive', 1000 + 10, last)).toBe(false);
    expect(shouldPlay('clear', 1000 + 10, last)).toBe(false);
    expect(shouldPlay('stamp', 1000 + 10, last)).toBe(false);
  });
  it('더 중요한 소리는 바로 낸다 (정함 뒤 다 풀림, 도착 차임 뒤 도장)', () => {
    expect(shouldPlay('clear', 1010, { name: 'confirm', at: 1000 })).toBe(true);
    expect(shouldPlay('stamp', 1010, { name: 'arrive', at: 1000 })).toBe(true);
  });
  it('잠깐이 지나면 무엇이든 낸다', () => {
    expect(shouldPlay('answer', 1000 + SFX_GATHER_MS, { name: 'stamp', at: 1000 })).toBe(true);
    expect(shouldPlay('answer', 0, null)).toBe(true);
  });
});
