// 엔진 시험 빈틈 메우기 (T04). 다른 엔진 시험이 닿지 않던 갈래와, 명세에는 있지만 아무 시험도 고정하지 않던 동작.
// 기대값은 docs/ENGINE.md, data/scoring.json(phaseSplitDifficulty 6, recommendThreshold 3, baseMinutes 30),
// data/templates.json으로 손으로 계산했다.
import { describe, expect, it } from 'vitest';
import {
  conversationCards,
  evaluate,
  fill,
  matchingRecipes,
  receiptModel,
  renderPack,
  renderReceiptText,
  runInterview,
} from '../../src/lib/engine/index.ts';
import { topoSort } from '../../src/lib/engine/checkout.ts';
import type { Question, Recipe, SlotRule } from '../../src/lib/engine/types.ts';
import type { Golden } from '../../scripts/lib/golden.ts';
import { goldenSession } from '../../scripts/lib/golden.ts';
import { goldenFiles, readJson } from '../../scripts/lib/load-data.ts';
import { concept, option, product, question, realCatalog, slotRule, tinyCatalog } from '../fixtures/tiny.ts';

// ── 도우미 ─────────────────────────────────────────────

const SITE = 'https://cc.test';
const ISSUED = '2026-10-12 14:05';
const OPTS = { siteUrl: SITE, issuedAt: ISSUED };

const REAL = realCatalog();
const T = REAL.data.templates;
const P = T.pack;
const L = P.labels;
const H = P.headings;

function must<V>(v: V | undefined, what: string): V {
  if (v === undefined) throw new Error(`없음: ${what}`);
  return v;
}

/** 꾸러미에서 두 제목 사이의 줄 (빈 줄 뺌) */
function section(md: string, from: string, to: string): string[] {
  const lines = md.split('\n');
  const a = lines.indexOf(`## ${from}`);
  const b = lines.indexOf(`## ${to}`);
  if (a < 0 || b < a) throw new Error(`구역 없음: ${from} → ${to}`);
  return lines.slice(a + 1, b).filter((l) => l !== '');
}

/** 답 하나로 태그를 한꺼번에 주는 질문 */
function tagQuestion(tags: Record<string, number>): Question {
  return question('q.tags', [option('o', tags)]);
}
const ANSWERED = { 'q.tags': 'o' };

function recipe(id: string, answers: Record<string, string>): Recipe {
  return { id, title: `레시피 ${id}`, summary: `${id} 요약`, forWho: '누구나', answers, cart: [] };
}

function goldenCase(id: string): Golden {
  const file = goldenFiles().find((f) => f.endsWith(`${id}.json`));
  return readJson<Golden>(must(file, id));
}

// 진짜 자료와 같은 칸 id·이름 (문장 틀 slotSteps가 붙는다)
const SCREEN: SlotRule = slotRule('slot-rule.screen', { id: 'slot.screen', label: '화면', capability: 'screen', required: true, order: 10, mustFill: true });
const STORE: SlotRule = slotRule('slot-rule.store', { id: 'slot.store', label: '저장', capability: 'store', required: true, order: 20 });
const DATA: SlotRule = slotRule('slot-rule.data', { id: 'slot.data', label: '외부 데이터', capability: 'data', required: true, order: 40 });
const NOTIFY: SlotRule = slotRule('slot-rule.notify', { id: 'slot.notify', label: '알림', capability: 'notify', order: 45, deferrable: true });
// 문장 틀이 없는 칸
const EXTRA: SlotRule = slotRule('slot-rule.extra', { id: 'slot.extra', label: '덤 칸', capability: 'auth', order: 60 });

const RECORD = must(T.types['type.record'], 'type.record');
const RECORD_SCREENS = RECORD.screens.map((s, i) => `${i + 1}. **${s.name}**: ${s.parts.join(', ')}`);
const RECORD_FEATURES = RECORD.features.map((f) => `- ${f.name}`);

// ── 공부할 것 줄 세우기 ─────────────────────────────────────────────

