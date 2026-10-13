// 기사 메시지 (docs/CONCEPT.md 4.1, brief 6.1): 사건 때만 낸다. 왼쪽에 모자 배지 원(32px), 오른쪽에 두 문장 이하의 글.
// 닫기 단추(44px)로 접고, 저절로 닫히지 않는다. 얼굴 그림은 넣지 않는다 (기사는 로고 안에만 있다, D65).
import { useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { LOGO_BADGE } from '../lib/logo-paths.ts';
import { sentences } from '../lib/sentences.ts';
import { Icon } from './Icon.tsx';
import { Logo } from './Logo.tsx';

interface Props {
  /** 알림 한 줄 (600). 두 문장이어도 한 줄로 둔다: '도착했습니다. 요금은 0원입니다.' */
  title?: string;
  /** 다음 할 일 (400 --text-2). title이 없으면 첫 문장이 알림 줄이 된다 */
  text: string;
  /** 닫기 단추를 둘지 (도착처럼 화면의 제목 역할이면 닫지 않는다) */
  closable?: boolean;
  class?: string;
}

export function DispatchNote({ title, text, closable = true, class: cls }: Props) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <aside class={cls ? `dispatch-note ${cls}` : 'dispatch-note'} aria-label={ko.dispatch.label}>
      <Logo variant="badge" art={LOGO_BADGE} height={32} class="dispatch-badge" />
      <p>
        {title && <span class="line">{title}</span>}
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
