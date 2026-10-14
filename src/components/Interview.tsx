// 1단계 만들 앱 정하기 섬 (brief 6.5, D70): 한 화면에 질문 하나. H1은 그 질문(22/700)이고, 단계 한 줄은 첫 질문 위에만.
// 보기는 모두 aria-pressed 버튼이고 누르면 바로 다음 질문으로 간다 (D19, 라디오 없음). 보기 꼴은 셋:
//   앱 종류·느낌 = 2열 타일 156×132(위 72 옅은 판 그림 + 이름 16/600) 아래 전체 폭 줄 [직접 쓰기] → '또는' → [모르겠어요],
//   짧은 네 보기(네·아니요·아마·모르겠어요) = 2×2 중립 버튼 56 아래 전체 폭 줄 [직접 쓰기](또는 없음),
//   그 밖 = 목록 줄 56(그림 보기는 앞에 타일 40) 끝에 [직접 쓰기] 줄 → '또는' → [모르겠어요] 줄.
// 직접 쓰기(T37, CustomAnswer)는 펼치는 글 칸이라 보기 꼴을 정할 때 세지 않는다. '쓰는 AI' 에이전트 질문은 보기를 무리(groups)로 나눠 보인다.
// 느낌 타일은 그림 없이 이름만 둔다 (지도 견본은 걷어 냈다, v4 D96. 화면 미리 보기는 V5). 답이 쌓이면 첫 줄에 '고를 것 n개' 칩.
// [이전]과 주 버튼은 아래 막대 섬(InterviewAction)이고,
// 지금 질문 자리는 interview-nav.ts로 나눠 쓴다. 마지막 질문 뒤에는 한 줄 쓰기(선택)가 있다.
// 시트 맨 아래: 접기 '지금까지 정한 것'(답 줄을 누르면 그 질문으로 · 고를 것 글 · 혹시 이 코스) + 글 버튼 '도구 먼저 둘러볼게요'.
// 질문 풀이 글의 어려운 말에는 점선 밑줄(useTermMarks, D69)을 긋는다.
// 계산은 모두 엔진(evaluate·answerChips·matchingRecipes)이 한다. 화면은 보여 주기만 한다.
import { useStore } from '@nanostores/preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { checkText, composingKey, customOf, loadMatcher, matcherNow, withNote } from '../lib/custom-input.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult } from '../lib/engine/index.ts';
import { LINE_MAX, answerChips, evaluate, fill, matchingRecipes } from '../lib/engine/index.ts';
import type { Option, Question } from '../lib/engine/types.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $questionMoves, $questionPick, goToQuestion, questionAt } from '../lib/interview-nav.ts';
import { josa } from '../lib/josa.ts';
import { optionArt } from '../lib/option-art.ts';
import { $result, updateSession } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import { EMPTY_SESSION } from '../lib/saved.ts';
import { patchMeta } from '../lib/store.ts';
import { track } from '../lib/track.ts';
import type { Decide } from './CustomAnswer.tsx';
import { CustomAnswer } from './CustomAnswer.tsx';
import { Glyph } from './Glyph.tsx';
import { Icon } from './Icon.tsx';
import { Lead } from './Lead.tsx';
import { useTermMarks } from './TermMarks.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
/** 2×2 버튼에 넣는 보기 이름의 최대 글자 수 ('아마 그럴 거예요' 9자). 넘으면 목록 줄로 */
const PAIR_MAX = 9;

type Layout = 'tiles' | 'pairs' | 'rows';

/** 보기 줄로 그리는 보기: '직접 쓰기'(isCustom)는 보기 줄이 아니라 펼치는 글 칸(CustomAnswer)이라 빼고 센다(input.md 4.1절) */
const pickable = (q: Question): Option[] => q.options.filter((o) => o.isCustom !== true);

/** 보기 꼴: 앱 종류·느낌은 타일, 짧은 네 보기는 2×2, 나머지는 목록 줄 */
function layoutOf(q: Question): Layout {
  if (q.id === 'q.type' || q.id === 'q.style') return 'tiles';
  const options = pickable(q);
  if (!q.picture && options.length === 4 && options.every((o) => o.label.length <= PAIR_MAX)) return 'pairs';
  return 'rows';
}

