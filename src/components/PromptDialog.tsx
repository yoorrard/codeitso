// 뽑은 프롬프트 창 (v5.1 D121): 영수증 대신 바로 붙여 넣을 프롬프트를 조금 사이버한 단말 화면에 보인다.
// 모달 <dialog>라 Esc·바깥 누르기·[닫기]로 닫히고 연 자리로 초점이 돌아간다. 열리면 큰 [복사]에 초점.
// 새로 뽑았으면 글이 위에서 아래로 펼쳐진다(--dur-reveal, 700ms 안쪽). 누르거나 키를 치면 바로 끝나고, 동작 줄이기면 펼침이 없다.
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { NavCategory } from '../lib/catalog/types.ts';
import { issuedNow } from '../lib/clock.ts';
import { downloadText } from '../lib/download.ts';
import { namesOf, promptFileName, promptText } from '../lib/prompt.ts';
import type { PromptEntry } from '../lib/saved.ts';
import { fill } from '../lib/text.ts';
import { track } from '../lib/track.ts';
import CopyButton from './CopyButton.tsx';
import { Icon } from './Icon.tsx';

/** [.md 받기]: 프롬프트 글을 파일로 내려받고 알린다 (창과 지난 프롬프트가 같이 쓴다) */
export function downloadPrompt(p: PromptEntry, nav: NavCategory[]): void {
  const file = promptFileName(p.at);
  downloadText(file, promptText(p, namesOf(nav)));
  announce(fill(ko.prompt.downloaded, { file }));
  track('md_download');
}

interface Props {
  entry: PromptEntry;
  nav: NavCategory[];
  /** 방금 뽑았으면 펼치며 보인다 (지난 프롬프트에서 열면 바로) */
  fresh?: boolean;
  onClose: () => void;
}

export function PromptDialog({ entry, nav, fresh = false, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [done, setDone] = useState(!fresh);
  const text = promptText(entry, namesOf(nav));

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!d.open) d.showModal();
    d.querySelector<HTMLElement>('.term-acts .copy-btn')?.focus();
  }, []);

  return (
    <dialog
      ref={dlg}
      class="prompt-dlg"
      aria-labelledby="prompt-title"
      onClose={() => {
        onClose();
        const back = opener.current;
        if (back?.isConnected) back.focus();
      }}
      onClick={(e) => {
        if (e.target === dlg.current) dlg.current?.close();
      }}
      onPointerDown={() => setDone(true)}
      onKeyDown={() => setDone(true)}
    >
      <div class="term" data-done={String(done)} onAnimationEnd={() => setDone(true)}>
        <div class="term-bar">
          <span class="term-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span class="term-file" aria-hidden="true">
            {ko.prompt.file}
          </span>
          <button type="button" class="term-x" aria-label={ko.prompt.close} onClick={() => dlg.current?.close()}>
            <Icon name="close" size="20px" />
          </button>
        </div>
        <div class="term-head">
          <h2 id="prompt-title" class="term-title">
            {ko.prompt.title}
          </h2>
          <p class="term-meta">{fill(ko.prompt.meta, { n: entry.lines.length, date: issuedNow(new Date(entry.at)) })}</p>
        </div>
        <pre class="term-text" tabIndex={0} aria-labelledby="prompt-title">
          <code>{text}</code>
        </pre>
        <div class="term-acts">
          <CopyButton text={text} label={ko.prompt.copy} srLabel={ko.prompt.copyLabel} done={ko.prompt.copied} onCopied={() => track('md_copy')} primary />
          <button type="button" class="btn term-dl" aria-label={ko.prompt.downloadLabel} onClick={() => downloadPrompt(entry, nav)}>
            <Icon name="download" size="20px" />
            {ko.prompt.download}
          </button>
        </div>
        <p class="term-hint">{ko.prompt.hint}</p>
      </div>
    </dialog>
  );
}
