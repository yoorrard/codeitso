// 낱말 찾기 (T36, docs/review/v3/input.md 6절). AI가 아니다: 직접 쓴 글을 낱말표(data/aliases.json)와 견줘
// 가까운 보기·도구를 제안할 뿐이다. 결과는 화면에만 쓰고 evaluate()에는 들어가지 않는다(세션에는 이용자가
// 누른 보기와 쓴 글만 들어간다). 화면은 직접 쓰기 칸을 처음 열 때 이 파일과 낱말표를 import()로 늦게 받는다
// (엔진 index.ts에서 내보내지 않는다). 순수 함수: DOM·시각·난수 없음.
import type { AliasEntry, Aliases } from '../aliases.ts';
import { aliasKey, normalizeWords } from '../aliases.ts';
import type { Catalog } from './catalog.ts';
import type { EngineResult } from './evaluate.ts';

export interface AliasHit {
  /** 낱말표 한 줄의 id */
  id: string;
  /** 찾은 말 (낱말표에 적힌 꼴, 앞의 '='는 뺌) */
  word: string;
  /** 공백을 뺀 글에서의 자리 [start, end) */
  start: number;
  end: number;
}

export interface Suggestion {
  optionId: string;
  /** 찾은 서로 다른 말의 개수 */
  score: number;
  words: string[];
}

export interface AnswerMatch {
  /** 0~3개, 점수 순. 이용자가 고르거나 내 말 그대로 둔다 (저절로 고르지 않는다) */
  suggestions: Suggestion[];
  /** 영문 자판으로 친 글을 한글로 되돌려 읽었을 때 그 글 */
  readAs?: string;
  /** 찾은 빈틈 id (aliases.json gaps, 자료 순서) */
  gaps: string[];
}

export interface ToolMatch {
  /** 이미 목록에 있는 도구. slots: 그 도구가 보이는 열린 칸, inSlot: 이 칸에 있는지 */
  same: { productId: string; word: string; inSlot: boolean; slots: string[] } | null;
  /** 같은 갈래의 확인된 진열 도구 (최대 2개). inSlot이면 이 칸의 순위 순서, 아니면 카탈로그 자료 순서 */
  near: { hintId: string; productIds: string[]; inSlot: boolean } | null;
  gaps: string[];
}

/** 정규화한 글(spaced)과 공백을 뺀 글(compact), compact 글자마다 어절 시작·끝, spaced에서의 자리 */
export function normalizeForMatch(text: string): { spaced: string; compact: string; starts: boolean[]; ends: boolean[]; pos: number[] } {
  const spaced = normalizeWords(text);
  let compact = '';
  const starts: boolean[] = [];
  const ends: boolean[] = [];
  const pos: number[] = [];
  for (let i = 0; i < spaced.length; i += 1) {
    if (spaced[i] === ' ') continue;
    compact += spaced[i];
    starts.push(i === 0 || spaced[i - 1] === ' ');
    ends.push(i === spaced.length - 1 || spaced[i + 1] === ' ');
    pos.push(i);
  }
  return { spaced, compact, starts, ends, pos };
}

/**
 * 공백을 뺀 글에서 낱말표의 말을 모두 찾고, 긴 말부터 겹치지 않게 남긴다 (같으면 앞 자리, 그다음 자료 순서).
 * '='로 시작하는 말은 어절 전체가 같을 때만 맞는다. 한 칸에서 쓰는 낱말표를 한 번에 넘겨야 '업비트'가 '비트'를 이긴다.
 */
