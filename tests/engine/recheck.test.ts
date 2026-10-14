// 재확인 엔진(recheck.ts) 시험: 규칙 충돌, 빈 필수 칸, 그대로 두기와 발행 가능, 1차/2차 나누기, 칸 밖 상품.
// 기대값은 docs/ENGINE.md 4절과 data/scoring.json(phaseSplitDifficulty 6, recommendThreshold 3)으로 손으로 계산했다.
// 기본 가짜 상품(공식·무료·가입 없음)의 칸 점수 = 무료 2 + 공식 1 − (난이도 − 이용자 수준 1) = 4 − 난이도.
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Ctx, EngineResult, Slot } from '../../src/lib/engine/index.ts';
import { emptySlotId, evaluate, fill, makeCatalog } from '../../src/lib/engine/index.ts';
import type { Conflict } from '../../src/lib/engine/recheck.ts';
import { findConflicts, firstPhaseProducts, orphanProducts, suggestSplit } from '../../src/lib/engine/recheck.ts';
import type { Capability, ConflictRule, Product, Question, ResearchCard, SlotDef, SlotRule } from '../../src/lib/engine/types.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { DATA_DIR, readJson } from '../../scripts/lib/load-data.ts';
import { card, conflictRule, option, product, question, realData, slotRule, tinyCatalog } from '../fixtures/tiny.ts';

// ── 도우미 ─────────────────────────────────────────────────────

/** 기능과 난이도만 정한 기본 상품 */
function tool(id: string, capabilities: Capability[], difficulty: Product['difficulty'] = 1, extra: Partial<Product> = {}): Product {
  return product(id, { capabilities, difficulty, ...extra });
}

function slotOf(id: string, capability: Capability, extra: Partial<SlotDef> = {}): Slot {
  return { id, label: `칸 ${id}`, capability, required: false, order: 10, ...extra, ruleIds: [] };
}

/** 보기 'on'이면 태그를 주고 'off'면 주지 않는 질문 */
function switchQuestion(tags: Record<string, number>): Question {
  return question('q.switch', [option('on', tags), option('off')]);
}
const ON = { 'q.switch': 'on' };
const OFF = { 'q.switch': 'off' };

const ids = (xs: { id: string }[]): string[] => xs.map((x) => x.id);

function conflictIn(r: EngineResult, id: string): Conflict {
  const c = r.conflicts.find((x) => x.id === id);
  if (!c) throw new Error(`충돌 없음: ${id}`);
  return c;
}

function realConflictRule(id: string): ConflictRule {
  const r = realData().rules.rules.find((x): x is ConflictRule => x.type === 'conflict' && x.id === id);
  if (!r) throw new Error(`진짜 충돌 규칙 없음: ${id}`);
  return r;
}

function realCard(id: string): ResearchCard {
  const c = realData().researchCards.cards.find((x) => x.id === id);
  if (!c) throw new Error(`진짜 조사 카드 없음: ${id}`);
  return c;
}

// 진짜 자료와 같은 모양의 칸 규칙 (화면은 비워 둘 수 없고, 로그인·알림은 미룰 수 있다)
const SCREEN: SlotRule = slotRule('slot-rule.screen', { id: 'slot.screen', label: '화면', capability: 'screen', required: true, order: 10, mustFill: true });
const STORE: SlotRule = slotRule('slot-rule.store', { id: 'slot.store', label: '저장', capability: 'store', required: true, order: 20 });
const AUTH: SlotRule = slotRule('slot-rule.auth', { id: 'slot.auth', label: '로그인', capability: 'auth', required: true, order: 30, deferrable: true });
const NOTIFY: SlotRule = slotRule('slot-rule.notify', { id: 'slot.notify', label: '알림', capability: 'notify', required: true, order: 45, deferrable: true });
const HOST: SlotRule = slotRule('slot-rule.host', { id: 'slot.host', label: '배포·공유', capability: 'host', required: false, order: 50 });

// ── 충돌 ───────────────────────────────────────────────────────

describe('emptySlotId', () => {
  it('빈 칸 충돌 id는 conflict.empty-slot:칸id', () => {
    expect(emptySlotId('slot.store')).toBe('conflict.empty-slot:slot.store');
  });
});

