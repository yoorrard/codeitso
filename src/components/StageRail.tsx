// 단계 줄 섬 (docs/CONCEPT.md 5.8): 시운전 → 목적지 → 경유지 → 점검 → 도착. 단계 화면에만 머리줄 아래에 나온다.
// 지금 단계는 먹색 알약(aria-current="step"), 마친 단계는 ✓, 못 가는 단계는 흐린 글자와 점선, 누르면 이유를 알린다.
// 폭이 모자라거나 글자를 키우면(컨테이너 쿼리) '경유지 · 3/5' 단추 하나로 접히고, 누르면 다섯 단계가 큰 줄로 나오는 창이 열린다.
// 빌드 때는 처음 온 사람 기준(빈 진행)으로 그리고, 브라우저에서 붙은 뒤 저장된 진행으로 바꾼다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import type { MastheadState } from '../lib/masthead-state.ts';
import { mastheadState } from '../lib/masthead-state.ts';
import { $result } from '../lib/result.ts';
import type { StageId } from '../lib/stages.ts';
import { STAGES } from '../lib/stages.ts';
import { $meta, $storageOk } from '../lib/store.ts';
import { sfx } from '../lib/sfx.ts';
import { Icon } from './Icon.tsx';

interface Props {
  /** 지금 단계 */
  stage: StageId;
  /** 빌드 때 계산한 처음 온 사람 기준 값 (붙기 전 그림과 같아야 한다) */
  initial: MastheadState;
}

export default function StageRail({ stage, initial }: Props) {
  const [ready, setReady] = useState(false);
  const live = useStore($result);
  const meta = useStore($meta);
  const storageOk = useStore($storageOk);
  const [hint, setHint] = useState('');
  const nav = useRef<HTMLElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const refocus = useRef(-1);
  const [fresh, setFresh] = useState<StageId[]>([]);
  const seen = useRef<StageId[] | null>(null);

  // 붙는 순간 못 가는 단계의 단추가 링크로 바뀌어도 초점을 잃지 않게, 초점 받은 칸을 기억했다가 되돌린다
  useEffect(() => {
    const items = [...(nav.current?.querySelectorAll('.rail-list li') ?? [])];
    refocus.current = items.findIndex((li) => li.contains(document.activeElement));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || refocus.current < 0) return;
    nav.current?.querySelectorAll('.rail-list li')[refocus.current]?.querySelector<HTMLElement>('a, button')?.focus();
    refocus.current = -1;
  }, [ready]);

  const view = ready ? mastheadState(live, meta) : initial;
  const p = view.progress;
  const openIds = STAGES.filter((s) => view.gates[s.id].open).map((s) => s.id);

  // 붙은 뒤 처음 읽은 저장 상태는 기준으로만 삼고, 그 뒤 이 화면에서 새로 열린 단계만 알린다
  useEffect(() => {
    if (!ready) return;
    const before = seen.current;
    seen.current = openIds;
    if (!before) return;
    const opened = openIds.filter((id) => !before.includes(id));
    if (opened.length === 0) return;
    setFresh(opened);
    announce(fill(ko.layout.opened, { names: opened.map((id) => ko.stages[id]).join(', ') }));
    void sfx('arrive');
  }, [ready, openIds.join(' ')]);

  const index = STAGES.findIndex((s) => s.id === stage);
  const tell = (id: StageId, reason: string): void => {
    setHint(`${ko.stages[id]}: ${reason}`);
    announce(`${ko.stages[id]}: ${reason}`);
  };

  const item = (id: StageId, path: string, big: boolean) => {
    const g = view.gates[id];
    const done = p.stages[id];
    const current = id === stage;
    const state = current ? 'current' : done ? 'done' : g.open ? 'open' : 'locked';
    const reason = g.reason ? ko.locks[g.reason] : ko.locks.generic;
    return (
      <li class={`step ${state}${id === 'test-drive' ? ' optional' : ''}${fresh.includes(id) ? ' just-opened' : ''}`}>
        {/* 지금 단계는 늘 링크로: 붙기 전후로 같은 요소다 */}
        {g.open || current ? (
          <a href={path} aria-current={current ? 'step' : undefined}>
            {done && !current && <Icon name="check" size="16px" />}
            <span class="step-name">{ko.stages[id]}</span>
            {done && !current && <span class="visually-hidden">({ko.layout.passed})</span>}
          </a>
        ) : (
          <button type="button" aria-disabled="true" onClick={() => tell(id, reason)}>
            <span class="step-name">{ko.stages[id]}</span>
            {big ? <span class="step-reason">{reason}</span> : <span class="visually-hidden">({ko.layout.locked}. {reason})</span>}
          </button>
        )}
      </li>
    );
  };

  return (
    <nav ref={nav} aria-label={ko.layout.routeLabel} class="rail">
      <ol class="rail-list">{STAGES.map((s) => item(s.id, s.path, false))}</ol>
      <button ref={toggle} type="button" class="rail-toggle" aria-haspopup="dialog" onClick={() => sheet.current?.showModal()}>
        <span class="rail-toggle-text">{fill(ko.progress.short, { stage: ko.stages[stage], n: index + 1 })}</span>
        <span class="rail-bars" aria-hidden="true">
          {STAGES.map((s) => (
            <span class={s.id === stage ? 'bar here' : p.stages[s.id] ? 'bar done' : 'bar'} />
          ))}
        </span>
        <span class="visually-hidden">{ko.progress.sheetOpen}</span>
      </button>
      <p class="visually-hidden">{fill(ko.progress.text, { passed: p.passed })}</p>
      {hint && <p class="route-hint">{hint}</p>}
      {ready && !storageOk && <p class="storage-off">{ko.layout.storageOff}</p>}
      <dialog ref={sheet} class="sheet stage-sheet" aria-labelledby="stage-sheet-title" onClose={() => toggle.current?.focus()}>
        <div class="sheet-head">
          <h2 id="stage-sheet-title">{ko.progress.sheetTitle}</h2>
          <form method="dialog">
            <button class="icon-btn" aria-label={ko.progress.close}>
              <Icon name="close" />
            </button>
          </form>
        </div>
        <ol class="stage-sheet-list">{STAGES.map((s) => item(s.id, s.path, true))}</ol>
      </dialog>
    </nav>
  );
}
