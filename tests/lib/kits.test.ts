// 스타터 키트 (data/kits.json): 키트 id는 KIT_IDS(집계 구간)와 같고, 재료 id는 모두 진열대에 있고, 키트마다 3~10개.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KITS_FILE, kits } from '../../scripts/catalog/load.ts';
import { KIT_IDS, isKitId } from '../../src/lib/kits.ts';

interface KitsFile {
  kits: { id: string; nameKo: string; descKo: string; items: string[] }[];
}
const file = JSON.parse(readFileSync(KITS_FILE, 'utf8')) as KitsFile;

describe('스타터 키트 자료', () => {
  it('키트 id는 KIT_IDS와 같은 순서', () => {
    expect(file.kits.map((k) => k.id)).toEqual([...KIT_IDS]);
    expect(isKitId('school')).toBe(true);
    expect(isKitId('nope')).toBe(false);
  });

  it('키트마다 이름·설명이 있고, 재료는 3~10개, 같은 재료를 두 번 넣지 않는다', () => {
    for (const k of file.kits) {
      expect(k.nameKo.length).toBeGreaterThan(0);
      expect(k.descKo.length).toBeGreaterThan(0);
      expect(k.items.length).toBeGreaterThanOrEqual(3);
      expect(k.items.length).toBeLessThanOrEqual(10);
      expect(new Set(k.items).size).toBe(k.items.length);
    }
  });

  it('재료 id는 모두 진열대에 있다 (진열대 빌드가 카드로 바꾼다)', { timeout: 120_000 }, () => {
    const built = kits();
    expect(built.map((k) => k.cards.length)).toEqual(file.kits.map((k) => k.items.length));
    for (const k of built) for (const c of k.cards) expect(c.name.length).toBeGreaterThan(0);
  });
});
