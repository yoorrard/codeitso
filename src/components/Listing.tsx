// 목록 섬 (D103·D115): 소분류 쪽 하나가 모든 정렬·쪽·거르기를 맡는다. 빌드 때 인기순 1쪽을 그려 두고(초기 props),
// 주소의 ?sort=&page=&<거르기 칸>=가 다르면 진열대 빌드가 만든 JSON을 받아 같은 카드 모양으로 다시 그린다.
// - 거르기 없음: 목록 묶음(/catalog/list/…, 8쪽씩)에서 그 쪽을 꺼낸다.
// - 거르기 있음: 거르기 파일(/catalog/facet/<대분류>/<소분류>.json, 값마다 인기순 자리 목록)로 맞는 자리를 고르고,
//   이름순·최근 갱신순이면 정렬 순서 파일로 그 정렬의 순위를 얻어, 그 순위가 든 목록 묶음만 받아 카드를 꺼낸다.
// 받은 파일은 기억해 두어 다시 받지 않는다. 쪽·정렬 링크는 진짜 주소(새 탭·공유)이고, 그냥 누르면 쪽을 다시 읽지 않고 바꾼다(pushState).
// 거르기 칸은 넓은 화면에서 왼쪽 칸, 좁은 화면에서 [거르기] 단추가 여는 시트(<dialog>)에 같은 모양으로 있다.
// 시트의 바깥 누르기는 바탕에서 누르고 뗀 때만이다 (src/lib/overlay.ts, D127).
// 맨 위 검색창(?q=, N1 D137)은 이 소분류 안에서만 찾는다(src/lib/sub-search.ts). 결과는 목록과 같은 인기순 자리라 거르기·정렬·쪽과 함께 쓰고,
// 검색어가 있으면 기본 정렬이 관련도순이다. 치는 동안 잠깐 멈추면 찾고(처음 한 번만 기록을 남기고 그다음은 주소만 바꾼다), 지우면 원래 목록으로 돌아온다.
// 좁은 화면(<1024)에서는 거르기·정렬 줄이 머리줄 아래에 붙어 따라온다 (긴 목록에서 늘 손 닿게, CSS).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { CARDS_EVENT } from '../lib/cart-ui.ts';
import { pageCount, withCommas } from '../lib/catalog/core.ts';
import type { FacetFile, FacetIndex, FacetKey, FacetMeta, OrderFile, Selection } from '../lib/catalog/facets.ts';
import { applySelection, decodeOrder, liveCounts, openFacets, rankOf, readSelection, selectionSize } from '../lib/catalog/facets.ts';
import type { Card, CategoryId, ListChunk, SortKey } from '../lib/catalog/types.ts';
import { CHUNK_PAGES, PAGE_SIZE, SORTS } from '../lib/catalog/types.ts';
import { facetValueLabel } from '../lib/labels.ts';
import { backdropPress } from '../lib/overlay.ts';
import type { ListSort } from '../lib/routes.ts';
import { facetDataPath, facetOrderPath, listDataPath, listPath, searchPath } from '../lib/routes.ts';
import { findInSub } from '../lib/sub-search.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import { Pager } from './Pager.tsx';
import { ProductCard } from './ProductCard.tsx';

interface Props {
  cat: CategoryId;
  catName: string;
  sub: string;
  subName: string;
  total: number;
  pages: number;
  initial: Card[];
  facets: FacetMeta[];
}

interface Want {
  sort: ListSort;
  page: number;
  sel: Selection;
  /** 소분류 안 검색어 (다듬은 것, 없으면 '') */
  q: string;
}

interface View extends Want {
  total: number;
  cards: Card[];
  /** 모든 낱말이 든 재료가 없어 하나라도 든 재료를 보인다 */
  loose: boolean;
}

