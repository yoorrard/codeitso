// 단계 줄 섬 (D64, docs/review/v2/brief.md 6.2): 내 AI 써 보기(연습, 번호 밖) → 1 만들 앱 정하기 → 2 도구 고르기
// → 3 도구끼리 맞춰 보기 → 4 설계도 받기. 단계 화면에만 머리줄 아래에 나온다.
// 펼침(컨테이너 40rem 이상, D64): 연습 글 링크 | 원 넷을 가는 선으로 잇는다. 마침 = 남색 원 + ✓, 지금 = 파랑 원 + 흰 숫자 + aria-current, 아직 = 흰 원.
// 접힘(그보다 좁거나 글자를 키움): '2/4 · 도구 고르기' 버튼 하나 + 4칸 막대. 누르면 단계 시트(<dialog>)가 열린다.
// 못 가는 단계는 링크가 아닌 버튼이고, 누르면 이유를 알린다. 단계 시트 안에서는 이유를 줄에 적어 두고 누를 수 없는 줄로 둔다
// (모달이 열린 동안에는 시트 밖 알림 자리가 읽히지 않는다).
// 빌드 때는 처음 온 사람 기준(빈 진행)으로 그리고, 붙은 뒤 저장된 진행으로 바꾼다. 붙으면 data-ready를 달아,
// 다시 온 손님에게는 그때까지 진행 표시를 감춘다(frame.css: 틀린 첫 그림을 보이지 않게).
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import type { MastheadState } from '../lib/masthead-state.ts';
import { mastheadState } from '../lib/masthead-state.ts';
import { $result } from '../lib/result.ts';
import { sentences } from '../lib/sentences.ts';
import type { Stage, StageId } from '../lib/stages.ts';
import { NUMBERED, STAGES, stageById, stageNumber } from '../lib/stages.ts';
import { $meta, $storageOk } from '../lib/store.ts';
import { sfx } from '../lib/sfx.ts';
import { Icon } from './Icon.tsx';

interface Props {
  /** 지금 단계 */
  stage: StageId;
  /** 빌드 때 계산한 처음 온 사람 기준 값 (붙기 전 그림과 같아야 한다) */
  initial: MastheadState;
}

