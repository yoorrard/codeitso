// 웹에서 만드는 도구의 공개 (B-02, D89, docs/review/v3/brief.md 7.7절, docs/ENGINE.md 10절).
// 웹에서 만드는 도구(ai.builder)를 고르면 배포 칸은 엔진이 가짜 상품 '빌더의 게시 기능'으로 채운다: 점수·추천·규칙 조건에 끼지 않고 비용은 '모름'.
import { describe, expect, it } from 'vitest';
import type { Catalog, EngineResult, Session } from '../../src/lib/engine/index.ts';
import {
  BUILDER_PUBLISH_ID,
  builderHosts,
  costUnchecked,
  evaluate,
  fromShareState,
  matchProduct,
  productOf,
  receiptModel,
  renderPack,
  renderReceiptText,
  runInterview,
  toShareState,
} from '../../src/lib/engine/index.ts';
import { builderPublishProduct, toolsToSetUp, withBuilderPublish } from '../../src/lib/engine/builder.ts';
import { customProduct } from '../../src/lib/engine/custom.ts';
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
    out[st.next.id] = st.next.optional === true ? 'unknown' : (st.next.options[0]?.id ?? '');
  }
  throw new Error('질문이 끝나지 않습니다');
}

const BASE = { 'q.type': 'page', 'q.save': 'no', 'q.domain': 'none', 'q.budget': 'free-only', 'q.payment': 'no' };
const BUILDER_PAGE = finish({ ...BASE, 'q.audience': 'anyone', 'q.ai': 'builder' });
const CHAT_PAGE = finish({ ...BASE, 'q.audience': 'anyone', 'q.ai': 'chat-free' });
/** 나만 쓰는 날씨 앱: 키를 화면에 넣는 데이터 도구(기상청 단기예보) */
const BUILDER_WEATHER_ME = finish({ ...BASE, 'q.audience': 'me', 'q.ai': 'builder', 'q.domain': 'weather', 'q.weather-topic': 'forecast', 'q.realtime': 'daily' });

function run(answers: Record<string, string>, s: Partial<Session> = {}): EngineResult {
  return evaluate(cat, { answers, cart: [], kept: [], deferred: [], ...s });
}
const host = (r: EngineResult) => {
  const s = r.slots.find((x) => x.slot.id === 'slot.host');
  if (!s) throw new Error('배포 칸이 없습니다');
  return s;
};

describe('builderPublishProduct', () => {
  const p = builderPublishProduct(cat);

  it('점수 없는 가짜 상품: 공개 기능만, 추천할 수 없음, 링크·준비물·필요 개념 없음', () => {
    expect(p).toMatchObject({
      id: BUILDER_PUBLISH_ID,
      name: T.builderPublish.name,
      builderPublish: true,
      capabilities: ['host'],
      recommendable: false,
      provider: { type: 'generic', name: T.builderPublish.provider },
      links: [],
      needsReview: true,
    });
    expect(p.prep).toBeUndefined();
    expect(p.needsConcepts).toBeUndefined();
    expect(p.setupMinutes).toBeUndefined();
  });

  it('products.json에 없다 (카탈로그 밖)', () => {
    expect(cat.product.has(BUILDER_PUBLISH_ID)).toBe(false);
  });

  it('어떤 규칙 조건에도 맞지 않는다 (기능 조건만 있어도)', () => {
    expect(matchProduct(p, { capability: 'host' })).toBe(false);
    expect(matchProduct(p, {})).toBe(false);
    expect(matchProduct(p, { field: 'serverRegion', in: ['unknown'] })).toBe(false);
  });

  it('비용은 확인하지 않은 것: 직접 쓴 도구와 같다', () => {
    expect(costUnchecked(p)).toBe(true);
    expect(costUnchecked(customProduct(cat, { id: 'custom-1', name: 'X', capability: 'data' }))).toBe(true);
    expect(costUnchecked(cat.product.get('github-pages') ?? p)).toBe(false);
  });
});

