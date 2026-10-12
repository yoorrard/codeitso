import type { Catalog } from './catalog.ts';
import type { Ctx } from './conditions.ts';
import { evalCondition } from './conditions.ts';
import type { Slot, SlotRanking } from './shop.ts';
import { fill } from './text.ts';
import type { Product, Session } from './types.ts';

export interface Conflict {
  id: string;
  kind: 'rule' | 'empty-slot';
  message: string;
  fixHint: string;
  /** 규칙 충돌을 '그대로 두면' 붙는 조사 카드 */
  researchCard?: string;
  /** 빈 칸 충돌의 칸 id */
  slotId?: string;
  /** '그대로 두고 조사할 것에 추가'를 고를 수 있는지 (비워 둘 수 없는 칸은 false) */
  keepable: boolean;
  /** 이용자가 '그대로 두고 조사할 것에 추가'를 골랐는지 */
  kept: boolean;
}

export interface EasierSwap {
  slotId: string;
  /** 지금 담은 상품 */
  from: string;
  /** 같은 칸에서 추천 기준을 넘는, 난이도가 더 낮은 진열 상품 */
  to: string;
}

export interface Split {
  /** 장바구니 상품 난이도 합 (같은 상품은 한 번) */
  difficulty: number;
  /** 2차로 미룬 칸에만 쓰이는 상품을 뺀 1차 난이도 */
  difficultyFirst: number;
  /** 나누기를 제안할지: 1차 난이도가 기준보다 크면 */
  needed: boolean;
  /** 아직 미루지 않은, 2차로 미룰 수 있는 칸 (칸 순서). needed일 때만 */
  defer: string[];
  /** 더 쉬운 상품으로 바꾸는 제안. needed일 때만 */
  easier: EasierSwap[];
}

export function emptySlotId(slotId: string): string {
  return `conflict.empty-slot:${slotId}`;
}

/** 재확인 검사: 규칙 충돌(규칙 순서) 다음에 빈 필수 칸(칸 순서) */
export function findConflicts(cat: Catalog, session: Session, ctx: Ctx, slots: Slot[]): Conflict[] {
  const out: Conflict[] = [];
  for (const r of cat.data.rules.rules) {
    if (r.type !== 'conflict' || !evalCondition(r.when, ctx)) continue;
    out.push({
      id: r.id,
      kind: 'rule',
      message: r.message,
      fixHint: r.fixHint,
      researchCard: r.researchCard,
      keepable: true,
      kept: session.kept.includes(r.id),
    });
  }
  const t = cat.data.templates.emptySlot;
  for (const s of slots) {
    if (!s.required || session.deferred.includes(s.id)) continue;
    if (ctx.cart.some((p) => p.capabilities.includes(s.capability))) continue;
    const id = emptySlotId(s.id);
    const keepable = s.mustFill !== true;
    out.push({
      id,
      kind: 'empty-slot',
      message: s.emptyMessage ?? fill(t.message, { label: s.label }),
      fixHint: s.emptyFix ?? fill(t.fixHint, { label: s.label }),
      slotId: s.id,
      keepable,
      kept: keepable && session.kept.includes(id),
    });
  }
  return out;
}

/** 열린 칸 중 이 상품이 맡는 칸 */
function slotsOf(p: Product, slots: Slot[]): Slot[] {
  return slots.filter((s) => p.capabilities.includes(s.capability));
}

/** 담은 상품 중 2차로 미룬 칸에만 쓰이는 상품을 뺀 것 (칸 밖 상품은 1차에 둔다) */
export function firstPhaseProducts(cart: Product[], slots: Slot[], deferred: string[]): Product[] {
  return cart.filter((p) => {
    const fills = slotsOf(p, slots);
    if (fills.length === 0) return true;
    return fills.some((s) => !deferred.includes(s.id));
  });
}

/**
 * 1차/2차 나누기. 칸을 미뤄도 그 칸의 상품이 다른 칸에도 쓰이면 난이도 숫자는 그대로일 수 있다
 * (예: Supabase가 저장과 로그인을 함께 맡을 때 로그인을 미룸). 그래도 그 기능을 만드는 일은 2차로 넘어간다.
 */
export function suggestSplit(cat: Catalog, cart: Product[], rankings: SlotRanking[], deferred: string[]): Split {
  const slots = rankings.map((r) => r.slot);
  const sum = (ps: Product[]): number => ps.reduce((a, p) => a + p.difficulty, 0);
  const difficulty = sum(cart);
  const difficultyFirst = sum(firstPhaseProducts(cart, slots, deferred));
  const needed = difficultyFirst > cat.data.scoring.phaseSplitDifficulty;
  if (!needed) return { difficulty, difficultyFirst, needed, defer: [], easier: [] };

  const defer = slots.filter((s) => s.deferrable && !deferred.includes(s.id)).map((s) => s.id);
  const live = slots.filter((s) => !deferred.includes(s.id));
  const threshold = cat.data.scoring.recommendThreshold;
  const easier: EasierSwap[] = [];
  for (const r of rankings) {
    if (deferred.includes(r.slot.id) || r.filledBy.length !== 1) continue;
    const current = cart.find((p) => p.id === r.filledBy[0]);
    if (!current || slotsOf(current, live).length !== 1) continue;
    const better = r.shelf.find(
      (s) =>
        s.product.id !== current.id &&
        s.product.recommendable &&
        s.score >= threshold &&
        s.product.difficulty < current.difficulty,
    );
    if (better) easier.push({ slotId: r.slot.id, from: current.id, to: better.product.id });
  }
  return { difficulty, difficultyFirst, needed, defer, easier };
}

/** 열린 칸 어디에도 쓰이지 않는 장바구니 상품 */
export function orphanProducts(cart: Product[], slots: Slot[]): string[] {
  return cart.filter((p) => slotsOf(p, slots).length === 0).map((p) => p.id);
}
