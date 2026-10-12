// 계산대 엔진(checkout.ts) 시험: 조사할 것, 안전 지시, 예상 막힘, 준비물, 공부할 것(선수 개념·위상 정렬),
// 진행 순서(중간 서버 단계 자리, 개념 붙이기), 예상 시간, 만들지 않을 것.
// 기대값은 docs/ENGINE.md 5절과 data/scoring.json(baseMinutes 30, unknownSetupMinutes 60, studyRequiredMax 3)으로 손으로 계산했다.
import { describe, expect, it } from 'vitest';
import type { Catalog, Conflict, Ctx, EngineResult, Session, Slot } from '../../src/lib/engine/index.ts';
import { evaluate, formatMinutes, makeCatalog, PROXY_STEP } from '../../src/lib/engine/index.ts';
import {
  buildSteps,
  buildStudy,
  collectNotBuild,
  collectPrep,
  collectResearch,
  collectSafety,
  collectStuck,
  estimateMinutes,
  topoSort,
  withPrerequisites,
} from '../../src/lib/engine/checkout.ts';
import type { Capability, Data, PrepItem, Product, SlotDef } from '../../src/lib/engine/types.ts';
import {
  card,
  concept,
  conflictRule,
  option,
  product,
  question,
  realCatalog,
  researchRule,
  safetyRule,
  slotRule,
  stuckRule,
  tinyCatalog,
  tinyData,
} from '../fixtures/tiny.ts';

// ── 도우미 ─────────────────────────────────────────────

function slotOf(id: string, capability: Capability, order: number, extra: Partial<SlotDef> = {}): Slot {
  return { id, label: `칸 ${id}`, capability, required: false, order, ...extra, ruleIds: [] };
}

function ctxOf(parts: Partial<Ctx> = {}): Ctx {
  return { tags: {}, answers: {}, cart: [], deferred: [], ...parts };
}

function ruleConflict(id: string, kept: boolean, researchCard?: string): Conflict {
  const c: Conflict = { id, kind: 'rule', message: `${id} 충돌`, fixHint: `${id} 고치기`, keepable: true, kept };
  if (researchCard !== undefined) c.researchCard = researchCard;
  return c;
}

function emptyConflict(slotId: string, kept: boolean): Conflict {
  return { id: `conflict.empty-slot:${slotId}`, kind: 'empty-slot', message: '빈 칸', fixHint: '담기', slotId, keepable: true, kept };
}

/** 답 하나로 태그를 한꺼번에 주는 질문 */
function tagQuestion(tags: Record<string, number>): ReturnType<typeof question> {
  return question('q.tags', [option('o', tags)]);
}
const ANSWERED = { 'q.tags': 'o' };

const prep = (label: string, lead: PrepItem['lead'], url?: string): PrepItem => (url === undefined ? { label, lead } : { label, lead, url });

const SCREEN = slotOf('slot.screen', 'screen', 10);
const STORE = slotOf('slot.store', 'store', 20, { label: '저장' });
const AUTH = slotOf('slot.auth', 'auth', 30);
const DATA = slotOf('slot.data', 'data', 40);
const NOTIFY = slotOf('slot.notify', 'notify', 45, { deferrable: true });
const HOST = slotOf('slot.host', 'host', 50);

const stepIds = (r: { slotId: string }[]): string[] => r.map((s) => s.slotId);

/** 칸 다섯(화면·저장·외부 데이터·알림(미룰 수 있음)·배포)을 여는 칸 규칙 */
function fiveSlotRules(): ReturnType<typeof slotRule>[] {
  return [
    slotRule('slot-rule.screen', { id: 'slot.screen', capability: 'screen', required: true, mustFill: true, order: 10 }),
    slotRule('slot-rule.store', { id: 'slot.store', capability: 'store', required: true, order: 20, label: '저장' }),
    slotRule('slot-rule.data', { id: 'slot.data', capability: 'data', order: 40 }),
    slotRule('slot-rule.notify', { id: 'slot.notify', capability: 'notify', order: 45, deferrable: true }),
    slotRule('slot-rule.host', { id: 'slot.host', capability: 'host', order: 50 }),
  ];
}

function run(cat: Catalog, s: Partial<Session>): EngineResult {
  return evaluate(cat, { answers: ANSWERED, ...s });
}

// ── 조사할 것 ─────────────────────────────────────────────

