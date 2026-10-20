// 검색 쪽 섬 (/search?q=&cat=&page=, S3, D114): 진열대 전체(13만 개)에서 이름·태그·설명으로 찾는다.
// 진열대 빌드가 만든 작은 파일만 그때그때 받는다: 메타 1개 → 질의 낱말의 조각 몇 개 → 보일 카드가 든 블록 몇 개 (src/lib/catalog/search.ts).
// 결과는 대분류별로 묶어 10장씩 보이고, 대분류를 고르면 그 안에서 60장씩 쪽을 넘긴다. 치는 동안 잠깐 멈추면 찾고 주소를 바꾼다(replaceState),
// 대분류·쪽을 바꾸면 기록을 남긴다(pushState, 뒤로 가기 됨). 바꾼 뒤에는 결과 제목으로 초점을 옮기고 결과 수를 알린다.
// 대분류 쪽 검색창(?cat=)으로 왔거나 대분류를 골랐으면 고쳐 쳐도 그 대분류 안에서 찾는다(N1). 그 대분류에 결과가 없으면 그렇게 알리고 전체 결과로 가는 링크를 둔다.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { CARDS_EVENT } from '../lib/cart-ui.ts';
import { pageCount, withCommas } from '../lib/catalog/core.ts';
import type { Hit, QueryTerm, SearchMeta, TokenShard } from '../lib/catalog/search.ts';
import { SEARCH_PAGE, blockOf, groupByCategory, matchSubs, queryTerms, runQuery, shardsFor, synonymMap } from '../lib/catalog/search.ts';
import type { Card, NavCategory } from '../lib/catalog/types.ts';
import { CATEGORY_ICON } from '../lib/icons.ts';
import { FILES, ROUTES, listPath, searchBlockPath, searchPath, searchShardPath } from '../lib/routes.ts';
import { fill } from '../lib/text.ts';
import { Icon } from './Icon.tsx';
import { Pager } from './Pager.tsx';
import { ProductCard } from './ProductCard.tsx';

interface Props {
  nav: NavCategory[];
}

/** 대분류 묶음 하나에 먼저 보이는 카드 수 (2·5열이 꽉 차고, 3·4열은 CSS가 줄인다) */
const GROUP_SHOW = 10;
const DEBOUNCE_MS = 300;

interface Want {
  q: string;
  cat: string | null;
  page: number;
}

interface Group {
  cat: string;
  hits: Hit[];
}

interface Shown {
  want: Want;
  total: number;
  loose: boolean;
  groups: Group[];
  subs: SearchMeta['subs'];
  /** 화면에 그릴 카드 (대분류 → 카드들) */
  cards: Map<string, Card[]>;
}

const json = <T,>(url: string): Promise<T> =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<T>;
  });

function cached<T>(map: Map<string, Promise<T>>, url: string): Promise<T> {
  let p = map.get(url);
  if (!p) {
    p = json<T>(url);
    map.set(url, p);
    p.catch(() => map.delete(url));
  }
  return p;
}

const metaCache = new Map<string, Promise<SearchMeta>>();
const shardCache = new Map<string, Promise<TokenShard>>();
const blockCache = new Map<string, Promise<Card[]>>();

function readUrl(): Want {
  const p = new URLSearchParams(window.location.search);
  const n = Math.floor(Number(p.get('page') ?? '1'));
  return { q: (p.get('q') ?? '').trim(), cat: p.get('cat') || null, page: Number.isFinite(n) && n >= 1 ? n : 1 };
}

/** 대분류 묶음 순서: 가장 높은 점수 → 그 점수인 결과 수 → 진열대 순서 */
function orderGroups(groups: Map<string, Hit[]>, order: readonly string[]): Group[] {
  const top = (h: Hit[]): number => h[0]?.score ?? 0;
  const atTop = (h: Hit[]): number => h.filter((x) => x.score === top(h)).length;
  return [...groups]
    .filter(([, h]) => h.length > 0)
    .map(([cat, hits]) => ({ cat, hits }))
    .sort((a, b) => top(b.hits) - top(a.hits) || atTop(b.hits) - atTop(a.hits) || order.indexOf(a.cat) - order.indexOf(b.cat));
}

