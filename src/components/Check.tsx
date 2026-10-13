// 점검 섬 (T10, docs/CONCEPT.md 6.5): 이해한 내용 요약 → 교통 정보(막힘·서행·원활, 도구 바꾸기 / 그대로 가기) → 먼저 만들 것·나중에 붙일 것.
// 막힌 곳·출발 가능·나누기 제안은 모두 엔진 결과다. 화면은 고른 것(kept·deferred·고른 도구 바꾸기)만 저장한다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import type { Conflict } from '../lib/engine/index.ts';
import { answerChips, difficultyWord, evaluate, fill, formatMinutes } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { josa } from '../lib/josa.ts';
import { $result, updateSession } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { sfx } from '../lib/sfx.ts';
import { ROUTES, waypointPath } from '../lib/routes.ts';
import { gate } from '../lib/stages.ts';
import { DispatchNote } from './DispatchNote.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const T = catalog.data.templates;

const productName = (id: string): string => catalog.product.get(id)?.name ?? id;
const slotLabel = (id: string): string => catalog.data.rules.rules.flatMap((r) => (r.type === 'slot' && r.slot.id === id ? [r.slot.label] : []))[0] ?? id;

/** 교통 정보 표시: 막힘 빨강, 서행(알고 그대로 감) 노랑, 원활 초록. 색만으로 뜻을 전하지 않게 늘 글이 함께 붙는다 (CONCEPT 5.3) */
type Traffic = 'jam' | 'slow' | 'flow';
function Light({ state }: { state: Traffic }) {
  return (
    <span class={`light is-${state}`} aria-hidden="true">
      <span class="lamp lamp-red" />
      <span class="lamp lamp-yellow" />
      <span class="lamp lamp-green" />
    </span>
  );
}

