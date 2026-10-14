// 직접 쓴 답과 도구 (T36, docs/review/v3/brief.md 7.4~7.6절, input.md 7·8절, 11.4절).
// 엔진은 이용자가 확정한 answers·notes·customTools·gaps만 본다. 낱말 찾기 결과는 들어오지 않는다.
import { describe, expect, it } from 'vitest';
import type { Catalog, EngineResult, Session } from '../../src/lib/engine/index.ts';
import {
  answerChips,
  evaluate,
  fromShareState,
  matchProduct,
  matchingRecipes,
  normalizeSession,
  projectName,
  receiptModel,
  renderPack,
  renderReceiptText,
  runInterview,
  toShareState,
} from '../../src/lib/engine/index.ts';
import { productField } from '../../src/lib/engine/conditions.ts';
import { customProduct, isCustomId, productOf } from '../../src/lib/engine/custom.ts';
import { displayWidth, fill } from '../../src/lib/engine/text.ts';
import type { CustomTool, ProductField } from '../../src/lib/engine/types.ts';
import { realCatalog } from '../fixtures/tiny.ts';

const cat: Catalog = realCatalog();
const T = cat.data.templates;
const PACK = { siteUrl: 'https://cc.test', issuedAt: '2026-10-14 10:00' };

/** 넘긴 답을 쓰고, 나머지 보이는 질문은 첫 보기로 끝까지 답한다 ('쓰는 AI'는 건너뛴다) */
function finish(answers: Record<string, string>): Record<string, string> {
  const out = { ...answers };
  for (let i = 0; i < 40; i += 1) {
    const st = runInterview(cat, out);
    if (!st.next) return out;
    if (st.next.optional === true) {
      out[st.next.id] = 'unknown';
      continue;
    }
    out[st.next.id] = st.next.options[0]?.id ?? '';
  }
  throw new Error('질문이 끝나지 않습니다');
}

const PAGE = finish({ 'q.type': 'page', 'q.audience': 'anyone', 'q.ai': 'chat-free', 'q.save': 'no', 'q.domain': 'custom', 'q.realtime': 'daily', 'q.budget': 'free-only', 'q.payment': 'no' });
const POKE: CustomTool = { id: 'custom-1', name: 'PokeAPI', capability: 'data' };

function run(s: Partial<Session>): EngineResult {
  return evaluate(cat, { cart: [], kept: [], deferred: [], answers: {}, ...s });
}

// ── 직접 쓴 도구 한 개 ──────────────────────────────────────

describe('customProduct', () => {
  const p = customProduct(cat, POKE);

  it("'모름' 도구: 점수·추천 없는 색인 층, 서버 위치 모름, 난이도는 unknownDifficulty", () => {
    expect(p).toMatchObject({
      id: 'custom-1',
      name: 'PokeAPI',
      custom: true,
      layer: 'index',
      capabilities: ['data'],
      serverRegion: 'unknown',
      recommendable: false,
      provider: { type: 'generic', name: T.customTool.provider },
      difficulty: cat.data.scoring.unknownDifficulty,
      links: [],
      needsReview: true,
    });
    expect(p.setupMinutes).toBeUndefined();
  });

  it('이름이 없으면(링크로 받음) templates.customTool.hiddenName', () => {
    expect(customProduct(cat, { ...POKE, name: '' }).name).toBe(T.customTool.hiddenName);
  });

  it('규칙 조건에서 모르는 사실은 값이 없다 (서버 위치만 모름)', () => {
    const none: ProductField[] = ['provider.type', 'access', 'realtime', 'cost.free', 'keyExposureRisk', 'publicKey'];
    for (const f of none) expect(productField(p, f), f).toBeUndefined();
    expect(productField(p, 'serverRegion')).toBe('unknown');
    expect(productField(p, 'layer')).toBe('index');
    expect(productField(p, 'recommendable')).toBe(false);
    expect(productField(p, 'custom')).toBe(true);
    expect(matchProduct(p, { field: 'cost.free', is: false })).toBe(false);
    expect(matchProduct(p, { field: 'keyExposureRisk', in: [true, false] })).toBe(false);
    expect(matchProduct(p, { capability: 'data', field: 'serverRegion', in: ['unknown'] })).toBe(true);
  });

  it('id 모양은 custom-1 ~ custom-5', () => {
    expect(['custom-1', 'custom-5'].every(isCustomId)).toBe(true);
    expect(['custom-0', 'custom-6', 'custom-10', 'supabase', 'custom-1 '].some(isCustomId)).toBe(false);
  });

  it('진열 상품 id는 custom-으로 시작하지 않는다', () => {
    expect(cat.data.products.products.filter((x) => x.id.startsWith('custom-'))).toEqual([]);
  });
});

