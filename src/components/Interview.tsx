// 1단계 만들 앱 정하기 섬 (brief 6.5, D70): 한 화면에 질문 하나. H1은 그 질문(22/700)이고, 단계 한 줄은 첫 질문 위에만.
// 보기는 모두 aria-pressed 버튼이고 누르면 바로 다음 질문으로 간다 (D19, 라디오 없음). 보기 꼴은 셋:
//   앱 종류·느낌 = 2열 타일 156×132(위 72 옅은 판 그림 + 이름 16/600, '모르겠어요'는 아래 전체 폭 줄 56),
//   짧은 네 보기(네·아니요·아마·모르겠어요) = 2×2 중립 버튼 56, 그 밖 = 목록 줄 56(그림 보기는 앞에 타일 40).
// 느낌 타일의 그림은 내 지도(미니)를 그 보기의 팔레트로 칠한 견본이다. 답이 쌓이면 시트 첫 줄에 '고를 것 n개' 칩.
// [이전]과 주 버튼은 아래 막대 섬(InterviewAction)이고,
// 지금 질문 자리는 interview-nav.ts로 나눠 쓴다. 마지막 질문 뒤에는 한 줄 쓰기(선택)가 있다.
// 시트 맨 아래: 접기 '지금까지 정한 것'(답 줄을 누르면 그 질문으로 · 고를 것 글 · 혹시 이 코스) + 글 버튼 '도구 먼저 둘러볼게요'.
// 질문 풀이 글의 어려운 말에는 점선 밑줄(useTermMarks, D69)을 긋는다.
// 계산은 모두 엔진(evaluate·answerChips·matchingRecipes)과 지도 모형이 한다. 화면은 보여 주기만 한다.
import { useStore } from '@nanostores/preact';
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { catalog } from '../lib/data.ts';
import type { EngineResult } from '../lib/engine/index.ts';
import { answerChips, evaluate, fill, matchingRecipes } from '../lib/engine/index.ts';
import type { Option, Question } from '../lib/engine/types.ts';
import { useHydrated } from '../lib/hydrated.ts';
import { $questionMoves, $questionPick, goToQuestion, questionAt } from '../lib/interview-nav.ts';
import { josa } from '../lib/josa.ts';
import type { MapModel } from '../lib/map/model.ts';
import { mapModel, paletteOf } from '../lib/map/model.ts';
import { optionArt } from '../lib/option-art.ts';
import { $result, updateSession } from '../lib/result.ts';
import { ROUTES } from '../lib/routes.ts';
import { EMPTY_SESSION, FREE_TEXT_MAX } from '../lib/saved.ts';
import { sfx } from '../lib/sfx.ts';
import { patchMeta } from '../lib/store.ts';
import { track } from '../lib/track.ts';
import { Glyph } from './Glyph.tsx';
import { Lead } from './Lead.tsx';
import { MapSvg } from './MapBoard.tsx';
import { useTermMarks } from './TermMarks.tsx';

const FIRST_VISIT = evaluate(catalog, EMPTY_SESSION);
const LINE_MAX = Math.min(80, FREE_TEXT_MAX);
/** 2×2 버튼에 넣는 보기 이름의 최대 글자 수 ('아마 그럴 거예요' 9자). 넘으면 목록 줄로 */
const PAIR_MAX = 9;

type Layout = 'tiles' | 'pairs' | 'rows';

/**
 * 보기 줄로 그리는 보기: '직접 쓰기'(isCustom)는 보기 줄이 아니라 펼치는 글 칸이라 빼고 센다(input.md 4.1절).
 * 그 칸(CustomAnswer)은 T37이 붙인다. 그때까지는 보이지 않는다
 */
const pickable = (q: Question): Option[] => q.options.filter((o) => o.isCustom !== true);

/** 보기 꼴: 앱 종류·느낌은 타일, 짧은 네 보기는 2×2, 나머지는 목록 줄 */
function layoutOf(q: Question): Layout {
  if (q.id === 'q.type' || q.id === 'q.style') return 'tiles';
  const options = pickable(q);
  if (!q.picture && options.length === 4 && options.every((o) => o.label.length <= PAIR_MAX)) return 'pairs';
  return 'rows';
}

/** 답 하나로 바뀐 지도 마디를 한 문장으로: '지도에 저장이 생겼어요.' (바뀐 것이 없으면 null) */
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
function PickButton({ option, picked, onPick, wide = false }: PickProps & { wide?: boolean }) {
  return (
    <li class={wide ? 'pick-wide' : undefined}>
      <button type="button" class="pick-btn" aria-pressed={picked} onClick={() => onPick(option)}>
        <span class="i-mask i-check pick-btn-check" aria-hidden="true" />
        <span>{option.label}</span>
      </button>
    </li>
  );
}

/** 목록 줄 56 (그림 보기는 앞에 타일 40). 고름은 parts.css .list-row의 aria-pressed 꼴 */
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
        </span>
        <span class="list-check" aria-hidden="true" />
      </button>
    </li>
  );
}

