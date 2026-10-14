import type { Catalog } from './catalog.ts';
import { cmp } from './catalog.ts';
import type { Ctx } from './conditions.ts';
import { evalCondition, hasTag, tagsWithPrefix } from './conditions.ts';
import { builderHosts, builderPublishProduct } from './builder.ts';
import { customProduct } from './custom.ts';
import type { CustomTool, Product, ScoreKey, SlotDef } from './types.ts';

/** 점수 항목의 고정 순서. 이유를 고를 때 점수가 같으면 이 순서를 따른다. */
export const SCORE_KEYS: ScoreKey[] = [
  'domain',
  'topic',
  'aiTool',
  'budget',
  'realtime',
  'difficulty',
  'official',
  'access',
  'proxy',
  'shared',
  'local',
];

export interface Slot extends SlotDef {
  /** 이 칸을 만든 규칙 id */
  ruleIds: string[];
}

export interface Scored {
  product: Product;
  score: number;
  /** 항목별 점수. 0인 항목은 없다 */
  parts: Partial<Record<ScoreKey, number>>;
  /** 점수를 올린 항목 (큰 순, 최대 reasonsMax개) */
  reasons: ScoreKey[];
  /** 점수를 깎은 항목 (많이 깎인 순) */
  cons: ScoreKey[];
  /**
   * 동점일 때만 쓰는 값: 지금 열린 칸 중 이 상품이 맡을 수 있고, 다른 상품이 아직 채우지 않았고,
   * 그 칸에서 이 상품이 최고 점수인 칸의 수. rankSlot이 센다 (scoreProduct만 부르면 1)
   */
  slotsCovered: number;
}

export type TieBy = 'official' | 'coverage' | 'difficulty' | 'id';

export interface SlotRanking {
  slot: Slot;
  /** 진열(shelf) 상품 (점수 순). 화면: 도구 */
  shelf: Scored[];
  /** 색인(index) 상품 (점수 순). 추천하지 않는다. 화면: 원문만 있는 도구 */
  index: Scored[];
  recommended: Scored | null;
  runnerUp: Scored | null;
  /** 추천과 2위 비교: 추천이 앞선 항목, 2위가 앞선 항목 */
  /** 추천과 2위의 차이. 점수가 같으면 tieBy가 무엇으로 갈렸는지 말한다 (정렬 순서: 공식 제공 → 맡는 칸 수 → 난이도 → id) */
  compare: { ahead: ScoreKey[]; behind: ScoreKey[]; tieBy?: TieBy } | null;
  /** 이 칸을 채운 장바구니 상품 id (직접 쓴 도구 custom-n 포함) */
  filledBy: string[];
  /** 이 칸 기능의 직접 쓴 도구 (쓴 순서, 장바구니에 없어도). 점수·추천·비교가 없다 (D74) */
  custom: Product[];
  /**
   * 웹에서 만드는 도구를 골랐을 때 공개 칸이면 빌더의 게시 기능 (B-02, D89), 아니면 null. 이 칸은 추천·2위·비교가 없다.
   * 고른 공개 도구가 없으면 filledBy에 이 상품 id가 들어간다. 이용자가 다른 공개 도구를 고르면 filledBy에는 그 도구만 들어가고 이 값은 그대로다
   * (화면: "쓰는 웹 빌더가 공개를 맡아요" + [다른 곳에 공개하기])
   */
  builder: Product | null;
}

/** 칸 규칙을 모아 칸 목록을 만든다. 같은 칸은 합치고, 하나라도 필수면 필수. */
export function buildSlots(cat: Catalog, ctx: Ctx): Slot[] {
  const map = new Map<string, Slot>();
  for (const r of cat.data.rules.rules) {
    if (r.type !== 'slot' || !evalCondition(r.when, ctx)) continue;
    const found = map.get(r.slot.id);
    if (found) {
      found.required = found.required || r.slot.required;
      found.ruleIds.push(r.id);
    } else {
      map.set(r.slot.id, { ...r.slot, ruleIds: [r.id] });
    }
  }
  return [...map.values()].sort((a, b) => a.order - b.order || cmp(a.id, b.id));
}

export function userLevel(cat: Catalog, tags: Record<string, number>): 1 | 2 | 3 {
  const s = cat.data.scoring;
  for (const [aiTag, level] of Object.entries(s.userLevelByAi)) {
    if (hasTag(tags, aiTag)) return level;
  }
  return s.defaultUserLevel;
}

