// data/aliases.json 모양: 이용자가 칠 말을 화면 말·자료에 잇는 낱말표 (AI 아님, D74·D83).
// 사전 검색 동의어(searchSynonyms, T35)와 직접 쓰기 낱말(T36: options·yesNo·aiNames·toolHints·gaps,
// docs/review/v3/input.md 6·9.2절)이 한 파일에 있다. 칸마다 { id, aliases, … } 모양을 같이 쓴다(D85).
// 낱말 찾기(src/lib/engine/match.ts)는 직접 쓰기 칸을 처음 열 때 이 표와 함께 늦게 받는다. 엔진 계산(evaluate)은 이 표를 읽지 않는다.

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

/** 낱말 한 줄: 대상 id와 그 대상을 가리키는 이용자 말. 말 앞의 `=`는 '어절 하나 전체가 같을 때만' (input.md 6.2절) */
export interface AliasEntry {
  id: string;
  aliases: string[];
}

/** 예·아니요 질문의 공통 말 (input.md 6.5절). 적힌 순서(아니요 → 모르겠어요 → 아마 → 네)대로 정한다 */
export type YesNoAnswer = 'no' | 'unknown' | 'maybe' | 'yes';
export interface YesNoTable {
  /** 질문 id → 그 질문의 주제어 (예: q.login → 로그인·회원). 주제어만 있으면 '네' 쪽 증거 */
  topics: Record<string, string[]>;
  /** 공통 말 넷. id는 예·아니요 질문의 보기 id와 같다 */
  answers: { id: YesNoAnswer; aliases: string[] }[];
  /** 주제어 바로 뒤에 오면 그 주제어를 '아니요' 쪽으로 바꾸는 부정 조각 (열쇠가 아니라 글 조각이라 한 글자도 된다) */
  negAfter: string[];
  /** 부정 조각을 볼 거리 (공백 뺀 글자 수) */
  negWindow: number;
}

/**
 * `q.ai`(어떤 AI로 만드나요)의 직접 쓰기를 읽는 말 (input.md 5.5절):
 * 에이전트 이름이 있으면 '코딩 에이전트', 빌더 이름이 있으면 '웹에서 만드는 도구', 유료 말이 있으면 '유료 AI 구독',
 * 그 밖에 채팅 이름이나 무료 말이 있으면 '무료 AI 채팅'.
 */
export type AiNameKind = 'agent' | 'builder' | 'chat' | 'paid' | 'free';

/**
 * 도구 이름 짐작 (설계서 7.3·7.5절): 서비스·도구 이름 → 진열 상품 id(`product`) 또는 갈래(`capability` + `domain`).
 * 진열 상품의 공식 이름(products.json name)은 따로 적지 않아도 찾고, 여기에는 한글 표기·다른 이름만 둔다
 */
export interface ToolHint {
  id: string;
  aliases: string[];
  /** 이미 목록에 있는 도구 ("수파베이스" → supabase) */
  product?: string;
  /** 같은 일을 하는 갈래 ("OpenWeather" → 외부 데이터 · 날씨) */
  capability?: string;
  domain?: string;
}

/** 직접 쓴 글을 찾는 자리 (input.md 6.8절): 질문의 직접 쓰기, 마지막 한 줄(line), 목록에 없는 도구 이름(tool) */
export type GapWhere = string;

/** 코드쇼퍼가 아직 못 하는 바람 (input.md 6.8절). 찾으면 화면이 숨기지 않고 말하고, 엔진은 research.gap-<id> 카드를 더한다 */
export interface Gap {
  id: string;
  aliases: string[];
  where: GapWhere[];
  /** 화면 알림 한 줄 (해요체) */
  message: string;
}

/**
 * 느낌 질문(q.style)의 보기 낱말은 data/looks.json keywords.mood에 둔다 (설계서 3.9절: 느낌·색 낱말은 looks.json, T38).
 * 낱말 찾기 표(options)에 그 질문 칸으로 끼운다: 직접 쓰기 칸의 '가까운 보기'와 디자인 정하기가 같은 낱말을 쓴다
 */
export const STYLE_QUESTION = 'q.style';
export function withStyleWords(al: Aliases, mood: AliasEntry[]): Aliases {
  return { ...al, options: { ...al.options, [STYLE_QUESTION]: mood } };
}

export interface Aliases {
  version: 1;
  searchSynonyms: SearchSynonym[];
  /** 질문 id → 보기마다 낱말 (예·아니요 질문과 q.ai는 따로) */
  options: Record<string, AliasEntry[]>;
  yesNo: YesNoTable;
  aiNames: { id: AiNameKind; aliases: string[] }[];
  toolHints: ToolHint[];
  gaps: Gap[];
}

/** 이름 견주기 꼴: 소문자, 공백 없음 */
export function nameKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

/** 폭 없는 글자 (input.md 6.1절): U+200B~200D, U+2060, U+FEFF, U+00AD */
const INVISIBLE = /[​-‍⁠﻿­]/g;
/** 글자·숫자·+·# 밖의 것은 띄어쓰기로 본다 (src/lib/glossary.ts normalizeTerm과 같은 기준) */
const NOT_KEPT = /[^\p{L}\p{N}+#]+/gu;

/** 낱말 찾기 정규화 (input.md 6.1절): NFKC, 소문자, 폭 없는 글자 지움, 글자·숫자·+·# 밖은 띄어쓰기 하나로 */
export function normalizeWords(text: string): string {
  return text.replace(INVISIBLE, '').normalize('NFKC').toLowerCase().replace(NOT_KEPT, ' ').trim();
}

/**
 * 낱말표 열쇠의 견줄 꼴 (input.md 6.2절): `=`로 시작하면 어절 하나 전체가 같을 때만 맞는다(whole).
 * key는 정규화한 뒤 띄어쓰기를 뺀 글. 같은 칸에서 key가 같으면 같은 열쇠로 본다(검사 npm run validate)
 */
export function aliasKey(word: string): { key: string; whole: boolean } {
  const whole = word.startsWith('=');
  return { key: normalizeWords(whole ? word.slice(1) : word).replace(/ /g, ''), whole };
}