describe('규칙 충돌', () => {
  it('태그 조건이 맞을 때만 켜지고, 규칙 문장을 그대로 쓴다', () => {
    const cat = tinyCatalog({
      questions: [switchQuestion({ 'need.x': 1 })],
      rules: [conflictRule('conflict.a', { tag: 'need.x', gte: 1 })],
      cards: [card('card.x')],
    });
    expect(evaluate(cat, { answers: ON }).conflicts).toEqual([
      { id: 'conflict.a', kind: 'rule', severity: 'conflict', message: 'conflict.a 충돌', fixHint: 'conflict.a 고치기', researchCard: 'card.x', keepable: true, kept: false },
    ]);
    expect(evaluate(cat, { answers: OFF }).conflicts).toEqual([]);
  });

  it('주의 규칙(severity warning, D101)은 처음부터 그대로 가기이고 출발을 막지 않으며, 조사 카드가 붙는다', () => {
    const cat = tinyCatalog({
      questions: [switchQuestion({ 'need.x': 1 })],
      rules: [{ ...conflictRule('conflict.w', { tag: 'need.x', gte: 1 }), severity: 'warning' }, conflictRule('conflict.a', { tag: 'need.x', gte: 1 })],
      cards: [card('card.x')],
    });
    const r = evaluate(cat, { answers: ON });
    expect(conflictIn(r, 'conflict.w')).toMatchObject({ kind: 'rule', severity: 'warning', keepable: true, kept: true });
    expect(conflictIn(r, 'conflict.a')).toMatchObject({ severity: 'conflict', kept: false });
    expect(r.canIssue).toBe(false);
    expect(ids(r.research)).toEqual(['card.x']);
    // 충돌을 그대로 두면 출발한다. 주의 id는 고른 것이 아니므로 세션 kept에 남기지 않는다 (옛 링크의 kept도 버린다)
    const kept = evaluate(cat, { answers: ON, kept: ['conflict.a', 'conflict.w'] });
    expect(kept.canIssue).toBe(true);
    expect(kept.session.kept).toEqual(['conflict.a']);
  });

  it('anchorSlot은 그 칸이 열렸을 때만 넘기고, 아니면 키도 없다 (지도에서 막힌 곳을 붙일 칸, 없으면 길 전체)', () => {
    const DATA = slotRule('slot-rule.data', { id: 'slot.data', label: '외부 데이터', capability: 'data', required: false, order: 40 });
    const make = (open: boolean) =>
      tinyCatalog({
        rules: [...(open ? [DATA] : []), { ...conflictRule('conflict.a', { always: true }), anchorSlot: 'slot.data' }, conflictRule('conflict.b', { always: true })],
        cards: [card('card.x')],
      });
    const [a, b] = evaluate(make(true), {}).conflicts;
    expect(a?.anchorSlot).toBe('slot.data');
    expect(b && 'anchorSlot' in b).toBe(false);
    // 칸이 열리지 않았으면 지도에 그 칸이 없으므로 길 전체에 단다
    const [closed] = evaluate(make(false), {}).conflicts;
    expect(closed?.id).toBe('conflict.a');
    expect(closed && 'anchorSlot' in closed).toBe(false);
  });

  it('진짜 자료와 골든 사례에서 막힌 곳의 anchorSlot은 늘 열린 칸이다', () => {
    const cat = makeCatalog(realData());
    for (let n = 1; n <= 23; n++) {
      const g = readJson<Golden>(join(DATA_DIR, 'golden', `case-${String(n).padStart(2, '0')}.json`));
      const r = evaluate(cat, goldenSession(g));
      const open = new Set(r.slots.map((s) => s.slot.id));
      for (const c of r.conflicts) if (c.anchorSlot) expect(open.has(c.anchorSlot), `${g.id} ${c.id}`).toBe(true);
    }
  });

  it('진짜 충돌 규칙의 anchorSlot은 CONCEPT 3.7 표대로 (유료 도구는 길 전체)', () => {
    const anchors = Object.fromEntries(
      realData()
        .rules.rules.filter((x): x is ConflictRule => x.type === 'conflict')
        .map((x) => [x.id, x.anchorSlot ?? null]),
    );
    expect(anchors).toEqual({
      'conflict.paid-on-free': null,
      'conflict.paid-free-usage': null,
      'conflict.realtime-mismatch': 'slot.data',
      'conflict.personal-server': 'slot.store',
      'conflict.personal-region': 'slot.store',
      'conflict.key-in-static-page': 'slot.host',
      'conflict.key-on-public-host': 'slot.host',
      'conflict.shared-without-login': null,
    });
  });

  it('진짜 규칙 중 충돌은 공식 문서로 확인한 셋뿐이고, 나머지는 주의다 (D101)', () => {
    const rules = realData().rules.rules.filter((x): x is ConflictRule => x.type === 'conflict');
    expect(rules.filter((x) => x.severity !== 'warning').map((x) => x.id)).toEqual(['conflict.paid-on-free', 'conflict.key-in-static-page', 'conflict.key-on-public-host']);
  });

  it('cartHas: 그 상품을 담았을 때만 켜진다', () => {
    const cat = tinyCatalog({
      rules: [conflictRule('conflict.has-b', { cartHas: 'p-b' }), conflictRule('conflict.has-ghost', { cartHas: 'ghost' })],
      products: [tool('p-a', ['screen']), tool('p-b', ['screen'])],
      cards: [card('card.x')],
    });
    expect(evaluate(cat, { cart: ['p-a'] }).conflicts).toEqual([]);
    expect(ids(evaluate(cat, { cart: ['p-a', 'p-b'] }).conflicts)).toEqual(['conflict.has-b']);
    // 자료에 없는 상품은 장바구니에서 버려지므로 그 상품을 보는 규칙도 켜지지 않는다
    expect(ids(evaluate(cat, { cart: ['ghost', 'p-b'] }).conflicts)).toEqual(['conflict.has-b']);
  });

  it('cartAny: 기능과 필드가 모두 맞는 상품이 있어야 켜진다', () => {
    const cat = tinyCatalog({
      rules: [conflictRule('conflict.stale', { cartAny: { capability: 'data', field: 'realtime', in: ['daily', 'static'] } })],
      products: [
        tool('data-live', ['data'], 1, { realtime: 'realtime' }),
        tool('data-daily', ['data'], 1, { realtime: 'daily' }),
        tool('screen-daily', ['screen'], 1, { realtime: 'daily' }),
      ],
      cards: [card('card.x')],
    });
    expect(evaluate(cat, { cart: ['data-live'] }).conflicts).toEqual([]);
    expect(evaluate(cat, { cart: ['screen-daily'] }).conflicts).toEqual([]);
    expect(ids(evaluate(cat, { cart: ['data-live', 'data-daily'] }).conflicts)).toEqual(['conflict.stale']);
  });

  it('all·not으로 장바구니와 태그를 함께 본다', () => {
    const cat = tinyCatalog({
      questions: [switchQuestion({ 'audience.me': 1 })],
      rules: [
        conflictRule('conflict.key', {
          all: [
            { cartAny: { field: 'keyExposureRisk', is: true } },
            { not: { cartAny: { capability: 'proxy' } } },
            { not: { tag: 'audience.me', gte: 1 } },
          ],
        }),
      ],
      products: [tool('risky', ['data'], 1, { keyExposureRisk: true }), tool('proxy-p', ['proxy'])],
      cards: [card('card.x')],
    });
    expect(ids(evaluate(cat, { answers: OFF, cart: ['risky'] }).conflicts)).toEqual(['conflict.key']);
    expect(evaluate(cat, { answers: OFF, cart: ['risky', 'proxy-p'] }).conflicts).toEqual([]);
    expect(evaluate(cat, { answers: ON, cart: ['risky'] }).conflicts).toEqual([]);
  });

  it('deferred 조건은 2차로 미룬 칸을 본다', () => {
    const cat = tinyCatalog({
      rules: [NOTIFY, conflictRule('conflict.later', { deferred: 'slot.notify' })],
      products: [tool('notify-p', ['notify'])],
      cards: [card('card.x')],
    });
    expect(evaluate(cat, { cart: ['notify-p'] }).conflicts).toEqual([]);
    expect(ids(evaluate(cat, { cart: ['notify-p'], deferred: ['slot.notify'] }).conflicts)).toEqual(['conflict.later']);
  });

  it('미룰 수 없는 칸은 deferred에서 빠져 deferred 조건도 켜지지 않는다', () => {
    const cat = tinyCatalog({
      rules: [STORE, conflictRule('conflict.later', { deferred: 'slot.store' })],
      cards: [card('card.x')],
    });
    const r = evaluate(cat, { deferred: ['slot.store'] });
    expect(r.session.deferred).toEqual([]);
    expect(ids(r.conflicts)).toEqual([emptySlotId('slot.store')]);
  });

  it('순서: 규칙 충돌(규칙 순서) 다음 빈 필수 칸(칸 순서)', () => {
    const cat = tinyCatalog({
      rules: [
        slotRule('slot-rule.late', { id: 'slot.a', capability: 'auth', required: true, order: 20 }),
        conflictRule('conflict.zz', { always: true }),
        slotRule('slot-rule.early', { id: 'slot.z', capability: 'store', required: true, order: 10 }),
        conflictRule('conflict.aa', { always: true }),
      ],
      cards: [card('card.x')],
    });
    expect(ids(evaluate(cat, {}).conflicts)).toEqual(['conflict.zz', 'conflict.aa', emptySlotId('slot.z'), emptySlotId('slot.a')]);
  });
});