describe('builderHosts · withBuilderPublish', () => {
  const hostSlot = { capability: 'host' as const };
  it('웹에서 만드는 도구 + 공개 기능 칸일 때만', () => {
    expect(builderHosts({ 'ai.builder': 1 }, hostSlot)).toBe(true);
    expect(builderHosts({ 'ai.builder': 1 }, { capability: 'store' })).toBe(false);
    expect(builderHosts({ 'ai.chat-free': 1 }, hostSlot)).toBe(false);
  });

  it('고른 도구에 공개를 맡는 것이 있으면 더하지 않는다', () => {
    const slots = [{ id: 'slot.host', label: '배포', capability: 'host' as const, required: true, order: 50 }];
    const pages = cat.product.get('github-pages');
    if (!pages) throw new Error('github-pages가 없습니다');
    expect(withBuilderPublish(cat, [], slots, { 'ai.builder': 1 }).map((p) => p.id)).toEqual([BUILDER_PUBLISH_ID]);
    expect(withBuilderPublish(cat, [pages], slots, { 'ai.builder': 1 }).map((p) => p.id)).toEqual(['github-pages']);
    expect(withBuilderPublish(cat, [], [], { 'ai.builder': 1 })).toEqual([]);
    expect(withBuilderPublish(cat, [], slots, { 'ai.agent': 1 })).toEqual([]);
  });

  it('공개 칸이 선택 칸(나만 쓰는 앱)이면 더하지 않는다', () => {
    const optional = [{ id: 'slot.host', label: '배포', capability: 'host' as const, required: false, order: 50 }];
    expect(withBuilderPublish(cat, [], optional, { 'ai.builder': 1 })).toEqual([]);
  });

  it('붙일 도구만 센다 (난이도·예상 시간)', () => {
    expect(toolsToSetUp([builderPublishProduct(cat)])).toEqual([]);
  });
});

