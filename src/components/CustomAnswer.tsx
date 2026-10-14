// 직접 쓰기 부품 (T37, 설계서 7.2절, input.md 4절): 보기 → [연필 + 직접 쓰기] → '또는' → [모르겠어요].
// GOV.UK의 "Any other … + 펼친 칸 + or + Prefer not to say" 꼴이다. 이 부품은 [직접 쓰기] 줄과 펼친 판만 그리고,
// '또는'과 '모르겠어요'는 보기를 그리는 쪽(Interview)이 둔다. 콤보박스 팝업·<datalist>는 쓰지 않는다.
// 흐름: 줄을 누르면 이 자리에 판이 펼쳐지고 초점이 글 칸으로 → [확인]/Enter → 찾은 결과 넷 중 하나(하나 · 여럿 · 못 찾음,
// 빈틈 알림은 어느 꼴에나 붙음). 저절로 고르지 않는다: 이용자가 보기를 고르거나 내 말 그대로 두면 다음 질문으로 간다(D19).
// 낱말 찾기와 낱말표는 판을 처음 펼칠 때 import()로 받는다(custom-input.ts loadMatcher). 찾은 결과는 화면에만 쓴다.
// 줄·판·글 칸·검사·초점은 CustomShell 하나가 맡고, 2단계 '목록에 없는 도구 쓰기'(CustomTool.tsx)도 같은 껍데기를 쓴다.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import type { ResultKind, TextError } from '../lib/custom-input.ts';
import { checkText, composingKey, foundWords, isNameQuestion, keepLine, loadMatcher, matcherNow, reshown, resultKind } from '../lib/custom-input.ts';
import { catalog } from '../lib/data.ts';
import { NOTE_MAX, fill } from '../lib/engine/index.ts';
import type { AnswerMatch } from '../lib/engine/match.ts';
import type { Option, Question } from '../lib/engine/types.ts';
import { josa } from '../lib/josa.ts';
import { Icon } from './Icon.tsx';
import '../styles/custom-answer.css';

/** 결과 판에서 부르는 것 */
export interface ShellControl {
  /** [확인]한 글 (한 줄로 정리한 것) */
  text: string;
  /** 결과 첫 문장의 id: 결과 판이 그 문장(.custom-found, tabIndex -1)에 단다. 초점을 받는다 */
  foundId: string;
  /** 결과를 거두고 글 칸으로 */
  retry: () => void;
  /** 판을 접고 글을 비운다 (초점은 부르는 쪽이 옮긴다) */
  close: () => void;
}

/** [확인]의 결과: 연락처처럼 보이는 글인지 + 결과 판 */
export interface ShellLook {
  contact: boolean;
  body: (ctl: ShellControl) => ComponentChildren;
}

interface ShellProps {
  /** id 앞머리 (화면 안에서 겹치지 않게) */
  base: string;
  /** row = 목록 줄 56(목록 안), wide = 타일·2×2 아래 전체 폭 줄 56 */
  variant: 'row' | 'wide';
  /** 연필을 목록 타일 자리(40)에 둔다 (그림이 있는 목록) */
  tile: boolean;
  /** 줄 이름과 둘째 줄 */
  label: string;
  note?: string | undefined;
  /** 이 줄이 고른 답인가 (그대로 둔 내 말) */
  chosen: boolean;
  /** 칸 라벨과 도움말 (도움말 끝에 '이름·연락처는 쓰지 마세요.'를 붙인다) */
  field: string;
  hint: string;
  /** 도구 이름 칸: 맞춤법 검사를 끈다 */
  name: boolean;
  /** 처음 칸에 둘 글 */
  initial: string;
  max: number;
  /** 바뀌면(0이 아니면) 판을 펼치고 글 칸에 초점 (막힌 곳의 [목록에 없는 도구 쓰기 ›], [다른 곳에 공개하기]) */
  openSignal?: number;
  /** 처음 펼칠 때 미리 받을 찾기 묶음 */
  preload: () => void;
  /** 찾기 묶음을 이미 받았는가 (아직이면 [확인] 뒤 결과가 나올 때까지 '찾는 중이에요.'를 보인다) */
  loaded: () => boolean;
  /** 길이 밖의 검사 (도구 5개·같은 이름): 문제가 있으면 오류 문장 */
  problem?: (text: string) => string | null;
  look: (text: string) => Promise<ShellLook>;
}

type FocusTo = 'field' | 'result' | 'row' | null;
/** 띄운 오류: 빈 글은 [확인] 때 띄우고 고치면 바로 걷는다. 넘침은 [확인] 전에도 넘는 순간 보인다(마지막 한 줄과 같게).
 *  그 밖의 문제(extra)는 글을 고치면 걷는다 */
