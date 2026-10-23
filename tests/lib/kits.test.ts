// 스타터 키트 (data/kits.json, K1 D131): 키트 id는 KIT_IDS(집계 구간)와 같은 순서이고, 주제는 KIT_THEMES 안에서 끼리끼리 붙어 있고,
// 재료 id는 모두 진열대에 있고(키트마다 3~12개), 구현안은 3~6줄, 홈 다섯 장은 주제마다 하나.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KITS_FILE, kits } from '../../scripts/catalog/load.ts';
import { KIT_IDS, KIT_THEMES, isKitId, isKitTheme } from '../../src/lib/kits.ts';

interface KitsFile {
  home: string[];
  kits: { id: string; theme: string; nameKo: string; descKo: string; items: string[]; outlineKo: string[] }[];
}
const file = JSON.parse(readFileSync(KITS_FILE, 'utf8')) as KitsFile;

describe('스타터 키트 자료', () => {
  it('키트 id는 KIT_IDS와 같은 순서, 30~45개', () => {
    expect(file.kits.map((k) => k.id)).toEqual([...KIT_IDS]);
    expect(KIT_IDS.length).toBeGreaterThanOrEqual(30);
    expect(KIT_IDS.length).toBeLessThanOrEqual(45);
    expect(isKitId('school')).toBe(true);
    expect(isKitId('nope')).toBe(false);
  });

  it('주제는 KIT_THEMES 순서대로 끼리끼리 붙어 있고, 교육 키트가 가장 많다', () => {
    for (const k of file.kits) expect(isKitTheme(k.theme), k.id).toBe(true);
    const runs = file.kits.map((k) => k.theme).filter((t, i, a) => i === 0 || a[i - 1] !== t);
    expect(runs).toEqual([...KIT_THEMES]);
    const count = (t: string): number => file.kits.filter((k) => k.theme === t).length;
    for (const t of KIT_THEMES) expect(count(t), t).toBeGreaterThanOrEqual(5);
    for (const t of KIT_THEMES.filter((x) => x !== 'edu')) expect(count('edu')).toBeGreaterThan(count(t));
  });

  it('키트마다 이름·설명이 있고, 재료는 3~12개(같은 재료 두 번 없이), 구현안은 3~6줄', () => {
    for (const k of file.kits) {
      expect(k.nameKo.length, k.id).toBeGreaterThan(0);
      expect(k.descKo.length, k.id).toBeGreaterThan(0);
      expect(k.items.length, k.id).toBeGreaterThanOrEqual(3);
      expect(k.items.length, k.id).toBeLessThanOrEqual(12);
      expect(new Set(k.items).size, k.id).toBe(k.items.length);
      expect(k.outlineKo.length, k.id).toBeGreaterThanOrEqual(3);
      expect(k.outlineKo.length, k.id).toBeLessThanOrEqual(6);
      for (const step of k.outlineKo) expect(step.trim().length, k.id).toBeGreaterThan(0);
    }
  });

  it('홈 다섯 장은 있는 키트이고 주제마다 하나', () => {
    expect(file.home).toHaveLength(5);
    const themes = file.home.map((id) => file.kits.find((k) => k.id === id)?.theme);
    expect(new Set(themes)).toEqual(new Set(KIT_THEMES));
  });

  it('학교 정보 키트는 초·중·고·특수학교 시간표를 모두 담는다 (소유자 2026-10-20)', () => {
    const school = file.kits.find((k) => k.id === 'school');
    for (const id of ['data-go-kr:15122331', 'data-go-kr:15122332', 'data-go-kr:15122333', 'data-go-kr:15122396']) expect(school?.items).toContain(id);
  });

  it('재료 id는 모두 진열대에 있다 (진열대 빌드가 카드로 바꾼다)', { timeout: 120_000 }, () => {
    const built = kits();
    expect(built.map((k) => k.cards.length)).toEqual(file.kits.map((k) => k.items.length));
    for (const k of built) for (const c of k.cards) expect(c.name.length).toBeGreaterThan(0);
    expect(built.map((k) => k.outline)).toEqual(file.kits.map((k) => k.outlineKo));
  });
});
