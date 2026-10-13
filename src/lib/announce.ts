// 화면 낭독기 알림: 기본 틀의 aria-live 자리(#cc-live)에 짧은 글을 넣는다 (복사·담기·충돌 해결·도장 등).
// 모달 <dialog>가 열려 있으면 그 바깥은 접근성 트리에서 빠진다(#cc-live도 ignored: activeModalDialog). 그래서 초점이 든 모달 안의
// 알림 자리([data-live])에 쓴다. 모달이 처음부터 그 자리를 두지 않았으면 처음 알릴 때 만들어 둔다 (글은 GATHER_MS 뒤에 들어가 읽힌다).
export const LIVE_ID = 'cc-live';

/** 이만큼 안에 들어온 알림은 한 번에 읽는다. 누른 곳의 알림과 그 결과로 바뀐 머리말의 알림(한 그림 늦게 옴)이 서로 덮이지 않게 */
export const GATHER_MS = 120;

/** 모으는 중인 글 */
let pending: string[] = [];

/** 지금 초점이 든 모달 대화 상자 (없으면 null) */
function openModal(): HTMLDialogElement | null {
  const d = document.activeElement?.closest<HTMLDialogElement>('dialog') ?? null;
  return d?.matches(':modal') ? d : null;
}

/** 알림을 넣을 자리: 열린 모달 안의 [data-live], 없으면 #cc-live */
function liveRegion(): HTMLElement | null {
  const d = openModal();
  if (!d) return document.getElementById(LIVE_ID);
  let el = d.querySelector<HTMLElement>('[data-live]');
  if (!el) {
    el = document.createElement('p');
    el.className = 'visually-hidden';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('data-live', '');
    d.append(el);
  }
  return el;
}

export function announce(text: string): void {
  if (typeof document === 'undefined') return;
  if (pending.includes(text)) return;
  pending.push(text);
  if (pending.length > 1) return;
  // 같은 글을 다시 알릴 때도 읽히게 비웠다가 넣는다
  const first = liveRegion();
  if (first) first.textContent = '';
  window.setTimeout(() => {
    const msg = pending.join(' ');
    pending = [];
    // 자리는 넣을 때 다시 고른다: 그사이 대화 상자가 닫혔으면(고르고 닫는 시트) 기본 틀의 자리로
    const el = liveRegion();
    if (!el) return;
    if (el === first || el.textContent !== msg) el.textContent = msg;
    else {
      el.textContent = '';
      window.setTimeout(() => (el.textContent = msg), GATHER_MS);
    }
  }, GATHER_MS);
}
