// 조건 판단·인터뷰·찾기 표·입력 정리 단위 시험 (T04). 명세: docs/ENGINE.md 0절(입구)과 1절(인터뷰)
import { describe, expect, it } from 'vitest';
import type { Ctx } from '../../src/lib/engine/index.ts';
import {
  answerChips,
  cartProducts,
  cmp,
  evalCondition,
  evaluate,
  makeCatalog,
  matchProduct,
  matchingRecipes,
  normalizeSession,
  runInterview,
} from '../../src/lib/engine/index.ts';
import { hasTag, productField, tagsWithPrefix, usesCart } from '../../src/lib/engine/conditions.ts';
import type { Condition, Product, ProductField, Recipe, Scalar, Session } from '../../src/lib/engine/types.ts';
import { card, concept, conflictRule, option, product, question, realCatalog, slotRule, tinyCatalog, tinyData } from '../fixtures/tiny.ts';

function ctx(parts: Partial<Ctx> = {}): Ctx {
  return { tags: {}, answers: {}, cart: [], deferred: [], ...parts };
}

function recipe(id: string, answers: Record<string, string>): Recipe {
  return { id, title: `레시피 ${id}`, summary: `${id} 요약`, forWho: '누구나', answers, cart: [] };
}

const ids = (xs: { id: string }[]): string[] => xs.map((x) => x.id);

// ── 조건 ─────────────────────────────────────────────────────

describe('조건: 답·태그', () => {
  it('always는 늘 참', () => {
    expect(evalCondition({ always: true }, ctx())).toBe(true);
  });

  it('answer is: 같은 보기일 때만 참', () => {
    const c: Condition = { answer: 'q.a', is: 'x' };
    expect(evalCondition(c, ctx({ answers: { 'q.a': 'x' } }))).toBe(true);
    expect(evalCondition(c, ctx({ answers: { 'q.a': 'y' } }))).toBe(false);
    expect(evalCondition(c, ctx({ answers: { 'q.b': 'x' } }))).toBe(false);
  });

  it('answer in: 목록에 든 보기면 참, 답이 없으면 거짓', () => {
    const c: Condition = { answer: 'q.a', in: ['x', 'y'] };
    expect(evalCondition(c, ctx({ answers: { 'q.a': 'x' } }))).toBe(true);
    expect(evalCondition(c, ctx({ answers: { 'q.a': 'y' } }))).toBe(true);
    expect(evalCondition(c, ctx({ answers: { 'q.a': 'z' } }))).toBe(false);
    expect(evalCondition(c, ctx())).toBe(false);
  });

  it('tag gte: 합계가 기준 이상이면 참, 없는 태그는 0', () => {
    const c: Condition = { tag: 't.x', gte: 2 };
    expect(evalCondition(c, ctx({ tags: { 't.x': 1 } }))).toBe(false);
    expect(evalCondition(c, ctx({ tags: { 't.x': 2 } }))).toBe(true);
    expect(evalCondition(c, ctx({ tags: { 't.x': 3 } }))).toBe(true);
    expect(evalCondition(c, ctx())).toBe(false);
    expect(evalCondition({ tag: 't.x', gte: 0 }, ctx())).toBe(true);
  });

  it('deferred: 그 칸을 2차로 미뤘을 때만 참', () => {
    const c: Condition = { deferred: 'notify' };
    expect(evalCondition(c, ctx({ deferred: ['auth', 'notify'] }))).toBe(true);
    expect(evalCondition(c, ctx({ deferred: ['auth'] }))).toBe(false);
    expect(evalCondition(c, ctx())).toBe(false);
  });
});