export function findAliases(text: string, entries: AliasEntry[]): AliasHit[] {
  const n = normalizeForMatch(text);
  const all: (AliasHit & { order: number })[] = [];
  for (const e of entries) {
    for (const a of e.aliases) {
      const { key, whole } = aliasKey(a);
      if (!key) continue;
      for (let i = n.compact.indexOf(key); i >= 0; i = n.compact.indexOf(key, i + 1)) {
        const end = i + key.length;
        if (whole && !(n.starts[i] && n.ends[end - 1])) continue;
        all.push({ id: e.id, word: whole ? a.slice(1) : a, start: i, end, order: all.length });
      }
    }
  }
  all.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start || a.order - b.order);
  const used: boolean[] = [];
  const kept: AliasHit[] = [];
  for (const h of all) {
    if (used.slice(h.start, h.end).some(Boolean)) continue;
    for (let i = h.start; i < h.end; i += 1) used[i] = true;
    kept.push({ id: h.id, word: h.word, start: h.start, end: h.end });
  }
  return kept.sort((a, b) => a.start - b.start);
}

// 읽는 법이 정해진 질문 (input.md 5.4·5.5). 보기 id가 질문에 없으면 그 제안은 하지 않는다
const BUDGET = { q: 'q.budget', free: 'free-only', small: 'small', more: 'more', line: 10000 };
const PERIOD = { q: 'q.realtime', fast: 'realtime', slow: 'daily' };
const AI_Q = 'q.ai';
/** AI 이름 무리 → q.ai 보기 (앞 무리가 이긴다) */
const AI_PICK: [kind: string, option: string][] = [
  ['agent', 'agent'],
  ['builder', 'builder'],
  ['paid', 'chat-paid'],
  ['chat', 'chat-free'],
  ['free', 'chat-free'],
];

const MONEY = /(?<![\d,])(\d[\d,]*)\s*(천|만)?\s*원|(?<![\d,])(\d[\d,]*)\s*(천|만)/;
/**
 * 기간 → 한 달로 바꾸는 배수 (적힌 순서로 본다: '일주일'이 '일'보다 먼저).
 * 한 달 말이 있으면 한 달이 이긴다 ('작년에 쓴 만큼 월 3만원'). '년'·'연'·'월'·'달'은 숫자 바로 뒤나 따로 선 어절일 때만 받는다
 * ('청소년'·'작년'·'월요일' 속 글자는 기간이 아니다)
 */
const PER: [RegExp, number][] = [
  [/(?:^|[\s/])(?:월|달)(?:에|마다)?(?=[\s\d]|$)|한\s*달|매달|달마다|매월|월간/, 1],
  [/\d+\s*년|(?:^|[\s/])(?:한\s*)?년(?:에|마다|간)?(?=[\s\d]|$)|연간|매년|(?:^|[\s/])연(?=[\s\d])/, 1 / 12],
  [/일주일|매주|(\d+\s*)?주(일|에|마다)/, 4],
  [/하루|매일|날마다|(\d+\s*)?일(에|마다)/, 30],
];

function money(text: string): { won: number; words: string[] } | null {
  const t = text.normalize('NFKC');
  const m = MONEY.exec(t);
  if (!m) return null;
  const unit = m[2] ?? m[4];
  const base = Number((m[1] ?? m[3] ?? '').replace(/,/g, '')) * (unit === '천' ? 1000 : unit === '만' ? 10000 : 1);
  const per = PER.map(([re, k]) => ({ m: re.exec(t), k })).find((x) => x.m !== null);
  const found = [{ at: m.index, w: m[0] }];
  if (per?.m) found.push({ at: per.m.index, w: per.m[0] });
  return { won: Math.round(base * (per?.k ?? 1)), words: found.sort((a, b) => a.at - b.at).map((x) => x.w.trim()) };
}

/** 돈 단위가 붙은 숫자를 한 달 기준 원으로 읽는다. 숫자가 없으면 null ('1년에'의 1은 돈이 아니다) */
export function readMoney(text: string): number | null {
  return money(text)?.won ?? null;
}

const gapEntries = (al: Aliases, where: string): AliasEntry[] =>
  al.gaps.filter((g) => g.where.includes(where)).map((g) => ({ id: `g:${g.id}`, aliases: g.aliases }));

const gapIds = (al: Aliases, hits: AliasHit[]): string[] => al.gaps.filter((g) => hits.some((h) => h.id === `g:${g.id}`)).map((g) => g.id);

