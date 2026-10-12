// 이름 뒤 조사를 받침에 맞게 고른다 (.claude/rules/copy.md '자리 표시와 조사').
// 마지막 한글 글자의 받침을 본다. 한글이 없으면 숫자·영문 끝소리로 어림하고, 그래도 모르면 '을(를)' 꼴.

/** 조사 종류: obj 을/를, subj 이/가, topic 은/는, and 과/와, dir 으로/로 */
export type JosaKind = 'obj' | 'subj' | 'topic' | 'and' | 'dir';
const PAIRS: Record<JosaKind, [string, string]> = {
  obj: ['을', '를'],
  subj: ['이', '가'],
  topic: ['은', '는'],
  and: ['과', '와'],
  dir: ['으로', '로'],
};

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
    if (/[a-zA-Z]/.test(ch)) return /[lmnr]/i.test(ch) ? (/[lr]/i.test(ch) ? 'rieul' : true) : false;
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
