// 머리줄 섬: 브랜드, 단계 줄(시운전 → 목적지 → 경유지 → 점검 → 도착), 설정 (docs/CONCEPT.md 5.8절, D56).
// 빌드 때는 처음 온 사람 기준(빈 진행)으로 그리고, 브라우저에서 붙은 뒤 저장된 진행으로 바꾼다.
// 단계가 화면 안에서 열리면 낭독기로 알리고 (켰다면) 소리 하나. 단계 줄의 모양은 T27에서 마무리한다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import type { MastheadState } from '../lib/masthead-state.ts';
import { mastheadState } from '../lib/masthead-state.ts';
import { $result } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import type { StageId } from '../lib/stages.ts';
import { STAGES } from '../lib/stages.ts';
import { $meta, $storageOk } from '../lib/store.ts';
import { sfx } from '../lib/sfx.ts';
import { Icon } from './Icon.tsx';
import { SettingsMenu } from './SettingsMenu.tsx';

interface Props {
  /** 지금 단계. 홈·사전·소개 같은 곳은 null (단계 줄을 그리지 않는다) */
  stage: StageId | null;
  /** 빌드 때 계산한 처음 온 사람 기준 값 (붙기 전 그림과 같아야 한다) */
  initial: MastheadState;
}

export default function Masthead({ stage, initial }: Props) {
  const [ready, setReady] = useState(false);
  const live = useStore($result);
  const meta = useStore($meta);
  const storageOk = useStore($storageOk);
  const [hint, setHint] = useState('');
  const nav = useRef<HTMLElement>(null);
  const refocus = useRef(-1);
  const [fresh, setFresh] = useState<StageId[]>([]);
  const seen = useRef<StageId[] | null>(null);

  // 붙는 순간 못 가는 단계의 버튼이 링크로 바뀌어도 초점을 잃지 않게, 초점 받은 칸을 기억했다가 되돌린다
  useEffect(() => {
    const items = [...(nav.current?.querySelectorAll('li') ?? [])];
    refocus.current = items.findIndex((li) => li.contains(document.activeElement));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || refocus.current < 0) return;
    nav.current?.querySelectorAll('li')[refocus.current]?.querySelector<HTMLElement>('a, button')?.focus();
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

  const progressText = fill(ko.progress.text, { passed: p.passed });

  return (
    <div class="masthead-inner">
      <div class="top-row">
        <a class="brand" href={ROUTES.home}>
          <span class="brand-mark" aria-hidden="true" />
          <span>{ko.site.name}</span>
        </a>
        <SettingsMenu onCleared={setHint} />
      </div>
      {stage && (
        <nav ref={nav} aria-label={ko.layout.routeLabel} class="rail">
          <ol role="list" aria-describedby="cc-progress">
            {STAGES.map((s) => {
              const g = view.gates[s.id];
              const done = p.stages[s.id];
              const current = s.id === stage;
              const state = current ? 'current' : done ? 'done' : g.open ? 'open' : 'locked';
              const reason = g.reason ? ko.locks[g.reason] : ko.locks.generic;
              return (
                <li class={`step ${state}${fresh.includes(s.id) ? ' just-opened' : ''}`}>
                  {/* 지금 단계는 늘 링크로: 붙기 전후로 같은 요소다 */}
                  {g.open || current ? (
                    <a href={s.path} aria-current={current ? 'step' : undefined}>
                      {done && <Icon name="check" size="14px" />}
                      <span class="step-name">{ko.stages[s.id]}</span>
                      {done && !current && <span class="visually-hidden">({ko.layout.passed})</span>}
                    </a>
                  ) : (
                    <button
                      type="button"
                      aria-disabled="true"
                      onClick={() => {
                        setHint(`${ko.stages[s.id]}: ${reason}`);
                        announce(`${ko.stages[s.id]}: ${reason}`);
                      }}
                    >
                      <span class="step-name">{ko.stages[s.id]}</span>
                      <span class="visually-hidden">
                        ({ko.layout.locked}. {reason})
                      </span>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
          <p id="cc-progress" class="visually-hidden">
            {progressText}
          </p>
          {hint && <p class="route-hint">{hint}</p>}
        </nav>
      )}
      {!stage && hint && <p class="route-hint">{hint}</p>}
      {ready && !storageOk && <p class="storage-off">{ko.layout.storageOff}</p>}
    </div>
  );
}
