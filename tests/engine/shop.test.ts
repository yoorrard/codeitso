// 장보기 엔진(shop.ts) 시험: 칸 만들기, 후보, 이용자 수준, 점수 항목 하나하나, 이유·아쉬운 점, 정렬, 추천·2위·비교·채움.
// 기대값은 docs/ENGINE.md 3절 표와 data/scoring.json 가중치로 손으로 계산했다.
import { describe, expect, it } from 'vitest';
import type { Catalog, Ctx, EngineResult, Scored, Slot, SlotRanking } from '../../src/lib/engine/index.ts';
import { evaluate, SCORE_KEYS } from '../../src/lib/engine/index.ts';
import { buildSlots, compareScored, rankAll, rankSlot, scoreProduct, slotCandidates, userLevel } from '../../src/lib/engine/shop.ts';
import type { Access, Capability, Product, ScoreKey, SlotDef } from '../../src/lib/engine/types.ts';
import { card, conflictRule, option, product, question, slotRule, tinyCatalog, tinyData } from '../fixtures/tiny.ts';

type Parts = Partial<Record<ScoreKey, number>>;

/** 점수 항목이 하나도 붙지 않는 바탕 상품: 공동체 제공·유료·가입 없음·난이도 1 */
function plain(id: string, extra: Partial<Product> = {}): Product {
  return product(id, { provider: { type: 'community', name: `${id} 모임` }, cost: { free: false, note: '유료' }, ...extra });
}

function slotOf(id: string, capability: Capability, extra: Partial<SlotDef> = {}): Slot {
  return { id, label: `칸 ${id}`, capability, required: false, order: 10, ...extra, ruleIds: [] };
}

function ctxOf(tags: Record<string, number> = {}, cart: Product[] = []): Ctx {
  return { tags, answers: {}, cart, deferred: [] };
}

function on(...tags: string[]): Record<string, number> {
  return Object.fromEntries(tags.map((t) => [t, 1]));
}

const SCREEN = slotOf('slot.screen', 'screen');

/** 칸 하나에서 상품 하나의 점수 (장바구니·열린 칸은 필요할 때만) */
function score(cat: Catalog, p: Product, tags: Record<string, number> = {}, slot: Slot = SCREEN, cart: Product[] = [], slots: Slot[] = [slot]): Scored {
  return scoreProduct(cat, p, slot, tags, cart, slots);
}

const ids = (xs: Scored[]): string[] => xs.map((s) => s.product.id);

function slotIn(r: EngineResult, id: string): SlotRanking {
  const s = r.slots.find((x) => x.slot.id === id);
  if (!s) throw new Error(`칸 없음: ${id}`);
  return s;
}

/** 답 하나로 태그를 한꺼번에 주는 질문 */
function tagQuestion(tags: Record<string, number>): ReturnType<typeof question> {
  return question('q.tags', [option('o', tags)]);
}
const ANSWERED = { 'q.tags': 'o' };

describe('점수표', () => {
  it('손 계산에 쓴 가중치와 같다', () => {
    const s = tinyData().scoring;
    expect(s.weights).toEqual({
      domainMatch: 3,
      topicMatch: 3,
      topicMissed: -3,
      aiToolMatch: 2,
      freeProduct: 2,
      paidWhenBudgetFree: -4,
      realtimeMet: 2,
      realtimeMissed: -3,
      difficultyGap: -1,
      providerOfficial: 1,
      proxyNeeded: 2,
      sharedTool: 2,
      localForMe: 2,
      localForShared: -6,
      accessPenalty: { none: 0, signup: 0, key: -1, approval: -2, 'account-or-business': -4 },
    });
    expect(s.recommendThreshold).toBe(3);
    expect(s.reasonsMax).toBe(3);
    expect(s.defaultUserLevel).toBe(1);
    expect(SCORE_KEYS).toEqual(['domain', 'topic', 'aiTool', 'budget', 'realtime', 'difficulty', 'official', 'access', 'proxy', 'shared', 'local']);
  });
});

describe('buildSlots 칸 만들기', () => {
  it('조건이 맞는 칸 규칙만 모은다', () => {
    const cat = tinyCatalog({
      rules: [
        slotRule('r.a', { id: 'slot.a', capability: 'screen' }),
        slotRule('r.b', { id: 'slot.b', capability: 'store', order: 20 }, { tag: 'need.save', gte: 1 }),
        conflictRule('conflict.x', { always: true }),
      ],
      cards: [card('card.x')],
    });
    expect(buildSlots(cat, ctxOf()).map((s) => s.id)).toEqual(['slot.a']);
    expect(buildSlots(cat, ctxOf(on('need.save'))).map((s) => s.id)).toEqual(['slot.a', 'slot.b']);
  });

  it('같은 칸은 하나로 합치고 하나라도 필수면 필수', () => {
    const host = { id: 'slot.host', capability: 'host', order: 50 } as const;
    const cat = tinyCatalog({
      rules: [
        slotRule('r.host-me', { ...host, required: false }, { tag: 'audience.me', gte: 1 }),
        slotRule('r.host-any', { ...host, required: true }, { always: true }),
      ],
    });
    const both = buildSlots(cat, ctxOf(on('audience.me')));
    expect(both).toHaveLength(1);
    expect(both[0]?.required).toBe(true);
    expect(both[0]?.ruleIds).toEqual(['r.host-me', 'r.host-any']);

    const reversed = tinyCatalog({
      rules: [slotRule('r.1', { ...host, required: true }), slotRule('r.2', { ...host, required: false })],
    });
    expect(buildSlots(reversed, ctxOf())[0]?.required).toBe(true);

    const neither = tinyCatalog({
      rules: [slotRule('r.1', { ...host, required: false }), slotRule('r.2', { ...host, required: false })],
    });
    expect(buildSlots(neither, ctxOf())[0]?.required).toBe(false);
  });

  it('칸 순서는 order, 같으면 id', () => {
    const cat = tinyCatalog({
      rules: [
        slotRule('r.z', { id: 'slot.z', capability: 'store', order: 20 }),
        slotRule('r.b', { id: 'slot.b', capability: 'screen', order: 10 }),
        slotRule('r.a', { id: 'slot.a', capability: 'auth', order: 20 }),
        slotRule('r.c', { id: 'slot.c', capability: 'host', order: 5 }),
      ],
    });
    expect(buildSlots(cat, ctxOf()).map((s) => s.id)).toEqual(['slot.c', 'slot.b', 'slot.a', 'slot.z']);
  });
});

