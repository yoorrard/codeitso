// 3단계 도구끼리 맞춰 보기 섬 (brief 6.7, D70). 지도 띠 아래 내용 시트 안에서, 할 일이 위·판단 과정이 아래:
//   H1 + 한 줄 → (다 풀렸으면) 사건 메시지 '막힌 곳이 없어요. 출발할까요?' → 막힌 곳 n개(항목마다 알약 + 기능 이름, 설명, 고치는 법,
//   같은 크기 중립 버튼 둘, 그 아래 안내 한 줄. 항목 사이는 24 + 나눔 선, 상자 없음) → 그대로 가는 곳(줄 56 + [다시 고르기])
//   → 한 번에 가기엔 길이 멀어요(줄 56 + [나중으로], '더 쉬운 길') → 나중에 붙일 것 → 지름길 알림 상자 → 접기 '원활 n개'
//   → 접기 '이렇게 이해했어요'(답, 기능마다 고른 도구, 쓰이지 않는 도구).
// 막힌 곳·출발 가능·나누기 제안·지름길은 모두 엔진 결과(evaluate)다. 화면은 엔진 결과를 기능별로 묶어 보이고,
// 고른 것(kept·deferred·더 쉬운 도구로 바꾸기)만 저장한다. 주 버튼 [설계도 받으러 출발하기]는 아래 막대(IssueButton)에 있다.
import { useStore } from '@nanostores/preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import type { Conflict, EngineResult } from '../lib/engine/index.ts';
import { answerChips, difficultyWord, emptySlotId, evaluate, fill, formatMinutes, productOf } from '../lib/engine/index.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { josa } from '../lib/josa.ts';
import { reduced } from '../lib/motion.ts';
import { plainName } from '../lib/pick-nav.ts';
import { $result, updateSession } from '../lib/result.ts';
import { sentences } from '../lib/sentences.ts';
import { waypointPath } from '../lib/routes.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { sfx } from '../lib/sfx.ts';
import { gate } from '../lib/stages.ts';
import { DispatchNote } from './DispatchNote.tsx';
import { ArtTile } from './Glyph.tsx';
import { Icon } from './Icon.tsx';
import { Lead } from './Lead.tsx';
import { useTermMarks } from './TermMarks.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const T = catalog.data.templates;

const productName = (id: string): string => catalog.product.get(id)?.name ?? id;
/** 조사를 붙일 이름: 괄호 안을 뺀다 ('구글 설문지 (Google Forms)' → '구글 설문지로') */
const shortProduct = (id: string): string => plainName(productName(id));
const slotLabel = (id: string): string => catalog.data.rules.rules.flatMap((r) => (r.type === 'slot' && r.slot.id === id ? [r.slot.label] : []))[0] ?? id;
/** 막힌 곳이 붙은 기능 이름. 기능에 붙지 않은 규칙(지도에 없는 기능)은 '길 전체' */
const whereOf = (c: Conflict): string => (c.anchorSlot ? slotLabel(c.anchorSlot) : ko.check.wholeRoute);

/** 누른 버튼이 사라지는 동작(그대로 가기·미루기·되돌리기·바꾸기) 뒤 초점을 옮긴다 (WCAG 2.4.3).
 *  gone(누른 줄)이 다시 그려져 사라질 때까지 그림마다 기다렸다가(길어야 20번), selectors 가운데 처음 있는 것으로. 마지막은 아래 막대의 주 버튼.
 *  아래 막대는 sticky라 그냥 focus()하면 브라우저가 막대의 흐름 자리(페이지 끝)로 굴린다: 막대 안이면 굴리지 않는다 */
function refocus(gone: string, ...selectors: string[]): void {
  let frames = 20;
  const step = (): void => {
    if (document.querySelector(gone) && frames-- > 0) {
      requestAnimationFrame(step);
      return;
    }
    for (const s of [...selectors, '.action-bar .ck-go']) {
      const el = document.querySelector<HTMLElement>(s);
      if (el) {
        el.focus({ preventScroll: el.closest('.action-bar') !== null });
        return;
      }
    }
  };
  requestAnimationFrame(step);
}
const NEXT_JAM = '.ck-jam .ck-pair > *';

