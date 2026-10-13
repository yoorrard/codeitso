// 어려운 말 풀이 자료 묶기 (brief 8절, glossary.md 5.11·5.12, D69). 순수 함수만 둔다 (DOM·Node API 없음, 시험 있음).
//  1. 손으로 쓴 용어(data/glossary.json) 뒤에 products.json의 도구 이름 항목(kind 'tool')을 빌드 때 더한다.
//     손으로 쓴 쪽과 열쇠가 겹치면 손으로 쓴 쪽이 이긴다 (열쇠가 하나도 안 남는 도구 항목은 뺀다).
//  2. 브라우저에 보낼 작은 모양(/glossary.json)으로 줄이고 다시 푼다. 칸마다 줄바꿈으로 이은 글 한 줄씩이라
//     같은 객체 이름을 212번 되풀이하는 JSON보다 gzip이 작다 (자료 + 매처 17KB gz 예산).
//  3. '에러 안내 보기'가 사전을 열 때 그 에러 카드가 맨 위에 오게 하는 짧은 글을 고른다.
import type { GlossaryEntry, GlossaryKind } from './glossary.ts';
import { normalizeTerm } from './glossary.ts';

/** 도구 이름 항목을 만들 때 보는 상품의 칸 (engine의 Product와 같은 이름) */
export interface ToolSource {
  id: string;
  name: string;
  summary: string;
  /** 'shelf'면 도구 카드(/tools/<id>)가 있다 */
  layer: string;
}

/** 에러 안내에서 보는 칸 (engine의 ErrorEntry와 같은 이름) */
export interface ErrorSource {
  id: string;
  title: string;
  examples: readonly string[];
}

/** 브라우저에 보내는 풀이 자료 (/glossary.json) */
export interface TermPack {
  v: 1;
  /** COLUMNS 순서의 칸. 칸마다 항목 수만큼 줄이 있다 (빈 줄 = 없음) */
  c: string[];
  /** 에러 안내 id → 사전에 넣으면 그 에러 카드가 맨 위에 오는 글 */
  e: Record<string, string>;
}

/** 도구 이름 항목 id. 손으로 쓴 용어 id(영문 소문자·숫자·-)와 겹치지 않게 앞에 tool:을 붙인다 */
export function toolEntryId(productId: string): string {
  return `tool:${productId}`;
}

const LATIN = /[A-Za-z]/;

/**
 * products.json에서 도구 이름 항목을 만든다 (glossary.md 5.12). 열쇠는 이름, 괄호를 뺀 이름, 괄호 안의 영문 이름.
 * 괄호 안 한글('번역', '사진', '네이버 클라우드')은 이름이 아니라 설명이라 열쇠로 쓰지 않는다.
 * 풀이 칸에는 상품의 summary를 둔다 (명사구라 '요.' 규칙 밖). 도구 카드는 진열 도구에만 있다.
 */
export function toolEntries(products: readonly ToolSource[], taken: ReadonlySet<string> = new Set()): GlossaryEntry[] {
  const out: GlossaryEntry[] = [];
  for (const p of products) {
    const bare = p.name.replace(/\s*\([^)]*\)/g, '').trim();
    const inner = [...p.name.matchAll(/\(([^)]+)\)/g)].map((m) => (m[1] ?? '').trim()).filter((s) => LATIN.test(s));
    const names: string[] = [];
    const keys = new Set<string>();
    for (const n of [p.name, bare, ...inner]) {
      const k = normalizeTerm(n);
      if (k.length < 2 || keys.has(k) || taken.has(k)) continue;
      keys.add(k);
      names.push(n);
    }
    const [term, ...aliases] = names;
    if (term === undefined) continue;
    const e: GlossaryEntry = { id: toolEntryId(p.id), term, plain: p.summary, kind: 'tool' };
    if (aliases.length > 0) e.aliases = aliases;
    if (p.layer === 'shelf') e.tool = p.id;
    out.push(e);
  }
  return out;
}

/** 손으로 쓴 용어 + 도구 이름 항목. 손으로 쓴 쪽이 먼저라 buildIndex에서 열쇠가 겹치면 이긴다 */
export function siteEntries(manual: readonly GlossaryEntry[], products: readonly ToolSource[]): GlossaryEntry[] {
  const taken = new Set<string>();
  for (const e of manual) for (const n of [e.term, ...(e.aliases ?? [])]) taken.add(normalizeTerm(n));
  // 손으로 쓴 용어가 가리키는 도구 카드는 진열 도구에만 있다 (색인 도구는 페이지가 없다)
  const shelf = new Set(products.filter((p) => p.layer === 'shelf').map((p) => p.id));
  const fixed = manual.map((e) => {
    if (e.tool === undefined || shelf.has(e.tool)) return e;
    const rest = { ...e };
    delete rest.tool;
    return rest;
  });
  return [...fixed, ...toolEntries(products, taken)];
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

/**
 * 용어가 가리키는 에러마다, 사전에 넣으면 그 에러 카드가 맨 위에 오는 짧은 글을 고른다.
 * 제목 괄호 안 말('CORS', 'Failed to fetch')부터, 다음은 예 문장. firstMatch는 엔진의 matchErrors(…)[0]?.id를 넘긴다.
 */
export function errorQueries(entries: readonly GlossaryEntry[], errors: readonly ErrorSource[], firstMatch: (text: string) => string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  const wanted = new Set(entries.map((e) => e.error).filter((x): x is string => x !== undefined));
  for (const err of errors) {
    if (!wanted.has(err.id)) continue;
    const paren = [...err.title.matchAll(/\(([^)]+)\)/g)].map((m) => m[1] ?? '');
    // 괄호 안 말을 먼저, 그다음 짧은 예부터 (자료가 작게)
    const examples = [...err.examples].sort((a, b) => a.length - b.length);
    const pick = [...paren, ...examples].find((s) => s.length > 0 && firstMatch(s) === err.id);
    out[err.id] = pick ?? err.title;
  }
  return out;
}
