// 이용 가이드 (O1, D138): 저절로 열리는 쪽, 싣는 용어, 걸음 번호, 저장 모양
import { describe, expect, it } from 'vitest';
import glossary from '../../data/glossary.json';
import { TOUR_STEPS, TOUR_TERMS, clampStep, tourAutoPath } from '../../src/lib/guide.ts';
import { EMPTY_GUIDE, isEmptyGuide, readGuide } from '../../src/lib/saved.ts';

describe('tourAutoPath', () => {
  it('둘러보는 쪽(처음·카테고리·목록·검색·상세·키트)에서만 저절로 연다', () => {
    for (const p of ['/', '/c', '/c/', '/c/ai', '/c/ai/mcp', '/c/ai/mcp/', '/search', '/search/', '/item', '/kits']) expect(tourAutoPath(p), p).toBe(true);
  });

  it('할 일을 들고 온 쪽(장바구니·비교·찜·지난 프롬프트·최근 본 재료·법 문서·소개·용어 사전·없는 쪽)에서는 열지 않는다', () => {
    for (const p of ['/cart', '/compare', '/wishlist', '/prompts', '/recent', '/receipt', '/legal/privacy', '/about', '/about/credits', '/terms', '/404', '/category', '/items']) {
      expect(tourAutoPath(p), p).toBe(false);
    }
  });
});

describe('가이드 걸음과 용어', () => {
  it('걸음은 5~8개이고 겹치지 않는다', () => {
    expect(TOUR_STEPS.length).toBeGreaterThanOrEqual(5);
    expect(TOUR_STEPS.length).toBeLessThanOrEqual(8);
    expect(new Set(TOUR_STEPS).size).toBe(TOUR_STEPS.length);
  });

  it('싣는 용어는 모두 용어 자료에 있다 (풀이를 지어내지 않는다)', () => {
    const ids = new Set(glossary.terms.map((t) => t.id));
    for (const id of TOUR_TERMS) expect(ids.has(id), id).toBe(true);
  });

  it('걸음 번호는 0 ~ 마지막 사이로 고른다', () => {
    expect(clampStep(-3)).toBe(0);
    expect(clampStep(2.7)).toBe(2);
    expect(clampStep(99)).toBe(TOUR_STEPS.length - 1);
    expect(clampStep(Number.NaN)).toBe(0);
  });
});

describe('readGuide', () => {
  it('참(true)만 믿고, 나머지 모양은 처음 값으로', () => {
    expect(readGuide({ tour: true })).toEqual({ tour: true, hint: false });
    expect(readGuide({ tour: true, hint: true })).toEqual({
      tour: true,
      hint: true,
    });
    expect(readGuide({ tour: 'yes', hint: 1 })).toEqual(EMPTY_GUIDE);
    expect(readGuide(null)).toEqual(EMPTY_GUIDE);
    expect(readGuide('깨진 값')).toEqual(EMPTY_GUIDE);
  });

  it('처음 값이면 저장하지 않는다 (키를 지운다)', () => {
    expect(isEmptyGuide(EMPTY_GUIDE)).toBe(true);
    expect(isEmptyGuide({ tour: true, hint: false })).toBe(false);
  });
});
