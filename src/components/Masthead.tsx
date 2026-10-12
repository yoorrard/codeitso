// 머리말 섬: 노선 띠(정류장 다섯), 행선지 전광판, 주행 거리 계기판, 설정 메뉴 (docs/UX.md 2절, DESIGN.md 5절).
// 빌드 때는 처음 온 사람 기준(빈 진행)으로 그리고, 브라우저에서 붙은 뒤 저장된 진행으로 바꾼다.
import { useStore } from '@nanostores/preact';
import { useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { evaluate, fill } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { progress } from '../lib/progress.ts';
import { $result } from '../lib/result.ts';
import { EMPTY_META, EMPTY_SESSION } from '../lib/saved.ts';
import type { StationId } from '../lib/stations.ts';
import { STATIONS, gate } from '../lib/stations.ts';
import { $meta, $storageOk, $study } from '../lib/store.ts';
import { Icon } from './Icon.tsx';
import { SettingsMenu } from './SettingsMenu.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);

interface Props {
  /** 지금 정류장. 홈·사전·소개 같은 곳은 null */
  station: StationId | null;
  /** 기사님 얼굴 그림 주소 (기본 틀이 빌드 때 만든다) */
  faceSrc: string;
}

export default function Masthead({ station, faceSrc }: Props) {
  const ready = useHydrated();
  const live = useStore($result);
  const study = useStore($study);
  const meta = useStore($meta);
  const storageOk = useStore($storageOk);
  const [hint, setHint] = useState('');

  const r = ready ? live : FIRST_VISIT;
  const p = progress(r, ready ? study : {}, ready ? meta : EMPTY_META);
  const odometer = fill(ko.odometer.text, { passed: p.passed, km: p.km });
  const here = station ? ko.stations[station] : ko.board.away;
  const hereIndex = station ? STATIONS.findIndex((s) => s.id === station) : -1;

  return (
    <div class="masthead-inner">
      <nav aria-label={ko.layout.routeLabel} class="route">
        <ol>
          {STATIONS.map((s, i) => {
            const g = gate(s.id, r);
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
        {hint && (
          <p class="route-hint" role="status">
            {hint}
          </p>
        )}
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
        <SettingsMenu progress={p} />
      </div>
      {ready && !storageOk && <p class="storage-off">{ko.layout.storageOff}</p>}
    </div>
  );
}
