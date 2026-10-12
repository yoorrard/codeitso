// 머리말 섬: 노선 띠(정류장 다섯), 행선지 전광판, 주행 거리 계기판, 설정 메뉴 (docs/UX.md 2절, DESIGN.md 5절).
// 빌드 때는 처음 온 사람 기준(빈 진행)으로 그리고, 브라우저에서 붙은 뒤 저장된 진행으로 바꾼다.
// M1(차가 앞 정류장에서 달려옴·지나온 길 칠하기)은 첫 그림 전 스크립트와 CSS가 하고, 이 섬은 M7을 맡는다:
// 화면 안에서 정류장이 열리면 핀이 톡 튀고, 정류장을 마치면 작은 도장이 찍히고, 주행 거리 숫자가 굴러간다.
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
import { dur } from '../lib/motion.ts';
import { sfx } from '../lib/sfx.ts';
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
  const [fresh, setFresh] = useState<{ opened: StationId[]; done: StationId[] }>({ opened: [], done: [] });
  const [rollKm, setRollKm] = useState<number | null>(null);
  const seen = useRef<{ open: StationId[]; done: StationId[]; km: number } | null>(null);
  const rollFrame = useRef(0);

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
  const openIds = STATIONS.filter((s) => view.gates[s.id].open).map((s) => s.id);
  const doneIds = STATIONS.filter((s) => p.stations[s.id]).map((s) => s.id);

  // M7: 붙은 뒤 처음 읽은 저장 상태는 기준으로만 삼고, 그 뒤 이 화면에서 바뀐 것만 연출한다
  // 주행 거리가 바뀐 그림에서는 굴리기를 시작하기 전까지 앞 숫자를 그대로 보인다 (새 숫자가 번쩍 보였다가 굴러가지 않게)
  const last = seen.current;
  const shownKm = rollKm ?? (ready && last && last.km !== p.km ? last.km : p.km);

  useEffect(() => {
    if (!ready) return;
    const before = seen.current;
    seen.current = { open: openIds, done: doneIds, km: p.km };
    if (!before) return;
    const opened = openIds.filter((id) => !before.open.includes(id));
    // 지금 정류장을 마친 것은 무대의 큰 도장이 알린다 (머리말의 작은 도장이 먼저 찍히지 않게)
    const done = doneIds.filter((id) => !before.done.includes(id) && id !== station);
    if (opened.length > 0 || done.length > 0) setFresh({ opened, done });
    // 움직임이 알려 주는 것은 글로도 (같은 순간의 다른 알림 뒤에 이어 붙는다)
    if (opened.length > 0) {
      announce(fill(ko.layout.opened, { names: opened.map((id) => ko.stations[id]).join(', ') }));
      void sfx('arrive');
    }
    if (p.km === before.km) return;
    // 주행 거리 숫자 굴리기 (줄이기면 길이 0이라 바로 새 값). 굴린 뒤에도 rollKm에 마지막 값을 둔다
    const from = rollKm ?? before.km;
    const to = p.km;
    const length = dur('--dur-slow');
    cancelAnimationFrame(rollFrame.current);
    rollFrame.current = 0;
    if (length === 0) {
      setRollKm(to);
      return;
    }
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / length);
      const eased = 1 - (1 - t) ** 3;
      if (t >= 1) {
        rollFrame.current = 0;
        setRollKm(to);
        return;
      }
      setRollKm(Math.round(from + (to - from) * eased));
      rollFrame.current = requestAnimationFrame(step);
    };
    rollFrame.current = requestAnimationFrame(step);
  }, [ready, p.km, openIds.join(' '), doneIds.join(' ')]);
  // 화면을 누르거나 Esc면(기본 틀의 cc:skip) 굴리던 숫자를 바로 끝 값으로
  useEffect(() => {
    const finish = (): void => {
      if (rollFrame.current === 0) return;
      cancelAnimationFrame(rollFrame.current);
      rollFrame.current = 0;
      setRollKm(seen.current?.km ?? null);
    };
    document.addEventListener('cc:skip', finish);
    return () => {
      document.removeEventListener('cc:skip', finish);
      cancelAnimationFrame(rollFrame.current);
    };
  }, []);
  const odometer = fill(ko.odometer.text, { passed: p.passed, km: p.km });
  const here = station ? ko.stations[station] : p.km > 0 ? ko.board.resting : ko.board.away;
  const hereIndex = station ? STATIONS.findIndex((s) => s.id === station) : -1;
  const hereStyle = hereIndex >= 0 ? { '--here': String(hereIndex) } : undefined;

  return (
    <div class="masthead-inner">
      <nav ref={nav} aria-label={ko.layout.routeLabel} class="route">
        <ol class={hereIndex >= 0 ? 'has-here' : undefined} style={hereStyle}>
          {STATIONS.map((s) => {
            const g = view.gates[s.id];
            const done = p.stations[s.id];
            const current = s.id === station;
            const state = current ? 'current' : done ? 'done' : g.open ? 'open' : 'locked';
            const reason = g.reason ? ko.locks[g.reason] : ko.locks.generic;
            return (
              <li class={`stop ${state}${fresh.opened.includes(s.id) ? ' just-opened' : ''}${fresh.done.includes(s.id) ? ' just-done' : ''}`}>
                {current && <img class="route-car" src="/emoji/taxi.webp" width={28} height={28} alt="" />}
                {/* 지금 정류장은 늘 링크로: 붙기 전후로 같은 요소라 도착 연출이 다시 돌지 않는다 */}
                {g.open || current ? (
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
            {shownKm}
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
