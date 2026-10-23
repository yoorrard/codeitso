// 어려운 말 풀이 자료 묶기 (D69). 순수 함수만 둔다 (DOM·Node API 없음, 시험 있음).
// 브라우저에 보낼 작은 모양(/glossary.json)으로 줄이고 다시 푼다. 칸마다 줄바꿈으로 이은 글 한 줄씩이라
// 같은 객체 이름을 200번 되풀이하는 JSON보다 gzip이 작다. v5에서 도구 이름 항목·에러 안내 글은 뺐다 (자료가 없어졌다).
import type { GlossaryEntry, GlossaryKind } from './glossary.ts';

/** 브라우저에 보내는 풀이 자료 (/glossary.json) */
export interface TermPack {
  v: 1;
  /** COLUMNS 순서의 칸. 칸마다 항목 수만큼 줄이 있다 (빈 줄 = 없음) */
  c: string[];
  /** 에러 안내 id → 사전에 넣으면 그 에러 카드가 맨 위에 오는 글 */
  e: Record<string, string>;
}

// 칸 순서. kind는 한 글자로 줄인다 (k m d c a l s t)
const COLUMNS = ['id', 'term', 'aliases', 'say', 'plain', 'example', 'see', 'concept', 'tool', 'error', 'noMark', 'kind'] as const;
type Column = (typeof COLUMNS)[number];
const KINDS: readonly GlossaryKind[] = ['key', 'money', 'data', 'code', 'ai', 'law', 'site', 'tool'];
const KIND_CHAR = 'kmdcalst';

function cell(e: GlossaryEntry, col: Column): string {
  switch (col) {
    case 'aliases':
      return (e.aliases ?? []).join('|');
    case 'noMark':
      return e.noMark ? '1' : '';
    case 'kind':
      return KIND_CHAR[KINDS.indexOf(e.kind)] ?? '';
    case 'concept':
      // 용어 id와 같은 카드면 '='만 (16개)
      return e.concept === undefined ? '' : e.concept === e.id ? '=' : e.concept;
    default:
      return e[col] ?? '';
  }
}

/** 브라우저에 보낼 모양으로 줄인다. 글 안에 줄바꿈이나 '|'가 있으면 풀 때 깨지므로 멈춘다 */
export function packTerms(entries: readonly GlossaryEntry[], errorQuery: Record<string, string> = {}): TermPack {
  const c = COLUMNS.map((col) =>
    entries
      .map((e) => {
        const v = cell(e, col);
        if (v.includes('\n') || (col !== 'aliases' && v.includes('|'))) throw new Error(`풀이 자료 ${e.id}.${col}에 줄바꿈이나 '|'가 있다`);
        return v;
      })
      .join('\n'),
  );
  return { v: 1, c, e: errorQuery };
}

/** packTerms의 반대. 모양이 틀리면 빈 목록 */
export function unpackTerms(pack: TermPack): GlossaryEntry[] {
  if (pack.v !== 1 || !Array.isArray(pack.c)) return [];
  const cols = COLUMNS.map((_, i) => (pack.c[i] ?? '').split('\n'));
  const ids = cols[0] ?? [];
  const out: GlossaryEntry[] = [];
  ids.forEach((id, row) => {
    const get = (col: Column): string => cols[COLUMNS.indexOf(col)]?.[row] ?? '';
    const e: GlossaryEntry = { id, term: get('term'), plain: get('plain'), kind: KINDS[KIND_CHAR.indexOf(get('kind'))] ?? 'code' };
    const aliases = get('aliases');
    if (aliases) e.aliases = aliases.split('|');
    for (const col of ['say', 'example', 'see', 'tool', 'error'] as const) {
      const v = get(col);
      if (v) e[col] = v;
    }
    const concept = get('concept');
    if (concept) e.concept = concept === '=' ? id : concept;
    if (get('noMark')) e.noMark = true;
    if (id && e.term) out.push(e);
  });
  return out;
}
