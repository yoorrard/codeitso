// 공유 버튼 (N1): 휴대폰처럼 기기 공유 창(Web Share API)이 있으면 그것을 열고, 없으면 이 화면 주소를 복사한다.
// 주소만 넘긴다 (사이트가 따로 보내는 것은 없다). 복사했으면 잠깐 '복사했어요'로 바꾸고 화면 낭독기에 알린다.
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { copyText } from '../lib/clipboard.ts';
import { Icon } from './Icon.tsx';

interface Props {
  title: string;
}

const DONE_MS = 2000;

export function ShareButton({ title }: Props) {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function share(): Promise<void> {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (e) {
        // 이용자가 공유 창을 닫았으면 그대로 둔다. 그 밖의 실패는 복사로 넘어간다
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    const ok = await copyText(url);
    announce(ok ? ko.item.shareCopied : ko.common.copyFailed);
    if (!ok) return;
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), DONE_MS);
  }

  return (
    <button type="button" class="btn btn-text detail-share" onClick={() => void share()} aria-label={ko.item.shareLabel}>
      <Icon name={done ? 'check' : 'share'} size="18px" />
      <span aria-hidden="true">{done ? ko.common.copied : ko.item.share}</span>
    </button>
  );
}