export function slotCandidates(cat: Catalog, slot: Slot, tags: Record<string, number>): Product[] {
  const domains = tagsWithPrefix(tags, 'domain.');
  return cat.data.products.products.filter(
    (p) =>
      p.capabilities.includes(slot.capability) &&
      (!slot.matchDomain || (p.domains ?? []).some((d) => domains.includes(d))),
  );
}

/**
 * 상품 하나의 칸 점수. 공식은 사이트의 '추천 공식' 페이지에 그대로 공개한다.
 * cart는 지금 장바구니 전체, slots는 지금 열린 칸 전체.
 */
export function scoreProduct(cat: Catalog, p: Product, slot: Slot, tags: Record<string, number>, cart: Product[], slots: Slot[]): Scored {
  const w = cat.data.scoring.weights;
  const parts: Partial<Record<ScoreKey, number>> = {};
  const add = (k: ScoreKey, v: number): void => {
    if (v !== 0) parts[k] = (parts[k] ?? 0) + v;
  };

  const domains = tagsWithPrefix(tags, 'domain.');
  const topics = tagsWithPrefix(tags, 'topic.');
  const ais = tagsWithPrefix(tags, 'ai.');

  if ((p.domains ?? []).some((d) => domains.includes(d))) add('domain', w.domainMatch);
  if (topics.length > 0 && (p.topics ?? []).length > 0) {
    add('topic', (p.topics ?? []).some((t) => topics.includes(t)) ? w.topicMatch : w.topicMissed);
  }
  if ((p.goodFor ?? []).some((g) => ais.includes(g))) add('aiTool', w.aiToolMatch);
  if (p.cost.free) add('budget', w.freeProduct);
  else if (hasTag(tags, 'budget.free')) add('budget', w.paidWhenBudgetFree);
  if (hasTag(tags, 'need.realtime') && p.capabilities.includes('data') && p.realtime !== undefined) {
    add('realtime', p.realtime === 'realtime' || p.realtime === 'frequent' ? w.realtimeMet : w.realtimeMissed);
  }
  add('difficulty', w.difficultyGap * Math.abs(p.difficulty - userLevel(cat, tags)));
  if (p.provider.type === 'official') add('official', w.providerOfficial);
  add('access', w.accessPenalty[p.access]);
  const others = cart.filter((c) => !c.capabilities.includes(slot.capability));
  if (p.capabilities.includes('proxy') && others.some((c) => c.keyExposureRisk)) add('proxy', w.proxyNeeded);
  // 이미 담은 상품이 '앞선 칸'도 맡으면 이 칸에서 더한다. 도구 고르기는 위 칸부터 채우므로,
  // 앞 칸을 채우려고 담은 상품이 뒤 칸도 맡을 수 있다는 뜻이다. 담은 칸 자체에서는 더하지 않는다.
  const inCart = cart.some((c) => c.id === p.id);
  if (inCart && slots.some((s) => s.order < slot.order && p.capabilities.includes(s.capability))) add('shared', w.sharedTool);
  if (p.capabilities.includes('store') && p.serverRegion === 'local') {
    add('local', hasTag(tags, 'audience.me') ? w.localForMe : w.localForShared);
  }

  const score = Object.values(parts).reduce((a, b) => a + (b ?? 0), 0);
  const keyIndex = (k: ScoreKey): number => SCORE_KEYS.indexOf(k);
  const reasons = SCORE_KEYS.filter((k) => (parts[k] ?? 0) > 0)
    .sort((a, b) => (parts[b] ?? 0) - (parts[a] ?? 0) || keyIndex(a) - keyIndex(b))
    .slice(0, cat.data.scoring.reasonsMax);
  const cons = SCORE_KEYS.filter((k) => (parts[k] ?? 0) < 0).sort(
    (a, b) => (parts[a] ?? 0) - (parts[b] ?? 0) || keyIndex(a) - keyIndex(b),
  );
  return { product: p, score, parts, reasons, cons, slotsCovered: 1 };
}

/** 점수 → 공식 제공 → 지금 열린 칸을 더 많이 맡는 상품(한 상품으로 여러 칸을 채우면 더 단순하다) → 쉬운 난이도 → id 순 */
export function compareScored(a: Scored, b: Scored): number {
  const official = (s: Scored): number => (s.product.provider.type === 'official' ? 0 : 1);
  return (
    b.score - a.score ||
    official(a) - official(b) ||
    b.slotsCovered - a.slotsCovered ||
    a.product.difficulty - b.product.difficulty ||
    cmp(a.product.id, b.product.id)
  );
}

