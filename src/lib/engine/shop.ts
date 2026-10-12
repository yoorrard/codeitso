import type { Catalog } from './catalog.ts';
import { cmp } from './catalog.ts';
import type { Ctx } from './conditions.ts';
import { evalCondition, hasTag, tagsWithPrefix } from './conditions.ts';
import type { Product, ScoreKey, SlotDef } from './types.ts';

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
}

export interface SlotRanking {
  slot: Slot;
  /** 진열 상품 (점수 순) */
  shelf: Scored[];
  /** 색인 상품 (점수 순). 추천하지 않는다 */
  index: Scored[];
  recommended: Scored | null;
  runnerUp: Scored | null;
  /** 추천과 2위 비교: 추천이 앞선 항목, 2위가 앞선 항목 */
  compare: { ahead: ScoreKey[]; behind: ScoreKey[] } | null;
  /** 이 칸을 채운 장바구니 상품 id */
  filledBy: string[];
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
  // 이미 담은 상품이 '앞선 칸'도 맡으면 이 칸에서 더한다. 장보기는 위 칸부터 채우므로,
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
  return { product: p, score, parts, reasons, cons };
}

/** 점수 → 공식 제공 → 쉬운 난이도 → id 순 */
export function compareScored(a: Scored, b: Scored): number {
  const official = (s: Scored): number => (s.product.provider.type === 'official' ? 0 : 1);
  return (
    b.score - a.score ||
    official(a) - official(b) ||
    a.product.difficulty - b.product.difficulty ||
    cmp(a.product.id, b.product.id)
  );
}

export function rankSlot(cat: Catalog, slot: Slot, tags: Record<string, number>, cart: Product[], slots: Slot[]): SlotRanking {
  const scored = slotCandidates(cat, slot, tags)
    .map((p) => scoreProduct(cat, p, slot, tags, cart, slots))
    .sort(compareScored);
  const shelf = scored.filter((s) => s.product.layer === 'shelf');
  const index = scored.filter((s) => s.product.layer === 'index');
  const threshold = cat.data.scoring.recommendThreshold;
  const recommended = shelf.find((s) => s.product.recommendable && s.score >= threshold) ?? null;
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
    compare = { ahead, behind };
  }
  const filledBy = cart.filter((p) => p.capabilities.includes(slot.capability)).map((p) => p.id);
  return { slot, shelf, index, recommended, runnerUp, compare, filledBy };
}

/** 열린 칸마다 순위를 낸다 (장보기 화면 전체) */
export function rankAll(cat: Catalog, ctx: Ctx): SlotRanking[] {
  const slots = buildSlots(cat, ctx);
  return slots.map((s) => rankSlot(cat, s, ctx.tags, ctx.cart, slots));
}