// ── 세션 정리 ───────────────────────────────────────────────

describe('normalizeSession: 직접 쓴 것', () => {
  it('내 말: 있는 질문만, 한 줄로, 40자까지, 빈 글과 글이 아닌 값은 버린다', () => {
    const s = normalizeSession(cat, {
      answers: {},
      notes: {
        'q.type': '  반려식물\n물 주기   알림 ',
        'q.domain': '가'.repeat(45),
        'q.nope': '모르는 질문',
        'q.save': '   ',
        'q.login': 3 as unknown as string,
      },
    });
    expect(s.notes).toEqual({ 'q.type': '반려식물 물 주기 알림', 'q.domain': '가'.repeat(40) });
  });

  it('마지막 한 줄은 그대로 둔다 (화면 칸이 이 값을 보이므로 쓰는 중인 띄어쓰기를 지우지 않는다. 80자 정리는 설계도가)', () => {
    expect(normalizeSession(cat, { freeText: '우리 반 ' }).freeText).toBe('우리 반 ');
  });

  it('직접 쓴 도구: 모양·기능·id가 맞는 것만, 같은 id·같은 이름은 하나, 5개까지, 이름은 40자', () => {
    const raw = [
      { id: 'custom-1', name: 'PokeAPI', capability: 'data' },
      { id: 'custom-1', name: '겹친 id', capability: 'data' },
      { id: 'custom-2', name: 'poke api', capability: 'store' },
      { id: 'custom-9', name: '틀린 id', capability: 'data' },
      { id: 'custom-3', name: '틀린 기능', capability: 'magic' },
      'custom-4',
      { id: 'custom-4', name: `  Notion\n${'x'.repeat(50)}`, capability: 'store' },
      { id: 'custom-5', name: '', capability: 'host' },
      { id: 'custom-2', name: '', capability: 'auth' },
    ];
    const s = normalizeSession(cat, { customTools: raw as unknown as CustomTool[] });
    expect(s.customTools).toEqual([
      { id: 'custom-1', name: 'PokeAPI', capability: 'data' },
      { id: 'custom-4', name: `Notion ${'x'.repeat(33)}`, capability: 'store' },
      { id: 'custom-5', name: '', capability: 'host' },
      { id: 'custom-2', name: '', capability: 'auth' },
    ]);
  });

  it('직접 쓴 도구는 5개까지', () => {
    const many = [1, 2, 3, 4, 5].map((n) => ({ id: `custom-${n}`, name: `도구 ${n}`, capability: 'data' as const }));
    const s = normalizeSession(cat, { customTools: [...many, { id: 'custom-1', name: '여섯째', capability: 'data' }] });
    expect(s.customTools?.map((t) => t.id)).toEqual(['custom-1', 'custom-2', 'custom-3', 'custom-4', 'custom-5']);
  });

  it('장바구니의 custom-n은 직접 쓴 도구에 있을 때만, 순서는 그대로', () => {
    const s = normalizeSession(cat, { cart: ['custom-2', 'html-single', 'custom-1', 'nope'], customTools: [POKE] });
    expect(s.cart).toEqual(['html-single', 'custom-1']);
  });

  it('빈틈: research.gap-<id> 조사 카드가 있는 id만, 겹치지 않게', () => {
    const s = normalizeSession(cat, { gaps: ['chat', 'ai-feature', 'chat', 'nope', 7 as unknown as string] });
    expect(s.gaps).toEqual(['chat', 'ai-feature']);
  });

  it('직접 쓴 것이 없으면 옛 세션 모양 그대로 (칸을 만들지 않는다)', () => {
    const s = normalizeSession(cat, { answers: {}, cart: [], kept: [], deferred: [], notes: {}, customTools: [], gaps: [] });
    expect(s).toEqual({ answers: {}, cart: [], kept: [], deferred: [] });
  });
});

