// 어려운 말 풀이 (D60, v2 D66): 이용자가 고른 글에서 아는 용어를 찾는다. 자료는 data/glossary.json(용어마다 한 문장 풀이).
// 순수 함수만 둔다 (DOM 없음, 시험 있음). 화면은 TermPopover 섬이 고른 글과 그 앞뒤 글을 넘기고 결과를 보여 주기만 한다.
// 찾는 법 (docs/review/v2/glossary.md 5.2절):
//   1. 정규화: NFKC(전각 → 반각), 소문자, 폭 없는 글자·소프트 하이픈 지우기. 글자·숫자·+·# 밖의 것은 어절 경계로 본다.
//      열쇠도 같은 방식이라 'API 키' = 'API키' = 'api key'처럼 공백을 뺀 모양으로 견준다. 원문 위치 표를 함께 만든다.
//   2. 용어는 어절 첫머리(또는 한글↔영문·숫자가 바뀌는 자리, 숫자 → 영문)에서만 시작한다. '블로그' 속 '로그'는 맞지 않는다.
//   3. 용어 뒤 같은 어절의 꼬리는 조사 0~2개, 복수 '들', 끝의 '요', 하다·되다 활용, 영문 s·es만 허용한다.
//   4. 고른 범위 앞뒤 48자를 문맥으로 보고, 고른 글을 감싸는 가장 긴 용어를 첫째로, 같이 보일 말을 2개까지 고른다.

/** 손으로 쓴 용어의 묶음. 'tool'은 빌드 때 products.json에서 더하는 도구 이름 자리다 (손으로 넣지 않는다) */
export type GlossaryKind = 'key' | 'money' | 'data' | 'code' | 'ai' | 'law' | 'site' | 'tool';

export interface GlossaryEntry {
  id: string;
  /** 보이는 이름 */
  term: string;
  /** 같은 뜻으로 쓰는 다른 이름 (영어 이름, 줄임말, 자료에 쓰인 표기). 정규화 뒤 2자 이상, 용어끼리 겹치지 않음 */
  aliases?: string[];
  /** 읽는 법 (영문 용어, 한글만). 열쇠로 쓰지 않는다 ('코스'처럼 흔한 말과 겹친다) */
  say?: string;
  /** 쉬운 한 문장 풀이 (해요체, '요.'로 끝, 70자 안쪽) */
  plain: string;
  /** 짧은 예 (한 문장, 60자 안쪽) */
  example?: string;
  kind: GlossaryKind;
  /** 풀이 문장 속 상위 용어 id (겹 풀이 1겹). 풀이에서 실제로 찾혀야 한다 */
  see?: string;
  /** 용어 카드 id (concepts.json, /terms/<id>) */
  concept?: string;
  /** 도구 카드 id (products.json) */
  tool?: string;
  /** 에러 안내 id (errors.json) */
  error?: string;
  /** 점선 밑줄을 긋지 않음 (흔한 말, 코드잇소 말). 고르기로는 풀린다 */
  noMark?: boolean;
  /** 위험을 품은 용어: 풀이 안에 위험을 숨기지 않는 말('넣으면 안 돼요' 따위)이 있어야 한다 (자료 시험) */
  risk?: boolean;
}

export interface Glossary {
  version: number;
  terms: GlossaryEntry[];
}

/** 자료 파일을 import하면 kind가 string으로 읽히므로 넓게 받는다 (모양은 schemas/glossary.schema.json이 지킨다) */
type GlossaryEntryInput = Omit<GlossaryEntry, 'kind'> & { kind: string };

export interface GlossaryHit {
  /** 첫째 용어 */
  entry: GlossaryEntry;
  /** 첫째 용어가 고른 글과 꼭 맞거나 감싸는지 (아니면 고른 글 안에서 찾은 것) */
  exact: boolean;
  /** 같이 보여 줄 말 (칩), 2개까지 */
  also: GlossaryEntry[];
}

/** 고른 글이 든 문맥. start·end는 text 안에서 고른 범위 (UTF-16 위치, end는 빼고) */
export interface LookupContext {
  text: string;
  start: number;
  end: number;
}

/** 글 안에서 찾은 용어 하나. 위치는 원문 기준 (end는 꼬리까지, keyEnd는 용어까지) */
export interface TermMatch {
  entry: GlossaryEntry;
  start: number;
  keyEnd: number;
  end: number;
  /** 맞은 열쇠의 길이 (정규화한 글자 수). 길수록 앞선다 */
  size: number;
}