describe('조건: 장바구니', () => {
  const store = product('p.store', { capabilities: ['store'], access: 'key' });
  const screen = product('p.screen', { capabilities: ['screen'] });

  it('cartHas: 그 id가 담겼을 때만 참', () => {
    expect(evalCondition({ cartHas: 'p.store' }, ctx({ cart: [screen, store] }))).toBe(true);
    expect(evalCondition({ cartHas: 'p.store' }, ctx({ cart: [screen] }))).toBe(false);
    expect(evalCondition({ cartHas: 'p.store' }, ctx())).toBe(false);
  });

  it('cartAny capability: 그 기능 상품이 하나라도 있으면 참', () => {
    expect(evalCondition({ cartAny: { capability: 'store' } }, ctx({ cart: [screen, store] }))).toBe(true);
    expect(evalCondition({ cartAny: { capability: 'auth' } }, ctx({ cart: [screen, store] }))).toBe(false);
    expect(evalCondition({ cartAny: { capability: 'screen' } }, ctx())).toBe(false);
  });

  it('cartAny는 기능과 값을 한 상품이 함께 만족해야 참', () => {
    // store는 기능만, screen은 값(access none)만 맞는다
    const c: Condition = { cartAny: { capability: 'store', field: 'access', is: 'none' } };
    expect(evalCondition(c, ctx({ cart: [store, screen] }))).toBe(false);
    const freeStore = product('p.free-store', { capabilities: ['store'] });
    expect(evalCondition(c, ctx({ cart: [store, freeStore] }))).toBe(true);
  });

  const fieldCases: { field: ProductField; hit: Partial<Product>; miss: Partial<Product>; is: Scalar; in: Scalar[] }[] = [
    { field: 'provider.type', hit: { provider: { type: 'community', name: '모임' } }, miss: {}, is: 'community', in: ['community', 'generic'] },
    { field: 'access', hit: { access: 'approval' }, miss: {}, is: 'approval', in: ['key', 'approval'] },
    { field: 'realtime', hit: { realtime: 'realtime' }, miss: { realtime: 'daily' }, is: 'realtime', in: ['realtime', 'frequent'] },
    { field: 'serverRegion', hit: { serverRegion: 'kr' }, miss: {}, is: 'kr', in: ['kr', 'local'] },
    { field: 'layer', hit: { layer: 'index' }, miss: {}, is: 'index', in: ['index'] },
    { field: 'cost.free', hit: { cost: { free: false, note: '유료' } }, miss: {}, is: false, in: [false] },
    { field: 'keyExposureRisk', hit: { keyExposureRisk: true }, miss: {}, is: true, in: [true] },
    { field: 'publicKey', hit: { publicKey: true }, miss: {}, is: true, in: [true] },
    { field: 'recommendable', hit: { recommendable: false }, miss: {}, is: false, in: [false] },
  ];

  it.each(fieldCases)('cartAny $field: is와 in', ({ field, hit, miss, is, in: list }) => {
    const yes = product('p.hit', hit);
    const no = product('p.miss', miss);
    expect(evalCondition({ cartAny: { field, is } }, ctx({ cart: [no, yes] }))).toBe(true);
    expect(evalCondition({ cartAny: { field, is } }, ctx({ cart: [no] }))).toBe(false);
    expect(evalCondition({ cartAny: { field, in: list } }, ctx({ cart: [no, yes] }))).toBe(true);
    expect(evalCondition({ cartAny: { field, in: list } }, ctx({ cart: [no] }))).toBe(false);
  });

  it('cost.free true는 무료 상품을 찾는다', () => {
    const paid = product('p.paid', { cost: { free: false, note: '유료' } });
    const free = product('p.free');
    expect(evalCondition({ cartAny: { field: 'cost.free', is: true } }, ctx({ cart: [paid] }))).toBe(false);
    expect(evalCondition({ cartAny: { field: 'cost.free', is: true } }, ctx({ cart: [paid, free] }))).toBe(true);
  });

  it('갱신 주기가 없는 상품은 realtime is·in 모두 거짓', () => {
    const none = product('p.none');
    expect(evalCondition({ cartAny: { field: 'realtime', is: 'static' } }, ctx({ cart: [none] }))).toBe(false);
    expect(evalCondition({ cartAny: { field: 'realtime', in: ['static', 'daily'] } }, ctx({ cart: [none] }))).toBe(false);
  });

  it('publicKey가 없는 상품은 false로 본다', () => {
    const none = product('p.none');
    expect(evalCondition({ cartAny: { field: 'publicKey', is: false } }, ctx({ cart: [none] }))).toBe(true);
    expect(evalCondition({ cartAny: { field: 'publicKey', in: [false] } }, ctx({ cart: [none] }))).toBe(true);
  });
});

