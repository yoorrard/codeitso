// 목록 섬 (D103·D115): 소분류 쪽 하나가 모든 정렬·쪽·거르기를 맡는다. 빌드 때 인기순 1쪽을 그려 두고(초기 props),
// 주소의 ?sort=&page=&<거르기 칸>=가 다르면 진열대 빌드가 만든 JSON을 받아 같은 카드 모양으로 다시 그린다.
// - 거르기 없음: 목록 묶음(/catalog/list/…, 8쪽씩)에서 그 쪽을 꺼낸다.
// - 거르기 있음: 거르기 파일(/catalog/facet/<대분류>/<소분류>.json, 값마다 인기순 자리 목록)로 맞는 자리를 고르고,
//   이름순·최근 갱신순이면 정렬 순서 파일로 그 정렬의 순위를 얻어, 그 순위가 든 목록 묶음만 받아 카드를 꺼낸다.
// 받은 파일은 기억해 두어 다시 받지 않는다. 쪽·정렬 링크는 진짜 주소(새 탭·공유)이고, 그냥 누르면 쪽을 다시 읽지 않고 바꾼다(pushState).
// 거르기 칸은 넓은 화면에서 왼쪽 칸, 좁은 화면에서 [거르기] 단추가 여는 시트(<dialog>)에 같은 모양으로 있다.
// 시트의 바깥 누르기는 바탕에서 누르고 뗀 때만이다 (src/lib/overlay.ts, D127).
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
import { facetDataPath, facetOrderPath, listDataPath, listPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import { Pager } from './Pager.tsx';
import { ProductCard } from './ProductCard.tsx';

interface Props {
  cat: CategoryId;
  sub: string;
  total: number;
  pages: number;
  initial: Card[];
  facets: FacetMeta[];
}

interface View {
  sort: SortKey;
  page: number;
  sel: Selection;
  total: number;
  cards: Card[];
}

/** 첫 그림 전에 Base가 붙이는 표시: 주소가 인기순 1쪽(거르기 없음)이 아니면 빌드 때 그린 카드를 감춘다 */
export const PENDING_ATTR = 'data-list-pending';
/** 칸 하나에 처음 보이는 값 수 (나머지는 '더 보기') */
const VALUES_SHOWN = 6;
/** 처음에 펼쳐 두는 칸 수 */
const OPEN_FACETS = 4;

function isSort(x: string | null): x is SortKey {
  return x !== null && (SORTS as readonly string[]).includes(x);
}

function readUrl(facets: readonly FacetMeta[]): { sort: SortKey; page: number; sel: Selection } {
  const q = new URLSearchParams(window.location.search);
  const s = q.get('sort');
  const n = Math.floor(Number(q.get('page') ?? '1'));
  return { sort: isSort(s) ? s : 'popular', page: Number.isFinite(n) && n >= 1 ? n : 1, sel: readSelection(q, facets) };
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

export default function Listing({ cat, sub, total, pages, initial, facets }: Props) {
  const [view, setView] = useState<View>({ sort: 'popular', page: 1, sel: {}, total, cards: initial });
  const [counts, setCounts] = useState<Partial<Record<FacetKey, number[]>> | null>(null);
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [want, setWant] = useState<{ sort: SortKey; page: number; sel: Selection } | null>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const ticket = useRef(0);
  const backdrop = useMemo(() => backdropPress(() => sheet.current?.close()), []);

  async function go(sort: SortKey, page: number, sel: Selection, how: 'push' | 'none', focus: 'head' | 'none'): Promise<void> {
    const my = (ticket.current += 1);
    setWant({ sort, page, sel });
    let cards = initial;
    let found = total;
    let live: Partial<Record<FacetKey, number[]>> | null = null;
    let at = Math.min(page, pages);
    const filtered = selectionSize(sel) > 0;
    if (filtered || sort !== 'popular' || at !== 1) setStatus('loading');
    try {
      if (filtered) {
        const idx = await facetIndex(cat, sub);
        const hits = applySelection(idx, sel);
        live = liveCounts(idx, sel);
        found = hits.length;
        at = Math.min(page, pageCount(found));
        let positions = hits;
        if (sort !== 'popular') {
          const r = await rankFor(cat, sub, sort, idx.total);
          positions = hits.map((p) => r[p] ?? p).sort((a, b) => a - b);
        }
        cards = await cardsAt(cat, sub, sort, positions.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE));
      } else if (sort !== 'popular' || at !== 1) {
        const from = (at - 1) * PAGE_SIZE;
        cards = await cardsAt(cat, sub, sort, Array.from({ length: Math.max(0, Math.min(PAGE_SIZE, total - from)) }, (_, i) => from + i));
      }
    } catch {
      if (my === ticket.current) {
        setStatus('error');
        document.documentElement.removeAttribute(PENDING_ATTR);
      }
      return;
    }
    if (my !== ticket.current) return;
    setView({ sort, page: at, sel, total: found, cards });
    setCounts(live);
    setStatus('ready');
    document.documentElement.removeAttribute(PENDING_ATTR);
    if (how === 'push') window.history.pushState(null, '', listPath(cat, sub, sort, at, sel));
    if (focus === 'head') {
      head.current?.focus({ preventScroll: true });
      head.current?.scrollIntoView({ block: 'start' });
      announce(fill(ko.list.shown, { page: at }));
    } else if (filtered || how === 'push') announce(fill(ko.facets.countLive, { n: withCommas(found) }));
  }

  useEffect(() => {
    const u = readUrl(facets);
    if (u.sort !== 'popular' || u.page !== 1 || selectionSize(u.sel) > 0) void go(u.sort, u.page, u.sel, 'none', 'none');
    else document.documentElement.removeAttribute(PENDING_ATTR);
    const onPop = (): void => {
      const n = readUrl(facets);
      void go(n.sort, n.page, n.sel, 'none', 'head');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 새로 그린 카드의 [담기] 상태·폰트 견본을 맞춘다 (src/lib/cart-buttons.ts, font-preview.ts)
  useEffect(() => {
    document.dispatchEvent(new CustomEvent(CARDS_EVENT));
  }, [view]);

  const toggle = (k: FacetKey, v: string): void => {
    const base = want?.sel ?? view.sel;
    const cur = base[k] ?? [];
    const next: Selection = { ...base, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] };
    if ((next[k] ?? []).length === 0) delete next[k];
    void go(view.sort, 1, next, 'push', 'none');
  };
  const clear = (): void => void go(view.sort, 1, {}, 'push', 'none');

  const sortLink = (s: SortKey) => ({
    href: listPath(cat, sub, s, 1, view.sel),
    onClick: (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      void go(s, 1, view.sel, 'push', 'head');
    },
  });

  const n = view.total;
  const from = n === 0 ? 0 : (view.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(n, view.page * PAGE_SIZE);
  const picked = selectionSize(view.sel);
  const hasFacets = facets.length > 0;
  const chosen = facets.flatMap((f) => (view.sel[f.k] ?? []).map((v) => ({ k: f.k, v })));

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
        <div class="list-bar">
          <h2 class="list-total" tabIndex={-1} ref={head}>
            {fill(ko.list.total, { n: withCommas(n) })}
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
                {SORTS.map((s) => (
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
        {status === 'ready' && n === 0 && (
          <div class="list-status">
            <p>{ko.facets.empty}</p>
            <button type="button" class="btn" onClick={clear}>
              {ko.facets.clear}
            </button>
          </div>
        )}
        {status === 'loading' && (
          <p class="list-status" role="status">
            {picked > 0 ? ko.facets.loading : ko.list.loading}
          </p>
        )}
        {status === 'error' && (
          <p class="list-status" role="alert">
            {ko.list.failed}{' '}
            <button type="button" class="btn btn-sm" onClick={() => want && void go(want.sort, want.page, want.sel, 'push', 'head')}>
              {ko.list.retry}
            </button>
          </p>
        )}
        <Pager
          page={view.page}
          pages={pageCount(n)}
          href={(p) => listPath(cat, sub, view.sort, p, view.sel)}
          onGo={(p) => void go(view.sort, p, view.sel, 'push', 'head')}
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
