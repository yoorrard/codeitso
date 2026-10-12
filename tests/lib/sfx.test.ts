// 효과음: 기본 꺼짐, 꺼져 있으면 합성기를 불러오지 않는다
import { setPersistentEngine } from '@nanostores/persistent';
import { describe, expect, it } from 'vitest';

setPersistentEngine({}, { addEventListener() {}, removeEventListener() {} });
const { $prefs } = await import('../../src/lib/store.ts');
const { engineLoaded, sfx, soundOn } = await import('../../src/lib/sfx.ts');
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