describe('빈 필수 칸', () => {
  it('id·칸 id·문장은 templates.emptySlot에 칸 이름을 채운 것', () => {
    const cat = tinyCatalog({ rules: [STORE] });
    const t = cat.data.templates.emptySlot;
    const r = evaluate(cat, {});
    expect(r.conflicts).toEqual([
      {
        id: 'conflict.empty-slot:slot.store',
        kind: 'empty-slot',
        severity: 'conflict',
        message: fill(t.message, { label: '저장' }),
        fixHint: fill(t.fixHint, { label: '저장' }),
        slotId: 'slot.store',
        anchorSlot: 'slot.store',
        keepable: true,
        kept: false,
      },
    ]);
    expect(conflictIn(r, emptySlotId('slot.store')).message).toContain('저장');
  });

  it('칸에 emptyMessage·emptyFix가 있으면 그것을 쓴다', () => {
    const cat = tinyCatalog({
      rules: [slotRule('slot-rule.data', { id: 'slot.data', label: '외부 데이터', capability: 'data', required: true, emptyMessage: '데이터가 없어요.', emptyFix: '데이터 상품을 담으세요.' })],
    });
    const c = conflictIn(evaluate(cat, {}), emptySlotId('slot.data'));
    expect(c.message).toBe('데이터가 없어요.');
    expect(c.fixHint).toBe('데이터 상품을 담으세요.');
  });

  it('미룰 수 있는 칸(deferrable)이 비면 deferrable: true, 아니면 키도 없다', () => {
    const r = evaluate(tinyCatalog({ rules: [STORE, AUTH] }), {});
    expect(conflictIn(r, emptySlotId('slot.auth')).deferrable).toBe(true);
    expect('deferrable' in conflictIn(r, emptySlotId('slot.store'))).toBe(false);
  });

  it('필수가 아닌 칸은 비어도 충돌이 아니다', () => {
    const cat = tinyCatalog({ rules: [HOST] });
    expect(evaluate(cat, {}).conflicts).toEqual([]);
  });

  it('그 기능을 가진 상품이면 무엇이든 칸을 채운다 (색인·추천 제외·여러 기능)', () => {
    const cat = tinyCatalog({
      rules: [STORE, AUTH, slotRule('slot-rule.data', { id: 'slot.data', capability: 'data', required: true, order: 40 })],
      products: [tool('sb', ['store', 'auth'], 3), tool('idx', ['data'], 1, { layer: 'index', recommendable: false })],
    });
    expect(ids(evaluate(cat, {}).conflicts)).toEqual([emptySlotId('slot.store'), emptySlotId('slot.auth'), emptySlotId('slot.data')]);
    expect(evaluate(cat, { cart: ['sb', 'idx'] }).conflicts).toEqual([]);
  });

  it('2차로 미룬 칸은 비어 있어도 충돌이 아니다', () => {
    const cat = tinyCatalog({ rules: [AUTH] });
    expect(ids(evaluate(cat, {}).conflicts)).toEqual([emptySlotId('slot.auth')]);
    const r = evaluate(cat, { deferred: ['slot.auth'] });
    expect(r.session.deferred).toEqual(['slot.auth']);
    expect(r.conflicts).toEqual([]);
    expect(r.canIssue).toBe(true);
  });

  it('mustFill 칸이 비면 그대로 둘 수 없다', () => {
    const cat = tinyCatalog({ rules: [SCREEN] });
    const r = evaluate(cat, { kept: [emptySlotId('slot.screen')] });
    expect(conflictIn(r, emptySlotId('slot.screen'))).toMatchObject({ kind: 'empty-slot', slotId: 'slot.screen', keepable: false, kept: false });
    expect(r.session.kept).toEqual([]);
    expect(r.canIssue).toBe(false);
  });

  it('직접 부르면 session의 kept·deferred와 ctx의 장바구니를 본다', () => {
    const cat = tinyCatalog();
    const slots = [
      slotOf('slot.screen', 'screen', { required: true, label: '화면' }),
      slotOf('slot.store', 'store', { required: true, label: '저장', order: 20 }),
      slotOf('slot.auth', 'auth', { required: true, label: '로그인', order: 30, deferrable: true }),
    ];
    const ctx: Ctx = { tags: {}, answers: {}, cart: [tool('s', ['screen'])], deferred: [] };
    const out = findConflicts(cat, { answers: {}, cart: ['s'], kept: [emptySlotId('slot.store')], deferred: ['slot.auth'] }, ctx, slots);
    expect(out.map((c) => [c.id, c.kept])).toEqual([[emptySlotId('slot.store'), true]]);
  });
});

