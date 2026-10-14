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
import { CUSTOM_TOOLS_MAX, normalizeCustomTools, normalizeGaps, normalizeNotes } from './custom.ts';
import { toolsToSetUp, withBuilderPublish } from './builder.ts';
import { normalizeLookShape } from './look-choice.ts';
import type { PrepItem, Product, Session } from './types.ts';

export interface EngineResult {
  session: Session;
  interview: InterviewState;
  done: boolean;
  cart: Product[];
  slots: SlotRanking[];
  conflicts: Conflict[];
  /** 모든 충돌(막힌 곳)을 고쳤거나 '그대로 가기'를 골랐으면 출발할 수 있다 (도착에서 영수증과 설계도를 받는다) */
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

/**
 * 받은 상태를 정리한다: 모르는 상품·충돌·칸은 버리고, 나중으로 미룰 수 없는 칸은 뺀다.
 * 직접 쓴 것(D74): 내 말은 있는 질문만 한 줄 40자, 직접 쓴 도구는 모양이 맞는 5개까지(장바구니의 custom-n은
 * 그 도구가 있을 때만), 빈틈은 조사 카드가 있는 id만. 디자인(look, T38)은 모양만. 비어 있는 칸은 만들지 않는다(옛 세션 모양 그대로).
 */
export function normalizeSession(cat: Catalog, s: Partial<Session>): Session {
  const answers: Record<string, string> = {};
  for (const [qid, oid] of Object.entries(s.answers ?? {})) {
    const q = cat.question.get(qid);
    if (q && q.options.some((o) => o.id === oid)) answers[qid] = oid;
  }
  const customTools = normalizeCustomTools(s.customTools);
  const cart = cartProducts(cat, s.cart ?? [], customTools).map((p) => p.id);
  const strings = (xs: unknown): string[] => (Array.isArray(xs) ? xs.filter((x): x is string => typeof x === 'string') : []);
  const out: Session = {
    answers,
    cart,
    kept: [...new Set(strings(s.kept))],
    deferred: [...new Set(strings(s.deferred))],
  };
  // 한 줄은 그대로 둔다: 화면의 한 줄 칸이 이 값을 그대로 보이므로, 정리하면 쓰는 중에 칸이 띄어쓰기를 먹는다.
  // 줄바꿈·앞뒤 공백·80자(LINE_MAX) 정리는 쓰는 곳(설계도·이름)이 oneLine으로 한다
  if (typeof s.freeText === 'string') out.freeText = s.freeText;
  const notes = normalizeNotes(cat, s.notes);
  if (Object.keys(notes).length > 0) out.notes = notes;
  if (customTools.length > 0) out.customTools = customTools;
  const gaps = normalizeGaps(cat, s.gaps);
  if (gaps.length > 0) out.gaps = gaps;
  // 디자인 (T38): 모양만 고른다. looks.json에 없는 id는 디자인 묶음(look.ts normalizeLook)이 버린다
  const look = normalizeLookShape(s.look);
  if (look) out.look = look;
  return out;
}

/** 만들 앱 정하기 질문부터 설계도 받기까지 한 번에 계산한다. 화면은 이 결과만 읽는다. */
export function evaluate(cat: Catalog, input: Partial<Session>): EngineResult {
  const base = normalizeSession(cat, input);
  const interview = runInterview(cat, base.answers);
  const picked = cartProducts(cat, base.cart, base.customTools);
  const slotDefs = buildSlots(cat, { tags: interview.tags, answers: interview.answers, cart: picked, deferred: [] });
  // 웹에서 만드는 도구면 공개 칸을 빌더의 게시 기능이 채운다 (B-02). 세션 장바구니에는 넣지 않는다(고른 것이 아니므로)
  const cart = withBuilderPublish(cat, picked, slotDefs, interview.tags);
  const tools = toolsToSetUp(cart);
  const deferrable = new Set(slotDefs.filter((s) => s.deferrable).map((s) => s.id));
  const session: Session = { ...base, deferred: base.deferred.filter((id) => deferrable.has(id)) };
  const ctx: Ctx = { tags: interview.tags, answers: interview.answers, cart, deferred: session.deferred };

  const slots = slotDefs.map((s) => rankSlot(cat, s, interview.tags, cart, slotDefs, base.customTools));
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
    // 난이도와 예상 시간은 붙일 도구만 센다 (빌더의 게시 기능은 쓰던 빌더 안의 기능)
    split: suggestSplit(cat, tools, slots, session.deferred),
    orphans: orphanProducts(cart, slotDefs),
    research: collectResearch(cat, ctx, conflicts, slotDefs, session),
    safety: collectSafety(cat, ctx),
    stuck: collectStuck(cat, ctx),
    prep: collectPrep(first),
    study,
    steps: buildSteps(cat, slotDefs, first, conflicts, session.deferred, study.all),
    minutes: estimateMinutes(cat, toolsToSetUp(first)),
    notBuild: collectNotBuild(cat, ctx),
  };
}

/**
 * 막힌 곳 하나가 그 기능을 직접 쓴 도구로 바꾸면 풀리는가 (3단계 '바꾸기' 끝의 [목록에 없는 도구 쓰기 ›]를 보일지, 설계서 7.1·7.5절).
 * 그 칸을 맡던 도구를 빼고(다른 칸을 혼자 맡고 있으면 남긴다: 도구 고르기에서 정할 때와 같다) 이름 없는 직접 쓴 도구를 넣어 다시 계산한다.
 * 직접 쓴 도구의 모르는 사실은 규칙 조건에서 '맞지 않음'이라 대부분 풀리지만, 서버 위치('모름')로 켜지는 개인정보 막힌 곳이나
 * 다른 도구 때문에 켜지는 키 노출 막힌 곳은 그대로다. 기능에 붙지 않은 막힌 곳, 직접 쓴 도구를 더 둘 수 없을 때(5개)는 false
 */
export function customToolClears(cat: Catalog, r: EngineResult, conflictId: string): boolean {
  const c = r.conflicts.find((x) => x.id === conflictId);
  const slotId = c?.slotId ?? c?.anchorSlot;
  const ranking = r.slots.find((s) => s.slot.id === slotId);
  if (!c || c.kept || !ranking) return false;
  const tools = r.session.customTools ?? [];
  const id = Array.from({ length: CUSTOM_TOOLS_MAX }, (_, i) => `custom-${i + 1}`).find((x) => !tools.some((t) => t.id === x));
  if (id === undefined) return false;
  const others = r.slots.filter((s) => s.slot.id !== ranking.slot.id);
  let cart = cartProducts(cat, r.session.cart, tools);
  for (const old of cart.filter((p) => ranking.filledBy.includes(p.id))) {
    const rest = cart.filter((p) => p.id !== old.id);
    const alone = others.some((s) => old.capabilities.includes(s.slot.capability) && !rest.some((x) => x.capabilities.includes(s.slot.capability)));
    if (!alone) cart = rest;
  }
  const trial = evaluate(cat, {
    ...r.session,
    customTools: [...tools, { id, name: '', capability: ranking.slot.capability }],
    cart: [...cart.map((p) => p.id), id],
  });
  return !trial.conflicts.some((x) => x.id === conflictId && !x.kept);
}
