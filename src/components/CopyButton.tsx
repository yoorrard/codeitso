// 복사 버튼 섬: 클립보드에 넣고 결과를 화면 낭독기에 알린다. 클립보드를 못 쓰면 숨은 글 상자로 한 번 더 시도한다 (src/lib/clipboard.ts).
// '복사했어요.'는 잠깐만 보이고 원래 글로 돌아간다 (같은 화면의 복사 버튼들이 같은 이름으로 남지 않게, WCAG 2.4.6).
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { copyText } from '../lib/clipboard.ts';
import { pop } from '../lib/motion.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';

interface Props {
  text: string;
  /** 같은 버튼이 여러 개일 때 화면 낭독기가 구별할 이름 (예: '1단계 문장 복사') */
  srLabel?: string;
  /** 보이는 버튼 글 (기본 '복사') */
  label?: string;
  /** 복사한 뒤 알릴 글 (기본 '복사했어요.') */
  done?: string;
  onCopied?: () => void;
  primary?: boolean;
}

/** '복사했어요.'를 보이는 시간 (모션이 아니라 글이 바뀌어 있는 시간) */
const DONE_MS = 2000;

export default function CopyButton({ text, srLabel, label, done, onCopied, primary = false }: Props) {
  const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle');
  const timer = useRef(0);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // 체크 아이콘이 작게 커지며 자리 잡는다 (U, D148)
  useEffect(() => {
    if (state === 'done') pop(btn.current?.querySelector('.icon-wrap'));
  }, [state]);

  async function copy(): Promise<void> {
    const ok = await copyText(text);
    setState(ok ? 'done' : 'fail');
    window.clearTimeout(timer.current);
    if (ok) timer.current = window.setTimeout(() => setState('idle'), DONE_MS);
    announce(ok ? (done ?? ko.common.copied) : ko.common.copyFailed);
    if (ok) {
      onCopied?.();
    }
  }

  return (
    <span class="copy-wrap">
      <button
        type="button"
        ref={btn}
        class={primary ? 'btn btn-primary copy-btn' : 'btn copy-btn'}
        data-state={state}
        onClick={() => void copy()}
        aria-label={srLabel && state === 'done' ? fill(ko.common.copiedLabel, { label: srLabel }) : srLabel}
      >
        <Icon name={state === 'done' ? 'check' : 'copy'} />
        <span aria-hidden={srLabel ? 'true' : undefined}>{state === 'done' ? ko.common.copied : (label ?? ko.common.copy)}</span>
      </button>
      {state === 'fail' && <span class="copy-fail">{ko.common.copyFailed}</span>}
    </span>
  );
}