/** 이보다 긴 고른 글은 용어로 보지 않는다 (문장 전체를 고른 것) */
export const SELECTION_MAX = 40;
/** 에러 문장으로 볼 수 있는 가장 긴 고른 글 */
export const ERROR_MAX = 200;
/** 고른 범위 앞뒤로 보는 문맥 길이 */
export const CONTEXT_SPAN = 48;
/** 같이 보여 줄 말 수 */
export const ALSO_MAX = 2;

// 조사 (긴 것부터 떼어 본다). open-korean-text의 조합 목록에서 이 사이트 글에 나오는 것만 골랐다 (glossary.md 5.2절).
// '이라서·라서·이라면·라면·이지만'은 풀이 문장에 나와서 더했다. '인'·'인데'·'면'은 더하지 않는다 ('로그' + '인' = '로그인'처럼 다른 용어를 만든다)
const JOSA = [
  '으로부터', '에서부터', '이라는', '이라고', '이라도', '이라서', '이라면', '이지만', '라서', '라면', '이란', '에게서', '한테서', '에서는', '에서도', '에서', '으로는', '으로도',
  '으로서', '으로써', '으로', '에게', '한테', '께서', '까지', '부터', '처럼', '보다', '하고', '이랑', '라는', '라고', '라도', '이나', '이고', '이며', '이든', '마다', '마저',
  '조차', '밖에', '대로', '입니다', '이에요', '예요', '이다', '에는', '에도', '로는', '로도', '로서', '로써', '와는', '과는', '은', '는', '을', '를', '이', '가', '의',
  '에', '로', '와', '과', '도', '만', '란', '나', '랑', '야',
].sort((a, b) => b.length - a.length);

/** 하다·되다 활용 ('배포하려면', '커밋했어요', '공개된') */
const HADA = /^(하|되|해|돼|했|됐|한|할|된|될|함|됨)[가-힣]{0,5}$/;
/** 지워도 경계를 남기지 않는 글자: 폭 없는 공백·이음표, 단어 이음, BOM, 소프트 하이픈 */
const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/;
const INVISIBLE_ALL = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
/** 같은 글자 묶음으로 붙이는 뒤따름 글자: 결합 부호, 한글 가운뎃소리·끝소리 낱자 (풀어 쓴 한글을 NFKC가 다시 묶게) */
const TRAILING = /[\p{M}\u1160-\u11FF\uD7B0-\uD7FF]/u;
/** 용어 안에 남는 글자: 글자·숫자·결합 부호와 + # ('C#', 'React + Vite'). 나머지는 어절 경계 */
const KEEP = /[\p{L}\p{N}\p{M}+#]/u;
const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7A3\uD7B0-\uD7FF]/;

type Script = 'h' | 'l' | 'd' | 'o';
function script(c: string): Script {
  if (HANGUL.test(c)) return 'h';
  if (c >= 'a' && c <= 'z') return 'l';
  if (c >= '0' && c <= '9') return 'd';
  return 'o';
}
/** 붙어 있어도 새 용어가 시작될 수 있는 자리: 한글↔영문·숫자, 숫자 → 영문 ('급식API', 'API키', '500MB') */
function scriptStart(prev: Script, cur: Script): boolean {
  if (prev === 'h') return cur === 'l' || cur === 'd';
  if (prev === 'l' || prev === 'd') return cur === 'h' || (prev === 'd' && cur === 'l');
  return false;
}
/** 꼬리가 끝나는 자리: 한글 뒤에 영문·숫자가 오면 거기서 어절이 나뉜 것으로 본다 ('배포API') */
function tailBreak(prev: Script, cur: Script): boolean {
  return prev === 'h' && (cur === 'l' || cur === 'd');
}

/** 정규화한 글 (경계는 지우고 표시만 남김) + 원문 위치 표 */
interface Prepared {
  /** 정규화 글자 (코드 포인트 하나씩, 경계 없음) */
  chars: string[];
  /** chars[i]가 나온 원문 범위 */
  from: number[];
  to: number[];
  /** chars[i]에서 용어가 시작될 수 있는지 */
  start: boolean[];
  /** chars[i]가 든 어절 조각의 끝 (꼬리를 셀 때 쓴다) */
  segEnd: number[];
}

/** 원문 글자 하나가 경계인지 (폭 없는 글자는 경계가 아니라 지워진다). 고른 범위를 다듬고 문맥 창을 넓힐 때 쓴다 */
function isBoundaryChar(c: string): boolean {
  if (c === '' || INVISIBLE.test(c)) return false;
  for (const x of c.normalize('NFKC')) if (KEEP.test(x)) return false;
  return true;
}