describe('조건: 묶기', () => {
  // 태그 a가 있고, (q가 x이거나 p1이 장바구니에 없을 때)
  const c: Condition = {
    all: [{ tag: 't.a', gte: 1 }, { any: [{ answer: 'q', is: 'x' }, { not: { cartHas: 'p1' } }] }],
  };
  const p1 = product('p1');

  it('all·any·not을 겹쳐 쓸 수 있다', () => {
    expect(evalCondition(c, ctx({ tags: { 't.a': 1 }, answers: { q: 'y' }, cart: [p1] }))).toBe(false);
    expect(evalCondition(c, ctx({ tags: { 't.a': 1 }, answers: { q: 'y' }, cart: [] }))).toBe(true);
    expect(evalCondition(c, ctx({ tags: { 't.a': 1 }, answers: { q: 'x' }, cart: [p1] }))).toBe(true);
    expect(evalCondition(c, ctx({ tags: {}, answers: { q: 'x' }, cart: [] }))).toBe(false);
  });

  it('not은 뒤집는다', () => {
    expect(evalCondition({ not: { always: true } }, ctx())).toBe(false);
    expect(evalCondition({ not: { not: { always: true } } }, ctx())).toBe(true);
    expect(evalCondition({ not: { deferred: 'notify' } }, ctx({ deferred: ['notify'] }))).toBe(false);
  });

  it('빈 all은 참, 빈 any는 거짓', () => {
    expect(evalCondition({ all: [] }, ctx())).toBe(true);
    expect(evalCondition({ any: [] }, ctx())).toBe(false);
  });
});

describe('usesCart', () => {
  it('장바구니·2차 조건이면 참', () => {
    expect(usesCart({ cartHas: 'p1' })).toBe(true);
    expect(usesCart({ cartAny: { capability: 'store' } })).toBe(true);
    expect(usesCart({ deferred: 'notify' })).toBe(true);
  });

  it('답·태그·always만 쓰면 거짓', () => {
    expect(usesCart({ always: true })).toBe(false);
    expect(usesCart({ answer: 'q', is: 'x' })).toBe(false);
    expect(usesCart({ answer: 'q', in: ['x'] })).toBe(false);
    expect(usesCart({ tag: 't', gte: 1 })).toBe(false);
    expect(usesCart({ all: [{ tag: 't', gte: 1 }, { any: [{ not: { answer: 'q', is: 'x' } }] }] })).toBe(false);
  });

  it('깊이 묻힌 장바구니 조건도 찾는다', () => {
    expect(usesCart({ all: [{ tag: 't', gte: 1 }, { cartHas: 'p1' }] })).toBe(true);
    expect(usesCart({ any: [{ answer: 'q', is: 'x' }, { deferred: 'auth' }] })).toBe(true);
    expect(usesCart({ not: { cartAny: { field: 'layer', is: 'index' } } })).toBe(true);
    expect(usesCart({ all: [{ any: [{ not: { cartHas: 'p1' } }] }] })).toBe(true);
  });
});

describe('태그 도우미', () => {
  it('hasTag: 1 이상일 때만 참', () => {
    expect(hasTag({ 't.x': 1 }, 't.x')).toBe(true);
    expect(hasTag({ 't.x': 3 }, 't.x')).toBe(true);
    expect(hasTag({ 't.x': 0 }, 't.x')).toBe(false);
    expect(hasTag({ 't.x': -1 }, 't.x')).toBe(false);
    expect(hasTag({}, 't.x')).toBe(false);
  });

  it('tagsWithPrefix: 접두어가 맞고 1 이상인 태그를 정렬해서', () => {
    const tags = { 'domain.b': 1, 'domain.a': 2, 'domain.c': 0, 'domain.B': 1, 'ai.agent': 1, domainx: 1 };
    expect(tagsWithPrefix(tags, 'domain.')).toEqual(['domain.B', 'domain.a', 'domain.b']);
    expect(tagsWithPrefix(tags, 'topic.')).toEqual([]);
  });
});

describe('productField·matchProduct', () => {
  it('productField는 칸마다 상품 값을 낸다', () => {
    const p = product('p', {
      provider: { type: 'generic', name: '누구나' },
      access: 'signup',
      realtime: 'frequent',
      serverRegion: 'overseas',
      layer: 'index',
      cost: { free: false, note: '유료' },
      keyExposureRisk: true,
      publicKey: true,
      recommendable: false,
    });
    const fields: ProductField[] = [
      'provider.type',
      'access',
      'realtime',
      'serverRegion',
      'layer',
      'cost.free',
      'keyExposureRisk',
      'publicKey',
      'recommendable',
    ];
    expect(fields.map((f) => productField(p, f))).toEqual(['generic', 'signup', 'frequent', 'overseas', 'index', false, true, true, false]);
  });

  it('productField: 없는 갱신 주기는 undefined, 없는 공개 키는 false', () => {
    const p = product('p');
    expect(productField(p, 'realtime')).toBeUndefined();
    expect(productField(p, 'publicKey')).toBe(false);
  });

  it('matchProduct: 빈 조건은 참, 기능과 값은 모두 맞아야', () => {
    const p = product('p', { capabilities: ['store', 'auth'], access: 'key' });
    expect(matchProduct(p, {})).toBe(true);
    expect(matchProduct(p, { capability: 'auth' })).toBe(true);
    expect(matchProduct(p, { capability: 'host' })).toBe(false);
    expect(matchProduct(p, { capability: 'store', field: 'access', is: 'key' })).toBe(true);
    expect(matchProduct(p, { capability: 'store', field: 'access', is: 'none' })).toBe(false);
    expect(matchProduct(p, { capability: 'host', field: 'access', is: 'key' })).toBe(false);
    expect(matchProduct(p, { field: 'access', in: ['none', 'key'] })).toBe(true);
    expect(matchProduct(p, { field: 'access', in: ['none', 'signup'] })).toBe(false);
  });
});