describe('userLevel 이용자 수준', () => {
  it('ai 태그에 맞는 수준', () => {
    const cat = tinyCatalog();
    expect(userLevel(cat, on('ai.chat-free'))).toBe(1);
    expect(userLevel(cat, on('ai.chat-paid'))).toBe(1);
    expect(userLevel(cat, on('ai.agent'))).toBe(2);
  });

  it('맞는 ai 태그가 없으면 기본 수준', () => {
    const cat = tinyCatalog({ scoring: { defaultUserLevel: 3 } });
    expect(userLevel(cat, {})).toBe(3);
    expect(userLevel(cat, { 'ai.agent': 0 })).toBe(3);
    expect(userLevel(cat, on('ai.unknown'))).toBe(3);
  });

  it('점수표의 수준 표를 따른다', () => {
    const cat = tinyCatalog({ scoring: { userLevelByAi: { 'ai.agent': 3 } } });
    expect(userLevel(cat, on('ai.agent'))).toBe(3);
    expect(userLevel(cat, on('ai.chat-free'))).toBe(1);
  });
});

describe('slotCandidates 후보', () => {
  it('칸의 기능을 가진 상품 모두 (색인 상품 포함, 자료 순서)', () => {
    const cat = tinyCatalog({
      products: [
        product('a'),
        product('b', { capabilities: ['store'] }),
        product('c', { layer: 'index' }),
        product('d', { capabilities: ['store', 'screen'] }),
      ],
    });
    expect(slotCandidates(cat, SCREEN, {}).map((p) => p.id)).toEqual(['a', 'c', 'd']);
  });

  it('분야 맞춤 칸은 이용자 분야와 겹치는 상품만', () => {
    const cat = tinyCatalog({
      products: [
        product('d1', { capabilities: ['data'], domains: ['domain.book'] }),
        product('d2', { capabilities: ['data'], domains: ['domain.map'] }),
        product('d3', { capabilities: ['data'] }),
        product('d4', { capabilities: ['data'], domains: ['domain.map', 'domain.book'] }),
      ],
    });
    const matched = slotOf('slot.data', 'data', { matchDomain: true });
    expect(slotCandidates(cat, matched, on('domain.book')).map((p) => p.id)).toEqual(['d1', 'd4']);
    expect(slotCandidates(cat, matched, {}).map((p) => p.id)).toEqual([]);
    const open = slotOf('slot.data', 'data');
    expect(slotCandidates(cat, open, on('domain.book')).map((p) => p.id)).toEqual(['d1', 'd2', 'd3', 'd4']);
  });
});