// ── 그대로 두기와 발행 ──────────────────────────────────────────

describe('그대로 두기와 발행 가능', () => {
  it('인터뷰가 끝나고 충돌이 없으면 발행할 수 있다', () => {
    const cat = tinyCatalog({ rules: [SCREEN], products: [tool('s', ['screen'])] });
    const r = evaluate(cat, { cart: ['s'] });
    expect(r.conflicts).toEqual([]);
    expect(r.canIssue).toBe(true);
  });

  it('인터뷰가 안 끝나면 충돌이 없어도 발행할 수 없다', () => {
    const cat = tinyCatalog({ questions: [switchQuestion({})], rules: [SCREEN], products: [tool('s', ['screen'])] });
    const r = evaluate(cat, { cart: ['s'] });
    expect(r.done).toBe(false);
    expect(r.conflicts).toEqual([]);
    expect(r.canIssue).toBe(false);
    expect(evaluate(cat, { answers: OFF, cart: ['s'] }).canIssue).toBe(true);
  });

  it('규칙 충돌을 그대로 두면 kept가 되고 발행할 수 있다', () => {
    const cat = tinyCatalog({ rules: [conflictRule('conflict.a', { always: true })], cards: [card('card.x')] });
    expect(evaluate(cat, {}).canIssue).toBe(false);
    const r = evaluate(cat, { kept: ['conflict.a'] });
    expect(conflictIn(r, 'conflict.a').kept).toBe(true);
    expect(r.session.kept).toEqual(['conflict.a']);
    expect(r.canIssue).toBe(true);
    expect(r.research.map((x) => [x.id, x.source])).toEqual([['card.x', 'conflict']]);
  });

  it('일부만 그대로 두면 아직 발행할 수 없다', () => {
    const cat = tinyCatalog({
      rules: [conflictRule('conflict.a', { always: true }), conflictRule('conflict.b', { always: true })],
      cards: [card('card.x')],
    });
    const r = evaluate(cat, { kept: ['conflict.b'] });
    expect(r.conflicts.map((c) => [c.id, c.kept])).toEqual([
      ['conflict.a', false],
      ['conflict.b', true],
    ]);
    expect(r.canIssue).toBe(false);
  });

  it('빈 칸 충돌도 그대로 두고 발행할 수 있다', () => {
    const cat = tinyCatalog({ rules: [STORE] });
    const r = evaluate(cat, { kept: [emptySlotId('slot.store')] });
    expect(conflictIn(r, emptySlotId('slot.store')).kept).toBe(true);
    expect(r.canIssue).toBe(true);
    expect(ids(r.research)).toEqual(['research.empty:slot.store']);
  });

  it('지금 없는 충돌과 겹친 id는 kept에서 빠진다', () => {
    const cat = tinyCatalog({
      rules: [STORE, conflictRule('conflict.a', { always: true })],
      products: [tool('st', ['store'])],
      cards: [card('card.x')],
    });
    const r = evaluate(cat, { cart: ['st'], kept: ['conflict.ghost', 'conflict.a', 'conflict.a', emptySlotId('slot.store')] });
    expect(ids(r.conflicts)).toEqual(['conflict.a']);
    expect(r.session.kept).toEqual(['conflict.a']);
    expect(r.canIssue).toBe(true);
  });

  it('mustFill 빈 칸이 있으면 나머지를 다 둬도 발행할 수 없고, 상품을 담아야 풀린다', () => {
    const cat = tinyCatalog({
      rules: [SCREEN, conflictRule('conflict.a', { always: true })],
      products: [tool('s', ['screen'])],
      cards: [card('card.x')],
    });
    const kept = ['conflict.a', emptySlotId('slot.screen')];
    const r = evaluate(cat, { kept });
    expect(r.session.kept).toEqual(['conflict.a']);
    expect(r.canIssue).toBe(false);
    expect(evaluate(cat, { cart: ['s'], kept }).canIssue).toBe(true);
  });
});