// ── 인터뷰 ───────────────────────────────────────────────────

// q1 → (q1이 a일 때) q2 → (t.x 합계 2 이상일 때) q3 → q4
const q1 = question('q1', [option('a', { 't.x': 1, 't.y': 1 }), option('b', { 't.z': 1 })], { chip: '종류' });
const q2 = question('q2', [option('c', { 't.x': 1 }), option('c2')], { showIf: { answer: 'q1', is: 'a' } });
const q3 = question('q3', [option('d')], { showIf: { tag: 't.x', gte: 2 } });
const q4 = question('q4', [option('e'), option('f')]);

function interviewCatalog() {
  return tinyCatalog({ questions: [q1, q2, q3, q4] });
}

describe('runInterview', () => {
  it('답이 없으면 조건 없는 질문만 적힌 순서대로 보이고 첫 질문이 다음', () => {
    const s = runInterview(interviewCatalog(), {});
    expect(ids(s.visible)).toEqual(['q1', 'q4']);
    expect(s.next?.id).toBe('q1');
    expect(s.answered).toBe(0);
    expect(s.total).toBe(2);
    expect(s.tags).toEqual({});
  });

  it('답에 따라 다음 질문이 열린다', () => {
    const cat = interviewCatalog();
    const s1 = runInterview(cat, { q1: 'a' });
    expect(ids(s1.visible)).toEqual(['q1', 'q2', 'q4']);
    expect(s1.next?.id).toBe('q2');
    expect(s1.tags).toEqual({ 't.x': 1, 't.y': 1 });

    const s2 = runInterview(cat, { q1: 'a', q2: 'c' });
    expect(ids(s2.visible)).toEqual(['q1', 'q2', 'q3', 'q4']);
    expect(s2.next?.id).toBe('q3');
  });

  it('같은 태그는 합산하고, 다 답하면 next가 null', () => {
    const s = runInterview(interviewCatalog(), { q1: 'a', q2: 'c', q3: 'd', q4: 'e' });
    expect(s.tags).toEqual({ 't.x': 2, 't.y': 1 });
    expect(s.answers).toEqual({ q1: 'a', q2: 'c', q3: 'd', q4: 'e' });
    expect(s.next).toBeNull();
    expect(s.answered).toBe(4);
    expect(s.total).toBe(4);
  });

  it('다음 질문은 보이는 질문 중 답 없는 첫 질문', () => {
    const s = runInterview(interviewCatalog(), { q1: 'b', q4: 'e' });
    expect(s.next).toBeNull();
    const t = runInterview(interviewCatalog(), { q1: 'a', q4: 'f' });
    expect(t.next?.id).toBe('q2');
    expect(t.answered).toBe(2);
    expect(t.total).toBe(3);
  });

  it('노출 조건은 앞서 보인 질문의 답과 태그만 본다', () => {
    // 뒤 질문의 답·태그로는 앞 질문이 열리지 않는다
    const early = question('q.early', [option('o')], { showIf: { answer: 'q.late', is: 'z' } });
    const earlyTag = question('q.early-tag', [option('o')], { showIf: { tag: 't.late', gte: 1 } });
    const late = question('q.late', [option('z', { 't.late': 1 })]);
    const after = question('q.after', [option('o')], { showIf: { tag: 't.late', gte: 1 } });
    const cat = tinyCatalog({ questions: [early, earlyTag, late, after] });
    const s = runInterview(cat, { 'q.late': 'z', 'q.early': 'o', 'q.early-tag': 'o' });
    expect(ids(s.visible)).toEqual(['q.late', 'q.after']);
    expect(s.answers).toEqual({ 'q.late': 'z' });
    expect(s.next?.id).toBe('q.after');
  });

  it('숨은 앞 질문의 답으로는 뒤 질문이 열리지 않는다', () => {
    // q5는 q2가 c일 때만 보인다. q1이 b라 q2가 숨으면 예전에 고른 q2:c는 없는 답으로 본다
    const q5 = question('q5', [option('g')], { showIf: { answer: 'q2', in: ['c'] } });
    const cat = tinyCatalog({ questions: [q1, q2, q5, q4] });
    expect(ids(runInterview(cat, { q1: 'a', q2: 'c' }).visible)).toEqual(['q1', 'q2', 'q5', 'q4']);
    const s = runInterview(cat, { q1: 'b', q2: 'c', q5: 'g' });
    expect(ids(s.visible)).toEqual(['q1', 'q4']);
    expect(s.answers).toEqual({ q1: 'b' });
  });

  it('숨은 질문의 답과 태그는 세지 않는다', () => {
    // q1이 b라 q2가 숨으면 q2의 t.x가 더해지지 않아 q3도 숨는다
    const s = runInterview(interviewCatalog(), { q1: 'b', q2: 'c', q3: 'd' });
    expect(ids(s.visible)).toEqual(['q1', 'q4']);
    expect(s.answers).toEqual({ q1: 'b' });
    expect(s.tags).toEqual({ 't.z': 1 });
    expect(s.next?.id).toBe('q4');
  });

  it('앞 답을 바꿨다가 되돌리면 숨었던 답이 살아난다', () => {
    const cat = interviewCatalog();
    const raw = { q1: 'a', q2: 'c', q3: 'd' };
    expect(runInterview(cat, raw).answers).toEqual({ q1: 'a', q2: 'c', q3: 'd' });
    const changed = { ...raw, q1: 'b' };
    expect(runInterview(cat, changed).answers).toEqual({ q1: 'b' });
    expect(changed).toEqual({ q1: 'b', q2: 'c', q3: 'd' });
    const back = runInterview(cat, { ...changed, q1: 'a' });
    expect(back.answers).toEqual({ q1: 'a', q2: 'c', q3: 'd' });
    expect(back.tags).toEqual({ 't.x': 2, 't.y': 1 });
  });

  it('없는 질문·보기의 답은 버린다', () => {
    const s = runInterview(interviewCatalog(), { q1: 'nope', 'q.ghost': 'a', q4: 'e' });
    expect(s.answers).toEqual({ q4: 'e' });
    expect(s.tags).toEqual({});
    expect(s.next?.id).toBe('q1');
    expect(s.answered).toBe(1);
  });

  it('노출 조건에서 장바구니·2차 조건은 늘 비어 있다고 본다', () => {
    const byCart = question('q.cart', [option('o')], { showIf: { cartHas: 'p1' } });
    const notCart = question('q.no-cart', [option('o')], { showIf: { not: { cartAny: { capability: 'screen' } } } });
    const byDeferred = question('q.deferred', [option('o')], { showIf: { deferred: 'notify' } });
    const cat = tinyCatalog({
      questions: [byCart, notCart, byDeferred],
      rules: [slotRule('slot.notify', { id: 'notify', capability: 'notify', deferrable: true, order: 45 })],
      products: [product('p1')],
    });
    const r = evaluate(cat, { cart: ['p1'], deferred: ['notify'] });
    expect(r.session.deferred).toEqual(['notify']);
    expect(ids(r.interview.visible)).toEqual(['q.no-cart']);
  });
});