/** 교통 알약 (brief 5.6): 막힘 빨강 + 경고, 서행(알고 그대로 감) 호박 + 물음표, 원활 초록 + ✓. 색만으로 뜻을 전하지 않게 그림과 글이 늘 함께 */
type Traffic = 'jam' | 'slow' | 'flow';
const PILL = {
  jam: { cls: 'pill-bad', icon: 'warning', label: ko.check.statusOpen },
  slow: { cls: 'pill-warn', icon: 'help', label: ko.check.statusKept },
  flow: { cls: 'pill-ok', icon: 'check', label: ko.check.statusOk },
} as const;
function Pill({ state }: { state: Traffic }) {
  const p = PILL[state];
  return (
    <span class={`pill ${p.cls}`}>
      <Icon name={p.icon} size="16px" />
      {p.label}
    </span>
  );
}

/** 막힌 곳 하나: 알약 + 기능 이름 17/600, 설명 16/24, 고치는 법 15/22, 같은 크기 중립 버튼 둘(48), 안내 한 줄 14 */
function Jam({ c, mark }: { c: Conflict; mark: (text: string) => ComponentChildren }) {
  const where = whereOf(c);
  const slot = c.slotId ?? c.anchorSlot;
  const keep = (): void => {
    updateSession((s) => ({ kept: [...s.kept, c.id] }));
    announce(ko.check.keptAnnounce);
    void sfx('confirm');
    refocus(`[data-conflict="${c.id}"]`, NEXT_JAM);
  };
  const defer = (): void => {
    if (!c.slotId) return;
    const id = c.slotId;
    updateSession((s) => ({ deferred: [...s.deferred, id] }));
    announce(fill(ko.check.deferred, { slotObj: josa(slotLabel(id), 'obj') }));
    refocus(`[data-conflict="${c.id}"]`, NEXT_JAM);
  };
  const toolAction = c.kind === 'empty-slot' ? ko.check.pick : ko.check.change;
  const label = (action: string): string => fill(ko.check.actionLabel, { where, action });
  // 미룰 수 있는 빈 기능(로그인·알림)은 [도구 고르기] [나중으로 미루기]: 자료의 고치는 법이 이 둘을 권한다
  const deferring = c.deferrable === true && c.slotId !== undefined;
  return (
    <li class="ck-jam" data-conflict={c.id}>
      <p class="ck-jam-head">
        <Pill state="jam" />
        <span class="ck-where">{where}</span>
      </p>
      <p class="ck-msg">{mark(c.message)}</p>
      <p class="ck-fix">
        <span class="ck-fix-label">{ko.check.fixLabel}</span> {mark(c.fixHint)}
      </p>
      {c.keepable || deferring ? (
        <>
          <div class="ck-pair">
            <a class="btn btn-neutral" href={waypointPath(slot)} aria-label={label(toolAction)}>
              {toolAction}
            </a>
            {deferring ? (
              <button type="button" class="btn btn-neutral" aria-label={label(ko.check.deferJam)} onClick={defer}>
                {ko.check.deferJam}
              </button>
            ) : (
              <button type="button" class="btn btn-neutral" aria-label={label(ko.check.keep)} onClick={keep}>
                {ko.check.keep}
              </button>
            )}
          </div>
          <p class="ck-note">{deferring ? ko.check.deferNote : ko.check.keepNote}</p>
        </>
      ) : (
        <>
          <p class="ck-closed">{ko.check.cannotKeep}</p>
          <div class="ck-pair">
            <a class="btn btn-neutral" href={waypointPath(slot)} aria-label={label(ko.check.pick)}>
              {ko.check.pick}
            </a>
          </div>
        </>
      )}
    </li>
  );
}

/** 막힌 곳도 그대로 가는 곳도 없고, 나중으로 미루지도 않은 고른 기능 = 원활 (엔진의 막힌 곳을 기능별로 묶기만 한다) */
function flowSlots(r: EngineResult) {
  const touched = new Set(r.conflicts.map((c) => c.anchorSlot).filter((id) => id !== undefined));
  return r.slots.filter((s) => s.filledBy.length > 0 && !touched.has(s.slot.id) && !r.session.deferred.includes(s.slot.id));
}

