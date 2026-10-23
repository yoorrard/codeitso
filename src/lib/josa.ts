// 이름 뒤 조사를 받침에 맞게 고른다 (.claude/rules/copy.md '자리 표시와 조사').
// 마지막 한글 글자의 받침을 본다. 한글이 없으면 숫자·영문 끝소리로 어림하고, 그래도 모르면 '을(를)' 꼴.

/** 조사 종류: obj 을/를, subj 이/가, topic 은/는, and 과/와, dir 으로/로, cop 이에요/예요 */
export type JosaKind = 'obj' | 'subj' | 'topic' | 'and' | 'dir' | 'cop';
const PAIRS: Record<JosaKind, [string, string]> = {
  obj: ['을', '를'],
  subj: ['이', '가'],
  topic: ['은', '는'],
  and: ['과', '와'],
  dir: ['으로', '로'],
  cop: ['이에요', '예요'],
};

/**
 * 영문으로 끝나는 이름의 끝소리 어림 (직접 쓴 도구 이름도 지나간다).
 * 대문자 줄임말(API·HTML·LLM)은 글자 이름으로: L·R(엘·알)은 ㄹ받침, M·N(엠·엔)은 받침, 나머지(에이·티·에스)는 받침 없음.
 * 낱말은: 'ng' ㅇ받침(Hosting 호스팅), 'l'·'le' ㄹ받침(Vercel·Airtable), 'm'·'n' 받침(Telegram·Notion),
 * 'ck'와 짧은 홀소리 뒤 p·k·t는 받침(Slack 랙·Desktop 톱·Webhook 훅·Replit 릿·Bot 봇·App 앱).
 * 긴 소리(ee·ea·oa·ai·ui) 뒤 t, 닿소리 뒤 t(Bolt 볼트), 'r'(-er·-or: OpenWeather 웨더·Cursor 커서), 그 밖(e·s·x·y…)은 받침 없음
 */
function latinBatchim(end: string): boolean | 'rieul' {
  const last = end.slice(-1);
  const prev = end.slice(-2, -1);
  if (/[A-Z]/.test(last) && !/[a-z]/.test(prev)) return /[LR]/.test(last) ? 'rieul' : /[MN]/.test(last);
  const w = end.toLowerCase();
  if (/ng$/.test(w)) return true;
  if (/l(e)?$/.test(w)) return 'rieul';
  if (/[mn]$/.test(w)) return true;
  if (/ck$|pp$|[aeiou][pk]$/.test(w)) return true;
  return /[aeiou]t$/.test(w) && !/(ee|ea|oa|ai|ui)t$/.test(w);
}

/** 받침이 있으면 true, ㄹ받침이면 'rieul', 모르면 null */
function batchim(word: string): boolean | 'rieul' | null {
  for (let i = word.length - 1; i >= 0; i -= 1) {
    const c = word.charCodeAt(i);
    if (c >= 0xac00 && c <= 0xd7a3) {
      const jong = (c - 0xac00) % 28;
      if (jong === 0) return false;
      return jong === 8 ? 'rieul' : true;
    }
    const ch = word[i] ?? '';
    if (/[0-9]/.test(ch)) return '013678'.includes(ch) ? (ch === '1' || ch === '7' || ch === '8' ? 'rieul' : true) : false;
    if (/[a-zA-Z]/.test(ch)) return latinBatchim(word.slice(0, i + 1));
  }
  return null;
}

export function josa(word: string, kind: JosaKind): string {
  const [withB, withoutB] = PAIRS[kind];
  const b = batchim(word);
  if (b === null) return `${word}${withB}(${withoutB})`;
  // ㄹ받침 뒤에는 '로' (서울로)
  if (kind === 'dir') return word + (b === true ? withB : withoutB);
  return word + (b === false ? withoutB : withB);
}