// ── 진짜 규칙: conflict.paid-on-free ──────────────────────────────
// 골든 case-32(Heroku)가 진짜 상품으로 본다. 여기서는 가짜 유료 상품으로 조건 하나하나를 확인한다.
// 매달 무료 사용량이 있는 상품(cost.freeUsage)은 이 충돌이 아니라 주의 conflict.paid-free-usage다 (D101).

describe('conflict.paid-on-free (진짜 규칙)', () => {
  const PAID_ON_FREE = realConflictRule('conflict.paid-on-free');
  const budget = question('q.budget', [option('free-only', { 'budget.free': 1 }), option('more', { 'budget.flex': 1 })]);
  const cat = tinyCatalog({
    questions: [budget],
    rules: [SCREEN, PAID_ON_FREE],
    products: [tool('free-screen', ['screen']), tool('paid-screen', ['screen'], 1, { cost: { free: false, note: '월 9,900원' } })],
    cards: [realCard(PAID_ON_FREE.researchCard)],
  });

  it('진짜 규칙은 0원만 태그와 유료 상품을 함께 본다', () => {
    expect(PAID_ON_FREE.researchCard).toBe('research.paid-limits');
    expect(PAID_ON_FREE.when).toEqual({ all: [{ tag: 'budget.free', gte: 1 }, { cartAny: { field: 'cost.plan', is: 'paid' } }] });
    expect(PAID_ON_FREE.severity).toBeUndefined();
  });

  it('0원만인데 유료 상품을 담으면 켜진다', () => {
    const r = evaluate(cat, { answers: { 'q.budget': 'free-only' }, cart: ['paid-screen'] });
    expect(r.conflicts).toEqual([
      {
        id: 'conflict.paid-on-free',
        kind: 'rule',
        severity: 'conflict',
        message: PAID_ON_FREE.message,
        fixHint: PAID_ON_FREE.fixHint,
        researchCard: 'research.paid-limits',
        keepable: true,
        kept: false,
      },
    ]);
    expect(r.canIssue).toBe(false);
  });

  it('무료 상품과 함께 담아도 유료가 하나라도 있으면 켜진다', () => {
    const r = evaluate(cat, { answers: { 'q.budget': 'free-only' }, cart: ['free-screen', 'paid-screen'] });
    expect(ids(r.conflicts)).toEqual(['conflict.paid-on-free']);
  });

  it('무료 상품만 담으면 켜지지 않는다', () => {
    expect(evaluate(cat, { answers: { 'q.budget': 'free-only' }, cart: ['free-screen'] }).conflicts).toEqual([]);
  });

  it('매달 무료 사용량이 있는 상품(cost.freeUsage)은 충돌이 아니라 주의로, 출발을 막지 않는다', () => {
    const FREE_USAGE = realConflictRule('conflict.paid-free-usage');
    const c2 = tinyCatalog({
      questions: [budget],
      rules: [SCREEN, PAID_ON_FREE, FREE_USAGE],
      products: [tool('quota-screen', ['screen'], 1, { cost: { free: false, freeUsage: true, note: '매달 1만 건 무료' } })],
      cards: [realCard(PAID_ON_FREE.researchCard)],
    });
    const r = evaluate(c2, { answers: { 'q.budget': 'free-only' }, cart: ['quota-screen'] });
    expect(ids(r.conflicts)).toEqual(['conflict.paid-free-usage']);
    expect(conflictIn(r, 'conflict.paid-free-usage')).toMatchObject({ severity: 'warning', kept: true });
    expect(r.canIssue).toBe(true);
    expect(ids(r.research)).toEqual(['research.paid-limits']);
  });

  it('예산이 0원만이 아니면 유료여도 켜지지 않는다', () => {
    expect(evaluate(cat, { answers: { 'q.budget': 'more' }, cart: ['paid-screen'] }).conflicts).toEqual([]);
  });

  it('그대로 두면 발행할 수 있고 조사할 것에 요금 카드가 붙는다', () => {
    const r = evaluate(cat, { answers: { 'q.budget': 'free-only' }, cart: ['paid-screen'], kept: ['conflict.paid-on-free'] });
    expect(conflictIn(r, 'conflict.paid-on-free').kept).toBe(true);
    expect(r.canIssue).toBe(true);
    expect(r.research).toEqual([{ ...realCard('research.paid-limits'), source: 'conflict' }]);
  });

  it('진짜 자료 전체(case-01)에 가짜 유료 상품을 더해도 이 충돌만 늘어난다', () => {
    const d = realData();
    d.products.products.push(tool('fake-paid', ['screen'], 1, { cost: { free: false, note: '월 9,900원' } }));
    const real = makeCatalog(d);
    const g = readJson<Golden>(join(DATA_DIR, 'golden', 'case-01.json'));
    const base = evaluate(real, goldenSession(g));
    const paid = evaluate(real, { ...goldenSession(g), cart: [...g.cart, 'fake-paid'] });
    expect(g.answers['q.budget']).toBe('free-only');
    expect(ids(base.conflicts)).not.toContain('conflict.paid-on-free');
    expect(ids(paid.conflicts)).toContain('conflict.paid-on-free');
    expect(ids(paid.conflicts).filter((id) => id !== 'conflict.paid-on-free')).toEqual(ids(base.conflicts));
    expect(conflictIn(paid, 'conflict.paid-on-free').message).toBe(PAID_ON_FREE.message);
    expect(paid.canIssue).toBe(false);
    const kept = evaluate(real, { ...goldenSession(g), cart: [...g.cart, 'fake-paid'], kept: [...(g.kept ?? []), 'conflict.paid-on-free'] });
    expect(kept.canIssue).toBe(base.canIssue);
    expect(ids(kept.research)).toContain('research.paid-limits');
  });
});