type StepState = 'current' | 'done' | 'open' | 'locked';
type OpenedId = keyof typeof ko.layout.opened;
const isOpenedId = (id: StageId): id is OpenedId => id in ko.layout.opened;
const PRACTICE = stageById('test-drive');
/** 다음 단계가 열린 것을 화면 섬이 이미 알리는 단계: 만들 앱 정하기('기능마다 도구를 골라요.'), 도구끼리 맞춰 보기('막힌 곳이 없어요. 출발할까요?') */
const SAID_BY_SCREEN: StageId[] = ['destination', 'check'];

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

  // 붙는 순간 못 가는 단계의 버튼이 링크로 바뀌어도 초점을 잃지 않게, 초점 받은 칸을 기억했다가 되돌린다
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

  // 붙은 뒤 처음 읽은 저장 상태는 기준으로만 삼고, 그 뒤 이 화면에서 새로 열린 단계를 원으로 비춘다.
  // 알림은 바로 다음 단계가 열렸을 때만 하고(도구를 다 골랐다고 아직 맞춰 보지 않은 설계도 받기를 알리지 않는다),
  // 화면 섬이 같은 일을 이미 알리는 단계에서는 하지 않는다 (알림이 겹쳐 길어지지 않게). 소리는 '정함'(도착 차임은 도착에만)
  useEffect(() => {
    if (!ready) return;
    const before = seen.current;
    seen.current = openIds;
    if (!before) return;
    const opened = openIds.filter((id) => !before.includes(id));
    if (opened.length === 0) return;
    setFresh(opened);
    const next = STAGES[STAGES.findIndex((s) => s.id === stage) + 1]?.id;
    if (next && opened.includes(next) && isOpenedId(next) && !SAID_BY_SCREEN.includes(stage)) announce(ko.layout.opened[next]);
    void sfx('add');
  }, [ready, openIds.join(' ')]);

  const stateOf = (id: StageId): StepState => (id === stage ? 'current' : p.stages[id] ? 'done' : view.gates[id].open ? 'open' : 'locked');
  const reasonOf = (id: StageId): string => {
    const why = view.gates[id].reason;
    return why ? ko.locks[why] : ko.locks.generic;
  };
  const tell = (id: StageId): void => {
    const text = `${ko.stages[id]}: ${reasonOf(id)}`;
    setHint(text);
    announce(text);
  };

  const n = stageNumber(stage);
  const name = ko.stages[stage];
  const position = n === null ? fill(ko.progress.practice, { stage: name }) : fill(ko.progress.position, { n, stage: name });

  /** 원 24: 마침 ✓, 번호 단계는 숫자, 연습은 빈 고리 */
  const dot = (id: StageId, state: StepState) => (
    <span class={`step-dot${fresh.includes(id) ? ' just-opened' : ''}`} aria-hidden="true">
      {state === 'done' ? <Icon name="check" size="14px" /> : (stageNumber(id) ?? <span class="step-ring" />)}
    </span>
  );

  // 펼친 줄의 번호 단계 하나. 지나온 구간(앞 단계 마침 + 이 단계 마침·지금)은 굵은 파랑 선
  const step = (s: Stage, i: number) => {
    const state = stateOf(s.id);
    const prev = NUMBERED[i - 1];
    const reached = prev !== undefined && p.stages[prev.id] && (state === 'done' || state === 'current');
    return (
      <li class={`step ${state}${reached ? ' reached' : ''}`}>
        {/* 지금 단계는 늘 링크로: 붙기 전후로 같은 요소다 */}
        {state === 'locked' ? (
          <button type="button" aria-disabled="true" onClick={() => tell(s.id)}>
            {dot(s.id, state)}
            <span class="step-name">{ko.stages[s.id]}</span>
            <span class="visually-hidden">
              ({ko.layout.locked}. {reasonOf(s.id)})
            </span>
          </button>
        ) : (
          <a href={s.path} aria-current={state === 'current' ? 'step' : undefined}>
            {dot(s.id, state)}
            <span class="step-name">{ko.stages[s.id]}</span>
            {state === 'done' && <span class="visually-hidden">({ko.layout.passed})</span>}
          </a>
        )}
      </li>
    );
  };

  // 단계 시트의 줄: 원 + 이름 + 둘째 줄 + 오른쪽 상태. 둘째 줄은 H1 아래 한 줄의 앞 문장이고, 못 가는 줄은 그 대신 이유
  const row = (s: Stage) => {
    const state = stateOf(s.id);
    const body = (
      <>
        {dot(s.id, state)}
        <span class="sheet-step-text">
          <span class="sheet-step-name">
            {ko.stages[s.id]}
            {s.id === PRACTICE.id && <span class="sheet-step-opt"> ({ko.progress.optional})</span>}
          </span>
          <span class="sheet-step-sub">{state === 'locked' ? reasonOf(s.id) : sentences(ko.stageLeads[s.id])[0]}</span>
        </span>
        <span class="sheet-step-state">
          {state === 'done' && (
            <>
              {ko.progress.sheetDone}
              <Icon name="check" size="16px" />
            </>
          )}
          {state === 'current' && ko.progress.sheetNow}
          {state === 'locked' && ko.progress.sheetLocked}
        </span>
      </>
    );
    return (
      <li class={`sheet-step ${state}`}>
        {state === 'locked' ? (
          <div class="sheet-step-row">{body}</div>
        ) : (
          <a href={s.path} aria-current={state === 'current' ? 'step' : undefined} onClick={state === 'current' ? stay : undefined}>
            {body}
          </a>
        )}
      </li>
    );
  };

  /** 시트에서 지금 단계를 누르면 같은 화면을 다시 열지 않고 시트만 닫는다 */
  const stay = (e: MouseEvent): void => {
    e.preventDefault();
    sheet.current?.close();
  };
  /** 시트 뒤 어두운 막을 누르면 닫는다 (닫기 단추·Esc와 같다) */
  const backdrop = (e: MouseEvent): void => {
    const d = sheet.current;
    if (!d || e.target !== d) return;
    const box = d.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) d.close();
  };

  const practice = stateOf(PRACTICE.id);
  return (
    <nav ref={nav} aria-label={ko.layout.routeLabel} class="rail" data-ready={ready ? '' : undefined}>
      <div class="rail-full">
        <p class="visually-hidden">{position}</p>
        <a class={`rail-practice ${practice}`} href={PRACTICE.path} aria-current={practice === 'current' ? 'step' : undefined}>
          {practice === 'done' && <Icon name="check" size="16px" />}
          <span>{ko.stages[PRACTICE.id]}</span>
          <span class="rail-practice-opt">({ko.progress.optional})</span>
          {practice === 'done' && <span class="visually-hidden">({ko.layout.passed})</span>}
        </a>
        <span class="rail-divider" aria-hidden="true" />
        <ol class="rail-list">{NUMBERED.map(step)}</ol>
      </div>
      <button ref={toggle} type="button" class="rail-toggle" aria-haspopup="dialog" onClick={() => sheet.current?.showModal()}>
        <span class="rail-toggle-row" aria-hidden="true">
          <span class="rail-count">{n === null ? ko.progress.practiceCount : fill(ko.progress.count, { n })}</span>
          <span class="rail-sep">·</span>
          <span class="rail-name">{name}</span>
          <Icon name="expand" size="20px" />
        </span>
        <span class="visually-hidden">
          {position}. {ko.progress.sheetOpen}
        </span>
        <span class="rail-bars" aria-hidden="true">
          {/* 마친 칸은 남색(내 것), 지금 칸은 파랑(지금): 펼친 줄의 원과 같은 문법 (D64 검토 반영) */}
          {NUMBERED.map((s) => (
            <span class={n === null ? 'bar' : s.id === stage ? 'bar now' : p.stages[s.id] ? 'bar done' : 'bar'} />
          ))}
        </span>
      </button>
      {hint && <p class="route-hint">{hint}</p>}
      {ready && !storageOk && <p class="storage-off">{ko.layout.storageOff}</p>}
      <dialog ref={sheet} class="stage-sheet" aria-labelledby="stage-sheet-title" onClose={() => toggle.current?.focus()} onClick={backdrop}>
        <div class="sheet-head">
          <h2 id="stage-sheet-title">{ko.progress.sheetTitle}</h2>
          <form method="dialog">
            <button class="icon-btn" aria-label={ko.progress.close}>
              <Icon name="close" />
            </button>
          </form>
        </div>
        <ol class="sheet-steps">{STAGES.map(row)}</ol>
      </dialog>
    </nav>
  );
}
