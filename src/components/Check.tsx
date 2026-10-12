// 재확인 섬 (T10, docs/UX.md 3.5): 이해한 내용 요약 → 충돌 신호등(M6, 바꾸기 / 그대로 두기) → 1차·2차 나누기.
// 충돌·발행 가능·나누기 제안은 모두 엔진 결과다. 화면은 고른 것(kept·deferred·장바구니 바꾸기)만 저장한다.
import { useStore } from '@nanostores/preact';
import { useEffect, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import type { Conflict } from '../lib/engine/index.ts';
import { answerChips, evaluate, fill, formatMinutes } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { josa } from '../lib/josa.ts';
import { $result, updateSession } from '../lib/result.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { sentences } from '../lib/sentences.ts';
import { sfx } from '../lib/sfx.ts';
import { gate } from '../lib/stations.ts';
import { $trip, markStampsSeen } from '../lib/store.ts';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const STAMP = 'station.check';
const T = catalog.data.templates;

const productName = (id: string): string => catalog.product.get(id)?.name ?? id;
const slotLabel = (id: string): string => catalog.data.rules.rules.flatMap((r) => (r.type === 'slot' && r.slot.id === id ? [r.slot.label] : []))[0] ?? id;

/** 신호등: 고칠 곳이면 빨강, 고르면 노랑을 거쳐 초록 (각 불 --dur-signal 이상, 동작 줄이기면 바로) */
function Light({ ok }: { ok: boolean }) {
  return (
    <span class={`light ${ok ? 'is-green' : 'is-red'}`} aria-hidden="true">
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
  const toShop = c.slotId ? `/shop?slot=${encodeURIComponent(c.slotId)}` : '/shop';
  return (
    <li class={`conflict${c.kept ? ' kept' : ''}`}>
      <Light ok={c.kept} />
      <div class="conflict-body">
        <p class="conflict-status">{c.kept ? ko.check.statusOk : ko.check.statusOpen}</p>
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
              {ko.common.conflictChange}
            </a>
            {c.keepable ? (
              <button type="button" class="btn" onClick={keep}>
                {ko.common.conflictKeep}
              </button>
            ) : (
              <p class="q-help">{ko.check.cannotKeep}</p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

interface Props {
  faceSrc: string;
}

export default function Check({ faceSrc }: Props) {
  const ready = useHydrated();
  const live = useStore($result);
  const r = ready ? live : FIRST_VISIT;
  const [stamp, setStamp] = useState<'none' | 'first' | 'again'>('none');

  // 모든 불이 초록이 되는 순간 재확인 도장 (처음 한 번만 장면)
  useEffect(() => {
    if (!ready || !r.canIssue || stamp !== 'none') return;
    const first = !$trip.get().seenStamps.includes(STAMP);
    markStampsSeen([STAMP]);
    setStamp(first ? 'first' : 'again');
    if (first) {
      announce(`${ko.mascot.checkDone} ${ko.check.stampDone}`);
      void sfx('stamp');
    }
  }, [ready, r.canIssue]);

  if (!gate('check', r).open) {
    return (
      <section class="q-card" aria-labelledby="check-locked">
        <h1 id="check-locked">{ko.check.locked}</h1>
        <a class="btn btn-primary" href="/interview">
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
    announce(fill(on ? ko.check.deferred : ko.check.undeferred, { slot: slotLabel(id) }));
  };
  const swap = (from: string, to: string): void => {
    updateSession((s) => ({ cart: s.cart.map((id) => (id === from ? to : id)) }));
    announce(fill(ko.check.swapped, { toDir: josa(productName(to), 'dir') }));
    void sfx('add');
  };

  return (
    <div class="check">
      <h1>{ko.common.checkTitle}</h1>

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
        <p class="q-help">{fill(ko.check.size, { d: r.split.difficultyFirst, time: formatMinutes(r.minutes, T.receipt.timeFormat) })}</p>
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
            <Light ok />
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
        <div class={stamp === 'first' ? 'stamp-banner just-now' : 'stamp-banner'}>
          <span class={stamp === 'first' ? 'stamp-mark stamp-in' : 'stamp-mark'} aria-hidden="true">
            <img src="/emoji/station-check.webp" width={56} height={56} alt="" />
          </span>
          <div class="mascot-line plain">
            <img class="face" src={faceSrc} width={40} height={40} alt="" />
            <p>
              {sentences(ko.mascot.checkDone).map((t) => (
                <span class="line">{t}</span>
              ))}{' '}
              <span class="line">{ko.check.stampDone}</span>
            </p>
          </div>
        </div>
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