// ── 1차/2차 나누기 ──────────────────────────────────────────────

describe('suggestSplit: 제안할지', () => {
  it('1차 난이도가 기준(6)과 같으면 제안하지 않는다', () => {
    const cat = tinyCatalog({ rules: [SCREEN, STORE, AUTH], products: [tool('s3', ['screen'], 3), tool('st3', ['store'], 3)] });
    expect(evaluate(cat, { cart: ['s3', 'st3'] }).split).toEqual({ difficulty: 6, difficultyFirst: 6, needed: false, defer: [], easier: [] });
  });

  it('기준을 넘으면 제안하고 미룰 수 있는 칸을 알려 준다', () => {
    const cat = tinyCatalog({
      rules: [SCREEN, STORE, AUTH],
      products: [tool('s3', ['screen'], 3), tool('st3', ['store'], 3), tool('au1', ['auth'], 1)],
    });
    expect(evaluate(cat, { cart: ['s3', 'st3', 'au1'] }).split).toEqual({ difficulty: 7, difficultyFirst: 7, needed: true, defer: ['slot.auth'], easier: [] });
  });

  it('기준값은 scoring.phaseSplitDifficulty에서 읽는다', () => {
    const cat = tinyCatalog({ scoring: { phaseSplitDifficulty: 2 }, rules: [SCREEN], products: [tool('s3', ['screen'], 3)] });
    expect(evaluate(cat, { cart: ['s3'] }).split).toMatchObject({ difficulty: 3, difficultyFirst: 3, needed: true });
  });

  it('같은 상품을 두 번 담아도 난이도는 한 번만 센다', () => {
    const cat = tinyCatalog({ rules: [SCREEN, STORE], products: [tool('s3', ['screen'], 3), tool('st3', ['store'], 3)] });
    expect(evaluate(cat, { cart: ['s3', 's3', 'st3', 'st3'] }).split).toMatchObject({ difficulty: 6, needed: false });
  });

  it('미룬 칸에만 쓰이는 상품은 1차 난이도에서 빠지고, 6 이하가 되면 제안이 사라진다', () => {
    const cat = tinyCatalog({
      rules: [SCREEN, STORE, AUTH],
      products: [tool('s3', ['screen'], 3), tool('st3', ['store'], 3), tool('au2', ['auth'], 2)],
    });
    const cart = ['s3', 'st3', 'au2'];
    expect(evaluate(cat, { cart }).split).toEqual({ difficulty: 8, difficultyFirst: 8, needed: true, defer: ['slot.auth'], easier: [] });
    expect(evaluate(cat, { cart, deferred: ['slot.auth'] }).split).toEqual({ difficulty: 8, difficultyFirst: 6, needed: false, defer: [], easier: [] });
  });

  it('미룬 칸의 상품이 다른 칸도 맡으면 1차 난이도는 그대로다 (Supabase 예)', () => {
    const cat = tinyCatalog({
      rules: [SCREEN, STORE, AUTH, NOTIFY],
      products: [tool('s3', ['screen'], 3), tool('sb', ['store', 'auth'], 3), tool('nt1', ['notify'], 1)],
    });
    const r = evaluate(cat, { cart: ['s3', 'sb', 'nt1'], deferred: ['slot.auth'] });
    expect(r.split).toEqual({ difficulty: 7, difficultyFirst: 7, needed: true, defer: ['slot.notify'], easier: [] });
  });

  it('어느 칸에도 안 쓰이는 상품은 1차에 남긴다', () => {
    const cat = tinyCatalog({
      rules: [SCREEN, NOTIFY],
      products: [tool('s3', ['screen'], 3), tool('nt1', ['notify'], 1), tool('orphan3', ['data'], 3)],
    });
    const r = evaluate(cat, { cart: ['s3', 'nt1', 'orphan3'], deferred: ['slot.notify'] });
    expect(r.split).toEqual({ difficulty: 7, difficultyFirst: 6, needed: false, defer: [], easier: [] });
    expect(r.orphans).toEqual(['orphan3']);
  });

  it('미룰 수 없는 칸을 deferred에 넣어도 1차 난이도는 줄지 않는다', () => {
    const cat = tinyCatalog({ rules: [SCREEN, STORE], products: [tool('s3', ['screen'], 3), tool('st3', ['store'], 3), tool('x1', ['data'], 1)] });
    const r = evaluate(cat, { cart: ['s3', 'st3', 'x1'], deferred: ['slot.store'] });
    expect(r.session.deferred).toEqual([]);
    expect(r.split).toMatchObject({ difficulty: 7, difficultyFirst: 7, needed: true, defer: [] });
  });
});