describe('웹에서 만드는 도구로 만드는 안내 페이지 (case-31과 같은 답)', () => {
  const r = run(BUILDER_PAGE, { cart: ['html-single'] });
  const h = host(r);

  it('배포 칸은 빌더의 게시 기능이 채우고 GitHub Pages·Cloudflare를 추천하지 않는다', () => {
    expect(h.slot.required).toBe(true);
    expect(h.builder?.id).toBe(BUILDER_PUBLISH_ID);
    expect(h.filledBy).toEqual([BUILDER_PUBLISH_ID]);
    expect(h.recommended).toBeNull();
    expect(h.runnerUp).toBeNull();
    expect(h.compare).toBeNull();
    // 목록과 점수는 그대로 둔다 ([다른 곳에 공개하기]에서 고를 수 있게)
    expect(h.shelf.map((s) => s.product.id)).toEqual(expect.arrayContaining(['github-pages', 'cloudflare-workers']));
  });

  it('다른 칸은 지금 계산 그대로 (화면 칸 추천은 있다)', () => {
    const screen = r.slots.find((s) => s.slot.id === 'slot.screen');
    expect(screen?.recommended?.product.id).toBe('html-single');
    expect(screen?.builder).toBeNull();
  });

  it('세션 장바구니에는 넣지 않고 결과의 고른 도구에만 있다 (빈 칸 막힌 곳 없음, 출발 가능)', () => {
    expect(r.session.cart).toEqual(['html-single']);
    expect(r.cart.map((p) => p.id)).toEqual(['html-single', BUILDER_PUBLISH_ID]);
    expect(r.conflicts).toEqual([]);
    expect(r.canIssue).toBe(true);
    expect(r.orphans).toEqual([]);
  });

  it('알아볼 것에 research.builder-publish (원문만 있는 도구 카드는 만들지 않는다)', () => {
    expect(r.research.map((x) => [x.id, x.source])).toEqual([['research.builder-publish', 'builder']]);
    const card = cat.card.get('research.builder-publish');
    expect(card).toBeDefined();
    // 숫자(한도·요금)를 싣지 않는다
    expect(JSON.stringify(card)).not.toMatch(/[0-9]/);
  });

  it('난이도와 예상 시간에 더하지 않는다 (HTML 한 장만 센다)', () => {
    expect(r.split.difficulty).toBe(1);
    expect(r.minutes).toBe(cat.data.scoring.baseMinutes + (cat.product.get('html-single')?.setupMinutes ?? 0));
    expect(r.study.all).toEqual([]);
    expect(r.prep).toEqual([]);
  });

  it('진행 순서의 배포 단계는 빌더의 게시 기능', () => {
    expect(r.steps.map((s) => [s.slotId, s.products])).toEqual([
      ['slot.screen', ['html-single']],
      ['slot.host', [BUILDER_PUBLISH_ID]],
    ]);
    expect(productOf(cat, r, BUILDER_PUBLISH_ID)?.name).toBe(T.builderPublish.name);
  });

  it("영수증: 비용 '모름', 합계 '0원 + 확인 필요'", () => {
    const m = receiptModel(cat, r, '2026-10-14 10:00');
    const item = m.items.find((i) => i.productId === BUILDER_PUBLISH_ID);
    expect(item).toMatchObject({ name: T.builderPublish.name, unknown: true, free: false, price: T.receipt.unknown });
    expect(m.total).toBe(T.receipt.totalUnchecked);
    expect(renderReceiptText(m)).toContain(T.receipt.totalUnchecked);
  });

  it('유료 도구가 함께 있으면 합계는 유료 포함', () => {
    const paid = cat.data.products.products.find((p) => !p.cost.free && p.capabilities.includes('screen'));
    if (!paid) return;
    const m = receiptModel(cat, run(BUILDER_PAGE, { cart: [paid.id] }), 'x');
    expect(m.total).toBe(T.receipt.paidIncluded);
  });

  it('설계도 7번: 이름 · 제공(고른 웹 빌더) · 나머지 확인 필요, 메모, 9번 카드', () => {
    const md = renderPack(cat, r, PACK);
    const u = T.customTool.unchecked;
    expect(md).toContain(`| ${T.builderPublish.name} | ${T.builderPublish.provider} | ${u} | ${u} | ${u} | ${u} |`);
    expect(md).toContain(`**${T.builderPublish.name}**`);
    expect(md).toContain(T.builderPublish.memo);
    expect(md).toContain(cat.card.get('research.builder-publish')?.area ?? '?');
    expect(md).not.toContain(BUILDER_PUBLISH_ID);
  });

  it('영수증 링크에 넣지 않고, 링크로 열어도 같은 칸이 나온다', () => {
    const state = toShareState(r.session);
    expect(JSON.stringify(state)).not.toContain(BUILDER_PUBLISH_ID);
    const back = fromShareState(JSON.parse(JSON.stringify(state)));
    expect(back).not.toBeNull();
    expect(host(evaluate(cat, back ?? {})).filledBy).toEqual([BUILDER_PUBLISH_ID]);
  });
});

describe('다른 곳에 공개하고 싶을 때 (이용자가 고른 공개 도구가 이긴다)', () => {
  it('GitHub Pages를 고르면 그 도구가 칸을 채우고, 추천은 여전히 없다', () => {
    const r = run(BUILDER_PAGE, { cart: ['html-single', 'github-pages'] });
    const h = host(r);
    expect(h.filledBy).toEqual(['github-pages']);
    expect(h.recommended).toBeNull();
    expect(h.builder?.id).toBe(BUILDER_PUBLISH_ID);
    expect(r.cart.map((p) => p.id)).not.toContain(BUILDER_PUBLISH_ID);
    expect(r.research.map((x) => x.id)).not.toContain('research.builder-publish');
  });

  it('직접 쓴 공개 도구도 같다', () => {
    const r = run(BUILDER_PAGE, { cart: ['html-single', 'custom-1'], customTools: [{ id: 'custom-1', name: 'Netlify Drop', capability: 'host' }] });
    expect(host(r).filledBy).toEqual(['custom-1']);
    expect(r.cart.map((p) => p.id)).not.toContain(BUILDER_PUBLISH_ID);
  });

  it('다른 칸을 맡으려고 고른 도구가 공개도 맡으면 그 도구가 채운다 (지금 계산 그대로)', () => {
    const r = run(finish({ 'q.type': 'record', 'q.audience': 'me', 'q.ai': 'builder', 'q.domain': 'none', 'q.budget': 'free-only', 'q.personal': 'no' }), {
      cart: ['html-single', 'google-sheets-apps-script'],
    });
    expect(host(r).filledBy).toEqual(['google-sheets-apps-script']);
  });
});