describe('collectResearch 조사할 것', () => {
  it('조건이 맞는 조사 규칙의 카드를 규칙 순서로 담는다', () => {
    const cat = tinyCatalog({
      rules: [
        researchRule('r.b', { always: true }, 'card.b'),
        researchRule('r.no', { tag: 'need.x', gte: 1 }, 'card.c'),
        researchRule('r.a', { always: true }, 'card.a'),
      ],
      cards: [card('card.a'), card('card.b'), card('card.c', { where: ['가', '나'] })],
    });
    const out = collectResearch(cat, ctxOf(), [], []);
    expect(out.map((x) => x.id)).toEqual(['card.b', 'card.a']);
    expect(out[0]).toEqual({ ...card('card.b'), source: 'rule' });
  });

  it('그대로 둔 규칙 충돌만 카드를 붙인다', () => {
    const cat = tinyCatalog({ cards: [card('card.k'), card('card.u')] });
    const conflicts = [ruleConflict('c.kept', true, 'card.k'), ruleConflict('c.open', false, 'card.u'), ruleConflict('c.nocard', true)];
    const out = collectResearch(cat, ctxOf(), conflicts, []);
    expect(out.map((x) => [x.id, x.source])).toEqual([['card.k', 'conflict']]);
  });

  it('같은 카드는 앞의 것(규칙)만 남긴다', () => {
    const cat = tinyCatalog({ rules: [researchRule('r.x', { always: true }, 'card.x')], cards: [card('card.x')] });
    const out = collectResearch(cat, ctxOf(), [ruleConflict('c.x', true, 'card.x')], []);
    expect(out.map((x) => [x.id, x.source])).toEqual([['card.x', 'rule']]);
  });

  it('그대로 둔 빈 칸은 문장 틀로 항목을 만든다', () => {
    const d = tinyData();
    d.templates.emptySlot.research = {
      area: '{{label}} 칸',
      what: '{{label}} 무엇',
      why: '이유',
      where: ['{{label}} 문서', '고정'],
      doneWhen: '{{label}} 끝',
    };
    const cat = makeCatalog(d);
    const out = collectResearch(cat, ctxOf(), [emptyConflict('slot.store', true), emptyConflict('slot.data', false)], [STORE, DATA]);
    expect(out).toEqual([
      {
        id: 'research.empty:slot.store',
        source: 'empty-slot',
        area: '저장 칸',
        what: '저장 무엇',
        why: '이유',
        where: ['저장 문서', '고정'],
        doneWhen: '저장 끝',
      },
    ]);
  });

  it('칸 목록에 없는 빈 칸은 칸 id를 이름 자리에 쓴다', () => {
    const d = tinyData();
    d.templates.emptySlot.research = { area: '{{label}}', what: '', why: '', where: [], doneWhen: '' };
    const out = collectResearch(makeCatalog(d), ctxOf(), [emptyConflict('slot.ghost', true)], []);
    expect(out.map((x) => [x.id, x.area])).toEqual([['research.empty:slot.ghost', 'slot.ghost']]);
  });

  it('색인 상품은 담은 순서로, 이름과 첫 링크를 채워 만든다', () => {
    const d = tinyData();
    d.templates.indexResearch = { area: '{{name}} 알아보기', what: '{{name}}?', why: '색인', where: ['{{link}}'], doneWhen: '정리' };
    const ix2 = product('ix2', { layer: 'index', name: '둘째 API', links: [] });
    const shelf = product('shelf');
    const ix1 = product('ix1', {
      layer: 'index',
      name: '첫째 API',
      links: [
        { label: '원문', url: 'https://example.com/one' },
        { label: '다른', url: 'https://example.com/two' },
      ],
    });
    const out = collectResearch(makeCatalog(d), ctxOf({ cart: [ix2, shelf, ix1] }), [], []);
    expect(out).toEqual([
      { id: 'research.index:ix2', source: 'index', area: '둘째 API 알아보기', what: '둘째 API?', why: '색인', where: [''], doneWhen: '정리' },
      {
        id: 'research.index:ix1',
        source: 'index',
        area: '첫째 API 알아보기',
        what: '첫째 API?',
        why: '색인',
        where: ['https://example.com/one'],
        doneWhen: '정리',
      },
    ]);
  });

  it('규칙 → 규칙 충돌 → 빈 칸 → 색인 상품 순으로 잇는다', () => {
    const cat = tinyCatalog({ rules: [researchRule('r.a', { always: true }, 'card.a')], cards: [card('card.a'), card('card.k')] });
    const ix = product('ix', { layer: 'index', capabilities: ['data'] });
    // 충돌 목록에서 빈 칸이 앞에 있어도 규칙 충돌 카드가 먼저다
    const conflicts = [emptyConflict('slot.store', true), ruleConflict('c.k', true, 'card.k')];
    const out = collectResearch(cat, ctxOf({ cart: [ix] }), conflicts, [STORE]);
    expect(out.map((x) => [x.id, x.source])).toEqual([
      ['card.a', 'rule'],
      ['card.k', 'conflict'],
      ['research.empty:slot.store', 'empty-slot'],
      ['research.index:ix', 'index'],
    ]);
  });

  it('없는 조사 카드를 가리키면 오류를 낸다', () => {
    const cat = tinyCatalog({ rules: [researchRule('r.none', { always: true }, 'card.none')] });
    expect(() => collectResearch(cat, ctxOf(), [], [])).toThrow('조사 카드가 없습니다: card.none');
  });

  it('evaluate: 미룬 칸 조건, 그대로 둔 충돌과 빈 칸, 색인 상품을 모은다', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion({})],
      rules: [
        ...fiveSlotRules(),
        conflictRule('conflict.a', { cartHas: 'ix' }, 'card.a'),
        researchRule('research.later', { deferred: 'slot.notify' }, 'card.n'),
      ],
      products: [product('scr'), product('ix', { layer: 'index', capabilities: ['data'] })],
      cards: [card('card.a'), card('card.n')],
    });
    const kept = ['conflict.a', 'conflict.empty-slot:slot.store'];
    const r = run(cat, { cart: ['scr', 'ix'], kept, deferred: ['slot.notify'] });
    expect(r.research.map((x) => x.id)).toEqual(['card.n', 'card.a', 'research.empty:slot.store', 'research.index:ix']);
    // 미루지 않으면 미룬 칸 조건의 카드가 빠지고, 그대로 두지 않은 충돌은 조사할 것이 되지 않는다
    const r2 = run(cat, { cart: ['scr', 'ix'], kept: [], deferred: [] });
    expect(r2.research.map((x) => x.id)).toEqual(['research.index:ix']);
  });
});