/** 칸마다 진열 상품의 점수와, 추천할 수 있는 상품 중 최고 점수 (동점 규칙에서 쓴다) */
function slotTops(cat: Catalog, slots: Slot[], tags: Record<string, number>, cart: Product[]): Map<string, { top: number; by: Map<string, number> }> {
  const out = new Map<string, { top: number; by: Map<string, number> }>();
  for (const t of slots) {
    const by = new Map<string, number>();
    let top = Number.NEGATIVE_INFINITY;
    for (const p of slotCandidates(cat, t, tags)) {
      if (p.layer !== 'shelf') continue;
      const sc = scoreProduct(cat, p, t, tags, cart, slots).score;
      by.set(p.id, sc);
      if (p.recommendable && sc > top) top = sc;
    }
    out.set(t.id, { top, by });
  }
  return out;
}

/** 동점일 때 무엇으로 갈렸는지 (compareScored와 같은 순서) */
function tieReason(a: Scored, b: Scored): TieBy {
  const official = (s: Scored): boolean => s.product.provider.type === 'official';
  if (official(a) !== official(b)) return 'official';
  if (a.slotsCovered !== b.slotsCovered) return 'coverage';
  if (a.product.difficulty !== b.product.difficulty) return 'difficulty';
  return 'id';
}

export function rankSlot(
  cat: Catalog,
  slot: Slot,
  tags: Record<string, number>,
  cart: Product[],
  slots: Slot[],
  customTools: CustomTool[] = [],
): SlotRanking {
  const tops = slotTops(cat, slots, tags, cart);
  // 맡는 칸 수 = 이 칸 1 + 다른 열린 칸 중 이 상품이 맡을 수 있는 칸. 다른 상품이 채운 칸, 이 상품보다
  // 점수가 높은 상품이 있는 칸은 세지 않는다 (D55). 이 칸은 모두에게 같으므로 장바구니와 상관없이 1이다
  const covered = (p: Product): number =>
    1 +
    slots.filter((t) => {
      if (t.id === slot.id || !p.capabilities.includes(t.capability)) return false;
      if (cart.some((c) => c.id !== p.id && c.capabilities.includes(t.capability))) return false;
      const info = tops.get(t.id);
      const mine = info?.by.get(p.id);
      return info !== undefined && mine !== undefined && mine >= info.top;
    }).length;
  const scored = slotCandidates(cat, slot, tags)
    .map((p) => ({ ...scoreProduct(cat, p, slot, tags, cart, slots), slotsCovered: covered(p) }))
    .sort(compareScored);
  const shelf = scored.filter((s) => s.product.layer === 'shelf');
  const index = scored.filter((s) => s.product.layer === 'index');
  const threshold = cat.data.scoring.recommendThreshold;
  // 웹에서 만드는 도구의 공개 칸은 추천하지 않는다: 빌더의 게시 기능과 겹치는 배포처를 권하지 않게 (B-02). 목록과 점수는 그대로 둔다
  const builder = builderHosts(tags, slot) ? builderPublishProduct(cat) : null;
  const recommended = builder ? null : (shelf.find((s) => s.product.recommendable && s.score >= threshold) ?? null);
  const runnerUp = recommended ? (shelf.find((s) => s !== recommended) ?? null) : null;
  let compare: SlotRanking['compare'] = null;
  if (recommended && runnerUp) {
    const ahead: ScoreKey[] = [];
    const behind: ScoreKey[] = [];
    for (const k of SCORE_KEYS) {
      const d = (recommended.parts[k] ?? 0) - (runnerUp.parts[k] ?? 0);
      if (d > 0) ahead.push(k);
      if (d < 0) behind.push(k);
    }
    compare = recommended.score === runnerUp.score ? { ahead, behind, tieBy: tieReason(recommended, runnerUp) } : { ahead, behind };
  }
  const filledBy = cart.filter((p) => p.capabilities.includes(slot.capability)).map((p) => p.id);
  const custom = customTools.filter((t) => t.capability === slot.capability).map((t) => customProduct(cat, t));
  return { slot, shelf, index, recommended, runnerUp, compare, filledBy, custom, builder };
}

/** 열린 칸마다 순위를 낸다 (도구 고르기 화면 전체) */
export function rankAll(cat: Catalog, ctx: Ctx): SlotRanking[] {
  const slots = buildSlots(cat, ctx);
  return slots.map((s) => rankSlot(cat, s, ctx.tags, ctx.cart, slots));
}
