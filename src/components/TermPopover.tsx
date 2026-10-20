// 어려운 말 풀이 섬 2판 (brief 8절, docs/review/v2/glossary.md 5절, D69). 모든 화면의 기본 틀에 client:idle로 하나 있다.
// 들어오는 길 다섯: (A) 마우스·펜으로 고르고 손을 뗄 때 바로 (B) 손가락으로 고르고 selectionchange가 400ms 조용하고 닿은 손가락이 없을 때
// (C) 키보드로 고르고 500ms (D) 점선 밑줄 말(<button class="term-mark" popovertarget="term-pop">) 누름 (E) 사전.
// 찾는 일은 늦게 불러오는 묶음(term-engine.ts: 매처 + /glossary.json)이 하고, 이 섬은 고른 글·자리·닫기·그리기만 한다.
// 풀이 상자는 Popover API로 맨 위 층에 띄우고, 고른 글이나 밑줄 말이 열린 모달 <dialog> 안이면 상자를 그 대화 상자 안으로 옮겨 그린다
// (1판 P1: 시트 아래에 깔려 누를 수 없었다). 모달 안에서도 Esc는 풀이만 닫는다 (keydown을 먼저 받아 막는다).
// 닫힘: Esc · 닫기 · 고른 글이 풀림 · 바깥 누르기 · 페이지 이동 · (밑줄 말로 연 풀이) 초점이 밑줄 말과 풀이를 둘 다 벗어남.
// 닫기(X)·바깥 누르기는 고른 글도 푼다. Esc는 고른 글을 남기되 같은 고르기로는 다시 띄우지 않는다. 닫은 뒤에는 그 전에 시작한
// 고르기 확인이 늦게 끝나도 다시 띄우지 않고, 풀이 상자 안에서 뗀 손은 고르기로 보지 않는다 (D127: X를 누르면 같은 고른 글로
// 누른 자리에 다시 떠 옆으로 밀리던 버그). 바깥 누르기는 맨 위 한 겹만 닫는다 (src/lib/overlay.ts).
// 스크롤·크기 바뀜에는 닫지 않고 자리를 다시 잡는다(붙인 줄이 화면 밖이면 숨김, 닫힌 상자는 건드리지 않는다). 처음 한 번 안내는 본문 흐름 안의 알림 칸에 그린다.
// 설정의 '어려운 말 풀이'가 꺼지면 고르기 길을 거둔다. 한 번 연 용어는 store.ts termsSeen에 적는다. 고른 글은 어디에도 보내거나 저장하지 않는다.
// v5: 용어 카드·도구 카드·사전 창이 없어져, 이어 가기는 용어 사전(/terms#id) 링크 하나이고 모르는 말은 재료 검색(/search?q=)으로 보낸다.
import { h, render } from 'preact';
import { useEffect } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import type { GlossaryEntry, LookupContext } from '../lib/glossary.ts';
import { claimPress } from '../lib/overlay.ts';
import { ROUTES, searchPath, termPath } from '../lib/routes.ts';
import { $prefs, $termsSeen, markTermSeen } from '../lib/store.ts';
import { fill } from '../lib/text.ts';
import type { TermEngine } from '../lib/term-engine.ts';
import { termEngine } from '../lib/term-load.ts';
import { Icon } from './Icon.tsx';
import '../styles/term-pop.css';

type Via = 'mouse' | 'touch' | 'key' | 'mark';
/** 닫는 까닭: 닫기 단추(X·'재료 찾기') · Esc · 바깥 누르기 · 저절로(고른 글이 풀림·바뀜, 페이지 이동, 설정 끔, 대화 상자 닫힘, 초점 떠남) */
type Why = 'x' | 'esc' | 'outside' | 'gone';
type View = { hit: GlossaryEntry[]; also: GlossaryEntry[] } | { miss: 'error' | 'search'; text: string };
interface Shown {
  view: View;
  /** 고른 글(Range) 또는 밑줄 말 버튼 */
  anchor: Range | HTMLElement;
  via: Via;
  /** 손을 뗀 자리 (마우스) */
  x: number;
  y: number;
  /** 손가락으로 거꾸로 넓혔으면 첫 줄에 붙인다 */
  back: boolean;
  /** 같은 고르기인지 (고른 글 + 문맥 속 자리) */
  key: string;
  /** 밑줄 말을 키보드(Enter·Space)로 열었는지 */
  kbd?: boolean;
}
interface Act {
  close(): void;
  go(e: GlossaryEntry): void;
  back(): void;
  ask(q: string): void;
}