/** 첫 그림 전에 Base가 붙이는 표시: 주소가 인기순 1쪽(거르기 없음)이 아니면 빌드 때 그린 카드를 감춘다 */
export const PENDING_ATTR = 'data-list-pending';
/** 칸 하나에 처음 보이는 값 수 (나머지는 '더 보기') */
const VALUES_SHOWN = 6;
/** 처음에 펼쳐 두는 칸 수 */
const OPEN_FACETS = 4;
const DEBOUNCE_MS = 300;

function isSort(x: string | null): x is SortKey {
  return x !== null && (SORTS as readonly string[]).includes(x);
}

/** 검색어가 있으면 관련도순이 기본이고, 없으면 관련도순은 뜻이 없어 인기순으로 */
function sortFor(sort: ListSort, q: string): ListSort {
  return q === '' && sort === 'match' ? 'popular' : sort;
}

function readUrl(facets: readonly FacetMeta[]): Want {
  const p = new URLSearchParams(window.location.search);
  const s = p.get('sort');
  const n = Math.floor(Number(p.get('page') ?? '1'));
  const q = (p.get('q') ?? '').trim();
  return { sort: isSort(s) ? s : q ? 'match' : 'popular', page: Number.isFinite(n) && n >= 1 ? n : 1, sel: readSelection(p, facets), q };
}

function cached<T>(map: Map<string, Promise<T>>, url: string): Promise<T> {
  let p = map.get(url);
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json() as Promise<T>;
    });
    map.set(url, p);
    p.catch(() => map.delete(url));
  }
  return p;
}

const chunkFiles = new Map<string, Promise<ListChunk>>();
const facetFiles = new Map<string, Promise<FacetFile>>();
const orderFiles = new Map<string, Promise<OrderFile>>();
const opened = new Map<string, FacetIndex>();
const ranks = new Map<string, Int32Array>();

async function facetIndex(cat: string, sub: string): Promise<FacetIndex> {
  const url = facetDataPath(cat, sub);
  const have = opened.get(url);
  if (have) return have;
  const idx = openFacets(await cached(facetFiles, url));
  opened.set(url, idx);
  return idx;
}

async function rankFor(cat: string, sub: string, sort: Exclude<SortKey, 'popular'>, total: number): Promise<Int32Array> {
  const url = facetOrderPath(cat, sub, sort);
  const have = ranks.get(url);
  if (have) return have;
  const r = rankOf(decodeOrder((await cached(orderFiles, url)).order), total);
  ranks.set(url, r);
  return r;
}

/** 정렬 순위 목록 → 카드 (순위가 든 목록 묶음만 받는다) */
async function cardsAt(cat: string, sub: string, sort: SortKey, positions: readonly number[]): Promise<Card[]> {
  const per = CHUNK_PAGES * PAGE_SIZE;
  const need = [...new Set(positions.map((r) => Math.floor(r / per)))];
  const files = new Map<number, Card[]>();
  await Promise.all(need.map(async (k) => files.set(k, (await cached(chunkFiles, listDataPath(cat, sub, sort, k))).cards)));
  return positions.map((r) => files.get(Math.floor(r / per))?.[r % per]).filter((c): c is Card => c !== undefined);
}

