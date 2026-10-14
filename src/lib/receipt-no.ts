// 영수증 번호 뒤 4자리 (v5 S2): 계산할 때 담은 재료 id와 시각을 이은 글의 해시에서 계산한다 (saved.ts receiptNumber가 날짜를 앞에 붙인다).
// 같은 글이면 같은 번호라 시험에서 번호를 미리 알 수 있다.

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
