// 목적지 섬 (T08, docs/CONCEPT.md 6.3): 한 화면에 질문 하나. 보기 하나하나가 버튼이고 누르면 바로 다음 질문.
// 이전으로 돌아가 바꾸기, 'n번째 질문', 길 찾는 중 상자(답 칩·생긴 고를 것·혹시 이 코스), 마지막 한 줄 입력, 목적지 정하기.
// 계산은 모두 엔진(evaluate·answerChips·matchingRecipes). 화면은 보여 주기만 한다.
import { useStore } from '@nanostores/preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import { answerChips, evaluate, fill, matchingRecipes } from '../lib/engine/index.ts';
import type { Option, Question } from '../lib/engine/types.ts';
import { track } from '../lib/track.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { SLOT_ART, optionArt } from '../lib/option-art.ts';
import { $result, updateSession } from '../lib/result.ts';
import { EMPTY_SESSION, FREE_TEXT_MAX } from '../lib/saved.ts';
import { sfx } from '../lib/sfx.ts';
import { ROUTES } from '../lib/routes.ts';
import { patchMeta } from '../lib/store.ts';
import { Icon } from './Icon.tsx';
import { DispatchNote } from './DispatchNote.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const LINE_MAX = Math.min(80, FREE_TEXT_MAX);

function StylePreview({ option }: { option: Option }) {
  const tag = Object.keys(option.tags).find((t) => t.startsWith('style.'));
  const style = tag ? catalog.data.templates.styles[tag] : undefined;
  if (!style) return null;
  const p = style.palette;
  return (
    <span
      class="style-preview"
      aria-hidden="true"
      style={{ '--sw-bg': p.background, '--sw-surface': p.surface, '--sw-text': p.text, '--sw-accent': p.accent, '--sw-accent-text': p.accentText, '--sw-radius': style.radius }}
    >
      <span class="sw-title" />
      <span class="sw-line" />
      <span class="sw-button" />
    </span>
  );
}

function OptionButton({ q, option, picked, onPick }: { q: Question; option: Option; picked: boolean; onPick: (o: Option) => void }) {
  const art = optionArt(q.id, option.id);
  const hasArt = q.picture && (art !== null || q.id === 'q.style');
  return (
    <li>
      <button type="button" class={`option${hasArt ? ' option-pic' : ''}${option.isUnknown ? ' option-unknown' : ''}`} aria-pressed={picked} onClick={() => onPick(option)}>
        {hasArt && (art ? <img src={`/emoji/${art}.webp`} width={64} height={64} alt="" /> : <StylePreview option={option} />)}
        <span class="option-label">{option.label}</span>
        {picked && (
          <span class="picked-mark" aria-hidden="true">
            <Icon name="check" size="18px" />
          </span>
        )}
      </button>
    </li>
  );
}

