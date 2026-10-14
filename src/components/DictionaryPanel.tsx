// 사전 시트 (brief 6.12, D67 W3b; T15): 머리줄의 '사전'을 누르면 페이지를 떠나지 않고 모달 시트로 연다. 휴대폰은 위 모서리 20의
// 아래 시트(최대 높이 90%), 768px부터 가운데 640, 1024px 이상은 오른쪽 옆 창 400(parts.css .dict-sheet). 손잡이는 그리지 않는다.
// 자바스크립트가 없거나 새 탭으로 열면 /dictionary로 간다. Esc·닫기·뒤 막을 누르면 닫히고, 닫으면 '사전' 버튼으로 초점이 돌아온다.
// 열 때마다 검색 칸으로 초점을 준다(두 번째부터는 섬이 이미 붙어 있어 autoFocus가 다시 돌지 않는다).
// 시트가 열린 동안 바깥의 #cc-live는 접근성 트리에서 빠지므로, 결과 수·'복사했어요' 알림은 시트 안의 [data-live]로 간다 (announce.ts).
import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { Icon } from './Icon.tsx';
import { DICT_EVENT } from '../lib/dict-event.ts';

type DictProps = { autoFocus?: boolean; initial?: string; level?: 2 | 3 };

export default function DictionaryPanel() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [Comp, setComp] = useState<ComponentType<DictProps> | null>(null);
  // 어려운 말 풀이(TermPopover)에서 '사전에서 찾기'로 열면 그 말로 찾은 채 연다. 열 때마다 새로 그리게 key를 바꾼다
  const [initial, setInitial] = useState({ q: '', n: 0 });

  useEffect(() => {
    if (window.location.pathname.startsWith('/dictionary')) return;
    const onClick = (e: MouseEvent): void => {
      const link = (e.target as Element | null)?.closest<HTMLElement>('a.dict-btn');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      opener.current = link;
      void import('./Dictionary.tsx').then((m) => setComp(() => m.default));
      dialog.current?.showModal();
      // 처음 열 때는 아직 칸이 없다 (섬이 붙으며 autoFocus로 준다)
      dialog.current?.querySelector<HTMLInputElement>('#dict-q')?.focus();
    };
    const onAsk = (e: Event): void => {
      const q = (e as CustomEvent<{ q?: string }>).detail?.q ?? '';
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setInitial((s) => ({ q, n: s.n + 1 }));
      void import('./Dictionary.tsx').then((m) => setComp(() => m.default));
      if (!dialog.current?.open) dialog.current?.showModal();
    };
    document.addEventListener('click', onClick);
    document.addEventListener(DICT_EVENT, onAsk);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener(DICT_EVENT, onAsk);
    };
  }, []);

  /** 시트 뒤 어두운 막을 누르면 닫는다 (닫기 버튼·Esc와 같다) */
  const backdrop = (e: MouseEvent): void => {
    const d = dialog.current;
    if (!d || e.target !== d) return;
    const box = d.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) d.close();
  };

  return (
    <dialog ref={dialog} class="modal dict-sheet" aria-labelledby="dict-sheet-title" onClose={() => opener.current?.focus()} onClick={backdrop}>
      <div class="modal-head">
        <h2 id="dict-sheet-title" class="modal-title">
          {ko.dict.title}
        </h2>
        <form method="dialog">
          <button class="icon-btn" aria-label={ko.dict.close}>
            <Icon name="close" />
          </button>
        </form>
      </div>
      {Comp ? <Comp autoFocus initial={initial.q} key={initial.n} level={3} /> : <p class="dict-wait">{ko.dict.loading}</p>}
      <p class="visually-hidden" aria-live="polite" data-live />
    </dialog>
  );
}
