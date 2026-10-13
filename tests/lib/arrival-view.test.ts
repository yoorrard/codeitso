// 설계도 받기에서 지금 보는 영수증 (brief 6.8, D70): 영수증 링크 읽은 결과 → 내 것·남의 것·깨진 링크, 그리고 화면이 그릴 결과
import { describe, expect, it } from 'vitest';
import { resultFor, viewOf } from '../../src/lib/arrival-view.ts';
import { evaluate } from '../../src/lib/engine/index.ts';
import { readShareHash, shareHash } from '../../src/lib/share.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat = realCatalog();
const recipe = cat.data.recipes.recipes[0];
if (!recipe) throw new Error('레시피가 없습니다');
const issuable = evaluate(cat, { answers: recipe.answers, cart: recipe.cart, kept: recipe.kept ?? [] });
const own = evaluate(cat, {});

describe('viewOf: 영수증 링크 → 볼 것', () => {
  it('링크가 없으면 내 것, 풀 수 없으면 깨진 링크', () => {
    expect(viewOf(cat, { status: 'none' })).toEqual({ kind: 'own' });
    expect(viewOf(cat, { status: 'broken' })).toEqual({ kind: 'broken' });
    expect(viewOf(cat, readShareHash('#r=zzzz'))).toEqual({ kind: 'broken' });
  });

  it('설계도를 낼 수 있는 상태의 링크는 남의 영수증(읽기 전용)으로 본다', () => {
    expect(issuable.canIssue).toBe(true);
    const v = viewOf(cat, readShareHash(shareHash(issuable.session)));
    expect(v.kind).toBe('shared');
  });

  it('풀 수는 있어도 막힌 곳이 남은 상태면 깨진 링크로 본다 (빈 상태·상태 한 줄·주 버튼이 같은 까닭을 말하게)', () => {
    const blocked = evaluate(cat, { answers: recipe.answers, cart: [] });
    expect(blocked.canIssue).toBe(false);
    expect(viewOf(cat, readShareHash(shareHash(blocked.session)))).toEqual({ kind: 'broken' });
  });
});

describe('resultFor: 화면이 그릴 결과', () => {
  it('내 것·깨진 링크는 내 결과 그대로, 남의 것은 그 상태를 평가하고 같은 링크는 한 번만 평가한다', () => {
    expect(resultFor(cat, { kind: 'own' }, own)).toBe(own);
    expect(resultFor(cat, { kind: 'broken' }, own)).toBe(own);
    const v = viewOf(cat, readShareHash(shareHash(issuable.session)));
    const a = resultFor(cat, v, own);
    expect(a).not.toBe(own);
    expect(a.canIssue).toBe(true);
    expect(a.session.cart).toEqual(issuable.session.cart);
    expect(resultFor(cat, v, own)).toBe(a);
  });
});
