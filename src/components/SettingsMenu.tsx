// 머리줄의 설정 (brief 6.13, D67): 모달 시트(<dialog class="modal">) 안의 줄 56 목록.
// 스위치 다섯(동작 줄이기 · 효과음 · 조용히 모시기 · 어려운 말 풀이 · 점선 밑줄) → 지난 영수증 보기 › → 저장한 기록 지우기(위험 글).
// 조용히 모시기·풀이·점선 밑줄은 여기서 저장만 한다($prefs). 그 동작은 장면(W5)과 풀이(W6b)가 $prefs를 읽어 붙인다.
// 지우기는 시트 위에 겹쳐 뜨는 확인 대화 상자(<dialog class="sheet">). 둘 다 초점 가두기·Esc, 시트를 닫으면 설정 버튼으로 초점을 돌린다.
// 지우고 나면 시트까지 닫아 설정 버튼으로 돌아간다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { ROUTES } from '../lib/routes.ts';
import { announce } from '../lib/announce.ts';
import { applyMotionPref } from '../lib/motion.ts';
import type { Prefs } from '../lib/saved.ts';
import { $prefs, clearAll, setPrefs } from '../lib/store.ts';
import { Icon } from './Icon.tsx';

const TITLE_ID = 'cc-settings-title';

interface Props {
  /** 기록을 지운 뒤 화면에 보일 안내 (낭독기 알림과 같은 글) */
  onCleared?: (message: string) => void;
}

/** 켜고 끄는 줄 하나: 줄 전체가 스위치 (role="switch"), 오른쪽 44×28 모양은 장식.
 *  둘째 줄(note)은 이름이 아니라 설명으로 잇는다. locked면 바꿀 수 없다 (기기 설정이 이미 켠 동작 줄이기) */
function SwitchRow({ id, label, note, on, locked = false, onToggle }: { id: string; label: string; note?: string; on: boolean; locked?: boolean; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-disabled={locked ? 'true' : undefined}
        aria-labelledby={`${id}-name`}
        aria-describedby={note ? `${id}-note` : undefined}
        class={note ? 'list-row is-tall' : 'list-row'}
        onClick={locked ? undefined : onToggle}
      >
        <span class="list-text">
          <span id={`${id}-name`} class="list-name">
            {label}
          </span>
          {note && (
            <span id={`${id}-note`} class="list-sub">
              {note}
            </span>
          )}
        </span>
        <span class="switch" aria-hidden="true" />
      </button>
    </li>
  );
}

export default function SettingsMenu({ onCleared }: Props) {
  const prefs = useStore($prefs);
  const gear = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
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

  /** 시트 뒤 어두운 막을 누르면 닫는다 (닫기 단추·Esc와 같다) */
  const backdrop = (e: MouseEvent): void => {
    const d = sheet.current;
    if (!d || e.target !== d) return;
    const box = d.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) d.close();
  };

  const reduce = prefs.motion === 'reduce';
  const flip = (key: 'sound' | 'quiet' | 'glossary' | 'marks'): void => setPrefs({ [key]: !prefs[key] } as Partial<Prefs>);

  return (
    <div class="settings">
      <button ref={gear} type="button" class="icon-btn" aria-haspopup="dialog" aria-label={ko.settings.open} onClick={() => sheet.current?.showModal()}>
        <Icon name="settings" />
      </button>

      <dialog ref={sheet} class="modal" aria-labelledby={TITLE_ID} onClose={() => gear.current?.focus()} onClick={backdrop}>
        <div class="modal-head">
          <h2 id={TITLE_ID} class="modal-title">
            {ko.settings.title}
          </h2>
          <form method="dialog">
            <button class="icon-btn" aria-label={ko.settings.close}>
              <Icon name="close" />
            </button>
          </form>
        </div>
        <ul class="list settings-list">
          {/* 기기에서 동작 줄이기가 켜져 있으면 사이트는 이미 줄이고 있다: 스위치를 켜진 채 잠그고 그 까닭을 둘째 줄에 */}
          <SwitchRow
            id="cc-set-motion"
            label={ko.settings.motion}
            note={osReduce && !reduce ? ko.settings.motionOs : undefined}
            on={reduce || osReduce}
            locked={osReduce && !reduce}
            onToggle={() => setPrefs({ motion: reduce ? 'auto' : 'reduce' })}
          />
          <SwitchRow id="cc-set-sound" label={ko.settings.sound} on={prefs.sound} onToggle={() => flip('sound')} />
          <SwitchRow id="cc-set-quiet" label={ko.settings.quiet} note={ko.settings.quietNote} on={prefs.quiet} onToggle={() => flip('quiet')} />
          <SwitchRow id="cc-set-glossary" label={ko.settings.glossary} on={prefs.glossary} onToggle={() => flip('glossary')} />
          <SwitchRow id="cc-set-marks" label={ko.settings.marks} note={ko.settings.marksNote} on={prefs.marks} onToggle={() => flip('marks')} />
          <li>
            <a class="list-row" href={ROUTES.receipts}>
              <span class="list-text">
                <span class="list-name">{ko.settings.receipts}</span>
              </span>
              <span class="list-chev" aria-hidden="true" />
            </a>
          </li>
          <li>
            <button type="button" class="list-row is-danger" aria-haspopup="dialog" onClick={() => clearDialog.current?.showModal()}>
              <span class="list-text">
                <span class="list-name">{ko.settings.clear}</span>
              </span>
            </button>
          </li>
        </ul>
      </dialog>

      <dialog ref={clearDialog} class="sheet" aria-labelledby="cc-clear-title" aria-describedby="cc-clear-body">
        <h2 id="cc-clear-title">{ko.settings.clearTitle}</h2>
        <p id="cc-clear-body">{ko.settings.clearBody}</p>
        <form method="dialog" class="sheet-actions">
          <button class="btn">{ko.settings.clearNo}</button>
          <button
            class="btn btn-danger"
            value="clear"
            onClick={() => {
              clearAll();
              // 설정 시트도 닫는다: 모달이 열려 있으면 #cc-live가 접근성 트리에서 빠져 알림이 묻힌다 (D64)
              sheet.current?.close();
              announce(ko.settings.cleared);
              onCleared?.(ko.settings.cleared);
            }}
          >
            {ko.settings.clearYes}
          </button>
        </form>
      </dialog>
    </div>
  );
}