describe('topoSort: 같은 order는 id 순 (들어온 순서와 무관)', () => {
  // 비교 함수의 양쪽(앞이 작을 때·클 때)을 모두 지나게, 이미 줄 선 입력과 뒤섞인 입력을 함께 본다
  const cat = tinyCatalog({
    concepts: [concept('c.a'), concept('c.b'), concept('c.c'), concept('c.d'), concept('c.first', { order: 5 })],
  });
  const want = ['c.first', 'c.a', 'c.b', 'c.c', 'c.d'];

  it('이미 id 순으로 들어와도 그대로', () => {
    expect(topoSort(cat, new Set(['c.a', 'c.b', 'c.c', 'c.d', 'c.first']))).toEqual(want);
  });

  it('뒤섞여 들어와도 같은 줄', () => {
    expect(topoSort(cat, new Set(['c.d', 'c.b', 'c.first', 'c.c', 'c.a']))).toEqual(want);
    expect(topoSort(cat, new Set(['c.first', 'c.d', 'c.c', 'c.b', 'c.a']))).toEqual(want);
  });
});

// ── 레시피 미리 보기 ─────────────────────────────────────────────

describe('matchingRecipes: 같은 답이 하나도 없는 레시피', () => {
  const qa = question('qa', [option('x'), option('y')]);
  const qb = question('qb', [option('y'), option('n')]);
  const cat = tinyCatalog({
    questions: [qa, qb],
    recipes: [recipe('r.blank', { qb: 'y' }), recipe('r.one', { qa: 'x' }), recipe('r.two', { qa: 'x', qb: 'y' })],
  });

  it('앞에 적혀 있어도 같은 답이 있는 레시피에 자리를 내준다', () => {
    // 답 qa:x → r.one 1개, r.two 1개 같음, r.blank는 0개
    expect(matchingRecipes(cat, runInterview(cat, { qa: 'x' }))).toEqual(['r.one', 'r.two']);
  });

  it('같은 답이 생기면 다시 나온다 (같은 수면 레시피 순서)', () => {
    // 답 qa:x, qb:y → r.two 2개, r.blank 1개, r.one 1개
    expect(matchingRecipes(cat, runInterview(cat, { qa: 'x', qb: 'y' }), 3)).toEqual(['r.two', 'r.blank', 'r.one']);
  });
});

describe("matchingRecipes: '모르겠어요'는 어긋남으로 세지 않는다", () => {
  const qa = question('qa', [option('x'), option('y')]);
  const qc = question('qc', [option('f', { 'topic.f': 1 }), option('unknown', { 'topic.f': 1 }, { isUnknown: true })]);
  const cat = tinyCatalog({ questions: [qa, qc], recipes: [recipe('r.w', { qa: 'x', qc: 'f' })] });

  it("레시피가 고른 보기 대신 '모르겠어요'를 골라도 미리 보기에 남는다 (같은 답으로도 세지 않는다)", () => {
    expect(matchingRecipes(cat, runInterview(cat, { qa: 'x', qc: 'unknown' }))).toEqual(['r.w']);
    expect(matchingRecipes(cat, runInterview(cat, { qc: 'unknown' }))).toEqual([]);
  });
});

// ── 순수성 ─────────────────────────────────────────────

describe('같은 자료·같은 상태면 같은 결과, 자료는 그대로', () => {
  it('같은 칸 규칙을 합쳐도 규칙의 required를 바꾸지 않는다', () => {
    // 앞 계산에서 합친 required: true가 규칙에 새면, 다음 계산에서 열리지 않은 규칙의 required가 남는다
    const cat = tinyCatalog({
      questions: [question('q.need', [option('yes', { 'need.host': 1 }), option('no')])],
      rules: [
        slotRule('r.host-opt', { id: 'slot.host', capability: 'host', required: false, order: 50 }),
        slotRule('r.host-need', { id: 'slot.host', capability: 'host', required: true, order: 50 }, { tag: 'need.host', gte: 1 }),
      ],
    });
    const yes = evaluate(cat, { answers: { 'q.need': 'yes' } });
    expect(yes.slots.map((s) => [s.slot.id, s.slot.required, s.slot.ruleIds])).toEqual([['slot.host', true, ['r.host-opt', 'r.host-need']]]);
    expect(yes.conflicts.map((c) => c.id)).toEqual(['conflict.empty-slot:slot.host']);

    const no = evaluate(cat, { answers: { 'q.need': 'no' } });
    expect(no.slots.map((s) => [s.slot.id, s.slot.required, s.slot.ruleIds])).toEqual([['slot.host', false, ['r.host-opt']]]);
    expect(no.conflicts).toEqual([]);
    expect(cat.data.rules.rules.map((r) => (r.type === 'slot' ? r.slot.required : null))).toEqual([false, true]);
  });

  it('골든 사례 모두: 다시 돌려도 같고, 그려도 결과와 자료가 바뀌지 않는다', () => {
    const cat = realCatalog();
    const data = structuredClone(cat.data);
    const files = goldenFiles().filter((f) => /case-\d+\.json$/.test(f));
    expect(files.length).toBeGreaterThanOrEqual(16);
    for (const f of files) {
      const g = readJson<Golden>(f);
      const r = evaluate(cat, goldenSession(g));
      const snap = structuredClone(r);
      const md = renderPack(cat, r, OPTS);
      const text = renderReceiptText(receiptModel(cat, r, ISSUED));
      const cards = conversationCards(cat, r);
      // 그리는 함수가 결과를 고치지 않는다 (정렬·push로 r.steps 등을 건드리지 않는다)
      expect(r, g.id).toEqual(snap);
      const again = evaluate(cat, goldenSession(g));
      expect(again, g.id).toEqual(r);
      expect(renderPack(cat, again, OPTS), g.id).toBe(md);
      expect(renderReceiptText(receiptModel(cat, again, ISSUED)), g.id).toBe(text);
      expect(conversationCards(cat, again), g.id).toEqual(cards);
    }
    // 안전 기본 지시처럼 자료의 배열을 복사해 쓰는 곳이 원본에 덧붙이지 않는다
    expect(cat.data).toEqual(data);
  });
});

