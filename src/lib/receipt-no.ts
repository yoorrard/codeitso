// 영수증 번호 4자리 (brief 6.8·6.11): 영수증 링크 조각(#r= 뒤)의 해시에서 계산한다. 표시만 하고 저장하지 않는다.
// 같은 링크면 어디서 보든(지난 영수증 줄, 영수증 머리, 링크 미리 보기) 같은 번호가 나와 같은 영수증인지 한눈에 알 수 있다.

/** FNV-1a 32비트 해시를 10000으로 나눈 나머지를 네 자리로 ('0427') */
export function receiptNo(fragment: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < fragment.length; i += 1) {
    h ^= fragment.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return String(h % 10000).padStart(4, '0');
}

/** 받은 때('2026-10-13 14:05')를 화면 글자 조각으로. 올해면 연도를 뺀다. 모양이 다르면 null */
export function receiptDate(at: string, thisYear: number): { y: number; m: number; d: number; sameYear: boolean } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(at);
  if (!m) return null;
  const y = Number(m[1]);
  return { y, m: Number(m[2]), d: Number(m[3]), sameYear: y === thisYear };
}