function prepare(text: string, lo = 0, hi = text.length): Prepared {
  const chars: string[] = [];
  const from: number[] = [];
  const to: number[] = [];
  const start: boolean[] = [];
  const brk: boolean[] = [];
  // 창이 글 중간에서 시작하면 앞 글자를 보고 어절 첫머리인지 정한다
  let atBoundary = true;
  let prev: Script = 'o';
  if (lo > 0) {
    const before = text[lo - 1] ?? ' ';
    atBoundary = isBoundaryChar(before);
    prev = atBoundary ? 'o' : script(before.normalize('NFKC').toLowerCase());
  }
  let i = lo;
  while (i < hi) {
    // 글자 묶음: 바탕 글자(서로게이트 쌍은 한 글자) + 뒤따름 글자
    const cp = text.codePointAt(i) ?? 0;
    let j = i + (cp > 0xffff ? 2 : 1);
    while (j < hi && TRAILING.test(text[j] ?? '')) j++;
    for (const c of text.slice(i, j).replace(INVISIBLE_ALL, '').normalize('NFKC').toLowerCase()) {
      if (!KEEP.test(c)) {
        atBoundary = true;
        continue;
      }
      const s = script(c);
      start.push(atBoundary || scriptStart(prev, s));
      brk.push(atBoundary || tailBreak(prev, s));
      chars.push(c);
      from.push(i);
      to.push(j);
      atBoundary = false;
      prev = s;
    }
    i = j;
  }
  // 어절 조각의 끝: 경계 다음 글자나 한글 → 영문·숫자에서 끊는다
  const segEnd = new Array<number>(chars.length);
  let end = chars.length;
  for (let k = chars.length - 1; k >= 0; k--) {
    segEnd[k] = end;
    if (brk[k]) end = k;
  }
  return { chars, from, to, start, segEnd };
}

/** 견주기용 모양: NFKC, 소문자, 폭 없는 글자와 경계(공백·문장 부호) 빼기 (+·#은 이름에 들어가서 남긴다) */
export function normalizeTerm(s: string): string {
  return prepare(s).chars.join('');
}

/** 꼬리(용어 뒤 같은 어절 조각)가 허용되는 모양인지 */
function josaTail(t: string, left: number): boolean {
  if (t === '' || t === '요') return true;
  if (left === 0) return false;
  for (const j of JOSA) if (t.startsWith(j) && josaTail(t.slice(j.length), left - 1)) return true;
  return false;
}
function hangulTail(t: string): boolean {
  if (t === '' || HADA.test(t)) return true;
  const rest = t.startsWith('들') ? t.slice(1) : t;
  return josaTail(rest, 2);
}

export interface GlossaryIndex {
  byKey: Map<string, GlossaryEntry>;
  byId: Map<string, GlossaryEntry>;
  /** 열쇠의 첫 글자 → 열쇠들 (긴 것부터) */
  byFirst: Map<string, string[]>;
  /** 모든 열쇠 (긴 것부터) */
  keys: string[];
}

/** 이름과 다른 이름을 모두 열쇠로. 같은 열쇠가 둘이면 앞의 것을 쓴다 (자료 시험이 막는다. 빌드 때 더하는 도구 이름은 뒤에 둬서 손으로 쓴 쪽이 이긴다) */
export function buildIndex(g: { terms: readonly GlossaryEntryInput[] }): GlossaryIndex {
  const byKey = new Map<string, GlossaryEntry>();
  const byId = new Map<string, GlossaryEntry>();
  for (const raw of g.terms) {
    const e = raw as GlossaryEntry;
    if (!byId.has(e.id)) byId.set(e.id, e);
    for (const name of [e.term, ...(e.aliases ?? [])]) {
      const k = normalizeTerm(name);
      if (k && !byKey.has(k)) byKey.set(k, e);
    }
  }
  const keys = [...byKey.keys()].sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
  const byFirst = new Map<string, string[]>();
  for (const k of keys) {
    const f = k[0] ?? '';
    const list = byFirst.get(f);
    if (list) list.push(k);
    else byFirst.set(f, [k]);
  }
  return { byKey, byId, byFirst, keys };
}