type Shown = { kind: TextError } | { kind: 'extra'; message: string } | null;

/** 줄 + 펼친 판 + 글 칸 + 글자 수 + [확인] + 오류·경고 + 결과 판. 검사·초점·Esc·한글 조합 처리는 여기 한 곳 */
export function CustomShell({ base, variant, tile, label, note, chosen, field, hint, name, initial, max, openSignal, preload, loaded, problem, look }: ShellProps) {
  const [open, setOpen] = useState(false);
  // 쓰던 글은 그 자리를 떠날 때까지 부품 상태에 남는다 (저장하지 않음)
  const [text, setText] = useState(initial);
  const [shown, setShown] = useState<Shown>(null);
  const [found, setFound] = useState<{ look: ShellLook; text: string } | null>(null);
  // 찾기 묶음이 오는 동안 (느린 망에서 처음 [확인]): 화면과 낭독에 '찾는 중'을 알리고, 그동안 누른 [확인]·Enter는 한 번만 처리한다
  const [busy, setBusy] = useState(false);
  const looking = useRef(false);
  const composing = useRef(false);
  const wasOver = useRef(false);
  const focusTo = useRef<FocusTo>(null);
  const rowRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const ids = {
    panel: `${base}-panel`,
    field: `${base}-field`,
    help: `${base}-help`,
    count: `${base}-count`,
    error: `${base}-error`,
    warn: `${base}-warn`,
    busy: `${base}-busy`,
    found: `${base}-found`,
  };
  const check = checkText(text, max);
  // 넘침은 넘는 순간부터 고칠 때까지 보인다 (알림 말과 화면 글이 같게). 나머지는 띄운 것만
  const error: Shown = check.over > 0 ? { kind: 'tooLong' } : shown?.kind === 'tooLong' ? null : shown;
  const errorText = (s: NonNullable<Shown>): string =>
    s.kind === 'extra' ? s.message : s.kind === 'empty' ? ko.custom.empty : fill(ko.custom.tooLong, { max, over: check.over });

  // 펼침·결과·접힘 뒤 초점 (그림이 바뀐 뒤에 옮긴다: 펼친 판은 visibility가 바뀐 다음에야 초점을 받는다).
  // 앞 그림의 효과가 늦게 돌면 아직 없는 결과 문장·숨은 칸을 만날 수 있다: 초점이 실제로 옮겨 간 뒤에만 요청을 지운다
  useEffect(() => {
    const to = focusTo.current;
    if (!to) return;
    const el = to === 'field' ? fieldRef.current : to === 'result' ? (panelRef.current?.querySelector<HTMLElement>('.custom-found') ?? null) : rowRef.current;
    el?.focus();
    if (el && document.activeElement === el) focusTo.current = null;
  });

  const expand = (): void => {
    setOpen(true);
    focusTo.current = 'field';
    // 찾기 묶음은 처음 펼칠 때 받는다 (못 받으면 [확인] 때 다시 해 본다)
    preload();
  };

  // 밖에서 펼치라는 신호 (같은 값이면 다시 펼치지 않는다)
  useEffect(() => {
    if (openSignal) expand();
  }, [openSignal]);

  const toggle = (): void => {
    if (open) {
      setOpen(false);
      setFound(null);
      return;
    }
    expand();
  };

  const collapse = (): void => {
    setOpen(false);
    setFound(null);
    focusTo.current = 'row';
  };

  const fail = (s: NonNullable<Shown>): void => {
    setShown(s);
    setFound(null);
    announce(errorText(s));
    fieldRef.current?.focus();
  };

  const submit = async (): Promise<void> => {
    if (looking.current) return;
    const c = checkText(text, max);
    if (c.error) {
      fail({ kind: c.error });
      return;
    }
    const extra = problem?.(c.text) ?? null;
    if (extra !== null) {
      fail({ kind: 'extra', message: extra });
      return;
    }
    setShown(null);
    looking.current = true;
    if (!loaded()) {
      setBusy(true);
      announce(ko.custom.busy);
    }
    let got: ShellLook;
    try {
      got = await look(c.text);
    } finally {
      looking.current = false;
      setBusy(false);
    }
    if (got.contact) announce(ko.custom.contact);
    setFound({ look: got, text: c.text });
    focusTo.current = 'result';
  };

  const onInput = (v: string): void => {
    setText(v);
    // 글을 고치면 찾은 결과는 거둔다 (다시 [확인]을 누른다)
    if (found) setFound(null);
    const c = checkText(v, max);
    // 넘을 때 한 번만 알린다 (마지막 한 줄의 lineFull과 같다)
    if (c.over > 0 && !wasOver.current) announce(fill(ko.interview.lineFull, { max }));
    wasOver.current = c.over > 0;
    // 띄운 오류는 고쳐지면 바로 걷는다. 한글 조합 중에는 새로 띄우거나 바꾸지 않는다 (조합이 끝난 뒤 다시 잰다)
    if (shown && !composing.current) setShown(shown.kind === 'extra' ? null : c.error ? { kind: c.error } : null);
  };

  const ctl = (t: string): ShellControl => ({
    text: t,
    foundId: ids.found,
    retry: () => {
      setFound(null);
      focusTo.current = 'field';
    },
    close: () => {
      setOpen(false);
      setFound(null);
      setText('');
      setShown(null);
    },
  });

  const describedBy = [ids.help, ids.count, error ? ids.error : '', found?.look.contact ? ids.warn : ''].filter(Boolean).join(' ');

  // Esc는 판 안에서도, 판이 열린 채 [직접 쓰기] 줄로 돌아와서도 접는다 (초점은 줄로)
  return (
    <div
      class={`custom-answer is-${variant}`}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return;
        e.preventDefault();
        e.stopPropagation();
        collapse();
      }}
    >
      <button
        ref={rowRef}
        type="button"
        class={`${variant === 'row' ? 'list-row' : 'pick-btn'} custom-row${chosen ? ' is-chosen' : ''}`}
        aria-expanded={open}
        aria-controls={ids.panel}
        onClick={toggle}
      >
        <span class={tile ? 'list-tile custom-pencil' : 'custom-pencil'}>
          <Icon name="pencil" size="20px" />
        </span>
        <span class="list-text custom-row-text">
          <span class="list-name">{label}</span>
          {note && <span class="list-sub">{note}</span>}
        </span>
        {chosen && <span class="visually-hidden">, {ko.custom.chosen}</span>}
        <span class="list-check custom-check" aria-hidden="true" />
        <span class="i-mask i-caret-down custom-caret" aria-hidden="true" />
      </button>
      <div
        ref={panelRef}
        id={ids.panel}
        class={open ? 'custom-panel is-open' : 'custom-panel'}
      >
        <div class="custom-inner">
          <div class="custom-box">
            <label class="custom-label" for={ids.field}>
              {field}
            </label>
            <p id={ids.help} class="custom-help">
              {hint} {ko.custom.privacy}
            </p>
            <input
              ref={fieldRef}
              id={ids.field}
              class="field custom-field"
              type="text"
              autocomplete="off"
              enterkeyhint="done"
              spellcheck={name ? false : undefined}
              aria-describedby={describedBy}
              aria-invalid={error ? 'true' : undefined}
              value={text}
              onInput={(e) => onInput(e.currentTarget.value)}
              onCompositionStart={() => {
                composing.current = true;
              }}
              onCompositionEnd={(e) => {
                composing.current = false;
                if (shown && shown.kind !== 'extra') {
                  const err = checkText(e.currentTarget.value, max).error;
                  setShown(err ? { kind: err } : null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                // 한글 조합을 끝내는 Enter는 무시한다 (그 Enter로 확인하면 마지막 글자가 빠지거나 두 번 들어간다)
                if (composingKey(e)) return;
                e.preventDefault();
                void submit();
              }}
            />
            <div class="custom-bar">
              <p id={ids.count} class={check.over > 0 ? 'custom-count is-over' : 'custom-count'}>
                {fill(ko.custom.count, { n: check.count, max })}
              </p>
              {busy && (
                <p id={ids.busy} class="custom-busy">
                  {ko.custom.busy}
                </p>
              )}
              <button type="button" class="btn btn-neutral custom-submit" aria-busy={busy ? 'true' : undefined} onClick={() => void submit()}>
                {ko.custom.submit}
              </button>
            </div>
            {error && (
              <p id={ids.error} class="custom-error">
                {errorText(error)}
              </p>
            )}
            {found?.look.contact && (
              <p id={ids.warn} class="custom-warn">
                {ko.custom.contact}
              </p>
            )}
            {found && (
              <div class="custom-result" role="group" aria-labelledby={ids.found}>
                {found.look.body(ctl(found.text))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 빈틈 알림 줄들 (낱말표 gaps[].message): 경고 그림 + 글 */
export function GapLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <p key={line} class="custom-gap">
          <Icon name="warning" size="20px" />
          <span>{line}</span>
        </p>
      ))}
    </>
  );
}

