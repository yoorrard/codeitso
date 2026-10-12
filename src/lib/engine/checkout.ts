import type { Catalog } from './catalog.ts';
import type { Ctx } from './conditions.ts';
import { evalCondition } from './conditions.ts';
import type { Conflict } from './recheck.ts';
import type { Slot } from './shop.ts';
import { fill } from './text.ts';
import type { Concept, Lead, PrepItem, Product, ResearchText } from './types.ts';

export interface ResearchItem extends ResearchText {
  id: string;
  source: 'rule' | 'conflict' | 'empty-slot' | 'index';
}

export interface StuckNote {
  /** 상품에서 온 메모면 상품 id, 규칙에서 왔으면 규칙 id */
  from: string;
  text: string;
  concepts: string[];
}

export interface Step {
  /** 칸 id. 중간 서버 준비 단계는 'step.proxy' */
  slotId: string;
  title: string;
  doneWhen: string;
  /** 이 단계에 쓰는 장바구니 상품 id. 비어 있으면 '조사할 것'으로 넘긴 칸 */
  products: string[];
  /** 이 단계 전에 볼 개념 (배울 순서) */
  concepts: string[];
}

export interface Study {
  /** 시작 전 필수 (최대 studyRequiredMax개) */
  required: string[];
  /** 전부 (배울 순서) */
  all: string[];
}

const LEAD_ORDER: Record<Lead, number> = { days: 0, hours: 1, instant: 2 };

/** 조사할 것: 규칙 카드 → 그대로 둔 규칙 충돌 → 그대로 둔 빈 칸 → 색인 상품. id가 같으면 앞의 것만 남긴다. */
export function collectResearch(cat: Catalog, ctx: Ctx, conflicts: Conflict[], slots: Slot[]): ResearchItem[] {
  const out: ResearchItem[] = [];
  const seen = new Set<string>();
  const push = (item: ResearchItem): void => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  };
  const fromCard = (cardId: string, source: ResearchItem['source']): void => {
    const c = cat.card.get(cardId);
    if (!c) throw new Error(`조사 카드가 없습니다: ${cardId}`);
    push({ ...c, source });
  };
  for (const r of cat.data.rules.rules) {
    if (r.type === 'research' && evalCondition(r.when, ctx)) fromCard(r.card, 'rule');
  }
  for (const c of conflicts) {
    if (c.kept && c.kind === 'rule' && c.researchCard) fromCard(c.researchCard, 'conflict');
  }
  const t = cat.data.templates;
  for (const c of conflicts) {
    if (!c.kept || c.kind !== 'empty-slot' || !c.slotId) continue;
    const slot = slots.find((s) => s.id === c.slotId);
    const vars = { label: slot?.label ?? c.slotId };
    push({ id: `research.empty:${c.slotId}`, source: 'empty-slot', ...fillResearch(t.emptySlot.research, vars) });
  }
  for (const p of ctx.cart) {
    if (p.layer !== 'index') continue;
    const vars = { name: p.name, link: p.links[0]?.url ?? '' };
    push({ id: `research.index:${p.id}`, source: 'index', ...fillResearch(t.indexResearch, vars) });
  }
  return out;
}

function fillResearch(r: ResearchText, vars: Record<string, string>): ResearchText {
  return {
    area: fill(r.area, vars),
    what: fill(r.what, vars),
    why: fill(r.why, vars),
    where: r.where.map((w) => fill(w, vars)),
    doneWhen: fill(r.doneWhen, vars),
  };
}

/** 안전 지시: 기본 지시 전부 + 조건이 맞는 안전 규칙 (규칙 순서) */
export function collectSafety(cat: Catalog, ctx: Ctx): { lines: string[]; ruleIds: string[] } {
  const lines = [...cat.data.templates.safetyDefaults];
  const ruleIds: string[] = [];
  for (const r of cat.data.rules.rules) {
    if (r.type === 'safety' && evalCondition(r.when, ctx)) {
      ruleIds.push(r.id);
      if (!lines.includes(r.line)) lines.push(r.line);
    }
  }
  return { lines, ruleIds };
}