describe('answerChips', () => {
  it('답한 보이는 질문의 짧은 이름(없으면 질문)과 고른 보기, 질문 순서대로', () => {
    const cat = interviewCatalog();
    const s = runInterview(cat, { q4: 'f', q1: 'a' });
    expect(answerChips(cat, s)).toEqual([
      { questionId: 'q1', chip: '종류', label: '보기 a' },
      { questionId: 'q4', chip: '질문 q4', label: '보기 f' },
    ]);
  });

  it('숨은 질문의 답은 칩이 되지 않는다', () => {
    const cat = interviewCatalog();
    const s = runInterview(cat, { q1: 'b', q2: 'c' });
    expect(answerChips(cat, s)).toEqual([{ questionId: 'q1', chip: '종류', label: '보기 b' }]);
  });

  it('답이 없으면 칩도 없다', () => {
    const cat = interviewCatalog();
    expect(answerChips(cat, runInterview(cat, {}))).toEqual([]);
  });

  it('상태에 없는 보기가 들어 있으면 그 칩만 건너뛴다', () => {
    const cat = interviewCatalog();
    const s = runInterview(cat, { q1: 'b', q4: 'e' });
    const broken = { ...s, answers: { ...s.answers, q1: 'ghost' } };
    expect(answerChips(cat, broken)).toEqual([{ questionId: 'q4', chip: '질문 q4', label: '보기 e' }]);
  });
});

