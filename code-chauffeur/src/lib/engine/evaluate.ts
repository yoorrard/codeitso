import type { Catalog } from './catalog.ts';
import { cartProducts } from './catalog.ts';
import type { Ctx } from './conditions.ts';
import type { ResearchItem, Step, StuckNote, Study } from './checkout.ts';
import {
  buildSteps,
  buildStudy,
  collectNotBuild,
  collectPrep,
  collectResearch,
  collectSafety,
  collectStuck,
  estimateMinutes,
} from './checkout.ts';
import type { InterviewState } from './interview.ts';
import { runInterview } from './interview.ts';
import type { Conflict, Split } from './recheck.ts';
import { findConflicts, firstPhaseProducts, orphanProducts, suggestSplit } from './recheck.ts';
import type { SlotRanking } from './shop.ts';
import { buildSlots, rankSlot } from './shop.ts';
import type { PrepItem, Product, Session } from './types.ts';

export interface EngineResult {
  session: Session;
  interview: InterviewState;
  done: boolean;
  cart: Product[];
  slots: SlotRanking[];
  conflicts: Conflict[];
  /** 모든 충돌을 고쳤거나 '그대로 두기'를 골랐으면 영수증을 뽑을 수 있다 */
  canIssue: boolean;
  split: Split;
  orphans: string[];
  research: ResearchItem[];
  safety: { lines: string[]; ruleIds: string[] };
  stuck: StuckNote[];
  prep: PrepItem[];
  study: Study;
  steps: Step[];
  minutes: number;
  notBuild: string[];
}

/** 받은 상태를 정리한다: 모르는 상품·충돌·칸은 버리고, 2차로 미룰 수 없는 칸은 뺀다. */
export function normalizeSession(cat: Catalog, s: Partial<Session>): Session {
  const answers: Record<string, string> = {};
  for (const [qid, oid] of Object.entries(s.answers ?? {})) {
    const q = cat.question.get(qid);
    if (q && q.options.some((o) => o.id === oid)) answers[qid] = oid;
  }
  const cart = cartProducts(cat, s.cart ?? []).map((p) => p.id);
  const strings = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === 'string') : []);
  const out: Session = {
    answers,
    cart,
    kept: [...new Set(strings(s.kept))],
    deferred: [...new Set(strings(s.deferred))],
  };
  if (typeof s.freeText === 'string') out.freeText = s.freeText;
  return out;
}

/** 인터뷰부터 계산대까지 한 번에 계산한다. 화면은 이 결과만 읽는다. */
export function evaluate(cat: Catalog, input: Partial<Session>): EngineResult {
  const base = normalizeSession(cat, input);
  const interview = runInterview(cat, base.answers);
  const cart = cartProducts(cat, base.cart);
  const slotCtx: Ctx = { tags: interview.tags, answers: interview.answers, cart, deferred: [] };
  const slotDefs = buildSlots(cat, slotCtx);
  const deferrable = new Set(slotDefs.filter((s) => s.deferrable).map((s) => s.id));
  const session: Session = { ...base, deferred: base.deferred.filter((id) => deferrable.has(id)) };
  const ctx: Ctx = { ...slotCtx, deferred: session.deferred };

  const slots = slotDefs.map((s) => rankSlot(cat, s, interview.tags, cart, slotDefs));
  const conflicts = findConflicts(cat, session, ctx, slotDefs);
  const live = new Set(conflicts.filter((c) => c.keepable).map((c) => c.id));
  session.kept = session.kept.filter((id) => live.has(id));
  const canIssue = interview.next === null && conflicts.every((c) => c.kept);

  const first = firstPhaseProducts(cart, slotDefs, session.deferred);
  const study = buildStudy(cat, first);
  return {
    session,
    interview,
    done: interview.next === null,
    cart,
    slots,
    conflicts,
    canIssue,
    split: suggestSplit(cat, cart, slots, session.deferred),
    orphans: orphanProducts(cart, slotDefs),
    research: collectResearch(cat, ctx, conflicts, slotDefs),
    safety: collectSafety(cat, ctx),
    stuck: collectStuck(cat, ctx),
    prep: collectPrep(first),
    study,
    steps: buildSteps(cat, slotDefs, first, conflicts, session.deferred, study.all),
    minutes: estimateMinutes(cat, first),
    notBuild: collectNotBuild(cat, ctx),
  };
}
