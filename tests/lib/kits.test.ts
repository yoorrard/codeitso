// 스타터 키트 (data/kits.json, K1 D131): 키트 id는 KIT_IDS(집계 구간)와 같은 순서이고, 주제는 KIT_THEMES 안에서 끼리끼리 붙어 있고,
// 재료 id는 모두 진열대에 있고(키트마다 3~12개), 구현안은 3~6줄, 홈 다섯 장은 주제마다 하나.
// 출처가 뺀 재료는 빌드가 빼고 계속한다(D163). PR 검사에서는 빠진 재료가 있으면 실패해 data/kits.json을 고치게 하고,
// 매일 갱신(daily-refresh.yml, KITS_MISSING_OK=1)에서는 알리기만 한다 (재료 하나 때문에 자료 갱신 전체가 멈추지 않게).
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { KitMissing } from '../../scripts/catalog/load.ts';
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
    const missing: KitMissing[] = [];
    const built = kits(KITS_FILE, missing);
    if (process.env['KITS_MISSING_OK'] === '1') {
      for (const m of missing) console.warn(`스타터 키트 ${m.kit}의 재료 ${m.id}가 진열대에 없다 (data/kits.json에서 바꾼다)`);
    } else {
      expect(missing, '출처가 뺀 재료: data/kits.json에서 진열대에 있는 id로 바꾼다').toEqual([]);
    }
    const lost = (kit: string): number => missing.filter((m) => m.kit === kit).length;
    expect(built.map((k) => k.cards.length)).toEqual(file.kits.map((k) => k.items.length - lost(k.id)));
    for (const k of built) for (const c of k.cards) expect(c.name.length).toBeGreaterThan(0);
    expect(built.map((k) => k.outline)).toEqual(file.kits.map((k) => k.outlineKo));
  });

  it('진열대에 없는 재료는 빌드를 멈추지 않고 빼고 알린다 (D163)', { timeout: 120_000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), 'kits-'));
    try {
      const real = file.kits[0];
      if (!real) throw new Error('data/kits.json에 키트가 없다');
      const path = join(dir, 'kits.json');
      writeFileSync(path, JSON.stringify({ home: [], kits: [{ ...real, id: 'test-kit', items: [...real.items.slice(0, 2), 'nope:gone-from-source'] }] }));
      const missing: KitMissing[] = [];
      const built = kits(path, missing);
      expect(missing).toEqual([{ kit: 'test-kit', id: 'nope:gone-from-source' }]);
      expect(built[0]?.cards).toHaveLength(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