describe('matchingRecipes', () => {
  const recipes = [
    recipe('r.zeta', { q1: 'a' }),
    recipe('r.wrong', { q1: 'b' }),
    recipe('r.both', { q1: 'a', q4: 'e' }),
    recipe('r.alpha', { q4: 'e' }),
    recipe('r.other', { q1: 'a', q4: 'f' }),
  ];
  const cat = tinyCatalog({ questions: [q1, q2, q3, q4], recipes });

  it('어긋나지 않는 레시피를 같은 답이 많은 순으로, 기본 2개', () => {
    const s = runInterview(cat, { q1: 'a', q4: 'e' });
    expect(matchingRecipes(cat, s)).toEqual(['r.both', 'r.zeta']);
  });

  it('같은 답 수가 같으면 레시피 순서 (id 순이 아님)', () => {
    const s = runInterview(cat, { q1: 'a', q4: 'e' });
    expect(matchingRecipes(cat, s, 10)).toEqual(['r.both', 'r.zeta', 'r.alpha']);
    expect(matchingRecipes(cat, s, 1)).toEqual(['r.both']);
  });

  it('하나라도 다른 답이 있으면 뺀다', () => {
    const s = runInterview(cat, { q1: 'b', q4: 'f' });
    expect(matchingRecipes(cat, s, 10)).toEqual(['r.wrong']);
  });

  it('숨은 질문의 답은 맞춰 보지 않는다', () => {
    const hid = tinyCatalog({ questions: [q1, q2, q3, q4], recipes: [recipe('r.hidden', { q1: 'b', q2: 'c2' })] });
    // q1이 b라 q2는 숨고, 이용자가 예전에 고른 q2:c는 무시된다
    const s = runInterview(hid, { q1: 'b', q2: 'c' });
    expect(matchingRecipes(hid, s)).toEqual(['r.hidden']);
  });

  it('진짜 레시피는 자기 답으로 인터뷰가 끝나고 자기가 첫째로 나온다', () => {
    const real = realCatalog();
    expect(real.data.recipes.recipes.length).toBeGreaterThan(0);
    for (const r of real.data.recipes.recipes) {
      const s = runInterview(real, r.answers);
      expect(s.next, r.id).toBeNull();
      expect(matchingRecipes(real, s, 1), r.id).toEqual([r.id]);
    }
  });
});

// ── 입력 정리 ────────────────────────────────────────────────

describe('normalizeSession', () => {
  const cat = tinyCatalog({
    questions: [q1, q2, q3, q4],
    products: [product('p1'), product('p2'), product('p3')],
  });

  it('빈 입력은 빈 상태', () => {
    expect(normalizeSession(cat, {})).toEqual({ answers: {}, cart: [], kept: [], deferred: [] });
  });

  it('없는 질문·보기의 답과 문자열이 아닌 값을 버린다', () => {
    const answers = { q1: 'a', q2: 'nope', 'q.ghost': 'a', q4: 1, q3: null } as unknown as Record<string, string>;
    expect(normalizeSession(cat, { answers }).answers).toEqual({ q1: 'a' });
  });

  it('다른 질문의 보기 id를 답으로 넣으면 버린다', () => {
    // e는 q4의 보기라 q1의 답이 될 수 없다
    expect(normalizeSession(cat, { answers: { q1: 'e', q4: 'e' } }).answers).toEqual({ q4: 'e' });
  });

  it('숨은 질문의 답은 지우지 않는다', () => {
    expect(normalizeSession(cat, { answers: { q1: 'b', q2: 'c' } }).answers).toEqual({ q1: 'b', q2: 'c' });
  });

  it('장바구니: 없는 상품·겹친 id·문자열 아닌 값을 버리고 담은 순서를 지킨다', () => {
    const cart = ['p3', 'ghost', 'p1', 7, 'p3', null, 'p2', 'p1'] as unknown as string[];
    expect(normalizeSession(cat, { cart }).cart).toEqual(['p3', 'p1', 'p2']);
  });

  it('kept·deferred: 문자열만, 겹친 id는 처음 것만', () => {
    const kept = ['k.b', 'k.a', 'k.b', 3] as unknown as string[];
    const deferred = ['notify', false, 'auth', 'notify'] as unknown as string[];
    const s = normalizeSession(cat, { kept, deferred });
    expect(s.kept).toEqual(['k.b', 'k.a']);
    expect(s.deferred).toEqual(['notify', 'auth']);
  });

  it('kept·deferred가 배열이 아니면 빈 배열', () => {
    const s = normalizeSession(cat, { kept: 'k.a', deferred: { a: 1 } } as unknown as Partial<Session>);
    expect(s.kept).toEqual([]);
    expect(s.deferred).toEqual([]);
  });

  it('자유 입력은 문자열일 때만 남긴다', () => {
    expect(normalizeSession(cat, { freeText: '급식 안내' }).freeText).toBe('급식 안내');
    const s = normalizeSession(cat, { freeText: 42 } as unknown as Partial<Session>);
    expect('freeText' in s).toBe(false);
  });
});