/** 영문 용어 뒤의 s·es ('APIs', 'tokens'). 용어 + s가 따로 열쇠면 쓰지 않는다 ('https'를 http + s로 보지 않게) */
function tailOk(index: GlossaryIndex, key: string, tail: string): boolean {
  if (hangulTail(tail)) return true;
  if (script(key[key.length - 1] ?? '') !== 'l') return false;
  for (const s of ['es', 's']) {
    if (tail.startsWith(s) && !index.byKey.has(key + s) && hangulTail(tail.slice(s.length))) return true;
  }
  return false;
}

/** 준비한 글에서 맞는 용어를 모두 찾는다 (겹쳐도 모두). minSize보다 짧은 열쇠는 보지 않는다 */
function scan(index: GlossaryIndex, p: Prepared, minSize: number): TermMatch[] {
  const out: TermMatch[] = [];
  const joined = p.chars.join('');
  // chars는 코드 포인트 단위, joined는 UTF-16이라 위치가 어긋날 수 있다: 코드 포인트 위치 → UTF-16 위치 표
  const unit: number[] = [];
  let u = 0;
  for (const c of p.chars) {
    unit.push(u);
    u += c.length;
  }
  unit.push(u);
  const seen = new Set<string>();
  for (let i = 0; i < p.chars.length; i++) {
    if (!p.start[i]) continue;
    const bucket = index.byFirst.get(p.chars[i] ?? '');
    if (!bucket) continue;
    const at = unit[i] ?? 0;
    for (const key of bucket) {
      if (key.length < minSize) break;
      if (!joined.startsWith(key, at)) continue;
      // 열쇠가 끝난 글자 (코드 포인트 위치)
      let k = i;
      while ((unit[k] ?? 0) < at + key.length) k++;
      const last = k - 1;
      const tailEnd = Math.max(p.segEnd[last] ?? k, k);
      const tail = joined.slice(at + key.length, unit[tailEnd] ?? joined.length);
      if (!tailOk(index, key, tail)) continue;
      const entry = index.byKey.get(key);
      if (!entry) continue;
      const startAt = p.from[i] ?? 0;
      const id = `${entry.id}@${startAt}`;
      if (seen.has(id)) continue; // 같은 자리의 같은 용어는 가장 긴 열쇠 하나만
      seen.add(id);
      out.push({ entry, start: startAt, keyEnd: p.to[last] ?? startAt, end: p.to[tailEnd - 1] ?? startAt, size: key.length });
    }
  }
  return out;
}

/** 앞선 쪽: 긴 열쇠 → 넓은 범위 → 앞 자리 */
function better(a: TermMatch, b: TermMatch): number {
  return b.size - a.size || b.end - b.start - (a.end - a.start) || a.start - b.start;
}

const overlaps = (a: TermMatch, b: TermMatch): boolean => a.start < b.keyEnd && b.start < a.keyEnd;

/**
 * 글 전체에서 겹치지 않게 용어를 찾는다 (앞에서부터, 같은 자리면 긴 것). 한 글자 열쇠는 보지 않는다.
 * 점선 밑줄을 나눠 그릴 때와 자료 시험(풀이 속 상위 용어)이 쓴다.
 */
export function findTerms(index: GlossaryIndex, text: string): TermMatch[] {
  const all = scan(index, prepare(text), 2).sort((a, b) => a.start - b.start || better(a, b));
  const out: TermMatch[] = [];
  let until = 0;
  for (const m of all) {
    if (m.start < until) continue;
    out.push(m);
    until = m.keyEnd;
  }
  return out;
}

/** 글 전체에서 맞는 용어를 겹치는 것까지 모두 (시험·풀이 속 상위 용어 확인용) */
export function findAllTerms(index: GlossaryIndex, text: string): TermMatch[] {
  return scan(index, prepare(text), 2);
}

/** 문맥 창을 어절 경계까지 넓힌다 (어절 가운데를 잘라 가짜 첫머리를 만들지 않게). 너무 긴 어절이면 64자에서 멈춘다 */
function widen(text: string, lo: number, hi: number): [number, number] {
  let a = lo;
  while (a > 0 && lo - a < 64 && !isBoundaryChar(text[a - 1] ?? ' ')) a--;
  let b = hi;
  while (b < text.length && b - hi < 64 && !isBoundaryChar(text[b] ?? ' ')) b++;
  return [a, b];
}

/**
 * 고른 글에서 용어를 찾는다. context를 주면 고른 범위 앞뒤 48자를 함께 보고 고른 글을 감싸는 가장 긴 용어를 첫째로 한다
 * ('API 키를'에서 '키를'만 골라도 API 키). 없으면 고른 범위 안에 든 것 중 앞의 것. 그래도 없으면 null.
 * 고른 글(앞뒤 공백·문장 부호를 뺀 것)이 40자를 넘으면 찾지 않는다.
 */