const BLOCK = 'p,li,dd,dt,td,th,figcaption,blockquote,h1,h2,h3,h4,h5,h6';
const GAP = 8;
/** 화면 끝에서 띄움: 본문 양옆 여백(--gutter 20)과 맞춰 풀이 상자가 내용 칸과 같은 선에 선다 (설계서 16에서 바꿈, D69 검토 반영) */
const EDGE = 20;
/** 손가락: 안드로이드 고르기 손잡이 누름 상자(40dp)를 덮지 않게 */
const TOUCH_GAP = 40;
/** 꼬리 가운데가 상자 끝에서 떨어지는 가장 작은 거리 (16 + 꼬리 폭 12의 절반) */
const TAIL = 22;
const QUIET = { touch: 400, key: 500 } as const;

/** 고른 글이 풀이를 띄울 자리인지: 본문·대화 상자 안, 입력 칸·풀이 상자 밖 */
function selectable(n: Node): boolean {
  const el = n instanceof Element ? n : n.parentElement;
  return !!el && !el.closest('input,textarea,[contenteditable],.term-pop,[data-no-glossary]') && !!el.closest('main,dialog');
}

/** 고른 글이 든 글 덩어리와 그 안의 고른 자리 (매처가 앞뒤 48자를 문맥으로 본다) */
function context(r: Range): LookupContext {
  const n = r.startContainer;
  const el = n instanceof Element ? n : n.parentElement;
  const all = document.createRange();
  all.selectNodeContents(el?.closest(BLOCK) ?? el ?? document.body);
  const pre = all.cloneRange();
  pre.setEnd(n, r.startOffset);
  const text = all.toString();
  const start = pre.toString().length;
  return { text, start, end: Math.min(text.length, start + r.toString().length) };
}

