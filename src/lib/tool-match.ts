// 도구 이름 찾기 묶음 (T37, 설계서 7.5절, input.md 8.1절): 2단계 '목록에 없는 도구 쓰기'의 낱말 찾기(engine/match.ts matchTool)와
// 도구 짐작 말·빈틈 낱말표를 묶은 지연 모듈. 도구 이름 칸을 처음 펼칠 때 import()로 받는다(qa:budget '도구 이름 찾기 묶음').
// 낱말표는 가상 모듈(virtual:cc-data/tool-aliases)로 이 칸만 싣는다: 1단계 찾기 묶음(custom-match.ts)의 질문 칸을 받지 않게.
// 찾은 결과는 화면에 보여 주기만 한다: 세션에는 이용자가 누른 도구와 쓴 이름만 들어간다.
import tools from 'virtual:cc-data/tool-aliases';
import type { Aliases } from './aliases.ts';
import type { Catalog, EngineResult } from './engine/index.ts';
import type { ToolMatch } from './engine/match.ts';
import { looksLikeContact, matchTool } from './engine/match.ts';

// 질문 칸은 비워 둔다 (matchTool은 도구 짐작 말과 빈틈만 읽는다)
const table: Aliases = {
  version: 1,
  searchSynonyms: [],
  options: {},
  yesNo: { topics: {}, answers: [], negAfter: [], negWindow: 0 },
  aiNames: [],
  toolHints: tools.toolHints,
  gaps: tools.gaps,
};

/** 칸 slotId에 쓴 도구 이름: 이미 목록에 있는 도구 · 같은 갈래의 확인된 도구 · 빈틈 */
export function toolMatch(cat: Catalog, r: EngineResult, slotId: string, text: string): ToolMatch {
  return matchTool(cat, table, r, slotId, text);
}

/** 빈틈 알림 한 줄 (aliases.json gaps[].message) */
export function gapMessage(id: string): string {
  return table.gaps.find((g) => g.id === id)?.message ?? '';
}

export { looksLikeContact };