// ── 꾸러미: 작은 자료 ─────────────────────────────────────────────

describe('renderPack 1번: 쓰는 사람 문장 틀이 없는 태그', () => {
  function pack(audience: string): string[] {
    const cat = tinyCatalog({ questions: [tagQuestion({ 'type.record': 1, [audience]: 1 })], rules: [SCREEN], products: [product('p.screen')] });
    const md = renderPack(cat, evaluate(cat, { answers: ANSWERED, cart: ['p.screen'] }), OPTS);
    expect(md).not.toContain('undefined');
    return section(md, H.what, H.scope);
  }
  const chips = `- ${L.answers}: 질문 q.tags: 보기 o`;
  const ai = `- ${L.ai}: ${must(T.aiTools['ai.chat-free'], 'ai.chat-free').label}`;

  it('아는 태그면 유형과 AI 사이에 쓰는 사람 줄', () => {
    expect(pack('audience.me')).toEqual([
      `- ${L.oneLine}: ${RECORD.goal}`,
      `- ${L.kind}: ${RECORD.label}`,
      `- ${L.audience}: ${must(T.audiences['audience.me'], 'audience.me')}`,
      ai,
      chips,
    ]);
  });

  it('문장 틀이 없으면 빈 줄을 쓰지 않고 그 줄만 뺀다', () => {
    expect(pack('audience.robot')).toEqual([`- ${L.oneLine}: ${RECORD.goal}`, `- ${L.kind}: ${RECORD.label}`, ai, chips]);
  });
});

describe('renderPack 2·10번: 도구 없는 단계와 문장 틀 없는 단계', () => {
  // 화면(채움) · 저장(필수, 비운 채 조사로 넘김) · 덤 칸(문장 틀 없음, 채움)
  const cat = tinyCatalog({
    questions: [tagQuestion({ 'type.record': 1 })],
    rules: [SCREEN, STORE, EXTRA],
    products: [product('p.screen', { name: '화면 상품' }), product('p.extra', { name: '덤 상품', capabilities: ['auth'] })],
  });
  const r = evaluate(cat, { answers: ANSWERED, cart: ['p.screen', 'p.extra'], kept: ['conflict.empty-slot:slot.store'] });
  const md = renderPack(cat, r, OPTS);
  const screenStep = must(T.slotSteps['slot.screen'], 'slot.screen');
  const storeStep = must(T.slotSteps['slot.store'], 'slot.store');

  it('단계: 화면, 비운 저장, 덤 칸 (칸 순서)', () => {
    expect(r.canIssue).toBe(true);
    expect(r.steps.map((s) => [s.slotId, s.title, s.doneWhen, s.products])).toEqual([
      ['slot.screen', screenStep.title, screenStep.doneWhen, ['p.screen']],
      ['slot.store', storeStep.title, storeStep.doneWhen, []],
      ['slot.extra', '덤 칸', '', ['p.extra']],
    ]);
  });

  it('10번: 도구가 없으면 noToolStep, 완성 확인이 비면 확인 줄이 없다', () => {
    expect(section(md, H.steps, H.safety)).toEqual([
      P.stepRule,
      `1. **${screenStep.title}**: 화면 상품`,
      `   - ${L.check}: ${screenStep.doneWhen}`,
      `2. **${storeStep.title}**: ${P.noToolStep}`,
      `   - ${L.check}: ${storeStep.doneWhen}`,
      '3. **덤 칸**: 덤 상품',
    ]);
  });

  it('2번: 화면 단계는 빼고, 도구가 없는 단계는 이름만', () => {
    expect(section(md, H.scope, H.screens)).toEqual([
      P.scopeRule,
      `### ${L.firstPhase}`,
      ...RECORD_FEATURES,
      `- ${storeStep.title}`,
      '- 덤 칸: 덤 상품',
      `### ${L.notBuild}`,
    ]);
  });

  it('3번: 화면이 더해지지 않는 칸이면 유형의 화면만', () => {
    expect(section(md, H.screens, H.features)).toEqual(RECORD_SCREENS);
  });
});