// ── 안전 지시 ─────────────────────────────────────────────

describe('collectSafety 안전 지시', () => {
  it('규칙이 없으면 기본 지시만 낸다', () => {
    const cat = tinyCatalog();
    const out = collectSafety(cat, ctxOf());
    expect(out.lines).toEqual(cat.data.templates.safetyDefaults);
    expect(out.ruleIds).toEqual([]);
  });

  it('기본 지시 뒤에 조건이 맞는 규칙 줄을 규칙 순서로 붙인다', () => {
    const cat = tinyCatalog({
      rules: [safetyRule('s.b', { always: true }), safetyRule('s.no', { tag: 'need.x', gte: 1 }), safetyRule('s.a', { always: true })],
    });
    const out = collectSafety(cat, ctxOf());
    expect(out.lines).toEqual([...cat.data.templates.safetyDefaults, 's.b 안전 지시.', 's.a 안전 지시.']);
    expect(out.ruleIds).toEqual(['s.b', 's.a']);
  });

  it('같은 문장은 한 번만 쓰고, 맞은 규칙 id는 모두 남긴다', () => {
    const d = tinyData();
    const firstDefault = d.templates.safetyDefaults[0] ?? '';
    d.rules.rules = [
      safetyRule('s.one', { always: true }, '같은 줄.'),
      safetyRule('s.two', { always: true }, '같은 줄.'),
      safetyRule('s.dup-default', { always: true }, firstDefault),
    ];
    const cat = makeCatalog(d);
    const out = collectSafety(cat, ctxOf());
    expect(out.lines).toEqual([...d.templates.safetyDefaults, '같은 줄.']);
    expect(out.ruleIds).toEqual(['s.one', 's.two', 's.dup-default']);
  });

  it('evaluate: 미룬 칸과 장바구니 조건을 본다', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion({})],
      rules: [
        ...fiveSlotRules(),
        safetyRule('s.later', { deferred: 'slot.notify' }),
        safetyRule('s.key', { cartAny: { field: 'keyExposureRisk', is: true } }),
      ],
      products: [product('scr'), product('st', { capabilities: ['store'] }), product('kd', { capabilities: ['data'], keyExposureRisk: true })],
    });
    const defaults = cat.data.templates.safetyDefaults;
    const r = run(cat, { cart: ['scr', 'st', 'kd'], deferred: ['slot.notify'] });
    expect(r.safety.ruleIds).toEqual(['s.later', 's.key']);
    expect(r.safety.lines).toEqual([...defaults, 's.later 안전 지시.', 's.key 안전 지시.']);
    const r2 = run(cat, { cart: ['scr', 'st'] });
    expect(r2.safety.ruleIds).toEqual([]);
  });
});

// ── 예상 막힘 ─────────────────────────────────────────────

describe('collectStuck 예상 막힘', () => {
  it('상품 메모(담은 순서) 다음에 조건이 맞는 규칙(규칙 순서)', () => {
    const cat = tinyCatalog({
      rules: [
        stuckRule('st.x', { always: true }, { concepts: ['api'] }),
        stuckRule('st.no', { cartHas: 'nope' }),
        stuckRule('st.y', { cartHas: 'p1' }),
      ],
    });
    const p1 = product('p1', { stuck: ['a1'] });
    const p2 = product('p2', { stuck: ['b1', 'b2'] });
    const p3 = product('p3');
    const out = collectStuck(cat, ctxOf({ cart: [p2, p1, p3] }));
    expect(out).toEqual([
      { from: 'p2', text: 'b1', concepts: [] },
      { from: 'p2', text: 'b2', concepts: [] },
      { from: 'p1', text: 'a1', concepts: [] },
      { from: 'st.x', text: 'st.x 막힘', concepts: ['api'] },
      { from: 'st.y', text: 'st.y 막힘', concepts: [] },
    ]);
  });

  it('메모도 규칙도 없으면 빈 목록', () => {
    expect(collectStuck(tinyCatalog(), ctxOf({ cart: [product('p1')] }))).toEqual([]);
  });

  it('evaluate: 장바구니 전체의 메모와 미룬 칸 조건 규칙', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion({})],
      rules: [...fiveSlotRules(), stuckRule('st.later', { deferred: 'slot.notify' })],
      products: [
        product('scr', { stuck: ['화면 메모'] }),
        product('st', { capabilities: ['store'] }),
        product('nt', { capabilities: ['notify'], stuck: ['알림 메모'] }),
      ],
    });
    const r = run(cat, { cart: ['nt', 'scr', 'st'], deferred: ['slot.notify'] });
    expect(r.stuck.map((x) => [x.from, x.text])).toEqual([
      ['nt', '알림 메모'],
      ['scr', '화면 메모'],
      ['st.later', 'st.later 막힘'],
    ]);
  });
});