describe('scoreProduct 점수 항목 하나씩', () => {
  const cat = tinyCatalog();

  it('바탕 상품은 항목이 없다', () => {
    const s = score(cat, plain('n'));
    expect(s.score).toBe(0);
    expect(s.parts).toEqual({});
    expect(s.reasons).toEqual([]);
    expect(s.cons).toEqual([]);
  });

  it('domain: 분야가 겹치면 +3', () => {
    const p = plain('p', { domains: ['domain.book'] });
    expect(score(cat, p, on('domain.book')).parts).toEqual({ domain: 3 });
    expect(score(cat, p, on('domain.map')).parts).toEqual({});
  });

  it('topic: 겹치면 +3, 안 겹치면 −3', () => {
    expect(score(cat, plain('p', { topics: ['topic.meal'] }), on('topic.meal')).parts).toEqual({ topic: 3 });
    expect(score(cat, plain('p', { topics: ['topic.schedule'] }), on('topic.meal')).parts).toEqual({ topic: -3 });
  });

  it('topic: 이용자가 주제를 안 골랐거나 상품에 주제가 없으면 없다', () => {
    expect(score(cat, plain('p', { topics: ['topic.schedule'] }), {}).parts).toEqual({});
    expect(score(cat, plain('p'), on('topic.meal')).parts).toEqual({});
    expect(score(cat, plain('p', { topics: [] }), on('topic.meal')).parts).toEqual({});
  });

  it('aiTool: goodFor에 이용자 ai 태그가 있으면 +2', () => {
    expect(score(cat, plain('p', { goodFor: ['ai.chat-free'] }), on('ai.chat-free')).parts).toEqual({ aiTool: 2 });
    expect(score(cat, plain('p', { goodFor: ['ai.agent'] }), on('ai.chat-free')).parts).toEqual({});
  });

  it('budget: 무료 +2, 유료인데 0원만 −4', () => {
    const free = { free: true, note: '무료' };
    expect(score(cat, plain('p', { cost: free })).parts).toEqual({ budget: 2 });
    expect(score(cat, plain('p', { cost: free }), on('budget.free')).parts).toEqual({ budget: 2 });
    expect(score(cat, plain('p'), on('budget.free')).parts).toEqual({ budget: -4 });
    expect(score(cat, plain('p'), on('budget.small')).parts).toEqual({});
  });

  it.each([
    ['realtime', 2],
    ['frequent', 2],
    ['daily', -3],
    ['static', -3],
  ] as const)('realtime: 실시간이 필요하고 데이터 상품이 %s면 %i', (rt, v) => {
    const data = slotOf('slot.data', 'data');
    expect(score(cat, plain('p', { capabilities: ['data'], realtime: rt }), on('need.realtime'), data).parts).toEqual({ realtime: v });
  });

  it('realtime: 실시간이 필요 없거나 데이터 상품이 아니면 없다', () => {
    const data = slotOf('slot.data', 'data');
    expect(score(cat, plain('p', { capabilities: ['data'], realtime: 'daily' }), {}, data).parts).toEqual({});
    expect(score(cat, plain('p', { realtime: 'realtime' }), on('need.realtime')).parts).toEqual({});
  });

  it('realtime: 데이터 상품에 갱신 주기가 없으면 없다', () => {
    const data = slotOf('slot.data', 'data');
    expect(score(cat, plain('p', { capabilities: ['data'] }), on('need.realtime'), data).parts).toEqual({});
  });

  it('difficulty: 난이도와 이용자 수준의 차이 × −1', () => {
    expect(score(cat, plain('p', { difficulty: 3 })).parts).toEqual({ difficulty: -2 });
    expect(score(cat, plain('p', { difficulty: 2 })).parts).toEqual({ difficulty: -1 });
    // 코딩 에이전트는 수준 2
    expect(score(cat, plain('p', { difficulty: 1 }), on('ai.agent')).parts).toEqual({ difficulty: -1 });
    expect(score(cat, plain('p', { difficulty: 2 }), on('ai.agent')).parts).toEqual({});
    expect(score(cat, plain('p', { difficulty: 3 }), on('ai.agent')).parts).toEqual({ difficulty: -1 });
  });

  it('official: 공식 제공이면 +1', () => {
    expect(score(cat, plain('p', { provider: { type: 'official', name: '공식' } })).parts).toEqual({ official: 1 });
    expect(score(cat, plain('p', { provider: { type: 'unofficial', name: '비공식' } })).parts).toEqual({});
    expect(score(cat, plain('p', { provider: { type: 'generic', name: '일반' } })).parts).toEqual({});
  });

  const accessCases: [Access, Parts][] = [
    ['none', {}],
    ['signup', {}],
    ['key', { access: -1 }],
    ['approval', { access: -2 }],
    ['account-or-business', { access: -4 }],
  ];
  it.each(accessCases)('access: %s', (access, parts) => {
    expect(score(cat, plain('p', { access })).parts).toEqual(parts);
  });

  describe('proxy', () => {
    const host = slotOf('slot.host', 'host', { order: 50 });
    const cf = plain('cf', { capabilities: ['host', 'proxy'] });
    const risky = plain('api', { capabilities: ['data'], keyExposureRisk: true });

    it('이 칸 기능이 없는 키 노출 위험 상품이 장바구니에 있으면 +2', () => {
      expect(score(cat, cf, {}, host, [risky]).parts).toEqual({ proxy: 2 });
      expect(score(cat, cf, {}, host, [cf, risky]).parts).toEqual({ proxy: 2 });
    });

    it('키 노출 위험 상품이 이 칸 기능도 가지면 없다', () => {
      const riskyHost = plain('api2', { capabilities: ['data', 'host'], keyExposureRisk: true });
      expect(score(cat, cf, {}, host, [riskyHost]).parts).toEqual({});
    });

    it('위험 상품이 없거나 상품에 proxy 기능이 없으면 없다', () => {
      const safe = plain('safe', { capabilities: ['data'] });
      expect(score(cat, cf, {}, host, [safe]).parts).toEqual({});
      expect(score(cat, cf, {}, host, []).parts).toEqual({});
      expect(score(cat, plain('gh', { capabilities: ['host'] }), {}, host, [risky]).parts).toEqual({});
    });
  });

  describe('shared', () => {
    const store = slotOf('slot.store', 'store', { order: 20 });
    const auth = slotOf('slot.auth', 'auth', { order: 30 });
    const sb = plain('sb', { capabilities: ['store', 'auth'] });

    it('담은 상품이 앞선 열린 칸의 기능도 가지면 뒤 칸에서 +2', () => {
      expect(score(cat, sb, {}, auth, [sb], [store, auth]).parts).toEqual({ shared: 2 });
    });

    it('담은 그 칸(앞 칸)에서는 더하지 않는다', () => {
      expect(score(cat, sb, {}, store, [sb], [store, auth]).parts).toEqual({});
    });

    it('장바구니에 없으면 없다', () => {
      expect(score(cat, sb, {}, auth, [], [store, auth]).parts).toEqual({});
    });

    it('앞선 칸이 열려 있지 않거나 순서가 같으면 없다', () => {
      expect(score(cat, sb, {}, auth, [sb], [auth]).parts).toEqual({});
      const sameOrder = slotOf('slot.store', 'store', { order: 30 });
      expect(score(cat, sb, {}, auth, [sb], [sameOrder, auth]).parts).toEqual({});
    });

    it('앞선 칸의 기능이 없으면 없다', () => {
      const au = plain('au', { capabilities: ['auth'] });
      expect(score(cat, au, {}, auth, [au], [store, auth]).parts).toEqual({});
    });
  });

  describe('local', () => {
    const store = slotOf('slot.store', 'store', { order: 20 });
    const local = plain('lc', { capabilities: ['store'], serverRegion: 'local' });

    it('기기 저장 상품: 나만 쓰면 +2, 여럿이 쓰면 −6', () => {
      expect(score(cat, local, on('audience.me'), store).parts).toEqual({ local: 2 });
      expect(score(cat, local, on('audience.few'), store).parts).toEqual({ local: -6 });
      expect(score(cat, local, on('audience.public'), store).parts).toEqual({ local: -6 });
    });

    it('기기 저장이 아니거나 저장 상품이 아니면 없다', () => {
      expect(score(cat, plain('kr', { capabilities: ['store'], serverRegion: 'kr' }), on('audience.few'), store).parts).toEqual({});
      expect(score(cat, plain('sc', { serverRegion: 'local' }), on('audience.few')).parts).toEqual({});
    });
  });

  it('값이 1 이상인 태그만 본다 (합산된 태그도 그대로)', () => {
    const p = plain('p', { domains: ['domain.book'], topics: ['topic.meal'], goodFor: ['ai.agent'] });
    const zero = { 'domain.book': 0, 'topic.meal': 0, 'ai.agent': 0, 'budget.free': 0 };
    expect(score(cat, p, zero).parts).toEqual({});
    const twice = { 'domain.book': 2, 'topic.meal': 2, 'ai.agent': 2, 'budget.free': 2 };
    // 분야 3 + 주제 3 + ai 2 − 유료인데 0원만 4 − 난이도(수준 2와 1 차이) 1
    expect(score(cat, p, twice).parts).toEqual({ domain: 3, topic: 3, aiTool: 2, budget: -4, difficulty: -1 });
    expect(score(cat, p, twice).score).toBe(3);
  });

  it('양수 항목이 모두 붙으면 합산하고 이유는 3개', () => {
    const auth = slotOf('slot.auth', 'auth', { order: 30 });
    const store = slotOf('slot.store', 'store', { order: 20 });
    const all = product('all', {
      capabilities: ['auth', 'store', 'data', 'proxy'],
      domains: ['domain.book'],
      topics: ['topic.meal'],
      goodFor: ['ai.chat-free'],
      realtime: 'frequent',
      serverRegion: 'local',
    });
    const risky = plain('api', { capabilities: ['screen'], keyExposureRisk: true });
    const tags = on('domain.book', 'topic.meal', 'ai.chat-free', 'need.realtime', 'audience.me');
    const s = score(cat, all, tags, auth, [all, risky], [store, auth]);
    expect(s.parts).toEqual({
      domain: 3,
      topic: 3,
      aiTool: 2,
      budget: 2,
      realtime: 2,
      official: 1,
      proxy: 2,
      shared: 2,
      local: 2,
    });
    expect(s.score).toBe(19);
    expect(s.reasons).toEqual(['domain', 'topic', 'aiTool']);
    expect(s.cons).toEqual([]);
  });

  it('가중치가 0인 항목은 적지 않는다', () => {
    const zero = tinyCatalog({ weights: { domainMatch: 0 } });
    const s = score(zero, plain('p', { domains: ['domain.book'] }), on('domain.book'));
    expect(s.parts).toEqual({});
    expect('domain' in s.parts).toBe(false);
    expect(s.score).toBe(0);
  });
});