export default function Interview() {
  const ready = useHydrated();
  const live = useStore($result);
  const r = ready ? live : FIRST_VISIT;
  const [pos, setPos] = useState<number | null>(null);
  const moved = useRef(false);
  const [bubble, setBubble] = useState(true);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const narrow = useRef<HTMLDetailsElement>(null);

  const visible = r.interview.visible;
  const autoPos = r.interview.next ? visible.findIndex((v) => v.id === r.interview.next?.id) : visible.length;
  // 정상 이동은 처음 안 답한 질문을 넘지 않는다 (기록을 지워 답이 사라져도 빈 질문으로 건너뛰지 않게)
  const at = Math.min(pos ?? autoPos, autoPos);
  const q = visible[at];

  // 넓은 화면에서는 좁혀지는 중 상자를 펼쳐 둔다
  useEffect(() => {
    if (narrow.current && window.matchMedia('(min-width: 768px)').matches) narrow.current.open = true;
  }, []);

  // 섬이 질문을 옮겼을 때만 질문 제목으로 초점 (처음 열 때·다른 곳에서 바뀔 때는 옮기지 않는다). 그림 전에 옮겨 초점이 비지 않게
  useLayoutEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    heading.current?.focus();
  }, [at, q?.id, finished]);

  // 질문마다 페이지 제목도 바꾼다 (WCAG 2.4.2)
  useEffect(() => {
    if (!ready) return;
    const what = finished ? ko.common.interviewDone : q ? `${fill(ko.interview.questionNo, { n: at + 1 })}: ${q.text}` : ko.interview.lineTitle;
    document.title = fill(ko.interview.docTitle, { what });
  }, [ready, at, q?.id, finished]);

  const go = (next: number): void => {
    moved.current = true;
    setPos(next);
  };

  const pick = (option: Option): void => {
    if (!q) return;
    const wasEmpty = Object.keys(r.session.answers).length === 0;
    updateSession((s) => ({ answers: { ...s.answers, [q.id]: option.id } }));
    if (wasEmpty) {
      patchMeta({ interviewStartedAt: Date.now() });
      track('interview_start');
    }
    announce(fill(ko.interview.answered, { label: option.label }));
    void sfx('tap');
    setBubble(false);
    const after = $result.get().interview.visible;
    const idx = after.findIndex((v) => v.id === q.id);
    go(idx < 0 ? after.length : idx + 1);
  };

  const finish = (): void => {
    if (!r.done) return;
    moved.current = true;
    setFinished(true);
    announce(fill(ko.interview.done, { n: r.slots.length }));
    void sfx('arrive');
  };

  const chips = answerChips(catalog, r.interview);
  const recipes = matchingRecipes(catalog, r.interview, 2)
    .map((id) => catalog.data.recipes.recipes.find((x) => x.id === id))
    .filter((x) => x !== undefined);

  return (
    <div class="interview" data-ready={ready ? '' : undefined}>
      {finished ? (
        <section class="q-card q-done" key="done" aria-labelledby="q-title">
          <span class="done-check" aria-hidden="true">
            <Icon name="check" size="28px" />
          </span>
          <h1 id="q-title" ref={heading} tabIndex={-1}>
            {ko.common.interviewDone}
          </h1>
          <p>{fill(ko.interview.done, { n: r.slots.length })}</p>
          <a class="btn btn-primary btn-lg" href={ROUTES.waypoints}>
            {ko.interview.goShop}
          </a>
        </section>
      ) : q ? (
        <section class="q-card" key={q.id} aria-labelledby="q-title">
          <div class="q-top">
            {at > 0 && (
              <button type="button" class="btn btn-quiet" onClick={() => go(at - 1)}>
                {ko.interview.back}
              </button>
            )}
            <p class="q-no" aria-hidden="true">
              {fill(ko.interview.questionNo, { n: at + 1 })}
            </p>
          </div>
          {at === 0 && bubble && Object.keys(r.session.answers).length === 0 && (
            <DispatchNote text={ko.dispatch.destination} />
          )}
          <h1 id="q-title" ref={heading} tabIndex={-1}>
            <span class="visually-hidden">{fill(ko.interview.questionNo, { n: at + 1 })}. </span>
            {q.text}
          </h1>
          {q.help && <p class="q-help">{q.help}</p>}
          <ul class={`options${q.picture ? ' options-pic' : ''}`}>
            {q.options.map((o) => (
              <OptionButton q={q} option={o} picked={r.interview.answers[q.id] === o.id} onPick={pick} />
            ))}
          </ul>
          {q.options.some((o) => o.id === 'maybe') && <p class="q-help">{ko.interview.maybeNote}</p>}
          {r.interview.answers[q.id] !== undefined && (
            <button type="button" class="btn" onClick={() => go(at + 1)}>
              {ko.common.next}
            </button>
          )}
        </section>
      ) : (
        <section class="q-card" key="line" aria-labelledby="q-title">
          <div class="q-top">
            <button type="button" class="btn btn-quiet" onClick={() => go(visible.length - 1)}>
              {ko.interview.back}
            </button>
          </div>
          <h1 id="q-title" ref={heading} tabIndex={-1}>
            <label for="free-line">{ko.interview.lineTitle}</label>
          </h1>
          <p class="q-help" id="free-line-hint">
            {ko.interview.lineHint}
          </p>
          <form
            class="line-form"
            onSubmit={(e) => {
              e.preventDefault();
              finish();
            }}
          >
            <input
              id="free-line"
              name="freeText"
              class="line-input"
              type="text"
              maxLength={LINE_MAX}
              autocomplete="off"
              enterkeyhint="done"
              aria-describedby="free-line-hint free-line-count"
              placeholder={ko.interview.linePlaceholder}
              value={r.session.freeText ?? ''}
              onInput={(e) => {
                const v = (e.currentTarget as HTMLInputElement).value.slice(0, LINE_MAX);
                const before = (r.session.freeText ?? '').length;
                updateSession(() => ({ freeText: v }));
                if (v.length >= LINE_MAX && before < LINE_MAX) announce(fill(ko.interview.lineFull, { max: LINE_MAX }));
              }}
            />
            <p class="line-count" id="free-line-count">
              {fill(ko.interview.lineCount, { n: (r.session.freeText ?? '').length, max: LINE_MAX })}
            </p>
            {!r.done && (
              <p class="q-help" id="finish-reason">
                {ko.interview.finishBlocked}{' '}
                <button type="button" class="btn btn-quiet" onClick={() => go(autoPos)}>
                  {ko.interview.toUnanswered}
                </button>
              </p>
            )}
            <button type="submit" class="btn btn-primary btn-lg" aria-disabled={!r.done} aria-describedby={r.done ? undefined : 'finish-reason'}>
              {ko.interview.finish}
            </button>
          </form>
        </section>
      )}

      <details class="narrowing" ref={narrow}>
        <summary>
          <span>{ko.interview.narrowing}</span>
          <Icon name="expand" />
        </summary>
        {chips.length === 0 ? (
          <p class="q-help">{ko.interview.chipsEmpty}</p>
        ) : (
          <ul class="chips">
            {chips.map((c) => (
              <li class="chip">
                <span class="chip-key">{c.chip}</span> {c.label}
              </li>
            ))}
          </ul>
        )}
        {r.slots.length > 0 && (
          <>
            <h2>{ko.interview.slotsTitle}</h2>
            <ul class="slot-icons">
              {r.slots.map((s) => (
                <li>
                  <img src={`/emoji/${SLOT_ART[s.slot.capability] ?? 'tools'}.webp`} width={32} height={32} alt="" />
                  <span>{s.slot.label}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {recipes.length > 0 && (
          <>
            <h2>{ko.interview.recipesTitle}</h2>
            <ul class="maybe-list">
              {recipes.map((x) => (
                <li class="maybe flip-in" key={x.id}>
                  <strong>{x.title}</strong>
                  <span>{x.summary}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </details>
    </div>
  );
}