describe('suggestSplit: 미룰 수 있는 칸 (defer)', () => {
  const ALARM = slotRule('slot-rule.alarm', { id: 'slot.alarm', capability: 'proxy', required: false, order: 60, deferrable: true });
  // 규칙 순서·id 순서와 다르게 칸 순서(order)를 따르는지 보려고 섞어 둔다
  const cat = tinyCatalog({
    rules: [ALARM, NOTIFY, SCREEN, AUTH, STORE],
    products: [tool('s3', ['screen'], 3), tool('st3', ['store'], 3), tool('x1', ['data'], 1)],
  });
  const cart = ['s3', 'st3', 'x1'];

  it('아직 미루지 않은, 미룰 수 있는 칸만 칸 순서로', () => {
    expect(evaluate(cat, { cart }).split.defer).toEqual(['slot.auth', 'slot.notify', 'slot.alarm']);
  });

  it('이미 미룬 칸은 빠진다', () => {
    const r = evaluate(cat, { cart, deferred: ['slot.notify'] });
    expect(r.split.needed).toBe(true);
    expect(r.split.defer).toEqual(['slot.auth', 'slot.alarm']);
  });

  it('제안이 필요 없으면 미룰 수 있는 칸이 있어도 비운다', () => {
    expect(evaluate(cat, { cart: ['s3', 'st3'] }).split).toMatchObject({ needed: false, defer: [] });
  });
});

describe('suggestSplit: 더 쉬운 상품 (easier)', () => {
  // 나누기 제안이 늘 켜지게 기준을 0으로 둔다. 점수 = 4 − 난이도 (추천 기준 3)
  const ALWAYS = { phaseSplitDifficulty: 0 };

  it('그 칸만 맡은 상품 하나를 담았으면 같은 칸의 더 쉬운 진열 상품을 제안한다', () => {
    const cat = tinyCatalog({ scoring: ALWAYS, rules: [SCREEN], products: [tool('hard', ['screen'], 3), tool('easy', ['screen'], 1)] });
    expect(evaluate(cat, { cart: ['hard'] }).split.easier).toEqual([{ slotId: 'slot.screen', from: 'hard', to: 'easy' }]);
  });

  it('추천 기준 점수에 못 미치면 제안하지 않는다 (기준은 scoring.recommendThreshold)', () => {
    // mid 점수 = 4 − 2 = 2 < 3
    const parts = { rules: [SCREEN], products: [tool('hard', ['screen'], 3), tool('mid', ['screen'], 2)] };
    expect(evaluate(tinyCatalog({ scoring: ALWAYS, ...parts }), { cart: ['hard'] }).split.easier).toEqual([]);
    const lower = tinyCatalog({ scoring: { ...ALWAYS, recommendThreshold: 2 }, ...parts });
    expect(evaluate(lower, { cart: ['hard'] }).split.easier).toEqual([{ slotId: 'slot.screen', from: 'hard', to: 'mid' }]);
  });

  it('추천 제외 상품과 색인 상품은 제안하지 않는다', () => {
    const cat = tinyCatalog({
      scoring: ALWAYS,
      rules: [SCREEN],
      products: [tool('hard', ['screen'], 3), tool('no-rec', ['screen'], 1, { recommendable: false }), tool('idx', ['screen'], 1, { layer: 'index' })],
    });
    expect(evaluate(cat, { cart: ['hard'] }).split.easier).toEqual([]);
  });

  it('난이도가 같거나 높은 상품은 제안하지 않는다', () => {
    const cat = tinyCatalog({
      scoring: { ...ALWAYS, recommendThreshold: 0 },
      rules: [SCREEN],
      products: [tool('mid', ['screen'], 2), tool('mid2', ['screen'], 2), tool('hard', ['screen'], 3)],
    });
    expect(evaluate(cat, { cart: ['mid'] }).split.easier).toEqual([]);
  });

  it('진열 순서(점수 → 공식 → 난이도 → id)에서 조건을 넘는 첫 상품을 고른다', () => {
    // 이용자 ai.chat-free(수준 1). good2 = 무료 2 + 공식 1 − 1 + 도구 맞음 2 = 4, easy-a·easy-b = 3
    const cat = tinyCatalog({
      scoring: ALWAYS,
      questions: [switchQuestion({ 'ai.chat-free': 1 })],
      rules: [SCREEN],
      products: [tool('hard', ['screen'], 3), tool('easy-b', ['screen'], 1), tool('easy-a', ['screen'], 1), tool('good2', ['screen'], 2, { goodFor: ['ai.chat-free'] })],
    });
    expect(evaluate(cat, { answers: ON, cart: ['hard'] }).split.easier).toEqual([{ slotId: 'slot.screen', from: 'hard', to: 'good2' }]);
    // 도구가 맞지 않으면 good2 = 2라서 탈락하고, 점수가 같은 쉬운 상품 중 id가 앞선 것
    expect(evaluate(cat, { answers: OFF, cart: ['hard'] }).split.easier).toEqual([{ slotId: 'slot.screen', from: 'hard', to: 'easy-a' }]);
  });

  it('칸을 두 상품이 채우면 제안하지 않는다', () => {
    const cat = tinyCatalog({ scoring: ALWAYS, rules: [SCREEN], products: [tool('hard', ['screen'], 3), tool('hard2', ['screen'], 3), tool('easy', ['screen'], 1)] });
    expect(evaluate(cat, { cart: ['hard', 'hard2'] }).split.easier).toEqual([]);
  });

  it('담은 상품이 다른 열린 칸도 맡으면 제안하지 않는다', () => {
    const cat = tinyCatalog({
      scoring: ALWAYS,
      rules: [SCREEN, STORE],
      products: [tool('combo', ['screen', 'store'], 3), tool('easy', ['screen'], 1), tool('store-easy', ['store'], 1)],
    });
    expect(evaluate(cat, { cart: ['combo'] }).split.easier).toEqual([]);
  });

  it('미룬 칸에는 제안하지 않고, 미룬 칸은 "다른 칸"으로 세지 않는다', () => {
    const cat = tinyCatalog({
      scoring: ALWAYS,
      rules: [STORE, AUTH],
      products: [tool('sb', ['store', 'auth'], 3), tool('store-easy', ['store'], 1), tool('auth-easy', ['auth'], 1)],
    });
    // 미루기 전: sb가 열린 칸 두 개를 맡아서 제안 없음
    expect(evaluate(cat, { cart: ['sb'] }).split.easier).toEqual([]);
    // 로그인을 미루면 sb는 미루지 않은 칸 중 저장만 맡는다. 로그인 칸에는 제안하지 않는다
    expect(evaluate(cat, { cart: ['sb'], deferred: ['slot.auth'] }).split.easier).toEqual([{ slotId: 'slot.store', from: 'sb', to: 'store-easy' }]);
  });

  it('여러 칸이면 칸 순서대로 제안한다', () => {
    const cat = tinyCatalog({
      scoring: ALWAYS,
      rules: [STORE, SCREEN],
      products: [tool('hard', ['screen'], 3), tool('store-hard', ['store'], 2), tool('easy', ['screen'], 1), tool('store-easy', ['store'], 1)],
    });
    expect(evaluate(cat, { cart: ['store-hard', 'hard'] }).split.easier).toEqual([
      { slotId: 'slot.screen', from: 'hard', to: 'easy' },
      { slotId: 'slot.store', from: 'store-hard', to: 'store-easy' },
    ]);
  });

  it('제안이 필요 없으면 더 쉬운 상품이 있어도 비운다', () => {
    const cat = tinyCatalog({ rules: [SCREEN], products: [tool('hard', ['screen'], 3), tool('easy', ['screen'], 1)] });
    expect(evaluate(cat, { cart: ['hard'] }).split).toEqual({ difficulty: 3, difficultyFirst: 3, needed: false, defer: [], easier: [] });
  });
});

