// 화면 낭독기 알림: 기본 틀의 aria-live 자리(#cc-live)에 짧은 글을 넣는다 (복사·담기·충돌 해결·도장 등).
export const LIVE_ID = 'cc-live';

export function announce(text: string): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(LIVE_ID);
  if (!el) return;
  // 같은 글을 다시 알릴 때도 읽히게 비웠다가 다음 그림 때 넣는다
  el.textContent = '';
  window.requestAnimationFrame(() => {
    el.textContent = text;
  });
}
