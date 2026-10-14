// 직접 쓰기 찾기 묶음 (T37, 설계서 7.3절, input.md 6절): 낱말 찾기(engine/match.ts)와 낱말표를 묶은 지연 모듈.
// 직접 쓰기 칸을 처음 펼칠 때 import()로 받는다(단계 화면 첫 묶음에 넣지 않는다, qa:budget '직접 쓰기 찾기 묶음' 8KB).
// 낱말표는 칸 이름으로 골라 싣는다: 사전 검색 동의어(searchSynonyms)는 색인을 만들 때만 쓰고, 도구 짐작 말(toolHints)은
// 도구 고르기의 '목록에 없는 도구 쓰기'가 따로 받는다. 빈틈 말을 품은 도구 짐작 말이 없어서 도구 이름의 빈틈도 같게 찾는다
// (tests/engine/match.test.ts가 지킨다). 찾은 결과는 화면에 보여 주기만 한다: 세션에는 이용자가 누른 보기와 쓴 글만 들어간다.
import { aiNames, gaps, options, yesNo } from '../../data/aliases.json';
import lookWords from 'virtual:cc-data/look-mood-words';
import type { Aliases } from './aliases.ts';
import { withStyleWords } from './aliases.ts';
import type { Catalog, Session } from './engine/index.ts';
import type { AnswerMatch } from './engine/match.ts';
import { gapsOfSession, looksLikeContact, matchAnswer } from './engine/match.ts';

// JSON import는 넓은 타입(string 등)으로 들어오므로, 스키마 검사(npm run validate)를 믿고 Aliases로 본다.
// 느낌 질문의 낱말은 looks.json keywords.mood에서 (T38): 디자인 정하기와 같은 표
const table = withStyleWords({ version: 1, searchSynonyms: [], toolHints: [], options, yesNo, aiNames, gaps } as unknown as Aliases, lookWords.mood);

/** 질문의 직접 쓰기 글에서 가까운 보기 (0~3개)·영문 자판 되돌리기·빈틈 */
export function answerMatch(cat: Catalog, questionId: string, text: string): AnswerMatch {
  return matchAnswer(cat, table, questionId, text);
}

/** 세션에 든 직접 쓴 글 전부에서 찾은 빈틈 id (session.gaps에 넣는다) */
export function sessionGaps(cat: Catalog, s: Pick<Session, 'notes' | 'freeText' | 'customTools'>): string[] {
  return gapsOfSession(cat, table, s);
}

/** 빈틈 알림 한 줄 (aliases.json gaps[].message) */
export function gapMessage(id: string): string {
  return table.gaps.find((g) => g.id === id)?.message ?? '';
}

export { looksLikeContact };