export default function Check() {
  const ready = useHydrated();
  const live = useStore($result);
  const r = ready ? live : FIRST_VISIT;
  // 결과의 도구 이름: 엔진이 채운 빌더의 게시 기능(B-02)과 직접 쓴 도구도 이름으로 (카탈로그에 없다)
  const nameOf = (id: string): string => productOf(catalog, r, id)?.name ?? id;
  const mark = useTermMarks();
  const [cleared, setCleared] = useState(false);

  // 이 화면에서 막힌 곳이 모두 풀리는 순간 한 번 알린다 (처음부터 풀려 있으면 메시지만 보인다). 훑기 연출(S4)은 W5
  const wasBlocked = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready) return;
    const before = wasBlocked.current;
    wasBlocked.current = !r.canIssue;
    if (before === true && r.canIssue && !cleared) {
      setCleared(true);
      announce(ko.dispatch.checkDone);
      void sfx('clear');
      // 메시지 '막힌 곳이 없어요. 출발할까요?'와 다 풀린 지도가 보이게 맨 위로 (주 버튼은 아래 막대에 그대로 보인다)
      window.scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    }
  }, [ready, r.canIssue]);

  // 빌드 때(처음 온 사람)도 잠김을 그린다: 빈 상태 하나. 주 버튼 [만들 앱 정하러 가기]는 아래 막대 하나뿐이다
  if (!gate('check', r).open) {
    return (
      <div class="check" data-ready={ready ? '' : undefined}>
        <div class="empty-state ck-locked">
          <ArtTile name="P01" size="hero" class="empty-state-art" />
          <h1 class="empty-state-title">{ko.check.locked}</h1>
          <p class="empty-state-text">{ko.check.lockedText}</p>
        </div>
      </div>
    );
  }

  const jams = r.conflicts.filter((c) => !c.kept);
  const kept = r.conflicts.filter((c) => c.kept);
  const flow = flowSlots(r);
  const typeTag = Object.keys(r.interview.tags).find((t) => t.startsWith('type.'));
  const alternative = typeTag ? T.types[typeTag]?.alternative : undefined;
  const chips = answerChips(catalog, r.interview);

  const undoKeep = (id: string): void => {
    updateSession((s) => ({ kept: s.kept.filter((k) => k !== id) }));
    announce(ko.check.undoKeepAnnounce);
    refocus(`[data-kept="${id}"]`, `[data-conflict="${id}"] .ck-pair > *`, '#ck-jams');
  };
  const deferSlot = (id: string, on: boolean): void => {
    updateSession((s) => ({ deferred: on ? [...s.deferred, id] : s.deferred.filter((d) => d !== id) }));
    announce(fill(on ? ko.check.deferred : ko.check.undeferred, { slotObj: josa(slotLabel(id), 'obj') }));
    // 미루면 '나중에 붙일 것' 제목으로, 되돌리면 다시 생긴 막힌 곳(있으면) 또는 남은 묶음 제목으로
    if (on) refocus(`[data-split="${id}"]`, '#ck-later');
    else refocus(`[data-later="${id}"]`, `[data-conflict="${emptySlotId(id)}"] .ck-pair > *`, '#ck-later', '#ck-split', '#ck-jams');
  };
  const swap = (from: string, to: string): void => {
    updateSession((s) => ({ cart: s.cart.map((id) => (id === from ? to : id)) }));
    announce(fill(ko.check.swapped, { toDir: josa(shortProduct(to), 'dir') }));
    void sfx('confirm');
    refocus(`[data-easier="${from}"]`, '#ck-split');
  };

  return (
    <div class="check" data-ready={ready ? '' : undefined}>
      <h1>{ko.check.title}</h1>
      <Lead text={ko.check.lead} />

      {r.canIssue && <DispatchNote text={ko.dispatch.checkDone} class="ck-done" />}

      {jams.length > 0 && (
        <section class="ck-sec" aria-labelledby="ck-jams">
          <h2 id="ck-jams" class="ck-title" tabIndex={-1}>
            {fill(ko.check.jamTitle, { n: jams.length })}
          </h2>
          <ul class="ck-jams">
            {jams.map((c) => (
              <Jam c={c} mark={mark} key={c.id} />
            ))}
          </ul>
        </section>
      )}

      {kept.length > 0 && (
        <section class="ck-sec" aria-labelledby="ck-kept">
          <h2 id="ck-kept" class="ck-title" tabIndex={-1}>
            {ko.check.keptTitle}
          </h2>
          <ul class="list ck-rows">
            {kept.map((c) => (
              <li class="list-row is-tall ck-row" key={c.id} data-kept={c.id}>
                <Pill state="slow" />
                {/* 둘째 줄: 무엇을 알고 그대로 가는지 (막힌 곳 설명의 첫 문장) */}
                <span class="list-text ck-row-name">
                  <span class="list-name">{whereOf(c)}</span>
                  <span class="list-sub">{sentences(c.message)[0]}</span>
                </span>
                <button type="button" class="btn btn-text ck-row-btn" aria-label={fill(ko.check.undoKeepLabel, { where: whereOf(c) })} onClick={() => undoKeep(c.id)}>
                  {ko.check.undoKeep}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.split.needed && (
        <section class="ck-sec" aria-labelledby="ck-split">
          <h2 id="ck-split" class="ck-title" tabIndex={-1}>
            {ko.check.splitTitle}
          </h2>
          <p class="ck-sub">{ko.check.splitLead}</p>
          {r.split.defer.length === 0 && r.split.easier.length === 0 ? (
            <p class="ck-sub">{ko.check.noSplit}</p>
          ) : (
            <ul class="list ck-rows">
              {r.split.defer.map((id) => (
                <li class="list-row ck-row" key={id} data-split={id}>
                  <span class="list-name ck-row-name">{slotLabel(id)}</span>
                  <button type="button" class="btn btn-sm ck-row-btn" aria-label={fill(ko.check.deferLabel, { slot: slotLabel(id) })} onClick={() => deferSlot(id, true)}>
                    {ko.check.deferJam}
                  </button>
                </li>
              ))}
              {r.split.easier.map((e) => (
                <li class="list-row is-tall ck-row" key={`${e.from}>${e.to}`} data-easier={e.from}>
                  <span class="list-text">
                    <span class="list-name">{ko.check.easierTitle}</span>
                    <span class="list-sub">{fill(ko.check.easierSub, { from: shortProduct(e.from), to: shortProduct(e.to) })}</span>
                  </span>
                  <button
                    type="button"
                    class="btn btn-sm ck-row-btn"
                    aria-label={fill(ko.check.easierLabel, { fromObj: josa(shortProduct(e.from), 'obj'), toDir: josa(shortProduct(e.to), 'dir') })}
                    onClick={() => swap(e.from, e.to)}
                  >
                    {ko.check.easierGo}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {r.session.deferred.length > 0 && (
        <section class="ck-sec" aria-labelledby="ck-later">
          <h2 id="ck-later" class="ck-title" tabIndex={-1}>
            {ko.check.deferredTitle}
          </h2>
          <ul class="list ck-rows">
            {r.session.deferred.map((id) => (
              <li class="list-row ck-row" key={id} data-later={id}>
                <span class="list-name ck-row-name">{slotLabel(id)}</span>
                <button type="button" class="btn btn-text ck-row-btn" aria-label={fill(ko.check.undoDeferLabel, { slot: slotLabel(id) })} onClick={() => deferSlot(id, false)}>
                  {ko.check.undoDefer}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {alternative && (
        <p class="alert ck-alert">
          <span class="alert-icon">
            <Icon name="sparkle" size="20px" />
          </span>
          <span>
            <span class="alert-title">{ko.check.alternativeTitle}</span> {alternative}
          </span>
        </p>
      )}

      <div class="ck-folds">
        {flow.length > 0 && (
          <details class="fold ck-fold">
            <summary>{fill(ko.check.flowTitle, { n: flow.length })}</summary>
            <ul class="list ck-rows">
              {flow.map((s) => (
                <li class="list-row ck-row" key={s.slot.id}>
                  <Pill state="flow" />
                  <span class="list-text">
                    <span class="list-name">{s.slot.label}</span>
                    <span class="list-sub">{s.filledBy.map(nameOf).join(', ')}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <details class="fold ck-fold">
          <summary>{ko.check.understood}</summary>
          <div class="ck-understood">
            {r.session.freeText && <p class="ck-free">“{r.session.freeText}”</p>}
            <h3 class="ck-h3">{ko.check.answersTitle}</h3>
            <dl class="ck-kv">
              {chips.map((c) => (
                <div key={c.questionId}>
                  <dt>{c.chip}</dt>
                  <dd>{c.label}</dd>
                </div>
              ))}
            </dl>
            <h3 class="ck-h3">{ko.check.cartTitle}</h3>
            <dl class="ck-kv">
              {r.slots.map((s) => (
                <div key={s.slot.id}>
                  <dt>{s.slot.label}</dt>
                  <dd>
                    {s.filledBy.length > 0 ? s.filledBy.map(nameOf).join(', ') : ko.check.emptySlot}
                    {r.session.deferred.includes(s.slot.id) && <span class="tag ck-later-tag">{ko.check.laterMark}</span>}
                  </dd>
                </div>
              ))}
            </dl>
            {r.orphans.length > 0 && <p class="ck-sub">{fill(ko.check.orphans, { names: r.orphans.map(nameOf).join(', ') })}</p>}
            <p class="ck-sub">{fill(ko.check.size, { level: difficultyWord(catalog, r.split.difficultyFirst), time: formatMinutes(r.minutes, T.receipt.timeFormat) })}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
