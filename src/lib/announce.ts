// 화면 낭독기 알림: 기본 틀의 aria-live 자리(#cc-live)에 짧은 글을 넣는다 (복사·담기·충돌 해결·도장 등).
export const LIVE_ID = 'cc-live';

/** 이만큼 안에 들어온 알림은 한 번에 읽는다. 누른 곳의 알림과 그 결과로 바뀐 머리말의 알림(한 그림 늦게 옴)이 서로 덮이지 않게 */
export const GATHER_MS = 120;

/** 모으는 중인 글 */
let pending: string[] = [];

export function announce(text: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(LIVE_ID);
  if (!el) return;
  if (pending.includes(text)) return;
  pending.push(text);
  if (pending.length > 1) return;
  // 같은 글을 다시 알릴 때도 읽히게 비웠다가 넣는다
  el.textContent = '';
  window.setTimeout(() => {
    el.textContent = pending.join(' ');
    pending = [];
  }, GATHER_MS);
}
