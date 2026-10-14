// 화면에서 쓰는 이용자 기기 시각 (엔진은 시각을 읽지 않으므로 화면이 만들어 넘긴다, ENGINE.md 0절).
export function issuedNow(d: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
