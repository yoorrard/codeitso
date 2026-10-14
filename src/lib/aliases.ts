// data/aliases.json 모양: 이용자가 칠 말을 화면 말·자료에 잇는 낱말표 (AI 아님, D74·D83).
// 지금은 사전 검색 동의어(searchSynonyms, T35)만 있다. T36이 같은 파일에 질문별 낱말(options·yesNo·aiNames)·
// products·toolHints·gaps를 더한다(docs/review/v3/input.md 9.2절). 칸마다 { id, aliases, … } 모양을 같이 쓴다.

/**
 * 검색 동의어 한 줄 (docs/review/v3/brief.md 3.5절). 화면 문구에서 쓰지 않는 말(테마·폰트·가이드…)도 검색어로는 받는다:
 * 색인을 만들 때 `to`의 이름을 가진 문서에 `aliases`를 열쇠 말로 붙인다. 그 이름의 문서가 아직 없으면 아무것도 붙지 않는다.
 */
export interface SearchSynonym {
  id: string;
  /** 이용자가 칠 말. 띄어 쓴 말은 붙여 쓴 꼴도 함께 찾힌다 */
  aliases: string[];
  /** 대신 찾을 화면 말·문서 이름(용어 카드·풀이 용어·에러 안내·도구의 이름이나 다른 이름과 띄어쓰기·대소문자를 빼고 같아야 붙는다) */
  to: string[];
}

export interface Aliases {
  version: 1;
  searchSynonyms: SearchSynonym[];
}

/** 이름 견주기 꼴: 소문자, 공백 없음 */
export function nameKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}