describe('evaluate 입구', () => {
  // 화면(꼭 채움) · 로그인(필수, 못 미룸) · 저장(필수, 미룰 수 있음) · 알림(미룰 수 있음) · 배포(q1이 b일 때만)
  const rules = [
    slotRule('slot.screen', { id: 'screen', capability: 'screen', required: true, mustFill: true, order: 10 }),
    slotRule('slot.store', { id: 'store', capability: 'store', required: true, deferrable: true, order: 20 }),
    slotRule('slot.auth', { id: 'auth', capability: 'auth', required: true, order: 30 }),
    slotRule('slot.notify', { id: 'notify', capability: 'notify', deferrable: true, order: 45 }),
    slotRule('slot.host', { id: 'host', capability: 'host', deferrable: true, order: 50 }, { answer: 'q1', is: 'b' }),
    conflictRule('conflict.live', { always: true }),
    conflictRule('conflict.off', { answer: 'q1', is: 'b' }),
  ];
  const cat = tinyCatalog({
    questions: [q1, q2, q3, q4],
    rules,
    products: [product('p.auth', { capabilities: ['auth'] }), product('p.screen')],
    // kept인 규칙 충돌은 조사 카드를 찾으므로 충돌 규칙이 가리키는 카드를 넣어 둔다
    cards: [card('card.x')],
  });

  it('미룰 수 없는 칸·열리지 않은 칸·없는 칸은 deferred에서 뺀다', () => {
    const r = evaluate(cat, { answers: { q1: 'a' }, deferred: ['auth', 'notify', 'host', 'ghost', 'screen', 'store'] });
    expect(r.session.deferred).toEqual(['notify', 'store']);
  });

  it('지금 없거나 그대로 둘 수 없는 충돌은 kept에서 뺀다', () => {
    const r = evaluate(cat, {
      answers: { q1: 'a' },
      kept: ['conflict.live', 'conflict.off', 'conflict.empty-slot:screen', 'conflict.empty-slot:auth', 'conflict.ghost'],
    });
    expect(r.session.kept).toEqual(['conflict.live', 'conflict.empty-slot:auth']);
    expect(r.conflicts.map((c) => [c.id, c.keepable, c.kept])).toEqual([
      ['conflict.live', true, true],
      ['conflict.empty-slot:screen', false, false],
      ['conflict.empty-slot:store', true, false],
      ['conflict.empty-slot:auth', true, true],
    ]);
  });

  it('채운 칸·미룬 칸의 빈 칸 충돌은 kept에서 빠진다', () => {
    const r = evaluate(cat, {
      answers: { q1: 'a' },
      cart: ['p.auth'],
      deferred: ['store'],
      kept: ['conflict.empty-slot:auth', 'conflict.empty-slot:store', 'conflict.live'],
    });
    expect(r.session.deferred).toEqual(['store']);
    expect(r.session.kept).toEqual(['conflict.live']);
    expect(r.conflicts.map((c) => c.id)).toEqual(['conflict.live', 'conflict.empty-slot:screen']);
  });

  it('조건이 바뀌어 열린 충돌·칸은 다시 남는다', () => {
    const r = evaluate(cat, { answers: { q1: 'b' }, kept: ['conflict.off'], deferred: ['host'] });
    expect(r.session.kept).toEqual(['conflict.off']);
    expect(r.session.deferred).toEqual(['host']);
  });

  it('정리된 상태를 r.session에 담고, 입력은 건드리지 않는다', () => {
    const input = {
      answers: { q1: 'b', q2: 'c', 'q.ghost': 'x' },
      cart: ['p.screen', 'ghost', 'p.screen', 'p.auth'],
      kept: ['conflict.live', 'conflict.live', 'conflict.ghost'],
      deferred: ['notify', 'auth'],
      freeText: '우리 반 퀴즈',
    };
    const before = structuredClone(input);
    const r = evaluate(cat, input);
    expect(r.session).toEqual({
      answers: { q1: 'b', q2: 'c' },
      cart: ['p.screen', 'p.auth'],
      kept: ['conflict.live'],
      deferred: ['notify'],
      freeText: '우리 반 퀴즈',
    });
    expect(input).toEqual(before);
    expect(ids(r.cart)).toEqual(['p.screen', 'p.auth']);
    // 숨은 q2의 답은 세션에 남지만 인터뷰는 무시한다
    expect(r.interview.answers).toEqual({ q1: 'b' });
  });

  it('done은 인터뷰가 끝났는지', () => {
    expect(evaluate(cat, { answers: { q1: 'b' } }).done).toBe(false);
    expect(evaluate(cat, { answers: { q1: 'b', q4: 'e' } }).done).toBe(true);
    expect(evaluate(cat, {}).session).toEqual({ answers: {}, cart: [], kept: [], deferred: [] });
  });
});