describe('추천 이유와 아쉬운 점', () => {
  const best = product('best', {
    domains: ['domain.book'],
    topics: ['topic.meal'],
    goodFor: ['ai.chat-free'],
  });
  const tags = on('domain.book', 'topic.meal', 'ai.chat-free');

  it('점수는 항목의 합, 이유는 큰 순·같으면 표 순서로 3개', () => {
    const s = score(tinyCatalog(), best, tags);
    expect(s.parts).toEqual({ domain: 3, topic: 3, aiTool: 2, budget: 2, official: 1 });
    expect(s.score).toBe(11);
    expect(s.reasons).toEqual(['domain', 'topic', 'aiTool']);
    expect(s.cons).toEqual([]);
  });

  it('reasonsMax만큼 고른다', () => {
    const s = score(tinyCatalog({ scoring: { reasonsMax: 5 } }), best, tags);
    expect(s.reasons).toEqual(['domain', 'topic', 'aiTool', 'budget', 'official']);
  });

  it('값이 크면 표 순서보다 앞선다', () => {
    const s = score(tinyCatalog({ weights: { providerOfficial: 5 } }), best, tags);
    expect(s.reasons).toEqual(['official', 'domain', 'topic']);
  });

  it('아쉬운 점은 많이 깎인 순, 같으면 표 순서', () => {
    const data = slotOf('slot.data', 'data');
    const p = plain('bad', {
      capabilities: ['data'],
      realtime: 'daily',
      topics: ['topic.schedule'],
      access: 'approval',
      difficulty: 3,
    });
    const s = score(tinyCatalog(), p, on('need.realtime', 'topic.meal', 'budget.free'), data);
    expect(s.parts).toEqual({ topic: -3, budget: -4, realtime: -3, difficulty: -2, access: -2 });
    expect(s.score).toBe(-14);
    expect(s.cons).toEqual(['budget', 'topic', 'realtime', 'difficulty', 'access']);
    expect(s.reasons).toEqual([]);
  });
});