/** 보기마다 찾은 서로 다른 말의 개수 → 가장 긴 말 → 자료 순서. 1개 이상인 보기를 최대 3개 */
function rank(hits: AliasHit[], order: string[]): Suggestion[] {
  const by = new Map<string, { words: string[]; long: number }>();
  for (const h of hits) {
    const s = by.get(h.id) ?? { words: [], long: 0 };
    if (!s.words.includes(h.word)) s.words.push(h.word);
    s.long = Math.max(s.long, h.end - h.start);
    by.set(h.id, s);
  }
  return [...by]
    .sort(([a, x], [b, y]) => y.words.length - x.words.length || y.long - x.long || order.indexOf(a) - order.indexOf(b))
    .slice(0, 3)
    .map(([optionId, s]) => ({ optionId, score: s.words.length, words: s.words }));
}

/** 주제어 바로 뒤(공백 뺀 negWindow 글자 안)에 부정 조각이 오는가. '안 '처럼 띄어쓰기가 든 조각을 보려고 spaced 글에서 본다 */
function negated(n: ReturnType<typeof normalizeForMatch>, h: AliasHit, al: Aliases): boolean {
  let win = '';
  let count = 0;
  for (const ch of n.spaced.slice((n.pos[h.end - 1] ?? 0) + 1)) {
    if (ch !== ' ' && count++ === al.yesNo.negWindow) break;
    win += ch;
  }
  return al.yesNo.negAfter.some((f) => win.includes(f));
}

function core(cat: Catalog, al: Aliases, qid: string, text: string): AnswerMatch {
  const q = cat.question.get(qid);
  if (!q) return { suggestions: [], gaps: [] };
  const has = (id: string): boolean => q.options.some((o) => o.id === id && o.isCustom !== true);
  const one = (id: string, words: string[]): Suggestion[] => (has(id) ? [{ optionId: id, score: 1, words }] : []);

  const topics = al.yesNo.topics[qid];
  if (topics) {
    // 예·아니요 (6.5): 아니요 말·부정된 주제어 → 모름 말 → 아마 말 → 예 말·주제어
    const hits = findAliases(text, [{ id: 't', aliases: topics }, ...al.yesNo.answers]);
    const n = normalizeForMatch(text);
    const neg = hits.some((h) => h.id === 't' && negated(n, h, al));
    const words = (id: string): string[] => hits.filter((h) => h.id === id || h.id === 't').map((h) => h.word);
    const pick = neg ? 'no' : al.yesNo.answers.find((a) => hits.some((h) => h.id === a.id))?.id ?? (hits.length > 0 ? 'yes' : null);
    return { suggestions: pick ? one(pick, words(pick)) : [], gaps: [] };
  }
  if (qid === AI_Q) {
    const hits = findAliases(text, al.aiNames);
    const p = AI_PICK.find(([kind]) => hits.some((h) => h.id === kind));
    return { suggestions: p ? one(p[1], hits.map((h) => h.word)) : [], gaps: [] };
  }
  if (qid === BUDGET.q) {
    const m = money(text);
    if (m) return { suggestions: one(m.won === 0 ? BUDGET.free : m.won < BUDGET.line ? BUDGET.small : BUDGET.more, m.words), gaps: [] };
  }
  if (qid === PERIOD.q) {
    const s = normalizeWords(text);
    const fast = /\d+\s*(초|분|시간)/.exec(s);
    const slow = /\d+\s*(일|주|달|개월)/.exec(s);
    if (fast) return { suggestions: one(PERIOD.fast, [fast[0]]), gaps: [] };
    if (slow) return { suggestions: one(PERIOD.slow, [slow[0]]), gaps: [] };
  }
  const order = q.options.filter((o) => o.isUnknown !== true && o.isCustom !== true).map((o) => o.id);
  const options = (al.options[qid] ?? []).filter((e) => order.includes(e.id));
  const hits = findAliases(text, [...options, ...gapEntries(al, qid)]);
  return { suggestions: rank(hits.filter((h) => !h.id.startsWith('g:')), order), gaps: gapIds(al, hits) };
}

