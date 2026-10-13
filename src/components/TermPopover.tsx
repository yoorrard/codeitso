// 어려운 말 풀이 섬 (D60): 화면 글에서 어려운 말을 끌어 고르면(마우스·손가락·Shift+화살표) 그 아래에 쉬운 한 문장 풀이가 뜬다.
// 찾는 일은 src/lib/glossary.ts(순수 함수)가, 자료는 data/glossary.json이 맡는다. 자료는 처음 고를 때 한 번만 불러온다.
// 모르는 말이면 '사전에서 찾기'로 사전 옆 창을 그 말로 연다. 입력 칸 안, 사전 창 안, 풀이 창 안에서 고른 글은 보지 않는다.
// 손가락으로 고르면 휴대폰이 고른 글 위에 자기 메뉴를 띄우므로 풀이는 늘 아래에 둔다 (자리가 없을 때만 위로).
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import type { GlossaryEntry, GlossaryIndex } from '../lib/glossary.ts';
import { SELECTION_MAX, buildIndex, lookupTerm } from '../lib/glossary.ts';
import { DICT_EVENT } from '../lib/dict-event.ts';
import { termPath } from '../lib/routes.ts';
import { Icon } from './Icon.tsx';


/** 모르는 말일 때 '사전에서 찾기'를 보여 줄 최대 길이 (그보다 길면 그냥 복사하려고 고른 글로 본다) */
const MISS_MAX = 20;
const GAP = 8;
const EDGE = 16;

type Shown = { kind: 'hit'; entry: GlossaryEntry; rect: DOMRect } | { kind: 'miss'; text: string; rect: DOMRect };

let indexPromise: Promise<GlossaryIndex> | null = null;
function loadIndex(): Promise<GlossaryIndex> {
  indexPromise ??= import('../../data/glossary.json').then((m) => buildIndex(m.default));
  return indexPromise;
}

/** 고른 글이 풀이를 띄울 자리(본문·창)에 있는지. 입력 칸·사전·풀이 창 안은 뺀다 */
function selectable(node: Node | null): boolean {
  const el = node instanceof Element ? node : node?.parentElement;
  if (!el) return false;
  if (el.closest('input, textarea, [contenteditable="true"], .term-pop, .dict-sheet, .dict, [data-no-glossary]')) return false;
  return el.closest('main, dialog, .action-bar') !== null;
}

export default function TermPopover() {
  const [shown, setShown] = useState<Shown | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const last = useRef('');

  useEffect(() => {
    let timer = 0;
    let alive = true;
    const check = async (): Promise<void> => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        last.current = '';
        setShown(null);
        return;
      }
      const text = sel.toString().trim();
      const range = sel.getRangeAt(0);
      if (!text || text.length > SELECTION_MAX || !selectable(range.commonAncestorContainer)) {
        setShown(null);
        return;
      }
      if (text === last.current) return;
      last.current = text;
      const index = await loadIndex();
      if (!alive) return;
      const rect = range.getBoundingClientRect();
      const hit = lookupTerm(index, text);
      if (hit) {
        setShown({ kind: 'hit', entry: hit.entry, rect });
        announce(fill(ko.glossary.announce, { term: hit.entry.term, plain: hit.entry.plain }));
      } else if (text.length <= MISS_MAX) setShown({ kind: 'miss', text, rect });
      else setShown(null);
    };
    const onChange = (): void => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void check(), 280);
    };
    const close = (): void => {
      last.current = '';
      setShown(null);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('selectionchange', onChange);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener('selectionchange', onChange);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, []);

  // 그린 뒤 높이를 재서 자리를 정한다: 고른 글 아래, 아래 자리가 모자라면 위
  useLayoutEffect(() => {
    if (!shown) {
      setPos(null);
      return;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(320, vw - EDGE * 2);
    const h = box.current?.offsetHeight ?? 120;
    const r = shown.rect;
    const below = r.bottom + GAP;
    const top = below + h <= vh - EDGE || r.top - GAP - h < EDGE ? below : r.top - GAP - h;
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, EDGE), vw - width - EDGE);
    setPos({ top: Math.max(EDGE, top), left, width });
  }, [shown]);

  if (!shown) return null;
  const style = pos ? { top: `${pos.top}px`, left: `${pos.left}px`, width: `${pos.width}px` } : { visibility: 'hidden' };
  const openDict = (q: string): void => {
    setShown(null);
    document.dispatchEvent(new CustomEvent(DICT_EVENT, { detail: { q } }));
  };

  return (
    <div ref={box} class="term-pop" role="dialog" aria-label={shown.kind === 'hit' ? fill(ko.glossary.label, { term: shown.entry.term }) : ko.glossary.missLabel} style={style}>
      {shown.kind === 'hit' ? (
        <>
          <p class="term-pop-title">
            <Icon name="help" size="18px" />
            <strong>{shown.entry.term}</strong>
          </p>
          <p class="term-pop-plain">{shown.entry.plain}</p>
          {shown.entry.example && <p class="term-pop-example">{shown.entry.example}</p>}
          <p class="term-pop-actions">
            {shown.entry.concept && (
              <a class="term-pop-link" href={termPath(shown.entry.concept)}>
                {ko.glossary.more}
              </a>
            )}
            <button type="button" class="term-pop-link" onClick={() => openDict(shown.entry.term)}>
              {ko.glossary.search}
            </button>
          </p>
        </>
      ) : (
        <button type="button" class="term-pop-miss" onClick={() => openDict(shown.text)}>
          <Icon name="dictionary" size="18px" />
          <span>{fill(ko.glossary.missSearch, { text: shown.text })}</span>
        </button>
      )}
      <button type="button" class="term-pop-close" aria-label={ko.glossary.close} onClick={() => setShown(null)}>
        <Icon name="close" size="18px" />
      </button>
    </div>
  );
}