/** 느낌 견본: 내 지도(미니)를 그 보기의 팔레트로 칠한다. 땅은 판 면, 물·공원은 판의 두 조각 (map-land.css와 같은 토큰) */
function FeelSwatch({ model, option }: { model: MapModel; option: Option }) {
  const palette = paletteOf(option.id);
  return (
    <span class="pick-plate is-feel" data-palette={palette} aria-hidden="true">
      <MapSvg model={{ ...model, palette }} variant="mini" />
    </span>
  );
}

function Options({ q, r, onPick }: { q: Question; r: EngineResult; onPick: (o: Option) => void }) {
  const chosen = r.interview.answers[q.id];
  const layout = layoutOf(q);
  const options = pickable(q);
  if (layout === 'pairs') {
    return (
      <ul class="pick-pairs">
        {options.map((o) => (
          <PickButton key={o.id} option={o} picked={chosen === o.id} onPick={onPick} />
        ))}
      </ul>
    );
  }
  if (layout === 'rows') {
    return (
      <ul class="list pick-rows">
        {options.map((o) => (
          <PickRow key={o.id} q={q} option={o} picked={chosen === o.id} onPick={onPick} />
        ))}
      </ul>
    );
  }
  const model = q.id === 'q.style' ? mapModel(r) : null;
  return (
    <ul class={model ? 'pick-tiles is-two' : 'pick-tiles'}>
      {options.map((o) => {
        if (o.isUnknown === true) return <PickButton key={o.id} option={o} picked={chosen === o.id} onPick={onPick} wide />;
        const name = optionArt(q.id, o.id);
        const art = model ? (
          <FeelSwatch model={model} option={o} />
        ) : (
          <span class="pick-plate" aria-hidden="true">
            {name && <Glyph name={name} />}
          </span>
        );
        return <PickTile key={o.id} option={o} picked={chosen === o.id} onPick={onPick} art={art} />;
      })}
    </ul>
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
  // 질문마다 새 화면이라 맨 위로 올린다: 긴 목록 아래에서 골라도 다음 질문과 방금 자란 지도가 함께 보인다 (움직임 없이 바로)
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

  const pick = (option: Option): void => {
    if (!q) return;
    const before = $result.get();
    updateSession((s) => ({ answers: { ...s.answers, [q.id]: option.id } }));
    if (Object.keys(before.session.answers).length === 0) {
      patchMeta({ interviewStartedAt: Date.now() });
      track('interview_start');
    }
    const after = $result.get();
    const finished = after.done && !before.done;
    // 답 하나에 지도 변화 하나 (S2): 고른 것 → 생긴·빠진 마디 → 다 정했으면 고를 것 수. 한 번에 이어 읽힌다 (announce가 모은다)
    announce(fill(ko.interview.answered, { label: option.label }));
    const change = mapChange(before, after);
    if (change) announce(change);
    if (finished) announce(fill(ko.interview.done, { n: after.slots.length }));
    // 다 정했으면 '정함' 소리 (도착 차임은 설계도 받기에만, brief 7절)
    void sfx(finished ? 'confirm' : 'answer');
    const idx = after.interview.visible.findIndex((v) => v.id === q.id);
    goToQuestion(idx < 0 ? after.interview.visible.length : idx + 1);
  };

  const chips = ready ? answerChips(catalog, r.interview) : [];
  // 답이 쌓이면 시트 첫 줄에 '고를 것 n개' (지도의 마디 수와 같다). 지도 위 왼쪽 위는 휴대폰에서 첫 굽이·첫 마디 이름표 자리라 가린다 (D70)
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
          <Options q={q} r={r} onPick={pick} />
          {q.options.some((o) => o.id === 'maybe') && <p class="q-note">{ko.interview.maybeNote}</p>}
        </section>
      ) : (
        <section class="q" key="line" aria-labelledby="q-title">
          <Lead text={fill(ko.interview.done, { n: r.slots.length })} class="q-lead" />
          <h1 id="q-title" ref={heading} tabIndex={-1}>
            <label for="free-line">{ko.interview.lineTitle}</label>
          </h1>
          <p class="q-help" id="free-line-hint">
            {ko.interview.lineHint}
          </p>
          <form
            class="q-line"
            onSubmit={(e) => {
              // 한 줄은 쓰는 대로 저장된다. Enter는 다음 할 일(아래 막대의 [도구 고르러 가기])로 초점을 옮긴다.
              // 막대는 sticky라 그냥 focus()하면 페이지 끝으로 굴러간다
              e.preventDefault();
              document.querySelector<HTMLElement>('.q-go')?.focus({ preventScroll: true });
            }}
          >
            <input
              id="free-line"
              name="freeText"
              class="field"
              type="text"
              maxLength={LINE_MAX}
              autocomplete="off"
              enterkeyhint="done"
              aria-describedby="free-line-hint free-line-count"
              value={r.session.freeText ?? ''}
              onInput={(e) => {
                const v = (e.currentTarget as HTMLInputElement).value.slice(0, LINE_MAX);
                const before = (r.session.freeText ?? '').length;
                updateSession(() => ({ freeText: v }));
                if (v.length >= LINE_MAX && before < LINE_MAX) announce(fill(ko.interview.lineFull, { max: LINE_MAX }));
              }}
            />
            <p class="q-count" id="free-line-count">
              {fill(ko.interview.lineCount, { n: (r.session.freeText ?? '').length, max: LINE_MAX })}
            </p>
          </form>
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
