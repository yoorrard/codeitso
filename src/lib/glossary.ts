// 어려운 말 풀이 (D60): 이용자가 끌어 고른 글에서 아는 용어를 찾는다. 자료는 data/glossary.json(용어마다 한 문장 풀이).
// 순수 함수만 둔다 (DOM 없음, 시험 있음). 화면은 TermPopover 섬이 고른 글을 넘기고 결과를 보여 주기만 한다.
// 한국어는 띄어쓰기와 조사가 붙어 다니므로 '공백을 빼고, 끝의 조사를 떼어' 견준다: "API 키를" = "API키" = "api 키".

export interface GlossaryEntry {
  id: string;
  /** 보이는 이름 */
  term: string;
  /** 같은 뜻으로 쓰는 다른 이름 (영어 이름, 줄임말) */
  aliases?: string[];
  /** 쉬운 한 문장 풀이 (해요체) */
  plain: string;
  /** 짧은 예 (선택) */
  example?: string;
  /** 용어 카드가 있으면 그 id (/terms/<id>) */
  concept?: string;
}

export interface Glossary {
  version: number;
  terms: GlossaryEntry[];
}

export interface GlossaryHit {
  entry: GlossaryEntry;
  /** 고른 글 전체가 그 용어였는지 (아니면 긴 글 안에서 찾은 것) */
  exact: boolean;
}

/** 이보다 긴 고른 글은 용어로 보지 않는다 (문장 전체를 고른 것) */
export const SELECTION_MAX = 40;

// 끝에 붙는 조사·서술 꼬리. 긴 것부터 떼어 본다 ("에서" 를 "서"보다 먼저)
const TAILS = [
  '으로부터',
  '에서부터',
  '이라는',
  '이라고',
  '이란',
  '에게서',
  '에서는',
  '에서',
  '으로는',
  '으로',
  '에게',
  '한테',
  '까지',
  '부터',
  '처럼',
  '보다',
  '하고',
  '이랑',
  '라는',
  '라고',
  '이나',
  '이고',
  '이며',
  '입니다',
  '이에요',
  '예요',
  '이다',
  '에는',
  '로는',
  '은',
  '는',
  '을',
  '를',
  '이',
  '가',
  '의',
  '에',
  '로',
  '와',
  '과',
  '도',
  '만',
  '란',
  '나',
  '랑',
].sort((a, b) => b.length - a.length);

/** 견주기용 모양: 유니코드 정규화, 소문자, 공백과 문장 부호 빼기 (+·#은 이름에 들어가서 남긴다) */
export function normalizeTerm(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s '"“”‘’`()[\]{}<>.,!?:;·…~\-_/|]/g, '');
}

/** 고른 글로 견줘 볼 모양들: 그대로 → 끝 조사 하나 뗀 것 → 둘 뗀 것 ("서버에서는" → "서버에서" → "서버") */
export function candidates(text: string): string[] {
  const out: string[] = [];
  let cur = normalizeTerm(text);
  for (let i = 0; i < 3 && cur.length > 0; i++) {
    if (!out.includes(cur)) out.push(cur);
    const tail = TAILS.find((t) => cur.endsWith(t) && cur.length - t.length >= 1);
    if (!tail) break;
    cur = cur.slice(0, cur.length - tail.length);
  }
  return out;
}

export interface GlossaryIndex {
  byKey: Map<string, GlossaryEntry>;
  /** 긴 글 안에서 찾을 때 쓰는 열쇠 (긴 것부터) */
  keys: string[];
}

/** 이름과 다른 이름을 모두 열쇠로. 같은 열쇠가 둘이면 앞의 것을 쓴다 (자료 시험이 막는다) */
export function buildIndex(g: Glossary): GlossaryIndex {
  const byKey = new Map<string, GlossaryEntry>();
  for (const e of g.terms) {
    for (const name of [e.term, ...(e.aliases ?? [])]) {
      const k = normalizeTerm(name);
      if (k && !byKey.has(k)) byKey.set(k, e);
    }
  }
  const keys = [...byKey.keys()].filter((k) => k.length >= 2).sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
  return { byKey, keys };
}

/** 고른 글에서 용어를 찾는다. 글 전체가 용어면 그것, 아니면 글 안에 든 가장 긴 용어. 없으면 null */
export function lookupTerm(index: GlossaryIndex, text: string): GlossaryHit | null {
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > SELECTION_MAX) return null;
  for (const c of candidates(trimmed)) {
    const hit = index.byKey.get(c);
    if (hit) return { entry: hit, exact: true };
  }
  const whole = normalizeTerm(trimmed);
  let best: { key: string; at: number } | null = null;
  for (const k of index.keys) {
    if (best && k.length < best.key.length) break;
    const at = whole.indexOf(k);
    if (at >= 0 && (!best || at < best.at)) best = { key: k, at };
  }
  const entry = best ? index.byKey.get(best.key) : undefined;
  return entry ? { entry, exact: false } : null;
}
