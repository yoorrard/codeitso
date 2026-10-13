// 기사 메시지 (docs/CONCEPT.md 4.1): 왼쪽에 브랜드 마크, 오른쪽에 두 문장 이하의 글. 그림 속 사람은 없다.
// 닫기 단추(44px)로 접고, 저절로 닫히지 않는다. 나중에 소유자가 캐릭터를 주면 마크 자리(원형 40px)에만 넣으면 된다.
import { useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { sentences } from '../lib/sentences.ts';
import { BrandMark } from './BrandMark.tsx';
import { Icon } from './Icon.tsx';

interface Props {
  text: string;
  /** 닫기 단추를 둘지 (도착처럼 화면의 제목 역할이면 닫지 않는다) */
  closable?: boolean;
  class?: string;
}

export function DispatchNote({ text, closable = true, class: cls }: Props) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <aside class={cls ? `dispatch-note ${cls}` : 'dispatch-note'} aria-label={ko.dispatch.label}>
      <BrandMark />
      <p>
        {sentences(text).map((t) => (
          <span class="line">{t}</span>
        ))}
      </p>
      {closable && (
        <button type="button" class="icon-btn dispatch-close" aria-label={ko.dispatch.hide} onClick={() => setOpen(false)}>
          <Icon name="close" size="20px" />
        </button>
      )}
    </aside>
  );
}
