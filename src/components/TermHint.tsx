// 드래그 풀이를 알아차리게 (O1, D138): 상품 상세 설명 속 용어에 점선 밑줄을 긋고(누르면 풀이 섬이 연다), 설명 아래에 '어려운 말 풀이' 안내를 둔다.
// 밑줄: 풀이 자료(term-engine + /glossary.json, 풀이 섬과 같은 늦게 받는 묶음)가 오면 한 칸에 2개까지, 이미 풀이를 연 용어와 설정에서 풀이를 끈 때는 긋지 않는다 (D69).
// 안내: 처음에는 펼쳐 두고([알겠어요]를 누르거나 풀이를 한 번이라도 열어 봤으면 접는다, store.ts $guide.hint), 접힌 뒤에도 작은 [어려운 말 풀이] 단추로 다시 펼친다.
import { useStore } from '@nanostores/preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { ROUTES } from '../lib/routes.ts';
import { $guide, $prefs, $termsSeen, closeTermHint } from '../lib/store.ts';
import { termEngine } from '../lib/term-load.ts';
import type { TermSegment } from '../lib/term-marks.ts';
import { Icon } from './Icon.tsx';

/** 상세 설명 한 칸에 긋는 밑줄 수 (term-marks.ts MARKS_PER_PARAGRAPH와 같다) */
const MARKS = 2;

/** 글을 '글 조각'과 '밑줄 말'로 나눈다. 자료가 오기 전·못 받으면 null (그냥 글로 그린다) */
export function useTermSegments(text: string): TermSegment[] | null {
  const [segs, setSegs] = useState<TermSegment[] | null>(null);
  useEffect(() => {
    setSegs(null);
    if (!text || !$prefs.get().glossary) return;
    let live = true;
    termEngine().then(
      (eng) => {
        if (live) setSegs(eng.segment(text, { used: new Set(), left: MARKS }, new Set($termsSeen.get())));
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [text]);
  return segs;
}

/** 나눈 글을 그린다. 밑줄 말은 <button class="term-mark" data-term>: 누르면 풀이 섬(TermPopover)이 연다 */
export function TermText({ text, segs }: { text: string; segs: TermSegment[] | null }) {
  if (!segs) return <>{text}</>;
  return (
    <>
      {segs.map((s) =>
        typeof s === 'string' ? (
          s
        ) : (
          <button type="button" class="term-mark" data-term={s.id}>
            {s.text}
          </button>
        ),
      )}
    </>
  );
}

/** 설명 아래 '어려운 말 풀이' 안내. marked: 위 설명에 밑줄 말이 있는가 */
export function TermHint({ marked }: { marked: boolean }) {
  const guide = useStore($guide);
  const prefs = useStore($prefs);
  const [open, setOpen] = useState(() => !$guide.get().hint && $termsSeen.get().length === 0);
  const toggle = useRef<HTMLButtonElement>(null);
  const H = ko.item.termHint;
  if (!prefs.glossary) return null;
  return (
    <div class="drag-hint" data-open={open ? '' : undefined}>
      <button ref={toggle} type="button" class="drag-hint-btn" aria-expanded={open} aria-controls="drag-hint-box" onClick={() => setOpen(!open)}>
        <Icon name="book" size="18px" />
        {H.toggle}
        <Icon name="expand" size="16px" />
      </button>
      <div id="drag-hint-box" class="drag-hint-box" hidden={!open}>
        <p>
          {H.drag}
          {marked && ` ${H.mark}`}
        </p>
        <p class="drag-hint-acts">
          <a href={ROUTES.terms}>{H.terms}</a>
          {!guide.hint && (
            <button
              type="button"
              class="btn btn-soft"
              onClick={() => {
                closeTermHint();
                setOpen(false);
                toggle.current?.focus();
              }}
            >
              {H.ok}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