describe('evaluate가 내놓는 split', () => {
  it('evaluate의 split은 정리된 deferred로 suggestSplit을 부른 결과와 같다', () => {
    const cat = tinyCatalog({
      rules: [SCREEN, STORE, AUTH, NOTIFY],
      products: [tool('s3', ['screen'], 3), tool('sb', ['store', 'auth'], 3), tool('nt2', ['notify'], 2), tool('easy', ['screen'], 1)],
    });
    const r = evaluate(cat, { cart: ['s3', 'sb', 'nt2'], deferred: ['slot.auth', 'slot.store', 'slot.ghost'] });
    expect(r.session.deferred).toEqual(['slot.auth']);
    expect(r.split).toEqual(suggestSplit(cat, r.cart, r.slots, r.session.deferred));
    expect(r.split).toEqual({
      difficulty: 8,
      difficultyFirst: 8,
      needed: true,
      defer: ['slot.notify'],
      easier: [{ slotId: 'slot.screen', from: 's3', to: 'easy' }],
    });
  });
});

// ── 1차 상품과 칸 밖 상품 ────────────────────────────────────────

describe('firstPhaseProducts', () => {
  const slots = [slotOf('slot.screen', 'screen'), slotOf('slot.store', 'store', { order: 20 }), slotOf('slot.auth', 'auth', { order: 30, deferrable: true })];
  const cart = [tool('scr', ['screen']), tool('au', ['auth']), tool('sb', ['store', 'auth']), tool('out', ['notify'])];

  it('미룬 칸에만 쓰이는 상품만 빼고 담은 순서를 지킨다', () => {
    expect(ids(firstPhaseProducts(cart, slots, ['slot.auth']))).toEqual(['scr', 'sb', 'out']);
  });

  it('미룬 칸이 없으면 모두 1차', () => {
    expect(ids(firstPhaseProducts(cart, slots, []))).toEqual(['scr', 'au', 'sb', 'out']);
  });
});

describe('칸 밖 상품 (orphanProducts)', () => {
  it('열린 칸 어디에도 쓰이지 않는 상품을 담은 순서로', () => {
    const slots = [slotOf('slot.screen', 'screen'), slotOf('slot.store', 'store', { order: 20 })];
    const cart = [tool('n', ['notify']), tool('scr', ['screen']), tool('d', ['data', 'proxy']), tool('sb', ['store', 'auth'])];
    expect(orphanProducts(cart, slots)).toEqual(['n', 'd']);
  });

  it('칸이 열리면 칸 밖 상품이 아니다', () => {
    const cat = tinyCatalog({
      questions: [switchQuestion({ 'need.login': 1 })],
      rules: [SCREEN, slotRule('slot-rule.auth', { id: 'slot.auth', capability: 'auth', required: true, order: 30, deferrable: true }, { tag: 'need.login', gte: 1 })],
      products: [tool('s', ['screen']), tool('au', ['auth'])],
    });
    expect(evaluate(cat, { answers: OFF, cart: ['s', 'au'] }).orphans).toEqual(['au']);
    expect(evaluate(cat, { answers: ON, cart: ['s', 'au'] }).orphans).toEqual([]);
  });

  it('2차로 미룬 칸도 열린 칸이라 그 칸의 상품은 칸 밖 상품이 아니다', () => {
    const cat = tinyCatalog({ rules: [SCREEN, AUTH], products: [tool('s', ['screen']), tool('au', ['auth'])] });
    expect(evaluate(cat, { cart: ['s', 'au'], deferred: ['slot.auth'] }).orphans).toEqual([]);
  });
});