// ── 그대로 둔 답의 계산 (brief 7.4) ──────────────────────────

describe('그대로 둔 답', () => {
  it("q.type 직접 쓰기는 type.custom이고 알림 질문을 묻는다", () => {
    const st = runInterview(cat, { 'q.type': 'custom' });
    expect(st.tags['type.custom']).toBe(1);
    const all = runInterview(cat, finish({ 'q.type': 'custom' }));
    expect(all.visible.map((q) => q.id)).toContain('q.notify');
  });

  it('q.domain 직접 쓰기는 need.data만 (분야 없음), q.audience는 몇 명이 같이', () => {
    const st = runInterview(cat, { 'q.domain': 'custom', 'q.audience': 'custom' });
    expect(Object.keys(st.tags).filter((t) => t.startsWith('domain.'))).toEqual([]);
    expect(st.tags['need.data']).toBe(1);
    expect(st.tags['audience.few']).toBe(1);
  });

  it("예·아니요를 그대로 두면 '모르겠어요'와 같다", () => {
    const a = runInterview(cat, { 'q.type': 'quiz', 'q.save': 'custom' });
    const b = runInterview(cat, { 'q.type': 'quiz', 'q.save': 'unknown' });
    expect(a.tags).toEqual(b.tags);
  });
});

// ── 고른 답 칩과 미리 짠 코스 ─────────────────────────────────

describe('answerChips: 직접 쓰기', () => {
  it("그대로 둔 답은 '내 말' 앞 20자를 따옴표로, '직접 쓰기'라고 찍지 않는다", () => {
    const st = runInterview(cat, { 'q.type': 'custom', 'q.audience': 'custom' });
    const chips = answerChips(cat, st, { 'q.type': '반려식물 물 주기 알림', 'q.audience': '우리 가족 넷과 이웃집 할머니 두 분까지' });
    expect(chips.map((c) => c.label)).toEqual(['“반려식물 물 주기 알림”', '“우리 가족 넷과 이웃집 할머니 두 분…”']);
  });

  it("내 말이 없으면(링크로 받음) '직접 쓴 답'", () => {
    const st = runInterview(cat, { 'q.type': 'custom' });
    expect(answerChips(cat, st)[0]?.label).toBe(T.customAnswer.hidden);
  });

  it('보기를 골랐으면 내 말이 있어도 보기 이름 그대로', () => {
    const st = runInterview(cat, { 'q.type': 'record' });
    expect(answerChips(cat, st, { 'q.type': '가계부 앱' })[0]?.label).toBe('기록장');
  });
});

describe('matchingRecipes: 직접 쓰기', () => {
  it("직접 쓰기 답은 '모르겠어요'처럼 어긋남으로도 같은 답으로도 세지 않는다", () => {
    const r0 = cat.data.recipes.recipes[0];
    if (!r0) throw new Error('레시피가 없습니다');
    const [first, ...rest] = Object.entries(r0.answers);
    if (!first) throw new Error('레시피 답이 없습니다');
    const withCustom = { [first[0]]: 'custom', ...Object.fromEntries(rest.slice(0, 1)) };
    const withUnknown = { [first[0]]: 'unknown', ...Object.fromEntries(rest.slice(0, 1)) };
    expect(matchingRecipes(cat, runInterview(cat, withCustom))).toEqual(matchingRecipes(cat, runInterview(cat, withUnknown)));
  });
});

// ── 도구 고르기·맞춰 보기·알아볼 것 ──────────────────────────

