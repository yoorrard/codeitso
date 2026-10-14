// 직접 쓰기 칸의 검사·결과 꼴·찾기 묶음 불러오기 (T37, 설계서 7.2절, input.md 4.2·4.3절). 순수 함수 (시험 있음).
// 화면 문구는 ko.ts가, 낱말 찾기는 지연 모듈 custom-match.ts(엔진 match.ts + 낱말표)가 맡는다.
import { CUSTOM_TOOLS_MAX, fill, oneLine } from './engine/index.ts';
import type { Capability, CustomTool, Option, Question, Session } from './engine/types.ts';
import { josa } from './josa.ts';

export type TextError = 'empty' | 'tooLong';

export interface TextCheck {
  /** 한 줄로 정리한 글 (줄바꿈·탭은 한 칸, 앞뒤 공백 지움). 저장하는 글이다 */
  text: string;
  /** 정리한 글의 코드 포인트 수 */
  count: number;
  /** 한도를 넘은 글자 수 (넘지 않으면 0) */
  over: number;
  error: TextError | null;
}

/** 길이는 oneLine 뒤 코드 포인트로 센다. 칸에 maxlength를 두지 않고, 넘으면 자르지 않고 알린다 (input.md 4.3절) */
export function checkText(raw: string, max: number): TextCheck {
  const text = oneLine(raw, Number.POSITIVE_INFINITY);
  const count = [...text].length;
  const over = Math.max(0, count - max);
  return { text, count, over, error: count === 0 ? 'empty' : over > 0 ? 'tooLong' : null };
}

/** 한글 조합을 끝내는 Enter인가 (그 Enter로는 확인하지 않는다. Safari는 isComposing 없이 keyCode 229를 준다) */
export function composingKey(e: { isComposing?: boolean; keyCode?: number }): boolean {
  return e.isComposing === true || e.keyCode === 229;
}

export type ResultKind = 'one' | 'many' | 'none';

/** 찾은 결과 넷 중 셋 (빈틈 알림은 어느 꼴에나 함께 붙는다) */
export function resultKind(m: { suggestions: unknown[] }): ResultKind {
  return m.suggestions.length === 0 ? 'none' : m.suggestions.length === 1 ? 'one' : 'many';
}

/** 결과 문장의 찾은 말: 여럿이면 '로그인'·'없이' 꼴 (문장 틀이 바깥 따옴표를 둔다. 화면 문구는 곧은 따옴표 하나로 쓴다) */
export function foundWords(words: string[]): string {
  return words.join("'·'");
}

/** 질문의 '직접 쓰기' 보기 (질문마다 하나, 자료 검사가 지킨다) */
export function customOf(q: Question): Option | undefined {
  return q.options.find((o) => o.isCustom === true);
}

/** 보기마다 도구 이름인 질문('쓰는 AI'): 직접 쓰기 칸은 도구 이름이라 맞춤법 검사를 끈다 */
export function isNameQuestion(q: Question): boolean {
  return q.options.some((o) => o.aiTool !== undefined);
}

/** 못 찾았을 때 다시 보일 보기: 질문의 보기('직접 쓰기' 빼고)가 6개 이하일 때만 (목록 위로 굴리지 않고 고르게) */
export const RESHOW_MAX = 6;
export function reshown(q: Question): Option[] {
  const options = q.options.filter((o) => o.isCustom !== true);
  return options.length <= RESHOW_MAX ? options : [];
}

/**
 * 그대로 둘 때의 계산 한 줄 (설계서 7.4절): 보기에 keep 문장이 있으면 그 문장(앱 종류·가져올 정보),
 * 아니면 like 보기 이름을 틀에 넣는다 ("'모르겠어요'와 같게 계산하고, …", '쓰는 AI'는 '아직 안 정했어요')
 */
export function keepLine(q: Question, custom: Option, likeTemplate: string): string {
  if (custom.keep) return custom.keep;
  const like = q.options.find((o) => o.id === custom.like) ?? q.options.find((o) => o.isUnknown === true);
  return fill(likeTemplate, { likeAnd: josa(`'${like?.label ?? ''}'`, 'and') });
}

