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
  /** 다음에 물을 질문. 없으면 만들 앱 정하기 질문 끝 */
  next: Question | null;
  answered: number;
  total: number;
}

/**
 * 질문을 적힌 순서대로 훑으며, 노출 조건(showIf)이 맞는 질문만 센다.
 * 앞 질문의 답을 바꿔 숨겨진 질문의 답은 지우지 않고 무시한다 (되돌리면 다시 살아난다).
 *
 * 고르지 않아도 되는 질문(optional, '쓰는 AI')은 차례가 오면 다른 질문처럼 묻는다(next).
 * 하지만 답하지 않은 채 다른 질문을 다 마쳤으면(미리 짠 코스, v3 전의 저장·영수증 링크) 보이는 질문에서 빼고
 * 끝난 것으로 본다. 그 답은 '모르겠어요' 보기('아직 안 정했어요')와 같고, 태그는 점수에 쓰지 않는다(D87).
 */
export function runInterview(cat: Catalog, rawAnswers: Record<string, string>): InterviewState {
  const tags: Record<string, number> = {};
  const answers: Record<string, string> = {};
  let visible: Question[] = [];
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
  const open = (q: Question): boolean => answers[q.id] === undefined;
  if (!visible.some((q) => q.optional !== true && open(q))) visible = visible.filter((q) => !(q.optional === true && open(q)));
  const next = visible.find(open) ?? null;
  return { visible, answers, tags, next, answered: Object.keys(answers).length, total: visible.length };
}

/** 직접 쓴 답 칩의 이름: 내 말 앞 20자를 따옴표로 (넘치면 …) */
const CHIP_NOTE_MAX = 20;

/**
 * 만들 앱 정하기 화면의 '지금까지 정한 것' 칩: 답한 질문의 짧은 이름과 고른 보기 (설계도 1번 '고른 답'에도 쓴다).
 * 직접 쓰기를 그대로 둔 답은 보기 이름('직접 쓰기') 대신 내 말 “앞 20자…”, 내 말이 없으면(영수증 링크로 받음)
 * templates.customAnswer.hidden. 보기를 골랐으면 내 말이 있어도 보기 이름 그대로 (내 말은 설계도 1번 아래 줄에 따로).
 */
export function answerChips(
  cat: Catalog,
  state: InterviewState,
  notes: Record<string, string> = {},
): { questionId: string; chip: string; label: string }[] {
  const out: { questionId: string; chip: string; label: string }[] = [];
  for (const q of state.visible) {
    const a = state.answers[q.id];
    if (a === undefined) continue;
    const opt = q.options.find((o) => o.id === a);
    if (!opt) continue;
    out.push({ questionId: q.id, chip: q.chip ?? q.text, label: opt.isCustom ? customLabel(cat, notes[q.id]) : opt.label });
  }
  return out;
}

function customLabel(cat: Catalog, note: string | undefined): string {
  if (!note) return cat.data.templates.customAnswer.hidden;
  const chars = [...note];
  return `“${chars.slice(0, CHIP_NOTE_MAX).join('')}${chars.length > CHIP_NOTE_MAX ? '…' : ''}”`;
}

/**
 * 지금까지의 답과 어긋나지 않는 레시피(화면: 미리 짠 코스). 같은 답이 많은 순, 같으면 레시피 순서.
 * '혹시 이걸 만드시나요?' 미리보기에 쓴다. '모르겠어요'(isUnknown)·직접 쓰기(isCustom) 답은 어긋남으로도 같은 답으로도 세지 않는다.
 */
export function matchingRecipes(cat: Catalog, state: InterviewState, limit = 2): string[] {
  const scored: { id: string; same: number; index: number }[] = [];
  // 직접 쓰기(isCustom)도 '모르겠어요'처럼 센다: 보기에 없는 답이라 레시피와 같은지 어긋나는지 알 수 없다
  const unknown = (qid: string, a: string): boolean => {
    const o = cat.question.get(qid)?.options?.find((x) => x.id === a);
    return o?.isUnknown === true || o?.isCustom === true;
  };
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
