// 도구 모음 거르기 섬 (brief 6.9, D67 W3b): 검색 칸 48 → 가로로 미는 칩 한 줄([분야 ⌄]는 모달 시트를 연다 | 기능 칩) → 수.
// 칩은 aria-pressed 버튼(라디오 아님, D19). 상품 목록은 정적 HTML이고, 이 섬은 [data-shelf-item]과 빈 묶음([data-shelf-group])의
// hidden만 바꾼다. 자바스크립트가 없어도 목록은 모두 보인다. 보이는 도구 수는 고를 때와 입력을 멈췄을 때만 화면 낭독기에 알린다.
import { useEffect, useRef, useState } from 'preact/hooks';
import { getSearchIndex, productHits } from '../lib/search-client.ts';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import { Glyph } from './Glyph.tsx';
import { Icon } from './Icon.tsx';

export interface FilterChoice {
  id: string;
  label: string;
  /** 그림 이름 (src/lib/glyphs.ts). 없으면 그림 없이 */
  art?: string;
}

interface Props {
  domains: FilterChoice[];
  capabilities: FilterChoice[];
  /** 분야가 없는 공통 도구 줄의 그림 */
  generalArt: string;
  total: number;
}

const ALL = 'all';
/** 분야가 없는 상품 (화면·저장·배포 같은 공통 도구) */
const GENERAL = 'general';
const SHEET_TITLE = 'shelf-domain-title';

function words(el: Element, attr: string): string[] {
  return (el.getAttribute(attr) ?? '').split(' ').filter((w) => w !== '');
}

/** 정적 목록에 거르기(와 검색 결과)를 적용하고 보이는 상품 수를 돌려준다 */
function apply(domain: string, cap: string, hits: Set<string> | null): number {
  let shown = 0;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-shelf-item]'))) {
    const domains = words(el, 'data-domains');
    const okDomain = domain === ALL || (domain === GENERAL ? domains.length === 0 : domains.includes(domain));
    const okCap = cap === ALL || words(el, 'data-caps').includes(cap);
    const okSearch = hits === null || hits.has(el.getAttribute('data-id') ?? '');
    el.hidden = !(okDomain && okCap && okSearch);
    if (!el.hidden) shown += 1;
  }
  for (const group of Array.from(document.querySelectorAll<HTMLElement>('[data-shelf-group]'))) {
    group.hidden = group.querySelector('[data-shelf-item]:not([hidden])') === null;
  }
  // 찾은 도구가 접힌 '원문만 있는 도구' 안에만 있으면 펴서 보인다
  const index = document.querySelector<HTMLDetailsElement>('details[data-shelf-index]');
  if (index && hits !== null && !index.hidden) index.open = true;
  return shown;
}

