// 머리말 섬: 노선 띠(정류장 다섯), 행선지 전광판, 주행 거리 계기판, 설정 메뉴 (docs/UX.md 2절, DESIGN.md 5절).
// 빌드 때는 처음 온 사람 기준(빈 진행)으로 그리고, 브라우저에서 붙은 뒤 저장된 진행으로 바꾼다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import type { MastheadState } from '../lib/masthead-state.ts';
import { mastheadState } from '../lib/masthead-state.ts';
import { $result } from '../lib/result.ts';
import type { StationId } from '../lib/stations.ts';
import { STATIONS } from '../lib/stations.ts';
import { $meta, $storageOk, $study } from '../lib/store.ts';
import { Icon } from './Icon.tsx';
import { SettingsMenu } from './SettingsMenu.tsx';

interface Props {
  /** 지금 정류장. 홈·사전·소개 같은 곳은 null */
  station: StationId | null;
  /** 기사님 얼굴 그림 주소 (기본 틀이 빌드 때 만든다) */
  faceSrc: string;
  /** 빌드 때 계산한 처음 온 사람 기준 값 (붙기 전 그림과 같아야 한다) */
  initial: MastheadState;
}

export default function Masthead({ station, faceSrc, initial }: Props) {
  const [ready, setReady] = useState(false);
  const live = useStore($result);
  const study = useStore($study);
  const meta = useStore($meta);
  const storageOk = useStore($storageOk);
  const [hint, setHint] = useState('');
  const nav = useRef<HTMLElement>(null);
  const refocus = useRef(-1);

  // 붙는 순간 잠긴 버튼이 링크로 바뀌어도 초점을 잃지 않게, 초점 받은 정류장 칸을 기억했다가 되돌린다
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

  const view = ready ? mastheadState(live, study, meta) : initial;
  const p = view.progress;
  const odometer = fill(ko.odometer.text, { passed: p.passed, km: p.km });
  const here = station ? ko.stations[station] : p.km > 0 ? ko.board.resting : ko.board.away;
  const hereIndex = station ? STATIONS.findIndex((s) => s.id === station) : -1;

  return (
    <div class="masthead-inner">
      <nav ref={nav} aria-label={ko.layout.routeLabel} class="route">
        <ol>
          {STATIONS.map((s, i) => {
            const g = view.gates[s.id];
            const done = p.stations[s.id];
            const current = s.id === station;
            const state = current ? 'current' : done ? 'done' : g.open ? 'open' : 'locked';
            const reason = g.reason ? ko.locks[g.reason] : ko.locks.generic;
            return (
              <li class={`stop ${state}${i < hereIndex ? ' behind' : ''}`}>
                {g.open ? (
                  <a href={s.path} aria-current={current ? 'step' : undefined}>
                    <span class="pin">
                      <img src={`/emoji/${s.emoji}.webp`} width={28} height={28} alt="" />
                      {done && (
                        <span class="done-mark" aria-hidden="true">
                          <Icon name="check" size="14px" />
                        </span>
                      )}
                    </span>
                    <span class="stop-name">{ko.stations[s.id]}</span>
                    {done && !current && <span class="visually-hidden">({ko.layout.passed})</span>}
                  </a>
                ) : (
                  <button
                    type="button"
                    aria-disabled="true"
                    onClick={() => {
                      setHint(`${ko.stations[s.id]}: ${reason}`);
                      announce(`${ko.stations[s.id]}: ${reason}`);
                    }}
                  >
                    <span class="pin">
                      <Icon name="lock" />
                    </span>
                    <span class="stop-name">{ko.stations[s.id]}</span>
                    <span class="visually-hidden">
                      ({ko.layout.locked}. {reason})
                    </span>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        {hint && <p class="route-hint">{hint}</p>}
      </nav>
      <div class="board-row">
        <p class="board">
          <img class="face" src={faceSrc} width={32} height={32} alt="" />
          <span class="board-text">
            {ko.board.now}: {here}
          </span>
        </p>
        <div class="odometer" role="progressbar" aria-label={ko.odometer.label} aria-valuemin={0} aria-valuemax={STATIONS.length} aria-valuenow={p.passed} aria-valuetext={odometer}>
          <span class="tabular" aria-hidden="true">
            {p.km}
          </span>
          <span class="unit" aria-hidden="true">
            {ko.board.km}
          </span>
        </div>
        <SettingsMenu progress={p} onCleared={setHint} />
      </div>
      {ready && !storageOk && <p class="storage-off">{ko.layout.storageOff}</p>}
    </div>
  );
}