function plain(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export default function Listing({ cat, catName, sub, subName, total, pages, initial, facets }: Props) {
  const [view, setView] = useState<View>({ sort: 'popular', page: 1, sel: {}, q: '', total, cards: initial, loose: false });
  const [counts, setCounts] = useState<Partial<Record<FacetKey, number[]>> | null>(null);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [want, setWant] = useState<Want | null>(null);
  const [text, setText] = useState('');
  const head = useRef<HTMLHeadingElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const ticket = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const backdrop = useMemo(() => backdropPress(() => sheet.current?.close()), []);
  const hasFacets = facets.length > 0;

  async function go(w: Want, how: 'push' | 'replace' | 'none', focus: 'head' | 'none'): Promise<void> {
    const my = (ticket.current += 1);
    const { q, sel } = w;
    const sort = sortFor(w.sort, q);
    setWant({ ...w, sort });
    let cards = initial;
    let found = total;
    let live: Partial<Record<FacetKey, number[]>> | null = null;
    let loose = false;
    let at = Math.min(w.page, pages);
    const filtered = selectionSize(sel) > 0;
    const searching = q !== '';
    if (searching || filtered || sort !== 'popular' || at !== 1) setStatus('loading');
    try {
      if (searching || filtered) {
        // 검색 결과(인기순 자리 → 점수)와 거르기를 같은 자리 번호로 겹친다
        let score: Map<number, number> | null = null;
        let within: Uint8Array | undefined;
        if (searching) {
          const r = await findInSub(q, cat, sub);
          loose = r.loose;
          score = new Map(r.hits.map((h) => [h.pos, h.score]));
          within = new Uint8Array(total);
          for (const h of r.hits) if (h.pos < total) within[h.pos] = 1;
        }
        let hits: number[];
        if (hasFacets) {
          const idx = await facetIndex(cat, sub);
          hits = applySelection(idx, sel, undefined, within);
          live = liveCounts(idx, sel, within);
        } else hits = [...(score?.keys() ?? [])].sort((a, b) => a - b);
        found = hits.length;
        at = Math.min(w.page, pageCount(found));
        let positions = hits;
        let from: SortKey = 'popular';
        if (sort === 'match' && score) {
          const sc = score;
          positions = [...hits].sort((a, b) => (sc.get(b) ?? 0) - (sc.get(a) ?? 0) || a - b);
        } else if (sort === 'name' || sort === 'recent') {
          const r = await rankFor(cat, sub, sort, total);
          positions = hits.map((p) => r[p] ?? p).sort((a, b) => a - b);
          from = sort;
        }
        cards = await cardsAt(cat, sub, from, positions.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE));
      } else if (sort !== 'popular' || at !== 1) {
        const first = (at - 1) * PAGE_SIZE;
        const range = Array.from({ length: Math.max(0, Math.min(PAGE_SIZE, total - first)) }, (_, i) => first + i);
        cards = await cardsAt(cat, sub, sort === 'match' ? 'popular' : sort, range);
      }
    } catch {
      if (my === ticket.current) {
        setStatus('error');
        document.documentElement.removeAttribute(PENDING_ATTR);
      }
      return;
    }
    if (my !== ticket.current) return;
    setView({ sort, page: at, sel, q, total: found, cards, loose });
    setCounts(live);
    setStatus('ready');
    document.documentElement.removeAttribute(PENDING_ATTR);
    const url = listPath(cat, sub, sort, at, sel, q);
    if (how === 'push') window.history.pushState(null, '', url);
    else if (how === 'replace') window.history.replaceState(null, '', url);
    if (focus === 'head') {
      head.current?.focus({ preventScroll: true });
      head.current?.scrollIntoView({ block: 'start' });
      announce(fill(ko.list.shown, { page: at }));
    } else if (searching && how !== 'none') announce(fill(ko.list.found, { q, n: withCommas(found) }));
    else if (filtered || how === 'push') announce(fill(ko.facets.countLive, { n: withCommas(found) }));
  }

  useEffect(() => {
    const u = readUrl(facets);
    setText(u.q);
    if (u.q !== '' || u.sort !== 'popular' || u.page !== 1 || selectionSize(u.sel) > 0) void go(u, 'none', 'none');
    else document.documentElement.removeAttribute(PENDING_ATTR);
    const onPop = (): void => {
      window.clearTimeout(timer.current);
      const n = readUrl(facets);
      setText(n.q);
      void go(n, 'none', 'head');
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.clearTimeout(timer.current);
    };
  }, []);

  // 새로 그린 카드의 [담기]·찜 상태·폰트 견본을 맞춘다 (src/lib/cart-buttons.ts, wish-buttons.ts, font-preview.ts)
  useEffect(() => {
    document.dispatchEvent(new CustomEvent(CARDS_EVENT));
  }, [view]);

  const current = (): Want => want ?? view;

  /** 새 검색어로: 검색을 처음 시작하면 관련도순으로 바꾸고 기록을 남긴다(뒤로 가기로 검색 전 목록), 고쳐 치는 동안은 주소만 바꾼다 */
  const search = (raw: string, how: 'push' | 'replace'): void => {
    const q = raw.trim();
    const b = current();
    if (q === b.q && how === 'replace') return;
    const sort: ListSort = q === '' ? sortFor(b.sort, '') : b.q === '' ? 'match' : b.sort;
    void go({ sort, page: 1, sel: b.sel, q }, b.q === '' && q !== '' ? 'push' : how, 'none');
  };

  const onInput = (e: Event): void => {
    const v = (e.target as HTMLInputElement).value;
    setText(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => search(v, 'replace'), DEBOUNCE_MS);
  };

  const onSubmit = (e: Event): void => {
    e.preventDefault();
    window.clearTimeout(timer.current);
    search(text, 'push');
  };

  const clearSearch = (): void => {
    window.clearTimeout(timer.current);
    setText('');
    box.current?.focus();
    const b = current();
    if (b.q === '') return;
    void go({ sort: sortFor(b.sort, ''), page: 1, sel: b.sel, q: '' }, 'push', 'none');
  };

  const toggle = (k: FacetKey, v: string): void => {
    const b = current();
    const cur = b.sel[k] ?? [];
    const next: Selection = { ...b.sel, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    if ((next[k] ?? []).length === 0) delete next[k];
    void go({ sort: view.sort, page: 1, sel: next, q: view.q }, 'push', 'none');
  };
  const clear = (): void => void go({ sort: view.sort, page: 1, sel: {}, q: view.q }, 'push', 'none');

  const sortLink = (s: ListSort) => ({
    href: listPath(cat, sub, s, 1, view.sel, view.q),
    onClick: (e: MouseEvent) => {
      if (!plain(e)) return;
      e.preventDefault();
      void go({ sort: s, page: 1, sel: view.sel, q: view.q }, 'push', 'head');
    },
  });

  const n = view.total;
  const from = n === 0 ? 0 : (view.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(n, view.page * PAGE_SIZE);
  const picked = selectionSize(view.sel);
  const chosen = facets.flatMap((f) => (view.sel[f.k] ?? []).map((v) => ({ k: f.k, v })));
  const sorts: ListSort[] = view.q ? ['match', ...SORTS] : [...SORTS];
  const findLabel = fill(ko.list.findLabel, { name: subName });

  // 고르는 동안(거르기 파일을 받는 중)에도 고른 칸이 바로 켜져 보이게, 바라는 고름을 먼저 보인다
  const panel = (id: string) => <FacetPanel id={id} facets={facets} sel={want?.sel ?? view.sel} counts={counts} onToggle={toggle} />;

  return (
    <div class={`listing${hasFacets ? ' has-facets' : ''}`}>
      {hasFacets && (
        <aside class="facet-side" aria-labelledby="fs-title">
          <div class="facet-head">
            <h2 id="fs-title">{ko.facets.title}</h2>
            {picked > 0 && (
              <button type="button" class="btn btn-text btn-sm" onClick={clear} aria-label={ko.facets.clearLabel}>
                {ko.facets.clear}
              </button>
            )}
          </div>
          {panel('fs')}
        </aside>
      )}
      <div class="listing-main">
        <form class="find-box" role="search" action={listPath(cat, sub)} method="get" onSubmit={onSubmit}>
          <label class="visually-hidden" for="list-q">
            {findLabel}
          </label>
          <input
            id="list-q"
            ref={box}
            name="q"
            type="search"
            value={text}
            onInput={onInput}
            placeholder={findLabel}
            enterkeyhint="search"
            autocomplete="off"
            spellcheck={false}
            aria-keyshortcuts="/"
            data-find
          />
          {text !== '' && (
            <button type="button" class="find-clear" onClick={clearSearch} aria-label={ko.list.findClear}>
              <Icon name="close" size="18px" />
            </button>
          )}
          <button type="submit" class="find-go" aria-label={fill(ko.list.findButton, { name: subName })}>
            <Icon name="search" size="20px" />
          </button>
        </form>
        <div class="list-bar">
          <h2 class="list-total" tabIndex={-1} ref={head}>
            {view.q ? fill(ko.list.found, { q: view.q, n: withCommas(n) }) : fill(ko.list.total, { n: withCommas(n) })}
            {n > 0 && <span class="list-range">{fill(ko.list.range, { from: withCommas(from), to: withCommas(to), total: withCommas(n) })}</span>}
          </h2>
          <div class="list-tools">
            {hasFacets && (
              <button
                type="button"
                class="btn facet-open"
                ref={opener}
                aria-haspopup="dialog"
                aria-label={fill(ko.facets.openLabel, { n: picked })}
                onClick={() => sheet.current?.showModal()}
              >
                <Icon name="filter" size="18px" />
                {ko.facets.open}
                {picked > 0 && <span class="facet-badge">{picked}</span>}
              </button>
            )}
            <nav class="sort-nav" aria-label={ko.list.sortLabel}>
              <ul>
                {sorts.map((s) => (
                  <li>
                    <a class="chip" {...sortLink(s)} aria-current={s === view.sort ? 'true' : undefined}>
                      {ko.list.sorts[s]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        {view.q !== '' && view.loose && n > 0 && <p class="notice find-loose">{ko.search.loose}</p>}
        {chosen.length > 0 && (
          <div class="facet-chosen" role="group" aria-label={ko.facets.chosen}>
            <ul>
              {chosen.map(({ k, v }) => (
                <li>
                  <button type="button" class="chip is-on" onClick={() => toggle(k, v)} aria-label={fill(ko.facets.removeLabel, { name: `${ko.facets.keys[k]} ${facetValueLabel(k, v)}` })}>
                    <span class="facet-chosen-k">{ko.facets.keys[k]}</span>
                    {facetValueLabel(k, v)}
                    <Icon name="close" size="14px" />
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" class="btn btn-text btn-sm" onClick={clear}>
              {ko.facets.clear}
            </button>
          </div>
        )}
        <ul class="grid listing-grid" aria-busy={status === 'loading' ? 'true' : undefined}>
          {view.cards.map((c, i) => (
            <li key={c.id}>
              <ProductCard card={c} slot={`p${view.page}-${i}`} />
            </li>
          ))}
        </ul>
        {status === 'ready' && n === 0 && view.q === '' && (
          <div class="list-status">
            <p>{ko.facets.empty}</p>
            <button type="button" class="btn" onClick={clear}>
              {ko.facets.clear}
            </button>
          </div>
        )}
        {status === 'ready' && n === 0 && view.q !== '' && (
          <div class="list-status find-empty">
            <p>{fill(ko.list.findEmpty, { q: view.q, name: subName })}</p>
            <div class="find-empty-acts">
              {picked > 0 && (
                <button type="button" class="btn" onClick={clear}>
                  {ko.facets.clear}
                </button>
              )}
              <button type="button" class="btn" onClick={clearSearch}>
                {ko.list.findClear}
              </button>
              <a class="btn btn-soft" href={searchPath(view.q, cat)}>
                {fill(ko.list.findInCat, { name: catName })}
              </a>
              <a class="btn btn-soft" href={searchPath(view.q)}>
                {ko.list.findEverywhere}
              </a>
            </div>
          </div>
        )}
        {status === 'loading' && (
          <p class="list-status" role="status">
            {want?.q ? ko.list.finding : picked > 0 ? ko.facets.loading : ko.list.loading}
          </p>
        )}
        {status === 'error' && (
          <p class="list-status" role="alert">
            {want?.q ? ko.list.findFailed : ko.list.failed}{' '}
            <button type="button" class="btn btn-sm" onClick={() => want && void go(want, 'push', 'head')}>
              {ko.list.retry}
            </button>
          </p>
        )}
        <Pager
          page={view.page}
          pages={pageCount(n)}
          href={(p) => listPath(cat, sub, view.sort, p, view.sel, view.q)}
          onGo={(p) => void go({ sort: view.sort, page: p, sel: view.sel, q: view.q }, 'push', 'head')}
        />
      </div>
      {hasFacets && (
        <dialog
          class="facet-sheet"
          ref={sheet}
          aria-labelledby="fsh-title"
          onClose={() => opener.current?.focus()}
          onPointerDown={backdrop.down}
          onClick={backdrop.click}
        >
          <div class="sheet-inner">
            <div class="facet-head">
              <h2 id="fsh-title">{ko.facets.title}</h2>
              <button type="button" class="icon-btn" onClick={() => sheet.current?.close()} aria-label={ko.facets.close}>
                <Icon name="close" size="20px" />
              </button>
            </div>
            <div class="sheet-body">{panel('fsh')}</div>
            <div class="sheet-foot">
              <button type="button" class="btn" onClick={clear} disabled={picked === 0}>
                {ko.facets.clear}
              </button>
              <button type="button" class="btn btn-primary" onClick={() => sheet.current?.close()}>
                {fill(ko.facets.show, { n: withCommas(n) })}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}

interface PanelProps {
  id: string;
  facets: FacetMeta[];
  sel: Selection;
  counts: Partial<Record<FacetKey, number[]>> | null;
  onToggle: (k: FacetKey, v: string) => void;
}

function FacetPanel({ id, facets, sel, counts, onToggle }: PanelProps) {
  return (
    <div class="facets">
      {facets.map((f, i) => (
        <FacetGroup key={f.k} id={`${id}-${f.k}`} f={f} open={i < OPEN_FACETS} picked={sel[f.k] ?? []} live={counts?.[f.k] ?? null} onToggle={onToggle} />
      ))}
    </div>
  );
}

interface GroupProps {
  id: string;
  f: FacetMeta;
  /** 처음에 펼쳐 둘지 (앞 칸 몇 개, 고른 값이 있으면 늘) */
  open: boolean;
  picked: string[];
  live: number[] | null;
  onToggle: (k: FacetKey, v: string) => void;
}

function FacetGroup({ id, f, open, picked, live, onToggle }: GroupProps) {
  const [more, setMore] = useState(false);
  // 고른 값은 접어도 보인다
  const shown = more ? f.values : f.values.filter((v, i) => i < VALUES_SHOWN || picked.includes(v[0]));
  const rest = f.values.length - shown.length;
  return (
    <details class="facet" open={open || picked.length > 0}>
      <summary>
        {ko.facets.keys[f.k]}
        {picked.length > 0 && <span class="facet-picked">{picked.length}</span>}
      </summary>
      <fieldset>
        <legend class="visually-hidden">{ko.facets.keys[f.k]}</legend>
        <ul id={`${id}-list`}>
          {shown.map(([v, total]) => {
            const at = f.values.findIndex((x) => x[0] === v);
            const n = live ? (live[at] ?? 0) : total;
            const on = picked.includes(v);
            return (
              <li>
                <label class="facet-opt">
                  <input type="checkbox" checked={on} disabled={!on && n === 0} onChange={() => onToggle(f.k, v)} />
                  <span class="facet-v">{facetValueLabel(f.k, v)}</span>
                  <span class="facet-n">{withCommas(n)}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {f.values.length > VALUES_SHOWN && (rest > 0 || more) && (
          <button type="button" class="btn btn-text btn-sm facet-more" aria-expanded={more} aria-controls={`${id}-list`} onClick={() => setMore(!more)}>
            {more ? ko.facets.less : fill(ko.facets.more, { n: rest })}
          </button>
        )}
      </fieldset>
    </details>
  );
}
