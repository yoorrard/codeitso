// 사전 옆 창 (T15): 아래 막대의 '사전' 링크를 누르면 페이지를 떠나지 않고 창으로 연다 (휴대폰은 아래에서 올라오는 창,
// 넓은 화면은 오른쪽 창). 자바스크립트가 없거나 새 탭으로 열면 /dictionary로 간다. Esc로 닫고 닫으면 '사전' 링크로 초점.
import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { Icon } from './Icon.tsx';

type DictProps = { autoFocus?: boolean };

export default function DictionaryPanel() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [Comp, setComp] = useState<ComponentType<DictProps> | null>(null);

  useEffect(() => {
    if (window.location.pathname.startsWith('/dictionary')) return;
    const onClick = (e: MouseEvent): void => {
      const link = (e.target as Element | null)?.closest<HTMLElement>('a.dict-btn');
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      opener.current = link;
      void import('./Dictionary.tsx').then((m) => setComp(() => m.default));
      dialog.current?.showModal();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return (
    <dialog ref={dialog} class="dict-sheet" aria-labelledby="dict-sheet-title" onClose={() => opener.current?.focus()}>
      <div class="dict-sheet-head">
        <h2 id="dict-sheet-title">{ko.dict.title}</h2>
        <form method="dialog">
          <button class="icon-btn" aria-label={ko.dict.close}>
            <Icon name="close" />
          </button>
        </form>
      </div>
      {Comp ? <Comp autoFocus /> : <p class="q-help">{ko.dict.loading}</p>}
    </dialog>
  );
}