// ── 준비물 ─────────────────────────────────────────────

describe('collectPrep 준비물', () => {
  it('며칠 → 몇 시간 → 바로 순, 같으면 담은 순서', () => {
    const p1 = product('p1', { prep: [prep('A', 'instant'), prep('B', 'days')] });
    const p2 = product('p2', { prep: [prep('C', 'hours'), prep('D', 'days'), prep('E', 'instant')] });
    expect(collectPrep([p1, p2]).map((x) => x.label)).toEqual(['B', 'D', 'C', 'A', 'E']);
    expect(collectPrep([p2, p1]).map((x) => x.label)).toEqual(['D', 'B', 'C', 'E', 'A']);
  });

  it('이름이 같으면 담은 순서로 앞의 것 하나만', () => {
    const p1 = product('p1', { prep: [prep('Node', 'instant', 'https://example.com/a')] });
    const p2 = product('p2', { prep: [prep('Node', 'days', 'https://example.com/b'), prep('키', 'hours')] });
    expect(collectPrep([p1, p2])).toEqual([prep('키', 'hours'), prep('Node', 'instant', 'https://example.com/a')]);
  });

  it('준비물이 없으면 빈 목록', () => {
    expect(collectPrep([product('p1'), product('p2', { prep: [] })])).toEqual([]);
    expect(collectPrep([])).toEqual([]);
  });

  it('evaluate: 미룬 칸에만 쓰는 상품은 빼고, 칸 밖 상품은 넣는다', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion({})],
      rules: fiveSlotRules(),
      products: [
        product('scr', { prep: [prep('화면 준비', 'instant')] }),
        product('st', { capabilities: ['store'] }),
        product('nt', { capabilities: ['notify'], prep: [prep('알림 준비', 'days')] }),
        product('px', { capabilities: ['proxy'], prep: [prep('칸 밖 준비', 'hours')] }),
      ],
    });
    const r = run(cat, { cart: ['scr', 'st', 'nt', 'px'], deferred: ['slot.notify'] });
    expect(r.orphans).toEqual(['px']);
    expect(r.prep.map((x) => x.label)).toEqual(['칸 밖 준비', '화면 준비']);
    const r2 = run(cat, { cart: ['scr', 'st', 'nt', 'px'] });
    expect(r2.prep.map((x) => x.label)).toEqual(['알림 준비', '칸 밖 준비', '화면 준비']);
  });
});

// ── 공부할 것: 선수 개념과 줄 세우기 ─────────────────────────────────────────────