describe('직접 쓴 도구가 칸을 채운다', () => {
  const base = { answers: PAGE, cart: ['html-single', 'github-pages'] };
  const without = run({ ...base, kept: ['conflict.empty-slot:slot.data'] });
  const r = run({ ...base, cart: ['html-single', 'custom-1', 'github-pages'], customTools: [POKE, { id: 'custom-2', name: 'Open API', capability: 'data' }] });
  const data = r.slots.find((s) => s.slot.id === 'slot.data');

  it('칸을 채우지만 점수·추천에는 끼지 않는다 (SlotRanking.custom은 그 기능의 직접 쓴 도구, 쓴 순서)', () => {
    expect(data?.filledBy).toEqual(['custom-1']);
    expect(data?.custom.map((p) => p.id)).toEqual(['custom-1', 'custom-2']);
    expect([...(data?.shelf ?? []), ...(data?.index ?? [])].some((s) => s.product.id.startsWith('custom-'))).toBe(false);
    expect(data?.recommended?.product.id ?? null).toBe(without.slots.find((s) => s.slot.id === 'slot.data')?.recommended?.product.id ?? null);
    expect(r.slots.find((s) => s.slot.id === 'slot.host')?.custom).toEqual([]);
  });

  it("처음부터 서행: conflict.custom-tool:*, kept, 출발을 막지 않는다 (빈 칸 막힌 곳은 사라진다)", () => {
    const rest = without.conflicts.map((c) => c.id).filter((id) => id !== 'conflict.empty-slot:slot.data');
    expect(r.conflicts.map((c) => c.id)).toEqual([...rest, 'conflict.custom-tool:custom-1']);
    const c = r.conflicts.find((x) => x.kind === 'custom-tool');
    expect(c).toMatchObject({ customTool: 'custom-1', anchorSlot: 'slot.data', keepable: true, kept: true, fixHint: T.customTool.fixHint });
    expect(c?.message).toBe('직접 쓴 도구라 코드쇼퍼가 확인하지 못했어요: PokeAPI');
    expect(r.canIssue).toBe(true);
    expect(r.session.kept).toEqual([]);
  });

  it("알아볼 것: research.custom:custom-1 (이름이 든 머리, 조사 카드 본문), 원문만 있는 도구 카드는 만들지 않는다", () => {
    const item = r.research.find((x) => x.id === 'research.custom:custom-1');
    const card = cat.card.get(T.customTool.researchCard);
    expect(item).toMatchObject({ source: 'custom', area: '직접 쓴 도구 확인하기: PokeAPI', what: card?.what, doneWhen: card?.doneWhen });
    expect(r.research.some((x) => x.id.startsWith('research.index:custom'))).toBe(false);
  });

  it('안전 지시 safety.custom-tool', () => {
    expect(r.safety.ruleIds).toContain('safety.custom-tool');
    expect(without.safety.ruleIds).not.toContain('safety.custom-tool');
  });

  it('난이도는 unknownDifficulty, 시간은 unknownSetupMinutes를 더한다', () => {
    expect(r.split.difficulty - without.split.difficulty).toBe(cat.data.scoring.unknownDifficulty);
    expect(r.minutes - without.minutes).toBe(cat.data.scoring.unknownSetupMinutes);
  });

  it('칸이 사라진 직접 쓴 도구는 어디에도 쓰이지 않는 도구, 서행도 없다', () => {
    const off = run({ ...base, cart: ['html-single', 'custom-1', 'github-pages'], customTools: [{ ...POKE, capability: 'notify' }] });
    expect(off.orphans).toEqual(['custom-1']);
    expect(off.conflicts.some((c) => c.kind === 'custom-tool')).toBe(false);
  });

  it('productOf: 결과의 장바구니에서 직접 쓴 도구를 찾는다', () => {
    expect(productOf(cat, r, 'custom-1')?.name).toBe('PokeAPI');
    expect(productOf(cat, r, 'html-single')?.id).toBe('html-single');
    expect(productOf(cat, r, 'custom-2')?.name).toBe('Open API');
    expect(productOf(cat, r, 'nope')).toBeUndefined();
  });
});

