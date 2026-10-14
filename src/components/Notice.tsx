// 알림 칸 (v4 D96: 옛 기사 메시지를 대신한다). 사건 때만 낸다: 막힌 곳이 다 풀림, 풀이 처음 안내.
// 왼쪽 그림 20 + 두 문장 이하의 글, 닫기 단추(44)로 접고 저절로 닫히지 않는다.
// 접을 때 초점이 닫기 단추에 있었으면 알림 다음의 누를 수 있는 것으로 옮긴다 (지운 단추와 함께 초점이 body로 사라지지 않게, WCAG 2.4.3).
import { useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { sentences } from '../lib/sentences.ts';
import { Icon } from './Icon.tsx';

interface Props {
  /** 알림 한 줄 (600). 두 문장이어도 한 줄로 둔다: '도착했습니다. 요금은 0원입니다.' */
  title?: string;
  /** 다음 할 일 (400 --text-2). title이 없으면 첫 문장이 알림 줄이 된다 */
  text: string;
  /** 닫기 단추를 둘지 (도착처럼 화면의 제목 역할이면 닫지 않는다) */
  closable?: boolean;
  class?: string;
  /** 앞 그림: 다 풀림은 check, 안내는 help */
  icon?: 'check' | 'help';
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([type="hidden"]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';

/** el 뒤(문서 순서)에서 처음 보이는 누를 수 있는 것. 없으면 본문 */
function nextFocus(el: Element): HTMLElement | null {
  for (const c of document.querySelectorAll<HTMLElement>(FOCUSABLE)) {
    if (el.contains(c) || !(el.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    if (c.getClientRects().length > 0 && !c.closest('[inert],[hidden]')) return c;
  }
  return document.getElementById('main');
}

export function Notice({ title, text, closable = true, class: cls, icon = 'help' }: Props) {
  const [open, setOpen] = useState(true);
  const box = useRef<HTMLElement>(null);
  if (!open) return null;
  const hide = (): void => {
    const el = box.current;
    if (el?.contains(document.activeElement)) nextFocus(el)?.focus();
    setOpen(false);
  };
  return (
    <aside ref={box} class={cls ? `notice ${cls}` : 'notice'} aria-label={ko.notice.label}>
      <Icon name={icon} size="20px" />
      <p>
        {/* 알림 줄이 두 문장이면 좁은 폭에서 어구 중간이 아니라 문장 사이에서 줄을 바꾼다 (Lead.tsx와 같은 .lead-s) */}
        {title && (
          <span class="line">
            {sentences(title).map((t, i) => (
              <>
                {i > 0 && ' '}
                <span class="lead-s">{t}</span>
              </>
            ))}
          </span>
        )}
        {/* 줄 사이 빈칸: 줄은 블록이라 보이지 않지만, 글을 복사하거나 이어 읽을 때 문장이 붙지 않게 */}
        {sentences(text).map((t, i) => (
          <>
            {(i > 0 || title) && ' '}
            <span class="line">{t}</span>
          </>
        ))}
      </p>
      {closable && (
        <button type="button" class="icon-btn notice-close" aria-label={ko.notice.hide} onClick={hide}>
          <Icon name="close" size="20px" />
        </button>
      )}
    </aside>
  );
}