/** 예상 막힘: 장바구니 상품의 메모(담은 순서) + 조건이 맞는 막힘 규칙(규칙 순서) */
export function collectStuck(cat: Catalog, ctx: Ctx): StuckNote[] {
  const out: StuckNote[] = [];
  for (const p of ctx.cart) {
    for (const text of p.stuck ?? []) out.push({ from: p.id, text, concepts: [] });
  }
  for (const r of cat.data.rules.rules) {
    if (r.type === 'stuck' && evalCondition(r.when, ctx)) out.push({ from: r.id, text: r.text, concepts: r.concepts ?? [] });
  }
  return out;
}

/** 준비물: 오래 걸리는 것(며칠 → 몇 시간 → 바로) 먼저, 같으면 담은 순서. 이름이 같으면 하나만. */
export function collectPrep(cart: Product[]): PrepItem[] {
  const seen = new Set<string>();
  const items: { item: PrepItem; order: number }[] = [];
  let order = 0;
  for (const p of cart) {
    for (const item of p.prep ?? []) {
      if (seen.has(item.label)) continue;
      seen.add(item.label);
      items.push({ item, order: order++ });
    }
  }
  items.sort((a, b) => LEAD_ORDER[a.item.lead] - LEAD_ORDER[b.item.lead] || a.order - b.order);
  return items.map((x) => x.item);
}

/** 개념과 그 선수 개념을 모두 모은다 */
export function withPrerequisites(cat: Catalog, ids: Iterable<string>): Set<string> {
  const out = new Set<string>();
  const visit = (id: string): void => {
    if (out.has(id)) return;
    const c = cat.concept.get(id);
    if (!c) throw new Error(`개념 카드가 없습니다: ${id}`);
    out.add(id);
    for (const pre of c.prerequisites) visit(pre);
  };
  for (const id of ids) visit(id);
  return out;
}

/** 선수 개념이 먼저 오게 줄 세운다. 동시에 배울 수 있으면 order, 그다음 id 순. */
export function topoSort(cat: Catalog, ids: Set<string>): string[] {
  const concepts = [...ids].map((id) => cat.concept.get(id)).filter((c): c is Concept => c !== undefined);
  const indegree = new Map<string, number>();
  for (const c of concepts) indegree.set(c.id, c.prerequisites.filter((p) => ids.has(p)).length);
  const out: string[] = [];
  const ready = (): Concept[] =>
    concepts
      .filter((c) => indegree.get(c.id) === 0 && !out.includes(c.id))
      .sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (;;) {
    const next = ready()[0];
    if (!next) break;
    out.push(next.id);
    for (const c of concepts) {
      if (c.prerequisites.includes(next.id)) indegree.set(c.id, (indegree.get(c.id) ?? 0) - 1);
    }
  }
  if (out.length !== concepts.length) throw new Error('개념 선후 관계에 순환이 있습니다');
  return out;
}

/** 중간 서버 준비 단계의 id (칸이 아닌 단계) */
export const PROXY_STEP = 'step.proxy';

/**
 * 진행 순서: 2차로 미루지 않은 열린 칸 중, 채웠거나 '조사할 것'으로 넘긴 칸만 (칸 순서).
 * 키 노출 위험 상품과 키를 숨겨 주는 상품(proxy)을 함께 담았으면, 키 노출 위험 상품이 처음 나오는
 * 단계 바로 앞에 '중간 서버 준비' 단계를 넣는다. 키를 화면에 넣지 않고 데이터를 붙이게 하려는 것이다.
 * 상품의 필요 개념은 그 상품이 처음 나오는 단계에 붙인다. 개념의 stepHint가 'proxy'이고 중간 서버
 * 단계가 있으면 그 단계에, 다른 기능이고 상품이 그 기능의 칸도 맡으면 그 칸의 단계에 붙인다.
 * 선수 개념은 함께 붙이고, 한 번 붙인 개념은 다시 붙이지 않는다.
 */