describe('모르는 사실은 맞지 않음, 서버 위치만 모름', () => {
  const answers = finish({ 'q.type': 'form', 'q.audience': 'few', 'q.ai': 'chat-free', 'q.personal': 'yes-others', 'q.domain': 'none', 'q.budget': 'free-only' });
  const notion: CustomTool = { id: 'custom-2', name: 'Notion', capability: 'store' };
  const r = run({ answers, cart: ['html-single', 'custom-2', 'github-pages'], customTools: [notion], kept: ['conflict.personal-server'] });

  it('개인정보 막힌 곳은 켜지고(그대로 둠), 유료·키 노출 막힌 곳은 켜지지 않는다. 직접 쓴 도구 서행은 규칙 다음', () => {
    const ids = r.conflicts.map((c) => c.id);
    expect(ids).toContain('conflict.personal-server');
    expect(ids).not.toContain('conflict.paid-on-free');
    expect(ids).not.toContain('conflict.key-in-static-page');
    expect(ids.indexOf('conflict.custom-tool:custom-2')).toBe(ids.length - 1);
  });

  it('알아볼 것 순서: 규칙 카드 → 그대로 둔 막힌 곳 → 직접 쓴 도구', () => {
    const ids = r.research.map((x) => x.id);
    expect(ids.indexOf('research.privacy-overseas')).toBeLessThan(ids.indexOf('research.custom:custom-2'));
    expect(ids[ids.length - 1]).toBe('research.custom:custom-2');
  });
});

describe('빈틈과 직접 쓴 가져올 정보의 알아볼 것', () => {
  it("빈틈은 알아볼 것 끝에 session.gaps 순서로", () => {
    const r = run({ answers: PAGE, cart: ['html-single', 'custom-1'], customTools: [POKE], gaps: ['file-upload', 'ai-feature'] });
    expect(r.research.slice(-3).map((x) => [x.id, x.source])).toEqual([
      ['research.custom:custom-1', 'custom'],
      ['research.gap-file-upload', 'gap'],
      ['research.gap-ai-feature', 'gap'],
    ]);
  });

  it("빈 외부 데이터 칸을 그대로 두면 내 말로 '무엇을 확인'을 쓴다 (id는 그대로)", () => {
    const r = run({ answers: PAGE, cart: ['html-single'], kept: ['conflict.empty-slot:slot.data'], notes: { 'q.domain': '포켓몬 도감 정보' } });
    const item = r.research.find((x) => x.id === 'research.empty:slot.data');
    expect(item?.what).toBe('‘포켓몬 도감 정보’ 정보를 줄 API나 공개 데이터 가운데 무료로 시작할 수 있는 것은?');
    const plain = run({ answers: PAGE, cart: ['html-single'], kept: ['conflict.empty-slot:slot.data'] });
    expect(plain.research.find((x) => x.id === 'research.empty:slot.data')?.what).not.toContain('포켓몬');
  });
});

// ── 영수증·설계도·이름 ──────────────────────────────────────

describe('영수증', () => {
  it("직접 쓴 도구의 비용은 '모름', 합계는 유료 포함 > 0원 + 확인 필요 > 0원으로 시작", () => {
    const r = run({ answers: PAGE, cart: ['html-single', 'custom-1', 'github-pages'], customTools: [POKE] });
    const m = receiptModel(cat, r, '2026-10-14 10:00');
    expect(m.items.find((i) => i.productId === 'custom-1')).toMatchObject({ name: 'PokeAPI', price: T.receipt.unknown, free: false, unknown: true });
    expect(m.total).toBe(T.receipt.totalUnchecked);
    expect(receiptModel(cat, run({ answers: PAGE, cart: ['html-single', 'github-pages'] }), 'x').total).toBe(T.receipt.totalFree);
    const paid = cat.data.products.products.find((p) => p.layer === 'shelf' && !p.cost.free && p.capabilities.includes('host'));
    if (!paid) throw new Error('유료 배포 도구가 없습니다');
    expect(receiptModel(cat, run({ answers: PAGE, cart: ['html-single', 'custom-1', paid.id], customTools: [POKE] }), 'x').total).toBe(T.receipt.paidIncluded);
  });

  it('고정폭 글 영수증에서도 36칸 안 (모름은 유료와 같은 4칸)', () => {
    const r = run({ answers: PAGE, cart: ['html-single', 'custom-1', 'github-pages'], customTools: [POKE] });
    const text = renderReceiptText(receiptModel(cat, r, '2026-10-14 10:00'));
    expect(text).toContain('모름');
    expect(text).toContain(T.receipt.totalUnchecked);
    expect(Math.max(...text.split('\n').map(displayWidth))).toBeLessThanOrEqual(36);
  });
});