function ConflictItem({ c }: { c: Conflict }) {
  const keep = (): void => {
    updateSession((s) => ({ kept: [...s.kept, c.id] }));
    announce(ko.check.keptAnnounce);
    void sfx('green');
  };
  const undo = (): void => {
    updateSession((s) => ({ kept: s.kept.filter((k) => k !== c.id) }));
  };
  const defer = (): void => {
    if (!c.slotId) return;
    const id = c.slotId;
    updateSession((s) => ({ deferred: [...s.deferred, id] }));
    announce(fill(ko.check.deferred, { slotObj: josa(slotLabel(id), 'obj') }));
  };
  const toShop = waypointPath(c.slotId);
  return (
    <li class={`conflict${c.kept ? ' kept' : ''}`}>
      <Light state={c.kept ? 'slow' : 'jam'} />
      <div class="conflict-body">
        <p class="conflict-status">{c.kept ? ko.check.statusKept : ko.check.statusOpen}</p>
        <p class="conflict-msg">{c.message}</p>
        <p class="q-help">{c.fixHint}</p>
        {c.kept ? (
          <>
            <p class="kept-note">{ko.check.keptNote}</p>
            <button type="button" class="btn btn-quiet" onClick={undo}>
              {ko.check.undoKeep}
            </button>
          </>
        ) : (
          <div class="conflict-actions">
            <a class="btn" href={toShop}>
              {c.kind === 'empty-slot' ? ko.common.conflictPick : ko.common.conflictChange}
            </a>
            {c.deferrable && c.slotId && (
              <button type="button" class="btn" aria-label={fill(ko.check.deferLabel, { slot: slotLabel(c.slotId) })} onClick={defer}>
                {ko.check.defer}
              </button>
            )}
            {c.keepable ? (
              <>
                <button type="button" class="btn" onClick={keep}>
                  {ko.common.conflictKeep}
                </button>
                <p class="q-help">{ko.common.conflictKeepNote}</p>
              </>
            ) : (
              <p class="q-help">{ko.check.cannotKeep}</p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default function Check() {
  const ready = useHydrated();
  const live = useStore($result);
  const r = ready ? live : FIRST_VISIT;
  const [cleared, setCleared] = useState(false);

  // 이 화면에서 막힌 곳이 모두 풀리는 순간 한 번 알린다 (처음부터 풀려 있으면 판만 보인다)
  const wasBlocked = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready) return;
    const before = wasBlocked.current;
    wasBlocked.current = !r.canIssue;
    if (before === true && r.canIssue && !cleared) {
      setCleared(true);
      announce(ko.dispatch.checkDone);
      void sfx('green');
    }
  }, [ready, r.canIssue]);

  if (!gate('check', r).open) {
    return (
      <section class="q-card" aria-labelledby="check-locked">
        <h1 id="check-locked">{ko.check.locked}</h1>
        <a class="btn btn-primary" href={ROUTES.destination}>
          {ko.check.toInterview}
        </a>
      </section>
    );
  }

  const chips = answerChips(catalog, r.interview);
  const typeTag = Object.keys(r.interview.tags).find((t) => t.startsWith('type.'));
  const alternative = typeTag ? T.types[typeTag]?.alternative : undefined;
  const allGreen = r.conflicts.every((c) => c.kept);

  const deferSlot = (id: string, on: boolean): void => {
    updateSession((s) => ({ deferred: on ? [...s.deferred, id] : s.deferred.filter((d) => d !== id) }));
    announce(fill(on ? ko.check.deferred : ko.check.undeferred, { slotObj: josa(slotLabel(id), 'obj') }));
  };
  const swap = (from: string, to: string): void => {
    updateSession((s) => ({ cart: s.cart.map((id) => (id === from ? to : id)) }));
    announce(fill(ko.check.swapped, { toDir: josa(productName(to), 'dir') }));
    void sfx('add');
  };

  return (
    <div class="check">
      <h1>{ko.check.pageTitle}</h1>
      <DispatchNote text={ko.dispatch.check} />

      <section class="card" aria-labelledby="understood">
        <h2 id="understood">{ko.check.understood}</h2>
        <ul class="chips">
          {chips.map((c) => (
            <li class="chip">
              <span class="chip-key">{c.chip}</span> {c.label}
            </li>
          ))}
        </ul>
        {r.session.freeText && <p class="free-line">“{r.session.freeText}”</p>}
        <h3>{ko.check.cartTitle}</h3>
        <ul class="cart-by-slot">
          {r.slots.map((s) => (
            <li>
              <strong>{s.slot.label}</strong>: {s.filledBy.length > 0 ? s.filledBy.map(productName).join(', ') : ko.check.emptySlot}
              {r.session.deferred.includes(s.slot.id) && <span class="badge badge-soft">{ko.check.deferredTitle}</span>}
            </li>
          ))}
        </ul>
        {r.orphans.length > 0 && <p class="q-help">{fill(ko.check.orphans, { names: r.orphans.map(productName).join(', ') })}</p>}
        <p class="q-help">{fill(ko.check.size, { level: difficultyWord(catalog, r.split.difficultyFirst), time: formatMinutes(r.minutes, T.receipt.timeFormat) })}</p>
      </section>

      {alternative && (
        <section class="card" aria-labelledby="alternative">
          <h2 id="alternative">{ko.check.alternativeTitle}</h2>
          <p>{alternative}</p>
        </section>
      )}

      <section aria-labelledby="lights">
        <h2 id="lights">{ko.check.lightsTitle}</h2>
        {r.conflicts.length === 0 ? (
          <p class="conflict no-conflict">
            <Light state="flow" />
            <span>{ko.check.noConflicts}</span>
          </p>
        ) : (
          <ul class="conflicts">
            {r.conflicts.map((c) => (
              <ConflictItem c={c} key={c.id} />
            ))}
          </ul>
        )}
      </section>

      {allGreen && (
        <DispatchNote text={ko.dispatch.checkDone} closable={false} class={cleared ? 'just-now' : undefined} />
      )}

      {(r.split.needed || r.session.deferred.length > 0) && (
        <section class="card split" aria-labelledby="split">
          <h2 id="split">{r.split.needed ? ko.check.splitTitle : ko.check.deferredTitle}</h2>
          {r.split.needed && (
            <>
              <p class="q-help">{ko.check.splitLead}</p>
              {r.split.defer.length === 0 && r.split.easier.length === 0 && <p>{ko.common.noSplit}</p>}
              <ul class="split-list">
                {r.split.defer.map((id) => (
                  <li>
                    <span>{slotLabel(id)}</span>
                    <button type="button" class="btn" aria-label={fill(ko.check.deferLabel, { slot: slotLabel(id) })} onClick={() => deferSlot(id, true)}>
                      {ko.check.defer}
                    </button>
                  </li>
                ))}
                {r.split.easier.map((e) => (
                  <li>
                    <span>{fill(ko.check.easier, { from: productName(e.from), toDir: josa(productName(e.to), 'dir') })}</span>
                    <button
                      type="button"
                      class="btn"
                      aria-label={fill(ko.check.easierLabel, { fromObj: josa(productName(e.from), 'obj'), toDir: josa(productName(e.to), 'dir') })}
                      onClick={() => swap(e.from, e.to)}
                    >
                      {ko.check.easierGo}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {r.session.deferred.length > 0 && (
            <>
              {r.split.needed && <h3>{ko.check.deferredTitle}</h3>}
              <ul class="split-list">
                {r.session.deferred.map((id) => (
                  <li>
                    <span>{slotLabel(id)}</span>
                    <button type="button" class="btn btn-quiet" aria-label={fill(ko.check.undoDeferLabel, { slot: slotLabel(id) })} onClick={() => deferSlot(id, false)}>
                      {ko.check.undoDefer}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