export function buildSteps(
  cat: Catalog,
  slots: Slot[],
  cart: Product[],
  conflicts: Conflict[],
  deferred: string[],
  order: string[],
): Step[] {
  const active = slots.filter((s) => {
    if (deferred.includes(s.id)) return false;
    const filled = cart.some((p) => p.capabilities.includes(s.capability));
    const keptEmpty = conflicts.some((c) => c.kind === 'empty-slot' && c.slotId === s.id && c.kept);
    return filled || keptEmpty;
  });
  const fills = (p: Product, s: Slot): boolean => p.capabilities.includes(s.capability);
  const keyed = cart.filter((p) => p.keyExposureRisk && active.some((s) => fills(p, s)));
  const proxies = cart.filter((p) => p.capabilities.includes('proxy'));
  const proxyBefore = keyed.length > 0 && proxies.length > 0 ? active.find((s) => keyed.some((p) => fills(p, s))) : undefined;

  const target = new Map<string, string[]>();
  const aim = (stepId: string, id: string): void => {
    target.set(stepId, [...(target.get(stepId) ?? []), id]);
  };
  for (const p of cart) {
    const mine = active.filter((s) => fills(p, s));
    const first = mine[0];
    if (!first) continue;
    for (const id of p.needsConcepts ?? []) {
      const hint = cat.concept.get(id)?.stepHint;
      if (hint === 'proxy' && proxyBefore) aim(PROXY_STEP, id);
      else aim((hint && mine.find((s) => s.capability === hint)?.id) || first.id, id);
    }
  }

  const plan: { id: string; title: string; doneWhen: string; products: string[] }[] = [];
  for (const s of active) {
    if (proxyBefore && s.id === proxyBefore.id) {
      const t = cat.data.templates.proxyStep;
      plan.push({ id: PROXY_STEP, title: t.title, doneWhen: t.doneWhen, products: proxies.map((p) => p.id) });
    }
    const tpl = cat.data.templates.slotSteps[s.id];
    plan.push({
      id: s.id,
      title: tpl?.title ?? s.label,
      doneWhen: tpl?.doneWhen ?? '',
      products: cart.filter((p) => fills(p, s)).map((p) => p.id),
    });
  }

  const rank = (id: string): number => order.indexOf(id);
  const assigned = new Set<string>();
  return plan.map((step) => {
    const need = withPrerequisites(cat, target.get(step.id) ?? []);
    const concepts = [...need].filter((id) => !assigned.has(id)).sort((a, b) => rank(a) - rank(b));
    for (const id of concepts) assigned.add(id);
    return { slotId: step.id, title: step.title, doneWhen: step.doneWhen, products: step.products, concepts };
  });
}

export function buildStudy(cat: Catalog, products: Product[]): Study {
  const all = topoSort(cat, withPrerequisites(cat, products.flatMap((p) => p.needsConcepts ?? [])));
  const required = all
    .filter((id) => cat.concept.get(id)?.level === 'must')
    .slice(0, cat.data.scoring.studyRequiredMax);
  return { required, all };
}

export function estimateMinutes(cat: Catalog, products: Product[]): number {
  const s = cat.data.scoring;
  return products.reduce((sum, p) => sum + (p.setupMinutes ?? s.unknownSetupMinutes), s.baseMinutes);
}

/** 만들지 않을 것: 조건이 맞는 문장 (적힌 순서, 같은 문장은 하나만) */
export function collectNotBuild(cat: Catalog, ctx: Ctx): string[] {
  const out: string[] = [];
  for (const r of cat.data.templates.notBuildRules) {
    if (evalCondition(r.when, ctx) && !out.includes(r.text)) out.push(r.text);
  }
  return out;
}