// ── 찾기 표 ──────────────────────────────────────────────────

describe('catalog', () => {
  it('cmp: 대문자가 소문자보다 먼저, 같으면 0', () => {
    expect(['b', 'B', 'a', 'A'].sort(cmp)).toEqual(['A', 'B', 'a', 'b']);
    expect(cmp('a', 'B')).toBeGreaterThan(0);
    expect(cmp('B', 'a')).toBeLessThan(0);
    expect(cmp('slot', 'slot')).toBe(0);
  });

  it('cmp: 로캘 순서가 아니라 코드 단위 순서', () => {
    // 로캘 비교라면 é가 e와 f 사이에 온다
    expect(['é', 'f', 'e'].sort(cmp)).toEqual(['e', 'f', 'é']);
    expect(['10', '9', '1'].sort(cmp)).toEqual(['1', '10', '9']);
  });

  it('cmp: 한글은 코드 단위 순서, 라틴 문자 뒤', () => {
    expect(['하', '다', '가', '나'].sort(cmp)).toEqual(['가', '나', '다', '하']);
    expect(['가', 'a', '1', 'Z'].sort(cmp)).toEqual(['1', 'Z', 'a', '가']);
    // 낱자 ㄱ(U+3131)은 음절 가(U+AC00)보다 앞, 짧은 말이 앞
    expect(['가나', '가', 'ㄱ'].sort(cmp)).toEqual(['ㄱ', '가', '가나']);
  });

  it('cmp: 코드 포인트가 아니라 UTF-16 코드 단위로 비교', () => {
    // 😀(U+1F600)는 대리 쌍 D83D DE00이라 코드 단위로는 ～(U+FF5E)보다 앞
    expect(['～', '\u{1F600}'].sort(cmp)).toEqual(['\u{1F600}', '～']);
  });

  it('cartProducts: 모르는 id와 겹친 id를 버리고 처음 순서를 지킨다', () => {
    const cat = tinyCatalog({ products: [product('p1'), product('p2'), product('p3')] });
    const out = cartProducts(cat, ['p3', 'ghost', 'p1', 'p3', 'p2', 'p1']);
    expect(ids(out)).toEqual(['p3', 'p1', 'p2']);
    expect(out[0]).toBe(cat.product.get('p3'));
    expect(cartProducts(cat, [])).toEqual([]);
  });

  it('makeCatalog: id로 찾는 표를 만든다', () => {
    const d = tinyData({
      questions: [q1],
      products: [product('p1')],
      concepts: [concept('c1')],
      cards: [card('card.a')],
    });
    const cat = makeCatalog(d);
    expect(cat.data).toBe(d);
    expect(cat.question.get('q1')).toBe(q1);
    expect(cat.product.get('p1')?.name).toBe('상품 p1');
    expect(cat.concept.get('c1')?.title).toBe('개념 c1');
    expect(cat.card.get('card.a')?.area).toBe('card.a 영역');
    const tag = d.taxonomy.tags[0];
    expect(tag).toBeDefined();
    if (tag) expect(cat.tagLabel.get(tag.id)).toBe(tag.label);
    expect(cat.tagLabel.size).toBe(d.taxonomy.tags.length);
  });
});