describe('withPrerequisites 선수 개념 모으기', () => {
  it('선수 개념을 끝까지 더한다', () => {
    const cat = tinyCatalog({
      concepts: [concept('a'), concept('b', { prerequisites: ['a'] }), concept('c', { prerequisites: ['b'] }), concept('z')],
    });
    expect([...withPrerequisites(cat, ['c'])].sort()).toEqual(['a', 'b', 'c']);
  });

  it('겹치는 선수 개념은 한 번만', () => {
    const cat = tinyCatalog({
      concepts: [
        concept('a'),
        concept('b', { prerequisites: ['a'] }),
        concept('c', { prerequisites: ['a'] }),
        concept('d', { prerequisites: ['b', 'c'] }),
      ],
    });
    const out = withPrerequisites(cat, ['d', 'b']);
    expect(out.size).toBe(4);
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('빈 입력이면 빈 집합', () => {
    expect(withPrerequisites(tinyCatalog(), []).size).toBe(0);
  });

  it('없는 개념이나 없는 선수 개념은 오류', () => {
    const cat = tinyCatalog({ concepts: [concept('a', { prerequisites: ['ghost'] })] });
    expect(() => withPrerequisites(cat, ['nope'])).toThrow('개념 카드가 없습니다: nope');
    expect(() => withPrerequisites(cat, ['a'])).toThrow('개념 카드가 없습니다: ghost');
  });

  it('순환이 있어도 모으기는 끝난다', () => {
    const cat = tinyCatalog({ concepts: [concept('a', { prerequisites: ['b'] }), concept('b', { prerequisites: ['a'] })] });
    expect([...withPrerequisites(cat, ['a'])].sort()).toEqual(['a', 'b']);
  });
});

describe('topoSort 배울 순서', () => {
  it('선수 개념은 order가 커도 먼저 온다', () => {
    const cat = tinyCatalog({ concepts: [concept('a', { order: 50 }), concept('c', { order: 5, prerequisites: ['a'] })] });
    expect(topoSort(cat, new Set(['c', 'a']))).toEqual(['a', 'c']);
  });

  it('동시에 배울 수 있으면 order, 같으면 id 순', () => {
    const cat = tinyCatalog({ concepts: [concept('x', { order: 20 }), concept('b', { order: 10 }), concept('a', { order: 10 })] });
    expect(topoSort(cat, new Set(['x', 'b', 'a']))).toEqual(['a', 'b', 'x']);
  });

  it('선수 개념이 풀린 뒤에 다시 order로 고른다', () => {
    // 처음엔 b(10)·a(20)만 배울 수 있다. c(10)는 a 뒤, d(15)는 b 뒤.
    const cat = tinyCatalog({
      concepts: [
        concept('a', { order: 20 }),
        concept('b', { order: 10 }),
        concept('c', { order: 10, prerequisites: ['a'] }),
        concept('d', { order: 15, prerequisites: ['b'] }),
      ],
    });
    expect(topoSort(cat, new Set(['a', 'b', 'c', 'd']))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('집합 밖의 선수 개념은 기다리지 않고, 모르는 id는 뺀다', () => {
    const cat = tinyCatalog({ concepts: [concept('a'), concept('c', { prerequisites: ['a'] })] });
    expect(topoSort(cat, new Set(['c']))).toEqual(['c']);
    expect(topoSort(cat, new Set(['ghost', 'a']))).toEqual(['a']);
    expect(topoSort(cat, new Set())).toEqual([]);
  });

  it('선후 관계에 순환이 있으면 오류', () => {
    const cat = tinyCatalog({
      concepts: [concept('a', { prerequisites: ['b'] }), concept('b', { prerequisites: ['a'] }), concept('ok')],
    });
    expect(() => topoSort(cat, new Set(['a', 'b', 'ok']))).toThrow('개념 선후 관계에 순환이 있습니다');
  });

  it('evaluate: 담은 상품의 개념에 순환이 있으면 오류', () => {
    const cat = tinyCatalog({
      rules: [slotRule('slot-rule.screen', { id: 'slot.screen', capability: 'screen', required: true })],
      products: [product('scr', { needsConcepts: ['a'] })],
      concepts: [concept('a', { prerequisites: ['b'] }), concept('b', { prerequisites: ['a'] })],
    });
    expect(() => evaluate(cat, { cart: ['scr'] })).toThrow('개념 선후 관계에 순환이 있습니다');
  });
});

describe('buildStudy 공부할 것', () => {
  const concepts = [
    concept('m1', { order: 10 }),
    concept('g1', { order: 15, level: 'good', prerequisites: ['m1'] }),
    concept('m2', { order: 20 }),
    concept('m3', { order: 30 }),
    concept('m4', { order: 40 }),
  ];
  const p1 = product('p1', { needsConcepts: ['m4', 'g1'] });
  const p2 = product('p2', { needsConcepts: ['m2', 'm3', 'm4'] });

  it('all은 배울 순서, required는 must만 앞에서 3개', () => {
    const cat = tinyCatalog({ concepts });
    expect(buildStudy(cat, [p1, p2])).toEqual({ all: ['m1', 'g1', 'm2', 'm3', 'm4'], required: ['m1', 'm2', 'm3'] });
  });

  it('필수 개수는 studyRequiredMax를 따른다', () => {
    const cat = tinyCatalog({ concepts, scoring: { studyRequiredMax: 1 } });
    expect(buildStudy(cat, [p1, p2]).required).toEqual(['m1']);
  });

  it('must가 적으면 있는 만큼만', () => {
    const cat = tinyCatalog({ concepts });
    expect(buildStudy(cat, [p1])).toEqual({ all: ['m1', 'g1', 'm4'], required: ['m1', 'm4'] });
  });

  it('개념이 없으면 둘 다 빈 목록', () => {
    expect(buildStudy(tinyCatalog(), [product('p')])).toEqual({ all: [], required: [] });
  });

  it('evaluate: 미룬 칸에만 쓰는 상품의 개념은 빠진다', () => {
    const cat = tinyCatalog({
      questions: [tagQuestion({})],
      rules: fiveSlotRules(),
      products: [
        product('scr', { needsConcepts: ['m2'] }),
        product('st', { capabilities: ['store'] }),
        product('nt', { capabilities: ['notify'], needsConcepts: ['g1'] }),
      ],
      concepts,
    });
    expect(run(cat, { cart: ['scr', 'st', 'nt'] }).study).toEqual({ all: ['m1', 'g1', 'm2'], required: ['m1', 'm2'] });
    expect(run(cat, { cart: ['scr', 'st', 'nt'], deferred: ['slot.notify'] }).study).toEqual({ all: ['m2'], required: ['m2'] });
  });
});

// ── 진행 순서 ─────────────────────────────────────────────

describe('buildSteps 진행 순서: 단계 고르기', () => {
  it('채운 칸만 칸 순서대로, 칸마다 그 칸을 채운 상품', () => {
    const cat = tinyCatalog();
    const host = product('hp', { capabilities: ['host'] });
    const scr = product('scr');
    const scr2 = product('scr2');
    const steps = buildSteps(cat, [SCREEN, STORE, DATA, HOST], [host, scr, scr2], [], [], []);
    expect(stepIds(steps)).toEqual(['slot.screen', 'slot.host']);
    expect(steps.map((s) => s.products)).toEqual([['scr', 'scr2'], ['hp']]);
    const tpl = cat.data.templates.slotSteps['slot.screen'];
    expect(steps[0]?.title).toBe(tpl?.title);
    expect(steps[0]?.doneWhen).toBe(tpl?.doneWhen);
    expect(steps.every((s) => s.concepts.length === 0)).toBe(true);
  });

  it('한 상품이 여러 칸을 채우면 칸마다 단계가 된다', () => {
    const supa = product('supa', { capabilities: ['store', 'auth'] });
    const steps = buildSteps(tinyCatalog(), [SCREEN, STORE, AUTH], [supa], [], [], []);
    expect(steps.map((s) => [s.slotId, s.products])).toEqual([
      ['slot.store', ['supa']],
      ['slot.auth', ['supa']],
    ]);
  });

  it('미룬 칸은 빼고, 그대로 둔 빈 칸은 상품 없이 넣는다', () => {
    const cart = [product('scr'), product('nt', { capabilities: ['notify'] })];
    const conflicts = [emptyConflict('slot.store', true), emptyConflict('slot.data', false)];
    const steps = buildSteps(tinyCatalog(), [SCREEN, STORE, DATA, NOTIFY], cart, conflicts, ['slot.notify'], []);
    expect(steps.map((s) => [s.slotId, s.products])).toEqual([
      ['slot.screen', ['scr']],
      ['slot.store', []],
    ]);
  });

  it('문장 틀이 없는 칸은 칸 이름을 제목으로, 완성 확인은 빈 문장', () => {
    const custom = slotOf('slot.custom', 'screen', 10, { label: '내 칸' });
    const steps = buildSteps(tinyCatalog(), [custom], [product('scr')], [], [], []);
    expect(steps).toEqual([{ slotId: 'slot.custom', title: '내 칸', doneWhen: '', products: ['scr'], concepts: [] }]);
  });
});

describe('buildSteps 진행 순서: 중간 서버 단계', () => {
  const keyed = product('kd', { capabilities: ['data'], keyExposureRisk: true });
  const workers = product('wk', { capabilities: ['host', 'proxy'] });
  const scr = product('scr');

  it('키 노출 위험 상품과 proxy 상품이 함께 있으면 위험 상품 단계 바로 앞에 넣는다', () => {
    const cat = tinyCatalog();
    const steps = buildSteps(cat, [SCREEN, DATA, HOST], [scr, keyed, workers], [], [], []);
    expect(stepIds(steps)).toEqual(['slot.screen', PROXY_STEP, 'slot.data', 'slot.host']);
    const proxy = steps[1];
    expect(proxy?.products).toEqual(['wk']);
    expect(proxy?.title).toBe(cat.data.templates.proxyStep.title);
    expect(proxy?.doneWhen).toBe(cat.data.templates.proxyStep.doneWhen);
    expect(PROXY_STEP).toBe('step.proxy');
  });

  it('위험 상품이 처음 나오는 칸을 기준으로 한다', () => {
    const plainData = product('pd', { capabilities: ['data'] });
    const keyedNotify = product('kn', { capabilities: ['notify'], keyExposureRisk: true });
    const steps = buildSteps(tinyCatalog(), [SCREEN, DATA, NOTIFY, HOST], [scr, plainData, keyedNotify, workers], [], [], []);
    expect(stepIds(steps)).toEqual(['slot.screen', 'slot.data', PROXY_STEP, 'slot.notify', 'slot.host']);
  });

  it('proxy 상품이 여럿이면 모두 쓰는 도구로 적는다', () => {
    const apps = product('gas', { capabilities: ['store', 'host', 'proxy'] });
    const steps = buildSteps(tinyCatalog(), [SCREEN, DATA, HOST], [scr, workers, keyed, apps], [], [], []);
    expect(steps.find((s) => s.slotId === PROXY_STEP)?.products).toEqual(['wk', 'gas']);
  });

  it('proxy 상품이 없거나, 키 노출 위험 상품이 없으면 넣지 않는다', () => {
    const host = product('hp', { capabilities: ['host'] });
    expect(stepIds(buildSteps(tinyCatalog(), [SCREEN, DATA, HOST], [scr, keyed, host], [], [], []))).toEqual([
      'slot.screen',
      'slot.data',
      'slot.host',
    ]);
    const plainData = product('pd', { capabilities: ['data'] });
    expect(stepIds(buildSteps(tinyCatalog(), [SCREEN, DATA, HOST], [scr, plainData, workers], [], [], []))).toEqual([
      'slot.screen',
      'slot.data',
      'slot.host',
    ]);
  });

  it('키 노출 위험 상품이 미룬 칸에만 쓰이면 넣지 않는다', () => {
    const keyedNotify = product('kn', { capabilities: ['notify'], keyExposureRisk: true });
    const steps = buildSteps(tinyCatalog(), [SCREEN, NOTIFY, HOST], [scr, keyedNotify, workers], [], ['slot.notify'], []);
    expect(stepIds(steps)).toEqual(['slot.screen', 'slot.host']);
  });
});

describe('buildSteps 진행 순서: 개념 붙이기', () => {
  const concepts = [
    concept('api', { order: 10 }),
    concept('json', { order: 15, level: 'good', prerequisites: ['api'] }),
    concept('key', { order: 20, prerequisites: ['api'] }),
    concept('env', { order: 30, stepHint: 'proxy', prerequisites: ['key'] }),
    concept('term', { order: 35 }),
    concept('deploy', { order: 40, stepHint: 'host' }),
  ];
  /** 1차 상품으로 공부할 것을 만들고 그 순서로 단계를 만든다 (evaluate와 같은 연결) */
  function steps(cat: Catalog, slots: Slot[], cart: Product[], deferred: string[] = []): [string, string[]][] {
    const order = buildStudy(cat, cart).all;
    return buildSteps(cat, slots, cart, [], deferred, order).map((s) => [s.slotId, s.concepts]);
  }

  it('상품이 처음 나오는 단계에 선수 개념과 함께, 배울 순서로 붙인다', () => {
    const cat = tinyCatalog({ concepts });
    const st = product('st', { capabilities: ['store'], needsConcepts: ['key', 'json'] });
    expect(steps(cat, [SCREEN, STORE], [product('scr'), st])).toEqual([
      ['slot.screen', []],
      ['slot.store', ['api', 'json', 'key']],
    ]);
  });

  it('앞 단계에 붙은 개념은 다시 붙이지 않는다', () => {
    const cat = tinyCatalog({ concepts });
    const scr = product('scr', { needsConcepts: ['api'] });
    const st = product('st', { capabilities: ['store'], needsConcepts: ['key', 'api'] });
    expect(steps(cat, [SCREEN, STORE], [scr, st])).toEqual([
      ['slot.screen', ['api']],
      ['slot.store', ['key']],
    ]);
  });

  it('stepHint 기능의 칸도 맡으면 그 칸 단계에 붙인다', () => {
    const cat = tinyCatalog({ concepts });
    const gas = product('gas', { capabilities: ['store', 'host'], needsConcepts: ['deploy', 'term'] });
    expect(steps(cat, [SCREEN, STORE, HOST], [product('scr'), gas])).toEqual([
      ['slot.screen', []],
      ['slot.store', ['term']],
      ['slot.host', ['deploy']],
    ]);
  });

  it('stepHint 기능의 칸을 맡지 않으면 처음 나오는 단계에 붙인다', () => {
    const cat = tinyCatalog({ concepts });
    const scr = product('scr', { needsConcepts: ['deploy'] });
    const host = product('hp', { capabilities: ['host'] });
    expect(steps(cat, [SCREEN, HOST], [scr, host])).toEqual([
      ['slot.screen', ['deploy']],
      ['slot.host', []],
    ]);
  });

  it('stepHint가 proxy면 중간 서버 단계에, 남은 개념은 데이터 단계에', () => {
    const cat = tinyCatalog({ concepts });
    const kd = product('kd', { capabilities: ['data'], keyExposureRisk: true, needsConcepts: ['api', 'key', 'env', 'json'] });
    const wk = product('wk', { capabilities: ['host', 'proxy'], needsConcepts: ['deploy'] });
    expect(steps(cat, [SCREEN, DATA, HOST], [product('scr'), kd, wk])).toEqual([
      ['slot.screen', []],
      [PROXY_STEP, ['api', 'key', 'env']],
      ['slot.data', ['json']],
      ['slot.host', ['deploy']],
    ]);
  });

  it('중간 서버 단계가 없으면 stepHint proxy 개념도 처음 나오는 단계에', () => {
    const cat = tinyCatalog({ concepts });
    const kd = product('kd', { capabilities: ['data'], keyExposureRisk: true, needsConcepts: ['env', 'json'] });
    expect(steps(cat, [SCREEN, DATA], [product('scr'), kd])).toEqual([
      ['slot.screen', []],
      ['slot.data', ['api', 'json', 'key', 'env']],
    ]);
  });

  it('미룬 칸의 상품은 단계도 개념도 없다', () => {
    const cat = tinyCatalog({ concepts });
    const nt = product('nt', { capabilities: ['notify'], needsConcepts: ['key'] });
    expect(steps(cat, [SCREEN, NOTIFY], [product('scr', { needsConcepts: ['api'] }), nt], ['slot.notify'])).toEqual([
      ['slot.screen', ['api']],
    ]);
  });

  it('evaluate: 진짜 자료(날씨 현황판 레시피)의 단계와 개념', () => {
    const cat = realCatalog();
    const recipe = cat.data.recipes.recipes.find((x) => x.id === 'weather-board');
    expect(recipe).toBeDefined();
    const r = evaluate(cat, { answers: recipe?.answers ?? {}, cart: recipe?.cart ?? [], kept: recipe?.kept ?? [] });
    expect(r.steps.map((s) => [s.slotId, s.products, s.concepts])).toEqual([
      ['slot.screen', ['react-vite'], ['terminal']],
      [PROXY_STEP, ['cloudflare-workers'], ['api', 'api-key', 'env-var']],
      ['slot.data', ['kma-forecast'], ['json']],
      ['slot.host', ['cloudflare-workers'], ['deploy']],
    ]);
    // 단계에 붙은 개념은 공부할 것과 같은 것들이고, 두 번 붙지 않는다
    const attached = r.steps.flatMap((s) => s.concepts);
    expect(new Set(attached).size).toBe(attached.length);
    expect([...attached].sort()).toEqual([...r.study.all].sort());
  });
});

// ── 예상 시간 ─────────────────────────────────────────────

describe('estimateMinutes 예상 시간', () => {
  const cat = tinyCatalog();

  it('기본 30분 + 상품 준비 시간의 합', () => {
    expect(estimateMinutes(cat, [product('a', { setupMinutes: 15 }), product('b', { setupMinutes: 45 })])).toBe(90);
  });

  it('준비 시간이 없는 상품은 60분으로 친다', () => {
    expect(estimateMinutes(cat, [product('a', { setupMinutes: 20 }), product('b')])).toBe(110);
    expect(estimateMinutes(cat, [product('a', { setupMinutes: 0 })])).toBe(30);
  });

  it('상품이 없으면 기본 시간만', () => {
    expect(estimateMinutes(cat, [])).toBe(30);
  });

  it('점수표의 baseMinutes·unknownSetupMinutes를 따른다', () => {
    const custom = tinyCatalog({ scoring: { baseMinutes: 10, unknownSetupMinutes: 5 } });
    expect(estimateMinutes(custom, [product('a'), product('b', { setupMinutes: 7 })])).toBe(22);
  });

  it('반올림하지 않은 분을 내고, 반올림은 영수증 표시에서 한다', () => {
    expect(estimateMinutes(cat, [product('a', { setupMinutes: 13 })])).toBe(43);
  });

  it('표시 반올림 경계: 55분 미만은 10분 단위, 그 위는 30분 단위', () => {
    const f = cat.data.templates.receipt.timeFormat;
    const shown = (setup: number): string => formatMinutes(estimateMinutes(cat, [product('a', { setupMinutes: setup })]), f);
    expect(shown(0)).toBe('약 30분');
    expect(shown(14)).toBe('약 40분'); // 44
    expect(shown(15)).toBe('약 50분'); // 45
    expect(shown(24)).toBe('약 50분'); // 54
    expect(shown(25)).toBe('약 1시간'); // 55
    expect(shown(44)).toBe('약 1시간'); // 74
    expect(shown(45)).toBe('약 1시간 30분'); // 75
    expect(shown(74)).toBe('약 1시간 30분'); // 104
    expect(shown(75)).toBe('약 2시간'); // 105
    expect(shown(105)).toBe('약 2시간 30분'); // 135
  });

  it('evaluate: 1차 상품만 센다 (칸 밖 상품은 넣고, 미룬 칸에만 쓰는 상품은 뺀다)', () => {
    const tiny = tinyCatalog({
      questions: [tagQuestion({})],
      rules: fiveSlotRules(),
      products: [
        product('scr', { setupMinutes: 10 }),
        product('st', { capabilities: ['store'], setupMinutes: 20 }),
        product('nt', { capabilities: ['notify'], setupMinutes: 40 }),
        product('px', { capabilities: ['proxy'] }),
      ],
    });
    // 30 + 10 + 20 + 40 + 60
    expect(run(tiny, { cart: ['scr', 'st', 'nt', 'px'] }).minutes).toBe(160);
    // 알림을 미루면 nt(40분)가 빠진다
    expect(run(tiny, { cart: ['scr', 'st', 'nt', 'px'], deferred: ['slot.notify'] }).minutes).toBe(120);
  });
});

// ── 만들지 않을 것 ─────────────────────────────────────────────

describe('collectNotBuild 만들지 않을 것', () => {
  function catWith(rules: Data['templates']['notBuildRules'], parts: Parameters<typeof tinyData>[0] = {}): Catalog {
    const d = tinyData(parts);
    d.templates.notBuildRules = rules;
    return makeCatalog(d);
  }
  const RULES: Data['templates']['notBuildRules'] = [
    { when: { not: { tag: 'need.login', gte: 1 } }, text: '로그인' },
    { when: { always: true }, text: '관리자 화면' },
    { when: { tag: 'type.quiz', gte: 1 }, text: '순위표' },
    { when: { always: true }, text: '로그인' },
  ];

  it('조건이 맞는 문장을 적힌 순서로, 같은 문장은 하나만', () => {
    const cat = catWith(RULES);
    expect(collectNotBuild(cat, ctxOf({ tags: { 'type.quiz': 1 } }))).toEqual(['로그인', '관리자 화면', '순위표']);
    expect(collectNotBuild(cat, ctxOf({ tags: { 'need.login': 1 } }))).toEqual(['관리자 화면', '로그인']);
  });

  it('규칙이 없으면 빈 목록', () => {
    expect(collectNotBuild(tinyCatalog(), ctxOf())).toEqual([]);
  });

  it('evaluate: 답의 태그와 미룬 칸을 본다', () => {
    const cat = catWith(
      [
        { when: { deferred: 'slot.notify' }, text: '알림 (2차에)' },
        { when: { tag: 'type.quiz', gte: 1 }, text: '순위표' },
      ],
      { questions: [tagQuestion({ 'type.quiz': 1 })], rules: fiveSlotRules(), products: [product('scr'), product('st', { capabilities: ['store'] })] },
    );
    expect(run(cat, { cart: ['scr', 'st'], deferred: ['slot.notify'] }).notBuild).toEqual(['알림 (2차에)', '순위표']);
    expect(run(cat, { cart: ['scr', 'st'] }).notBuild).toEqual(['순위표']);
  });
});
