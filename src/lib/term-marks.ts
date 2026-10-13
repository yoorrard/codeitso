// 점선 밑줄 말 나누기 (brief 8절, glossary.md 5.7, D69). 순수 함수 (DOM 없음, 시험 있음).
// 설명 글 한 칸을 '글 조각'과 '밑줄 말'로 나눈다. 빌드 때 Astro 쪽(TermText.astro)과 섬 쪽(TermMarks.tsx)이 같은 함수를 쓴다.
// 한 화면에서 용어마다 처음 한 번, 단계 화면은 5개·참고 쪽은 8개까지, 한 문단에 2개까지. noMark 용어와 이미 연 용어는 긋지 않는다.
import type { GlossaryIndex } from './glossary.ts';
import { findTerms } from './glossary.ts';

/** 글 조각, 또는 밑줄 말 (id = 풀이 항목 id, text = 원문 그대로의 용어 글자. 조사 꼬리는 밑줄 밖) */
export type TermSegment = string | { id: string; text: string };

/** 한 화면의 밑줄 셈 */
export interface MarkBudget {
  /** 이 화면에서 이미 그은 용어 */
  used: Set<string>;
  /** 더 그을 수 있는 수 */
  left: number;
}

export const MARKS_PER_PARAGRAPH = 2;
/** 단계 화면 (만들 앱 정하기·도구 고르기·도구끼리 맞춰 보기·설계도 받기) */
export const MARKS_STAGE = 5;
/** 참고 쪽 (도구 카드, 용어 카드, 사전) */
export const MARKS_REFERENCE = 8;

export function markBudget(limit: number): MarkBudget {
  return { used: new Set(), left: limit };
}

/**
 * 글을 나눈다. skip에 든 용어(이미 연 용어, 그 카드 자신의 용어)는 긋지 않는다. budget은 고쳐 쓴다 (같은 화면의 다음 칸이 이어 센다).
 * 한 글자 열쇠는 보지 않는다 (findTerms).
 */
export function segmentTerms(text: string, index: GlossaryIndex, budget: MarkBudget, skip: ReadonlySet<string> = new Set(), perParagraph = MARKS_PER_PARAGRAPH): TermSegment[] {
  const out: TermSegment[] = [];
  let at = 0;
  let n = 0;
  for (const m of findTerms(index, text)) {
    if (budget.left <= 0 || n >= perParagraph) break;
    const id = m.entry.id;
    if (m.entry.noMark || budget.used.has(id) || skip.has(id)) continue;
    if (m.start > at) out.push(text.slice(at, m.start));
    out.push({ id, text: text.slice(m.start, m.keyEnd) });
    at = m.keyEnd;
    budget.used.add(id);
    budget.left -= 1;
    n += 1;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