describe('compareScored 정렬', () => {
  const sc = (p: Product, value: number, slotsCovered = 1): Scored => ({ product: p, score: value, parts: {}, reasons: [], cons: [], slotsCovered });

  it('점수와 공식 제공이 같으면 맡는 칸 수(slotsCovered)가 큰 상품이 먼저 (값은 rankSlot이 센다)', () => {
    const list = [sc(product('airtable-like', { difficulty: 1 }), 4, 1), sc(product('supabase-like', { difficulty: 2 }), 4, 2)];
    expect(ids([...list].sort(compareScored))).toEqual(['supabase-like', 'airtable-like']);
  });

  it('점수 → 공식 제공 → 쉬운 난이도 → id', () => {
    const list = [
      sc(plain('f', { provider: { type: 'generic', name: '일반' } }), 5),
      sc(product('b', { difficulty: 3 }), 5),
      sc(product('d', { difficulty: 2 }), 5),
      sc(plain('a'), 5),
      sc(product('c', { difficulty: 2 }), 5),
      sc(plain('e', { difficulty: 3 }), 7),
    ];
    expect(ids([...list].sort(compareScored))).toEqual(['e', 'c', 'd', 'b', 'a', 'f']);
  });
});

describe('동점 규칙: 지금 열린 칸을 더 맡는 상품 (D55)', () => {
  const STORE = slotOf('slot.store', 'store', { order: 20 });
  const AUTH = slotOf('slot.auth', 'auth', { order: 30 });
  const HOST = slotOf('slot.host', 'host', { order: 40 });
  // 셋 다 기본 3점(무료 +2, 공식 +1). 난이도는 이용자 수준과 같아 점수에 영향이 없다
  const both = product('both', { capabilities: ['store', 'auth'] });
  const storeOnly = product('aaa-store', { capabilities: ['store'], difficulty: 1 });
  const authOnly = product('aaa-auth', { capabilities: ['auth'], difficulty: 1 });

  it('같은 점수면 비어 있는 다른 칸에서도 최고 점수인 상품이 앞 (저장 칸에서 로그인도 맡는 상품)', () => {
    const cat = tinyCatalog({ products: [both, storeOnly, authOnly] });
    const r = rankSlot(cat, STORE, {}, [], [STORE, AUTH]);
    expect(r.recommended?.product.id).toBe('both');
    expect(r.compare?.tieBy).toBe('coverage');
  });

  it('다른 상품이 이미 채운 칸은 세지 않는다 (맡는 칸 수가 같아져 이름 순으로 갈린다)', () => {
    const cat = tinyCatalog({ products: [both, storeOnly, authOnly] });
    const r = rankSlot(cat, STORE, {}, [authOnly], [STORE, AUTH]);
    expect(r.recommended?.product.id).toBe('aaa-store');
    expect(r.compare?.tieBy).toBe('id');
  });

  it('다른 칸에서 최고 점수가 아니면 세지 않는다 (그 칸에는 더 맞는 상품이 있다)', () => {
    // 배포 칸 동점: 'sheet'은 저장도 맡지만 저장 칸에서는 'local'이 더 높다 → 맡는 칸 수로 앞서지 않는다
    const sheet = product('sheet', { capabilities: ['host', 'store'] });
    const pages = product('pages', { capabilities: ['host'] });
    const local = product('local', { capabilities: ['store'], serverRegion: 'local' });
    const cat = tinyCatalog({ products: [sheet, pages, local] });
    const r = rankSlot(cat, HOST, on('audience.me'), [], [STORE, HOST]);
    expect(ids(r.shelf)).toEqual(['pages', 'sheet']);
    expect(r.compare?.tieBy).toBe('id');
  });

  it('점수가 다르면 동점 이유가 없다', () => {
    const cat = tinyCatalog({ products: [product('a', { domains: ['domain.book'] }), product('b')] });
    const r = rankSlot(cat, SCREEN, on('domain.book'), [], [SCREEN]);
    expect(r.compare?.tieBy).toBeUndefined();
  });
});

