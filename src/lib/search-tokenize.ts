// 사전·진열대 검색의 낱말 나누기 (docs/ARCHITECTURE.md 7절). 색인을 만들 때와 찾을 때 같은 함수를 쓴다 (부작용 없음, 시험 있음).
//  1. 영문·숫자 덩어리와 한글 덩어리를 따로 자른다 ("API키는" → "api", "키는")
//  2. 한글 덩어리 끝의 흔한 조사를 뗀 꼴도 넣는다 ("키는" → "키")
//  3. 한 글자 낱말도 버리지 않고, 두 글자 이상이면 두 글자씩 끊은 조각도 넣는다 ("환경변수" → "환경", "경변", "변수")
//  4. 영문은 소문자로

const JOSA = ['에서', '으로', '은', '는', '이', '가', '을', '를', '에', '로', '와', '과', '의', '도', '만'];

function stripJosa(word: string): string | null {
  for (const j of JOSA) {
    if (word.length > j.length && word.endsWith(j)) return word.slice(0, -j.length);
  }
  return null;
}

function bigrams(word: string): string[] {
  const chars = [...word];
  if (chars.length < 2) return [];
  const out: string[] = [];
  for (let i = 0; i < chars.length - 1; i += 1) out.push(`${chars[i] ?? ''}${chars[i + 1] ?? ''}`);
  return out;
}

/** 글을 검색 낱말로 나눈다. 같은 낱말은 한 번만 */
export function tokenize(text: string): string[] {
  const out = new Set<string>();
  const chunks = text.toLowerCase().match(/[a-z0-9]+|[가-힣]+/g) ?? [];
  for (const chunk of chunks) {
    out.add(chunk);
    if (/^[a-z0-9]+$/.test(chunk)) continue;
    const base = stripJosa(chunk);
    const forms = base ? [chunk, base] : [chunk];
    if (base) out.add(base);
    if (chunk.length > 2) for (const f of forms) for (const b of bigrams(f)) out.add(b);
  }
  return [...out];
}