/**
 * 질문의 직접 쓰기 글에서 가까운 보기를 찾는다 (input.md 6.2~6.8). 아무것도 못 찾았고 글이 영문 글자와 공백뿐이면
 * 두벌식 자판으로 되돌려(완성 글자 70% 이상일 때) 한 번 더 찾는다.
 */
export function matchAnswer(cat: Catalog, al: Aliases, questionId: string, text: string): AnswerMatch {
  const first = core(cat, al, questionId, text);
  if (first.suggestions.length > 0 || first.gaps.length > 0 || !/^[a-z\s]*[a-z][a-z\s]*$/i.test(text)) return first;
  const hangul = qwertyToHangul(text.trim());
  const letters = [...hangul.replace(/\s/g, '')];
  if (letters.filter((c) => c >= '가' && c <= '힣').length < letters.length * 0.7) return first;
  const again = core(cat, al, questionId, hangul);
  return again.suggestions.length > 0 || again.gaps.length > 0 ? { ...again, readAs: hangul } : first;
}

function toolEntries(cat: Catalog, al: Aliases): AliasEntry[] {
  return [
    ...cat.data.products.products.map((p) => ({ id: `p:${p.id}`, aliases: [p.name] })),
    ...al.toolHints.map((h) => ({ id: `h:${h.id}`, aliases: h.aliases })),
    ...gapEntries(al, 'tool'),
  ];
}

/**
 * 목록에 없는 도구 이름 (input.md 8.1절): 이미 목록에 있는 도구(공식 이름 또는 낱말표의 한글 표기)와,
 * 같은 갈래의 확인된 진열 도구를 찾는다. 순위 계산은 새로 하지 않는다 (지금 칸의 순서를 그대로 쓴다).
 */
export function matchTool(cat: Catalog, al: Aliases, r: EngineResult, slotId: string, text: string): ToolMatch {
  const hits = findAliases(text, toolEntries(cat, al));
  const hint = (h: AliasHit): Aliases['toolHints'][number] | undefined => al.toolHints.find((t) => `h:${t.id}` === h.id);
  let same: ToolMatch['same'] = null;
  let near: ToolMatch['near'] = null;
  for (const h of hits) {
    const productId = h.id.startsWith('p:') ? h.id.slice(2) : hint(h)?.product;
    if (!same && productId) {
      const slots = r.slots.filter((s) => [...s.shelf, ...s.index].some((x) => x.product.id === productId)).map((s) => s.slot.id);
      same = { productId, word: h.word, inSlot: slots.includes(slotId), slots };
    }
    const t = hint(h);
    if (!near && t?.capability) {
      const fits = (p: { capabilities: string[]; domains?: string[] }): boolean =>
        p.capabilities.includes(t.capability ?? '') && (!t.domain || (p.domains ?? []).includes(t.domain));
      const here = r.slots.find((s) => s.slot.id === slotId)?.shelf.map((s) => s.product).filter(fits) ?? [];
      const there = cat.data.products.products.filter((p) => p.layer === 'shelf' && fits(p));
      const list = here.length > 0 ? here : there;
      if (list.length > 0) near = { hintId: t.id, productIds: list.slice(0, 2).map((p) => p.id), inSlot: here.length > 0 };
    }
  }
  return { same, near, gaps: gapIds(al, hits) };
}

/**
 * 여러 글(질문의 직접 쓰기 q.*, 마지막 한 줄 line, 도구 이름 tool)에서 빈틈을 찾는다. 자리마다 그 칸의 낱말표와
 * 함께 찾으므로 matchAnswer·matchTool의 gaps와 같다. 결과는 자료 순서, 겹치지 않게 (화면이 session.gaps에 넣는다)
 */