/** 답 하나로 바뀐 기능을 한 문장으로: '설계도에 저장이 생겼어요.' (바뀐 것이 없으면 null) */
function mapChange(before: EngineResult, after: EngineResult): string | null {
  const had = new Set(before.slots.map((s) => s.slot.id));
  const has = new Set(after.slots.map((s) => s.slot.id));
  const added = after.slots.filter((s) => !had.has(s.slot.id)).map((s) => s.slot.label);
  const removed = before.slots.filter((s) => !has.has(s.slot.id)).map((s) => s.slot.label);
  const out: string[] = [];
  if (added.length > 0) out.push(fill(ko.interview.mapAdded, { names: josa(added.join(', '), 'subj') }));
  if (removed.length > 0) out.push(fill(ko.interview.mapRemoved, { names: josa(removed.join(', '), 'subj') }));
  return out.length > 0 ? out.join(' ') : null;
}

interface PickProps {
  option: Option;
  picked: boolean;
  onPick: (o: Option) => void;
}

/** 타일 156×132: 위 72 옅은 판 그림 + 이름. 고르면 안쪽 2px --chosen 고리 + 오른쪽 위 ✓ 20 */
function PickTile({ option, picked, onPick, art }: PickProps & { art: ComponentChildren }) {
  return (
    <li>
      <button type="button" class="pick-tile" aria-pressed={picked} onClick={() => onPick(option)}>
        {art}
        <span class="pick-name">{option.label}</span>
        <span class="i-mask i-check pick-check" aria-hidden="true" />
      </button>
    </li>
  );
}

/** 중립 버튼 56 (2×2의 한 칸, 타일 아래 '모르겠어요' 전체 폭 줄). 고르면 --chosen 면 + ✓ 16 */
function PickButton({ option, picked, onPick }: PickProps) {
  return (
    <button type="button" class="pick-btn" aria-pressed={picked} onClick={() => onPick(option)}>
      <span class="i-mask i-check pick-btn-check" aria-hidden="true" />
      <span>{option.label}</span>
    </button>
  );
}

/** 목록 줄 56 (그림 보기는 앞에 타일 40). 고름은 parts.css .list-row의 aria-pressed 꼴. '쓰는 AI'의 유료 구독 꼬리표(출처 있음)는 둘째 줄 */
function PickRow({ q, option, picked, onPick }: PickProps & { q: Question }) {
  const art = q.picture ? optionArt(q.id, option.id) : null;
  return (
    <li>
      <button type="button" class="list-row" aria-pressed={picked} onClick={() => onPick(option)}>
        {art && (
          <span class="list-tile">
            <Glyph name={art} />
          </span>
        )}
        <span class="list-text">
          <span class="list-name">{option.label}</span>
          {option.aiTool?.paidOnly && (
            <span class="list-sub">
              <span class="tag">{ko.interview.paidOnly}</span>
            </span>
          )}
        </span>
        <span class="list-check" aria-hidden="true" />
      </button>
    </li>
  );
}

interface OptionsProps {
  q: Question;
  r: EngineResult;
  onPick: (o: Option) => void;
  onDecide: Decide;
}

/** 목록 줄 꼴: 보기 줄(무리가 있으면 무리마다 제목) 끝에 [직접 쓰기] 줄 → '또는' → [모르겠어요] 줄 */
function RowOptions({ q, chosen, main, unknown, custom, onPick }: { q: Question; chosen: string | undefined; main: Option[]; unknown: Option | undefined; custom: ComponentChildren; onPick: (o: Option) => void }) {
  const rows = (list: Option[]) => list.map((o) => <PickRow key={o.id} q={q} option={o} picked={chosen === o.id} onPick={onPick} />);
  const groups = (q.groups ?? []).map((g) => ({ g, items: main.filter((o) => o.group === g.id) })).filter((x) => x.items.length > 0);
  const loose = main.filter((o) => !groups.some((x) => x.g.id === o.group));
  return (
    <>
      {groups.map(({ g, items }) => (
        <div key={g.id} class="pick-group">
          <h2 class="pick-group-title" id={`pick-group-${g.id}`}>
            {g.label}
          </h2>
          {g.help && <p class="pick-group-help">{g.help}</p>}
          <ul class="list pick-rows" aria-labelledby={`pick-group-${g.id}`}>
            {rows(items)}
          </ul>
        </div>
      ))}
      {(loose.length > 0 || custom) && (
        <ul class={groups.length > 0 ? 'list pick-rows is-after-groups' : 'list pick-rows'}>
          {rows(loose)}
          {custom && <li>{custom}</li>}
        </ul>
      )}
      {unknown && (
        <>
          {custom && <p class="pick-or">{ko.custom.or}</p>}
          <ul class="list pick-rows is-after-or">{rows([unknown])}</ul>
        </>
      )}
    </>
  );
}