describe('renderPack 5번: 외부 데이터 칸을 조사로 넘기면', () => {
  const cat = tinyCatalog({
    questions: [tagQuestion({ 'type.record': 1 })],
    rules: [SCREEN, DATA],
    products: [product('p.screen'), product('p.api', { name: '날씨 API', capabilities: ['data'] })],
  });

  it('단계는 남지만 쓸 도구가 없어 외부 데이터 줄 대신 없음', () => {
    const r = evaluate(cat, { answers: ANSWERED, cart: ['p.screen'], kept: ['conflict.empty-slot:slot.data'] });
    expect(r.steps.map((s) => [s.slotId, s.products])).toEqual([
      ['slot.screen', ['p.screen']],
      ['slot.data', []],
    ]);
    expect(section(renderPack(cat, r, OPTS), H.data, H.design)).toEqual([`- ${P.dataLines.none}`]);
  });

  it('데이터 상품을 담으면 그 이름으로 외부 데이터 줄', () => {
    const r = evaluate(cat, { answers: ANSWERED, cart: ['p.screen', 'p.api'] });
    expect(section(renderPack(cat, r, OPTS), H.data, H.design)).toEqual([`- ${fill(P.dataLines.external, { names: '날씨 API' })}`]);
  });
});

describe('renderPack 2·3번: 2차로 미룬 칸', () => {
  const cat = tinyCatalog({
    questions: [tagQuestion({ 'type.record': 1 })],
    rules: [SCREEN, NOTIFY],
    products: [product('p.screen'), product('p.bell', { name: '알림 상품', capabilities: ['notify'] })],
  });
  const notifyStep = must(T.slotSteps['slot.notify'], 'slot.notify');
  const notifyScreen = must(notifyStep.screen, 'slot.notify screen');
  const now = renderPack(cat, evaluate(cat, { answers: ANSWERED, cart: ['p.screen', 'p.bell'] }), OPTS);
  const later = renderPack(cat, evaluate(cat, { answers: ANSWERED, cart: ['p.screen', 'p.bell'], deferred: ['slot.notify'] }), OPTS);

  it('3번: 알림 칸의 화면은 1차일 때만 화면 목록 끝에 붙는다', () => {
    expect(section(now, H.screens, H.features)).toEqual([
      ...RECORD_SCREENS,
      `${RECORD.screens.length + 1}. **${notifyScreen.name}**: ${notifyScreen.parts.join(', ')}`,
    ]);
    expect(section(later, H.screens, H.features)).toEqual(RECORD_SCREENS);
  });

  it('2번: 1차 목록에서 빠지고 미룬 것에 칸 이름으로', () => {
    expect(section(now, H.scope, H.screens)).toEqual([
      P.scopeRule,
      `### ${L.firstPhase}`,
      ...RECORD_FEATURES,
      `- ${notifyStep.title}: 알림 상품`,
      `### ${L.notBuild}`,
    ]);
    expect(section(later, H.scope, H.screens)).toEqual([
      P.scopeRule,
      `### ${L.firstPhase}`,
      ...RECORD_FEATURES,
      `### ${L.notBuild}`,
      `### ${L.deferred}`,
      `- 알림: ${P.deferredNote}`,
    ]);
  });
});

// ── 진짜 자료: Supabase가 맡은 로그인을 2차로 미루기 (골든 사례에 없는 길) ─────────────────