/** 질문 하나의 내 말을 넣거나(text) 지운(null) 새 notes */
export function withNote(notes: Record<string, string> | undefined, questionId: string, text: string | null): Record<string, string> {
  const out = { ...(notes ?? {}) };
  if (text === null) delete out[questionId];
  else out[questionId] = text;
  return out;
}

// ── 목록에 없는 도구 (2단계, 설계서 7.5절, input.md 8.1절) ─────────────────────

/** 이름 견주기 꼴: 띄어쓰기·대소문자 무시 (엔진 normalizeCustomTools와 같은 규칙) */
const toolKey = (name: string): string => name.toLowerCase().replace(/\s+/g, '');

/** 새 직접 쓴 도구의 id: custom-1~5 가운데 비어 있는 가장 작은 번호. 5개를 다 썼으면 null */
export function nextCustomId(tools: readonly Pick<CustomTool, 'id'>[]): string | null {
  for (let k = 1; k <= CUSTOM_TOOLS_MAX; k++) {
    const id = `custom-${k}`;
    if (!tools.some((t) => t.id === id)) return id;
  }
  return null;
}

/** 도구 이름 칸을 [확인]할 때 더 보는 것: 5개를 다 씀 → 'limit', 같은 이름을 이미 씀 → 'duplicate' */
export function toolNameProblem(tools: readonly Pick<CustomTool, 'id' | 'name'>[], name: string): 'limit' | 'duplicate' | null {
  if (tools.some((t) => toolKey(t.name) === toolKey(name))) return 'duplicate';
  return nextCustomId(tools) === null ? 'limit' : null;
}

/** 직접 쓴 도구 하나를 더한 세션 조각 (장바구니에는 넣지 않는다: 아래 막대 [{도구}로 정하기]가 넣는다) */
export function withCustomTool(s: Pick<Session, 'customTools'>, name: string, capability: Capability): { customTools: CustomTool[]; id: string } | null {
  const tools = s.customTools ?? [];
  const id = nextCustomId(tools);
  if (id === null || toolNameProblem(tools, name) !== null) return null;
  return { customTools: [...tools, { id, name, capability }], id };
}

/** 직접 쓴 도구 하나를 지운 세션 조각 (장바구니에서도 뺀다) */
export function withoutCustomTool(s: Pick<Session, 'customTools' | 'cart'>, id: string): Pick<Session, 'customTools' | 'cart'> {
  return { customTools: (s.customTools ?? []).filter((t) => t.id !== id), cart: s.cart.filter((x) => x !== id) };
}

// ── 찾기 묶음 (지연 모듈) ─────────────────────────────────────
export type Matcher = typeof import('./custom-match.ts');
let pending: Promise<Matcher> | null = null;
let ready: Matcher | null = null;

/** 직접 쓰기 칸을 처음 펼칠 때 한 번 받는다. 실패하면 다음에 다시 해 본다 (그동안 화면은 '못 찾음'으로 고르거나 그대로 두게 한다) */
export function loadMatcher(): Promise<Matcher> {
  pending ??= import('./custom-match.ts').then(
    (m) => (ready = m),
    (e: unknown) => {
      pending = null;
      throw e;
    },
  );
  return pending;
}

/** 이미 받은 찾기 묶음 (아직이면 null) */
export function matcherNow(): Matcher | null {
  return ready;
}

// 도구 이름 찾기 묶음 (2단계 '목록에 없는 도구 쓰기'): 도구 짐작 말 + 빈틈만 싣는 따로 된 지연 모듈 (tool-match.ts)
export type ToolMatcher = typeof import('./tool-match.ts');
let toolPending: Promise<ToolMatcher> | null = null;
let toolReady: ToolMatcher | null = null;

/** 도구 이름 칸을 처음 펼칠 때 한 번 받는다. 실패하면 다음에 다시 해 본다 (그동안은 '못 찾음'으로 그대로 두게 한다) */
export function loadToolMatcher(): Promise<ToolMatcher> {
  toolPending ??= import('./tool-match.ts').then(
    (m) => (toolReady = m),
    (e: unknown) => {
      toolPending = null;
      throw e;
    },
  );
  return toolPending;
}

/** 이미 받은 도구 이름 찾기 묶음 (아직이면 null) */
export function toolMatcherNow(): ToolMatcher | null {
  return toolReady;
}