function Options({ q, r, onPick, onDecide }: OptionsProps) {
  const chosen = r.interview.answers[q.id];
  const layout = layoutOf(q);
  const options = pickable(q);
  const custom = customOf(q);
  const unknown = options.find((o) => o.isUnknown === true);
  const main = options.filter((o) => o.isUnknown !== true);
  const note = r.session.notes?.[q.id];
  const customPart = (variant: 'row' | 'wide') =>
    custom ? <CustomAnswer q={q} custom={custom} chosen={chosen} note={note} variant={variant} onDecide={onDecide} /> : null;
  if (layout === 'pairs') {
    // 2×2(네·아니요·아마·모르겠어요)는 그대로 두고 그 아래 전체 폭 줄. 나란한 예·아니요 보기 안에서 펼치지 않는다 (GOV.UK)
    return (
      <>
        <ul class="pick-pairs">
          {options.map((o) => (
            <li key={o.id}>
              <PickButton option={o} picked={chosen === o.id} onPick={onPick} />
            </li>
          ))}
        </ul>
        {custom && <div class="pick-custom">{customPart('wide')}</div>}
      </>
    );
  }
  if (layout === 'rows') {
    return <RowOptions q={q} chosen={chosen} main={main} unknown={unknown} custom={customPart('row')} onPick={onPick} />;
  }
  // 느낌(q.style)은 그림 없이 이름만 둔 낮은 타일 (화면 미리 보기 카드는 V5)
  const plain = q.id === 'q.style';
  return (
    <>
      <ul class={plain ? 'pick-tiles is-plain' : 'pick-tiles'}>
        {main.map((o) => {
          const name = optionArt(q.id, o.id);
          const art = plain ? null : (
            <span class="pick-plate" aria-hidden="true">
              {name && <Glyph name={name} />}
            </span>
          );
          return <PickTile key={o.id} option={o} picked={chosen === o.id} onPick={onPick} art={art} />;
        })}
      </ul>
      {custom && <div class="pick-custom">{customPart('wide')}</div>}
      {unknown && (
        <>
          {custom && <p class="pick-or">{ko.custom.or}</p>}
          <div class="pick-wide">
            <PickButton option={unknown} picked={chosen === unknown.id} onPick={onPick} />
          </div>
        </>
      )}
    </>
  );
}

/**
 * 마지막 한 줄 쓰기 (R-18, input.md 5.7절): 예시는 칸 안이 아니라 도움말로, maxlength 없이 넘치면 알리고 자르지 않는다
 * (저장은 80자 안일 때만 바뀐다: 넘친 동안은 마지막 맞는 글이 남는다). 첫 질문에서 앱을 직접 썼고 한 줄을 쓴 적이 없으면
 * 칸을 그 글로 채워 보인다(WCAG 3.3.7, 고치지 않으면 엔진이 같은 글을 쓴다). 칸을 떠날 때 빈틈 말을 한 번 찾는다.
 */
function FreeLine({ r }: { r: EngineResult }) {
  const [draft, setDraft] = useState(r.session.freeText ?? r.session.notes?.['q.type'] ?? '');
  const [gapLines, setGapLines] = useState<string[]>([]);
  const wasOver = useRef(false);
  const check = checkText(draft, LINE_MAX);
  const over = check.over > 0;

  const leave = (): void => {
    const s = $result.get().session;
    if (!check.text && (s.gaps ?? []).length === 0) {
      setGapLines([]);
      return;
    }
    loadMatcher()
      .then((m) => {
        const now = $result.get().session;
        updateSession(() => ({ gaps: m.sessionGaps(catalog, now) }));
        const lines = m.sessionGaps(catalog, { freeText: check.error ? '' : check.text }).map((id) => m.gapMessage(id));
        if (lines.some((line) => !gapLines.includes(line))) for (const line of lines) announce(line);
        setGapLines(lines);
      })
      .catch(() => undefined);
  };

  return (
    <>
      <p class="q-help" id="free-line-hint">
        {ko.interview.lineHint}
      </p>
      <div class="q-line">
        <input
          id="free-line"
          name="freeText"
          class="field"
          type="text"
          autocomplete="off"
          enterkeyhint="done"
          aria-describedby={over ? 'free-line-hint free-line-count free-line-error' : 'free-line-hint free-line-count'}
          aria-invalid={over ? 'true' : undefined}
          value={draft}
          onInput={(e) => {
            const v = e.currentTarget.value;
            setDraft(v);
            const c = checkText(v, LINE_MAX);
            if (c.over === 0) updateSession(() => ({ freeText: v }));
            if (c.over > 0 && !wasOver.current) announce(fill(ko.interview.lineFull, { max: LINE_MAX }));
            wasOver.current = c.over > 0;
          }}
          onBlur={leave}
          onKeyDown={(e) => {
            // 한 줄은 쓰는 대로 저장된다. Enter는 다음 할 일(아래 막대의 [도구 고르러 가기])로 초점을 옮긴다.
            // 한글 조합을 끝내는 Enter는 무시한다. 막대는 sticky라 그냥 focus()하면 페이지 끝으로 굴러간다.
            // 80자를 넘은 채면 저장되지 않은 글이 남으므로 칸에 머물고 오류를 다시 알린다 (직접 쓰기 칸의 [확인]과 같게)
            if (e.key !== 'Enter' || composingKey(e)) return;
            e.preventDefault();
            const c = checkText(e.currentTarget.value, LINE_MAX);
            if (c.over > 0) {
              announce(fill(ko.interview.lineTooLong, { max: LINE_MAX, over: c.over }));
              return;
            }
            document.querySelector<HTMLElement>('.q-go')?.focus({ preventScroll: true });
          }}
        />
        <p class={over ? 'q-count is-over' : 'q-count'} id="free-line-count">
          {fill(ko.interview.lineCount, { n: check.count, max: LINE_MAX })}
        </p>
        {over && (
          <p class="q-line-error" id="free-line-error">
            {fill(ko.interview.lineTooLong, { max: LINE_MAX, over: check.over })}
          </p>
        )}
        {gapLines.map((line) => (
          <p key={line} class="custom-gap">
            <Icon name="warning" size="20px" />
            <span>{line}</span>
          </p>
        ))}
      </div>
    </>
  );
}

