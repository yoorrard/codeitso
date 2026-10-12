import type { Catalog } from './catalog.ts';
import { evalCondition } from './conditions.ts';
import type { Question } from './types.ts';

export interface InterviewState {
  /** 지금 답에 따라 보이는 질문 (적힌 순서) */
  visible: Question[];
  /** 보이는 질문에 한 유효한 답만 */
  answers: Record<string, string>;
  /** 태그 → 합계 */
  tags: Record<string, number>;
  /** 다음에 물을 질문. 없으면 인터뷰 끝 */
  next: Question | null;
  answered: number;
  total: number;
}

/**
 * 질문을 적힌 순서대로 훑으며, 노출 조건(showIf)이 맞는 질문만 센다.
 * 앞 질문의 답을 바꿔 숨겨진 질문의 답은 지우지 않고 무시한다 (되돌리면 다시 살아난다).
 */
export function runInterview(cat: Catalog, rawAnswers: Record<string, string>): InterviewState {
  const tags: Record<string, number> = {};
  const answers: Record<string, string> = {};
  const visible: Question[] = [];
  for (const q of cat.data.questions.questions) {
    if (q.showIf && !evalCondition(q.showIf, { tags, answers, cart: [], deferred: [] })) continue;
    visible.push(q);
    const chosen = rawAnswers[q.id];
    if (chosen === undefined) continue;
    const opt = q.options.find((o) => o.id === chosen);
    if (!opt) continue;
    answers[q.id] = chosen;
    for (const [tag, v] of Object.entries(opt.tags)) tags[tag] = (tags[tag] ?? 0) + v;
  }
  const next = visible.find((q) => answers[q.id] === undefined) ?? null;
  return { visible, answers, tags, next, answered: Object.keys(answers).length, total: visible.length };
}

/** 인터뷰 화면 위 '좁혀지는 중' 칩: 답한 질문의 짧은 이름과 고른 보기 */
export function answerChips(cat: Catalog, state: InterviewState): { questionId: string; chip: string; label: string }[] {
  const out: { questionId: string; chip: string; label: string }[] = [];
  for (const q of state.visible) {
    const a = state.answers[q.id];
    if (a === undefined) continue;
    const opt = q.options.find((o) => o.id === a);
    if (!opt) continue;
    out.push({ questionId: q.id, chip: q.chip ?? q.text, label: opt.label });
  }
  return out;
}

/**
 * 지금까지의 답과 어긋나지 않는 레시피. 같은 답이 많은 순, 같으면 레시피 순서.
 * '혹시 이걸 만드시나요?' 미리보기에 쓴다. '모르겠어요'(isUnknown) 답은 어긋남으로도 같은 답으로도 세지 않는다.
 */
export function matchingRecipes(cat: Catalog, state: InterviewState, limit = 2): string[] {
  const scored: { id: string; same: number; index: number }[] = [];
  const unknown = (qid: string, a: string): boolean => cat.question.get(qid)?.options?.find((o) => o.id === a)?.isUnknown === true;
  cat.data.recipes.recipes.forEach((r, index) => {
    let same = 0;
    for (const [qid, a] of Object.entries(state.answers)) {
      const ra = r.answers[qid];
      if (ra === undefined || unknown(qid, a)) continue;
      if (ra !== a) return;
      same += 1;
    }
    if (same > 0) scored.push({ id: r.id, same, index });
  });
  scored.sort((x, y) => y.same - x.same || x.index - y.index);
  return scored.slice(0, limit).map((s) => s.id);
}