/** 정할 때: 고른 보기 + 내 말. picked = 찾은 결과에서 보기를 고름, kept = 내 말 그대로 둠(직접 쓰기 보기) */
export type Decide = (option: Option, text: string, how: 'picked' | 'kept') => void;

interface Props {
  q: Question;
  /** 질문의 '직접 쓰기' 보기 */
  custom: Option;
  /** 지금 답 (보기 id) */
  chosen: string | undefined;
  /** 저장된 내 말 */
  note: string | undefined;
  /** row = 목록 줄 56(목록 안), wide = 타일·2×2 아래 전체 폭 줄 56 */
  variant: 'row' | 'wide';
  onDecide: Decide;
}

/** 1단계 질문의 직접 쓰기: 찾은 결과 넷(하나 · 여럿 · 못 찾음 + 빈틈) */
export function CustomAnswer({ q, custom, chosen, note, variant, onDecide }: Props) {
  const labelOf = (id: string): string => q.options.find((o) => o.id === id)?.label ?? id;
  const optionById = (id: string): Option | undefined => q.options.find((o) => o.id === id);

  const body = (kind: ResultKind, match: AnswerMatch, gapLines: string[]) => (c: ShellControl) => {
    const decide = (option: Option, how: 'picked' | 'kept'): void => onDecide(option, c.text, how);
    const pickButton = (option: Option) => (
      <button key={option.id} type="button" class="btn btn-soft" onClick={() => decide(option, 'picked')}>
        {fill(ko.custom.pick, { labelDir: josa(`'${option.label}'`, 'dir') })}
      </button>
    );
    const first = match.suggestions[0];
    const head =
      kind === 'one' && first
        ? fill(ko.custom.found, { word: foundWords(first.words), label: labelOf(first.optionId) })
        : kind === 'many'
          ? fill(ko.custom.foundMany, { n: match.suggestions.length })
          : ko.custom.notFound;
    const calc = keepLine(q, custom, ko.custom.keepLike);
    const again = kind === 'none' ? reshown(q) : [];
    const suggested = match.suggestions.map((s) => optionById(s.optionId)).filter((o) => o !== undefined);
    return (
      <>
        <p id={c.foundId} class="custom-found" tabIndex={-1}>
          {head}
        </p>
        {kind === 'one' && <p class="custom-line">{ko.custom.ask}</p>}
        {kind === 'none' && <p class="custom-line">{ko.custom.closest}</p>}
        {match.readAs && <p class="custom-line">{fill(ko.custom.readAs, { hangul: match.readAs })}</p>}
        {suggested.some((o) => o.id === 'maybe') && <p class="custom-line">{ko.interview.maybeNote}</p>}
        {kind === 'none' && <p class="custom-line">{calc}</p>}
        {again.length > 0 && <div class="custom-actions is-options">{again.map(pickButton)}</div>}
        <div class="custom-actions">
          {suggested.map(pickButton)}
          <button type="button" class="btn btn-neutral" onClick={() => decide(custom, 'kept')}>
            {ko.custom.keep}
          </button>
          <button type="button" class="btn btn-text" onClick={c.retry}>
            {ko.custom.retry}
          </button>
        </div>
        {kind !== 'none' && <p class="custom-calc">{calc}</p>}
        <GapLines lines={gapLines} />
      </>
    );
  };

  const look = async (text: string): Promise<ShellLook> => {
    let match: AnswerMatch = { suggestions: [], gaps: [] };
    let gapLines: string[] = [];
    let contact = false;
    try {
      const m = await loadMatcher();
      match = m.answerMatch(catalog, q.id, text);
      gapLines = match.gaps.map((id) => m.gapMessage(id)).filter((x) => x !== '');
      contact = m.looksLikeContact(text);
    } catch {
      // 찾기 묶음을 못 받으면 '못 찾음'으로 보인다: 보기를 고르거나 내 말 그대로 둘 수 있다
    }
    return { contact, body: body(resultKind(match), match, gapLines) };
  };

  return (
    <CustomShell
      base={`ca-${q.id.replace(/[^a-z0-9-]/g, '-')}`}
      variant={variant}
      tile={variant === 'row' && q.picture === true}
      label={ko.custom.row}
      note={note ? fill(ko.custom.rowNote, { text: note }) : undefined}
      chosen={chosen === custom.id}
      field={custom.field ?? ''}
      hint={custom.hint ?? ''}
      name={isNameQuestion(q)}
      initial={note ?? ''}
      max={NOTE_MAX}
      preload={() => void loadMatcher().catch(() => undefined)}
      loaded={() => matcherNow() !== null}
      look={look}
    />
  );
}