describe('설계도', () => {
  const answers = finish({ 'q.type': 'custom', 'q.audience': 'me', 'q.ai': 'chat-free', 'q.save': 'yes', 'q.domain': 'none', 'q.notify': 'yes' });
  const notes = { 'q.type': '반려식물 물 주기 알림', 'q.notify': '비 오는 날 아침에만' };
  const r = run({ answers, notes, cart: ['html-single', 'browser-storage', 'custom-3'], customTools: [{ id: 'custom-3', name: 'Pushover | 알림', capability: 'notify' }] });
  const md = renderPack(cat, r, PACK);
  const section = (n: number): string => md.split(/\n## /).find((s) => s.startsWith(`${n}. `)) ?? '';

  it("1번: 고른 답에 '직접 쓰기'가 없고, 내 말 그대로 줄이 질문 순서로", () => {
    const one = section(1);
    expect(one).not.toContain('직접 쓰기');
    expect(one).toContain('- 한 줄 설명: 반려식물 물 주기 알림');
    expect(one).toContain('- 종류: 직접 쓴 앱');
    expect(one).toContain('만들 것: “반려식물 물 주기 알림”');
    expect(one).toContain(`- ${T.pack.mine.label}: ${T.pack.mine.rule}`);
    expect(one).toContain('  - 만들 것: “반려식물 물 주기 알림” → 보기에 없어 그대로 둠 (계산은 ‘직접 쓴 앱’ 기준)');
    expect(one).toContain('  - 알림: “비 오는 날 아침에만” → 고른 답 네');
    expect(one.indexOf('만들 것: “반려식물')).toBeLessThan(one.indexOf('알림: “비 오는'));
    expect(one).toContain(`- ${T.pack.mine.customType}`);
    expect(T.pack.mine.rule).toContain('고른 답과 다르면 이 말을 먼저 따르고, 헷갈리면 만들기 전에 나에게 물어 줘.');
  });

  it("1번 '만드는 AI' 줄에 쓰는 AI 이름 (설계서 7.1절), 직접 쓴 AI 이름은 '계산은 … 기준' 꼬리 없이", () => {
    const L = T.pack.labels;
    const typed = finish({ 'q.type': 'page', 'q.audience': 'me', 'q.ai': 'chat-free', 'q.aitool-chat': 'custom' });
    const one = renderPack(cat, run({ answers: typed, notes: { 'q.aitool-chat': '뤼튼' }, cart: ['html-single'] }), PACK);
    expect(one).toContain(`- ${L.ai}: ${T.aiTools['ai.chat-free']?.label} (“뤼튼”)`);
    expect(one).toContain(`  - ${fill(T.pack.mine.keptName, { chip: '쓰는 AI', text: '뤼튼' })}`);
    expect(one).not.toContain('“뤼튼” → 보기에 없어 그대로 둠');

    const picked = finish({ 'q.type': 'page', 'q.audience': 'anyone', 'q.ai': 'builder', 'q.aitool-builder': 'lovable' });
    expect(renderPack(cat, run({ answers: picked, cart: ['html-single'] }), PACK)).toContain(`- ${L.ai}: ${T.aiTools['ai.builder']?.label} (Lovable)`);

    // 안 정했으면 이름 없이 (미리 짠 코스 예시와 같다)
    const none = finish({ 'q.type': 'page', 'q.audience': 'me', 'q.ai': 'chat-free' });
    expect(renderPack(cat, run({ answers: none, cart: ['html-single'] }), PACK)).toContain(`- ${L.ai}: ${T.aiTools['ai.chat-free']?.label}\n`);
  });

  it("like가 있는 답은 그 보기 이름 기준 (쓰는 사람 → '몇 명이 같이')", () => {
    const a2 = finish({ 'q.type': 'record', 'q.audience': 'custom' });
    const md2 = renderPack(cat, run({ answers: a2, notes: { 'q.audience': '우리 가족 넷' }, cart: ['html-single'] }), PACK);
    expect(md2).toContain('  - 쓰는 사람: “우리 가족 넷” → 보기에 없어 그대로 둠 (계산은 ‘몇 명이 같이’ 기준)');
    expect(md2).not.toContain(T.pack.mine.customType);
  });

  it('내 말이 없으면 내 말 그대로 줄도 없다 (링크로 받음)', () => {
    const md3 = renderPack(cat, run({ answers, cart: ['html-single'] }), PACK);
    expect(md3).not.toContain(`- ${T.pack.mine.label}:`);
    expect(md3).toContain(`만들 것: ${T.customAnswer.hidden}`);
    // 링크로 열면 내 말이 없으므로 한 줄 설명이 '1번에 적은 일'처럼 없는 글을 가리키지 않는다
    const goal = T.types['type.custom']?.goal ?? '?';
    expect(md3).toContain(`- ${T.pack.labels.oneLine}: ${goal}`);
    expect(goal).not.toContain('1번');
  });

  it("7번: 이름 + '(직접 씀)', 링크 없이, 나머지 칸은 '확인 필요', 메모 한 줄", () => {
    const seven = section(7);
    expect(seven).toContain(`| Pushover \\| 알림 ${T.customTool.mark} | ${T.customTool.unchecked} | ${T.customTool.unchecked} | ${T.customTool.unchecked} | ${T.customTool.unchecked} | ${T.customTool.unchecked} |`);
    expect(seven).toContain(`- ${T.customTool.memo}`);
    expect(seven.split('\n').find((l) => l.includes('Pushover'))).not.toContain('](');
  });

  it('진행 순서에 직접 쓴 도구 이름이 보인다', () => {
    expect(section(10)).toContain('Pushover | 알림');
  });

  it('이름: 한 줄 입력 → q.type의 내 말 → 종류 이름 (30자)', () => {
    expect(projectName(cat, r)).toBe('반려식물 물 주기 알림');
    expect(projectName(cat, run({ answers, notes, freeText: '우리 집 화분' }))).toBe('우리 집 화분');
    expect(projectName(cat, run({ answers }))).toBe(T.types['type.custom']?.label);
    expect(projectName(cat, run({ answers, notes: { 'q.type': '가'.repeat(35) } }))).toBe('가'.repeat(30));
  });
});

// ── 영수증 링크 ─────────────────────────────────────────────

describe('영수증 링크', () => {
  const s: Session = {
    answers: { 'q.type': 'custom', 'q.domain': 'custom' },
    cart: ['html-single', 'custom-1'],
    kept: [],
    deferred: [],
    freeText: '비밀 한 줄',
    notes: { 'q.type': '가계부 비밀', 'q.domain': '포켓몬' },
    customTools: [POKE, { id: 'custom-2', name: '안 고른 도구', capability: 'store' }],
    gaps: ['ai-feature'],
  };

  it("직접 쓴 글과 도구 이름은 넣지 않고, 맡은 기능(x)과 빈틈(g)만. 판 번호는 1 그대로", () => {
    const st = toShareState(s);
    expect(st).toEqual({ v: 1, a: s.answers, c: s.cart, k: [], d: [], x: { 'custom-1': 'data' }, g: ['ai-feature'] });
    const text = JSON.stringify(st);
    for (const secret of ['비밀', '포켓몬', 'PokeAPI', '안 고른']) expect(text).not.toContain(secret);
  });

  it('직접 쓴 것이 없으면 옛 모양 그대로 (x·g 없음)', () => {
    expect(toShareState({ answers: {}, cart: [], kept: [], deferred: [] })).toEqual({ v: 1, a: {}, c: [], k: [], d: [] });
  });

  it("왕복: 이름 없는 도구로 돌아오고, 링크로 연 영수증에는 '직접 쓴 도구'", () => {
    const back = fromShareState(JSON.parse(JSON.stringify(toShareState(s))));
    expect(back).toMatchObject({ customTools: [{ id: 'custom-1', name: '', capability: 'data' }], gaps: ['ai-feature'] });
    const r = evaluate(cat, back ?? {});
    expect(r.cart.find((p) => p.id === 'custom-1')?.name).toBe(T.customTool.hiddenName);
    expect(receiptModel(cat, r, 'x').items.find((i) => i.productId === 'custom-1')?.name).toBe(T.customTool.hiddenName);
  });

  it("이름 없이 받은 도구는 같은 말이 겹치지 않게 꼬리를 붙이지 않는다 (7번 '(직접 씀)', 9번 ': 이름', 서행 줄)", () => {
    const back = fromShareState(JSON.parse(JSON.stringify(toShareState(s))));
    const r = evaluate(cat, back ?? {});
    const hidden = T.customTool.hiddenName;
    expect(r.research.find((x) => x.id === 'research.custom:custom-1')?.area).toBe(T.customTool.researchAreaHidden);
    expect(r.conflicts.find((c) => c.kind === 'custom-tool')?.message).toBe(T.customTool.messageHidden);
    const md = renderPack(cat, r, PACK);
    expect(md).not.toContain(`${hidden} ${T.customTool.mark}`);
    expect(md).toContain(`**${hidden}**`);
    expect(md).not.toContain(`${T.customTool.researchAreaHidden}: ${hidden}`);
  });

  it('모르는 x·g 값은 버린다 (id 모양, 기능 이름, 글이 아닌 값)', () => {
    const back = fromShareState({ v: 1, a: {}, c: [], k: [], d: [], x: { 'custom-1': 'data', 'custom-7': 'data', 'custom-2': 'magic', supabase: 'store', 'custom-3': 3 }, g: ['chat', 5] });
    expect(back?.customTools).toEqual([{ id: 'custom-1', name: '', capability: 'data' }]);
    expect(back?.gaps).toEqual(['chat']);
    expect(fromShareState({ v: 1, a: {}, c: [], k: [], d: [], x: 'nope', g: 'nope' })).toEqual({ answers: {}, cart: [], kept: [], deferred: [] });
  });

  it("조작한 링크의 '중간 서버'(proxy) 도구는 받지 않는다: 키 노출 막힌 곳이 그대로 남는다", () => {
    // case-09와 같은 답: 아무나 쓰는 급식 페이지 + 키를 화면에 넣는 급식 API
    const a = { 'q.type': 'page', 'q.audience': 'anyone', 'q.ai': 'chat-free', 'q.save': 'no', 'q.domain': 'education', 'q.edu-topic': 'meal', 'q.realtime': 'daily', 'q.budget': 'free-only', 'q.payment': 'no', 'q.device': 'phone', 'q.style': 'cute' };
    const back = fromShareState({ v: 1, a, c: ['html-single', 'neis-meal', 'github-pages', 'custom-1'], k: [], d: [], x: { 'custom-1': 'proxy' } });
    expect(back?.customTools).toBeUndefined();
    const r = evaluate(cat, back ?? {});
    expect(r.conflicts.map((c) => c.id)).toContain('conflict.key-in-static-page');
    expect(r.safety.ruleIds).not.toContain('safety.proxy-key');
    // 저장소 값으로 들어와도 같다
    const stored = evaluate(cat, { answers: a, cart: ['html-single', 'neis-meal', 'github-pages', 'custom-1'], customTools: [{ id: 'custom-1', name: '키 숨김', capability: 'proxy' }] });
    expect(stored.session.customTools).toBeUndefined();
    expect(stored.conflicts.map((c) => c.id)).toContain('conflict.key-in-static-page');
  });
});