async function cardsFor(hits: readonly Hit[], meta: SearchMeta): Promise<Card[]> {
  const where = hits.map((h) => blockOf(h.doc, meta.cats, meta.block));
  const keys = [...new Set(where.filter((w) => w !== null).map((w) => `${w.cat}-${w.k}`))];
  const loaded = new Map<string, Card[]>();
  await Promise.all(
    keys.map(async (k) => {
      const i = k.lastIndexOf('-');
      loaded.set(k, await cached(blockCache, searchBlockPath(k.slice(0, i), Number(k.slice(i + 1)))));
    }),
  );
  return where.map((w) => (w ? loaded.get(`${w.cat}-${w.k}`)?.[w.at] : undefined)).filter((c): c is Card => c !== undefined);
}

export default function SearchPage({ nav }: Props) {
  const [input, setInput] = useState('');
  const [shown, setShown] = useState<Shown | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [want, setWant] = useState<Want | null>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const ticket = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const catOrder = useMemo(() => nav.map((c) => c.id), [nav]);
  const catName = (id: string): string => nav.find((c) => c.id === id)?.name ?? id;
  /** 고쳐 칠 때 지킬 대분류: 지금 보고 있는(또는 바라는) 대분류 */
  const scope = (): string | null => (shown ? shown.want.cat : (want?.cat ?? null));

  async function run(w: Want, how: 'push' | 'replace' | 'none', focus: boolean): Promise<void> {
    const my = (ticket.current += 1);
    setWant(w);
    if (how !== 'none') {
      const url = w.q ? searchPath(w.q, w.cat ?? undefined, w.page) : ROUTES.search;
      if (how === 'push') window.history.pushState(null, '', url);
      else window.history.replaceState(null, '', url);
    }
    syncHeader(w.q);
    if (!w.q) {
      setShown(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    try {
      const meta = await cached(metaCache, FILES.searchMeta);
      const terms: QueryTerm[] = queryTerms(w.q, synonymMap(meta.syn), new Set(meta.common));
      const ids = shardsFor(terms, meta.shards);
      const loaded = new Map<number, TokenShard>();
      await Promise.all(ids.map(async (n) => loaded.set(n, await cached(shardCache, searchShardPath(n)))));
      if (my !== ticket.current) return;
      const res = runQuery(terms, (n) => loaded.get(n), meta.shards);
      const groups = orderGroups(groupByCategory(res.hits, meta.cats), catOrder);
      // 아는 대분류만 지킨다 (결과가 없어도 지켜서 '여기에는 없다'를 알린다)
      const cat = w.cat && (catOrder as readonly string[]).includes(w.cat) ? w.cat : null;
      const cards = new Map<string, Card[]>();
      let page = 1;
      if (cat) {
        const hits = groups.find((g) => g.cat === cat)?.hits ?? [];
        page = Math.min(w.page, pageCount(hits.length, SEARCH_PAGE));
        cards.set(cat, await cardsFor(hits.slice((page - 1) * SEARCH_PAGE, page * SEARCH_PAGE), meta));
      } else {
        const lists = await Promise.all(groups.map((g) => cardsFor(g.hits.slice(0, GROUP_SHOW), meta)));
        groups.forEach((g, i) => cards.set(g.cat, lists[i] ?? []));
      }
      if (my !== ticket.current) return;
      const final: Want = { q: w.q, cat, page };
      setShown({ want: final, total: res.hits.length, loose: res.loose, groups, subs: cat ? [] : matchSubs(terms, meta.subs).slice(0, 12), cards });
      setStatus('idle');
      const n = cat ? (groups.find((g) => g.cat === cat)?.hits.length ?? 0) : res.hits.length;
      announce(cat ? fill(ko.search.resultsIn, { q: w.q, cat: catName(cat), n: withCommas(n) }) : fill(ko.search.results, { q: w.q, n: withCommas(n) }));
      if (focus) {
        head.current?.focus({ preventScroll: true });
        head.current?.scrollIntoView({ block: 'start' });
      }
    } catch {
      if (my === ticket.current) setStatus('error');
    }
  }

  useEffect(() => {
    const w = readUrl();
    setInput(w.q);
    void run(w, 'none', false);
    const onPop = (): void => {
      const n = readUrl();
      setInput(n.q);
      void run(n, 'none', true);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.clearTimeout(timer.current);
    };
  }, []);

  // 새로 그린 카드의 [담기] 상태·폰트 견본을 맞춘다 (src/lib/cart-buttons.ts, font-preview.ts)
  useEffect(() => {
    document.dispatchEvent(new CustomEvent(CARDS_EVENT));
  }, [shown]);

  const onInput = (e: Event): void => {
    const v = (e.target as HTMLInputElement).value;
    setInput(v);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void run({ q: v.trim(), cat: scope(), page: 1 }, 'replace', false), DEBOUNCE_MS);
  };

  const onSubmit = (e: Event): void => {
    e.preventDefault();
    window.clearTimeout(timer.current);
    void run({ q: input.trim(), cat: scope(), page: 1 }, 'push', false);
  };

  const move = (cat: string | null, page = 1): void => {
    if (shown) void run({ q: shown.want.q, cat, page }, 'push', true);
  };

  return (
    <div class="search-page">
      <form class="hero-search is-page" role="search" action={ROUTES.search} method="get" onSubmit={onSubmit}>
        <label class="visually-hidden" for="page-q">
          {ko.layout.searchLabel}
        </label>
        <input
          id="page-q"
          name="q"
          type="search"
          value={input}
          onInput={onInput}
          placeholder={ko.layout.searchPlaceholder}
          enterkeyhint="search"
          autocomplete="off"
          spellcheck={false}
        />
        <button type="submit" class="btn btn-primary">
          <Icon name="search" size="20px" />
          <span>{ko.layout.searchButton}</span>
        </button>
      </form>
      {status === 'error' && (
        <p class="list-status" role="alert">
          {ko.search.failed}{' '}
          <button type="button" class="btn btn-sm" onClick={() => want && void run(want, 'none', false)}>
            {ko.search.retry}
          </button>
        </p>
      )}
      {!shown && status !== 'error' && (want?.q ? <p class="list-status">{ko.search.loading}</p> : <Examples />)}
      {shown && <Results shown={shown} busy={status === 'loading'} head={head} catName={catName} move={move} />}
    </div>
  );
}

function Examples() {
  return (
    <section class="search-examples" aria-labelledby="sx-title">
      <p class="muted">{ko.search.prompt}</p>
      <h2 id="sx-title" class="field-label">
        {ko.search.examplesTitle}
      </h2>
      <ul class="chip-list">
        {ko.search.examples.map((x) => (
          <li>
            <a class="chip" href={searchPath(x)}>
              {x}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ResultsProps {
  shown: Shown;
  busy: boolean;
  head: { current: HTMLHeadingElement | null };
  catName: (id: string) => string;
  move: (cat: string | null, page?: number) => void;
}

function Results({ shown, busy, head, catName, move }: ResultsProps) {
  const go = (c: string | null) => (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    move(c);
  };
  const { want, groups, total } = shown;
  const cat = want.cat;
  const inCat = cat ? (groups.find((g) => g.cat === cat)?.hits.length ?? 0) : total;
  const pages = pageCount(inCat, SEARCH_PAGE);
  return (
    <div class="search-results" aria-busy={busy ? 'true' : undefined}>
      <h2 class="search-sum" tabIndex={-1} ref={head}>
        {cat ? fill(ko.search.resultsIn, { q: want.q, cat: catName(cat), n: withCommas(inCat) }) : fill(ko.search.results, { q: want.q, n: withCommas(total) })}
      </h2>
      {shown.loose && <p class="notice">{ko.search.loose}</p>}
      {total > 0 && (
        <nav class="search-cats sub-strip" aria-label={ko.search.catsLabel}>
          <ul>
            <li>
              <a class="chip" href={searchPath(want.q)} aria-current={cat === null ? 'page' : undefined} onClick={go(null)}>
                {ko.search.all} <span class="chip-n">{withCommas(total)}</span>
              </a>
            </li>
            {groups.map((g) => (
              <li>
                <a class="chip" href={searchPath(want.q, g.cat)} aria-current={cat === g.cat ? 'page' : undefined} onClick={go(g.cat)} data-cat={g.cat}>
                  {catName(g.cat)} <span class="chip-n">{withCommas(g.hits.length)}</span>
                </a>
              </li>
            ))}
            {cat && inCat === 0 && (
              <li>
                <a class="chip" href={searchPath(want.q, cat)} aria-current="page" data-cat={cat}>
                  {catName(cat)} <span class="chip-n">0</span>
                </a>
              </li>
            )}
          </ul>
        </nav>
      )}
      {!cat && shown.subs.length > 0 && (
        <section class="search-subs" aria-labelledby="ss-title">
          <h2 id="ss-title" class="field-label">
            {ko.search.subsTitle}
          </h2>
          <ul class="chip-list">
            {shown.subs.map(([c, sub, name, n]) => (
              <li>
                <a class="chip" href={listPath(c, sub)} data-cat={c}>
                  <span class="cat-dot" aria-hidden="true">
                    <Icon name={CATEGORY_ICON[c as keyof typeof CATEGORY_ICON] ?? 'tag'} size="14px" />
                  </span>
                  {name} <span class="chip-n">{withCommas(n)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {total === 0 && (
        <div class="search-empty">
          <p>{ko.search.empty}</p>
          <a class="btn" href={ROUTES.home}>
            {ko.search.emptyBrowse}
          </a>
        </div>
      )}
      {cat && total > 0 && inCat === 0 && (
        <div class="search-empty">
          <p>{fill(ko.search.emptyIn, { cat: catName(cat), q: want.q })}</p>
          <a class="btn" href={searchPath(want.q)} onClick={go(null)}>
            {fill(ko.search.emptyInAll, { n: withCommas(total) })}
          </a>
        </div>
      )}
      {!cat &&
        groups.map((g) => (
          <section class="search-group" data-cat={g.cat} aria-labelledby={`sg-${g.cat}`}>
            <div class="sec-head">
              <h2 id={`sg-${g.cat}`}>
                <span class="cat-dot" aria-hidden="true">
                  <Icon name={CATEGORY_ICON[g.cat as keyof typeof CATEGORY_ICON] ?? 'tag'} size="18px" />
                </span>
                {fill(ko.search.groupTitle, { name: catName(g.cat), n: withCommas(g.hits.length) })}
              </h2>
              {g.hits.length > GROUP_SHOW && (
                <a class="sec-more" href={searchPath(want.q, g.cat)} onClick={go(g.cat)}>
                  {fill(ko.search.groupMore, { name: catName(g.cat), n: withCommas(g.hits.length) })}
                  <Icon name="chevron" size="16px" />
                </a>
              )}
            </div>
            <ul class="grid search-grid">
              {(shown.cards.get(g.cat) ?? []).map((c, i) => (
                <li key={c.id}>
                  <ProductCard card={c} slot={`sg-${i}`} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      {cat && (
        <>
          <ul class="grid search-grid is-all">
            {(shown.cards.get(cat) ?? []).map((c, i) => (
              <li key={c.id}>
                <ProductCard card={c} slot={`sp${want.page}-${i}`} />
              </li>
            ))}
          </ul>
          <Pager page={want.page} pages={pages} href={(p) => searchPath(want.q, cat, p)} onGo={(p) => move(cat, p)} />
        </>
      )}
    </div>
  );
}

/** 머리줄 검색창에도 같은 검색어를 보인다 */
function syncHeader(q: string): void {
  const el = document.getElementById('hd-q');
  if (el instanceof HTMLInputElement && document.activeElement !== el) el.value = q;
}