describe('rankSlot 추천·2위·비교·채움', () => {
  it('진열과 색인을 나누고, 색인 상품은 점수가 높아도 추천하지 않는다', () => {
    const cat = tinyCatalog({
      products: [
        product('s1'),
        product('ix', { layer: 'index', domains: ['domain.book'], goodFor: ['ai.chat-free'] }),
        product('s2', { domains: ['domain.book'] }),
      ],
    });
    const r = rankSlot(cat, SCREEN, on('domain.book', 'ai.chat-free'), [], [SCREEN]);
    expect(ids(r.shelf)).toEqual(['s2', 's1']);
    expect(r.shelf.map((s) => s.score)).toEqual([6, 3]);
    expect(ids(r.index)).toEqual(['ix']);
    expect(r.index[0]?.score).toBe(8);
    expect(r.recommended?.product.id).toBe('s2');
    expect(r.runnerUp?.product.id).toBe('s1');
  });

  it('색인 상품도 점수 순으로 줄 서고, 2위에 들지 않는다', () => {
    const cat = tinyCatalog({
      products: [
        product('ix1', { layer: 'index' }),
        product('ix2', { layer: 'index', domains: ['domain.book'] }),
        product('ix0', { layer: 'index' }),
        product('s1', { access: 'key' }),
        product('s2', { domains: ['domain.book'] }),
      ],
    });
    const r = rankSlot(cat, SCREEN, on('domain.book'), [], [SCREEN]);
    expect(ids(r.index)).toEqual(['ix2', 'ix0', 'ix1']);
    expect(r.index.map((s) => s.score)).toEqual([6, 3, 3]);
    expect(ids(r.shelf)).toEqual(['s2', 's1']);
    expect(r.recommended?.product.id).toBe('s2');
    expect(r.runnerUp?.product.id).toBe('s1');
    expect(r.compare).toEqual({ ahead: ['domain', 'access'], behind: [] });
  });

  it('추천할 수 없는 상품은 건너뛰지만 2위가 될 수 있다', () => {
    const cat = tinyCatalog({
      products: [product('ok'), product('nr', { recommendable: false, domains: ['domain.book'] })],
    });
    const r = rankSlot(cat, SCREEN, on('domain.book'), [], [SCREEN]);
    expect(ids(r.shelf)).toEqual(['nr', 'ok']);
    expect(r.recommended?.product.id).toBe('ok');
    expect(r.runnerUp?.product.id).toBe('nr');
    expect(r.compare).toEqual({ ahead: [], behind: ['domain'] });
  });

  it('추천 기준 이상이면 추천, 아래면 추천·2위·비교가 없다', () => {
    // product 기본값: 무료 +2, 공식 +1 = 3 (기준과 같다)
    const at = rankSlot(tinyCatalog({ products: [product('a')] }), SCREEN, {}, [], [SCREEN]);
    expect(at.recommended?.product.id).toBe('a');
    expect(at.recommended?.score).toBe(3);

    // 키 −1 → 2
    const below = rankSlot(
      tinyCatalog({ products: [product('k', { access: 'key' }), product('k2', { access: 'key' })] }),
      SCREEN,
      {},
      [],
      [SCREEN],
    );
    expect(ids(below.shelf)).toEqual(['k', 'k2']);
    expect(below.recommended).toBeNull();
    expect(below.runnerUp).toBeNull();
    expect(below.compare).toBeNull();
  });

  it('추천 기준은 점수표의 recommendThreshold', () => {
    const r = rankSlot(tinyCatalog({ products: [product('a')], scoring: { recommendThreshold: 4 } }), SCREEN, {}, [], [SCREEN]);
    expect(r.recommended).toBeNull();
  });

  it('기준을 넘은 상품이 추천할 수 없는 것뿐이면 추천이 없다', () => {
    const cat = tinyCatalog({
      products: [product('nr', { recommendable: false }), product('low', { access: 'key' })],
    });
    const r = rankSlot(cat, SCREEN, {}, [], [SCREEN]);
    expect(ids(r.shelf)).toEqual(['nr', 'low']);
    expect(r.recommended).toBeNull();
    expect(r.runnerUp).toBeNull();
  });

  it('진열 상품이 하나뿐이면 2위와 비교가 없다 (색인 상품은 2위가 아니다)', () => {
    const cat = tinyCatalog({ products: [product('only'), product('ix', { layer: 'index' })] });
    const r = rankSlot(cat, SCREEN, {}, [], [SCREEN]);
    expect(r.recommended?.product.id).toBe('only');
    expect(r.runnerUp).toBeNull();
    expect(r.compare).toBeNull();
  });

  it('2위와 비교: 추천이 앞선 항목과 2위가 나은 항목 (표 순서)', () => {
    const cat = tinyCatalog({
      products: [
        product('rec', { domains: ['domain.book'] }),
        plain('run', { goodFor: ['ai.chat-free'], cost: { free: true, note: '무료' } }),
      ],
    });
    const r = rankSlot(cat, SCREEN, on('domain.book', 'ai.chat-free'), [], [SCREEN]);
    expect(r.recommended?.parts).toEqual({ domain: 3, budget: 2, official: 1 });
    expect(r.runnerUp?.parts).toEqual({ aiTool: 2, budget: 2 });
    expect(r.compare).toEqual({ ahead: ['domain', 'official'], behind: ['aiTool'] });
  });

  it('같은 점수는 공식 → 쉬운 난이도 → id 순', () => {
    // 공식·난이도가 점수에 섞이지 않게 두 가중치를 0으로 둔다 (모두 무료 +2)
    const cat = tinyCatalog({
      products: [
        plain('m', { cost: { free: true, note: '무료' } }),
        product('b3', { difficulty: 3 }),
        product('b2', { difficulty: 2 }),
        product('z'),
        product('a2', { difficulty: 2 }),
      ],
      weights: { providerOfficial: 0, difficultyGap: 0 },
      scoring: { recommendThreshold: 2 },
    });
    const r = rankSlot(cat, SCREEN, {}, [], [SCREEN]);
    expect(r.shelf.map((s) => s.score)).toEqual([2, 2, 2, 2, 2]);
    expect(ids(r.shelf)).toEqual(['z', 'a2', 'b2', 'b3', 'm']);
    expect(r.recommended?.product.id).toBe('z');
    expect(r.runnerUp?.product.id).toBe('a2');
    expect(r.compare).toEqual({ ahead: [], behind: [], tieBy: 'difficulty' });
  });

  it('채움: 칸 기능을 가진 장바구니 상품 모두 (담은 순서, 후보가 아니어도)', () => {
    const cat = tinyCatalog();
    const data = slotOf('slot.data', 'data', { matchDomain: true });
    const cart = [
      product('scr'),
      product('d1', { capabilities: ['data'], domains: ['domain.map'] }),
      product('ixd', { capabilities: ['data'], layer: 'index' }),
      product('d2', { capabilities: ['data', 'store'], domains: ['domain.book'] }),
    ];
    expect(rankSlot(cat, data, on('domain.book'), cart, [data]).filledBy).toEqual(['d1', 'ixd', 'd2']);
    expect(rankSlot(cat, data, on('domain.book'), [], [data]).filledBy).toEqual([]);
  });
});

