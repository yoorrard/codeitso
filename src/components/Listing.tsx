// 목록 섬 (D103): 소분류 쪽 하나가 모든 정렬·쪽을 맡는다. 빌드 때 인기순 1쪽을 그려 두고(초기 props),
// 주소의 ?sort=&page=가 다르면 진열대 빌드가 만든 목록 JSON(/catalog/list/…, 8쪽씩 묶음)을 받아 같은 카드 모양으로 다시 그린다.
// 받은 묶음은 기억해 두어 이웃 쪽으로 넘길 때는 다시 받지 않는다.
// 쪽·정렬 링크는 진짜 주소라 새 탭·공유가 되고, 그냥 누르면 쪽을 다시 읽지 않고 바꾼 뒤 주소만 바꾼다(pushState).
// 바꾼 뒤에는 목록 제목으로 초점을 옮기고 'n페이지를 보여 준다'를 알린다. 첫 그림 전 깜빡임은 Base의 data-list-pending이 막는다.
import { useEffect, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { CARDS_EVENT } from '../lib/cart-buttons.ts';
import { chunkOf, pageWindow, withCommas } from '../lib/catalog/core.ts';
import type { Card, CategoryId, ListChunk, SortKey } from '../lib/catalog/types.ts';
import { PAGE_SIZE, SORTS } from '../lib/catalog/types.ts';
import { listDataPath, listPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import { ProductCard } from './ProductCard.tsx';

interface Props {
  cat: CategoryId;
  sub: string;
  total: number;
  pages: number;
  initial: Card[];
}

interface View {
  sort: SortKey;
  page: number;
  cards: Card[];
}

/** 첫 그림 전에 Base가 붙이는 표시: 주소가 인기순 1쪽이 아니면 빌드 때 그린 카드를 감춘다 */
export const PENDING_ATTR = 'data-list-pending';

function isSort(x: string | null): x is SortKey {
  return x !== null && (SORTS as readonly string[]).includes(x);
}

function readUrl(pages: number): { sort: SortKey; page: number } {
  const q = new URLSearchParams(window.location.search);
  const s = q.get('sort');
  const n = Math.floor(Number(q.get('page') ?? '1'));
  return { sort: isSort(s) ? s : 'popular', page: Number.isFinite(n) && n >= 1 ? Math.min(n, pages) : 1 };
}

/** 받은 목록 묶음 (주소 → 카드). 쪽을 오가도 같은 묶음은 한 번만 받는다 */
const chunks = new Map<string, Promise<Card[]>>();

function loadChunk(url: string): Promise<Card[]> {
  let p = chunks.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<ListChunk>;
      })
      .then((b) => b.cards);
    chunks.set(url, p);
    p.catch(() => chunks.delete(url));
  }
  return p;
}