describe('진짜 자료: case-04에서 로그인을 2차로 미루면', () => {
  // case-04: react-vite(난이도 2, 40분) + supabase(저장·로그인, 3, 60분) + cloudflare-workers(배포·proxy, 2, 40분)
  const g = goldenCase('case-04');
  const base = evaluate(REAL, goldenSession(g));
  const later = evaluate(REAL, { ...goldenSession(g), deferred: ['slot.auth'] });

  it('바탕: 나누기 제안이 로그인 칸을 미루라고 한다', () => {
    expect(base.split).toEqual({ difficulty: 7, difficultyFirst: 7, needed: true, defer: ['slot.auth'], easier: [] });
  });

  it('Supabase가 저장도 맡아 1차 난이도·시간·공부할 것·충돌은 그대로', () => {
    expect(later.session.deferred).toEqual(['slot.auth']);
    expect(later.split.difficultyFirst).toBe(7); // 2 + 3 + 2
    expect(later.minutes).toBe(170); // 30 + 40 + 60 + 40
    expect(later.study).toEqual({
      required: ['api', 'api-key', 'env-var'],
      all: ['api', 'api-key', 'env-var', 'terminal', 'deploy', 'auth-login'],
    });
    expect(later.conflicts.map((c) => c.id)).toEqual(['conflict.personal-server']);
    expect(later.canIssue).toBe(false);
  });

  it('제안은 남고, 미룰 칸 대신 저장 칸의 더 쉬운 상품을 알려 준다', () => {
    // supabase가 이제 미루지 않은 칸 중 저장 하나만 맡는다. 저장 진열에서 난이도가 3보다 낮고 기준 3 이상인 첫 상품은
    // airtable: 코딩 에이전트 2 + 무료 2 + 공식 1 + 키 −1 = 4, 난이도 2 (C02에서 더함. 그 전에는 google-sheets-apps-script 3점)
    expect(later.split).toEqual({
      difficulty: 7,
      difficultyFirst: 7,
      needed: true,
      defer: [],
      easier: [{ slotId: 'slot.store', from: 'supabase', to: 'airtable' }],
    });
  });

  it('로그인 단계가 빠지고, 로그인 개념은 Supabase가 처음 나오는 저장 단계로', () => {
    // 키 노출 위험 상품이 없어 중간 서버 단계는 없다. env-var(stepHint proxy)도 처음 나오는 단계로 간다
    expect(base.steps.map((s) => [s.slotId, s.products, s.concepts])).toEqual([
      ['slot.screen', ['react-vite'], ['terminal']],
      ['slot.store', ['supabase'], ['api', 'api-key', 'env-var']],
      ['slot.auth', ['supabase'], ['auth-login']],
      ['slot.host', ['cloudflare-workers'], ['deploy']],
    ]);
    expect(later.steps.map((s) => [s.slotId, s.products, s.concepts])).toEqual([
      ['slot.screen', ['react-vite'], ['terminal']],
      ['slot.store', ['supabase'], ['api', 'api-key', 'env-var', 'auth-login']],
      ['slot.host', ['cloudflare-workers'], ['deploy']],
    ]);
  });

  it('영수증: Supabase는 1차 품목이고 칸 이름은 저장 외 1칸', () => {
    // '저장, 로그인'은 4 + 2 + 6 = 12칸이라 11칸을 넘는다
    const m = receiptModel(REAL, later, ISSUED);
    expect(m.items.map((i) => [i.productId, i.slot, i.later])).toEqual([
      ['react-vite', '화면', false],
      ['supabase', '저장 외 1칸', false],
      ['cloudflare-workers', '배포·공유', false],
    ]);
    expect(m.difficultyText).toBe(`7 ${T.receipt.levels.hard}`);
  });

  it('꾸러미: 로그인 화면이 빠지고, 미룬 것에 로그인, 7번 표에 (2차) 없음', () => {
    const authScreen = must(must(T.slotSteps['slot.auth'], 'slot.auth').screen, 'slot.auth screen');
    const line = `**${authScreen.name}**: ${authScreen.parts.join(', ')}`;
    const baseMd = renderPack(REAL, base, OPTS);
    const laterMd = renderPack(REAL, later, OPTS);
    expect(section(baseMd, H.screens, H.features).some((l) => l.endsWith(line))).toBe(true);
    expect(section(laterMd, H.screens, H.features).some((l) => l.includes(authScreen.name))).toBe(false);
    expect(section(laterMd, H.scope, H.screens).slice(-2)).toEqual([`### ${L.deferred}`, `- 로그인: ${P.deferredNote}`]);
    const supaRow = section(laterMd, H.tools, H.prep).find((l) => l.includes('[Supabase]'));
    expect(supaRow?.startsWith('| 저장, 로그인 | [Supabase](')).toBe(true);
    expect(laterMd).not.toContain(T.receipt.later);
  });
});
