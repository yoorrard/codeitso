// 머리줄의 설정 메뉴: 동작 줄이기, 효과음, 저장한 기록 지우기 (docs/CONCEPT.md 6.12절. 지난 영수증은 T32에서 더한다).
// 메뉴는 popover(바깥 누르기·Esc로 닫힘), 확인 창은 <dialog>(초점 가두기·Esc). 닫으면 설정 버튼으로 초점을 돌린다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { applyMotionPref } from '../lib/motion.ts';
import { $prefs, clearAll, setPrefs } from '../lib/store.ts';
import { Icon } from './Icon.tsx';

const MENU_ID = 'cc-settings';

interface Props {
  /** 기록을 지운 뒤 화면에 보일 안내 (낭독기 알림과 같은 글) */
  onCleared: (message: string) => void;
}

export function SettingsMenu({ onCleared }: Props) {
  const prefs = useStore($prefs);
  const gear = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const clearDialog = useRef<HTMLDialogElement>(null);
  const [osReduce, setOsReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setOsReduce(mq.matches);
    const on = (e: MediaQueryListEvent): void => setOsReduce(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // 사이트 설정의 동작 줄이기를 html에 붙인다 (첫 그림 전에는 기본 틀의 작은 스크립트가 한다)
  useEffect(() => applyMotionPref(prefs.motion), [prefs.motion]);

  const openDialog = (d: HTMLDialogElement | null): void => {
    menu.current?.hidePopover();
    d?.showModal();
  };
  const backToGear = (): void => gear.current?.focus();

  const reduce = prefs.motion === 'reduce';

  return (
    <div class="settings">
      <button ref={gear} type="button" class="icon-btn on-dark" popovertarget={MENU_ID} aria-label={ko.settings.open}>
        <Icon name="settings" />
      </button>
      <div ref={menu} id={MENU_ID} popover="auto" class="settings-panel" aria-label={ko.settings.title} role="group">
        <p class="settings-title">{ko.settings.title}</p>
        <button type="button" class="toggle-row" aria-pressed={reduce} onClick={() => setPrefs({ motion: reduce ? 'auto' : 'reduce' })}>
          <span>{ko.settings.motion}</span>
          <span class="switch" aria-hidden="true">{reduce ? ko.settings.on : ko.settings.off}</span>
        </button>
        {osReduce && !reduce && <p class="settings-note">{ko.settings.motionOs}</p>}
        <button type="button" class="toggle-row" aria-pressed={prefs.sound} onClick={() => setPrefs({ sound: !prefs.sound })}>
          <span>{ko.settings.sound}</span>
          <span class="switch" aria-hidden="true">{prefs.sound ? ko.settings.on : ko.settings.off}</span>
        </button>
        <button type="button" class="menu-row danger" onClick={() => openDialog(clearDialog.current)}>
          <Icon name="warning" />
          <span>{ko.settings.clear}</span>
        </button>
      </div>

      <dialog ref={clearDialog} class="sheet" aria-labelledby="cc-clear-title" aria-describedby="cc-clear-body" onClose={backToGear}>
        <h2 id="cc-clear-title">{ko.settings.clearTitle}</h2>
        <p id="cc-clear-body">{ko.settings.clearBody}</p>
        <form method="dialog" class="sheet-actions">
          <button class="btn">{ko.settings.clearNo}</button>
          <button
            class="btn btn-danger"
            value="clear"
            onClick={() => {
              clearAll();
              announce(ko.settings.cleared);
              onCleared(ko.settings.cleared);
            }}
          >
            {ko.settings.clearYes}
          </button>
        </form>
      </dialog>
    </div>
  );
}