describe('rankAll 열린 칸마다 순위', () => {
  const cat = tinyCatalog({
    rules: [
      slotRule('r.screen', { id: 'slot.screen', capability: 'screen', required: true }),
      slotRule('r.store', { id: 'slot.store', capability: 'store', required: true, order: 20 }, { tag: 'need.save', gte: 1 }),
      slotRule('r.auth', { id: 'slot.auth', capability: 'auth', required: true, order: 30 }, { tag: 'need.login', gte: 1 }),
    ],
    products: [product('page'), product('st', { capabilities: ['store'] }), product('sb', { capabilities: ['store', 'auth'] })],
  });

  it('칸 순서대로, 열린 칸 전체를 보고 shared를 더한다', () => {
    const sb = cat.product.get('sb');
    if (!sb) throw new Error('sb 없음');
    const all = rankAll(cat, ctxOf(on('need.save', 'need.login'), [sb]));
    expect(all.map((r) => r.slot.id)).toEqual(['slot.screen', 'slot.store', 'slot.auth']);
    expect(all.map((r) => r.filledBy)).toEqual([[], ['sb'], ['sb']]);
    expect(ids(all[1]?.shelf ?? [])).toEqual(['sb', 'st']);
    expect(all[1]?.shelf[0]?.parts).toEqual({ budget: 2, official: 1 });
    expect(all[2]?.shelf[0]?.parts).toEqual({ budget: 2, official: 1, shared: 2 });
    expect(all[2]?.shelf[0]?.score).toBe(5);
  });

  it('조건이 안 맞는 칸은 열리지 않는다', () => {
    const all = rankAll(cat, ctxOf(on('need.save')));
    expect(all.map((r) => r.slot.id)).toEqual(['slot.screen', 'slot.store']);
  });
});