export default function Interview() {
  const ready = useHydrated();
  const live = useStore($result);
  const picked = useStore($questionPick);
  const moves = useStore($questionMoves);
  const r = ready ? live : FIRST_VISIT;
  const heading = useRef<HTMLHeadingElement>(null);
  const seenMoves = useRef(moves);
  // 질문 풀이 글의 어려운 말에 점선 밑줄 (D69, 쉬는 시간에 더한다)
  const mark = useTermMarks();

  const visible = r.interview.visible;
  const at = questionAt(r, ready ? picked : null);
  const q = visible[at];

  // 질문을 옮겼을 때만 새 질문 제목으로 초점 (처음 열 때·다른 곳에서 답이 바뀔 때는 옮기지 않는다). 그림 전에 옮겨 초점이 비지 않게.
  // 질문마다 새 화면이라 맨 위로 올린다: 긴 목록 아래에서 골라도 다음 질문이 처음부터 보인다 (움직임 없이 바로)
  useLayoutEffect(() => {
    if (moves === seenMoves.current) return;
    seenMoves.current = moves;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [moves]);

  // 질문마다 페이지 제목도 바꾼다 (WCAG 2.4.2)
  useEffect(() => {
    if (!ready) return;
    const what = q ? `${fill(ko.interview.questionNo, { n: at + 1 })}: ${q.text}` : ko.interview.lineTitle;
    document.title = fill(ko.interview.docTitle, { what });
  }, [ready, at, q?.id]);

  /**
   * 답 하나를 정한다. how: option = 보기를 그냥 누름(그 질문의 내 말은 지운다: 쓴 뜻과 다른 답을 골랐을 수 있다),
   * picked = 직접 쓰기의 찾은 결과에서 보기를 고름(보기 + 내 말), kept = 내 말 그대로 둠(직접 쓰기 보기 + 내 말).
   * 내 말이 바뀌면 빈틈(session.gaps)도 세션 전체 글에서 다시 찾는다 (찾기 묶음이 아직 없으면 받은 뒤에)
   */
  const answer = (option: Option, note: string | null, how: 'option' | 'picked' | 'kept'): void => {
    if (!q) return;
    const before = $result.get();
    const hadNote = before.session.notes?.[q.id] !== undefined;
    const noteChanged = note !== null || hadNote;
    const m = matcherNow();
    updateSession((s) => {
      const next = { answers: { ...s.answers, [q.id]: option.id }, notes: withNote(s.notes, q.id, note) };
      return m && noteChanged ? { ...next, gaps: m.sessionGaps(catalog, { ...s, ...next }) } : next;
    });
    if (!m && noteChanged && (note !== null || (before.session.gaps ?? []).length > 0)) {
      loadMatcher()
        .then((loaded) => updateSession((s) => ({ gaps: loaded.sessionGaps(catalog, s) })))
        .catch(() => undefined);
    }
    if (Object.keys(before.session.answers).length === 0) {
      patchMeta({ interviewStartedAt: Date.now() });
      track('interview_start');
    }
    const after = $result.get();
    const finished = after.done && !before.done;
    // 답 하나에 설계도 변화 하나: 고른 것 → 생긴·빠진 기능 → 다 정했으면 고를 것 수. 한 번에 이어 읽힌다 (announce가 모은다)
    announce(how === 'kept' ? ko.custom.kept : fill(how === 'picked' ? ko.custom.picked : ko.interview.answered, { label: option.label }));
    const change = mapChange(before, after);
    if (change) announce(change);
    if (finished) announce(fill(ko.interview.done, { n: after.slots.length }));
    const idx = after.interview.visible.findIndex((v) => v.id === q.id);
    goToQuestion(idx < 0 ? after.interview.visible.length : idx + 1);
  };
  const pick = (option: Option): void => answer(option, null, 'option');
  const decide: Decide = (option, text, how) => answer(option, text, how);

  const notes = r.session.notes ?? {};
  /** 직접 쓰기를 그대로 둔 답인가 */
  const keptCustom = (qid: string): boolean =>
    visible.find((v) => v.id === qid)?.options.find((o) => o.id === r.interview.answers[qid])?.isCustom === true;
  const chips = ready ? answerChips(catalog, r.interview, notes) : [];
  // 답이 쌓이면 첫 줄에 '고를 것 n개' (설계도 창의 기능 수와 같다)
  const chip = chips.length > 0 ? (
    <p class="q-chip">
      <span class="q-chip-dot" aria-hidden="true" />
      {fill(ko.interview.mapChip, { n: r.slots.length })}
    </p>
  ) : null;
  const recipes = matchingRecipes(catalog, r.interview, 2)
    .map((id) => catalog.data.recipes.recipes.find((x) => x.id === id))
    .filter((x) => x !== undefined);

  return (
    <div class="interview" data-ready={ready ? '' : undefined}>
      {q ? (
        <section class="q" key={q.id} aria-labelledby="q-title">
          {chip}
          {at === 0 && <Lead text={ko.interview.lead} class="q-lead" />}
          <h1 id="q-title" ref={heading} tabIndex={-1}>
            <span class="visually-hidden">{fill(ko.interview.questionNo, { n: at + 1 })}. </span>
            {q.text}
          </h1>
          {q.help && <p class="q-help">{mark(q.help)}</p>}
          <Options q={q} r={r} onPick={pick} onDecide={decide} />
          {q.options.some((o) => o.id === 'maybe') && <p class="q-note">{ko.interview.maybeNote}</p>}
        </section>
      ) : (
        <section class="q" key="line" aria-labelledby="q-title">
          <Lead text={fill(ko.interview.done, { n: r.slots.length })} class="q-lead" />
          <h1 id="q-title" ref={heading} tabIndex={-1}>
            <label for="free-line">{ko.interview.lineTitle}</label>
          </h1>
          <FreeLine r={r} />
        </section>
      )}

      <div class="q-more">
        {chips.length > 0 && (
          <details class="fold q-sofar">
            <summary>{ko.interview.narrowing}</summary>
            <ul class="list">
              {chips.map((c) => (
                <li key={c.questionId}>
                  <button
                    type="button"
                    class="list-row is-tall"
                    onClick={() => goToQuestion(Math.max(0, visible.findIndex((v) => v.id === c.questionId)))}
                  >
                    <span class="list-text">
                      <span class="list-sub">{c.chip}</span>
                      <span class="list-name">{c.label}</span>
                      {/* 보기를 골랐어도 내 말이 있으면 그 말을 한 줄 더 (그대로 둔 답은 이름이 곧 내 말이다) */}
                      {notes[c.questionId] && !keptCustom(c.questionId) && (
                        <span class="list-sub">{fill(ko.custom.rowNote, { text: notes[c.questionId] ?? '' })}</span>
                      )}
                    </span>
                    <span class="visually-hidden">, {ko.interview.changeAnswer}</span>
                    <span class="list-chev" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <p class="q-slots">{fill(ko.interview.slotsLine, { n: r.slots.length, names: r.slots.map((s) => s.slot.label).join(', ') })}</p>
            {recipes.length > 0 && (
              <>
                <h2 class="q-sofar-title">{ko.interview.recipesTitle}</h2>
                <ul class="list">
                  {recipes.map((x) => (
                    <li key={x.id}>
                      <a class="list-row is-tall" href={`${ROUTES.courses}#${x.id}`}>
                        <span class="list-text">
                          <span class="list-name">{x.title}</span>
                          <span class="list-sub">{x.summary}</span>
                        </span>
                        <span class="list-chev" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </details>
        )}
        <a class="btn btn-text q-browse" href={ROUTES.tools}>
          {ko.interview.browseOnly}
        </a>
      </div>
    </div>
  );
}
