// 빌드 때만 쓰는 어려운 말 풀이 자료 (D69): 손으로 쓴 용어 + 도구 이름 49개, 그 색인, 브라우저에 보낼 묶음,
// 그리고 Astro 쪽 점선 밑줄 나누기(페이지마다 셈을 따로 둔다). 브라우저 묶음에는 들지 않는다 (data.ts를 통째로 부른다).
import glossary from '../../data/glossary.json';
import { catalog, data } from './data-full.ts';
import { matchErrors } from './engine/index.ts';
import type { GlossaryEntry, GlossaryIndex } from './glossary.ts';
import { buildIndex } from './glossary.ts';
import type { TermPack } from './term-data.ts';
import { errorQueries, packTerms, siteEntries, toolEntryId } from './term-data.ts';
import type { MarkBudget, TermSegment } from './term-marks.ts';
import { MARKS_REFERENCE, markBudget, segmentTerms } from './term-marks.ts';

/** 자료 파일을 import하면 kind가 string으로 읽힌다. 모양은 schemas/glossary.schema.json과 자료 시험이 지킨다 */
const manual = glossary.terms as unknown as GlossaryEntry[];

let entries: GlossaryEntry[] | null = null;
let index: GlossaryIndex | null = null;

export function siteGlossary(): GlossaryEntry[] {
  entries ??= siteEntries(manual, data.products.products);
  return entries;
}

export function siteIndex(): GlossaryIndex {
  index ??= buildIndex({ terms: siteGlossary() });
  return index;
}

/** /glossary.json: 손으로 쓴 용어 + 에러 안내 글 (자료 + 매처 17KB gz 예산 안) */
export function sitePack(): TermPack {
  const own = siteGlossary().filter((e) => e.kind !== 'tool');
  return packTerms(own, errorQueries(own, data.errors.errors, (t) => matchErrors(catalog, t)[0]?.id));
}

/** /glossary-tools.json: 도구 이름 항목 (풀이 칸은 상품 summary). 손으로 쓴 용어와 같은 때 나란히 받는다 */
export function siteToolPack(): TermPack {
  return packTerms(siteGlossary().filter((e) => e.kind === 'tool'));
}

const budgets = new WeakMap<object, MarkBudget>();

/** 그 카드 자신의 용어 (용어 카드에서 그 용어, 도구 카드에서 그 도구)는 긋지 않는다 */
export interface MarkSelf {
  concept?: string;
  tool?: string;
}

/**
 * 설명 글 한 칸을 나눈다. page는 한 페이지 렌더에서 같은 객체(Astro.locals)라 페이지마다 8개·용어마다 처음 한 번을 센다.
 * Astro는 형제 컴포넌트를 문서 순서로 시작하고 이 계산에는 await가 없어 센 순서가 문서 순서와 같다.
 */
export function markSegments(page: object, text: string, self: MarkSelf = {}): TermSegment[] {
  let budget = budgets.get(page);
  if (!budget) {
    budget = markBudget(MARKS_REFERENCE);
    budgets.set(page, budget);
  }
  const skip = new Set<string>();
  for (const e of siteGlossary()) {
    if ((self.concept !== undefined && e.concept === self.concept) || (self.tool !== undefined && (e.tool === self.tool || e.id === toolEntryId(self.tool)))) skip.add(e.id);
  }
  return segmentTerms(text, siteIndex(), budget, skip);
}
