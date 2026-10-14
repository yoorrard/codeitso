// 어려운 말 풀이의 늦게 불러오는 묶음 (brief 8절 성능, D69): 매처(glossary.ts) + 자료(/glossary.json) 풀기.
// 처음 고르기(selectstart), 처음 밑줄 말 누름, 섬 화면의 쉬는 시간 중 먼저 오는 때에 term-load.ts가 한 번만 불러온다.
// 풀이 섬(TermPopover)에는 이 묶음이 들지 않는다 (섬 5KB · 자료 + 매처 17KB gz 예산).
import type { GlossaryEntry, GlossaryHit, GlossaryIndex, LookupContext } from './glossary.ts';
import { buildIndex, findAllTerms, lookupTerm, missAction } from './glossary.ts';
import type { TermPack } from './term-data.ts';
import { unpackTerms } from './term-data.ts';
import { FILES } from './routes.ts';
import type { MarkBudget, TermSegment } from './term-marks.ts';
import { segmentTerms } from './term-marks.ts';

/** 빌드 때 만드는 자료: 손으로 쓴 용어 (src/pages/glossary.json.ts) */
export const GLOSSARY_URL = FILES.glossary;

export interface TermEngine {
  get(id: string): GlossaryEntry | undefined;
  lookup(selection: string, context?: LookupContext): GlossaryHit | null;
  /** 용어가 없을 때: 'error' = 에러 안내 찾기, 'search' = 사전에서 찾기, null = 아무것도 (한글만) */
  miss(text: string): 'error' | 'search' | null;
  /** 풀이 문장 속 상위 용어(see)의 자리 (겹 풀이 밑줄). 없으면 null */
  seeIn(entry: GlossaryEntry): { entry: GlossaryEntry; start: number; end: number } | null;
  /** 에러 안내 id → 사전에 넣을 글 */
  errorQuery(id: string): string | undefined;
  segment(text: string, budget: MarkBudget, skip?: ReadonlySet<string>): TermSegment[];
}

/** tools는 도구 이름 묶음 (없으면 손으로 쓴 용어만). 손으로 쓴 쪽을 앞에 둬서 열쇠가 겹치면 이긴다 */
export function makeTermEngine(pack: TermPack, tools?: TermPack): TermEngine {
  const index: GlossaryIndex = buildIndex({ terms: [...unpackTerms(pack), ...(tools ? unpackTerms(tools) : [])] });
  return {
    get: (id) => index.byId.get(id),
    lookup: (selection, context) => lookupTerm(index, selection, context),
    miss: (text) => missAction(text),
    seeIn(entry) {
      const see = entry.see === undefined ? undefined : index.byId.get(entry.see);
      if (!see) return null;
      const m = findAllTerms(index, entry.plain).find((x) => x.entry === see);
      return m ? { entry: see, start: m.start, end: m.keyEnd } : null;
    },
    errorQuery: (id) => pack.e[id],
    segment: (text, budget, skip) => segmentTerms(text, index, budget, skip),
  };
}

async function getPack(url: string): Promise<TermPack> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} ${r.status}`);
  return (await r.json()) as TermPack;
}

export async function loadTermEngine(): Promise<TermEngine> {
  return makeTermEngine(await getPack(GLOSSARY_URL));
}