function plain(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export default function Listing({ cat, sub, total, pages, initial }: Props) {
  const [view, setView] = useState<View>({ sort: 'popular', page: 1, cards: initial });
  const [status, setStatus] = useState<'ready' | 'loading' | 'error'>('ready');
  const [want, setWant] = useState<{ sort: SortKey; page: number } | null>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const ticket = useRef(0);

  async function go(sort: SortKey, page: number, how: 'push' | 'none', focus: boolean): Promise<void> {
    const my = (ticket.current += 1);
    setWant({ sort, page });
    let cards = initial;
    if (sort !== 'popular' || page !== 1) {
      setStatus('loading');
      try {
        const { chunk, offset } = chunkOf(page);
        cards = (await loadChunk(listDataPath(cat, sub, sort, chunk))).slice(offset, offset + PAGE_SIZE);
      } catch {
        if (my === ticket.current) {
          setStatus('error');
          document.documentElement.removeAttribute(PENDING_ATTR);
        }
        return;
      }
    }
    if (my !== ticket.current) return;
    setView({ sort, page, cards });
    setStatus('ready');
    document.documentElement.removeAttribute(PENDING_ATTR);
    if (how === 'push') window.history.pushState(null, '', listPath(cat, sub, sort, page));
    if (focus) {
      head.current?.focus({ preventScroll: true });
      head.current?.scrollIntoView({ block: 'start' });
      announce(fill(ko.list.shown, { page }));
    }
  }

  useEffect(() => {
    const u = readUrl(pages);
    if (u.sort !== 'popular' || u.page !== 1) void go(u.sort, u.page, 'none', false);
    else document.documentElement.removeAttribute(PENDING_ATTR);
    const onPop = (): void => {
      const n = readUrl(pages);
      void go(n.sort, n.page, 'none', true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // 새로 그린 카드의 [담기] 상태를 맞춘다 (src/lib/cart-buttons.ts)
  useEffect(() => {
    document.dispatchEvent(new CustomEvent(CARDS_EVENT));
  }, [view]);

  const link = (sort: SortKey, page: number) => ({
    href: listPath(cat, sub, sort, page),
    onClick: (e: MouseEvent) => {
      if (!plain(e)) return;
      e.preventDefault();
      void go(sort, page, 'push', true);
    },
  });

  const from = (view.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, view.page * PAGE_SIZE);
  const prev = view.page > 1 ? view.page - 1 : null;
  const next = view.page < pages ? view.page + 1 : null;

  return (
    <div class="listing">
      <div class="list-bar">
        <h2 class="list-total" tabIndex={-1} ref={head}>
          {fill(ko.list.total, { n: withCommas(total) })}
          <span class="list-range">{fill(ko.list.range, { from: withCommas(from), to: withCommas(to), total: withCommas(total) })}</span>
        </h2>
        <nav class="sort-nav" aria-label={ko.list.sortLabel}>
          <ul>
            {SORTS.map((s) => (
              <li>
                <a class="chip" {...link(s, 1)} aria-current={s === view.sort ? 'true' : undefined}>
                  {ko.list.sorts[s]}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <ul class="grid listing-grid" aria-busy={status === 'loading' ? 'true' : undefined}>
        {view.cards.map((c, i) => (
          <li key={c.id}>
            <ProductCard card={c} slot={`p${view.page}-${i}`} />
          </li>
        ))}
      </ul>
      {status === 'loading' && (
        <p class="list-status" role="status">
          {ko.list.loading}
        </p>
      )}
      {status === 'error' && (
        <p class="list-status" role="alert">
          {ko.list.failed}{' '}
          <button type="button" class="btn btn-sm" onClick={() => want && void go(want.sort, want.page, 'push', true)}>
            {ko.list.retry}
          </button>
        </p>
      )}
      {pages > 1 && (
        <nav class="pager" aria-label={ko.list.pages}>
          {prev ? (
            <a class="pager-step" {...link(view.sort, prev)} aria-label={ko.list.prevLabel}>
              <Icon name="prev" size="18px" />
              <span class="pager-word">{ko.list.prev}</span>
            </a>
          ) : (
            <span class="pager-step is-off" aria-hidden="true">
              <Icon name="prev" size="18px" />
              <span class="pager-word">{ko.list.prev}</span>
            </span>
          )}
          <ol>
            {pageWindow(view.page, pages).map((p, i) =>
              p === null ? (
                <li class="pager-gap" aria-hidden="true" key={`g${i}`}>
                  …
                </li>
              ) : (
                <li key={p} class={Math.abs(p - view.page) === 2 && p !== 1 && p !== pages ? 'is-far' : undefined}>
                  <a
                    class="pager-num"
                    {...link(view.sort, p)}
                    aria-current={p === view.page ? 'page' : undefined}
                    aria-label={fill(p === view.page ? ko.list.current : ko.list.pageLabel, { n: p })}
                  >
                    {p}
                  </a>
                </li>
              ),
            )}
          </ol>
          {next ? (
            <a class="pager-step" {...link(view.sort, next)} aria-label={ko.list.nextLabel}>
              <span class="pager-word">{ko.list.next}</span>
              <Icon name="chevron" size="18px" />
            </a>
          ) : (
            <span class="pager-step is-off" aria-hidden="true">
              <span class="pager-word">{ko.list.next}</span>
              <Icon name="chevron" size="18px" />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