export function lookupTerm(index: GlossaryIndex, selection: string, context?: LookupContext): GlossaryHit | null {
  const text = context ? context.text : selection;
  let s = context ? Math.max(0, Math.min(context.start, text.length)) : 0;
  let e = context ? Math.max(s, Math.min(context.end, text.length)) : text.length;
  while (s < e && isBoundaryChar(text[s] ?? '')) s++;
  while (e > s && isBoundaryChar(text[e - 1] ?? '')) e--;
  if (e === s || e - s > SELECTION_MAX) return null;

  const [lo, hi] = widen(text, Math.max(0, s - CONTEXT_SPAN), Math.min(text.length, e + CONTEXT_SPAN));
  // 한 글자 열쇠('봇')는 고른 글 전체가 그 말(+ 꼬리)일 때만 맞는다
  const matches = scan(index, prepare(text, lo, hi), 1).filter((m) => m.size > 1 || (m.start === s && m.end === e));
  if (matches.length === 0) return null;

  const covering = matches.filter((m) => m.start <= s && m.end >= e).sort(better);
  const inside = matches.filter((m) => m.start >= s && m.keyEnd <= e);
  const first = covering[0] ?? [...inside].sort((a, b) => a.start - b.start || better(a, b))[0];
  if (!first) return null;

  const chips: TermMatch[] = [];
  const has = (m: TermMatch): boolean => m.entry === first.entry || chips.some((c) => c.entry === m.entry);
  // 고른 글과 꼭 맞는 더 짧은 용어 ('API 키'가 첫째일 때 고른 'API')
  const same = matches.filter((m) => !has(m) && m.start === s && (m.end === e || m.keyEnd === e) && m.size < first.size).sort(better)[0];
  if (same) chips.push(same);
  // 고른 범위 안에서 첫째·칩과 겹치지 않는 용어, 긴 것부터
  for (const m of [...inside].sort(better)) {
    if (chips.length >= ALSO_MAX) break;
    if (has(m) || overlaps(m, first) || chips.some((c) => overlaps(m, c))) continue;
    chips.push(m);
  }
  return { entry: first.entry, exact: covering.length > 0, also: chips.slice(0, ALSO_MAX).map((c) => c.entry) };
}

/** 고른 글에 영문이나 숫자가 섞였는지 (한글만이면 복사하려고 고른 보통 말로 본다, glossary.md 5.9절) */
export function hasLatinOrDigit(text: string): boolean {
  return /[A-Za-z0-9]/.test(text.normalize('NFKC'));
}

// 에러 문장에 흔히 나오는 영어 말 (사전의 ERRORISH와 같은 판단)과 에러 이름 (대문자 E로 시작하는 ENOENT·EADDRINUSE, GitHub GH013)
const ERROR_WORDS = /error|failed|failure|not found|not defined|denied|refused|exception|undefined|cannot|can't|unable|invalid|unexpected|forbidden|unauthorized|timed? ?out/i;
const ERROR_CODES = /\bE[A-Z]{3,}\b|\bGH\d{3}\b/;

/**
 * 고른 글이 에러 문장처럼 보이는지 (200자 이하, 영문·숫자가 섞임). patterns에는 errors.json의 patterns를 정규식으로 넘긴다.
 * 맞으면 풀이 창이 '에러 안내 찾기'를 띄운다 (glossary.md 5.9절).
 */
export function looksLikeError(text: string, patterns: readonly RegExp[] = []): boolean {
  const t = text.trim();
  if (!t || t.length > ERROR_MAX || !hasLatinOrDigit(t)) return false;
  return ERROR_WORDS.test(t) || ERROR_CODES.test(t) || patterns.some((p) => p.test(t));
}

/**
 * 용어를 찾지 못했을 때 보여 줄 것 (glossary.md 5.9절): 'error' = 에러 안내 찾기, 'search' = 사전에서 찾기, null = 아무것도.
 * 한글만인 고르기에는 아무것도 띄우지 않는다.
 */
export function missAction(text: string, patterns: readonly RegExp[] = []): 'error' | 'search' | null {
  const t = text.trim();
  if (looksLikeError(t, patterns)) return 'error';
  if (t.length > 0 && t.length <= SELECTION_MAX && hasLatinOrDigit(t)) return 'search';
  return null;
}