export function gapsIn(cat: Catalog, al: Aliases, texts: { where: string; text: string }[]): string[] {
  const found = new Set<string>();
  for (const { where, text } of texts) {
    const entries = where === 'tool' ? toolEntries(cat, al) : [...(al.options[where] ?? []), ...gapEntries(al, where)];
    for (const id of gapIds(al, findAliases(text, entries))) found.add(id);
  }
  return al.gaps.filter((g) => found.has(g.id)).map((g) => g.id);
}

/**
 * 세션에 든 직접 쓴 글 전부(질문의 내 말 notes, 마지막 한 줄 freeText, 직접 쓴 도구 이름)에서 빈틈을 다시 찾는다.
 * 화면이 내 말을 정하거나 지울 때마다 이 값으로 session.gaps를 바꾼다(지운 글의 빈틈이 남지 않게). 결과는 자료 순서
 */
export function gapsOfSession(
  cat: Catalog,
  al: Aliases,
  s: { notes?: Record<string, string>; freeText?: string; customTools?: { name: string }[] },
): string[] {
  const texts = [
    ...Object.entries(s.notes ?? {}).map(([where, text]) => ({ where, text })),
    ...(s.freeText ? [{ where: 'line', text: s.freeText }] : []),
    ...(s.customTools ?? []).map((t) => ({ where: 'tool', text: t.name })),
  ];
  return gapsIn(cat, al, texts);
}

/** 연락처처럼 보이는 글 (input.md 4.3절): 막지 않고 화면이 경고한다 */
export function looksLikeContact(text: string): boolean {
  return /(01[016789]|0\d{1,2})[-.\s]?\d{3,4}[-.\s]?\d{4}/.test(text) || /[^\s@]+@[^\s@]+\.[^\s@]{2,}/.test(text);
}

// ── 영문 자판 → 한글 (두벌식, input.md 6.7절) ────────────────────────
// 자판 글자 그대로 첫소리·가운뎃소리·끝소리 표를 둔다 (겹모음 'hk' = ㅘ, 겹받침 'fr' = ㄺ). 유니코드 한글 순서와 같다
const CHO = 'rRseEfaqQtTdwWczxvg';
const JUNG = 'k o i O j p u P h hk ho hl y n nj np nl b m ml l'.split(' ');
const JONG = ' r R rt s sw sg e f fr fa fq ft fx fv fg a q qt t T d w c z x v g'.split(' ');
/** 홀로 남은 자음 (CHO 순서). 홀로 남은 모음은 호환 자모 ㅏ(U+314F)부터 JUNG 순서와 같다 */
const LONE = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

/** 영문 자판으로 친 글을 두벌식 한글로 되돌린다 ('gkf dlf ahrfhr' → '할 일 목록') */
export function qwertyToHangul(text: string): string {
  let out = '';
  let [c, v, f] = ['', '', ''];
  const lone = (k: string): string => (!k ? '' : CHO.includes(k) ? (LONE[CHO.indexOf(k)] ?? '') : String.fromCharCode(0x314f + JUNG.indexOf(k)));
  const flush = (): void => {
    out += c && v ? String.fromCharCode(0xac00 + (CHO.indexOf(c) * 21 + JUNG.indexOf(v)) * 28 + JONG.indexOf(f)) : lone(c) + lone(v);
    [c, v, f] = ['', '', ''];
  };
  for (const ch of text) {
    const k = /[QWERTOP]/.test(ch) ? ch : ch.toLowerCase();
    if (!/[a-z]/i.test(ch)) {
      flush();
      out += ch;
    } else if (JUNG.includes(k)) {
      if (f) {
        // 받침이 다음 글자의 첫소리로 옮겨 간다 (겹받침이면 뒤 글자만)
        const move = f.slice(-1);
        f = f.slice(0, -1);
        flush();
        [c, v] = [move, k];
      } else if (v && JUNG.includes(v + k)) v += k;
      else if (c && !v) v = k;
      else {
        flush();
        v = k;
      }
    } else if (c && v && JONG.includes(f + k)) f += k;
    else {
      flush();
      c = k;
    }
  }
  flush();
  return out;
}