export default function ShelfFilter({ domains, capabilities, generalArt, total }: Props) {
  const [domain, setDomain] = useState(ALL);
  const [cap, setCap] = useState(ALL);
  const [shown, setShown] = useState(total);
  const [query, setQuery] = useState('');
  const [failed, setFailed] = useState(false);
  // 색인이 늦게 와도 지금 상태로 거르게, 마지막 검색어·거르기는 ref에서 읽는다
  const now = useRef({ q: '', domain: ALL, cap: ALL });
  const hits = useRef<Set<string> | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const domainChip = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const domainOptions: FilterChoice[] = [{ id: ALL, label: ko.shelf.all }, ...domains, { id: GENERAL, label: ko.shelf.general, art: generalArt }];
  const domainLabel = domainOptions.find((d) => d.id === domain)?.label ?? ko.shelf.all;

  const say = (n: number): void => announce(n === 0 ? ko.shelf.none : fill(ko.shelf.shown, { n }));
  const refresh = (): number => {
    const n = apply(now.current.domain, now.current.cap, hits.current);
    setShown(n);
    return n;
  };

  const choose = (nextDomain: string, nextCap: string): void => {
    window.clearTimeout(timer.current);
    now.current = { ...now.current, domain: nextDomain, cap: nextCap };
    setDomain(nextDomain);
    setCap(nextCap);
    say(refresh());
  };

  // 검색: 사전과 같은 색인을 처음 칠 때 불러온다. 결과 수는 입력을 멈췄을 때 한 번 알린다
  const search = (raw: string): void => {
    setQuery(raw);
    const q = raw.trim();
    now.current = { ...now.current, q };
    const done = (set: Set<string> | null): void => {
      if (now.current.q !== q) return;
      hits.current = set;
      const n = refresh();
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => say(n), 700);
    };
    if (q === '') {
      setFailed(false);
      done(null);
      return;
    }
    getSearchIndex().then(
      (ms) => {
        setFailed(false);
        done(productHits(ms, q));
      },
      () => {
        if (now.current.q !== q) return;
        setFailed(true);
        announce(ko.shelf.searchFailed);
      },
    );
  };

  // 섬이 붙기 전에 친 검색어도 이어받는다
  useEffect(() => {
    if (input.current?.value) search(input.current.value);
    return () => window.clearTimeout(timer.current);
  }, []);

  const reset = (): void => {
    hits.current = null;
    now.current = { ...now.current, q: '' };
    setQuery('');
    setFailed(false);
    choose(ALL, ALL);
    // 누른 '모두 보기'는 사라지므로 초점을 검색 칸으로 옮긴다
    input.current?.focus();
  };

  /** 시트 뒤 어두운 막을 누르면 닫는다 (닫기 단추·Esc와 같다) */
  const backdrop = (e: MouseEvent): void => {
    const d = sheet.current;
    if (!d || e.target !== d) return;
    const box = d.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) d.close();
  };

  return (
    <section class="shelf-filter" aria-labelledby="shelf-filter-title">
      <h2 id="shelf-filter-title" class="visually-hidden">
        {ko.shelf.filterTitle}
      </h2>
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label for="shelf-q" class="field-label">
          {ko.shelf.searchLabel}
        </label>
        <span class="field-wrap">
          <span class="field-icon i-mask i-search" aria-hidden="true" />
          <input
            ref={input}
            id="shelf-q"
            class="field"
            type="search"
            value={query}
            placeholder={ko.shelf.searchPlaceholder}
            autocomplete="off"
            enterkeyhint="search"
            onInput={(e) => search((e.currentTarget as HTMLInputElement).value)}
          />
          {query && (
            // 크롬 기본 ×(굵은 파랑) 대신 선 아이콘 단추. 키보드는 Esc로 지운다(검색 칸 기본)
            <button
              type="button"
              class="icon-btn field-clear"
              tabIndex={-1}
              aria-label={ko.common.clearSearch}
              onClick={() => {
                search('');
                input.current?.focus();
              }}
            >
              <Icon name="close" size="20px" />
            </button>
          )}
        </span>
      </form>
      {failed && <p class="sec-note">{ko.shelf.searchFailed}</p>}
      <div class="chip-row shelf-chips" role="group" aria-label={ko.shelf.chipsLabel}>
        <button
          ref={domainChip}
          type="button"
          class={domain === ALL ? 'chip shelf-domain-chip' : 'chip shelf-domain-chip is-chosen'}
          aria-haspopup="dialog"
          aria-label={fill(ko.shelf.domainChip, { name: domainLabel })}
          onClick={() => sheet.current?.showModal()}
        >
          <span>{domain === ALL ? ko.shelf.domain : domainLabel}</span>
          <span class="i-mask i-caret-down chip-caret" aria-hidden="true" />
        </button>
        <span class="chip-sep" aria-hidden="true" />
        {[{ id: ALL, label: ko.shelf.all, art: undefined }, ...capabilities].map((c) => (
          <button type="button" class="chip" aria-pressed={cap === c.id} onClick={() => choose(domain, c.id)}>
            {c.art && <Glyph name={c.art} />}
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      {/* 수와 빈 안내는 칩 바로 아래: 0개일 때 '모두 보기'까지 목록을 지나지 않게 */}
      <p class="shelf-count">{fill(ko.shelf.count, { n: shown })}</p>
      {shown === 0 && (
        <div class="empty-state shelf-none">
          <p class="empty-state-text">{ko.shelf.none}</p>
          <button type="button" class="btn" onClick={reset}>
            {ko.shelf.reset}
          </button>
        </div>
      )}

      <dialog ref={sheet} class="modal" aria-labelledby={SHEET_TITLE} onClose={() => domainChip.current?.focus()} onClick={backdrop}>
        <div class="modal-head">
          <h2 id={SHEET_TITLE} class="modal-title">
            {ko.shelf.domain}
          </h2>
          <form method="dialog">
            <button class="icon-btn" aria-label={ko.settings.close}>
              <Icon name="close" />
            </button>
          </form>
        </div>
        <ul class="list domain-list">
          {domainOptions.map((d) => (
            <li>
              <button
                type="button"
                class="list-row"
                aria-pressed={domain === d.id}
                onClick={() => {
                  choose(d.id, cap);
                  sheet.current?.close();
                }}
              >
                {d.art && (
                  <span class="list-tile" aria-hidden="true">
                    <Glyph name={d.art} />
                  </span>
                )}
                <span class="list-text">
                  <span class="list-name">{d.label}</span>
                </span>
                <span class="list-check" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </dialog>
    </section>
  );
}