describe('evaluate를 거쳐', () => {
  it('저장+로그인 상품: 뒤 칸에서만 shared, 이유는 같은 값이면 표 순서', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion(on('need.save', 'need.login'))],
      rules: [
        slotRule('r.store', { id: 'slot.store', capability: 'store', required: true, order: 20 }, { tag: 'need.save', gte: 1 }),
        slotRule('r.auth', { id: 'slot.auth', capability: 'auth', required: true, order: 30 }, { tag: 'need.login', gte: 1 }),
      ],
      products: [product('st', { capabilities: ['store'] }), product('sb', { capabilities: ['store', 'auth'] })],
    });
    const r = evaluate(cat, { answers: ANSWERED, cart: ['sb'] });
    expect(r.slots.map((s) => s.slot.id)).toEqual(['slot.store', 'slot.auth']);

    const store = slotIn(r, 'slot.store');
    expect(store.recommended?.product.id).toBe('sb');
    expect(store.recommended?.parts).toEqual({ budget: 2, official: 1 });
    expect(store.runnerUp?.product.id).toBe('st');
    expect(store.filledBy).toEqual(['sb']);

    const auth = slotIn(r, 'slot.auth');
    expect(auth.recommended?.product.id).toBe('sb');
    expect(auth.recommended?.score).toBe(5);
    expect(auth.recommended?.reasons).toEqual(['budget', 'shared', 'official']);
    expect(auth.filledBy).toEqual(['sb']);

    const empty = evaluate(cat, { answers: ANSWERED, cart: [] });
    expect(slotIn(empty, 'slot.auth').recommended?.parts).toEqual({ budget: 2, official: 1 });
    expect(slotIn(empty, 'slot.auth').filledBy).toEqual([]);
  });

  it('뒤 칸을 2차로 미뤄도 열린 칸이라 순위와 shared는 그대로', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion(on('need.save', 'need.login'))],
      rules: [
        slotRule('r.store', { id: 'slot.store', capability: 'store', required: true, order: 20 }, { tag: 'need.save', gte: 1 }),
        slotRule(
          'r.auth',
          { id: 'slot.auth', capability: 'auth', required: true, order: 30, deferrable: true },
          { tag: 'need.login', gte: 1 },
        ),
      ],
      products: [product('au', { capabilities: ['auth'] }), product('sb', { capabilities: ['store', 'auth'] })],
    });
    const r = evaluate(cat, { answers: ANSWERED, cart: ['sb'], deferred: ['slot.auth'] });
    expect(r.session.deferred).toEqual(['slot.auth']);
    expect(r.slots.map((s) => s.slot.id)).toEqual(['slot.store', 'slot.auth']);
    const auth = slotIn(r, 'slot.auth');
    expect(ids(auth.shelf)).toEqual(['sb', 'au']);
    expect(auth.recommended?.parts).toEqual({ budget: 2, official: 1, shared: 2 });
    expect(auth.runnerUp?.product.id).toBe('au');
    expect(auth.compare).toEqual({ ahead: ['shared'], behind: [] });
    expect(auth.filledBy).toEqual(['sb']);
  });

  it('키 노출 위험 상품을 담으면 배포 칸의 proxy 상품이 앞선다', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion(on('need.data'))],
      rules: [
        slotRule('r.data', { id: 'slot.data', capability: 'data', required: true, order: 40 }, { tag: 'need.data', gte: 1 }),
        slotRule('r.host', { id: 'slot.host', capability: 'host', order: 50 }),
      ],
      products: [
        product('api', { capabilities: ['data'], keyExposureRisk: true, access: 'key' }),
        product('gh', { capabilities: ['host'] }),
        product('cf', { capabilities: ['host', 'proxy'] }),
      ],
    });
    const r = evaluate(cat, { answers: ANSWERED, cart: ['api'] });
    const host = slotIn(r, 'slot.host');
    expect(ids(host.shelf)).toEqual(['cf', 'gh']);
    expect(host.recommended?.parts).toEqual({ budget: 2, official: 1, proxy: 2 });
    expect(host.runnerUp?.product.id).toBe('gh');
    expect(host.compare).toEqual({ ahead: ['proxy'], behind: [] });
    expect(host.filledBy).toEqual([]);
    expect(slotIn(r, 'slot.data').filledBy).toEqual(['api']);

    const before = slotIn(evaluate(cat, { answers: ANSWERED, cart: [] }), 'slot.host');
    expect(before.shelf.map((s) => [s.product.id, s.score])).toEqual([
      ['cf', 3],
      ['gh', 3],
    ]);
  });

  it('분야 맞춤·실시간·이용자 수준이 함께 점수에 든다', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion(on('need.data', 'need.realtime', 'domain.transport', 'ai.agent'))],
      rules: [
        slotRule('r.data', { id: 'slot.data', capability: 'data', required: true, order: 40, matchDomain: true }, { tag: 'need.data', gte: 1 }),
      ],
      products: [
        product('old', { capabilities: ['data'], domains: ['domain.transport'], realtime: 'daily' }),
        product('wx', { capabilities: ['data'], domains: ['domain.weather'], realtime: 'realtime' }),
        product('bus', { capabilities: ['data'], domains: ['domain.transport'], realtime: 'realtime', difficulty: 2, goodFor: ['ai.agent'] }),
        product('ixbus', { capabilities: ['data'], domains: ['domain.transport'], layer: 'index', realtime: 'frequent', difficulty: 2 }),
      ],
    });
    const r = evaluate(cat, { answers: ANSWERED, cart: ['ixbus'] });
    const data = slotIn(r, 'slot.data');
    expect(ids(data.shelf)).toEqual(['bus', 'old']);
    // bus: 분야 3 + ai 2 + 무료 2 + 실시간 2 + 공식 1 (난이도 2 = 수준 2)
    expect(data.shelf[0]?.parts).toEqual({ domain: 3, aiTool: 2, budget: 2, realtime: 2, official: 1 });
    expect(data.shelf[0]?.score).toBe(10);
    expect(data.shelf[0]?.reasons).toEqual(['domain', 'aiTool', 'budget']);
    // old: 분야 3 + 무료 2 − 실시간 3 − 난이도 1 + 공식 1
    expect(data.shelf[1]?.parts).toEqual({ domain: 3, budget: 2, realtime: -3, difficulty: -1, official: 1 });
    expect(data.shelf[1]?.score).toBe(2);
    expect(data.shelf[1]?.cons).toEqual(['realtime', 'difficulty']);
    expect(data.recommended?.product.id).toBe('bus');
    // 2위는 추천 기준과 상관없이 추천이 아닌 첫 진열 상품
    expect(data.runnerUp?.product.id).toBe('old');
    expect(data.compare).toEqual({ ahead: ['aiTool', 'realtime', 'difficulty'], behind: [] });
    // 색인 상품은 따로 줄 서고, 담으면 칸을 채운다
    expect(ids(data.index)).toEqual(['ixbus']);
    expect(data.index[0]?.score).toBe(8);
    expect(data.filledBy).toEqual(['ixbus']);
  });
});