describe('나만 쓰는 앱 (공개 칸이 선택 칸)', () => {
  it('공개 칸은 비워 두고 추천도 하지 않는다: 설계도에 공개 단계와 빌더 알아볼 것이 없다', () => {
    const r = run(BUILDER_WEATHER_ME, { cart: ['html-single', 'kma-forecast'] });
    const h = host(r);
    expect(h.slot.required).toBe(false);
    expect(h.filledBy).toEqual([]);
    expect(h.recommended).toBeNull();
    expect(h.builder?.id).toBe(BUILDER_PUBLISH_ID);
    expect(r.cart.map((p) => p.id)).not.toContain(BUILDER_PUBLISH_ID);
    expect(r.steps.map((s) => s.slotId)).not.toContain('slot.host');
    expect(r.research.map((x) => x.id)).not.toContain('research.builder-publish');
    expect(r.conflicts).toEqual([]);
    expect(r.canIssue).toBe(true);
    expect(renderPack(cat, r, PACK)).not.toContain(T.builderPublish.name);
  });
});

describe('배포 칸에 걸린 막힌 곳 규칙은 켜지지 않는다', () => {
  it('나만 쓰는 앱 + 키를 화면에 넣는 데이터 도구: 공개하라는 지시와 키를 올리지 말라는 지시가 함께 나오지 않는다', () => {
    const viaBuilder = run(BUILDER_WEATHER_ME, { cart: ['html-single', 'kma-forecast'] });
    expect(host(viaBuilder).filledBy).toEqual([]);
    expect(viaBuilder.conflicts.map((c) => c.id)).not.toContain('conflict.key-on-public-host');
    // 키를 내 컴퓨터에만 두라는 안전 지시는 그대로 붙고, 공개 단계는 없다
    expect(viaBuilder.safety.ruleIds).toContain('safety.local-key');
    expect(viaBuilder.steps.map((s) => s.slotId)).not.toContain('slot.host');

    const viaPages = run(BUILDER_WEATHER_ME, { cart: ['html-single', 'kma-forecast', 'github-pages'] });
    expect(viaPages.conflicts.map((c) => c.id)).toContain('conflict.key-on-public-host');
  });

  it('키 자체를 보는 막힌 곳(여럿이 쓰는 앱 + 중간 서버 없음)은 그대로 켜진다', () => {
    const shared = finish({ ...BASE, 'q.audience': 'anyone', 'q.ai': 'builder', 'q.domain': 'weather', 'q.weather-topic': 'forecast', 'q.realtime': 'daily' });
    const r = run(shared, { cart: ['html-single', 'kma-forecast'] });
    expect(r.conflicts.map((c) => c.id)).toContain('conflict.key-in-static-page');
  });
});

describe('웹에서 만드는 도구가 아니면 그대로', () => {
  it('무료 AI 채팅: 배포 칸 추천이 있고 빌더 칸이 아니다', () => {
    const r = run(CHAT_PAGE, { cart: ['html-single'] });
    const h = host(r);
    expect(h.builder).toBeNull();
    expect(h.recommended?.product.id).toBe('github-pages');
    expect(h.filledBy).toEqual([]);
    expect(r.conflicts.map((c) => c.id)).toEqual(['conflict.empty-slot:slot.host']);
  });
});
