// 진열대 거르기 섬 (T13, docs/UX.md 3.8): 분야·기능 두 갈래 단추(aria-pressed, 라디오 아님 D19).
// 상품 목록은 정적 HTML이고, 이 섬은 [data-shelf-item]과 빈 코너([data-shelf-group])의 hidden만 바꾼다.
// 자바스크립트가 없어도 목록은 모두 보인다. 보이는 상품 수는 누를 때만 화면 낭독기에 알린다.
import { useEffect, useRef, useState } from 'preact/hooks';
import { getSearchIndex, productHits } from '../lib/search-client.ts';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';
import { Glyph } from './Glyph.tsx';

export interface FilterChoice {
  id: string;
  label: string;
  /** 그림 이름 (src/lib/glyphs.ts). 없으면 그림 없이 */
  art?: string;
}

interface Props {
  domains: FilterChoice[];
  capabilities: FilterChoice[];
  /** 분야가 없는 공통 도구 단추의 그림 */
  generalArt: string;
  total: number;
}

const ALL = 'all';
/** 분야가 없는 상품 (화면·저장·배포 같은 공통 도구) */
const GENERAL = 'general';

function words(el: Element, attr: string): string[] {
  return (el.getAttribute(attr) ?? '').split(' ').filter((w) => w !== '');
}

/** 정적 목록에 거르기(와 검색 결과)를 적용하고 보이는 상품 수를 돌려준다 */
function apply(domain: string, cap: string, hits: Set<string> | null): number {
  let shown = 0;
  const appeared: HTMLElement[] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-shelf-item]'))) {
    const wasHidden = el.hidden;
    const domains = words(el, 'data-domains');
    const okDomain = domain === ALL || (domain === GENERAL ? domains.length === 0 : domains.includes(domain));
    const okCap = cap === ALL || words(el, 'data-caps').includes(cap);
    const okSearch = hits === null || hits.has(el.getAttribute('data-id') ?? '');
    el.hidden = !(okDomain && okCap && okSearch);
    if (!el.hidden) shown += 1;
    if (wasHidden && !el.hidden) appeared.push(el);
  }
  // 게임 순간: 새로 진열된 카드 앞 여섯 장이 차례로 뒤집혀 나타난다 (동작 줄이기면 페이드만, parts.css .flip-in)
  appeared.slice(0, 6).forEach((el, i) => {
    el.classList.remove('flip-in');
    void el.getBoundingClientRect();
    el.style.setProperty('--i', String(i));
    el.classList.add('flip-in');
    el.addEventListener('animationend', () => el.classList.remove('flip-in'), { once: true });
  });
  for (const group of Array.from(document.querySelectorAll<HTMLElement>('[data-shelf-group]'))) {
    group.hidden = group.querySelector('[data-shelf-item]:not([hidden])') === null;
  }
  return shown;
}

interface GroupProps {
  id: string;
  label: string;
  options: FilterChoice[];
  value: string;
  onPick: (id: string) => void;
  firstRef?: { current: HTMLButtonElement | null };
}

function Group({ id, label, options, value, onPick, firstRef }: GroupProps) {
  return (
    <div class="filter-group" role="group" aria-labelledby={id}>
      <p id={id} class="filter-label">
        {label}
      </p>
      <ul class="filter-options">
        {options.map((o, i) => (
          <li>
            <button type="button" class="filter-btn" aria-pressed={value === o.id} onClick={() => onPick(o.id)} ref={i === 0 ? firstRef : undefined}>
              {o.art && <Glyph name={o.art} />}
              <span>{o.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
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
  const firstDomain = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

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
    // 누른 '모두 보기'는 사라지므로 초점을 분야의 '전체'로 옮긴다
    firstDomain.current?.focus();
  };

  return (
    <section class="shelf-filter" aria-labelledby="shelf-filter-title">
      <h2 id="shelf-filter-title" class="visually-hidden">
        {ko.shelf.filterTitle}
      </h2>
      <form role="search" class="shelf-search" onSubmit={(e) => e.preventDefault()}>
        <label for="shelf-q" class="filter-label">
          {ko.shelf.searchLabel}
        </label>
        <input
          ref={input}
          id="shelf-q"
          class="line-input"
          type="search"
          value={query}
          placeholder={ko.shelf.searchPlaceholder}
          autocomplete="off"
          enterkeyhint="search"
          onInput={(e) => search((e.currentTarget as HTMLInputElement).value)}
        />
      </form>
      {failed && <p class="q-help">{ko.shelf.searchFailed}</p>}
      {/* 수와 빈 안내는 검색창 바로 아래: 0개일 때 '모두 보기'까지 거르기 단추를 지나지 않게 */}
      <p class="shelf-count">{fill(ko.shelf.count, { n: shown })}</p>
      {shown === 0 && (
        <div class="shelf-none">
          <p>{ko.shelf.none}</p>
          <button type="button" class="btn" onClick={reset}>
            {ko.shelf.reset}
          </button>
        </div>
      )}
      <Group
        id="shelf-filter-domain"
        label={ko.shelf.domain}
        options={[{ id: ALL, label: ko.shelf.all }, ...domains, { id: GENERAL, label: ko.shelf.general, art: generalArt }]}
        value={domain}
        onPick={(id) => choose(id, cap)}
        firstRef={firstDomain}
      />
      <Group id="shelf-filter-cap" label={ko.shelf.capability} options={[{ id: ALL, label: ko.shelf.all }, ...capabilities]} value={cap} onPick={(id) => choose(domain, id)} />
    </section>
  );
}
