// 진열대 거르기 섬 (T13, docs/UX.md 3.8): 분야·기능 두 갈래 단추(aria-pressed, 라디오 아님 D19).
// 상품 목록은 정적 HTML이고, 이 섬은 [data-shelf-item]과 빈 코너([data-shelf-group])의 hidden만 바꾼다.
// 자바스크립트가 없어도 목록은 모두 보인다. 보이는 상품 수는 누를 때만 화면 낭독기에 알린다.
import { useRef, useState } from 'preact/hooks';
import { getSearchIndex, productHits } from '../lib/search-client.ts';
import { ko } from '../copy/ko.ts';
import { announce } from '../lib/announce.ts';
import { fill } from '../lib/engine/index.ts';

export interface FilterChoice {
  id: string;
  label: string;
  /** public/emoji/<art>.webp. 없으면 그림 없이 */
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
              {o.art && <img src={`/emoji/${o.art}.webp`} width={22} height={22} alt="" />}
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
  const hits = useRef<Set<string> | null>(null);
  const firstDomain = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const choose = (nextDomain: string, nextCap: string): void => {
    setDomain(nextDomain);
    setCap(nextCap);
    const n = apply(nextDomain, nextCap, hits.current);
    setShown(n);
    announce(n === 0 ? ko.shelf.none : fill(ko.shelf.shown, { n }));
  };

  // 검색: 사전과 같은 색인을 처음 칠 때 불러온다. 결과 수는 입력을 멈췄을 때 한 번 알린다
  const search = (q: string): void => {
    setQuery(q);
    const run = (set: Set<string> | null): void => {
      hits.current = set;
      const n = apply(domain, cap, set);
      setShown(n);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => announce(n === 0 ? ko.shelf.none : fill(ko.shelf.shown, { n })), 700);
    };
    if (q.trim() === '') run(null);
    else void getSearchIndex().then((ms) => run(productHits(ms, q.trim())));
  };

  const reset = (): void => {
    hits.current = null;
    setQuery('');
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
      <Group
        id="shelf-filter-domain"
        label={ko.shelf.domain}
        options={[{ id: ALL, label: ko.shelf.all }, ...domains, { id: GENERAL, label: ko.shelf.general, art: generalArt }]}
        value={domain}
        onPick={(id) => choose(id, cap)}
        firstRef={firstDomain}
      />
      <Group id="shelf-filter-cap" label={ko.shelf.capability} options={[{ id: ALL, label: ko.shelf.all }, ...capabilities]} value={cap} onPick={(id) => choose(domain, id)} />
      <p class="shelf-count">{fill(ko.shelf.count, { n: shown })}</p>
      {shown === 0 && (
        <div class="shelf-none">
          <p>{ko.shelf.none}</p>
          <button type="button" class="btn" onClick={reset}>
            {ko.shelf.reset}
          </button>
        </div>
      )}
    </section>
  );
}