/** 붙일 줄 상자: 마우스는 손을 뗀 점에 가장 가까운 줄, 손가락·키보드는 마지막 줄(거꾸로면 첫 줄), 밑줄 말은 그 버튼 */
function lineRect(s: Shown): DOMRect | null {
  const a = s.anchor;
  if (a instanceof HTMLElement) return a.isConnected ? a.getBoundingClientRect() : null;
  const rs = [...a.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
  if (s.via === 'mouse') {
    const d = (r: DOMRect): number => Math.abs((r.top + r.bottom) / 2 - s.y);
    return rs.reduce<DOMRect | null>((b, r) => (b && d(b) <= d(r) ? b : r), null);
  }
  return (s.back ? rs[0] : rs[rs.length - 1]) ?? null;
}

/** 누른 점이 고른 글 위인지 (그 위를 누르는 것은 고른 글을 끌거나 복사 메뉴를 부르는 것일 수 있어 고른 글을 풀지 않는다) */
function onRange(r: Range, x: number, y: number): boolean {
  return [...r.getClientRects()].some((b) => x >= b.left && x <= b.right && y >= b.top && y <= b.bottom);
}

/**
 * 고른 글로 연 풀이 안에 있던 초점(키보드로 닫기를 눌렀다)을 고른 글이 든 글 덩어리로 돌린다. 숨긴 상자와 함께 몸통으로 빠지지 않게.
 * 고른 글이 링크·단추 안이면 그것으로, 아니면 글 덩어리에 잠깐 tabindex=-1을 주고(초점이 떠나면 거둔다) 옮긴다.
 */
function focusNear(n: Node): void {
  const el = n instanceof Element ? n : n.parentElement;
  if (!el) return;
  const own = el.closest<HTMLElement>('a[href],button,summary,[tabindex]');
  const block = el.closest<HTMLElement>(BLOCK);
  const to = own && (!block || block.contains(own)) ? own : (block ?? own);
  // 모달 안이면 그 밖(inert)으로는 옮기지 않는다
  const dlg = el.closest('dialog');
  if (!to || (dlg && !dlg.contains(to))) return;
  if (to.tabIndex < 0 && !to.hasAttribute('tabindex')) {
    to.tabIndex = -1;
    to.addEventListener('blur', () => to.removeAttribute('tabindex'), { once: true });
  }
  to.focus({ preventScroll: true });
}

/** 자리 잡기 (glossary.md 5.4). 모든 계산은 visualViewport 기준 (핀치 확대·화면 키보드). 닫힌 상자는 건드리지 않는다 */
function place(el: HTMLElement, s: Shown): void {
  if (!el.matches(':popover-open')) return;
  const vv = window.visualViewport;
  const vx = vv?.offsetLeft ?? 0;
  const vy = vv?.offsetTop ?? 0;
  const vw = vv?.width ?? window.innerWidth;
  const vh = vv?.height ?? window.innerHeight;
  const st = el.style;
  const r = lineRect(s);
  // 붙인 줄이 화면 밖으로 나가면 숨기고, 돌아오면 다시 보인다
  st.visibility = !r || r.bottom < vy || r.top > vy + vh ? 'hidden' : '';
  if (!r) return;
  const head = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
  const bar = Infinity;
  const top0 = Math.max(vy, head) + GAP;
  const bot0 = Math.min(vy + vh, bar) - GAP;
  const w = Math.min(320, vw - 2 * EDGE);
  const miss = 'miss' in s.view;
  st.width = miss ? '' : `${w}px`;
  st.maxWidth = `${w}px`;
  let maxH = Math.min(vh * 0.6, 360);
  st.setProperty('--max-h', `${maxH}px`);
  const bw = el.offsetWidth;
  const bh = el.offsetHeight;
  let top = r.bottom + GAP;
  let side = 'below';
  if (s.via === 'touch') {
    // 고른 글이 보이는 높이의 위 55% 안이면 아래 40px, 아니면 화면 위쪽에 붙인다 (고른 글 위는 기기 메뉴 자리라 두지 않는다)
    top = r.bottom + TOUCH_GAP;
    if (r.bottom - vy > vh * 0.55 || bot0 - top < 120) {
      top = top0;
      side = 'pin';
    } else if (top + bh > bot0) maxH = bot0 - top;
  } else if (bot0 - r.bottom < bh + EDGE && r.top - top0 > bot0 - r.bottom) {
    // 아래가 모자라고 위가 더 넓으면 줄 위 8px로 뒤집는다 (위도 모자라면 상자 안에서 굴린다)
    const room = r.top - GAP - top0;
    if (bh > room) maxH = room;
    top = r.top - GAP - Math.min(bh, room);
    side = 'above';
  } else if (top + bh > bot0) maxH = Math.max(bot0 - top, 120);
  st.setProperty('--max-h', `${maxH}px`);
  const x = s.via === 'mouse' && r.width > 28 ? s.x : r.left + r.width / 2;
  const left = Math.min(Math.max(x - bw / 2, vx + EDGE), vx + vw - bw - EDGE);
  st.top = `${top}px`;
  st.left = `${left}px`;
  st.setProperty('--tail', `${Math.min(Math.max(x - left, TAIL), bw - TAIL)}px`);
  el.dataset['side'] = side;
}

function Pop({ s, eng, live, act }: { s: Shown | null; eng: TermEngine | null; live: string; act: Act }) {
  const v = s?.view;
  let body = null;
  if (v && eng && 'miss' in v) {
    body = (
      <button type="button" class="term-pop-miss" onClick={() => act.ask(v.text)}>
        <Icon name="search" size="18px" />
        <span>{fill(ko.glossary.missSearch, { text: v.text })}</span>
      </button>
    );
  } else if (v && eng && 'hit' in v) {
    const trail = v.hit;
    const first = trail[0];
    const e = trail[trail.length - 1];
    if (first && e) {
      const nest = trail.length > 1;
      // 겹 풀이는 2겹까지: 2겹 풀이 속 상위 용어에는 밑줄을 긋지 않는다
      const see = nest ? null : eng.seeIn(e);
      const here = ROUTES.terms === location.pathname.replace(/\/$/, '');
      body = (
        <>
          {nest && (
            <p class="term-pop-trail">
              <button type="button" class="btn btn-text term-pop-back" onClick={act.back}>
                <Icon name="back" size="20px" />
                {ko.glossary.back}
              </button>
              <span>{fill(ko.glossary.trail, { from: first.term, to: e.term })}</span>
            </p>
          )}
          <p id="term-pop-name" class="term-pop-name" tabIndex={-1}>
            <span lang={/^[\x20-\x7e]+$/.test(e.term) ? 'en' : undefined}>{e.term}</span>
            {e.say && <span class="term-pop-say">{e.say}</span>}
          </p>
          <p class="term-pop-plain">
            {see ? (
              <>
                {e.plain.slice(0, see.start)}
                <button type="button" class="term-mark" onClick={() => act.go(see.entry)}>
                  {e.plain.slice(see.start, see.end)}
                </button>
                {e.plain.slice(see.end)}
              </>
            ) : (
              e.plain
            )}
          </p>
          {e.example && <p class="term-pop-ex">{fill(ko.glossary.example, { example: e.example })}</p>}
          {!nest && v.also.length > 0 && (
            <ul class="term-pop-also" aria-label={ko.glossary.also}>
              {v.also.map((a) => (
                <li>
                  <button type="button" class="chip" onClick={() => act.go(a)}>
                    {a.term}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!here && (
            <p class="term-pop-act">
              <a class="btn btn-sm" href={termPath(e.id)}>
                {ko.glossary.more}
              </a>
            </p>
          )}
        </>
      );
    }
  }
  // 풀이 안 버튼은 마우스로 누를 때 고른 글이 풀리지 않게 한다
  const keep = (ev: Event): void => {
    if (!(ev instanceof PointerEvent) || ev.pointerType !== 'touch') ev.preventDefault();
  };
  return (
    <>
      <div
        id="term-pop"
        popover="manual"
        class={v && 'miss' in v ? 'term-pop is-miss' : 'term-pop'}
        role="dialog"
        aria-labelledby={v && 'hit' in v ? 'term-pop-name' : undefined}
        aria-label={v && 'miss' in v ? ko.glossary.missLabel : undefined}
        onPointerDown={keep}
        onMouseDown={keep}
      >
        <div class="term-pop-in">{body}</div>
        <button type="button" class="icon-btn term-pop-close" aria-label={ko.glossary.close} onClick={act.close}>
          <Icon name="close" size="20px" />
        </button>
        <span class="term-pop-tail" aria-hidden="true" />
      </div>
      <p class="visually-hidden" aria-live="polite">
        {live}
      </p>
    </>
  );
}

export default function TermPopover() {
  useEffect(() => {
    const root = document.documentElement;
    const box = document.createElement('div');
    box.className = 'term-pop-host';
    document.body.append(box);
    let cur: Shown | null = null;
    let eng: TermEngine | null = null;
    let live = '';
    let input: Via = 'mouse';
    let mouseDown = false;
    let touching = false;
    let timer = 0;
    let raf = 0;
    /** 고른 글을 남긴 채 닫은 고르기(Esc·오른쪽 누르기 따위). 고른 글이 바뀔 때까지 다시 띄우지 않는다 */
    let dismissed = '';
    /** 닫은 횟수: 닫기 전에 시작한 고르기 확인(check)이 늦게 끝나도 다시 띄우지 않게 */
    let shut = 0;

    const pop = (): HTMLElement | null => box.querySelector<HTMLElement>('.term-pop');
    const load = (): Promise<TermEngine | null> =>
      termEngine().then(
        (x) => (eng = x),
        () => null,
      );

    const act: Act = {
      close: () => close('x'),
      go(e) {
        const v = cur?.view;
        if (!v || !('hit' in v) || !v.hit[0]) return;
        v.hit = [v.hit[0], e];
        seen(e);
        repaint(true);
      },
      back() {
        const v = cur?.view;
        if (v && 'hit' in v) v.hit = v.hit.slice(0, 1);
        repaint(true);
      },
      ask(q) {
        close('x');
        window.location.assign(searchPath(q));
      },
    };

    const paint = (): void => render(h(Pop, { s: cur, eng, live, act }), box);
    const seen = (e: GlossaryEntry): void => {
      markTermSeen(e.id);
      // 화면 낭독기: "{용어}: {풀이}" (모르는 말 칩은 읽지 않는다). 같은 말도 다시 읽히게 비웠다가 넣는다
      live = '';
      paint();
      window.setTimeout(() => {
        live = fill(ko.glossary.announce, { term: e.term, plain: e.plain });
        paint();
      }, 120);
    };
    /** 겹 풀이·칩·뒤로: 다시 그리고 바뀐 풀이의 제목으로 초점을 옮긴다 */
    const repaint = (focus: boolean): void => {
      paint();
      const el = pop();
      if (el && cur) place(el, cur);
      if (focus) box.querySelector<HTMLElement>('#term-pop-name')?.focus();
    };

    function open(s: Shown): void {
      const prev = cur;
      cur = s;
      // 모달 <dialog> 안이면 풀이 상자를 그 안으로 (밖은 inert라 누를 수 없다)
      const a = s.anchor instanceof Range ? s.anchor.commonAncestorContainer : s.anchor;
      const dlg = (a instanceof Element ? a : a.parentElement)?.closest('dialog');
      const host = dlg?.matches(':modal') ? dlg : document.body;
      if (box.parentNode !== host) host.append(box);
      paint();
      const el = pop();
      if (!el) return;
      if (prev && el.matches(':popover-open') && prev.anchor !== s.anchor) el.hidePopover();
      let linked = true;
      if (!el.matches(':popover-open')) {
        const src = s.anchor instanceof Range ? (a instanceof Element ? a : a.parentElement) : s.anchor;
        // source를 주면 Tab이 고른 글·밑줄 말 다음에 풀이 안으로 이어진다 (Chrome 137·Firefox 144·Safari 26).
        // 모르는 브라우저는 인자를 읽지 않으므로 getter가 불렸는지로 안다
        linked = false;
        try {
          (el.showPopover as (o?: { source?: Element | null }) => void).call(el, {
            get source() {
              linked = true;
              return src;
            },
          });
        } catch {
          return;
        }
      }
      place(el, s);
      // 그런 브라우저에서는 풀이가 body 끝에 있어 Tab이 닿지 않으니, 키보드로 연 밑줄 말이면 풀이 제목으로 초점을 옮긴다 (Esc면 밑줄 말로)
      if (!linked && s.kbd) box.querySelector<HTMLElement>('#term-pop-name')?.focus();
      const v = s.view;
      if ('hit' in v && v.hit[0]) seen(v.hit[0]);
    }

    /** keep: 바깥 누르기여도 고른 글을 풀지 않는다 (오른쪽 누르기·Shift 넓히기·고른 글 위 누르기) */
    function close(why: Why = 'gone', keep = false): void {
      const was = cur;
      if (!was) return;
      cur = null;
      shut += 1;
      window.clearTimeout(timer);
      const el = pop();
      const inside = !!el?.contains(document.activeElement);
      if (el?.matches(':popover-open')) el.hidePopover();
      const a = was.anchor;
      if (a instanceof HTMLElement) {
        if (why === 'esc' || inside) a.focus();
        return;
      }
      if (why === 'esc' || (why === 'outside' && keep)) {
        dismissed = was.key;
      } else if (why !== 'gone') {
        // 닫기·바깥 누르기는 고른 글도 푼다: 남은 고른 글로 손을 뗄 때마다 다시 뜨지 않게
        dismissed = '';
        document.getSelection()?.removeAllRanges();
      }
      if (inside) focusNear(a.commonAncestorContainer);
    }

    /** 고른 글을 보고 풀이·모르는 말 칩·아무것도 중 하나 */
    async function check(via: Via, x = 0, y = 0): Promise<void> {
      const sel = document.getSelection();
      const at = shut;
      const closeSel = (): void => {
        if (cur && cur.via !== 'mark') close();
      };
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !$prefs.get().glossary) return;
      const r = sel.getRangeAt(0).cloneRange();
      const text = r.toString().trim();
      if (!text || text.length > 200 || !selectable(r.commonAncestorContainer)) return closeSel();
      const ctx = context(r);
      const key = `${text}@${ctx.start}`;
      if (key === dismissed || key === cur?.key) return;
      const e = await load();
      // 불러오는 사이에 닫았거나 고른 글이 바뀌었으면 그만둔다
      if (at !== shut || !e || sel.isCollapsed || sel.rangeCount === 0 || sel.getRangeAt(0).toString().trim() !== text) return;
      // 사전 안에서는 용어가 있을 때만 (모르는 말 칩은 이미 사전 안이라 띄우지 않는다)
      const dict = !!(r.commonAncestorContainer instanceof Element ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement)?.closest('.dict-sheet');
      const hit = e.lookup(text, ctx);
      const miss = hit || dict ? null : e.miss(text);
      if (!hit && !miss) return closeSel();
      const back = (sel as Selection & { direction?: string }).direction === 'backward';
      open({ view: hit ? { hit: [hit.entry], also: hit.also } : { miss: miss ?? 'search', text }, anchor: r, via, x, y, back, key });
    }

    async function openMark(m: HTMLElement, kbd = false): Promise<void> {
      const e = (await load())?.get(m.dataset['term'] ?? '');
      if (e) open({ view: { hit: [e], also: [] }, anchor: m, via: 'mark', x: 0, y: 0, back: false, key: '', kbd });
    }

    const onDown = (e: PointerEvent): void => {
      input = e.pointerType === 'touch' ? 'touch' : 'mouse';
      if (input === 'mouse') mouseDown = true;
      const t = e.target as Node;
      // 바깥 누르기: 손가락으로 고른 길은 손잡이를 끄는 것일 수 있어 여기서 닫지 않는다 (톡 치기는 click에서, 고른 글이 풀리면 저절로)
      if (cur && cur.via !== 'touch' && !pop()?.contains(t) && t !== cur.anchor) {
        const a = cur.anchor;
        const keep = e.button !== 0 || e.shiftKey || (a instanceof Range && onRange(a, e.clientX, e.clientY));
        // 이 누르기로 풀이 아래의 창(서랍·시트)까지 닫지 않는다
        claimPress(e);
        close('outside', keep);
      }
    };
    const onUp = (e: PointerEvent): void => {
      if (e.pointerType === 'touch') return;
      mouseDown = false;
      // 풀이 상자 안에서 뗀 손(닫기·칩·버튼)과 오른쪽 누르기는 고르기가 아니다.
      // 예전에는 X를 떼면 고르기 확인이 다음 그림 틀에 돌아, X가 닫은 상자를 같은 고른 글로 X 자리에 다시 열었다 (D127)
      if (e.button !== 0 || (e.target instanceof Node && pop()?.contains(e.target))) return;
      const { clientX: x, clientY: y } = e;
      requestAnimationFrame(() => void check('mouse', x, y));
    };
    const onSel = (): void => {
      window.clearTimeout(timer);
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed) {
        dismissed = '';
        // 고른 글이 풀리면 닫는다. 손가락은 풀이 안 누르기가 먼저 닿게 400ms 뒤에 다시 보고
        if (cur && cur.via !== 'mark') {
          if (cur.via === 'touch') timer = window.setTimeout(() => document.getSelection()?.isCollapsed && close(), QUIET.touch);
          else close();
        }
        return;
      }
      if (input === 'mouse') return; // 마우스는 손을 뗄 때 본다
      const via = input;
      const wait = QUIET[via === 'touch' ? 'touch' : 'key'];
      const tick = (): void => {
        if (touching) timer = window.setTimeout(tick, wait);
        else void check(via);
      };
      timer = window.setTimeout(tick, wait);
    };
    const onTouch = (e: TouchEvent): void => {
      touching = e.touches.length > 0;
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && cur) {
        // 모달 안에서도 풀이만 닫는다: keydown을 막으면 대화 상자의 닫기 요청이 일어나지 않는다
        e.preventDefault();
        e.stopImmediatePropagation();
        close('esc');
        return;
      }
      if (e.key !== 'Tab') input = 'key';
    };
    const onClick = (e: MouseEvent): void => {
      const t = e.target instanceof Node ? e.target : null;
      const m = t instanceof Element ? t.closest<HTMLElement>('.term-mark') : null;
      if (m && !m.closest('.term-pop')) {
        // popovertarget의 기본 동작 대신 직접 연다 (모달 안이면 그 안으로 옮겨야 해서)
        e.preventDefault();
        if (cur?.anchor === m) close('x');
        else void openMark(m, e.detail === 0);
        return;
      }
      // 손가락으로 연 풀이: 바깥을 톡 치면(click) 닫는다. 고른 글 위를 친 것은 복사 메뉴를 부르는 것일 수 있어 그대로 둔다
      const a = cur?.anchor;
      if (cur?.via === 'touch' && t && !pop()?.contains(t) && !(a instanceof Range && onRange(a, e.clientX, e.clientY))) {
        claimPress(e);
        close('outside');
      }
    };
    // 밑줄 말로 연 풀이는 초점이 밑줄 말과 풀이를 둘 다 벗어나면 닫는다 (Tab으로 다음 밑줄 말에 가면 앞 풀이가 남지 않게)
    const onFocus = (e: FocusEvent): void => {
      const t = e.target as Node;
      if (cur?.via === 'mark' && t !== cur.anchor && !pop()?.contains(t)) close();
    };
    const onMove = (): void => {
      if (!cur || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = pop();
        if (cur && el) place(el, cur);
      });
    };
    const onDialogClose = (e: Event): void => {
      if (cur && e.target instanceof HTMLDialogElement && e.target.contains(box)) close();
    };
    const onLeave = (): void => close();

    /** 빌드 때 그은 밑줄 거두기: 설정이 꺼졌으면 모두, 아니면 한 번 연 용어만 (섬 안의 밑줄은 섬이 스스로 그린다) */
    const unwrap = (all: boolean): number => {
      const done = new Set($termsSeen.get());
      let left = 0;
      for (const m of document.querySelectorAll<HTMLElement>('.term-mark')) {
        if (m.closest('astro-island,.term-pop')) continue;
        if (all || done.has(m.dataset['term'] ?? '')) m.replaceWith(m.textContent ?? '');
        else left += 1;
      }
      return left;
    };

    const opts = { capture: true, passive: true };
    document.addEventListener('pointerdown', onDown, opts);
    document.addEventListener('pointerup', onUp, opts);
    document.addEventListener('selectionchange', onSel);
    document.addEventListener('touchstart', onTouch, opts);
    document.addEventListener('touchend', onTouch, opts);
    document.addEventListener('touchcancel', onTouch, opts);
    document.addEventListener('click', onClick, true);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('close', onDialogClose, true);
    document.addEventListener('selectstart', load, { once: true });
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onMove, opts);
    window.addEventListener('resize', onMove);
    window.visualViewport?.addEventListener('resize', onMove);
    window.visualViewport?.addEventListener('scroll', onMove);
    window.addEventListener('pagehide', onLeave);
    const stopPrefs = $prefs.listen((p) => {
      if (!p.glossary && cur && cur.via !== 'mark') close();
    });

    paint();
    unwrap(false);
    root.setAttribute('data-terms', '');
    // 섬이 깨어나기 전에 누른 밑줄 말 (TermText.astro의 작은 스크립트가 표시해 둔다)
    const waiting = document.querySelector<HTMLElement>('[data-term-wait]');
    if (waiting) {
      waiting.removeAttribute('data-term-wait');
      void openMark(waiting);
    }

    return () => {
      document.removeEventListener('pointerdown', onDown, opts);
      document.removeEventListener('pointerup', onUp, opts);
      document.removeEventListener('selectionchange', onSel);
      document.removeEventListener('touchstart', onTouch, opts);
      document.removeEventListener('touchend', onTouch, opts);
      document.removeEventListener('touchcancel', onTouch, opts);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('close', onDialogClose, true);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onMove, opts);
      window.removeEventListener('resize', onMove);
      window.visualViewport?.removeEventListener('resize', onMove);
      window.visualViewport?.removeEventListener('scroll', onMove);
      window.removeEventListener('pagehide', onLeave);
      stopPrefs();
      window.clearTimeout(timer);
      render(null, box);
      box.remove();
    };
  }, []);

  return null;
}
